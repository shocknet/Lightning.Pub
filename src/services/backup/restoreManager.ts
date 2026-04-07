// BACKUP: Restore pipeline
//
// Clean-target semantics: restore refuses to run unless DB is freshly initialized
// (all dialtone tables empty). No upsert/merge — prevents ghost-state mess if
// someone runs restore against a half-initialized node.
//
// Import order:
//   identity.enc first: Application → User → ApplicationUser → AdminSettings →
//     AppUserDevice → UserOffer → Product → ManagementGrant → DebitAccess → InviteToken
//   then balances.enc: User (balance overlay) → TrackedProvider
//
// ECONOMIC INVARIANT: Pending UserInvoicePayment rows (paid_at_unix = 0) are NOT
// restored. Restore favors non-inflation over exact replay. This must be stated
// in code comments and restore-facing documentation.

import { getLogger } from '../helpers/logger.js'
import { StorageInterface } from '../storage/db/storageInterface.js'
import { deriveBackupKeys, LATEST_DERIVATION_VERSION, type DerivedKeys } from './derivation.js'
import { decryptPayload, type BackupPayload } from './encryption.js'
import { isDatabaseClean, DIALTONE_TABLES } from './segments.js'
import { sftpDownload, cloudSftpConfig, type SftpConfig } from './sftpClient.js'
import fs from 'fs'

const log = getLogger({ component: 'restore' })

export type RestoreSource = 'cloud' | 'ftp' | 'local'

export type RestoreOptions = {
    phrase: string
    source: RestoreSource
    sftpHost?: string
    sftpUser?: string
    sftpPass?: string
    localPath?: string
    relay?: string
}

export type RestoreResult = {
    success: boolean
    error?: string
    tablesRestored?: number
}

// Shared restore pipeline used by both wizard and CLI.
export async function restoreFromSource(dbs: StorageInterface, opts: RestoreOptions): Promise<RestoreResult> {
    log('Starting restore from source:', opts.source)

    const clean = await isDatabaseClean(dbs)
    if (!clean) {
        return {
            success: false,
            error: 'Database is not empty. Restore can only run against a freshly initialized database.',
        }
    }

    const keys = await deriveBackupKeys(opts.phrase, LATEST_DERIVATION_VERSION)

    const identityBuf = await fetchFile(keys, opts, 'identity.enc')
    if (!identityBuf) {
        return {
            success: false,
            error: failureMessage(opts.source, 'identity'),
        }
    }

    const balancesBuf = await fetchFile(keys, opts, 'balances.enc')

    const identityPayload = decryptPayload(identityBuf, keys.encKey)
    const balancesPayload = balancesBuf ? decryptPayload(balancesBuf, keys.encKey) : null

    const tablesRestored = await importDialtone(dbs, identityPayload, balancesPayload)

    // TODO: After dialtone import, recover app nsec from Application table,
    // then fetch SCB kind 30078 from relay using the recovered app nsec.
    // This is the sequential dependency: dialtone must restore before SCB.
    log('Dialtone restore complete. SCB relay fetch not yet implemented.')

    return { success: true, tablesRestored }
}

async function fetchFile(keys: DerivedKeys, opts: RestoreOptions, filename: string): Promise<Buffer | null> {
    switch (opts.source) {
        case 'cloud': {
            const config = cloudSftpConfig(keys.sftpUser, keys.sftpPass)
            return sftpDownload(config, filename)
        }
        case 'ftp': {
            if (!opts.sftpHost) throw new Error('--ftp-host is required for source=ftp')
            const config: SftpConfig = {
                host: opts.sftpHost,
                username: opts.sftpUser ?? keys.sftpUser,
                password: opts.sftpPass ?? keys.sftpPass,
            }
            return sftpDownload(config, filename)
        }
        case 'local': {
            if (!opts.localPath) throw new Error('--local-path is required for source=local')
            // For local source, we expect a db.sqlite file, not .enc files.
            // The local path restore imports from an unencrypted SQLite directly.
            // TODO: Implement local db.sqlite import (copy file, skip encryption).
            // For now, return null to indicate not-yet-implemented.
            log('Local file restore not yet implemented')
            return null
        }
        default:
            throw new Error(`Unknown restore source: ${opts.source}`)
    }
}

async function importDialtone(
    dbs: StorageInterface,
    identity: BackupPayload,
    balances: BackupPayload | null,
): Promise<number> {
    if (identity.v !== 1) {
        throw new Error(`Unsupported identity payload version: ${identity.v}`)
    }

    const data = identity.data[0] as any
    let tablesRestored = 0

    // Import order matches FK dependencies:
    // Application → User → ApplicationUser → AdminSettings →
    // AppUserDevice → UserOffer → Product → ManagementGrant → DebitAccess → InviteToken

    await dbs.Tx(async (txId) => {
        // 1. Applications (creates owner Users as side-effect via FK)
        for (const app of (data.applications ?? [])) {
            const ownerUser = await dbs.CreateAndSave('User', {
                user_id: app.owner_user_id,
                balance_sats: 0,
                locked: false,
            }, txId)
            await dbs.CreateAndSave('Application', {
                app_id: app.app_id,
                name: app.name,
                owner: ownerUser,
                allow_user_creation: app.allow_user_creation,
                nostr_private_key: app.nostr_private_key,
                nostr_public_key: app.nostr_public_key,
            }, txId)
        }
        tablesRestored++

        // 2. Users (non-owner users, avoid duplicates with owner users)
        // Balance overlay applied later from balances.enc
        const ownerUserIds = new Set((data.applications ?? []).map((a: any) => a.owner_user_id))
        if (balances?.v === 1) {
            const balData = balances.data[0] as any
            for (const row of (balData.balances ?? [])) {
                if (ownerUserIds.has(row.user_id)) {
                    await dbs.Update('User', { user_id: row.user_id } as any, {
                        balance_sats: row.balance_sats,
                        locked: row.locked,
                    }, txId)
                } else {
                    await dbs.CreateAndSave('User', {
                        user_id: row.user_id,
                        balance_sats: row.balance_sats,
                        locked: row.locked,
                    }, txId)
                }
            }
        }
        tablesRestored++

        // 3. ApplicationUsers
        for (const au of (data.applicationUsers ?? [])) {
            const user = await dbs.FindOne('User', { where: { user_id: au.user_id } }, txId)
            const app = await dbs.FindOne('Application', { where: { app_id: au.app_id } }, txId)
            if (!user || !app) continue
            await dbs.CreateAndSave('ApplicationUser', {
                user,
                application: app,
                identifier: au.identifier,
                nostr_public_key: au.nostr_public_key,
                callback_url: au.callback_url,
                topic_id: au.topic_id,
            }, txId)
        }
        tablesRestored++

        // 4. AdminSettings
        for (const s of (data.adminSettings ?? [])) {
            await dbs.CreateAndSave('AdminSettings', {
                env_name: s.env_name,
                env_value: s.env_value,
            }, txId)
        }
        tablesRestored++

        // 5. AppUserDevices
        for (const d of (data.appUserDevices ?? [])) {
            await dbs.CreateAndSave('AppUserDevice', {
                app_user_id: d.app_user_id,
                device_id: d.device_id,
                firebase_messaging_token: d.firebase_messaging_token,
            }, txId)
        }
        tablesRestored++

        // 6. UserOffers
        for (const o of (data.userOffers ?? [])) {
            await dbs.CreateAndSave('UserOffer', {
                app_user_id: o.app_user_id,
                offer_id: o.offer_id,
                management_pubkey: o.management_pubkey,
                label: o.label,
                price_sats: o.price_sats,
                callback_url: o.callback_url,
                payer_data: o.payer_data,
                bearer_token: o.bearer_token,
                rejectUnauthorized: o.rejectUnauthorized,
                blind: o.blind,
            }, txId)
        }
        tablesRestored++

        // 7. Products
        for (const p of (data.products ?? [])) {
            const owner = await dbs.FindOne('User', { where: { user_id: p.owner_user_id } }, txId)
            if (!owner) continue
            await dbs.CreateAndSave('Product', {
                product_id: p.product_id,
                owner,
                name: p.name,
                price_sats: p.price_sats,
            }, txId)
        }
        tablesRestored++

        // 8. ManagementGrants
        for (const g of (data.managementGrants ?? [])) {
            await dbs.CreateAndSave('ManagementGrant', {
                app_user_id: g.app_user_id,
                app_pubkey: g.app_pubkey,
                expires_at_unix: g.expires_at_unix,
                banned: g.banned,
            }, txId)
        }
        tablesRestored++

        // 9. DebitAccesses
        for (const d of (data.debitAccesses ?? [])) {
            await dbs.CreateAndSave('DebitAccess', {
                app_user_id: d.app_user_id,
                npub: d.npub,
                authorized: d.authorized,
                rules: d.rules,
                total_debits: d.total_debits,
            }, txId)
        }
        tablesRestored++

        // 10. InviteTokens
        for (const t of (data.inviteTokens ?? [])) {
            const app = await dbs.FindOne('Application', { where: { app_id: t.app_id } }, txId)
            if (!app) continue
            await dbs.CreateAndSave('InviteToken', {
                inviteToken: t.inviteToken,
                application: app,
                sats: t.sats,
                used: t.used,
            }, txId)
        }
        tablesRestored++

        // 11. TrackedProviders (from balances segment)
        if (balances?.v === 1) {
            const balData = balances.data[0] as any
            for (const p of (balData.trackedProviders ?? [])) {
                await dbs.CreateAndSave('TrackedProvider', {
                    provider_type: p.provider_type,
                    provider_pubkey: p.provider_pubkey,
                    latest_balance: p.latest_balance,
                    latest_distruption_at_unix: p.latest_distruption_at_unix,
                    latest_checked_height: p.latest_checked_height,
                }, txId)
            }
            tablesRestored++
        }
    }, 'dialtone restore')

    return tablesRestored
}

function failureMessage(source: RestoreSource, file: string): string {
    switch (source) {
        case 'cloud':
            return `No backup found for this seed on the managed service. Were backups enabled on the original instance? Did this seed ever run Lightning.Pub?`
        case 'ftp':
            return `Could not connect or ${file}.enc not found — verify host, credentials, and path.`
        case 'local':
            return `File not found or unreadable — check path.`
    }
}
