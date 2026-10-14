// BACKUP: Orchestrates per-table encrypted uploads and debounced hot paths
//
// One versioned shard per exported table (see backupTables.ts), published by an
// atomically replaced manifest.json. Live notifies upload only the tables that changed;
// unchanged filenames are copied from that destination's current manifest. Startup,
// newly enabled destinations, bulk deletes, and shutdown still push every shard so
// restore has a complete file set.
// Shards are written once to unique names. Local shard bytes and the directory entry
// are fsynced before the manifest is published. Only the manifest uses staging-and-rename
// (local `.part`, SFTP `manifest.json.tmp` + posix-rename). A failed shard is never
// referenced by the published manifest.
// Every publish re-reads that destination's manifest and copies unchanged names from
// that read, so a commit the client missed is not rolled back by a later batch.
// Shard files the manifest does not name are removed by listing the directory, which
// still works after a restart. After a successful manifest replace, superseded shards
// are deleted immediately. A failed attempt deletes the shards it uploaded only after a
// re-read shows the published manifest does not name them.
// High-churn tables coalesce into one batch; a max-wait caps continuous resets.
// Destinations: managed cloud SFTP, custom SFTP (BACKUP_SFTP_USER/PASS override phrase-derived
// login when set), optional local dir. Local is written first so a stalled remote cannot
// block the on-disk copy. Remotes run in parallel and keep one SSH session for the whole
// publish (read, list, uploads, rename, deletes). Failed batches retry with backoff.

import fs from 'fs'
import path from 'path'
import { getLogger } from '../helpers/logger.js'
import { deriveBackupKeys, LATEST_DERIVATION_VERSION, type DerivedKeys } from './derivation.js'
import { sftpAtomicReplace, sftpDownload, sftpList, sftpUnlink, sftpUpload, withSftpSession, cloudSftpConfig, customHostFingerprint, SftpAuthError, SftpIncompatibleError, type SftpConfig, type SftpSession } from './sftpClient.js'
import { provisionCloudAccount } from './cloudProvision.js'
import { atomicWriteFile, fsyncDirectory, writeNewDurableFile } from './atomicWrite.js'
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
import {
    BACKUP_MANIFEST_FILENAME,
    BACKUP_RESTORE_ORDER,
    backupTableVersionedFilename,
    manifestShardNames,
    newBackupGeneration,
    parseBackupManifest,
    parseShardFilename,
    serializeBackupManifest,
    type BackupManifest,
    type BackupTableId,
} from './backupTables.js'
import SettingsManager from '../main/settingsManager.js'

export type { BackupTableId } from './backupTables.js'


const TABLE_DEBOUNCE_MS = 30_000
/** Upper bound on how long uploads can be deferred while the same table keeps notifying. */
const TABLE_DEBOUNCE_MAX_MS = 5 * 60_000
export const WAIT_IN_FLIGHT_MS = 10_000
/** Hard cap on remote pushes after local snapshots. Remotes must not block exit. */
export const SHUTDOWN_FLUSH_MS = 15_000
export const RETRY_BASE_MS = 30_000
const RETRY_MAX_MS = 5 * 60_000

type BackupDest =
    | { type: 'cloud'; config: SftpConfig }
    | { type: 'sftp'; config: SftpConfig }
    | { type: 'local'; dir: string }

type DestPubState = {
    /** Uploads we could not delete, or could not prove were unreferenced. */
    orphans: Set<string>
}

type PushResult = { anyOk: boolean, failures: string[], retryable: boolean }

export class BackupManager {
    log = getLogger({ component: 'backupManager' })
    storage: Storage
    settings: SettingsManager
    keys: DerivedKeys
    private dirty = new Set<BackupTableId>()
    private debounceTimer: ReturnType<typeof setTimeout> | undefined
    /** Start of the current coalescing window for max-wait (first notify since last flush). */
    private debounceWindowStart: number | null = null
    private batchInProgress = false
    /**
     * A notify arrived while a batch was still running. Without this, the timer that
     * fires mid-upload returns early and the newer state is never pushed.
     */
    private pendingAfterInFlight = false
    /** Serializes publication so two batches cannot read-modify-write the same manifest. */
    private publishTail: Promise<void> = Promise.resolve()
    private retryTimer: ReturnType<typeof setTimeout> | undefined
    private retryAttempt = 0
    /** Remotes kicked off during shutdown; awaited with a deadline after local snapshots. */
    private shutdownRemotePushes: Promise<void>[] = []
    /** In-flight cloud sign-up, shared by shard uploads that hit a rejected login together. */
    private cloudSignUp: Promise<void> | null = null
    private destState = new Map<string, DestPubState>()
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
        try {
            await this.publishBatch(BACKUP_RESTORE_ORDER)
        } catch (err: any) {
            this.log(`WARNING: backup upload failed (no destination succeeded): ${err.message}`)
        }
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
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
            this.debounceTimer = undefined
        }
        this.debounceWindowStart = null
        this.pendingAfterInFlight = false
        this.dirty.clear()
        this.clearRetry()
    }

    private clearRetry() {
        if (this.retryTimer) {
            clearTimeout(this.retryTimer)
            this.retryTimer = undefined
        }
        this.retryAttempt = 0
    }

    private scheduleRetry() {
        if (this.shuttingDown || this.retryTimer || this.debounceTimer) return
        const delay = Math.min(RETRY_MAX_MS, this.retryBaseMs * 2 ** this.retryAttempt)
        this.retryAttempt += 1
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined
            this.flushDebounced().catch(err => {
                this.log(`Retry backup upload failed: ${err.message}`)
            })
        }, delay)
    }

    /** Debounced upload for any backup table (coalesces rapid writes into one batch). */
    private notifyBackupTableDebounced(id: BackupTableId) {
        if (this.shuttingDown) {
            this.log("shutting down, skipping backup table debounced: " + id)
            return
        }
        const isBackupConfigured = this.isBackupConfigured()
        this.log("notifying backup table debounced: " + id + " isBackupConfigured: " + isBackupConfigured)
        if (!isBackupConfigured) return
        this.dirty.add(id)
        if (this.retryTimer) {
            clearTimeout(this.retryTimer)
            this.retryTimer = undefined
        }
        if (this.batchInProgress) {
            this.pendingAfterInFlight = true
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
        }

        if (this.debounceWindowStart === null) {
            this.debounceWindowStart = Date.now()
        }
        const debounceAt = Date.now() + TABLE_DEBOUNCE_MS
        const maxAt = this.debounceWindowStart + TABLE_DEBOUNCE_MAX_MS
        const nextFire = Math.min(debounceAt, maxAt)
        const delayMs = Math.max(0, Math.ceil(nextFire - Date.now()))

        this.debounceTimer = setTimeout(() => {
            this.debounceTimer = undefined
            this.flushDebounced().catch(err => {
                this.log(`Debounced backup upload failed: ${err.message}`)
            })
        }, delayMs)
    }

    private async flushDebounced() {
        if (this.batchInProgress) {
            this.pendingAfterInFlight = true
            return
        }
        this.debounceWindowStart = null
        this.batchInProgress = true
        try {
            do {
                this.pendingAfterInFlight = false
                const ids = [...this.dirty]
                this.dirty.clear()
                if (ids.length === 0) {
                    continue
                }
                await this.publishBatch(ids)
            } while (this.pendingAfterInFlight && !this.shuttingDown)
        } finally {
            this.batchInProgress = false
            if (!this.shuttingDown && this.dirty.size > 0 && !this.debounceTimer && !this.retryTimer) {
                this.debounceTimer = setTimeout(() => {
                    this.debounceTimer = undefined
                    this.flushDebounced().catch(err => {
                        this.log(`Debounced backup upload failed: ${err.message}`)
                    })
                }, 0)
            }
        }
    }

    /** Returns false when every requested table was skipped (indexes not snapshotted yet). */
    private async uploadTable(id: BackupTableId): Promise<boolean> {
        return this.publishBatch([id])
    }

    private async publishBatch(ids: readonly BackupTableId[]): Promise<boolean> {
        if (!this.isBackupConfigured() || ids.length === 0) return false
        const prev = this.publishTail
        const run = prev.then(() => this.replaceBatch(ids), () => this.replaceBatch(ids))
        this.publishTail = run.then(() => undefined, () => undefined)
        return run
    }

    private async replaceBatch(ids: readonly BackupTableId[]): Promise<boolean> {
        this.log("uploading backup batch: " + ids.join(','))
        const shards = await this.exportTables(ids)
        if (shards.size === 0) {
            return false
        }
        const generation = newBackupGeneration()
        const result = await this.pushBatch(generation, shards)
        if (result.retryable) {
            for (const id of shards.keys()) this.dirty.add(id)
            this.scheduleRetry()
        } else {
            this.clearRetry()
        }
        if (!result.anyOk && result.failures.length > 0) {
            throw new Error(result.failures.join('; '))
        }
        if (result.failures.length > 0) {
            this.log(`backup batch ${generation} partial: ${result.failures.join('; ')}`)
        }
        this.log("backup batch published: " + generation)
        return true
    }

    private async exportTables(ids: readonly BackupTableId[]): Promise<Map<BackupTableId, Buffer>> {
        const out = new Map<BackupTableId, Buffer>()
        await this.storage.StartTransaction(async tx => {
            for (const id of ids) {
                const encrypted = await this.exportTable(id, tx)
                if (encrypted) {
                    out.set(id, encrypted)
                }
            }
        }, 'backup-export')
        return out
    }

    private async exportTable(id: BackupTableId, txId?: string): Promise<Buffer | null> {
        const encKey = this.keys.encKey
        const encrypt = (rows: Uint8Array[]) => encryptTableRows(rows, encKey)
        switch (id) {
            case 'indexes': {
                const row = this.indexesRow()
                if (!row) {
                    this.log("address count or channel backup not snapshotted yet, leaving indexes shard unchanged")
                    return null
                }
                return encrypt([encodeIndexesRow(row)])
            }
            case 'applications':
                return encrypt((await this.storage.applicationStorage.ExportApplications(txId)).map(encodeApplicationRow))
            case 'application_users':
                return encrypt((await this.storage.applicationStorage.ExportApplicationUsers(txId)).map(encodeApplicationUserRow))
            case 'admin_settings':
                return encrypt((await this.storage.settingsStorage.ExportSettings(txId)).map(encodeAdminSettingRow))
            case 'app_user_devices':
                return encrypt((await this.storage.applicationStorage.ExportAppUserDevices(txId)).map(encodeAppUserDeviceRow))
            case 'user_offers':
                return encrypt((await this.storage.offerStorage.ExportUserOffers(txId)).map(encodeUserOfferRow))
            case 'products':
                return encrypt((await this.storage.productStorage.ExportProducts(txId)).map(encodeProductRow))
            case 'management_grants':
                return encrypt((await this.storage.managementStorage.ExportManagementGrants(txId)).map(encodeManagementGrantRow))
            case 'debit_accesses':
                return encrypt((await this.storage.debitStorage.ExportDebitAccess(txId)).map(encodeDebitAccessRow))
            case 'invite_tokens':
                return encrypt((await this.storage.applicationStorage.ExportInviteTokens(txId)).map(encodeInviteTokenRow))
            case 'user_balances':
                return encrypt((await this.storage.userStorage.ExportBalances(txId)).map(encodeBalanceRow))
            case 'tracked_providers':
                return encrypt((await this.storage.liquidityStorage.ExportTrackedProviders(txId)).map(encodeTrackedProviderRow))
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

    private destKey(dest: BackupDest): string {
        switch (dest.type) {
            case 'local':
                return `local:${dest.dir}`
            case 'cloud':
                return 'cloud'
            case 'sftp':
                return `sftp:${dest.config.host}:${dest.config.port ?? 22}`
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    private stateFor(dest: BackupDest): DestPubState {
        const key = this.destKey(dest)
        let state = this.destState.get(key)
        if (!state) {
            state = { orphans: new Set() }
            this.destState.set(key, state)
        }
        return state
    }

    private destFailure(dest: BackupDest, err: unknown): { message: string, retryable: boolean } {
        const message = `${dest.type}: ${err instanceof Error ? err.message : String(err)}`
        return { message, retryable: !(err instanceof SftpIncompatibleError) }
    }

    private async pushBatch(generation: string, shards: Map<BackupTableId, Buffer>): Promise<PushResult> {
        const dests = this.configuredDests()
        const locals = dests.filter(d => d.type === 'local')
        const remotes = dests.filter(d => d.type !== 'local')
        const failures: string[] = []
        let anyOk = false
        let retryable = false

        for (const dest of locals) {
            try {
                await this.publishDest(dest, generation, shards)
                anyOk = true
            } catch (err: unknown) {
                const f = this.destFailure(dest, err)
                failures.push(f.message)
                if (f.retryable) retryable = true
            }
        }

        const remoteP = this.publishRemotes(remotes, generation, shards)
        if (this.shuttingDown && anyOk) {
            this.shutdownRemotePushes.push(remoteP.then(remote => {
                if (remote.failures.length > 0) {
                    this.log(`backup batch ${generation} remote ${remote.anyOk ? 'partial' : 'failed'}: ${remote.failures.join('; ')}`)
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

    private async publishRemotes(remotes: BackupDest[], generation: string, shards: Map<BackupTableId, Buffer>): Promise<PushResult> {
        if (remotes.length === 0) {
            return { anyOk: false, failures: [], retryable: false }
        }
        const results = await Promise.allSettled(remotes.map(dest => this.publishDest(dest, generation, shards)))
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

    private async publishDest(dest: BackupDest, generation: string, shards: Map<BackupTableId, Buffer>) {
        if (dest.type === 'local') {
            await this.publishToDest(dest, generation, shards)
            return
        }
        await this.withCloudAuth(dest, () =>
            withSftpSession(dest.config, session => this.publishToDest(dest, generation, shards, session)),
        )
    }

    private async publishToDest(dest: BackupDest, generation: string, shards: Map<BackupTableId, Buffer>, session?: SftpSession) {
        // Always re-read. A cached manifest can lag a commit whose acknowledgement was lost,
        // and the next batch would then mix that stale copy with newer shards.
        const previous = await this.readDestManifest(dest, session)
        await this.gcUnreferenced(dest, this.shardNameSet(previous), session)
        const tables: Partial<Record<BackupTableId, string>> = { ...(previous?.tables ?? {}) }
        const uploaded: string[] = []
        try {
            for (const [id, encrypted] of shards) {
                const filename = backupTableVersionedFilename(id, generation)
                await this.replaceDest(dest, filename, encrypted, session)
                uploaded.push(filename)
                tables[id] = filename
            }
            // Shard directory entries must be durable before the manifest names them.
            if (dest.type === 'local') fsyncDirectory(dest.dir)
            const manifest: BackupManifest = { generation, tables }
            await this.replaceDest(dest, BACKUP_MANIFEST_FILENAME, serializeBackupManifest(manifest), session)
            await this.gcUnreferenced(dest, this.shardNameSet(manifest), session)
        } catch (err) {
            await this.discardUnreferencedUploads(dest, uploaded, session)
            throw err
        }
    }

    private shardNameSet(manifest: BackupManifest | null): Set<string> {
        return new Set(manifest ? manifestShardNames(manifest) : [])
    }

    /**
     * Delete shard files outside `keep`. Listing the directory finds leftovers from
     * a crashed process; `orphans` covers a destination whose listing failed.
     * Names that fail to delete stay in `orphans` for the next attempt.
     */
    private async gcUnreferenced(dest: BackupDest, keep: Set<string>, session?: SftpSession) {
        const state = this.stateFor(dest)
        const listed = await this.listDestShards(dest, session)
        const names = new Set<string>()
        if (listed !== null) {
            for (const name of listed) names.add(name)
        }
        for (const name of state.orphans) names.add(name)
        for (const name of names) {
            if (keep.has(name)) {
                state.orphans.delete(name)
                continue
            }
            if (!parseShardFilename(name)) continue
            if (listed === null && !state.orphans.has(name)) continue
            try {
                await this.deleteDestFile(dest, name, session)
                state.orphans.delete(name)
            } catch (err: any) {
                state.orphans.add(name)
                this.log(`failed to remove unreferenced shard ${name}: ${err.message || err}`)
            }
        }
    }

    /**
     * Drop shards from a failed attempt when the published manifest does not name them.
     * A manifest replace that landed and then threw is left alone; the re-read shows
     * those names are live.
     */
    private async discardUnreferencedUploads(dest: BackupDest, uploaded: string[], session?: SftpSession) {
        if (uploaded.length === 0) return
        const state = this.stateFor(dest)
        let live: Set<string>
        try {
            live = this.shardNameSet(await this.readDestManifest(dest, session))
        } catch (err: any) {
            this.log(`failed to re-read manifest after a failed publish: ${err.message || err}`)
            for (const name of uploaded) state.orphans.add(name)
            return
        }
        for (const name of uploaded) {
            if (live.has(name)) continue
            try {
                await this.deleteDestFile(dest, name, session)
                state.orphans.delete(name)
            } catch (err: any) {
                state.orphans.add(name)
                this.log(`failed to remove unreferenced shard ${name}: ${err.message || err}`)
            }
        }
    }

    private async readDestManifest(dest: BackupDest, session?: SftpSession): Promise<BackupManifest | null> {
        switch (dest.type) {
            case 'local': {
                const file = path.join(dest.dir, BACKUP_MANIFEST_FILENAME)
                if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
                    return null
                }
                return parseBackupManifest(fs.readFileSync(file))
            }
            case 'cloud':
            case 'sftp': {
                const chunk = session
                    ? await session.download(BACKUP_MANIFEST_FILENAME)
                    : await this.withCloudAuth(dest, () => sftpDownload(dest.config, BACKUP_MANIFEST_FILENAME))
                if (!chunk.found) return null
                return parseBackupManifest(chunk.data)
            }
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    private async listDestShards(dest: BackupDest, session?: SftpSession): Promise<string[] | null> {
        try {
            switch (dest.type) {
                case 'local': {
                    if (!fs.existsSync(dest.dir)) return []
                    return fs.readdirSync(dest.dir)
                }
                case 'cloud':
                case 'sftp':
                    return session
                        ? await session.list('.')
                        : await this.withCloudAuth(dest, () => sftpList(dest.config, '.'))
                default: {
                    const _exhaustive: never = dest
                    throw new Error(`Unhandled backup dest: ${_exhaustive}`)
                }
            }
        } catch (err: any) {
            this.log(`failed to list backup files on ${dest.type}: ${err.message || err}`)
            return null
        }
    }

    private async deleteDestFile(dest: BackupDest, filename: string, session?: SftpSession) {
        switch (dest.type) {
            case 'local': {
                const file = path.join(dest.dir, filename)
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file)
                    this.log(`removed ${file}`)
                }
                return
            }
            case 'cloud':
            case 'sftp':
                if (session) {
                    await session.unlink(filename)
                } else {
                    await this.withCloudAuth(dest, () => sftpUnlink(dest.config, filename))
                }
                return
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    private async replaceDest(dest: BackupDest, filename: string, encrypted: Buffer, session?: SftpSession) {
        switch (dest.type) {
            case 'local': {
                const destPath = path.join(dest.dir, filename)
                if (filename === BACKUP_MANIFEST_FILENAME) {
                    atomicWriteFile(destPath, encrypted)
                } else {
                    writeNewDurableFile(destPath, encrypted)
                }
                this.log(`${filename} written to ${destPath} (${encrypted.length} bytes)`)
                return
            }
            case 'cloud':
            case 'sftp': {
                if (session) {
                    if (filename === BACKUP_MANIFEST_FILENAME) {
                        await session.atomicReplace(filename, encrypted)
                    } else {
                        await session.upload(filename, encrypted)
                    }
                } else if (dest.type === 'cloud') {
                    await this.putOnCloud(filename, encrypted)
                } else {
                    await this.putOnSftp(dest.config, filename, encrypted)
                }
                const where = dest.type === 'cloud'
                    ? 'cloud'
                    : `SFTP ${dest.config.host}:${dest.config.port ?? 22}`
                this.log(`${filename} uploaded to ${where} (${encrypted.length} bytes)`)
                return
            }
            default: {
                const _exhaustive: never = dest
                throw new Error(`Unhandled backup dest: ${_exhaustive}`)
            }
        }
    }

    private async putOnSftp(config: SftpConfig, filename: string, encrypted: Buffer) {
        if (filename === BACKUP_MANIFEST_FILENAME) {
            await sftpAtomicReplace(config, filename, encrypted)
            return
        }
        await sftpUpload(config, filename, encrypted)
    }

    /** A rejected login means this seed has no cloud account yet: sign up once, then retry. */
    private async putOnCloud(filename: string, encrypted: Buffer) {
        const config = cloudSftpConfig(this.keys.sftpUser, this.keys.sftpPass)
        await this.withCloudAuth({ type: 'cloud', config }, () => this.putOnSftp(config, filename, encrypted))
    }

    private async withCloudAuth<T>(dest: BackupDest, fn: () => Promise<T>): Promise<T> {
        try {
            return await fn()
        } catch (err) {
            if (dest.type !== 'cloud' || !(err instanceof SftpAuthError)) throw err
            await this.signUpForCloud()
            return await fn()
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
        while (this.batchInProgress) {
            if (Date.now() - start > timeoutMs) {
                return
            }
            await new Promise<void>(resolve => setTimeout(resolve, 25))
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
            // Local shards must finish; the deadline only covers remotes kicked off above.
            await this.publishBatch(BACKUP_RESTORE_ORDER)
            if (this.shutdownRemotePushes.length > 0) {
                await this.withTimeout(
                    Promise.allSettled(this.shutdownRemotePushes).then(() => undefined),
                    this.shutdownFlushMs,
                    `Shutdown backup flush timed out after ${this.shutdownFlushMs}ms`,
                )
            }
        } catch (err: any) {
            this.log(`Shutdown backup failed: ${err.message}`)
        }
    }
}
