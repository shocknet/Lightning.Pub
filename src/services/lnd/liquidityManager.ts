import { getLogger } from "../helpers/logger.js"
import { LiquidityProvider } from "./liquidityProvider.js"
import LND from "./lnd.js"
import { FlashsatsLSP, LoadLSPSettingsFromEnv, LSPSettings, OlympusLSP, VoltageLSP } from "./lsp.js"
export type LiquiditySettings = {
    lspSettings: LSPSettings
    liquidityProviderPub: string
    useOnlyLiquidityProvider: boolean
}
export const LoadLiquiditySettingsFromEnv = (): LiquiditySettings => {
    const lspSettings = LoadLSPSettingsFromEnv()
    const liquidityProviderPub = process.env.LIQUIDITY_PROVIDER_PUB || ""
    return { lspSettings, liquidityProviderPub, useOnlyLiquidityProvider: false }
}
export class LiquidityManager {
    settings: LiquiditySettings
    liquidityProvider: LiquidityProvider
    lnd: LND
    olympusLSP: OlympusLSP
    voltageLSP: VoltageLSP
    flashsatsLSP: FlashsatsLSP
    log = getLogger({ component: "liquidityManager" })
    channelRequested = false
    constructor(settings: LiquiditySettings, liquidityProvider: LiquidityProvider, lnd: LND) {
        this.settings = settings
        this.liquidityProvider = liquidityProvider
        this.lnd = lnd
        this.olympusLSP = new OlympusLSP(settings.lspSettings, lnd, liquidityProvider)
        this.voltageLSP = new VoltageLSP(settings.lspSettings, lnd, liquidityProvider)
        this.flashsatsLSP = new FlashsatsLSP(settings.lspSettings, lnd, liquidityProvider)
    }
    beforeInvoiceCreation = async () => { }
    afterInInvoicePaid = async () => {
        if (this.channelRequested) {
            return
        }
        const olympusOk = await this.olympusLSP.openChannelIfReady()
        if (olympusOk) {
            this.log("requested channel from olympus")
            this.channelRequested = true
            return
        }
        const voltageOk = await this.voltageLSP.openChannelIfReady()
        if (voltageOk) {
            this.log("requested channel from voltage")
            this.channelRequested = true
            return
        }

        const flashsatsOk = await this.flashsatsLSP.openChannelIfReady()
        if (flashsatsOk) {
            this.log("requested channel from flashsats")
            this.channelRequested = true
            return
        }
        this.log("no channel requested")
    }

    beforeOutInvoicePayment = async () => { }
    afterOutInvoicePaid = async () => { }
}