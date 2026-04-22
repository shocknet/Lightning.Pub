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
import { concatBytes } from '@noble/hashes/utils'
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
import { encryptPayload, decryptPayload, type BackupPayload } from './encryption.js'
import { encodeTLbV, encodeTLV, integerFromUint8Array, integerToUint8Array, parseTLbV, parseTLV, utf8Decoder, utf8Encoder, type TLV } from '../helpers/tlv.js'

// admin_settings keys to strip — machine-local, wizard re-configures on restore
export const STRIPPED_SETTINGS_KEYS = [
    'LND_ADDRESS',
    'LND_CERT_PATH',
    'LND_MACAROON_PATH',
    'PORT',
]


const boolToBytes = (value: boolean): Uint8Array => new Uint8Array([value ? 1 : 0])
const boolFromBytes = (data: Uint8Array): boolean => data[0] === 1

const numberToBytes = (value: number): Uint8Array => integerToUint8Array(value)
const numberFromBytes = (data: Uint8Array): number => integerFromUint8Array(data)

const stringToBytes = (value: string): Uint8Array => utf8Encoder.encode(value)
const stringFromBytes = (data: Uint8Array): string => utf8Decoder.decode(data)

const hexToBytes = (value: string): Uint8Array => {
    return new Uint8Array(Buffer.from(value, 'hex'))
}
const hexFromBytes = (data: Uint8Array): string => {
    return Buffer.from(data).toString('hex')
}

const splitChunk = (data: Uint8Array, chunkSize: number): Uint8Array[] => {
    const chunks: Uint8Array[] = []
    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.subarray(i, i + chunkSize))
    }
    return chunks
}

const joinChunks = (chunks: Uint8Array[]): Uint8Array => {
    return concatBytes(...chunks)
}

// --- Balance segment (hot) ---

export type BalancesData = {
    balances: BalanceRow[]
    trackedProviders: TrackedProviderRow[]
}

export const encodeBalancesData = (data: BalancesData): Uint8Array => {
    const version = 1
    const tlv: TLV = {
        2: [new Uint8Array([version])],
        3: data.balances.map(encodeBalanceRow),
        4: data.trackedProviders.map(encodeTrackedProviderRow),
    }
    return encodeTLbV(tlv)
}

export const decodeBalancesData = (data: Uint8Array): BalancesData => {
    const tlv = parseTLbV(data)
    const v = tlv[2][0][0]
    if (v !== 1) {
        throw new Error(`Unsupported balances payload version: ${v}`)
    }
    const balances = tlv[3].map(decodeBalanceRow)
    const trackedProviders = tlv[4].map(decodeTrackedProviderRow)
    return { balances, trackedProviders }
}

export const encryptBalancesData = (data: BalancesData, key: Buffer): Buffer => {
    const plaintext = encodeBalancesData(data)
    const encrypted = encryptPayload(Buffer.from(plaintext), key)
    return encrypted
}

export const decryptBalancesData = (data: Buffer, key: Buffer): BalancesData => {
    const plaintext = decryptPayload(data, key)
    return decodeBalancesData(plaintext)
}

export type BalanceRow = {
    user_id: string
    balance_sats: number
    locked: boolean
}

export const mapBalanceBackupRow = (user: User): BalanceRow => ({
    user_id: user.user_id,
    balance_sats: user.balance_sats,
    locked: user.locked,
})

export const encodeBalanceRow = (row: BalanceRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.user_id)],
        3: [numberToBytes(row.balance_sats)],
        4: [boolToBytes(row.locked)],
    }
    return encodeTLV(tlv)
}

export const decodeBalanceRow = (data: Uint8Array): BalanceRow => {
    const tlv = parseTLV(data)
    return {
        user_id: hexFromBytes(tlv[2][0]),
        balance_sats: numberFromBytes(tlv[3][0]),
        locked: boolFromBytes(tlv[4][0]),
    }
}

export type TrackedProviderRow = {
    provider_type: string
    provider_pubkey: string
    latest_balance: number
    latest_distruption_at_unix: number
    latest_checked_height: number
}



export const mapTrackedProviderBackupRow = (provider: TrackedProvider): TrackedProviderRow => ({
    provider_type: provider.provider_type,
    provider_pubkey: provider.provider_pubkey,
    latest_balance: provider.latest_balance,
    latest_distruption_at_unix: provider.latest_distruption_at_unix,
    latest_checked_height: provider.latest_checked_height,
})

export const encodeTrackedProviderRow = (row: TrackedProviderRow): Uint8Array => {
    const tlv: TLV = {
        2: splitChunk(stringToBytes(row.provider_type), 255),
        3: [hexToBytes(row.provider_pubkey)],
        4: [numberToBytes(row.latest_balance)],
        5: [numberToBytes(row.latest_distruption_at_unix)],
        6: [numberToBytes(row.latest_checked_height)],
    }
    return encodeTLV(tlv)
}

export const decodeTrackedProviderRow = (data: Uint8Array): TrackedProviderRow => {
    const tlv = parseTLV(data)
    return {
        provider_type: stringFromBytes(joinChunks(tlv[2])),
        provider_pubkey: hexFromBytes(tlv[3][0]),
        latest_balance: numberFromBytes(tlv[4][0]),
        latest_distruption_at_unix: numberFromBytes(tlv[5][0]),
        latest_checked_height: numberFromBytes(tlv[6][0]),
    }
}
// --- Identity segment (cold) ---

export type IdentityData = {
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

export const encodeIdentityData = (data: IdentityData): Uint8Array => {
    const version = 1
    const tlv: TLV = {
        2: [new Uint8Array([version])],
        3: data.applications.map(encodeApplicationRow),
        4: data.applicationUsers.map(encodeApplicationUserRow),
        5: data.adminSettings.map(encodeAdminSettingRow),
        6: data.userOffers.map(encodeUserOfferRow),
        7: data.products.map(encodeProductRow),
        8: data.managementGrants.map(encodeManagementGrantRow),
        9: data.debitAccesses.map(encodeDebitAccessRow),
        10: data.inviteTokens.map(encodeInviteTokenRow),
        11: data.appUserDevices.map(encodeAppUserDeviceRow),
    }
    return encodeTLbV(tlv)
}

export const decodeIdentityData = (data: Uint8Array): IdentityData => {
    const tlv = parseTLbV(data)
    const v = tlv[2][0][0]
    if (v !== 1) {
        throw new Error(`Unsupported identity payload version: ${v}`)
    }
    const applications = tlv[3].map(decodeApplicationRow)
    const applicationUsers = tlv[4].map(decodeApplicationUserRow)
    const adminSettings = tlv[5].map(decodeAdminSettingRow)
    const userOffers = tlv[6].map(decodeUserOfferRow)
    const products = tlv[7].map(decodeProductRow)
    const managementGrants = tlv[8].map(decodeManagementGrantRow)
    const debitAccesses = tlv[9].map(decodeDebitAccessRow)
    const inviteTokens = tlv[10].map(decodeInviteTokenRow)
    const appUserDevices = tlv[11].map(decodeAppUserDeviceRow)
    return {
        applications, applicationUsers, adminSettings, userOffers, products,
        managementGrants, debitAccesses, inviteTokens, appUserDevices
    }
}

export const encryptIdentityData = (data: IdentityData, key: Buffer): Buffer => {
    const plaintext = encodeIdentityData(data)
    const encrypted = encryptPayload(Buffer.from(plaintext), key)
    return encrypted
}

export const decryptIdentityData = (data: Buffer, key: Buffer): IdentityData => {
    const plaintext = decryptPayload(data, key)
    return decodeIdentityData(plaintext)
}

export type ApplicationRow = {
    app_id: string
    name: string
    owner_user_id: string
    allow_user_creation: boolean
    nostr_private_key: string | null
    nostr_public_key: string | null
}

export const mapAppBackupRow = (app: Application): ApplicationRow => ({
    app_id: app.app_id,
    name: app.name,
    owner_user_id: app.owner.user_id,
    allow_user_creation: app.allow_user_creation,
    nostr_private_key: app.nostr_private_key || null,
    nostr_public_key: app.nostr_public_key || null,
})

export const encodeApplicationRow = (row: ApplicationRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.app_id)],
        3: splitChunk(stringToBytes(row.name), 255),
        4: [hexToBytes(row.owner_user_id)],
        5: [boolToBytes(row.allow_user_creation)],
    }

    if (row.nostr_private_key) {
        tlv[6] = [hexToBytes(row.nostr_private_key)]
    }
    if (row.nostr_public_key) {
        tlv[7] = [hexToBytes(row.nostr_public_key)]
    }
    return encodeTLV(tlv)
}

export const decodeApplicationRow = (data: Uint8Array): ApplicationRow => {
    const tlv = parseTLV(data)
    return {
        app_id: hexFromBytes(tlv[2][0]),
        name: stringFromBytes(joinChunks(tlv[3])),
        owner_user_id: hexFromBytes(tlv[4][0]),
        allow_user_creation: boolFromBytes(tlv[5][0]),
        nostr_private_key: tlv[6] ? hexFromBytes(tlv[6][0]) : null,
        nostr_public_key: tlv[7] ? hexFromBytes(tlv[7][0]) : null,
    }
}


export type ApplicationUserRow = {
    user_id: string
    app_id: string
    identifier: string
    callback_url: string
    topic_id: string
    nostr_public_key: string | null
}

export const mapAppUserBackupRow = (appUser: ApplicationUser): ApplicationUserRow => ({
    user_id: appUser.user.user_id,
    app_id: appUser.application.app_id,
    identifier: appUser.identifier,
    callback_url: appUser.callback_url,
    topic_id: appUser.topic_id,
    nostr_public_key: appUser.nostr_public_key || null,
})

export const encodeApplicationUserRow = (row: ApplicationUserRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.user_id)],
        3: [hexToBytes(row.app_id)],
        4: [hexToBytes(row.identifier)],
        5: splitChunk(stringToBytes(row.callback_url), 255),
        6: [hexToBytes(row.topic_id)],
    }
    if (row.nostr_public_key) {
        tlv[7] = [hexToBytes(row.nostr_public_key)]
    }
    return encodeTLV(tlv)
}

export const decodeApplicationUserRow = (data: Uint8Array): ApplicationUserRow => {
    const tlv = parseTLV(data)
    return {
        user_id: hexFromBytes(tlv[2][0]),
        app_id: hexFromBytes(tlv[3][0]),
        identifier: hexFromBytes(tlv[4][0]),
        callback_url: stringFromBytes(joinChunks(tlv[5])),
        topic_id: hexFromBytes(tlv[6][0]),
        nostr_public_key: tlv[7] ? hexFromBytes(tlv[7][0]) : null,
    }
}

export type AdminSettingRow = {
    env_name: string
    env_value: string
}

export const mapAdminSettingBackupRow = (adminSetting: AdminSettings): AdminSettingRow | null => {
    if (STRIPPED_SETTINGS_KEYS.includes(adminSetting.env_name)) {
        return null
    }
    return {
        env_name: adminSetting.env_name,
        env_value: adminSetting.env_value,
    }
}

export const encodeAdminSettingRow = (row: AdminSettingRow): Uint8Array => {
    const tlv: TLV = {
        2: splitChunk(stringToBytes(row.env_name), 255),
        3: splitChunk(stringToBytes(row.env_value), 255),
    }
    return encodeTLV(tlv)
}

export const decodeAdminSettingRow = (data: Uint8Array): AdminSettingRow => {
    const tlv = parseTLV(data)
    return {
        env_name: stringFromBytes(joinChunks(tlv[2])),
        env_value: stringFromBytes(joinChunks(tlv[3])),
    }
}

export type UserOfferRow = {
    app_user_id: string
    offer_id: string
    management_pubkey: string
    label: string
    price_sats: number
    callback_url: string
    bearer_token: string
    rejectUnauthorized: boolean
    blind: boolean
    payer_data: string[] | null
}

export const mapUserOfferBackupRow = (userOffer: UserOffer): UserOfferRow => ({
    app_user_id: userOffer.app_user_id,
    offer_id: userOffer.offer_id,
    management_pubkey: userOffer.management_pubkey,
    label: userOffer.label,
    price_sats: userOffer.price_sats,
    callback_url: userOffer.callback_url,
    bearer_token: userOffer.bearer_token,
    rejectUnauthorized: userOffer.rejectUnauthorized,
    blind: userOffer.blind,
    payer_data: userOffer.payer_data,
})

export const encodeUserOfferRow = (row: UserOfferRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.app_user_id)],
        3: [hexToBytes(row.offer_id)],
        4: [hexToBytes(row.management_pubkey)],
        5: splitChunk(stringToBytes(row.label), 255),
        6: [numberToBytes(row.price_sats)],
        7: splitChunk(stringToBytes(row.callback_url), 255),
        8: splitChunk(stringToBytes(row.bearer_token), 255),
        9: [boolToBytes(row.rejectUnauthorized)],
        10: [boolToBytes(row.blind)],
    }
    if (row.payer_data) {
        const payerData = JSON.stringify(row.payer_data)
        tlv[11] = splitChunk(stringToBytes(payerData), 255)
    }
    return encodeTLV(tlv)
}

export const decodeUserOfferRow = (data: Uint8Array): UserOfferRow => {
    const tlv = parseTLV(data)
    return {
        app_user_id: hexFromBytes(tlv[2][0]),
        offer_id: hexFromBytes(tlv[3][0]),
        management_pubkey: hexFromBytes(tlv[4][0]),
        label: stringFromBytes(joinChunks(tlv[5])),
        price_sats: numberFromBytes(tlv[6][0]),
        callback_url: stringFromBytes(joinChunks(tlv[7])),
        bearer_token: stringFromBytes(joinChunks(tlv[8])),
        rejectUnauthorized: boolFromBytes(tlv[9][0]),
        blind: boolFromBytes(tlv[10][0]),
        payer_data: tlv[11] ? JSON.parse(stringFromBytes(joinChunks(tlv[11]))) : null,
    }
}

export type ProductRow = {
    product_id: string
    owner_user_id: string
    name: string
    price_sats: number
}

export const mapProductBackupRow = (product: Product): ProductRow => ({
    product_id: product.product_id,
    owner_user_id: product.owner.user_id,
    name: product.name,
    price_sats: product.price_sats,
})

export const encodeProductRow = (row: ProductRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.product_id)],
        3: [hexToBytes(row.owner_user_id)],
        4: splitChunk(stringToBytes(row.name), 255),
        5: [numberToBytes(row.price_sats)],
    }
    return encodeTLV(tlv)
}

export const decodeProductRow = (data: Uint8Array): ProductRow => {
    const tlv = parseTLV(data)
    return {
        product_id: hexFromBytes(tlv[2][0]),
        owner_user_id: hexFromBytes(tlv[3][0]),
        name: stringFromBytes(joinChunks(tlv[4])),
        price_sats: numberFromBytes(tlv[5][0]),
    }
}

export type ManagementGrantRow = {
    app_user_id: string
    app_pubkey: string
    expires_at_unix: number
    banned: boolean
}

export const mapManagementGrantBackupRow = (managementGrant: ManagementGrant): ManagementGrantRow => ({
    app_user_id: managementGrant.app_user_id,
    app_pubkey: managementGrant.app_pubkey,
    expires_at_unix: managementGrant.expires_at_unix,
    banned: managementGrant.banned,
})

export const encodeManagementGrantRow = (row: ManagementGrantRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.app_user_id)],
        3: [hexToBytes(row.app_pubkey)],
        4: [numberToBytes(row.expires_at_unix)],
        5: [boolToBytes(row.banned)],
    }
    return encodeTLV(tlv)
}

export const decodeManagementGrantRow = (data: Uint8Array): ManagementGrantRow => {
    const tlv = parseTLV(data)
    return {
        app_user_id: hexFromBytes(tlv[2][0]),
        app_pubkey: hexFromBytes(tlv[3][0]),
        expires_at_unix: numberFromBytes(tlv[4][0]),
        banned: boolFromBytes(tlv[5][0]),
    }
}
export type DebitAccessRow = {
    app_user_id: string
    npub: string
    authorized: boolean
    total_debits: number
    rules: Record<string, string[]> | null
}

export const mapDebitAccessBackupRow = (debitAccess: DebitAccess): DebitAccessRow => ({
    app_user_id: debitAccess.app_user_id,
    npub: debitAccess.npub,
    authorized: debitAccess.authorized,
    total_debits: debitAccess.total_debits,
    rules: debitAccess.rules,
})

export const encodeDebitAccessRow = (row: DebitAccessRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.app_user_id)],
        3: [hexToBytes(row.npub)],
        4: [boolToBytes(row.authorized)],
        5: [numberToBytes(row.total_debits)],
    }
    if (row.rules) {
        const rules = JSON.stringify(row.rules)
        tlv[6] = splitChunk(stringToBytes(rules), 255)
    }
    return encodeTLV(tlv)
}

export const decodeDebitAccessRow = (data: Uint8Array): DebitAccessRow => {
    const tlv = parseTLV(data)
    return {
        app_user_id: hexFromBytes(tlv[2][0]),
        npub: hexFromBytes(tlv[3][0]),
        authorized: boolFromBytes(tlv[4][0]),
        total_debits: numberFromBytes(tlv[5][0]),
        rules: tlv[6] ? JSON.parse(stringFromBytes(joinChunks(tlv[6]))) : null,
    }
}

export type InviteTokenRow = {
    inviteToken: string
    app_id: string
    used: boolean
    sats: number | null
}

export const mapInviteTokenBackupRow = (inviteToken: InviteToken): InviteTokenRow => ({
    inviteToken: inviteToken.inviteToken,
    app_id: inviteToken.application.app_id,
    used: inviteToken.used,
    sats: inviteToken.sats,
})

export const encodeInviteTokenRow = (row: InviteTokenRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.inviteToken)],
        3: [hexToBytes(row.app_id)],
        4: [boolToBytes(row.used)],
    }
    if (row.sats) {
        tlv[5] = [numberToBytes(row.sats)]
    }
    return encodeTLV(tlv)
}

export const decodeInviteTokenRow = (data: Uint8Array): InviteTokenRow => {
    const tlv = parseTLV(data)
    return {
        inviteToken: hexFromBytes(tlv[2][0]),
        app_id: hexFromBytes(tlv[3][0]),
        used: boolFromBytes(tlv[4][0]),
        sats: tlv[5] ? numberFromBytes(tlv[5][0]) : null,
    }
}

export type AppUserDeviceRow = {
    app_user_id: string
    device_id: string
    firebase_messaging_token: string
}


export const mapAppUserDeviceBackupRow = (appUserDevice: AppUserDevice): AppUserDeviceRow => ({
    app_user_id: appUserDevice.app_user_id,
    device_id: appUserDevice.device_id,
    firebase_messaging_token: appUserDevice.firebase_messaging_token,
})

export const encodeAppUserDeviceRow = (row: AppUserDeviceRow): Uint8Array => {
    const tlv: TLV = {
        2: [hexToBytes(row.app_user_id)],
        3: [hexToBytes(row.device_id)],
        4: splitChunk(stringToBytes(row.firebase_messaging_token), 255),
    }
    return encodeTLV(tlv)
}

export const decodeAppUserDeviceRow = (data: Uint8Array): AppUserDeviceRow => {
    const tlv = parseTLV(data)
    return {
        app_user_id: hexFromBytes(tlv[2][0]),
        device_id: hexFromBytes(tlv[3][0]),
        firebase_messaging_token: stringFromBytes(joinChunks(tlv[4])),
    }
}