// BACKUP: SFTP client for uploading/downloading .enc files
//
// SFTP (SSH-based) was chosen over FTPS because nearly every VPS/NAS already runs an SSH
// server, so a self-hosted destination is just "create a user".
// Server is dumb storage — no Lightning.Pub-specific logic.
// Cloud managed = Shocknet-hosted (PubFTPService); self-hosters run any standard SFTP server.

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

// Upload a buffer to a remote file path. Latest-only: overwrites on each call.
export async function sftpUpload(config: SftpConfig, remotePath: string, data: Buffer): Promise<void> {
    const { client, sftp } = await connectSftp(config)
    try {
        await new Promise<void>((resolve, reject) => {
            const stream = sftp.createWriteStream(remotePath)
            stream.on('error', (err: Error) => reject(new Error(`SFTP write error: ${err.message}`)))
            stream.on('close', () => resolve())
            stream.end(data)
        })
        log(`Uploaded ${remotePath} (${data.length} bytes)`)
    } finally {
        client.end()
    }
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
