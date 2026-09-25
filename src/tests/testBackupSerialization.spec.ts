import {
    AdminSettingRow, ApplicationRow, ApplicationUserRow, AppUserDeviceRow,
    BackupData, BalanceRow, DebitAccessRow, encodeApplicationUserRow, encodeAdminSettingRow,
    encodeUserOfferRow, encodeProductRow, encodeManagementGrantRow, encodeDebitAccessRow,
    encodeInviteTokenRow, encodeBalanceRow, encodeAppUserDeviceRow, encodeTrackedProviderRow,
    InviteTokenRow, ManagementGrantRow, ProductRow, TrackedProviderRow, UserOfferRow, encodeApplicationRow,
    decodeApplicationRow, decodeApplicationUserRow, decodeTrackedProviderRow, decodeBalanceRow,
    decodeAdminSettingRow, decodeUserOfferRow, decodeProductRow, decodeManagementGrantRow, decodeDebitAccessRow,
    decodeInviteTokenRow, decodeAppUserDeviceRow,
    encodeIndexesRow,
    decodeIndexesRow
} from '../services/backup/segments.js'
import { StorageTestBase } from './testBase.js'
import crypto from 'crypto'
export const ignore = false
export const dev = false
export const requires = 'storage'

export default async (T: StorageTestBase) => {
    testSerializeBalanceData(T)
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
    }
    T.expect(decoded).to.deep.equal(backupData)
    T.d('Finished testSerializeBalanceData')
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
        indexes: [{ addressesCount: 20 }],
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
        app_user_id: randomHex,
        offer_id: randomHex,
        management_pubkey: randomHex,
        label: `test-user-offer-${base}`,
        price_sats: 1000,
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
        price_sats: 1000,
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
        app_user_id: randomHex,
        device_id: randomHex,
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

