// BACKUP: Orchestrates per-table encrypted uploads and debounced hot paths
//
// One .enc file per exported table (see backupTables.ts). High-churn tables use
// `notifyBackupTableDebounced` so rapid writes coalesce into a single upload per table.
// Destinations: managed cloud SFTP, custom SFTP (phrase-derived login), optional local dir.

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
} from './segments.js'
import { BACKUP_RESTORE_ORDER, backupTableFilename, type BackupTableId } from './backupTables.js'
import SettingsManager from '../main/settingsManager.js'

export type { BackupTableId } from './backupTables.js'

const log = getLogger({ component: 'backupManager' })

const TABLE_DEBOUNCE_MS = 30_000

export class BackupManager {
    storage: Storage
    settings: SettingsManager
    private debounceTimers = new Map<BackupTableId, ReturnType<typeof setTimeout>>()
    private debouncedUploadInProgress = new Set<BackupTableId>()
    constructor(storage: Storage, settings: SettingsManager) {
        this.storage = storage
        this.settings = settings
    }

    private isBackupConfigured(): boolean {
        const bs = this.settings.getSettings().backupSettings
        const phrase = bs.derivationPhrase.trim()
        if (!phrase) return false
        const hasDest =
            bs.cloudEnabled ||
            bs.sftpEnabled ||
            !!bs.localPath?.trim()
        return hasDest
    }

    private async deriveKeys(): Promise<DerivedKeys> {
        const phrase = this.settings.getSettings().backupSettings.derivationPhrase.trim()
        return deriveBackupKeys(phrase, LATEST_DERIVATION_VERSION)
    }

    /** Full snapshot of every backup shard (e.g. after settings init or bulk deletes). */
    async uploadAllTables(): Promise<void> {
        if (!this.isBackupConfigured()) return
        const keys = await this.deriveKeys()
        for (const id of BACKUP_RESTORE_ORDER) {
            await this.uploadTable(id, keys)
        }
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
        if (!this.isBackupConfigured()) return
        const existing = this.debounceTimers.get(id)
        if (existing) clearTimeout(existing)
        this.debounceTimers.set(
            id,
            setTimeout(() => {
                this.debounceTimers.delete(id)
                this.flushDebouncedTable(id).catch(err => {
                    log(`Debounced backup upload failed (${id}): ${err.message}`)
                })
            }, TABLE_DEBOUNCE_MS),
        )
    }

    private async flushDebouncedTable(id: BackupTableId) {
        if (this.debouncedUploadInProgress.has(id)) return
        this.debouncedUploadInProgress.add(id)
        try {
            const keys = await this.deriveKeys()
            await this.uploadTable(id, keys)
        } finally {
            this.debouncedUploadInProgress.delete(id)
        }
    }

    private async uploadTable(id: BackupTableId, keys: DerivedKeys) {
        const encKey = keys.encKey
        let encrypted: Buffer
        switch (id) {
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
        await this.pushEncrypted(backupTableFilename(id), encrypted, keys)
    }

    private async pushEncrypted(filename: string, encrypted: Buffer, keys: DerivedKeys) {
        const bs = this.settings.getSettings().backupSettings
        const failures: string[] = []
        let anyOk = false

        if (bs.cloudEnabled) {
            try {
                await sftpUpload(cloudSftpConfig(keys.sftpUser, keys.sftpPass), filename, encrypted)
                log(`${filename} uploaded to cloud (${encrypted.length} bytes)`)
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
                    username: keys.sftpUser,
                    password: keys.sftpPass,
                }, filename, encrypted)
                log(`${filename} uploaded to SFTP ${bs.sftpHost}:${bs.sftpPort} (${encrypted.length} bytes)`)
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
                log(`${filename} written to ${fp} (${encrypted.length} bytes)`)
                anyOk = true
            } catch (err: any) {
                failures.push(`local: ${err.message}`)
            }
        }

        if (!anyOk && failures.length > 0) {
            throw new Error(failures.join('; '))
        }
    }

    stop() {
        for (const t of this.debounceTimers.values()) {
            clearTimeout(t)
        }
        this.debounceTimers.clear()
    }
}
