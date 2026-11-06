// BACKUP: Data segment collection and import
//
// Live backups use one encrypted file per table (see backupTables.ts). Aggregate
// IdentityData / BalancesData encode helpers remain for tests and tooling.
//
// ECONOMIC INVARIANT: Pending UserInvoicePayment rows (paid_at_unix = 0) are NOT
// included. Restore favors non-inflation over exact replay. Balance is already
// debited at send time; after SCB restore LND's payment DB is gone so payment
// status cannot be verified. Refunding on restore would be gameable.
//
// Swap shards keep in-flight recovery rows: funded submarine lockups that have
// not been refunded (including used/preimage rows, because a verified preimage
// is not proof the lockup was spent), and started reverse swaps whose claim
// txid is not yet recorded. Unused quotes can be recreated. Refunded submarine
// swaps and reverse swaps with a recorded claim txid are omitted.
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
import type { InvoiceSwap } from '../storage/entity/InvoiceSwap.js'
import type { TransactionSwap } from '../storage/entity/TransactionSwap.js'
import { encryptPayload, decryptPayload } from './encryption.js'
import { concatUint8Arrays, encodeTLbV, encodeTLV, integerFromUint8Array, parseTLbV, parseTLV, uintToBytes, utf8Decoder, utf8Encoder, type TLV } from '../helpers/tlv.js'

// admin_settings keys to strip — machine-local, wizard re-configures on restore
export const STRIPPED_SETTINGS_KEYS = [
    'LND_ADDRESS',
    'LND_CERT_PATH',
    'LND_MACAROON_PATH',
    'PORT',
]


const boolToBytes = (value: boolean): Uint8Array => new Uint8Array([value ? 1 : 0])
const boolFromBytes = (data: Uint8Array): boolean => data[0] === 1

const numberToBytes = (value: number): Uint8Array => uintToBytes(value)
const numberFromBytes = (data: Uint8Array): number => integerFromUint8Array(data)

const stringToBytes = (value: string): Uint8Array => utf8Encoder.encode(value)
const stringFromBytes = (data: Uint8Array): string => utf8Decoder.decode(data)

const splitChunk = (data: Uint8Array, chunkSize: number): Uint8Array[] => {
    const chunks: Uint8Array[] = []
    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.subarray(i, i + chunkSize))
    }
    return chunks
}

const joinChunks = (chunks: Uint8Array[] | undefined): Uint8Array => {
    if (!chunks) {
        return new Uint8Array()
    }
    return concatUint8Arrays(chunks)
}

const backupIdToBytes = (value: string): Uint8Array[] => splitChunk(stringToBytes(value), 255)
const backupIdFromBytes = (chunks: Uint8Array[] | undefined): string => stringFromBytes(joinChunks(chunks))

const priceToBytes = (value: number): Uint8Array => {
    if (!Number.isFinite(value)) {
        throw new Error(`price out of range: ${value}`)
    }
    return stringToBytes(String(value))
}
const priceFromBytes = (data: Uint8Array): number => {
    const n = Number(stringFromBytes(data))
    if (!Number.isFinite(n)) {
        throw new Error(`invalid price: ${stringFromBytes(data)}`)
    }
    return n
}

const PER_TABLE_PAYLOAD_VERSION = 1

export type BackupData = {
    indexes: IndexesRow[]
    balances: BalanceRow[]
    trackedProviders: TrackedProviderRow[]
    applications: ApplicationRow[]
    applicationUsers: ApplicationUserRow[]
    adminSettings: AdminSettingRow[]
    userOffers: UserOfferRow[]
    products: ProductRow[]
    managementGrants: ManagementGrantRow[]
    debitAccesses: DebitAccessRow[]
    inviteTokens: InviteTokenRow[]
    appUserDevices: AppUserDeviceRow[]
    invoiceSwaps: InvoiceSwapRow[]
    transactionSwaps: TransactionSwapRow[]
}


/**
 * Marker stored in place of the SCB when the node has no channels. A real LND multi-channel
 * backup is far longer than one byte, so the two cannot be confused. The field itself is
 * always present. A shard that lacks it is incomplete, not a wallet with no channels.
 */
export const NO_CHANNELS_SCB = new Uint8Array([0])

const isNoChannelsMarker = (data: Uint8Array) => data.length === 1 && data[0] === 0

export type IndexesRow = {
    addressesCount: number
    /** LND multi-channel backup, or null when the node has no channels. */
    scb: Uint8Array | null
}

export const encodeIndexesRow = (indexes: IndexesRow): Uint8Array => {
    if (indexes.scb && indexes.scb.length === 0) {
        throw new Error('empty SCB, use null for a node without channels')
    }
    const tlv: TLV = {
        2: [numberToBytes(indexes.addressesCount)],
        3: splitChunk(indexes.scb ?? NO_CHANNELS_SCB, 255),
    }
    return encodeTLV(tlv)
}

export const decodeIndexesRow = (data: Uint8Array): IndexesRow => {
    const tlv = parseTLV(data)
    if (!tlv[3] || tlv[3].length === 0) {
        throw new Error('indexes shard has no channel backup field')
    }
    const scb = joinChunks(tlv[3])
    return {
        addressesCount: numberFromBytes(tlv[2][0]),
        scb: isNoChannelsMarker(scb) ? null : scb,
    }
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
        2: backupIdToBytes(row.user_id),
        3: [numberToBytes(row.balance_sats)],
        4: [boolToBytes(row.locked)],
    }
    return encodeTLV(tlv)
}

export const decodeBalanceRow = (data: Uint8Array): BalanceRow => {
    const tlv = parseTLV(data)
    return {
        user_id: backupIdFromBytes(tlv[2]),
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
        3: backupIdToBytes(row.provider_pubkey),
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
        provider_pubkey: backupIdFromBytes(tlv[3]),
        latest_balance: numberFromBytes(tlv[4][0]),
        latest_distruption_at_unix: numberFromBytes(tlv[5][0]),
        latest_checked_height: numberFromBytes(tlv[6][0]),
    }
}

// --- Per-table .enc framing: version byte + repeated row blobs ---

export const encryptTableRows = (rowEncodings: Uint8Array[], encKey: Buffer): Buffer => {
    const tlv: TLV = {
        2: [new Uint8Array([PER_TABLE_PAYLOAD_VERSION])],
        3: rowEncodings,
    }
    return encryptPayload(Buffer.from(encodeTLbV(tlv)), encKey)
}

export const decryptTableRows = (data: Buffer, encKey: Buffer): Uint8Array[] => {
    const plaintext = decryptPayload(data, encKey)
    const tlv = parseTLbV(plaintext)
    const v = tlv[2]?.[0]?.[0]
    if (v !== PER_TABLE_PAYLOAD_VERSION) {
        throw new Error(`Unsupported per-table backup payload version: ${v}`)
    }
    return tlv[3] ?? []
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
        2: backupIdToBytes(row.app_id),
        3: splitChunk(stringToBytes(row.name), 255),
        4: backupIdToBytes(row.owner_user_id),
        5: [boolToBytes(row.allow_user_creation)],
    }

    if (row.nostr_private_key) {
        tlv[6] = backupIdToBytes(row.nostr_private_key)
    }
    if (row.nostr_public_key) {
        tlv[7] = backupIdToBytes(row.nostr_public_key)
    }
    return encodeTLV(tlv)
}

export const decodeApplicationRow = (data: Uint8Array): ApplicationRow => {
    const tlv = parseTLV(data)
    return {
        app_id: backupIdFromBytes(tlv[2]),
        name: stringFromBytes(joinChunks(tlv[3])),
        owner_user_id: backupIdFromBytes(tlv[4]),
        allow_user_creation: boolFromBytes(tlv[5][0]),
        nostr_private_key: tlv[6] ? backupIdFromBytes(tlv[6]) : null,
        nostr_public_key: tlv[7] ? backupIdFromBytes(tlv[7]) : null,
    }
}


export type ApplicationUserRow = {
    user_id: string
    app_id: string
    identifier: string
    callback_url: string
    topic_id: string
    nostr_public_key: string | null
    owner_only_clink: boolean
}

export const mapAppUserBackupRow = (appUser: ApplicationUser): ApplicationUserRow => ({
    user_id: appUser.user.user_id,
    app_id: appUser.application.app_id,
    identifier: appUser.identifier,
    callback_url: appUser.callback_url,
    topic_id: appUser.topic_id,
    nostr_public_key: appUser.nostr_public_key || null,
    owner_only_clink: !!appUser.owner_only_clink,
})

export const encodeApplicationUserRow = (row: ApplicationUserRow): Uint8Array => {
    const tlv: TLV = {
        2: backupIdToBytes(row.user_id),
        3: backupIdToBytes(row.app_id),
        4: splitChunk(stringToBytes(row.identifier), 255),
        5: splitChunk(stringToBytes(row.callback_url), 255),
        6: backupIdToBytes(row.topic_id),
    }
    if (row.nostr_public_key) {
        tlv[7] = backupIdToBytes(row.nostr_public_key)
    }
    // TLV 8 is omitted when false so backups from before this field still decode.
    if (row.owner_only_clink) {
        tlv[8] = [boolToBytes(true)]
    }
    return encodeTLV(tlv)
}

export const decodeApplicationUserRow = (data: Uint8Array): ApplicationUserRow => {
    const tlv = parseTLV(data)
    return {
        user_id: backupIdFromBytes(tlv[2]),
        app_id: backupIdFromBytes(tlv[3]),
        identifier: stringFromBytes(joinChunks(tlv[4])),
        callback_url: stringFromBytes(joinChunks(tlv[5])),
        topic_id: backupIdFromBytes(tlv[6]),
        nostr_public_key: tlv[7] ? backupIdFromBytes(tlv[7]) : null,
        owner_only_clink: tlv[8] ? boolFromBytes(tlv[8][0]) : false,
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
        2: backupIdToBytes(row.app_user_id),
        3: backupIdToBytes(row.offer_id),
        4: backupIdToBytes(row.management_pubkey),
        5: splitChunk(stringToBytes(row.label), 255),
        6: [priceToBytes(row.price_sats)],
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
        app_user_id: backupIdFromBytes(tlv[2]),
        offer_id: backupIdFromBytes(tlv[3]),
        management_pubkey: backupIdFromBytes(tlv[4]),
        label: stringFromBytes(joinChunks(tlv[5])),
        price_sats: priceFromBytes(tlv[6][0]),
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
        // product_id is a TypeORM uuid (hyphenated), not raw hex
        2: splitChunk(stringToBytes(row.product_id), 255),
        3: backupIdToBytes(row.owner_user_id),
        4: splitChunk(stringToBytes(row.name), 255),
        5: [priceToBytes(row.price_sats)],
    }
    return encodeTLV(tlv)
}

export const decodeProductRow = (data: Uint8Array): ProductRow => {
    const tlv = parseTLV(data)
    return {
        product_id: stringFromBytes(joinChunks(tlv[2])),
        owner_user_id: backupIdFromBytes(tlv[3]),
        name: stringFromBytes(joinChunks(tlv[4])),
        price_sats: priceFromBytes(tlv[5][0]),
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
        2: backupIdToBytes(row.app_user_id),
        3: backupIdToBytes(row.app_pubkey),
        4: [numberToBytes(row.expires_at_unix)],
        5: [boolToBytes(row.banned)],
    }
    return encodeTLV(tlv)
}

export const decodeManagementGrantRow = (data: Uint8Array): ManagementGrantRow => {
    const tlv = parseTLV(data)
    return {
        app_user_id: backupIdFromBytes(tlv[2]),
        app_pubkey: backupIdFromBytes(tlv[3]),
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
        2: backupIdToBytes(row.app_user_id),
        3: backupIdToBytes(row.npub),
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
        app_user_id: backupIdFromBytes(tlv[2]),
        npub: backupIdFromBytes(tlv[3]),
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
        2: backupIdToBytes(row.inviteToken),
        3: backupIdToBytes(row.app_id),
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
        inviteToken: backupIdFromBytes(tlv[2]),
        app_id: backupIdFromBytes(tlv[3]),
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
        2: backupIdToBytes(row.app_user_id),
        3: backupIdToBytes(row.device_id),
        4: splitChunk(stringToBytes(row.firebase_messaging_token), 255),
    }
    return encodeTLV(tlv)
}

export const decodeAppUserDeviceRow = (data: Uint8Array): AppUserDeviceRow => {
    const tlv = parseTLV(data)
    return {
        app_user_id: backupIdFromBytes(tlv[2]),
        device_id: backupIdFromBytes(tlv[3]),
        firebase_messaging_token: stringFromBytes(joinChunks(tlv[4])),
    }
}

const unixFromBackup = (value: number | string | undefined): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }
    if (typeof value === 'string' && value !== '') {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
    }
    return 0
}

const tlvString = (tlv: TLV, tag: number, fallback = ''): string =>
    tlv[tag] ? stringFromBytes(joinChunks(tlv[tag])) : fallback

const tlvNumber = (tlv: TLV, tag: number, fallback = 0): number =>
    tlv[tag]?.[0] ? numberFromBytes(tlv[tag][0]) : fallback

const tlvBool = (tlv: TLV, tag: number, fallback = false): boolean =>
    tlv[tag]?.[0] ? boolFromBytes(tlv[tag][0]) : fallback

const putString = (tlv: TLV, tag: number, value: string, omitEmpty = false) => {
    if (omitEmpty && !value) {
        return
    }
    tlv[tag] = splitChunk(stringToBytes(value || ''), 255)
}

const putNumber = (tlv: TLV, tag: number, value: number, omitZero = false) => {
    if (omitZero && !value) {
        return
    }
    tlv[tag] = [numberToBytes(value)]
}

export type InvoiceSwapRow = {
    swap_operation_id: string
    app_user_id: string
    swap_quote_id: string
    swap_tree: string
    claim_public_key: string
    payment_hash: string
    timeout_block_height: number
    invoice: string
    invoice_amount: number
    transaction_amount: number
    swap_fee_sats: number
    chain_fee_sats: number
    sat_per_v_byte: number
    ephemeral_public_key: string
    address: string
    ephemeral_private_key: string
    used: boolean
    completed_at_unix: number
    paid_at_unix: number
    preimage: string
    failure_reason: string
    tx_id: string
    lockup_tx_hex: string
    refund_address: string
    refund_at_unix: number
    refund_tx_id: string
    refund_tx_hex: string
    service_url: string
}

/** Funded submarine recovery: lockups that have not been refunded. A stored preimage is not proof the lockup was spent. */
export const isInvoiceSwapBackupRow = (swap: {
    used?: boolean
    refund_tx_id?: string
    tx_id?: string
    lockup_tx_hex?: string
    failure_reason?: string
    preimage?: string
}): boolean => {
    if (swap.refund_tx_id) {
        return false
    }
    return !!(swap.tx_id || swap.lockup_tx_hex)
}

/** Open reverse-swap recovery: payment has started and the claim is not yet recorded. */
export const isTransactionSwapBackupRow = (swap: {
    paid_at_unix?: number | string
    tx_id?: string
}): boolean => unixFromBackup(swap.paid_at_unix) > 0 && !swap.tx_id

export const mapInvoiceSwapBackupRow = (swap: InvoiceSwap): InvoiceSwapRow => ({
    swap_operation_id: swap.swap_operation_id,
    app_user_id: swap.app_user_id,
    swap_quote_id: swap.swap_quote_id,
    swap_tree: swap.swap_tree,
    claim_public_key: swap.claim_public_key,
    payment_hash: swap.payment_hash,
    timeout_block_height: swap.timeout_block_height,
    invoice: swap.invoice,
    invoice_amount: swap.invoice_amount,
    transaction_amount: swap.transaction_amount,
    swap_fee_sats: swap.swap_fee_sats,
    chain_fee_sats: swap.chain_fee_sats,
    sat_per_v_byte: swap.sat_per_v_byte || 0,
    ephemeral_public_key: swap.ephemeral_public_key,
    address: swap.address,
    ephemeral_private_key: swap.ephemeral_private_key,
    used: !!swap.used,
    completed_at_unix: unixFromBackup(swap.completed_at_unix),
    paid_at_unix: unixFromBackup(swap.paid_at_unix),
    preimage: swap.preimage || '',
    failure_reason: swap.failure_reason || '',
    tx_id: swap.tx_id || '',
    lockup_tx_hex: swap.lockup_tx_hex || '',
    refund_address: swap.refund_address || '',
    refund_at_unix: unixFromBackup(swap.refund_at_unix),
    refund_tx_id: swap.refund_tx_id || '',
    refund_tx_hex: swap.refund_tx_hex || '',
    service_url: swap.service_url || '',
})

export const encodeInvoiceSwapRow = (row: InvoiceSwapRow): Uint8Array => {
    const tlv: TLV = {}
    putString(tlv, 2, row.swap_operation_id)
    putString(tlv, 3, row.app_user_id)
    putString(tlv, 4, row.swap_quote_id)
    putString(tlv, 5, row.swap_tree)
    putString(tlv, 6, row.claim_public_key)
    putString(tlv, 7, row.payment_hash)
    putNumber(tlv, 8, row.timeout_block_height)
    putString(tlv, 9, row.invoice)
    putNumber(tlv, 10, row.invoice_amount)
    putNumber(tlv, 11, row.transaction_amount)
    putNumber(tlv, 12, row.swap_fee_sats)
    putNumber(tlv, 13, row.chain_fee_sats)
    putNumber(tlv, 14, row.sat_per_v_byte, true)
    putString(tlv, 15, row.ephemeral_public_key)
    putString(tlv, 16, row.address)
    putString(tlv, 17, row.ephemeral_private_key)
    tlv[18] = [boolToBytes(row.used)]
    putNumber(tlv, 19, row.completed_at_unix, true)
    putNumber(tlv, 20, row.paid_at_unix, true)
    putString(tlv, 21, row.preimage, true)
    putString(tlv, 22, row.failure_reason, true)
    putString(tlv, 23, row.tx_id, true)
    putString(tlv, 24, row.lockup_tx_hex, true)
    putString(tlv, 25, row.refund_address, true)
    putNumber(tlv, 26, row.refund_at_unix, true)
    putString(tlv, 27, row.refund_tx_id, true)
    putString(tlv, 28, row.service_url, true)
    putString(tlv, 29, row.refund_tx_hex, true)
    return encodeTLV(tlv)
}

export const decodeInvoiceSwapRow = (data: Uint8Array): InvoiceSwapRow => {
    const tlv = parseTLV(data)
    return {
        swap_operation_id: tlvString(tlv, 2),
        app_user_id: tlvString(tlv, 3),
        swap_quote_id: tlvString(tlv, 4),
        swap_tree: tlvString(tlv, 5),
        claim_public_key: tlvString(tlv, 6),
        payment_hash: tlvString(tlv, 7),
        timeout_block_height: tlvNumber(tlv, 8),
        invoice: tlvString(tlv, 9),
        invoice_amount: tlvNumber(tlv, 10),
        transaction_amount: tlvNumber(tlv, 11),
        swap_fee_sats: tlvNumber(tlv, 12),
        chain_fee_sats: tlvNumber(tlv, 13),
        sat_per_v_byte: tlvNumber(tlv, 14),
        ephemeral_public_key: tlvString(tlv, 15),
        address: tlvString(tlv, 16),
        ephemeral_private_key: tlvString(tlv, 17),
        used: tlvBool(tlv, 18),
        completed_at_unix: tlvNumber(tlv, 19),
        paid_at_unix: tlvNumber(tlv, 20),
        preimage: tlvString(tlv, 21),
        failure_reason: tlvString(tlv, 22),
        tx_id: tlvString(tlv, 23),
        lockup_tx_hex: tlvString(tlv, 24),
        refund_address: tlvString(tlv, 25),
        refund_at_unix: tlvNumber(tlv, 26),
        refund_tx_id: tlvString(tlv, 27),
        service_url: tlvString(tlv, 28),
        refund_tx_hex: tlvString(tlv, 29),
    }
}

export type TransactionSwapRow = {
    swap_operation_id: string
    app_user_id: string
    swap_quote_id: string
    swap_tree: string
    lockup_address: string
    refund_public_key: string
    timeout_block_height: number
    invoice: string
    invoice_amount: number
    transaction_amount: number
    swap_fee_sats: number
    chain_fee_sats: number
    preimage: string
    ephemeral_public_key: string
    ephemeral_private_key: string
    used: boolean
    failure_reason: string
    tx_id: string
    completed_at_unix: number
    paid_at_unix: number
    address_paid: string
    claim_tx_hex: string
    lockup_tx_hex: string
    service_url: string
}

export const mapTransactionSwapBackupRow = (swap: TransactionSwap): TransactionSwapRow => ({
    swap_operation_id: swap.swap_operation_id,
    app_user_id: swap.app_user_id,
    swap_quote_id: swap.swap_quote_id,
    swap_tree: swap.swap_tree,
    lockup_address: swap.lockup_address,
    refund_public_key: swap.refund_public_key,
    timeout_block_height: swap.timeout_block_height,
    invoice: swap.invoice,
    invoice_amount: swap.invoice_amount,
    transaction_amount: swap.transaction_amount,
    swap_fee_sats: swap.swap_fee_sats,
    chain_fee_sats: swap.chain_fee_sats,
    preimage: swap.preimage,
    ephemeral_public_key: swap.ephemeral_public_key,
    ephemeral_private_key: swap.ephemeral_private_key,
    used: !!swap.used,
    failure_reason: swap.failure_reason || '',
    tx_id: swap.tx_id || '',
    completed_at_unix: unixFromBackup(swap.completed_at_unix),
    paid_at_unix: unixFromBackup(swap.paid_at_unix),
    address_paid: swap.address_paid || '',
    claim_tx_hex: swap.claim_tx_hex || '',
    lockup_tx_hex: swap.lockup_tx_hex || '',
    service_url: swap.service_url || '',
})

export const encodeTransactionSwapRow = (row: TransactionSwapRow): Uint8Array => {
    const tlv: TLV = {}
    putString(tlv, 2, row.swap_operation_id)
    putString(tlv, 3, row.app_user_id)
    putString(tlv, 4, row.swap_quote_id)
    putString(tlv, 5, row.swap_tree)
    putString(tlv, 6, row.lockup_address)
    putString(tlv, 7, row.refund_public_key)
    putNumber(tlv, 8, row.timeout_block_height)
    putString(tlv, 9, row.invoice)
    putNumber(tlv, 10, row.invoice_amount)
    putNumber(tlv, 11, row.transaction_amount)
    putNumber(tlv, 12, row.swap_fee_sats)
    putNumber(tlv, 13, row.chain_fee_sats)
    putString(tlv, 14, row.preimage)
    putString(tlv, 15, row.ephemeral_public_key)
    putString(tlv, 16, row.ephemeral_private_key)
    tlv[17] = [boolToBytes(row.used)]
    putString(tlv, 18, row.failure_reason, true)
    putString(tlv, 19, row.tx_id, true)
    putNumber(tlv, 20, row.completed_at_unix, true)
    putNumber(tlv, 21, row.paid_at_unix, true)
    putString(tlv, 22, row.address_paid, true)
    putString(tlv, 23, row.claim_tx_hex, true)
    putString(tlv, 24, row.lockup_tx_hex, true)
    putString(tlv, 25, row.service_url, true)
    return encodeTLV(tlv)
}

export const decodeTransactionSwapRow = (data: Uint8Array): TransactionSwapRow => {
    const tlv = parseTLV(data)
    return {
        swap_operation_id: tlvString(tlv, 2),
        app_user_id: tlvString(tlv, 3),
        swap_quote_id: tlvString(tlv, 4),
        swap_tree: tlvString(tlv, 5),
        lockup_address: tlvString(tlv, 6),
        refund_public_key: tlvString(tlv, 7),
        timeout_block_height: tlvNumber(tlv, 8),
        invoice: tlvString(tlv, 9),
        invoice_amount: tlvNumber(tlv, 10),
        transaction_amount: tlvNumber(tlv, 11),
        swap_fee_sats: tlvNumber(tlv, 12),
        chain_fee_sats: tlvNumber(tlv, 13),
        preimage: tlvString(tlv, 14),
        ephemeral_public_key: tlvString(tlv, 15),
        ephemeral_private_key: tlvString(tlv, 16),
        used: tlvBool(tlv, 17),
        failure_reason: tlvString(tlv, 18),
        tx_id: tlvString(tlv, 19),
        completed_at_unix: tlvNumber(tlv, 20),
        paid_at_unix: tlvNumber(tlv, 21),
        address_paid: tlvString(tlv, 22),
        claim_tx_hex: tlvString(tlv, 23),
        lockup_tx_hex: tlvString(tlv, 24),
        service_url: tlvString(tlv, 25),
    }
}