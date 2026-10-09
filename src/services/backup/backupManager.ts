// BACKUP: Orchestrates per-table encrypted uploads and debounced hot paths
//
// One .enc file per exported table (see backupTables.ts). Live notifies replace
// only the tables that changed. Startup, newly enabled destinations, bulk deletes,
// and shutdown still push every shard so restore has a complete file set.
// Each replace writes `*.enc.tmp` (or a local `.part`) then renames over `*.enc`, so a
// failed upload cannot truncate the previous good copy of that table.
// High-churn tables coalesce into one upload per table; a max-wait caps continuous resets.
// Destinations: managed cloud SFTP, custom SFTP (BACKUP_SFTP_USER/PASS override phrase-derived
// login when set), optional local dir. Local is written first so a stalled remote cannot
// block the on-disk copy. Remotes run in parallel. Failed shards retry with backoff.

import path from 'path'
import { getLogger } from '../helpers/logger.js'
import { deriveBackupKeys, LATEST_DERIVATION_VERSION, type DerivedKeys } from './derivation.js'
import { sftpAtomicReplace, cloudSftpConfig, customHostFingerprint, SftpAuthError, SftpIncompatibleError, type SftpConfig } from './sftpClient.js'
import { provisionCloudAccount } from './cloudProvision.js'
import { atomicWriteFile } from './atomicWrite.js'
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
export const WAIT_IN_FLIGHT_MS = 10_000
/** Hard cap on the shutdown snapshot after the idle wait. Remotes must not block exit. */
export const SHUTDOWN_FLUSH_MS = 15_000
export const RETRY_BASE_MS = 30_000
const RETRY_MAX_MS = 5 * 60_000

type BackupDest =
    | { type: 'cloud'; config: SftpConfig }
    | { type: 'sftp'; config: SftpConfig }
    | { type: 'local'; dir: string }

export class BackupManager {
    log = getLogger({ component: 'backupManager' })
    storage: Storage
    settings: SettingsManager
    keys: DerivedKeys
    private debounceTimers = new Map<BackupTableId, ReturnType<typeof setTimeout>>()
    /** Start of the current coalescing window for max-wait (first notify since last flush). */
    private debounceWindowStart = new Map<BackupTableId, number>()
    private debouncedUploadInProgress = new Set<BackupTableId>()
    /**
     * Tables that got another notify while their upload was still running. Without this, the
     * timer that fires mid-upload returns early and the newer state is never pushed.
     */
    private pendingAfterInFlight = new Set<BackupTableId>()
    /** Serializes replace of a given table so shutdown/full flush cannot overlap a live upload. */
    private tableUploadTail = new Map<BackupTableId, Promise<void>>()
    private retryTimers = new Map<BackupTableId, ReturnType<typeof setTimeout>>()
    private retryAttempt = new Map<BackupTableId, number>()
    /** Remotes kicked off during shutdown; awaited with a deadline after local snapshots. */
    private shutdownRemotePushes: Promise<void>[] = []
    /** In-flight cloud sign-up, shared by shard uploads that hit a rejected login together. */
    private cloudSignUp: Promise<void> | null = null
    shuttingDown = false
    /** Overridable in tests so retries do not wait the production 30s. */
    retryBaseMs = RETRY_BASE_MS
    waitInFlightMs = WAIT_IN_FLIGHT_MS
    shutdownFlushMs = SHUTDOWN_FLUSH_MS
    /** Null until the address count has been snapshotted from LND. */
    private addressesCount: number | null = null
    /**
     * undefined: channel state not reported yet. null: the node has no channels.
     * Otherwise the LND multi-channel backup.
     */
    private scb: Uint8Array | null | undefined = undefined
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
     * Immediate upload of every backup shard (startup, newly enabled destination, bulk deletes).
     * Empty tables are still written so restore has a complete file set. Cancels pending
     * debounce so this flush is not followed by a duplicate timer fire.
     */
    async uploadAllTables(): Promise<void> {
        this.clearAllDebounce()
        await this.waitUntilUploadsIdle(this.waitInFlightMs)
        await this.uploadTables(BACKUP_RESTORE_ORDER)
    }

    async AddressUpdate(count: number) {
        this.addressesCount = count
        this.notifyBackupTableDebounced('indexes')
    }

    /** Latest LND channel backup, or null when the node has no channels. Stored in the indexes shard. */
    ChannelBackupUpdate(scb: Uint8Array | null) {
        this.scb = scb
        this.notifyBackupTableDebounced('indexes')
    }

    /** The indexes row, only once both halves are known. A half-known row would overwrite a good one. */
    private indexesRow(): IndexesRow | null {
        if (this.addressesCount === null || this.scb === undefined) {
            return null
        }
        return { addressesCount: this.addressesCount, scb: this.scb }
    }

    /** Schedule an upload of only the tables that changed. */
    async notifyBackupTable(...ids: BackupTableId[]): Promise<void> {
        if (!this.isBackupConfigured() || ids.length === 0) return
        for (const id of ids) {
            this.notifyBackupTableDebounced(id)
        }
    }

    private clearAllDebounce() {
        for (const t of this.debounceTimers.values()) {
            clearTimeout(t)
        }
        this.debounceTimers.clear()
        this.debounceWindowStart.clear()
        this.pendingAfterInFlight.clear()
        this.clearAllRetries()
    }

    private clearRetry(id: BackupTableId) {
        const t = this.retryTimers.get(id)
        if (t) clearTimeout(t)
        this.retryTimers.delete(id)
        this.retryAttempt.delete(id)
    }

    private clearAllRetries() {
        for (const t of this.retryTimers.values()) {
            clearTimeout(t)
        }
        this.retryTimers.clear()
        this.retryAttempt.clear()
    }

    private scheduleRetry(id: BackupTableId) {
        if (this.shuttingDown || this.retryTimers.has(id) || this.debounceTimers.has(id)) return
        const attempt = this.retryAttempt.get(id) ?? 0
        const delay = Math.min(RETRY_MAX_MS, this.retryBaseMs * 2 ** attempt)
        this.retryAttempt.set(id, attempt + 1)
        this.retryTimers.set(
            id,
            setTimeout(() => {
                this.retryTimers.delete(id)
                this.flushDebouncedTable(id).catch(err => {
                    this.log(`Retry backup upload failed (${id}): ${err.message}`)
                })
            }, delay),
        )
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
        this.clearRetry(id)
        if (this.debouncedUploadInProgress.has(id)) {
            this.pendingAfterInFlight.add(id)
        }
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
        if (this.debouncedUploadInProgress.has(id)) {
            this.pendingAfterInFlight.add(id)
            return
        }
        this.debounceWindowStart.delete(id)
        this.debouncedUploadInProgress.add(id)
        try {
            // Drain notifies that arrive during an upload so the latest snapshot is not dropped.
            do {
                this.pendingAfterInFlight.delete(id)
                await this.uploadTable(id)
            } while (this.pendingAfterInFlight.has(id) && !this.shuttingDown)
        } finally {
            this.debouncedUploadInProgress.delete(id)
        }
    }

    private async uploadTables(ids: readonly BackupTableId[]): Promise<void> {
        if (!this.isBackupConfigured()) return
        const failures: string[] = []
        let anyOk = false
        for (const id of ids) {
            try {
                if (await this.uploadTable(id)) {
                    anyOk = true
                }
            } catch (err: any) {
                failures.push(`${id}: ${err.message}`)
            }
        }
        if (!anyOk && failures.length > 0) {
            throw new Error(failures.join('; '))
        }
        if (failures.length > 0) {
            this.log(`Backup upload partial: ${failures.join('; ')}`)
        }
    }

    /** Returns false when this table was skipped (indexes not snapshotted yet). */
    private async uploadTable(id: BackupTableId): Promise<boolean> {
        const prev = this.tableUploadTail.get(id) ?? Promise.resolve()
        const run = prev.then(() => this.replaceTable(id), () => this.replaceTable(id))
        this.tableUploadTail.set(id, run.then(() => undefined, () => undefined))
        return run
    }

    private async replaceTable(id: BackupTableId): Promise<boolean> {
        this.log("uploading table: " + id)
        const encrypted = await this.exportTable(id)
        if (!encrypted) {
            return false
        }
        const result = await this.pushEncrypted(backupTableFilename(id), encrypted)
        if (result.retryable) {
            this.scheduleRetry(id)
        } else {
            this.clearRetry(id)
        }
        if (!result.anyOk && result.failures.length > 0) {
            throw new Error(result.failures.join('; '))
        }
        if (result.failures.length > 0) {
            this.log(`${backupTableFilename(id)} partial: ${result.failures.join('; ')}`)
        }
        this.log("table uploaded: " + id)
        return true
    }

    private async exportTable(id: BackupTableId): Promise<Buffer | null> {
        const encKey = this.keys.encKey
        const encrypt = (rows: Uint8Array[]) => encryptTableRows(rows, encKey)
        switch (id) {
            case 'indexes': {
                const row = this.indexesRow()
                if (!row) {
                    this.log("address count or channel backup not snapshotted yet, leaving indexes.enc unchanged")
                    return null
                }
                return encrypt([encodeIndexesRow(row)])
            }
            case 'applications':
                return encrypt((await this.storage.applicationStorage.ExportApplications()).map(encodeApplicationRow))
            case 'application_users':
                return encrypt((await this.storage.applicationStorage.ExportApplicationUsers()).map(encodeApplicationUserRow))
            case 'admin_settings':
                return encrypt((await this.storage.settingsStorage.ExportSettings()).map(encodeAdminSettingRow))
            case 'app_user_devices':
                return encrypt((await this.storage.applicationStorage.ExportAppUserDevices()).map(encodeAppUserDeviceRow))
            case 'user_offers':
                return encrypt((await this.storage.offerStorage.ExportUserOffers()).map(encodeUserOfferRow))
            case 'products':
                return encrypt((await this.storage.productStorage.ExportProducts()).map(encodeProductRow))
            case 'management_grants':
                return encrypt((await this.storage.managementStorage.ExportManagementGrants()).map(encodeManagementGrantRow))
            case 'debit_accesses':
                return encrypt((await this.storage.debitStorage.ExportDebitAccess()).map(encodeDebitAccessRow))
            case 'invite_tokens':
                return encrypt((await this.storage.applicationStorage.ExportInviteTokens()).map(encodeInviteTokenRow))
            case 'user_balances':
                return encrypt((await this.storage.userStorage.ExportBalances()).map(encodeBalanceRow))
            case 'tracked_providers':
                return encrypt((await this.storage.liquidityStorage.ExportTrackedProviders()).map(encodeTrackedProviderRow))
            default: {
                const _exhaustive: never = id
                throw new Error(`Unhandled backup table: ${_exhaustive}`)
            }
        }
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

    private destFailure(dest: BackupDest, err: unknown): { message: string, retryable: boolean } {
        const message = `${dest.type}: ${err instanceof Error ? err.message : String(err)}`
        return { message, retryable: !(err instanceof SftpIncompatibleError) }
    }

    private async pushEncrypted(filename: string, encrypted: Buffer): Promise<{ anyOk: boolean, failures: string[], retryable: boolean }> {
        const dests = this.configuredDests()
        const locals = dests.filter(d => d.type === 'local')
        const remotes = dests.filter(d => d.type !== 'local')
        const failures: string[] = []
        let anyOk = false
        let retryable = false

        for (const dest of locals) {
            try {
                await this.replaceDest(dest, filename, encrypted)
                anyOk = true
            } catch (err: unknown) {
                const f = this.destFailure(dest, err)
                failures.push(f.message)
                if (f.retryable) retryable = true
            }
        }

        const remoteP = this.replaceRemotes(remotes, filename, encrypted)
        if (this.shuttingDown && anyOk) {
            this.shutdownRemotePushes.push(remoteP.then(remote => {
                if (remote.failures.length > 0) {
                    this.log(`${filename} remote ${remote.anyOk ? 'partial' : 'failed'}: ${remote.failures.join('; ')}`)
                }
            }))
            return { anyOk, failures, retryable }
        }

        const remote = await remoteP
        if (remote.anyOk) anyOk = true
        failures.push(...remote.failures)
        if (remote.retryable) retryable = true
        return { anyOk, failures, retryable }
    }

    private async replaceRemotes(remotes: BackupDest[], filename: string, encrypted: Buffer): Promise<{ anyOk: boolean, failures: string[], retryable: boolean }> {
        if (remotes.length === 0) {
            return { anyOk: false, failures: [], retryable: false }
        }
        const results = await Promise.allSettled(remotes.map(dest => this.replaceDest(dest, filename, encrypted)))
        const failures: string[] = []
        let anyOk = false
        let retryable = false
        for (let i = 0; i < results.length; i++) {
            const r = results[i]
            if (r.status === 'fulfilled') {
                anyOk = true
                continue
            }
            const f = this.destFailure(remotes[i], r.reason)
            failures.push(f.message)
            if (f.retryable) retryable = true
        }
        return { anyOk, failures, retryable }
    }

    private async replaceDest(dest: BackupDest, filename: string, encrypted: Buffer) {
        switch (dest.type) {
            case 'local':
                atomicWriteFile(path.join(dest.dir, filename), encrypted)
                this.log(`${filename} written to ${path.join(dest.dir, filename)} (${encrypted.length} bytes)`)
                return
            case 'cloud':
                await this.replaceOnCloud(filename, encrypted)
                this.log(`${filename} uploaded to cloud (${encrypted.length} bytes)`)
                return
            case 'sftp':
                await sftpAtomicReplace(dest.config, filename, encrypted)
                this.log(`${filename} uploaded to SFTP ${dest.config.host}:${dest.config.port ?? 22} (${encrypted.length} bytes)`)
                return
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    /** A rejected login means this seed has no cloud account yet: sign up once, then retry. */
    private async replaceOnCloud(filename: string, encrypted: Buffer) {
        const config = cloudSftpConfig(this.keys.sftpUser, this.keys.sftpPass)
        try {
            await sftpAtomicReplace(config, filename, encrypted)
        } catch (err) {
            if (!(err instanceof SftpAuthError)) throw err
            await this.signUpForCloud()
            await sftpAtomicReplace(config, filename, encrypted)
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
        while (this.debouncedUploadInProgress.size > 0) {
            if (Date.now() - start > timeoutMs) {
                return
            }
            await new Promise<void>((resolve) => setTimeout(resolve, 25))
        }
    }

    private async withTimeout(work: Promise<void>, timeoutMs: number, msg: string): Promise<void> {
        let timer: ReturnType<typeof setTimeout> | undefined
        try {
            await Promise.race([
                work,
                new Promise<never>((_, reject) => {
                    timer = setTimeout(() => reject(new Error(msg)), timeoutMs)
                }),
            ])
        } finally {
            if (timer) clearTimeout(timer)
        }
    }

    /**
     * Run before DB/storage teardown: clear debounce timers, let in-flight shard uploads finish,
     * then snapshot every table locally. Remotes are started but cannot block the deadline.
     */
    async shutdown(): Promise<void> {
        this.shuttingDown = true
        this.clearAllDebounce()
        await this.waitUntilUploadsIdle(this.waitInFlightMs)
        try {
            await this.withTimeout((async () => {
                await this.uploadTables(BACKUP_RESTORE_ORDER)
                if (this.shutdownRemotePushes.length > 0) {
                    await Promise.allSettled(this.shutdownRemotePushes)
                }
            })(), this.shutdownFlushMs, `Shutdown backup flush timed out after ${this.shutdownFlushMs}ms`)
        } catch (err: any) {
            this.log(`Shutdown backup failed: ${err.message}`)
        }
    }
}
