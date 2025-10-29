import { EnvCacher, EnvMustBeNonEmptyString, EnvMustBeInteger, chooseEnv, chooseEnvBool, chooseEnvInt } from '../helpers/envParser.js'
import os from 'os'
import path from 'path'

export type ServiceFeeSettings = {
    incomingTxFee: number
    outgoingTxFee: number
    incomingAppInvoiceFee: number
    incomingAppUserInvoiceFee: number
    outgoingAppInvoiceFee: number
    outgoingAppUserInvoiceFee: number
    outgoingAppUserInvoiceFeeBps: number
    userToUserFee: number
    appToUserFee: number
}

export const LoadServiceFeeSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): ServiceFeeSettings => {
    const outgoingAppUserInvoiceFeeBps = chooseEnvInt("OUTGOING_INVOICE_FEE_USER_BPS", dbEnv, 0, addToDb)
    return {
        incomingTxFee: chooseEnvInt("INCOMING_CHAIN_FEE_ROOT_BPS", dbEnv, 0, addToDb) / 10000,
        outgoingTxFee: chooseEnvInt("OUTGOING_CHAIN_FEE_ROOT_BPS", dbEnv, 60, addToDb) / 10000,
        incomingAppInvoiceFee: chooseEnvInt("INCOMING_INVOICE_FEE_ROOT_BPS", dbEnv, 0, addToDb) / 10000,
        outgoingAppInvoiceFee: chooseEnvInt("OUTGOING_INVOICE_FEE_ROOT_BPS", dbEnv, 60, addToDb) / 10000,
        incomingAppUserInvoiceFee: chooseEnvInt("INCOMING_INVOICE_FEE_USER_BPS", dbEnv, 0, addToDb) / 10000,
        outgoingAppUserInvoiceFeeBps,
        outgoingAppUserInvoiceFee: outgoingAppUserInvoiceFeeBps / 10000,
        userToUserFee: chooseEnvInt("TX_FEE_INTERNAL_USER_BPS", dbEnv, 0, addToDb) / 10000,
        appToUserFee: chooseEnvInt("TX_FEE_INTERNAL_ROOT_BPS", dbEnv, 0, addToDb) / 10000,
    }
}

export type ServiceSettings = {
    servicePort: number
    recordPerformance: boolean
    skipSanityCheck: boolean
    wizard: boolean
    bridgeUrl: string,
    shockPushBaseUrl: string

    serviceUrl: string
    disableExternalPayments: boolean
    defaultAppName: string
    pushBackupsToNostr: boolean
    lnurlMetaText: string,
    allowHttpUpgrade: boolean


}

export const LoadServiceSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): ServiceSettings => {
    const port = chooseEnvInt("PORT", dbEnv, 1776, addToDb)
    return {
        serviceUrl: chooseEnv("SERVICE_URL", dbEnv, `http://localhost:${port}`, addToDb),
        servicePort: port,
        recordPerformance: chooseEnvBool("RECORD_PERFORMANCE", dbEnv, false, addToDb),
        skipSanityCheck: chooseEnvBool("SKIP_SANITY_CHECK", dbEnv, false, addToDb),
        disableExternalPayments: chooseEnvBool("DISABLE_EXTERNAL_PAYMENTS", dbEnv, false, addToDb),
        wizard: chooseEnvBool("WIZARD", dbEnv, false, addToDb),
        defaultAppName: chooseEnv("DEFAULT_APP_NAME", dbEnv, "wallet", addToDb),
        pushBackupsToNostr: chooseEnvBool("PUSH_BACKUPS_TO_NOSTR", dbEnv, false, addToDb),
        lnurlMetaText: chooseEnv("LNURL_META_TEXT", dbEnv, "LNURL via Lightning.pub", addToDb),
        bridgeUrl: chooseEnv("BRIDGE_URL", dbEnv, "https://shockwallet.app", addToDb),
        allowHttpUpgrade: chooseEnvBool("ALLOW_HTTP_UPGRADE", dbEnv, false, addToDb),
        shockPushBaseUrl: chooseEnv("SHOCK_PUSH_URL", dbEnv, "", addToDb),
    }
}

export type BitcoinCoreSettings = {
    port: number
    user: string
    pass: string
}

export type LndNodeSettings = {
    lndAddr: string // cold setting
    lndCertPath: string // cold setting
    lndMacaroonPath: string // cold setting
}
export type LndSettings = {
    lndLogDir: string
    feeRateLimit: number
    feeFixedLimit: number
    feeRateBps: number
    mockLnd: boolean

}

const resolveHome = (filepath: string) => {
    let homeDir;
    if (process.env.SUDO_USER) {
        homeDir = path.join('/home', process.env.SUDO_USER);
    } else {
        homeDir = os.homedir();
    }
    return path.join(homeDir, filepath);
}

export const LoadLndNodeSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LndNodeSettings => {
    return {
        lndAddr: chooseEnv('LND_ADDRESS', dbEnv, "127.0.0.1:10009", addToDb),
        lndCertPath: chooseEnv('LND_CERT_PATH', dbEnv, resolveHome("/.lnd/tls.cert"), addToDb),
        lndMacaroonPath: chooseEnv('LND_MACAROON_PATH', dbEnv, resolveHome("/.lnd/data/chain/bitcoin/mainnet/admin.macaroon"), addToDb),
    }
}

export const LoadLndSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LndSettings => {
    const feeRateBps: number = chooseEnvInt('OUTBOUND_MAX_FEE_BPS', dbEnv, 60, addToDb)
    return {
        lndLogDir: chooseEnv('LND_LOG_DIR', dbEnv, resolveHome("/.lnd/logs/bitcoin/mainnet/lnd.log"), addToDb),
        feeRateBps: feeRateBps,
        feeRateLimit: feeRateBps / 10000,
        feeFixedLimit: chooseEnvInt('OUTBOUND_MAX_FEE_EXTRA_SATS', dbEnv, 100, addToDb),
        mockLnd: false
    }
}

export type NostrRelaySettings = {
    relays: string[],
    maxEventContentLength: number
}

export const LoadNosrtRelaySettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): NostrRelaySettings => {
    const relaysEnv = chooseEnv("NOSTR_RELAYS", dbEnv, "wss://relay.lightning.pub", addToDb);
    const maxEventContentLength = chooseEnvInt("NOSTR_MAX_EVENT_CONTENT_LENGTH", dbEnv, 40000, addToDb)
    return {
        relays: relaysEnv.split(' '),
        maxEventContentLength
    }
}

export type WatchdogSettings = {
    maxDiffSats: number // hot setting
}
export const LoadWatchdogSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): WatchdogSettings => {
    return {
        maxDiffSats: chooseEnvInt("WATCHDOG_MAX_DIFF_SATS", dbEnv, 0, addToDb)
    }
}

export type LSPSettings = {
    olympusServiceUrl: string // hot setting
    voltageServiceUrl: string // unused?
    flashsatsServiceUrl: string // hot setting
    channelThreshold: number // hot setting
    maxRelativeFee: number // hot setting
}

export const LoadLSPSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LSPSettings => {
    const olympusServiceUrl = chooseEnv("OLYMPUS_LSP_URL", dbEnv, "https://lsps1.lnolymp.us/api/v1", addToDb)
    const voltageServiceUrl = chooseEnv("VOLTAGE_LSP_URL", dbEnv, "https://lsp.voltageapi.com/api/v1", addToDb)
    const flashsatsServiceUrl = chooseEnv("FLASHSATS_LSP_URL", dbEnv, "https://lsp.flashsats.xyz/lsp/channel", addToDb)
    const channelThreshold = chooseEnvInt("LSP_CHANNEL_THRESHOLD", dbEnv, 1000000, addToDb)
    const maxRelativeFee = chooseEnvInt("LSP_MAX_FEE_BPS", dbEnv, 100, addToDb) / 10000
    return { olympusServiceUrl, voltageServiceUrl, channelThreshold, maxRelativeFee, flashsatsServiceUrl }

}

export type LiquiditySettings = {

    liquidityProviderPub: string // cold setting
    useOnlyLiquidityProvider: boolean // hot setting
    disableLiquidityProvider: boolean // hot setting
}
export const LoadLiquiditySettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LiquiditySettings => {
    //const liquidityProviderPub = process.env.LIQUIDITY_PROVIDER_PUB === "null" ? "" : (process.env.LIQUIDITY_PROVIDER_PUB || "76ed45f00cea7bac59d8d0b7d204848f5319d7b96c140ffb6fcbaaab0a13d44e")
    const liquidityProviderPub = chooseEnv("LIQUIDITY_PROVIDER_PUB", dbEnv, "76ed45f00cea7bac59d8d0b7d204848f5319d7b96c140ffb6fcbaaab0a13d44e", addToDb)
    const disableLiquidityProvider = chooseEnvBool("DISABLE_LIQUIDITY_PROVIDER", dbEnv, false, addToDb) || liquidityProviderPub === "null"
    return { liquidityProviderPub, useOnlyLiquidityProvider: false, disableLiquidityProvider }
}




export const LoadSecondLndSettingsFromEnv = (): LndNodeSettings => {
    return {
        lndAddr: EnvMustBeNonEmptyString("LND_OTHER_ADDR"),
        lndCertPath: EnvMustBeNonEmptyString("LND_OTHER_CERT_PATH"),
        lndMacaroonPath: EnvMustBeNonEmptyString("LND_OTHER_MACAROON_PATH")
    }
}

export const LoadThirdLndSettingsFromEnv = (): LndNodeSettings => {

    return {
        lndAddr: EnvMustBeNonEmptyString("LND_THIRD_ADDR"),
        lndCertPath: EnvMustBeNonEmptyString("LND_THIRD_CERT_PATH"),
        lndMacaroonPath: EnvMustBeNonEmptyString("LND_THIRD_MACAROON_PATH")
    }
}

export const LoadFourthLndSettingsFromEnv = (): LndNodeSettings => {

    return {
        lndAddr: EnvMustBeNonEmptyString("LND_FOURTH_ADDR"),
        lndCertPath: EnvMustBeNonEmptyString("LND_FOURTH_CERT_PATH"),
        lndMacaroonPath: EnvMustBeNonEmptyString("LND_FOURTH_MACAROON_PATH")
    }
}

export const LoadBitcoinCoreSettingsFromEnv = (): BitcoinCoreSettings => {
    return {
        port: EnvMustBeInteger("BITCOIN_CORE_PORT"),
        user: EnvMustBeNonEmptyString("BITCOIN_CORE_USER"),
        pass: EnvMustBeNonEmptyString("BITCOIN_CORE_PASS")
    }
}
