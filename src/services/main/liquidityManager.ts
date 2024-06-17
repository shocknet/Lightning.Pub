import { getLogger } from "../helpers/logger.js"
import { LiquidityProvider } from "../lnd/liquidityProvider.js"
import LND from "../lnd/lnd.js"
import { FlashsatsLSP, LoadLSPSettingsFromEnv, LSPSettings, OlympusLSP, VoltageLSP } from "../lnd/lsp.js"
import Storage from '../storage/index.js'
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
    storage: Storage
    liquidityProvider: LiquidityProvider
    lnd: LND
    olympusLSP: OlympusLSP
    voltageLSP: VoltageLSP
    flashsatsLSP: FlashsatsLSP
    log = getLogger({ component: "liquidityManager" })
    channelRequested = false
    constructor(settings: LiquiditySettings, storage: Storage, liquidityProvider: LiquidityProvider, lnd: LND) {
        this.settings = settings
        this.storage = storage
        this.liquidityProvider = liquidityProvider
        this.lnd = lnd
        this.olympusLSP = new OlympusLSP(settings.lspSettings, lnd, liquidityProvider)
        this.voltageLSP = new VoltageLSP(settings.lspSettings, lnd, liquidityProvider)
        this.flashsatsLSP = new FlashsatsLSP(settings.lspSettings, lnd, liquidityProvider)
    }
    beforeInvoiceCreation = async () => { }
    afterInInvoicePaid = async () => {
        const existingOrder = await this.storage.liquidityStorage.GetLatestLspOrder()
        if (existingOrder) {
            return
        }
        if (this.channelRequested) {
            return
        }
        this.log("checking if channel should be requested")
        const olympusOk = await this.olympusLSP.openChannelIfReady()
        if (olympusOk) {
            this.log("requested channel from olympus")
            this.channelRequested = true
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'olympus', invoice: olympusOk.invoice, total_paid: olympusOk.totalSats, order_id: olympusOk.orderId, fees: olympusOk.fees })
            return
        }
        const voltageOk = await this.voltageLSP.openChannelIfReady()
        if (voltageOk) {
            this.log("requested channel from voltage")
            this.channelRequested = true
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'voltage', invoice: voltageOk.invoice, total_paid: voltageOk.totalSats, order_id: voltageOk.orderId, fees: voltageOk.fees })
            return
        }

        const flashsatsOk = await this.flashsatsLSP.openChannelIfReady()
        if (flashsatsOk) {
            this.log("requested channel from flashsats")
            this.channelRequested = true
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'flashsats', invoice: flashsatsOk.invoice, total_paid: flashsatsOk.totalSats, order_id: flashsatsOk.orderId, fees: flashsatsOk.fees })
            return
        }
        this.log("no channel requested")
    }

    beforeOutInvoicePayment = async () => { }
    afterOutInvoicePaid = async () => { }
}