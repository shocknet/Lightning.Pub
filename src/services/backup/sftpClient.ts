// BACKUP: SFTP client for uploading/downloading .enc files
//
// SFTP (SSH-based) was chosen over FTPS because nearly every VPS/NAS already runs an SSH
// server, so a self-hosted destination is just "create a user".
// Server is dumb storage — no Lightning.Pub-specific logic. Atomic replace needs
// OpenSSH posix-rename@openssh.com; a server without it is flagged incompatible.
// Cloud managed = Shocknet-hosted (PubFTPService); self-hosters run OpenSSH.
//
// Every connect/upload/download is bounded: handshake readyTimeout, a hard operation
// deadline, an idle timeout while a download is receiving bytes, and a max download size.
// A server that authenticates then stalls is destroyed rather than left hanging.

import crypto from 'crypto'
import { Client, SFTPWrapper } from 'ssh2'
import { getLogger } from '../helpers/logger.js'

const log = getLogger({ component: 'sftpBackup' })

/** SSH handshake + auth. ssh2's readyTimeout. */
export const SFTP_READY_TIMEOUT_MS = 15_000
/** Connect through the last SFTP request (write, rename, or download). */
export const SFTP_OP_TIMEOUT_MS = 60_000
/** Abort a download that has stopped receiving bytes. */
export const SFTP_IDLE_TIMEOUT_MS = 20_000
/** Refuse a shard that would blow memory. Encrypted tables are far smaller. */
export const SFTP_MAX_DOWNLOAD_BYTES = 64 * 1024 * 1024
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

export const CLOUD_SFTP_HOST = 'backup.lightning.pub'
const CLOUD_SFTP_PORT = 22
// Production PubFTPService host key. Rotating it on the server requires a Pub release.
export const CLOUD_SFTP_HOST_FINGERPRINT = 'SHA256:3bEOvUFGn+Ts/kfRtKV5AGd3j4AAoWM2c60w9pSpdM8'

/** The server rejected our login (no account yet, or wrong credentials). */
export class SftpAuthError extends Error { }

/** Handshake or transfer did not finish before the deadline; the client was destroyed. */
export class SftpTimeoutError extends Error {
    constructor(target: string, ms: number) {
        super(`SFTP operation timed out after ${ms}ms connecting to ${target}`)
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
    if (host === CLOUD_SFTP_HOST && port === CLOUD_SFTP_PORT) return CLOUD_SFTP_HOST_FINGERPRINT
    return undefined
}

export function normalizeFingerprint(fp: string): string {
    return fp.trim().replace(/^SHA256:/, '').replace(/=+$/, '')
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
    constructor(private readonly ms: number, private readonly onIdle: () => void) { }
    touch() {
        if (this.ms <= 0) return
        this.clear()
        this.timer = setTimeout(() => this.onIdle(), this.ms)
    }
    clear() {
        if (this.timer) {
            clearTimeout(this.timer)
            this.timer = undefined
        }
    }
}

function closeClient(client: Client | undefined, force: boolean) {
    if (!client) return
    try {
        if (force) client.destroy()
        else client.end()
    } catch { /* already gone */ }
}

function connectSftp(config: SftpConfig): Promise<{ client: Client, sftp: SFTPWrapper }> {
    const port = config.port ?? 22
    const target = `${config.host}:${port}`
    const expected = config.hostFingerprint ? normalizeFingerprint(config.hostFingerprint) : undefined
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

async function withSftp<T>(config: SftpConfig, fn: (sftp: SFTPWrapper, idle: IdleWatchdog) => Promise<T>): Promise<T> {
    const target = sftpTarget(config)
    const opTimeoutMs = config.opTimeoutMs ?? SFTP_OP_TIMEOUT_MS
    const idleTimeoutMs = config.idleTimeoutMs ?? SFTP_IDLE_TIMEOUT_MS
    let client: Client | undefined
    let aborted = false
    let opTimer: ReturnType<typeof setTimeout> | undefined
    let idle: IdleWatchdog | undefined

    const abort = () => {
        aborted = true
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
                abort()
                const err = new SftpTimeoutError(target, opTimeoutMs)
                log(err.message)
                done(err)
            }, opTimeoutMs)
            idle = new IdleWatchdog(idleTimeoutMs, () => {
                abort()
                const err = new SftpTimeoutError(target, idleTimeoutMs)
                log(err.message)
                done(err)
            })
            void (async () => {
                try {
                    const conn = await connectSftp(config)
                    client = conn.client
                    if (aborted) {
                        closeClient(client, true)
                        client = undefined
                        return
                    }
                    done(null, await fn(conn.sftp, idle!))
                } catch (err) {
                    done(err instanceof Error ? err : new Error(String(err)))
                }
            })()
        })
    } finally {
        if (opTimer) clearTimeout(opTimer)
        idle?.clear()
        closeClient(client, aborted)
        client = undefined
    }
}

function sftpWriteStream(sftp: SFTPWrapper, remotePath: string, data: Buffer, idle: IdleWatchdog): Promise<void> {
    idle.touch()
    return new Promise<void>((resolve, reject) => {
        let settled = false
        const done = (err?: Error) => {
            if (settled) return
            settled = true
            if (err) reject(err)
            else resolve()
        }
        const stream = sftp.createWriteStream(remotePath)
        stream.on('drain', () => idle.touch())
        stream.on('error', (err: Error) => done(new Error(`SFTP write error: ${err.message}`)))
        stream.on('finish', () => done())
        stream.on('close', () => done())
        stream.end(data)
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

/** Write a remote file. Used by sftpAtomicReplace for the staging name. */
export async function sftpUpload(config: SftpConfig, remotePath: string, data: Buffer): Promise<void> {
    await withSftp(config, (sftp, idle) => sftpWriteStream(sftp, remotePath, data, idle))
    log(`Uploaded ${remotePath} (${data.length} bytes)`)
}

/** Write `dest.tmp` then POSIX-rename over `dest` so the previous dest survives an interrupted write. */
export async function sftpAtomicReplace(config: SftpConfig, destPath: string, data: Buffer): Promise<void> {
    throwIfHostIncompatible(config)
    const target = sftpTarget(config)
    const tmpPath = `${destPath}.tmp`
    await withSftp(config, async (sftp, idle) => {
        await sftpWriteStream(sftp, tmpPath, data, idle)
        await sftpPosixRename(sftp, tmpPath, destPath, target, idle)
    })
    log(`Uploaded ${destPath} (${data.length} bytes)`)
}

export type SFTPFile = { found: true, data: Buffer } | { found: false }
// Download a remote file. Returns null if file not found.
export async function sftpDownload(config: SftpConfig, remotePath: string): Promise<SFTPFile> {
    const maxBytes = config.maxDownloadBytes ?? SFTP_MAX_DOWNLOAD_BYTES
    return withSftp(config, (sftp, idle) => sftpReadFile(sftp, remotePath, maxBytes, idle))
}
