import { getLogger } from "../helpers/logger.js"
import { LiquidityProvider } from "../lnd/liquidityProvider.js"
import LND from "../lnd/lnd.js"
import { FlashsatsLSP, LoadLSPSettingsFromEnv, LSPSettings, OlympusLSP, VoltageLSP } from "../lnd/lsp.js"
import Storage from '../storage/index.js'
import { defaultInvoiceExpiry } from "../storage/paymentStorage.js"
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
    channelRequesting = false
    constructor(settings: LiquiditySettings, storage: Storage, liquidityProvider: LiquidityProvider, lnd: LND) {
        this.settings = settings
        this.storage = storage
        this.liquidityProvider = liquidityProvider
        this.lnd = lnd
        this.olympusLSP = new OlympusLSP(settings.lspSettings, lnd, liquidityProvider)
        this.voltageLSP = new VoltageLSP(settings.lspSettings, lnd, liquidityProvider)
        this.flashsatsLSP = new FlashsatsLSP(settings.lspSettings, lnd, liquidityProvider)
    }
    onNewBlock = async () => {
        const balance = await this.liquidityProvider.GetLatestMaxWithdrawable()
        const { remote } = await this.lnd.ChannelBalance()
        if (remote > balance && balance > 0) {
            this.log("draining provider balance to channel")
            const invoice = await this.lnd.NewInvoice(balance, "liqudity provider drain", defaultInvoiceExpiry)
            const res = await this.liquidityProvider.PayInvoice(invoice.payRequest)
            this.log("drained provider balance to channel", res.amount_paid)
        }
    }

    beforeInvoiceCreation = async (amount: number): Promise<'lnd' | 'provider'> => {
        const { remote } = await this.lnd.ChannelBalance()
        if (remote > amount) {
            this.log("channel has enough balance for invoice")
            return 'lnd'
        }
        this.log("channel does not have enough balance for invoice,suggesting provider")
        return 'provider'
    }
    afterInInvoicePaid = async () => {
        const existingOrder = await this.storage.liquidityStorage.GetLatestLspOrder()
        if (existingOrder) {
            return
        }
        if (this.channelRequested || this.channelRequesting) {
            return
        }
        this.channelRequesting = true
        this.log("checking if channel should be requested")
        const olympusOk = await this.olympusLSP.openChannelIfReady()
        if (olympusOk) {
            this.log("requested channel from olympus")
            this.channelRequested = true
            this.channelRequesting = false
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'olympus', invoice: olympusOk.invoice, total_paid: olympusOk.totalSats, order_id: olympusOk.orderId, fees: olympusOk.fees })
            return
        }
        const voltageOk = await this.voltageLSP.openChannelIfReady()
        if (voltageOk) {
            this.log("requested channel from voltage")
            this.channelRequested = true
            this.channelRequesting = false
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'voltage', invoice: voltageOk.invoice, total_paid: voltageOk.totalSats, order_id: voltageOk.orderId, fees: voltageOk.fees })
            return
        }

        const flashsatsOk = await this.flashsatsLSP.openChannelIfReady()
        if (flashsatsOk) {
            this.log("requested channel from flashsats")
            this.channelRequested = true
            this.channelRequesting = false
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'flashsats', invoice: flashsatsOk.invoice, total_paid: flashsatsOk.totalSats, order_id: flashsatsOk.orderId, fees: flashsatsOk.fees })
            return
        }
        this.channelRequesting = false
        this.log("no channel requested")
    }

    beforeOutInvoicePayment = async (amount: number): Promise<'lnd' | 'provider'> => {
        const balance = await this.liquidityProvider.GetLatestMaxWithdrawable(true)
        if (balance > amount) {
            this.log("provider has enough balance for payment")
            return 'provider'
        }
        this.log("provider does not have enough balance for payment, suggesting lnd")
        return 'lnd'
    }
    afterOutInvoicePaid = async () => { }
}