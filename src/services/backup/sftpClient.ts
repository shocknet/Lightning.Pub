// BACKUP: SFTP client for uploading/downloading .enc files
//
// SFTP (SSH-based) was chosen over FTPS because nearly every VPS/NAS already runs an SSH
// server, so a self-hosted destination is just "create a user".
// Server is dumb storage — no Lightning.Pub-specific logic. Atomic replace needs
// OpenSSH posix-rename@openssh.com; a server without it is flagged incompatible.
// Cloud managed = Shocknet-hosted (PubFTPService); self-hosters run OpenSSH.

import crypto from 'crypto'
import { Client, SFTPWrapper } from 'ssh2'
import { getLogger } from '../helpers/logger.js'

const log = getLogger({ component: 'sftpBackup' })

export type SftpConfig = {
    host: string
    port?: number
    username: string
    password: string
    /** SHA256 host key fingerprint as printed by `ssh-keygen -lf` (with or without "SHA256:"). */
    hostFingerprint?: string
}

export const CLOUD_SFTP_HOST = 'backup.lightning.pub'
const CLOUD_SFTP_PORT = 22
// Production PubFTPService host key. Rotating it on the server requires a Pub release.
export const CLOUD_SFTP_HOST_FINGERPRINT = 'SHA256:3bEOvUFGn+Ts/kfRtKV5AGd3j4AAoWM2c60w9pSpdM8'

/** The server rejected our login (no account yet, or wrong credentials). */
export class SftpAuthError extends Error { }

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

function connectSftp(config: SftpConfig): Promise<{ client: Client, sftp: SFTPWrapper }> {
    const port = config.port ?? 22
    const target = `${config.host}:${port}`
    const expected = config.hostFingerprint ? normalizeFingerprint(config.hostFingerprint) : undefined
    let mismatchedKey: string | undefined

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
        const client = new Client()
        client.on('ready', () => {
            client.sftp((err, sftp) => {
                if (err) {
                    client.end()
                    return reject(err)
                }
                resolve({ client, sftp })
            })
        })
        client.on('error', (err: Error & { level?: string }) => {
            if (mismatchedKey) {
                return reject(new Error(`SFTP host key mismatch for ${target}: expected SHA256:${expected}, got SHA256:${mismatchedKey}. Refusing to connect.`))
            }
            if (err.level === 'client-authentication') {
                return reject(new SftpAuthError(`SFTP login rejected by ${target}`))
            }
            reject(new Error(`SFTP connection error: ${err.message}`))
        })
        client.connect({
            host: config.host,
            port,
            username: config.username,
            password: config.password,
            hostVerifier,
        })
    })
}

async function withSftp<T>(config: SftpConfig, fn: (sftp: SFTPWrapper) => Promise<T>): Promise<T> {
    const { client, sftp } = await connectSftp(config)
    try {
        return await fn(sftp)
    } finally {
        client.end()
    }
}

function sftpWriteStream(sftp: SFTPWrapper, remotePath: string, data: Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const stream = sftp.createWriteStream(remotePath)
        stream.on('error', (err: Error) => reject(new Error(`SFTP write error: ${err.message}`)))
        stream.on('close', () => resolve())
        stream.end(data)
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

function sftpPosixRename(sftp: SFTPWrapper, from: string, to: string, target: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        sftp.ext_openssh_rename(from, to, err => {
            if (!err) {
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
    await withSftp(config, sftp => sftpWriteStream(sftp, remotePath, data))
    log(`Uploaded ${remotePath} (${data.length} bytes)`)
}

/** Write `dest.tmp` then POSIX-rename over `dest` so the previous dest survives an interrupted write. */
export async function sftpAtomicReplace(config: SftpConfig, destPath: string, data: Buffer): Promise<void> {
    throwIfHostIncompatible(config)
    const target = sftpTarget(config)
    const tmpPath = `${destPath}.tmp`
    await withSftp(config, async sftp => {
        await sftpWriteStream(sftp, tmpPath, data)
        await sftpPosixRename(sftp, tmpPath, destPath, target)
    })
    log(`Uploaded ${destPath} (${data.length} bytes)`)
}

export type SFTPFile = { found: true, data: Buffer } | { found: false }
// Download a remote file. Returns null if file not found.
export async function sftpDownload(config: SftpConfig, remotePath: string): Promise<SFTPFile> {
    const { client, sftp } = await connectSftp(config)
    try {
        return await new Promise<SFTPFile>((resolve, reject) => {
            const chunks: Buffer[] = []
            const stream = sftp.createReadStream(remotePath)
            stream.on('data', (chunk: Buffer) => chunks.push(chunk))
            stream.on('end', () => resolve({ found: true, data: Buffer.concat(chunks) }))
            stream.on('error', (err: any) => {
                if (err.code === 2 || err.message?.includes('No such file')) {
                    resolve({ found: false })
                } else {
                    reject(new Error(`SFTP read error: ${err.message}`))
                }
            })
        })
    } finally {
        client.end()
    }
}
