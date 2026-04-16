// BACKUP: Orchestrates backup triggers and debounced uploads
//
// Two upload paths:
//   - balances.enc: debounced ~30s after any balance change
//   - identity.enc: uploaded immediately on each relevant change event
//
// Both are encrypted client-side before upload; SFTP server never sees plaintext.

import { getLogger } from '../helpers/logger.js'
import { StorageInterface } from '../storage/db/storageInterface.js'
import {
    mapAdminSettingBackupRow, mapAppBackupRow, mapAppUserBackupRow, mapAppUserDeviceBackupRow,
    mapBalanceBackupRow, mapDebitAccessBackupRow, mapInviteTokenBackupRow, mapManagementGrantBackupRow,
    mapProductBackupRow, mapTrackedProviderBackupRow, mapUserOfferBackupRow, STRIPPED_SETTINGS_KEYS
} from './segments.js'
import { encryptPayload } from './encryption.js'
import { sftpUpload, cloudSftpConfig, type SftpConfig } from './sftpClient.js'
import Storage from '../storage/index.js'
import { BalancesData, encryptBalancesData, IdentityData } from './segments.js'
import { encryptIdentityData } from './segments.js'
const log = getLogger({ component: 'backupManager' })

const BALANCE_DEBOUNCE_MS = 30_000

export type BackupConfig = {
    enabled: boolean
    sftpConfig: SftpConfig
    encKey: Buffer
}

export class BackupManager {
    storage: Storage
    private config: BackupConfig
    private balanceTimer: ReturnType<typeof setTimeout> | null = null
    private balanceUploadInProgress = false
    constructor(storage: Storage, config: BackupConfig) {
        this.storage = storage
        this.config = config
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
    async notifyIdentityChanged() {
        if (!this.config?.enabled) return

        try {
            await this.uploadIdentity()
        } catch (err: any) {
            log(`Identity backup upload failed: ${err.message}`)
        }
    }

    async collectIdentitySegment(): Promise<IdentityData> {
        const applications = await this.storage.applicationStorage.ExportApplications()
        const applicationUsers = await this.storage.applicationStorage.ExportApplicationUsers()
        const userOffers = await this.storage.offerStorage.ExportUserOffers()
        const products = await this.storage.productStorage.ExportProducts()
        const managementGrants = await this.storage.managementStorage.ExportManagementGrants()
        const debitAccesses = await this.storage.debitStorage.ExportDebitAccess()
        const inviteTokens = await this.storage.applicationStorage.ExportInviteTokens()
        const appUserDevices = await this.storage.applicationStorage.ExportAppUserDevices()
        const adminSettings = await this.storage.settingsStorage.ExportSettings()
        return {
            adminSettings, applications, applicationUsers, appUserDevices,
            debitAccesses, inviteTokens, managementGrants, products, userOffers
        }
    }

    async collectBalancesSegment(): Promise<BalancesData> {
        const balances = await this.storage.userStorage.ExportBalances()
        const trackedProviders = await this.storage.liquidityStorage.ExportTrackedProviders()
        return {
            balances, trackedProviders
        }
    }

    private async uploadBalances() {
        if (this.balanceUploadInProgress) return
        this.balanceUploadInProgress = true

        try {
            const data = await this.collectBalancesSegment()
            const encrypted = encryptBalancesData(data, this.config.encKey)
            await sftpUpload(this.config.sftpConfig, 'balances.enc', encrypted)
            log(`balances.enc uploaded (${encrypted.length} bytes)`)
        } finally {
            this.balanceUploadInProgress = false
        }
    }

    private async uploadIdentity() {

        const data = await this.collectIdentitySegment()
        const encrypted = encryptIdentityData(data, this.config.encKey)
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
