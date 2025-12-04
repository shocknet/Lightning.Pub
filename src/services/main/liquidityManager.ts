import { getLogger } from "../helpers/logger.js"
import { Utils } from "../helpers/utilsWrapper.js"
import { LiquidityProvider } from "./liquidityProvider.js"
import LND from "../lnd/lnd.js"
import { FlashsatsLSP, OlympusLSP, /* VoltageLSP */ } from "../lnd/lsp.js"
import Storage from '../storage/index.js'
import { defaultInvoiceExpiry } from "../storage/paymentStorage.js"
import { RugPullTracker } from "./rugPullTracker.js"
import SettingsManager from "./settingsManager.js"

export class LiquidityManager {
    settings: SettingsManager
    storage: Storage
    liquidityProvider: LiquidityProvider
    rugPullTracker: RugPullTracker
    lnd: LND
    olympusLSP: OlympusLSP
    /* voltageLSP: VoltageLSP */
    flashsatsLSP: FlashsatsLSP
    log = getLogger({ component: "liquidityManager" })
    channelRequested = false
    channelRequesting = false
    feesPaid = 0
    utils: Utils
    latestDrain: ({ success: true, amt: number } | { success: false, amt: number, attempt: number, at: Date }) = { success: true, amt: 0 }
    drainsSkipped = 0
    constructor(settings: SettingsManager, storage: Storage, utils: Utils, liquidityProvider: LiquidityProvider, lnd: LND, rugPullTracker: RugPullTracker) {
        this.settings = settings
        this.storage = storage
        this.liquidityProvider = liquidityProvider
        this.lnd = lnd
        this.rugPullTracker = rugPullTracker
        this.utils = utils
        this.olympusLSP = new OlympusLSP(settings, lnd, liquidityProvider)
        /* this.voltageLSP = new VoltageLSP(settings.lspSettings, lnd, liquidityProvider) */
        this.flashsatsLSP = new FlashsatsLSP(settings, lnd, liquidityProvider)
    }

    GetPaidFees = () => {
        this.utils.stateBundler.AddBalancePoint('feesPaidForLiquidity', this.feesPaid)
        return this.feesPaid
    }

    onNewBlock = async () => {
        try {
            await this.shouldDrainProvider()
        } catch (err: any) {
            this.log("error in onNewBlock", err.message || err)
        }
    }

    beforeInvoiceCreation = async (amount: number): Promise<'lnd' | 'provider'> => {
        const providerReady = this.liquidityProvider.IsReady()
        if (this.settings.getSettings().liquiditySettings.useOnlyLiquidityProvider) {
            if (!providerReady) {
                throw new Error("cannot use liquidity provider, it is not ready")
            }
            return 'provider'
        }

        if (this.rugPullTracker.HasProviderRugPulled()) {
            return 'lnd'
        }

        const { remote } = await this.lnd.ChannelBalance()
        if (remote > amount) {
            return 'lnd'
        }
        const providerCanHandle = this.liquidityProvider.IsReady()
        if (!providerCanHandle) {
            return 'lnd'
        }
        return 'provider'
    }

    afterInInvoicePaid = async () => {
        try {
            await this.orderChannelIfNeeded()
        } catch (e: any) {
            this.log("error ordering channel", e)
        }
    }

    beforeOutInvoicePayment = async (amount: number, localServiceFee: number): Promise<'lnd' | 'provider'> => {
        const providerReady = this.liquidityProvider.IsReady()
        if (this.settings.getSettings().liquiditySettings.useOnlyLiquidityProvider) {
            if (!providerReady) {
                throw new Error("cannot use liquidity provider, it is not ready")
            }
            return 'provider'
        }
        if (!providerReady) {
            return 'lnd'
        }
        const canHandle = await this.liquidityProvider.CanProviderPay(amount, localServiceFee)
        if (!canHandle) {
            return 'lnd'
        }
        return 'provider'
    }

    afterOutInvoicePaid = async () => { }

    shouldDrainProvider = async () => {
        const maxW = await this.liquidityProvider.GetMaxWithdrawable()
        const { remote } = await this.lnd.ChannelBalance()
        const drainable = Math.min(maxW, remote)
        if (drainable < 500) {
            return
        }
        if (this.latestDrain.success) {
            if (this.latestDrain.amt === 0) {
                await this.drainProvider(drainable)
            } else {
                await this.drainProvider(Math.min(drainable, this.latestDrain.amt * 2))
            }
        } else if (this.latestDrain.attempt * 10 < this.drainsSkipped) {
            const drain = Math.min(drainable, Math.ceil(this.latestDrain.amt / 2))
            this.drainsSkipped = 0
            if (drain < 500) {
                this.log("drain attempt went below 500 sats, will start again")
                this.updateLatestDrain(true, 0)
            } else {
                await this.drainProvider(drain)
            }
        } else {
            this.drainsSkipped += 1
        }
    }

    drainProvider = async (amt: number) => {
        try {
            const invoice = await this.lnd.NewInvoice(amt, "liqudity provider drain", defaultInvoiceExpiry, { from: 'system', useProvider: false })
            const res = await this.liquidityProvider.PayInvoice(invoice.payRequest, amt, 'system')
            const fees = res.service_fee
            this.feesPaid += fees
            this.updateLatestDrain(true, amt)
        } catch (err: any) {
            this.log("error draining provider balance", err.message || err)
            this.updateLatestDrain(false, amt)
        }
    }

    updateLatestDrain = (success: boolean, amt: number) => {
        if (this.latestDrain.success) {
            if (success) {
                this.latestDrain = { success: true, amt }
            } else {
                this.latestDrain = { success: false, amt, attempt: 1, at: new Date() }
            }
        } else {
            if (success) {
                this.latestDrain = { success: true, amt }
            } else {
                this.latestDrain = { success: false, amt, attempt: this.latestDrain.attempt + 1, at: new Date() }
            }
        }
    }


    shouldOpenChannel = async (): Promise<{ shouldOpen: false } | { shouldOpen: true, maxSpendable: number }> => {
        const threshold = this.settings.getSettings().lspSettings.channelThreshold
        if (threshold === 0) {
            return { shouldOpen: false }
        }
        const { remote } = await this.lnd.ChannelBalance()
        if (remote > threshold) {
            return { shouldOpen: false }
        }
        const pendingChannels = await this.lnd.ListPendingChannels()
        if (pendingChannels.pendingOpenChannels.length > 0) {
            return { shouldOpen: false }
        }
        const maxW = await this.liquidityProvider.GetMaxWithdrawable()
        if (maxW < threshold) {
            return { shouldOpen: false }
        }
        return { shouldOpen: true, maxSpendable: maxW }
    }

    orderChannelIfNeeded = async () => {
        const existingOrder = await this.storage.liquidityStorage.GetLatestLspOrder()
        if (existingOrder && existingOrder.created_at > new Date(Date.now() - 20 * 60 * 1000)) {
            this.log("most recent lsp order is less than 20 minutes old")
            return
        }
        const shouldOpen = await this.shouldOpenChannel()
        if (!shouldOpen.shouldOpen) {
            return
        }
        if (this.channelRequested || this.channelRequesting) {
            return
        }
        this.channelRequesting = true
        this.log("requesting channel from lsp")
        const olympusOk = await this.olympusLSP.requestChannel(shouldOpen.maxSpendable)
        if (olympusOk) {
            this.log("requested channel from olympus")
            this.channelRequested = true
            this.channelRequesting = false
            this.feesPaid += olympusOk.fees
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'olympus', invoice: olympusOk.invoice, total_paid: olympusOk.totalSats, order_id: olympusOk.orderId, fees: olympusOk.fees })
            return
        }
        /* const voltageOk = await this.voltageLSP.requestChannel(shouldOpen.maxSpendable)
        if (voltageOk) {
            this.log("requested channel from voltage")
            this.channelRequested = true
            this.channelRequesting = false
            this.feesPaid += voltageOk.fees
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'voltage', invoice: voltageOk.invoice, total_paid: voltageOk.totalSats, order_id: voltageOk.orderId, fees: voltageOk.fees })
            return
        } */

        const flashsatsOk = await this.flashsatsLSP.requestChannel(shouldOpen.maxSpendable)
        if (flashsatsOk) {
            this.log("requested channel from flashsats")
            this.channelRequested = true
            this.channelRequesting = false
            this.feesPaid += flashsatsOk.fees
            await this.storage.liquidityStorage.SaveLspOrder({ service_name: 'flashsats', invoice: flashsatsOk.invoice, total_paid: flashsatsOk.totalSats, order_id: flashsatsOk.orderId, fees: flashsatsOk.fees })
            return
        }
        this.channelRequesting = false
        this.log("no channel requested")
    }
}