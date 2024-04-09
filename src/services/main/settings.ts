import { LoadStorageSettingsFromEnv, StorageSettings } from '../storage/index.js'
import { LndSettings, NodeSettings } from '../lnd/settings.js'
import { LoadWatchdogSettingsFromEnv, WatchdogSettings } from './watchdog.js'
import { LoadLndSettingsFromEnv } from '../lnd/index.js'
import { EnvMustBeInteger, EnvMustBeNonEmptyString } from '../helpers/envParser.js'
export type MainSettings = {
    storageSettings: StorageSettings,
    lndSettings: LndSettings,
    watchDogSettings: WatchdogSettings,
    jwtSecret: string
    incomingTxFee: number
    outgoingTxFee: number
    incomingAppInvoiceFee: number
    incomingAppUserInvoiceFee: number
    outgoingAppInvoiceFee: number
    outgoingAppUserInvoiceFee: number
    userToUserFee: number
    appToUserFee: number
    serviceUrl: string
    servicePort: number
    recordPerformance: boolean
    skipSanityCheck: boolean
    disableExternalPayments: boolean
}
export const LoadMainSettingsFromEnv = (): MainSettings => {
    return {
        watchDogSettings: LoadWatchdogSettingsFromEnv(),
        lndSettings: LoadLndSettingsFromEnv(),
        storageSettings: LoadStorageSettingsFromEnv(),
        jwtSecret: EnvMustBeNonEmptyString("JWT_SECRET"),
        incomingTxFee: EnvMustBeInteger("INCOMING_CHAIN_FEE_ROOT_BPS") / 10000,
        outgoingTxFee: EnvMustBeInteger("OUTGOING_CHAIN_FEE_ROOT_BPS") / 10000,
        incomingAppInvoiceFee: EnvMustBeInteger("INCOMING_INVOICE_FEE_ROOT_BPS") / 10000,
        outgoingAppInvoiceFee: EnvMustBeInteger("OUTGOING_INVOICE_FEE_ROOT_BPS") / 10000,
        incomingAppUserInvoiceFee: EnvMustBeInteger("INCOMING_INVOICE_FEE_USER_BPS") / 10000,
        outgoingAppUserInvoiceFee: EnvMustBeInteger("OUTGOING_INVOICE_FEE_USER_BPS") / 10000,
        userToUserFee: EnvMustBeInteger("TX_FEE_INTERNAL_USER_BPS") / 10000,
        appToUserFee: EnvMustBeInteger("TX_FEE_INTERNAL_ROOT_BPS") / 10000,
        serviceUrl: EnvMustBeNonEmptyString("SERVICE_URL"),
        servicePort: EnvMustBeInteger("PORT"),
        recordPerformance: process.env.RECORD_PERFORMANCE === 'true' || false,
        skipSanityCheck: process.env.SKIP_SANITY_CHECK === 'true' || false,
        disableExternalPayments: process.env.DISABLE_EXTERNAL_PAYMENTS === 'true' || false
    }
}

export const LoadTestSettingsFromEnv = (): MainSettings & { lndSettings: { otherNode: NodeSettings, thirdNode: NodeSettings } } => {
    const eventLogPath = `logs/eventLogV2Test${Date.now()}.csv`
    const settings = LoadMainSettingsFromEnv()
    return {
        ...settings,
        storageSettings: { dbSettings: { ...settings.storageSettings.dbSettings, databaseFile: ":memory:", metricsDatabaseFile: ":memory:" }, eventLogPath },
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
            }
        },
        skipSanityCheck: true
    }
}