import {
    AdminSettingRow, ApplicationRow, ApplicationUserRow, AppUserDeviceRow,
    BackupData, BalanceRow, DebitAccessRow, encodeApplicationUserRow, encodeAdminSettingRow,
    encodeUserOfferRow, encodeProductRow, encodeManagementGrantRow, encodeDebitAccessRow,
    encodeInviteTokenRow, encodeBalanceRow, encodeAppUserDeviceRow, encodeTrackedProviderRow,
    encodeInvoiceSwapRow, encodeTransactionSwapRow,
    InviteTokenRow, ManagementGrantRow, ProductRow, TrackedProviderRow, UserOfferRow, encodeApplicationRow,
    decodeApplicationRow, decodeApplicationUserRow, decodeTrackedProviderRow, decodeBalanceRow,
    decodeAdminSettingRow, decodeUserOfferRow, decodeProductRow, decodeManagementGrantRow, decodeDebitAccessRow,
    decodeInviteTokenRow, decodeAppUserDeviceRow, decodeInvoiceSwapRow, decodeTransactionSwapRow,
    encodeIndexesRow,
    decodeIndexesRow,
    InvoiceSwapRow, TransactionSwapRow,
    isInvoiceSwapBackupRow, isTransactionSwapBackupRow,
} from '../services/backup/segments.js'
import { StorageTestBase } from './testBase.js'
import crypto from 'crypto'
export const ignore = false
export const dev = false
export const requires = 'storage'

export default async (T: StorageTestBase) => {
    testSerializeBalanceData(T)
    testSwapBackupFilters(T)
    //testSize(T)
}

const testSerializeBalanceData = (T: StorageTestBase) => {
    T.d('Starting testSerializeBalanceData')
    const backupData = generateBackupData(1)
    const encoded = {
        indexes: backupData.indexes.map(encodeIndexesRow),
        applications: backupData.applications.map(encodeApplicationRow),
        applicationUsers: backupData.applicationUsers.map(encodeApplicationUserRow),
        adminSettings: backupData.adminSettings.map(encodeAdminSettingRow),
        userOffers: backupData.userOffers.map(encodeUserOfferRow),
        products: backupData.products.map(encodeProductRow),
        managementGrants: backupData.managementGrants.map(encodeManagementGrantRow),
        debitAccesses: backupData.debitAccesses.map(encodeDebitAccessRow),
        inviteTokens: backupData.inviteTokens.map(encodeInviteTokenRow),
        appUserDevices: backupData.appUserDevices.map(encodeAppUserDeviceRow),
        balances: backupData.balances.map(encodeBalanceRow),
        trackedProviders: backupData.trackedProviders.map(encodeTrackedProviderRow),
        invoiceSwaps: backupData.invoiceSwaps.map(encodeInvoiceSwapRow),
        transactionSwaps: backupData.transactionSwaps.map(encodeTransactionSwapRow),
    }
    const decoded = {
        indexes: encoded.indexes.map(decodeIndexesRow),
        applications: encoded.applications.map(decodeApplicationRow),
        applicationUsers: encoded.applicationUsers.map(decodeApplicationUserRow),
        adminSettings: encoded.adminSettings.map(decodeAdminSettingRow),
        userOffers: encoded.userOffers.map(decodeUserOfferRow),
        products: encoded.products.map(decodeProductRow),
        managementGrants: encoded.managementGrants.map(decodeManagementGrantRow),
        debitAccesses: encoded.debitAccesses.map(decodeDebitAccessRow),
        inviteTokens: encoded.inviteTokens.map(decodeInviteTokenRow),
        appUserDevices: encoded.appUserDevices.map(decodeAppUserDeviceRow),
        balances: encoded.balances.map(decodeBalanceRow),
        trackedProviders: encoded.trackedProviders.map(decodeTrackedProviderRow),
        invoiceSwaps: encoded.invoiceSwaps.map(decodeInvoiceSwapRow),
        transactionSwaps: encoded.transactionSwaps.map(decodeTransactionSwapRow),
    }
    T.expect(decoded).to.deep.equal(backupData)
    T.d('Finished testSerializeBalanceData')
}

const testSwapBackupFilters = (T: StorageTestBase) => {
    T.d('Starting testSwapBackupFilters')
    T.expect(isInvoiceSwapBackupRow({ used: false })).to.equal(false)
    T.expect(isInvoiceSwapBackupRow({ used: false, tx_id: 'aa' })).to.equal(true)
    T.expect(isInvoiceSwapBackupRow({ used: false, lockup_tx_hex: '0200', refund_tx_id: 'cc' })).to.equal(false)
    T.expect(isInvoiceSwapBackupRow({ used: true, tx_id: 'aa', preimage: 'bb' })).to.equal(true)
    T.expect(isInvoiceSwapBackupRow({ used: true, tx_id: 'aa', failure_reason: 'timeout' })).to.equal(true)
    T.expect(isInvoiceSwapBackupRow({ used: true, tx_id: 'aa' })).to.equal(true)
    T.expect(isInvoiceSwapBackupRow({ used: true })).to.equal(false)

    T.expect(isTransactionSwapBackupRow({ paid_at_unix: 0 })).to.equal(false)
    T.expect(isTransactionSwapBackupRow({ paid_at_unix: 1 })).to.equal(true)
    T.expect(isTransactionSwapBackupRow({ paid_at_unix: 1, tx_id: 'dd' })).to.equal(false)
    T.d('Finished testSwapBackupFilters')
}


const explode = (base: number) => {
    return (percent: number, _name: string) => {
        const n = Math.ceil(base * percent / 100)
        return Array.from({ length: n }, (_, i) => i)
    }
}


const generateBackupData = (base: number): BackupData => {
    const ex = explode(base)
    return {
        indexes: [{ addressesCount: 20, scb: new Uint8Array([1, 2, 3, 4]) }],
        applications: ex(1, "applications").map(generateApplicationRow),
        applicationUsers: ex(100, "applicationUsers").map(generateApplicationUserRow),
        adminSettings: ex(10, "adminSettings").map(generateAdminSettingRow),
        userOffers: ex(100, "userOffers").map(generateUserOfferRow),
        products: ex(10, "products").map(generateProductRow),
        managementGrants: ex(10, "managementGrants").map(generateManagementGrantRow),
        debitAccesses: ex(10, "debitAccesses").map(generateDebitAccessRow),
        inviteTokens: ex(10, "inviteTokens").map(generateInviteTokenRow),
        appUserDevices: ex(10, "appUserDevices").map(generateAppUserDeviceRow),
        balances: ex(100, "balances").map(generateBalanceRow),
        trackedProviders: ex(1, "trackedProviders").map(generateTrackedProviderRow),
        invoiceSwaps: ex(1, "invoiceSwaps").map(generateInvoiceSwapRow),
        transactionSwaps: ex(1, "transactionSwaps").map(generateTransactionSwapRow),
    }
}

const randomHex = crypto.randomBytes(32).toString('hex')

const generateApplicationRow = (base: number): ApplicationRow => {
    return {
        app_id: randomHex,
        name: `test-app-${base}`,
        owner_user_id: randomHex,
        allow_user_creation: true,
        nostr_private_key: randomHex,
        nostr_public_key: randomHex,
    }
}

const generateApplicationUserRow = (base: number): ApplicationUserRow => {
    return {
        user_id: randomHex,
        app_id: randomHex,
        identifier: randomHex,
        callback_url: `https://test-app-user-${base}.com`,
        topic_id: randomHex,
        nostr_public_key: randomHex,
        owner_only_clink: base % 2 === 0,
    }
}

const generateAdminSettingRow = (base: number): AdminSettingRow => {
    return {
        env_name: `test-admin-setting-${base}`,
        env_value: `test-admin-setting-value-${base}`,
    }
}

const generateUserOfferRow = (base: number): UserOfferRow => {
    return {
        app_user_id: base === 0 ? 'alice' : randomHex,
        offer_id: base === 0 ? 'alice' : randomHex,
        management_pubkey: randomHex,
        label: `test-user-offer-${base}`,
        price_sats: base === 0 ? 1.5 : 1000,
        callback_url: ``,
        bearer_token: "random-bearer-token",
        rejectUnauthorized: true,
        blind: false,
        payer_data: null,
    }
}

const generateProductRow = (base: number): ProductRow => {
    return {
        product_id: crypto.randomUUID(),
        owner_user_id: randomHex,
        name: `test-product-${base}`,
        price_sats: base === 0 ? 1.5 : 1000,
    }
}

const generateManagementGrantRow = (base: number): ManagementGrantRow => {
    return {
        app_user_id: randomHex,
        app_pubkey: randomHex,
        expires_at_unix: Math.floor(Date.now() / 1000),
        banned: false,
    }
}

const generateDebitAccessRow = (base: number): DebitAccessRow => {
    return {
        app_user_id: randomHex,
        npub: randomHex,
        authorized: true,
        total_debits: 1000,
        rules: null,
    }
}

const generateInviteTokenRow = (base: number): InviteTokenRow => {
    return {
        inviteToken: randomHex,
        app_id: randomHex,
        used: false,
        sats: 1000,
    }
}

const generateAppUserDeviceRow = (base: number): AppUserDeviceRow => {
    return {
        app_user_id: base === 0 ? 'alice' : randomHex,
        device_id: crypto.randomUUID(),
        firebase_messaging_token: `fcm-token-${base}`,
    }
}

const generateTrackedProviderRow = (base: number): TrackedProviderRow => {
    return {
        provider_type: "lnd",
        provider_pubkey: randomHex,
        latest_balance: 1000,
        latest_distruption_at_unix: Math.floor(Date.now() / 1000),
        latest_checked_height: 1000,
    }
}

const generateBalanceRow = (base: number): BalanceRow => {
    return {
        user_id: randomHex,
        balance_sats: 1000,
        locked: false,
    }
}

const generateInvoiceSwapRow = (base: number): InvoiceSwapRow => {
    return {
        swap_operation_id: crypto.randomUUID(),
        app_user_id: randomHex,
        swap_quote_id: `sub-${base}`,
        swap_tree: JSON.stringify({ claimLeaf: { version: 196, output: 'aa' }, refundLeaf: { version: 196, output: 'bb' } }),
        claim_public_key: randomHex,
        payment_hash: randomHex,
        timeout_block_height: 800_000,
        invoice: 'lnbc1-test',
        invoice_amount: 1000,
        transaction_amount: 1100,
        swap_fee_sats: 80,
        chain_fee_sats: 20,
        sat_per_v_byte: 2,
        ephemeral_public_key: randomHex,
        address: 'bcrt1qtest',
        ephemeral_private_key: randomHex,
        used: false,
        completed_at_unix: 0,
        paid_at_unix: 1,
        preimage: '',
        failure_reason: '',
        tx_id: randomHex,
        lockup_tx_hex: '020000000001',
        refund_address: '',
        refund_at_unix: 0,
        refund_tx_id: '',
        refund_tx_hex: '',
        service_url: 'https://boltz.example',
    }
}

const generateTransactionSwapRow = (base: number): TransactionSwapRow => {
    return {
        swap_operation_id: crypto.randomUUID(),
        app_user_id: randomHex,
        swap_quote_id: `rev-${base}`,
        swap_tree: JSON.stringify({ claimLeaf: { version: 196, output: 'aa' }, refundLeaf: { version: 196, output: 'bb' } }),
        lockup_address: 'bcrt1qlockup',
        refund_public_key: randomHex,
        timeout_block_height: 800_000,
        invoice: 'lnbc1-rev',
        invoice_amount: 1200,
        transaction_amount: 1000,
        swap_fee_sats: 50,
        chain_fee_sats: 15,
        preimage: randomHex,
        ephemeral_public_key: randomHex,
        ephemeral_private_key: randomHex,
        used: false,
        failure_reason: '',
        tx_id: '',
        completed_at_unix: 0,
        paid_at_unix: 1,
        address_paid: 'bcrt1qdest',
        claim_tx_hex: '020000000002',
        lockup_tx_hex: '020000000003',
        service_url: 'https://boltz.example',
    }
}

