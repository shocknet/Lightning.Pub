// BACKUP: SFTP client for uploading/downloading .enc files
//
// SFTP (SSH-based) was chosen over FTPS for firewall friendliness.
// Server is dumb storage — no Lightning.Pub-specific logic.
// Cloud managed = Shocknet-hosted; self-hosters run any standard SFTP server.

import { Client, SFTPWrapper } from 'ssh2'
import { getLogger } from '../helpers/logger.js'

const log = getLogger({ component: 'sftpBackup' })

export type SftpConfig = {
    host: string
    port?: number
    username: string
    password: string
}

// TODO: Cloud managed SFTP host details (Shocknet service URL, provisioning endpoint)
const CLOUD_SFTP_HOST = 'backup.lightning.pub'
const CLOUD_SFTP_PORT = 22

export function cloudSftpConfig(sftpUser: string, sftpPass: string): SftpConfig {
    return {
        host: CLOUD_SFTP_HOST,
        port: CLOUD_SFTP_PORT,
        username: sftpUser,
        password: sftpPass,
    }
}

function connectSftp(config: SftpConfig): Promise<{ client: Client, sftp: SFTPWrapper }> {
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
        client.on('error', (err) => {
            reject(new Error(`SFTP connection error: ${err.message}`))
        })
        client.connect({
            host: config.host,
            port: config.port ?? 22,
            username: config.username,
            password: config.password,
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

// Check if both backup files exist on the server.
export async function sftpCheckBackupExists(config: SftpConfig): Promise<boolean> {
    const { client, sftp } = await connectSftp(config)
    try {
        const exists = await new Promise<boolean>((resolve) => {
            sftp.stat('identity.enc', (err: any) => {
                if (err) return resolve(false)
                resolve(true)
            })
        })
        return exists
    } finally {
        client.end()
    }
}
