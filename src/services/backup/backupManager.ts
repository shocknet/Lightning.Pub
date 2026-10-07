// BACKUP: Orchestrates encrypted snapshot generations and debounced hot paths
//
// A generation is one consistent export of every table (see backupTables.ts), written to
// `*.enc.tmp` first, then renamed over `*.enc`. Restore picks the newest generation that
// has every shard, so an interrupted publish cannot mix a new users file with old balances
// or truncate the previous good copy. High-churn notifies coalesce into one snapshot.
// A max-wait caps continuous resets so backups still run under sustained load.
// Destinations: managed cloud SFTP, custom SFTP (BACKUP_SFTP_USER/PASS override phrase-derived
// login when set), optional local dir.

import fs from 'fs'
import path from 'path'
import { getLogger } from '../helpers/logger.js'
import { deriveBackupKeys, LATEST_DERIVATION_VERSION, type DerivedKeys } from './derivation.js'
import { sftpUpload, sftpRenameOverwrite, cloudSftpConfig, customHostFingerprint, SftpAuthError, type SftpConfig } from './sftpClient.js'
import { provisionCloudAccount } from './cloudProvision.js'
import { atomicRenameFile, atomicWriteFile } from './atomicWrite.js'
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
import { BACKUP_RESTORE_ORDER, backupTableFilename, backupTableStagingFilename, type BackupTableId } from './backupTables.js'
import SettingsManager from '../main/settingsManager.js'

export type { BackupTableId } from './backupTables.js'


const TABLE_DEBOUNCE_MS = 30_000
/** Upper bound on how long uploads can be deferred while tables keep notifying. */
const TABLE_DEBOUNCE_MAX_MS = 5 * 60_000
const WAIT_IN_FLIGHT_MS = 10_000

type BackupDest =
    | { type: 'cloud'; config: SftpConfig }
    | { type: 'sftp'; config: SftpConfig }
    | { type: 'local'; dir: string }

export class BackupManager {
    log = getLogger({ component: 'backupManager' })
    storage: Storage
    settings: SettingsManager
    keys: DerivedKeys
    private snapshotTimer: ReturnType<typeof setTimeout> | null = null
    /** Start of the current coalescing window for max-wait (first notify since last flush). */
    private snapshotWindowStart: number | null = null
    private snapshotInProgress = false
    /**
     * Another notify arrived while a snapshot was still running. Without this, the
     * timer that fires mid-upload returns early and the newer state is never pushed.
     */
    private pendingAfterInFlight = false
    /** In-flight cloud sign-up, shared by shard uploads that hit a rejected login together. */
    private cloudSignUp: Promise<void> | null = null
    shuttingDown = false
    /** Null until the address count has been snapshotted from LND. */
    private addressesCount: number | null = null
    /**
     * undefined: channel state not reported yet. null: the node has no channels.
     * Otherwise the LND multi-channel backup.
     */
    private scb: Uint8Array | null | undefined = undefined
    private lastGeneration = 0
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

    /**
     * Immediate snapshot of every backup shard (startup, newly enabled destination, bulk deletes).
     * Empty tables are still written so restore has a complete file set. Cancels pending
     * debounce so this flush is not followed by a duplicate timer fire.
     */
    async uploadAllTables(): Promise<void> {
        this.clearSnapshotTimer()
        await this.flushSnapshot()
    }

    async AddressUpdate(count: number) {
        this.addressesCount = count
        this.scheduleSnapshot()
    }

    /** Latest LND channel backup, or null when the node has no channels. Stored in the indexes shard. */
    ChannelBackupUpdate(scb: Uint8Array | null) {
        this.scb = scb
        this.scheduleSnapshot()
    }

    /** The indexes row, only once both halves are known. A half-known row would overwrite a good one. */
    private indexesRow(): IndexesRow | null {
        if (this.addressesCount === null || this.scb === undefined) {
            return null
        }
        return { addressesCount: this.addressesCount, scb: this.scb }
    }

    /** Schedule a full consistent snapshot (shares one key derivation per publish). */
    async notifyBackupTable(...ids: BackupTableId[]): Promise<void> {
        if (!this.isBackupConfigured() || ids.length === 0) return
        this.scheduleSnapshot()
    }

    private clearSnapshotTimer() {
        if (this.snapshotTimer) {
            clearTimeout(this.snapshotTimer)
            this.snapshotTimer = null
        }
        this.snapshotWindowStart = null
    }

    /** Debounced full snapshot (coalesces rapid writes across tables). */
    private scheduleSnapshot() {
        if (this.shuttingDown) {
            this.log("shutting down, skipping backup snapshot")
            return
        }
        const isBackupConfigured = this.isBackupConfigured()
        this.log("scheduling backup snapshot isBackupConfigured: " + isBackupConfigured)
        if (!isBackupConfigured) return
        if (this.snapshotInProgress) {
            this.pendingAfterInFlight = true
        }
        if (this.snapshotTimer) clearTimeout(this.snapshotTimer)

        if (this.snapshotWindowStart === null) {
            this.snapshotWindowStart = Date.now()
        }
        const debounceAt = Date.now() + TABLE_DEBOUNCE_MS
        const maxAt = this.snapshotWindowStart + TABLE_DEBOUNCE_MAX_MS
        const nextFire = Math.min(debounceAt, maxAt)
        const delayMs = Math.max(0, Math.ceil(nextFire - Date.now()))

        this.snapshotTimer = setTimeout(() => {
            this.snapshotTimer = null
            this.snapshotWindowStart = null
            this.flushSnapshot().catch(err => {
                this.log(`Debounced backup snapshot failed: ${err.message}`)
            })
        }, delayMs)
    }

    private async flushSnapshot() {
        if (this.snapshotInProgress) {
            this.pendingAfterInFlight = true
            return
        }
        this.snapshotInProgress = true
        try {
            // Drain notifies that arrive during a publish so the latest snapshot is not dropped.
            do {
                this.pendingAfterInFlight = false
                await this.publishGeneration()
            } while (this.pendingAfterInFlight && !this.shuttingDown)
        } finally {
            this.snapshotInProgress = false
        }
    }

    private nextGeneration(): number {
        const now = Date.now()
        this.lastGeneration = Math.max(this.lastGeneration + 1, now)
        return this.lastGeneration
    }

    private async publishGeneration(): Promise<void> {
        if (!this.isBackupConfigured()) return
        const indexes = this.indexesRow()
        if (!indexes) {
            this.log("address count or channel backup not snapshotted yet, leaving previous backup unchanged")
            return
        }
        const generation = this.nextGeneration()
        this.log("publishing backup generation " + generation)
        let shards: Map<BackupTableId, Buffer>
        try {
            shards = await this.exportGeneration(generation, indexes)
        } catch (err: any) {
            this.log(`Backup export failed: ${err.message}`)
            return
        }
        const dests = this.configuredDests()
        const failures: string[] = []
        let anyOk = false
        for (const dest of dests) {
            try {
                await this.publishGenerationToDest(dest, shards)
                anyOk = true
            } catch (err: any) {
                failures.push(`${dest.type}: ${err.message}`)
            }
        }
        if (!anyOk && failures.length > 0) {
            throw new Error(failures.join('; '))
        }
        if (failures.length > 0) {
            this.log(`Backup generation ${generation} partial: ${failures.join('; ')}`)
        } else {
            this.log("backup generation published: " + generation)
        }
    }

    private async exportGeneration(generation: number, indexes: IndexesRow): Promise<Map<BackupTableId, Buffer>> {
        const encKey = this.keys.encKey
        const encrypt = (id: BackupTableId, rows: Uint8Array[]) => {
            return [id, encryptTableRows(rows, encKey, generation)] as const
        }
        const exported = await this.storage.StartTransaction(async tx => {
            return {
                applications: await this.storage.applicationStorage.ExportApplications(tx),
                applicationUsers: await this.storage.applicationStorage.ExportApplicationUsers(tx),
                adminSettings: await this.storage.settingsStorage.ExportSettings(tx),
                appUserDevices: await this.storage.applicationStorage.ExportAppUserDevices(tx),
                userOffers: await this.storage.offerStorage.ExportUserOffers(tx),
                products: await this.storage.productStorage.ExportProducts(tx),
                managementGrants: await this.storage.managementStorage.ExportManagementGrants(tx),
                debitAccesses: await this.storage.debitStorage.ExportDebitAccess(tx),
                inviteTokens: await this.storage.applicationStorage.ExportInviteTokens(tx),
                userBalances: await this.storage.userStorage.ExportBalances(tx),
                trackedProviders: await this.storage.liquidityStorage.ExportTrackedProviders(tx),
            }
        }, 'backup-snapshot')
        const shards = new Map<BackupTableId, Buffer>([
            encrypt('indexes', [encodeIndexesRow(indexes)]),
            encrypt('applications', exported.applications.map(encodeApplicationRow)),
            encrypt('application_users', exported.applicationUsers.map(encodeApplicationUserRow)),
            encrypt('admin_settings', exported.adminSettings.map(encodeAdminSettingRow)),
            encrypt('app_user_devices', exported.appUserDevices.map(encodeAppUserDeviceRow)),
            encrypt('user_offers', exported.userOffers.map(encodeUserOfferRow)),
            encrypt('products', exported.products.map(encodeProductRow)),
            encrypt('management_grants', exported.managementGrants.map(encodeManagementGrantRow)),
            encrypt('debit_accesses', exported.debitAccesses.map(encodeDebitAccessRow)),
            encrypt('invite_tokens', exported.inviteTokens.map(encodeInviteTokenRow)),
            encrypt('user_balances', exported.userBalances.map(encodeBalanceRow)),
            encrypt('tracked_providers', exported.trackedProviders.map(encodeTrackedProviderRow)),
        ])
        return shards
    }

    private configuredDests(): BackupDest[] {
        const bs = this.settings.getSettings().backupSettings
        const dests: BackupDest[] = []
        if (bs.cloudEnabled) {
            dests.push({ type: 'cloud', config: cloudSftpConfig(this.keys.sftpUser, this.keys.sftpPass) })
        }
        if (bs.sftpEnabled) {
            dests.push({
                type: 'sftp',
                config: {
                    host: bs.sftpHost,
                    port: bs.sftpPort,
                    username: bs.sftpUser || this.keys.sftpUser,
                    password: bs.sftpPass || this.keys.sftpPass,
                    hostFingerprint: customHostFingerprint(bs.sftpHost, bs.sftpPort, bs.sftpHostFingerprint),
                },
            })
        }
        const localDir = bs.localPath?.trim()
        if (localDir) {
            dests.push({ type: 'local', dir: localDir })
        }
        return dests
    }

    private async publishGenerationToDest(dest: BackupDest, shards: Map<BackupTableId, Buffer>) {
        for (const id of BACKUP_RESTORE_ORDER) {
            const encrypted = shards.get(id)
            if (!encrypted) continue
            await this.writeDest(dest, backupTableStagingFilename(id), encrypted)
        }
        for (const id of BACKUP_RESTORE_ORDER) {
            await this.renameDest(dest, backupTableStagingFilename(id), backupTableFilename(id))
        }
    }

    private async writeDest(dest: BackupDest, filename: string, encrypted: Buffer) {
        switch (dest.type) {
            case 'local':
                atomicWriteFile(path.join(dest.dir, filename), encrypted)
                this.log(`${filename} written to ${path.join(dest.dir, filename)} (${encrypted.length} bytes)`)
                return
            case 'cloud':
                await this.uploadToCloud(filename, encrypted)
                this.log(`${filename} uploaded to cloud (${encrypted.length} bytes)`)
                return
            case 'sftp':
                await sftpUpload(dest.config, filename, encrypted)
                this.log(`${filename} uploaded to SFTP ${dest.config.host}:${dest.config.port ?? 22} (${encrypted.length} bytes)`)
                return
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    private async renameDest(dest: BackupDest, from: string, to: string) {
        switch (dest.type) {
            case 'local': {
                const fromPath = path.join(dest.dir, from)
                const toPath = path.join(dest.dir, to)
                if (!fs.existsSync(fromPath)) {
                    throw new Error(`missing staging file ${fromPath}`)
                }
                atomicRenameFile(fromPath, toPath)
                return
            }
            case 'cloud':
                await this.renameOnCloud(from, to)
                return
            case 'sftp':
                await sftpRenameOverwrite(dest.config, from, to)
                return
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    /** A rejected login means this seed has no cloud account yet: sign up once, then retry. */
    private async uploadToCloud(filename: string, encrypted: Buffer) {
        const config = cloudSftpConfig(this.keys.sftpUser, this.keys.sftpPass)
        try {
            await sftpUpload(config, filename, encrypted)
        } catch (err) {
            if (!(err instanceof SftpAuthError)) throw err
            await this.signUpForCloud()
            await sftpUpload(config, filename, encrypted)
        }
    }

    private async renameOnCloud(from: string, to: string) {
        const config = cloudSftpConfig(this.keys.sftpUser, this.keys.sftpPass)
        try {
            await sftpRenameOverwrite(config, from, to)
        } catch (err) {
            if (!(err instanceof SftpAuthError)) throw err
            await this.signUpForCloud()
            await sftpRenameOverwrite(config, from, to)
        }
    }

    private signUpForCloud(): Promise<void> {
        if (!this.cloudSignUp) {
            this.log("no cloud backup account for this seed yet, signing up")
            this.cloudSignUp = provisionCloudAccount(this.keys.sftpUser, this.keys.sftpPass)
                .then(() => { this.log("cloud backup account ready") })
                .finally(() => { this.cloudSignUp = null })
        }
        return this.cloudSignUp
    }

    private async waitUntilUploadsIdle(timeoutMs: number): Promise<void> {
        const start = Date.now()
        while (this.snapshotInProgress) {
            if (Date.now() - start > timeoutMs) {
                return
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 25))
        }
    }

    /**
     * Run before DB/storage teardown: clear debounce timers, let in-flight snapshots finish,
     * then upload every table once so remote matches current DB.
     */
    async shutdown(): Promise<void> {
        this.shuttingDown = true
        this.clearSnapshotTimer()
        this.pendingAfterInFlight = false
        await this.waitUntilUploadsIdle(WAIT_IN_FLIGHT_MS)
        await this.publishGeneration()
    }
}
