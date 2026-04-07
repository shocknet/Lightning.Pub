// BACKUP: Data segment collection and import
//
// Two segments stored as separate encrypted files on SFTP:
//   - balances.enc (hot): user balances + tracked provider baseline. Debounced ~30s.
//   - identity.enc (cold): app keys, user links, settings, offers, etc. On-change.
//
// ECONOMIC INVARIANT: Pending UserInvoicePayment rows (paid_at_unix = 0) are NOT
// included. Restore favors non-inflation over exact replay. Balance is already
// debited at send time; after SCB restore LND's payment DB is gone so payment
// status cannot be verified. Refunding on restore would be gameable.

import { StorageInterface } from '../storage/db/storageInterface.js'
import type { User } from '../storage/entity/User.js'
import type { Application } from '../storage/entity/Application.js'
import type { ApplicationUser } from '../storage/entity/ApplicationUser.js'
import type { AdminSettings } from '../storage/entity/AdminSettings.js'
import type { TrackedProvider } from '../storage/entity/TrackedProvider.js'
import type { UserOffer } from '../storage/entity/UserOffer.js'
import type { Product } from '../storage/entity/Product.js'
import type { ManagementGrant } from '../storage/entity/ManagementGrant.js'
import type { DebitAccess } from '../storage/entity/DebitAccess.js'
import type { InviteToken } from '../storage/entity/InviteToken.js'
import type { AppUserDevice } from '../storage/entity/AppUserDevice.js'
import type { BackupPayload } from './encryption.js'

// admin_settings keys to strip — machine-local, wizard re-configures on restore
const STRIPPED_SETTINGS_KEYS = [
    'LND_ADDRESS',
    'LND_CERT_PATH',
    'LND_MACAROON_PATH',
    'PORT',
]

// --- Balance segment (hot) ---

type BalanceRow = {
    user_id: string
    balance_sats: number
    locked: boolean
}

type TrackedProviderRow = {
    provider_type: string
    provider_pubkey: string
    latest_balance: number
    latest_distruption_at_unix: number
    latest_checked_height: number
}

export async function collectBalancesSegment(dbs: StorageInterface): Promise<BackupPayload> {
    const users = await dbs.Find<User>('User', {})
    const balances: BalanceRow[] = users.map(u => ({
        user_id: u.user_id,
        balance_sats: u.balance_sats,
        locked: u.locked,
    }))

    const providers = await dbs.Find<TrackedProvider>('TrackedProvider', {})
    const providerRows: TrackedProviderRow[] = providers.map(p => ({
        provider_type: p.provider_type,
        provider_pubkey: p.provider_pubkey,
        latest_balance: p.latest_balance,
        latest_distruption_at_unix: p.latest_distruption_at_unix,
        latest_checked_height: p.latest_checked_height,
    }))

    return {
        v: 1,
        data: [{
            balances,
            trackedProviders: providerRows,
        }],
    }
}

// --- Identity segment (cold) ---

type IdentityData = {
    applications: ApplicationRow[]
    applicationUsers: ApplicationUserRow[]
    adminSettings: AdminSettingRow[]
    userOffers: UserOfferRow[]
    products: ProductRow[]
    managementGrants: ManagementGrantRow[]
    debitAccesses: DebitAccessRow[]
    inviteTokens: InviteTokenRow[]
    appUserDevices: AppUserDeviceRow[]
}

type ApplicationRow = {
    app_id: string
    name: string
    owner_user_id: string
    allow_user_creation: boolean
    nostr_private_key: string | null
    nostr_public_key: string | null
}

type ApplicationUserRow = {
    user_id: string
    app_id: string
    identifier: string
    nostr_public_key: string | null
    callback_url: string
    topic_id: string
}

type AdminSettingRow = {
    env_name: string
    env_value: string
}

type UserOfferRow = {
    app_user_id: string
    offer_id: string
    management_pubkey: string
    label: string
    price_sats: number
    callback_url: string
    payer_data: string[] | null
    bearer_token: string
    rejectUnauthorized: boolean
    blind: boolean
}

type ProductRow = {
    product_id: string
    owner_user_id: string
    name: string
    price_sats: number
}

type ManagementGrantRow = {
    app_user_id: string
    app_pubkey: string
    expires_at_unix: number
    banned: boolean
}

type DebitAccessRow = {
    app_user_id: string
    npub: string
    authorized: boolean
    rules: Record<string, string[]> | null
    total_debits: number
}

type InviteTokenRow = {
    inviteToken: string
    app_id: string
    sats: number | null
    used: boolean
}

type AppUserDeviceRow = {
    app_user_id: string
    device_id: string
    firebase_messaging_token: string
}

export async function collectIdentitySegment(dbs: StorageInterface): Promise<BackupPayload> {
    const apps = await dbs.Find<Application>('Application', {})
    const applications: ApplicationRow[] = apps.map(a => ({
        app_id: a.app_id,
        name: a.name,
        owner_user_id: a.owner?.user_id ?? '',
        allow_user_creation: a.allow_user_creation,
        nostr_private_key: a.nostr_private_key ?? null,
        nostr_public_key: a.nostr_public_key ?? null,
    }))

    const appUsers = await dbs.Find<ApplicationUser>('ApplicationUser', {})
    const applicationUsers: ApplicationUserRow[] = appUsers.map(au => ({
        user_id: au.user?.user_id ?? '',
        app_id: au.application?.app_id ?? '',
        identifier: au.identifier,
        nostr_public_key: au.nostr_public_key ?? null,
        callback_url: au.callback_url,
        topic_id: au.topic_id,
    }))

    const allSettings = await dbs.Find<AdminSettings>('AdminSettings', {})
    const adminSettings: AdminSettingRow[] = allSettings
        .filter(s => !STRIPPED_SETTINGS_KEYS.includes(s.env_name))
        .map(s => ({
            env_name: s.env_name,
            env_value: s.env_value,
        }))

    const offers = await dbs.Find<UserOffer>('UserOffer', {})
    const userOffers: UserOfferRow[] = offers.map(o => ({
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
    }))

    const prods = await dbs.Find<Product>('Product', {})
    const products: ProductRow[] = prods.map(p => ({
        product_id: p.product_id,
        owner_user_id: (p as any).owner?.user_id ?? '',
        name: p.name,
        price_sats: p.price_sats,
    }))

    const grants = await dbs.Find<ManagementGrant>('ManagementGrant', {})
    const managementGrants: ManagementGrantRow[] = grants.map(g => ({
        app_user_id: g.app_user_id,
        app_pubkey: g.app_pubkey,
        expires_at_unix: g.expires_at_unix,
        banned: g.banned,
    }))

    const debits = await dbs.Find<DebitAccess>('DebitAccess', {})
    const debitAccesses: DebitAccessRow[] = debits.map(d => ({
        app_user_id: d.app_user_id,
        npub: d.npub,
        authorized: d.authorized,
        rules: d.rules,
        total_debits: d.total_debits,
    }))

    const tokens = await dbs.Find<InviteToken>('InviteToken', {})
    const inviteTokens: InviteTokenRow[] = tokens
        .filter(t => !t.used)
        .map(t => ({
            inviteToken: t.inviteToken,
            app_id: t.application?.app_id ?? '',
            sats: t.sats,
            used: t.used,
        }))

    const devices = await dbs.Find<AppUserDevice>('AppUserDevice', {})
    const appUserDevices: AppUserDeviceRow[] = devices.map(d => ({
        app_user_id: d.app_user_id,
        device_id: d.device_id,
        firebase_messaging_token: d.firebase_messaging_token,
    }))

    const identity: IdentityData = {
        applications,
        applicationUsers,
        adminSettings,
        userOffers,
        products,
        managementGrants,
        debitAccesses,
        inviteTokens,
        appUserDevices,
    }

    return { v: 1, data: [identity as unknown as Record<string, unknown>] }
}

// --- Dialtone tables (for clean-target check and table cleanup on restore) ---

export const DIALTONE_TABLES: string[] = [
    'Application',
    'User',
    'ApplicationUser',
    'AdminSettings',
    'AppUserDevice',
    'UserOffer',
    'Product',
    'ManagementGrant',
    'DebitAccess',
    'InviteToken',
    'TrackedProvider',
]

export async function isDatabaseClean(dbs: StorageInterface): Promise<boolean> {
    for (const table of DIALTONE_TABLES) {
        const rows = await dbs.Find(table as any, { take: 1 })
        if (rows.length > 0) return false
    }
    return true
}
