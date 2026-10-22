// BACKUP: SFTP client for uploading/downloading versioned shards and the backup manifest.
//
// SFTP (SSH-based) was chosen over FTPS because nearly every VPS/NAS already runs an SSH
// server, so a self-hosted destination is just "create a user".
// Server is dumb storage — no Lightning.Pub-specific logic. Atomic replace of manifest.json
// needs OpenSSH posix-rename@openssh.com; a server without it is flagged incompatible.
// Shards are written once to unique names (sftpUpload); only the manifest is renamed.
// Cloud managed = Shocknet-hosted (PubFTPService); self-hosters run OpenSSH.
//
// A destination publish (and a restore fetch) holds one SSH session for every SFTP
// call. Single-op helpers still open a session for that call alone (tests, ad-hoc).
// The session promise settles only after the callback returns. A timeout or dropped
// connection destroys the socket and fails later calls on that session immediately,
// but the callback is still awaited so publish cleanup finishes before the next batch.
// Every connect/upload/download is bounded: handshake readyTimeout, a hard deadline that
// covers the whole session (connect plus transfer), an idle timeout while bytes are
// moving, and a max download size. A server that authenticates then stalls is destroyed
// rather than left hanging. Idle resets on transfer progress so a slow link can finish
// unless it hits the session deadline, which cancels the operation as a failure.

import crypto from 'crypto'
import { Client, SFTPWrapper } from 'ssh2'
import { getLogger } from '../helpers/logger.js'

const log = getLogger({ component: 'sftpBackup' })

/** SSH handshake + auth. ssh2's readyTimeout. */
export const SFTP_READY_TIMEOUT_MS = 15_000
/** Hard deadline for one SFTP session (connect plus transfer). Cancelled as a failure. */
export const SFTP_OP_TIMEOUT_MS = 60_000
/** Abort a transfer that has stopped sending or receiving bytes. */
export const SFTP_IDLE_TIMEOUT_MS = 20_000
/** Refuse a shard that would blow memory. Encrypted tables are far smaller. */
export const SFTP_MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024
/** Chunk size / write-stream highWaterMark so backpressure (and idle resets) track network drain. */
const SFTP_WRITE_CHUNK_BYTES = 16 * 1024
const SFTP_KEEPALIVE_INTERVAL_MS = 10_000
const SFTP_KEEPALIVE_COUNT_MAX = 3

export type SftpConfig = {
    host: string
    port?: number
    username: string
    password: string
    /** SHA256 host key fingerprint as printed by `ssh-keygen -lf` (with or without "SHA256:"). */
    hostFingerprint?: string
    readyTimeoutMs?: number
    opTimeoutMs?: number
    idleTimeoutMs?: number
    maxDownloadBytes?: number
}

export type SFTPFile = { found: true, data: Buffer } | { found: false }

export const CLOUD_SFTP_HOST = 'backup.lightning.pub'
const CLOUD_SFTP_PORT = 22
// Production PubFTPService host key. Rotating it on the server requires a Pub release.
export const CLOUD_SFTP_HOST_FINGERPRINT = 'SHA256:3bEOvUFGn+Ts/kfRtKV5AGd3j4AAoWM2c60w9pSpdM8'

/** The server rejected our login (no account yet, or wrong credentials). */
export class SftpAuthError extends Error { }

/** Handshake or transfer did not finish before the deadline; the client was destroyed. */
export class SftpTimeoutError extends Error {
    constructor(target: string, ms: number) {
        super(`SFTP operation timed out after ${ms}ms for ${target}`)
        this.name = 'SftpTimeoutError'
    }
}

/** Remote file is larger than SFTP_MAX_DOWNLOAD_BYTES (or the per-call cap). */
export class SftpTooLargeError extends Error {
    constructor(remotePath: string, bytes: number, max: number) {
        super(`SFTP download of ${remotePath} exceeded ${max} bytes (${bytes} received)`)
        this.name = 'SftpTooLargeError'
    }
}

/**
 * The server cannot atomically replace a file (no OpenSSH posix-rename@openssh.com).
 * Uploads refuse this host for the rest of the process so we do not unlink a good copy.
 */
export class SftpIncompatibleError extends Error {
    constructor(target: string, detail: string) {
        super(`SFTP server ${target} is not compatible with Lightning.Pub backups: ${detail}. The server must support OpenSSH posix-rename@openssh.com.`)
        this.name = 'SftpIncompatibleError'
    }
}

export function cloudSftpConfig(sftpUser: string, sftpPass: string): SftpConfig {
    return {
        host: CLOUD_SFTP_HOST,
        port: CLOUD_SFTP_PORT,
        username: sftpUser,
        password: sftpPass,
        hostFingerprint: CLOUD_SFTP_HOST_FINGERPRINT,
    }
}

/** Custom hosts use the operator's fingerprint; pointing a custom host at the cloud still pins. */
export function customHostFingerprint(host: string, port: number, configured: string): string | undefined {
    if (configured.trim()) return configured.trim()
    if (host.toLowerCase() === CLOUD_SFTP_HOST && port === CLOUD_SFTP_PORT) return CLOUD_SFTP_HOST_FINGERPRINT
    return undefined
}

export function normalizeFingerprint(fp: string): string {
    return fp.trim().replace(/^SHA256:/, '').replace(/=+$/, '')
}

/**
 * Fingerprint to pin, or undefined when the operator left it unset.
 * A configured value that normalizes to empty (e.g. "SHA256:") used to be treated as
 * unpinned and accepted any host key. That is a misconfiguration, not an open pin.
 */
export function pinnedFingerprint(configured: string | undefined): string | undefined {
    const trimmed = configured?.trim() || ''
    if (!trimmed) return undefined
    const normalized = normalizeFingerprint(trimmed)
    if (!normalized) {
        throw new Error('malformed SFTP host key fingerprint')
    }
    return normalized
}

export function fingerprintOf(hostKey: Buffer): string {
    return crypto.createHash('sha256').update(hostKey).digest('base64').replace(/=+$/, '')
}

export function hostFingerprintMatches(expected: string, hostKey: Buffer): boolean {
    return normalizeFingerprint(expected) === fingerprintOf(hostKey)
}

const warnedUnpinnedHosts = new Set<string>()

function warnUnpinned(target: string, observed: string) {
    if (warnedUnpinnedHosts.has(target)) return
    warnedUnpinnedHosts.add(target)
    log(`WARNING: SFTP host key for ${target} is not pinned. Set BACKUP_SFTP_HOST_FINGERPRINT=SHA256:${observed} after verifying it on the server with: ssh-keygen -lf <host key>.pub`)
}

class IdleWatchdog {
    private timer?: ReturnType<typeof setTimeout>
    private stopped = false
    constructor(private readonly ms: number, private readonly onIdle: () => void) { }
    touch() {
        if (this.stopped || this.ms <= 0) return
        this.clear()
        this.timer = setTimeout(() => this.onIdle(), this.ms)
    }
    clear() {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = undefined
        }
    }
    /** Ignore later touches. A transfer that is still unwinding must not revive a dead session. */
    stop() {
        this.stopped = true
        this.clear()
    }
}

function closeClient(client: Client | undefined, force: boolean) {
    if (!client) return
    try {
        if (force) client.destroy()
        else client.end()
    } catch { /* already gone */ }
}

function connectSftp(config: SftpConfig, onClient?: (client: Client) => void): Promise<{ client: Client, sftp: SFTPWrapper }> {
    const port = config.port ?? 22
    const target = `${config.host}:${port}`
    const expected = pinnedFingerprint(config.hostFingerprint)
    let mismatchedKey: string | undefined
    const readyTimeoutMs = config.readyTimeoutMs ?? SFTP_READY_TIMEOUT_MS

    const hostVerifier = (hostKey: Buffer): boolean => {
        const observed = fingerprintOf(hostKey)
        if (!expected) {
            warnUnpinned(target, observed)
            return true
        }
        if (hostFingerprintMatches(config.hostFingerprint!, hostKey)) return true
        mismatchedKey = observed
        return false
    }

    return new Promise((resolve, reject) => {
        let settled = false
        const client = new Client()
        onClient?.(client)
        const done = (err?: Error, value?: { client: Client, sftp: SFTPWrapper }) => {
            if (settled) return
            settled = true
            if (err) {
                closeClient(client, true)
                reject(err)
            } else {
                resolve(value!)
            }
        }
        client.on('ready', () => {
            client.sftp((err, sftp) => {
                if (err) {
                    return done(err)
                }
                done(undefined, { client, sftp })
            })
        })
        client.on('error', (err: Error & { level?: string }) => {
            if (mismatchedKey) {
                return done(new Error(`SFTP host key mismatch for ${target}: expected SHA256:${expected}, got SHA256:${mismatchedKey}. Refusing to connect.`))
            }
            if (err.level === 'client-authentication') {
                return done(new SftpAuthError(`SFTP login rejected by ${target}`))
            }
            done(new Error(`SFTP connection error: ${err.message}`))
        })
        client.connect({
            host: config.host,
            port,
            username: config.username,
            password: config.password,
            hostVerifier,
            readyTimeout: readyTimeoutMs,
            timeout: readyTimeoutMs,
            keepaliveInterval: SFTP_KEEPALIVE_INTERVAL_MS,
            keepaliveCountMax: SFTP_KEEPALIVE_COUNT_MAX,
        })
    })
}

type SessionAbort = { err?: Error }

/** One authenticated SFTP connection. Idle timeout covers the whole session, resetting on transfer progress. */
export class SftpSession {
    constructor(
        private readonly sftp: SFTPWrapper,
        private readonly idle: IdleWatchdog,
        private readonly config: SftpConfig,
        private readonly signal: AbortSignal,
        private readonly aborted: SessionAbort,
    ) { }

    async upload(remotePath: string, data: Buffer): Promise<void> {
        this.throwIfAborted()
        await this.gate(sftpWriteStream(this.sftp, remotePath, data, this.idle))
        log(`Uploaded ${remotePath} (${data.length} bytes)`)
    }

    async list(remoteDir = '.'): Promise<string[]> {
        this.throwIfAborted()
        const names = await this.gate(sftpReaddir(this.sftp, remoteDir, this.idle))
        log(`Listed ${remoteDir} (${names.length} names)`)
        return names
    }

    async unlink(remotePath: string): Promise<void> {
        this.throwIfAborted()
        await this.gate(sftpRemove(this.sftp, remotePath, this.idle))
        log(`Removed ${remotePath}`)
    }

    async atomicReplace(destPath: string, data: Buffer): Promise<void> {
        this.throwIfAborted()
        throwIfHostIncompatible(this.config)
        const target = sftpTarget(this.config)
        const tmpPath = `${destPath}.tmp`
        await this.gate(sftpWriteStream(this.sftp, tmpPath, data, this.idle))
        this.throwIfAborted()
        await this.gate(sftpPosixRename(this.sftp, tmpPath, destPath, target, this.idle))
        log(`Uploaded ${destPath} (${data.length} bytes)`)
    }

    async download(remotePath: string): Promise<SFTPFile> {
        this.throwIfAborted()
        const maxBytes = this.config.maxDownloadBytes ?? SFTP_MAX_DOWNLOAD_BYTES
        return this.gate(sftpReadFile(this.sftp, remotePath, maxBytes, this.idle))
    }

    private throwIfAborted() {
        if (this.aborted.err) throw this.aborted.err
    }

    /** Reject in-flight work when the socket is destroyed, without waiting out another idle period. */
    private gate<T>(work: Promise<T>): Promise<T> {
        if (this.aborted.err) return Promise.reject(this.aborted.err)
        if (this.signal.aborted) return Promise.reject(this.aborted.err ?? abortFallback())
        return new Promise<T>((resolve, reject) => {
            const onAbort = () => reject(this.aborted.err ?? abortFallback())
            this.signal.addEventListener('abort', onAbort, { once: true })
            work.then(
                value => {
                    this.signal.removeEventListener('abort', onAbort)
                    resolve(value)
                },
                err => {
                    this.signal.removeEventListener('abort', onAbort)
                    reject(err)
                },
            )
        })
    }
}

function abortFallback(): Error {
    return new Error('SFTP session closed')
}

/**
 * Open one SSH login, run `fn`, then close. The session is bounded by opTimeout for
 * connect and transfer; idle progress still aborts a stall sooner. A timeout or socket
 * error fails the in-flight call and every later call on this session, then waits for
 * `fn` to return. Cleanup inside `fn` therefore finishes before the caller starts another
 * publish.
 */
export async function withSftpSession<T>(config: SftpConfig, fn: (session: SftpSession) => Promise<T>): Promise<T> {
    const target = sftpTarget(config)
    const opTimeoutMs = config.opTimeoutMs ?? SFTP_OP_TIMEOUT_MS
    const idleTimeoutMs = config.idleTimeoutMs ?? SFTP_IDLE_TIMEOUT_MS
    let client: Client | undefined
    let destroyed = false
    let fnStarted = false
    let opTimer: ReturnType<typeof setTimeout> | undefined
    let idle: IdleWatchdog | undefined
    const aborted: SessionAbort = {}
    const abortController = new AbortController()

    const fail = (err: Error) => {
        if (aborted.err) return
        aborted.err = err
        destroyed = true
        abortController.abort(err)
        idle?.stop()
        if (opTimer) {
            clearTimeout(opTimer)
            opTimer = undefined
        }
        closeClient(client, true)
        client = undefined
    }

    try {
        return await new Promise<T>((resolve, reject) => {
            let settled = false
            const done = (err: Error | null, value?: T) => {
                if (settled) return
                settled = true
                if (err) reject(err)
                else resolve(value as T)
            }
            opTimer = setTimeout(() => {
                const err = new SftpTimeoutError(target, opTimeoutMs)
                log(err.message)
                const started = fnStarted
                fail(err)
                // Connect never handed the session to fn, so nothing is left to clean up.
                if (!started) done(err)
            }, opTimeoutMs)
            idle = new IdleWatchdog(idleTimeoutMs, () => {
                const err = new SftpTimeoutError(target, idleTimeoutMs)
                log(err.message)
                // fn observes the abort and settles this promise when it returns.
                fail(err)
            })
            void (async () => {
                try {
                    const conn = await connectSftp(config, c => { client = c })
                    client = conn.client
                    if (aborted.err) {
                        closeClient(client, true)
                        client = undefined
                        done(aborted.err)
                        return
                    }
                    idle!.touch()
                    client.on('error', (err: Error) => {
                        if (settled) return
                        fail(new Error(`SFTP connection error: ${err.message}`))
                    })
                    fnStarted = true
                    const session = new SftpSession(conn.sftp, idle!, config, abortController.signal, aborted)
                    try {
                        const value = await fn(session)
                        done(aborted.err ?? null, aborted.err ? undefined : value)
                    } catch (err) {
                        done(aborted.err ?? (err instanceof Error ? err : new Error(String(err))))
                    }
                } catch (err) {
                    done(aborted.err ?? (err instanceof Error ? err : new Error(String(err))))
                }
            })()
        })
    } finally {
        if (opTimer) clearTimeout(opTimer)
        idle?.stop()
        closeClient(client, destroyed)
        client = undefined
    }
}

function sftpWriteStream(sftp: SFTPWrapper, remotePath: string, data: Buffer, idle: IdleWatchdog): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let settled = false
        const done = (err?: Error) => {
            if (settled) return
            settled = true
            if (err) reject(err)
            else resolve()
        }
        const stream = sftp.createWriteStream(remotePath, { highWaterMark: SFTP_WRITE_CHUNK_BYTES })
        let offset = 0
        const writeNext = () => {
            if (settled) return
            try {
                while (offset < data.length) {
                    idle.touch()
                    const end = Math.min(offset + SFTP_WRITE_CHUNK_BYTES, data.length)
                    const chunk = data.subarray(offset, end)
                    offset = end
                    if (!stream.write(chunk)) {
                        stream.once('drain', () => {
                            idle.touch()
                            writeNext()
                        })
                        return
                    }
                }
                idle.touch()
                stream.end()
            } catch (err) {
                done(err instanceof Error ? err : new Error(String(err)))
            }
        }
        // 'finish' fires before the server acknowledges CLOSE. Waiting for it would let
        // the caller publish a manifest that names a handle the server never closed.
        stream.on('error', (err: Error) => done(new Error(`SFTP write error: ${err.message}`)))
        stream.on('close', () => done())
        writeNext()
    })
}

function sftpReadFile(sftp: SFTPWrapper, remotePath: string, maxBytes: number, idle: IdleWatchdog): Promise<SFTPFile> {
    idle.touch()
    return new Promise<SFTPFile>((resolve, reject) => {
        let settled = false
        const done = (err: Error | null, value?: SFTPFile) => {
            if (settled) return
            settled = true
            if (err) reject(err)
            else resolve(value!)
        }
        const chunks: Buffer[] = []
        let received = 0
        const stream = sftp.createReadStream(remotePath)
        stream.on('data', (chunk: Buffer) => {
            idle.touch()
            received += chunk.length
            if (received > maxBytes) {
                stream.destroy()
                return done(new SftpTooLargeError(remotePath, received, maxBytes))
            }
            chunks.push(chunk)
        })
        stream.on('end', () => done(null, { found: true, data: Buffer.concat(chunks) }))
        stream.on('error', (err: any) => {
            if (err.code === 2 || err.message?.includes('No such file')) {
                done(null, { found: false })
            } else {
                done(new Error(`SFTP read error: ${err.message}`))
            }
        })
    })
}

const incompatibleHosts = new Set<string>()

function sftpTarget(config: SftpConfig): string {
    return `${config.host}:${config.port ?? 22}`
}

function flagIncompatible(target: string, detail: string): SftpIncompatibleError {
    if (!incompatibleHosts.has(target)) {
        log(`SFTP server ${target} is not compatible with backups (${detail})`)
    }
    incompatibleHosts.add(target)
    return new SftpIncompatibleError(target, detail)
}

function throwIfHostIncompatible(config: SftpConfig) {
    const target = sftpTarget(config)
    if (incompatibleHosts.has(target)) {
        throw new SftpIncompatibleError(target, 'this server was already flagged as missing OpenSSH posix-rename@openssh.com')
    }
}

/** True when an ext_openssh_rename failure means the server lacks posix-rename. */
export function isPosixRenameUnsupported(err: unknown): boolean {
    const e = err as { message?: string, code?: number | string }
    const msg = e.message || String(err)
    if (e.code === 8) return true
    return /posix-rename/i.test(msg) || /does not support this extended request/i.test(msg)
}

function sftpReaddir(sftp: SFTPWrapper, remoteDir: string, idle: IdleWatchdog): Promise<string[]> {
    idle.touch()
    return new Promise<string[]>((resolve, reject) => {
        sftp.readdir(remoteDir, (err, list) => {
            if (!err) {
                idle.touch()
                return resolve(list.map(entry => entry.filename))
            }
            const e = err as { code?: number, message?: string }
            if (e.code === 2 || e.message?.includes('No such file')) {
                return resolve([])
            }
            reject(new Error(`SFTP list error: ${e.message || err}`))
        })
    })
}

function sftpRemove(sftp: SFTPWrapper, remotePath: string, idle: IdleWatchdog): Promise<void> {
    idle.touch()
    return new Promise<void>((resolve, reject) => {
        sftp.unlink(remotePath, err => {
            if (!err) {
                idle.touch()
                return resolve()
            }
            const e = err as { code?: number, message?: string }
            if (e.code === 2 || e.message?.includes('No such file')) {
                return resolve()
            }
            reject(new Error(`SFTP unlink error: ${e.message || err}`))
        })
    })
}

function sftpPosixRename(sftp: SFTPWrapper, from: string, to: string, target: string, idle: IdleWatchdog): Promise<void> {
    idle.touch()
    return new Promise<void>((resolve, reject) => {
        sftp.ext_openssh_rename(from, to, err => {
            if (!err) {
                idle.touch()
                return resolve()
            }
            if (isPosixRenameUnsupported(err)) {
                return reject(flagIncompatible(target, err.message || String(err)))
            }
            reject(new Error(`SFTP rename error: ${err.message || err}`))
        })
    })
}

/** Write a remote file. One SSH login. Prefer `withSftpSession` when doing several calls. */
export async function sftpUpload(config: SftpConfig, remotePath: string, data: Buffer): Promise<void> {
    await withSftpSession(config, session => session.upload(remotePath, data))
}

/** Names in the session directory. Callers use this to drop shards the manifest does not name. */
export async function sftpList(config: SftpConfig, remoteDir = '.'): Promise<string[]> {
    return withSftpSession(config, session => session.list(remoteDir))
}

/** Remove a remote file. Missing files are ignored so cleanup can be retried. */
export async function sftpUnlink(config: SftpConfig, remotePath: string): Promise<void> {
    await withSftpSession(config, session => session.unlink(remotePath))
}

/** Write `dest.tmp` then POSIX-rename over `dest` so the previous dest survives an interrupted write. */
export async function sftpAtomicReplace(config: SftpConfig, destPath: string, data: Buffer): Promise<void> {
    await withSftpSession(config, session => session.atomicReplace(destPath, data))
}

/** Download a remote file. Returns `{ found: false }` if the file is not there. */
export async function sftpDownload(config: SftpConfig, remotePath: string): Promise<SFTPFile> {
    return withSftpSession(config, session => session.download(remotePath))
}
