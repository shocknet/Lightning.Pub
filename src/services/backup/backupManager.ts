// BACKUP: Orchestrates per-table encrypted uploads and debounced hot paths
//
// One .enc file per exported table (see backupTables.ts). High-churn tables use
// `notifyBackupTableDebounced` so rapid writes coalesce into a single upload per table.
// A max-wait caps continuous resets so backups still run under sustained load.
// Destinations: managed cloud SFTP, custom SFTP (BACKUP_SFTP_USER/PASS override phrase-derived
// login when set), optional local dir.

import fs from 'fs'
import path from 'path'
import { getLogger } from '../helpers/logger.js'
import { deriveBackupKeys, LATEST_DERIVATION_VERSION, type DerivedKeys } from './derivation.js'
import { sftpUpload, cloudSftpConfig } from './sftpClient.js'
import Storage from '../storage/index.js'
import {
    encodeApplicationRow,
    encodeApplicationUserRow,
    encodeAdminSettingRow,
    encodeAppUserDeviceRow,
    encodeUserOfferRow,
    encodeProductRow,
    encodeManagementGrantRow,
    encodeDebitAccessRow,
    encodeInviteTokenRow,
    encodeBalanceRow,
    encodeTrackedProviderRow,
    encryptTableRows,
    IndexesRow,
    encodeIndexesRow,
} from './segments.js'
import { BACKUP_RESTORE_ORDER, backupTableFilename, type BackupTableId } from './backupTables.js'
import SettingsManager from '../main/settingsManager.js'

export type { BackupTableId } from './backupTables.js'


const TABLE_DEBOUNCE_MS = 30_000
/** Upper bound on how long uploads can be deferred while the same table keeps notifying. */
const TABLE_DEBOUNCE_MAX_MS = 5 * 60_000
const WAIT_IN_FLIGHT_MS = 10_000


export class BackupManager {
    log = getLogger({ component: 'backupManager' })
    storage: Storage
    settings: SettingsManager
    keys: DerivedKeys
    private debounceTimers = new Map<BackupTableId, ReturnType<typeof setTimeout>>()
    /** Start of the current coalescing window for max-wait (first notify since last flush). */
    private debounceWindowStart = new Map<BackupTableId, number>()
    private debouncedUploadInProgress = new Set<BackupTableId>()
    shuttingDown = false
    indexesBackup: IndexesRow | null = null
    constructor(storage: Storage, settings: SettingsManager) {
        this.storage = storage
        this.settings = settings
    }

    InitKeys = async (seed: string[]) => {
        if (!seed || seed.length === 0) {
            this.log("no seed provided, skipping backup initialization")
            return
        }
        const j = seed.join(' ')
        if (j.length === 0) {
            this.log("no seed provided, skipping backup initialization")
            return
        }
        this.keys = await deriveBackupKeys(j, LATEST_DERIVATION_VERSION)
    }

    private isBackupConfigured(): boolean {
        if (!this.keys) return false
        const bs = this.settings.getSettings().backupSettings
        const hasDest =
            bs.cloudEnabled ||
            bs.sftpEnabled ||
            !!bs.localPath?.trim()
        return hasDest
    }

    /** Full snapshot of every backup shard (e.g. after settings init or bulk deletes). */
    async uploadAllTables(): Promise<void> {
        if (!this.isBackupConfigured()) return
        for (const id of BACKUP_RESTORE_ORDER) {
            this.notifyBackupTableDebounced(id)
        }
    }

    async AddressUpdate(count: number) {
        this.indexesBackup = {
            addressesCount: count,
        }
        this.notifyBackupTableDebounced('indexes')
    }

    /** Immediately upload one or more table shards (shares one key derivation per call). */
    async notifyBackupTable(...ids: BackupTableId[]): Promise<void> {
        if (!this.isBackupConfigured() || ids.length === 0) return
        for (const id of ids) {
            this.notifyBackupTableDebounced(id)
        }
    }

    /** Debounced upload for any backup table (coalesces rapid writes per table id). */
    private notifyBackupTableDebounced(id: BackupTableId) {
        if (this.shuttingDown) {
            this.log("shutting down, skipping backup table debounced: " + id)
            return
        }
        const isBackupConfigured = this.isBackupConfigured()
        this.log("notifying backup table debounced: " + id + " isBackupConfigured: " + isBackupConfigured)
        if (!isBackupConfigured) return
        const existing = this.debounceTimers.get(id)
        if (existing) clearTimeout(existing)

        if (!this.debounceWindowStart.has(id)) {
            this.debounceWindowStart.set(id, Date.now())
        }
        const windowStart = this.debounceWindowStart.get(id)!
        const debounceAt = Date.now() + TABLE_DEBOUNCE_MS
        const maxAt = windowStart + TABLE_DEBOUNCE_MAX_MS
        const nextFire = Math.min(debounceAt, maxAt)
        const delayMs = Math.max(0, Math.ceil(nextFire - Date.now()))

        this.debounceTimers.set(
            id,
            setTimeout(() => {
                this.debounceTimers.delete(id)
                this.flushDebouncedTable(id).catch(err => {
                    this.log(`Debounced backup upload failed (${id}): ${err.message}`)
                })
            }, delayMs),
        )
    }

    private async flushDebouncedTable(id: BackupTableId) {
        if (this.debouncedUploadInProgress.has(id)) return
        this.debounceWindowStart.delete(id)
        this.debouncedUploadInProgress.add(id)
        try {
            await this.uploadTable(id)
        } finally {
            this.debouncedUploadInProgress.delete(id)
        }
    }

    private async uploadTable(id: BackupTableId) {
        this.log("uploading table: " + id)
        const encKey = this.keys.encKey
        let encrypted: Buffer
        switch (id) {
            case 'indexes': {
                if (!this.indexesBackup) {
                    return
                }
                const enc = [encodeIndexesRow(this.indexesBackup)]
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'applications': {
                const rows = await this.storage.applicationStorage.ExportApplications()
                const enc = rows.map(encodeApplicationRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'application_users': {
                const rows = await this.storage.applicationStorage.ExportApplicationUsers()
                const enc = rows.map(encodeApplicationUserRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'admin_settings': {
                const rows = await this.storage.settingsStorage.ExportSettings()
                const enc = rows.map(encodeAdminSettingRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'app_user_devices': {
                const rows = await this.storage.applicationStorage.ExportAppUserDevices()
                const enc = rows.map(encodeAppUserDeviceRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'user_offers': {
                const rows = await this.storage.offerStorage.ExportUserOffers()
                const enc = rows.map(encodeUserOfferRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'products': {
                const rows = await this.storage.productStorage.ExportProducts()
                const enc = rows.map(encodeProductRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'management_grants': {
                const rows = await this.storage.managementStorage.ExportManagementGrants()
                const enc = rows.map(encodeManagementGrantRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'debit_accesses': {
                const rows = await this.storage.debitStorage.ExportDebitAccess()
                const enc = rows.map(encodeDebitAccessRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'invite_tokens': {
                const rows = await this.storage.applicationStorage.ExportInviteTokens()
                const enc = rows.map(encodeInviteTokenRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'user_balances': {
                const rows = await this.storage.userStorage.ExportBalances()
                const enc = rows.map(encodeBalanceRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            case 'tracked_providers': {
                const rows = await this.storage.liquidityStorage.ExportTrackedProviders()
                const enc = rows.map(encodeTrackedProviderRow)
                encrypted = encryptTableRows(enc, encKey)
                break
            }
            default: {
                const _exhaustive: never = id
                throw new Error(`Unhandled backup table: ${_exhaustive}`)
            }
        }
        await this.pushEncrypted(backupTableFilename(id), encrypted)
        this.log("table uploaded: " + id)
    }

    private async pushEncrypted(filename: string, encrypted: Buffer) {
        const bs = this.settings.getSettings().backupSettings
        const failures: string[] = []
        let anyOk = false

        if (bs.cloudEnabled) {
            try {
                await sftpUpload(cloudSftpConfig(this.keys.sftpUser, this.keys.sftpPass), filename, encrypted)
                this.log(`${filename} uploaded to cloud (${encrypted.length} bytes)`)
                anyOk = true
            } catch (err: any) {
                failures.push(`cloud: ${err.message}`)
            }
        }

        if (bs.sftpEnabled) {
            try {
                await sftpUpload({
                    host: bs.sftpHost,
                    port: bs.sftpPort,
                    username: bs.sftpUser || this.keys.sftpUser,
                    password: bs.sftpPass || this.keys.sftpPass,
                }, filename, encrypted)
                this.log(`${filename} uploaded to SFTP ${bs.sftpHost}:${bs.sftpPort} (${encrypted.length} bytes)`)
                anyOk = true
            } catch (err: any) {
                failures.push(`sftp: ${err.message}`)
            }
        }

        const localDir = bs.localPath?.trim()
        if (localDir) {
            try {
                fs.mkdirSync(localDir, { recursive: true })
                const fp = path.join(localDir, filename)
                fs.writeFileSync(fp, encrypted)
                this.log(`${filename} written to ${fp} (${encrypted.length} bytes)`)
                anyOk = true
            } catch (err: any) {
                failures.push(`local: ${err.message}`)
            }
        }

        if (!anyOk && failures.length > 0) {
            throw new Error(failures.join('; '))
        }
    }

    private async waitUntilUploadsIdle(timeoutMs: number): Promise<void> {
        const start = Date.now()
        while (this.debouncedUploadInProgress.size > 0) {
            if (Date.now() - start > timeoutMs) {
                return
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 25))
        }
    }

    /**
     * Run before DB/storage teardown: clear debounce timers, let in-flight shard uploads finish,
     * then upload every table once so remote matches current DB.
     */
    async shutdown(): Promise<void> {
        this.shuttingDown = true
        for (const t of this.debounceTimers.values()) {
            clearTimeout(t)
        }
        this.debounceTimers.clear()
        this.debounceWindowStart.clear()
        await this.waitUntilUploadsIdle(WAIT_IN_FLIGHT_MS)
        if (!this.isBackupConfigured()) {
            return
        }
        for (const id of BACKUP_RESTORE_ORDER) {
            try {
                await this.uploadTable(id)
            } catch (err: any) {
                this.log(`Shutdown backup failed (${id}): ${err.message}`)
            }
        }
    }
}
