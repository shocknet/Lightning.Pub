import { EnvCacher, EnvMustBeNonEmptyString, EnvMustBeInteger, chooseEnv, chooseEnvBool, chooseEnvInt } from '../helpers/envParser.js'
import os from 'os'
import path from 'path'

export type ServiceFeeSettings = {
    incomingTxFee: number
    outgoingTxFee: number
    outgoingAppInvoiceFee: number
    outgoingAppUserInvoiceFee: number
    outgoingAppUserInvoiceFeeBps: number
    userToUserFee: number
    appToUserFee: number
}

export const LoadServiceFeeSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): ServiceFeeSettings => {
    // Support both old and new env var names for backward compatibility (new name takes precedence)
    // Check if new name exists first (in process.env or dbEnv)
    const newExists = process.env["SERVICE_FEE_BPS"] !== undefined || dbEnv["SERVICE_FEE_BPS"] !== undefined
    let serviceFeeBps: number
    if (newExists) {
        // New name exists, use it
        serviceFeeBps = chooseEnvInt("SERVICE_FEE_BPS", dbEnv, 60, addToDb)
    } else {
        // New name doesn't exist, check old name for backward compatibility
        const oldExists = process.env["OUTGOING_INVOICE_FEE_USER_BPS"] !== undefined || dbEnv["OUTGOING_INVOICE_FEE_USER_BPS"] !== undefined
        if (oldExists) {
            // Old name exists, use it and migrate to new name in DB
            const oldValue = chooseEnvInt("OUTGOING_INVOICE_FEE_USER_BPS", dbEnv, 60) // Don't add old name to DB
            serviceFeeBps = oldValue
            if (addToDb) addToDb("SERVICE_FEE_BPS", oldValue.toString()) // Migrate to new name
        } else {
            // Neither exists, use default with new name
            serviceFeeBps = chooseEnvInt("SERVICE_FEE_BPS", dbEnv, 60, addToDb)
        }
    }
    return {
        incomingTxFee: 0, // Not configurable, always 0
        outgoingTxFee: chooseEnvInt("OUTGOING_CHAIN_FEE_ROOT_BPS", dbEnv, 60, addToDb) / 10000,
        outgoingAppInvoiceFee: chooseEnvInt("OUTGOING_INVOICE_FEE_ROOT_BPS", dbEnv, 60, addToDb) / 10000,
        outgoingAppUserInvoiceFeeBps: serviceFeeBps,
        outgoingAppUserInvoiceFee: serviceFeeBps / 10000,
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
const networks = ['mainnet', 'testnet', 'regtest'] as const
export type BTCNetwork = (typeof networks)[number]
export type LndSettings = {
    lndLogDir: string
    serviceFeeFloor: number
    routingFeeLimitBps: number
    routingFeeFloor: number
    mockLnd: boolean
    network: BTCNetwork
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

const lndDir = () => {
    if (os.platform() === 'darwin') {
        return path.join(os.homedir(), 'Library', 'Application Support', 'Lnd');
    }
    return resolveHome('/.lnd');
}

export const LoadLndNodeSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LndNodeSettings => {
    return {
        lndAddr: chooseEnv('LND_ADDRESS', dbEnv, "127.0.0.1:10009", addToDb),
        lndCertPath: chooseEnv('LND_CERT_PATH', dbEnv, path.join(lndDir(), "tls.cert"), addToDb),
        lndMacaroonPath: chooseEnv('LND_MACAROON_PATH', dbEnv, path.join(lndDir(), "data", "chain", "bitcoin", "mainnet", "admin.macaroon"), addToDb),
    }
}

export const LoadLndSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LndSettings => {
    const network = chooseEnv('BTC_NETWORK', dbEnv, 'mainnet', addToDb) as BTCNetwork
    
    // Routing fee floor: new name takes precedence, fall back to old name for backward compatibility
    const routingFeeFloorNewExists = process.env['ROUTING_FEE_FLOOR_SATS'] !== undefined || dbEnv['ROUTING_FEE_FLOOR_SATS'] !== undefined
    let routingFeeFloor: number
    if (routingFeeFloorNewExists) {
        routingFeeFloor = chooseEnvInt('ROUTING_FEE_FLOOR_SATS', dbEnv, 5, addToDb)
    } else {
        const routingFeeFloorOldExists = process.env['OUTBOUND_MAX_FEE_EXTRA_SATS'] !== undefined || dbEnv['OUTBOUND_MAX_FEE_EXTRA_SATS'] !== undefined
        if (routingFeeFloorOldExists) {
            const oldValue = chooseEnvInt('OUTBOUND_MAX_FEE_EXTRA_SATS', dbEnv, 5) // Don't add old name to DB
            routingFeeFloor = oldValue
            if (addToDb) addToDb('ROUTING_FEE_FLOOR_SATS', oldValue.toString()) // Migrate to new name
        } else {
            routingFeeFloor = chooseEnvInt('ROUTING_FEE_FLOOR_SATS', dbEnv, 5, addToDb)
        }
    }
    
    // Service fee floor: new name takes precedence, fall back to old name for backward compatibility
    const serviceFeeFloorNewExists = process.env['SERVICE_FEE_FLOOR_SATS'] !== undefined || dbEnv['SERVICE_FEE_FLOOR_SATS'] !== undefined
    let serviceFeeFloor: number
    if (serviceFeeFloorNewExists) {
        serviceFeeFloor = chooseEnvInt('SERVICE_FEE_FLOOR_SATS', dbEnv, 10, addToDb)
    } else {
        const serviceFeeFloorOldExists = process.env['OUTBOUND_MAX_FEE_EXTRA_SATS'] !== undefined || dbEnv['OUTBOUND_MAX_FEE_EXTRA_SATS'] !== undefined
        if (serviceFeeFloorOldExists) {
            const oldValue = chooseEnvInt('OUTBOUND_MAX_FEE_EXTRA_SATS', dbEnv, 10) // Don't add old name to DB
            serviceFeeFloor = oldValue
            if (addToDb) addToDb('SERVICE_FEE_FLOOR_SATS', oldValue.toString()) // Migrate to new name
        } else {
            serviceFeeFloor = chooseEnvInt('SERVICE_FEE_FLOOR_SATS', dbEnv, 10, addToDb)
        }
    }
    const routingFeeLimitBps = chooseEnvInt('ROUTING_FEE_LIMIT_BPS', dbEnv, 50, addToDb)
    return {
        lndLogDir: chooseEnv('LND_LOG_DIR', dbEnv, resolveHome("/.lnd/logs/bitcoin/mainnet/lnd.log"), addToDb),
        serviceFeeFloor,
        routingFeeLimitBps,
        routingFeeFloor,
        mockLnd: false,
        network: networks.includes(network) ? network : 'mainnet'
    }
}

export type NostrRelaySettings = {
    relays: string[],
    maxEventContentLength: number
}

export const LoadNostrRelaySettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): NostrRelaySettings => {
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
    providerRelayUrl: string
}
export const LoadLiquiditySettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): LiquiditySettings => {
    //const liquidityProviderPub = process.env.LIQUIDITY_PROVIDER_PUB === "null" ? "" : (process.env.LIQUIDITY_PROVIDER_PUB || "76ed45f00cea7bac59d8d0b7d204848f5319d7b96c140ffb6fcbaaab0a13d44e")
    const liquidityProviderPub = chooseEnv("LIQUIDITY_PROVIDER_PUB", dbEnv, "76ed45f00cea7bac59d8d0b7d204848f5319d7b96c140ffb6fcbaaab0a13d44e", addToDb)
    const disableLiquidityProvider = chooseEnvBool("DISABLE_LIQUIDITY_PROVIDER", dbEnv, false, addToDb) || liquidityProviderPub === "null"
    const useOnlyLiquidityProvider = chooseEnvBool("USE_ONLY_LIQUIDITY_PROVIDER", dbEnv, false, addToDb)
    const providerRelayUrl = chooseEnv("PROVIDER_RELAY_URL", dbEnv, "", addToDb)
    return { liquidityProviderPub, useOnlyLiquidityProvider, disableLiquidityProvider, providerRelayUrl }
}

export type SwapsSettings = {
    boltzHttpUrl: string
    boltzWebSocketUrl: string
    enableSwaps: boolean
}

export const LoadSwapsSettingsFromEnv = (dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): SwapsSettings => {
    return {
        boltzHttpUrl: chooseEnv("BOLTZ_HTTP_URL", dbEnv, "http://127.0.0.1:9001", addToDb),
        boltzWebSocketUrl: chooseEnv("BOLTZ_WEBSOCKET_URL", dbEnv, "ws://127.0.0.1:9004", addToDb),
        enableSwaps: chooseEnvBool("ENABLE_SWAPS", dbEnv, false, addToDb)
    }
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
