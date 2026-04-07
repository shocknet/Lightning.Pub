// BACKUP: Orchestrates backup triggers and debounced uploads
//
// Two upload paths:
//   - balances.enc: debounced ~30s after any balance change
//   - identity.enc: uploaded immediately on each relevant change event
//
// Both are encrypted client-side before upload; SFTP server never sees plaintext.

import { getLogger } from '../helpers/logger.js'
import { StorageInterface } from '../storage/db/storageInterface.js'
import { collectBalancesSegment, collectIdentitySegment } from './segments.js'
import { encryptPayload } from './encryption.js'
import { sftpUpload, cloudSftpConfig, type SftpConfig } from './sftpClient.js'

const log = getLogger({ component: 'backupManager' })

const BALANCE_DEBOUNCE_MS = 30_000

export type BackupConfig = {
    enabled: boolean
    sftpConfig: SftpConfig
    encKey: Buffer
}

export class BackupManager {
    private config: BackupConfig | null = null
    private balanceTimer: ReturnType<typeof setTimeout> | null = null
    private balanceUploadInProgress = false

    configure(config: BackupConfig) {
        this.config = config
        log(`Backup ${config.enabled ? 'enabled' : 'disabled'}`)
    }

    // Call after any User.balance_sats change.
    // Debounces — on a busy node, waits 30s of quiet before uploading.
    notifyBalanceChanged() {
        if (!this.config?.enabled) return

        if (this.balanceTimer) {
            clearTimeout(this.balanceTimer)
        }

        this.balanceTimer = setTimeout(() => {
            this.uploadBalances().catch(err => {
                log(`Balance backup upload failed: ${err.message}`)
            })
        }, BALANCE_DEBOUNCE_MS)
    }

    // Call after any identity-segment-relevant change:
    // user registration, settings change, offer edit, etc.
    async notifyIdentityChanged(dbs: StorageInterface) {
        if (!this.config?.enabled) return

        try {
            await this.uploadIdentity(dbs)
        } catch (err: any) {
            log(`Identity backup upload failed: ${err.message}`)
        }
    }

    // --- Upload methods ---
    // TODO: These need a reference to `dbs` passed in. Currently the balance
    // upload has no dbs reference. The wiring layer (in main/index.ts or similar)
    // needs to supply this. For now, the balance upload stores a dbs ref at
    // configure time or the caller passes it.

    private dbs: StorageInterface | null = null

    setStorage(dbs: StorageInterface) {
        this.dbs = dbs
    }

    private async uploadBalances() {
        if (!this.config || !this.dbs) return
        if (this.balanceUploadInProgress) return
        this.balanceUploadInProgress = true

        try {
            const payload = await collectBalancesSegment(this.dbs)
            const encrypted = encryptPayload(payload, this.config.encKey)
            await sftpUpload(this.config.sftpConfig, 'balances.enc', encrypted)
            log(`balances.enc uploaded (${encrypted.length} bytes)`)
        } finally {
            this.balanceUploadInProgress = false
        }
    }

    private async uploadIdentity(dbs: StorageInterface) {
        if (!this.config) return

        const payload = await collectIdentitySegment(dbs)
        const encrypted = encryptPayload(payload, this.config.encKey)
        await sftpUpload(this.config.sftpConfig, 'identity.enc', encrypted)
        log(`identity.enc uploaded (${encrypted.length} bytes)`)
    }

    stop() {
        if (this.balanceTimer) {
            clearTimeout(this.balanceTimer)
            this.balanceTimer = null
        }
    }
}
