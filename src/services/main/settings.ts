import { LoadStorageSettingsFromEnv, StorageSettings } from '../storage/index.js'
import { LndSettings, NodeSettings } from '../lnd/settings.js'
import { LoadWatchdogSettingsFromEnv, WatchdogSettings } from './watchdog.js'
import { LoadLndSettingsFromEnv } from '../lnd/index.js'
import { EnvCanBeInteger, EnvMustBeInteger, EnvMustBeNonEmptyString } from '../helpers/envParser.js'
import { getLogger } from '../helpers/logger.js'
import fs from 'fs'
import crypto from 'crypto';
import { LiquiditySettings, LoadLiquiditySettingsFromEnv } from './liquidityManager.js'

export type MainSettings = {
    storageSettings: StorageSettings,
    lndSettings: LndSettings,
    watchDogSettings: WatchdogSettings,
    liquiditySettings: LiquiditySettings,
    jwtSecret: string
    walletPasswordPath: string
    walletSecretPath: string
    incomingTxFee: number
    outgoingTxFee: number
    incomingAppInvoiceFee: number
    incomingAppUserInvoiceFee: number
    outgoingAppInvoiceFee: number
    outgoingAppUserInvoiceFee: number
    outgoingAppUserInvoiceFeeBps: number
    userToUserFee: number
    appToUserFee: number
    serviceUrl: string
    servicePort: number
    recordPerformance: boolean
    skipSanityCheck: boolean
    disableExternalPayments: boolean
    wizard: boolean
    defaultAppName: string
    pushBackupsToNostr: boolean
    lnurlMetaText: string
}

export type BitcoinCoreSettings = {
    port: number
    user: string
    pass: string
}

export type TestSettings = MainSettings & { lndSettings: { otherNode: NodeSettings, thirdNode: NodeSettings, fourthNode: NodeSettings }, bitcoinCoreSettings: BitcoinCoreSettings }
export const LoadMainSettingsFromEnv = (): MainSettings => {
    const storageSettings = LoadStorageSettingsFromEnv()
    const outgoingAppUserInvoiceFeeBps = EnvCanBeInteger("OUTGOING_INVOICE_FEE_USER_BPS", 0)

    return {
        watchDogSettings: LoadWatchdogSettingsFromEnv(),
        lndSettings: LoadLndSettingsFromEnv(),
        storageSettings: storageSettings,
        liquiditySettings: LoadLiquiditySettingsFromEnv(),
        jwtSecret: loadJwtSecret(storageSettings.dataDir),
        walletSecretPath: process.env.WALLET_SECRET_PATH || getDataPath(storageSettings.dataDir, ".wallet_secret"),
        walletPasswordPath: process.env.WALLET_PASSWORD_PATH || getDataPath(storageSettings.dataDir, ".wallet_password"),
        incomingTxFee: EnvCanBeInteger("INCOMING_CHAIN_FEE_ROOT_BPS", 0) / 10000,
        outgoingTxFee: EnvCanBeInteger("OUTGOING_CHAIN_FEE_ROOT_BPS", 60) / 10000,
        incomingAppInvoiceFee: EnvCanBeInteger("INCOMING_INVOICE_FEE_ROOT_BPS", 0) / 10000,
        outgoingAppInvoiceFee: EnvCanBeInteger("OUTGOING_INVOICE_FEE_ROOT_BPS", 60) / 10000,
        incomingAppUserInvoiceFee: EnvCanBeInteger("INCOMING_INVOICE_FEE_USER_BPS", 0) / 10000,
        outgoingAppUserInvoiceFeeBps,
        outgoingAppUserInvoiceFee: outgoingAppUserInvoiceFeeBps / 10000,
        userToUserFee: EnvCanBeInteger("TX_FEE_INTERNAL_USER_BPS", 0) / 10000,
        appToUserFee: EnvCanBeInteger("TX_FEE_INTERNAL_ROOT_BPS", 0) / 10000,
        serviceUrl: process.env.SERVICE_URL || `http://localhost:${EnvCanBeInteger("PORT", 1776)}`,
        servicePort: EnvCanBeInteger("PORT", 1776),
        recordPerformance: process.env.RECORD_PERFORMANCE === 'true' || false,
        skipSanityCheck: process.env.SKIP_SANITY_CHECK === 'true' || false,
        disableExternalPayments: process.env.DISABLE_EXTERNAL_PAYMENTS === 'true' || false,
        wizard: process.env.WIZARD === 'true' || false,
        defaultAppName: process.env.DEFAULT_APP_NAME || "wallet",
        pushBackupsToNostr: process.env.PUSH_BACKUPS_TO_NOSTR === 'true' || false,
        lnurlMetaText: process.env.LNURL_META_TEXT || "lnurl pay to Lightning.pub"
    }
}

export const LoadTestSettingsFromEnv = (): TestSettings => {
    const eventLogPath = `logs/eventLogV3Test${Date.now()}.csv`
    const settings = LoadMainSettingsFromEnv()
    return {
        ...settings,
        storageSettings: { dbSettings: { ...settings.storageSettings.dbSettings, databaseFile: ":memory:", metricsDatabaseFile: ":memory:" }, eventLogPath, dataDir: "data" },
        lndSettings: {
            ...settings.lndSettings,
            otherNode: {
                lndAddr: EnvMustBeNonEmptyString("LND_OTHER_ADDR"),
                lndCertPath: EnvMustBeNonEmptyString("LND_OTHER_CERT_PATH"),
                lndMacaroonPath: EnvMustBeNonEmptyString("LND_OTHER_MACAROON_PATH")
            },
            thirdNode: {
                lndAddr: EnvMustBeNonEmptyString("LND_THIRD_ADDR"),
                lndCertPath: EnvMustBeNonEmptyString("LND_THIRD_CERT_PATH"),
                lndMacaroonPath: EnvMustBeNonEmptyString("LND_THIRD_MACAROON_PATH")
            },
            fourthNode: {
                lndAddr: EnvMustBeNonEmptyString("LND_FOURTH_ADDR"),
                lndCertPath: EnvMustBeNonEmptyString("LND_FOURTH_CERT_PATH"),
                lndMacaroonPath: EnvMustBeNonEmptyString("LND_FOURTH_MACAROON_PATH")
            },
        },
        liquiditySettings: {
            ...settings.liquiditySettings,
            liquidityProviderPub: "",
        },
        skipSanityCheck: true,
        bitcoinCoreSettings: {
            port: EnvMustBeInteger("BITCOIN_CORE_PORT"),
            user: EnvMustBeNonEmptyString("BITCOIN_CORE_USER"),
            pass: EnvMustBeNonEmptyString("BITCOIN_CORE_PASS")
        },
    }
}

export const loadJwtSecret = (dataDir: string): string => {
    const secret = process.env["JWT_SECRET"]
    const log = getLogger({})
    if (secret) {
        return secret
    }
    log("JWT_SECRET not set in env, checking .jwt_secret file")
    const secretPath = getDataPath(dataDir, ".jwt_secret")
    try {
        const fileContent = fs.readFileSync(secretPath, "utf-8")
        return fileContent.trim()
    } catch (e) {
        log(".jwt_secret file not found, generating random secret")
        const secret = crypto.randomBytes(32).toString('hex')
        fs.writeFileSync(secretPath, secret)
        return secret
    }
}

export const getDataPath = (dataDir: string, dataPath: string) => {
    return dataDir !== "" ? `${dataDir}/${dataPath}` : dataPath
}