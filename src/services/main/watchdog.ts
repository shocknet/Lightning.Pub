import FunctionQueue from "../helpers/functionQueue.js";
import { getLogger } from "../helpers/logger.js";
import { Utils } from "../helpers/utilsWrapper.js";
import { LiquidityProvider } from "./liquidityProvider.js";
import LND from "../lnd/lnd.js";
import { ChannelBalance } from "../lnd/settings.js";
import Storage from '../storage/index.js'
import { LiquidityManager } from "./liquidityManager.js";
import { RugPullTracker } from "./rugPullTracker.js";
import SettingsManager from "./settingsManager.js";

export class Watchdog {
    queue: FunctionQueue<void>
    initialLndBalance: number;
    initialUsersBalance: number;
    startedAtUnix: number;
    latestHtlcIndexOffset: number;
    accumulatedHtlcFees: number;
    latestPaymentIndexOffset: number;
    lnd: LND;
    liquidProvider: LiquidityProvider;
    liquidityManager: LiquidityManager;
    settings: SettingsManager;
    storage: Storage;
    rugPullTracker: RugPullTracker
    utils: Utils
    latestCheckStart = 0
    log = getLogger({ component: "watchdog" })
    ready = false
    interval: NodeJS.Timer;
    lndPubKey: string;
    lastHandlerRootOpsAtUnix = 0
    constructor(settings: SettingsManager, liquidityManager: LiquidityManager, lnd: LND, storage: Storage, utils: Utils, rugPullTracker: RugPullTracker) {
        this.lnd = lnd;
        this.settings = settings;
        this.storage = storage;
        this.liquidProvider = lnd.liquidProvider
        this.liquidityManager = liquidityManager
        this.utils = utils
        this.rugPullTracker = rugPullTracker
        this.queue = new FunctionQueue("watchdog_queue", () => this.StartCheck())
    }

    Stop() {
        if (this.interval) {
            clearInterval(this.interval)
        }
    }
    Start = async () => {
        try {
            await this.StartWatching()
        } catch (err: any) {
            this.log("Failed to start watchdog", err.message || err)
            throw err
        }
    }
    StartWatching = async () => {
        // Skip watchdog if using only liquidity provider
        if (this.liquidProvider.getSettings().useOnlyLiquidityProvider) {
            this.log("USE_ONLY_LIQUIDITY_PROVIDER enabled, skipping watchdog")
            this.ready = true
            return
        }
        this.log("Starting watchdog")
        this.startedAtUnix = Math.floor(Date.now() / 1000)
        const info = await this.lnd.GetInfo()
        this.lndPubKey = info.identityPubkey
        await this.getTracker()
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        this.utils.stateBundler.AddBalancePoint('usersBalance', totalUsersBalance)
        const { totalExternal } = await this.getAggregatedExternalBalance()
        this.initialLndBalance = totalExternal
        this.initialUsersBalance = totalUsersBalance
        const fwEvents = await this.lnd.GetForwardingHistory(0, this.startedAtUnix)
        this.latestHtlcIndexOffset = fwEvents.lastOffsetIndex
        this.accumulatedHtlcFees = 0
        const paymentFound = await this.storage.paymentStorage.GetMaxPaymentIndex()
        const knownMaxIndex = paymentFound.length > 0 ? Math.max(paymentFound[0].paymentIndex, 0) : 0
        this.latestPaymentIndexOffset = await this.lnd.GetLatestPaymentIndex(knownMaxIndex)
        this.interval = setInterval(() => {
            if (this.latestCheckStart + (1000 * 58) < Date.now()) {
                this.PaymentRequested()
            }
        }, 1000 * 60)

        this.ready = true
    }

    updateAccumulatedHtlcFees = async () => {
        const fwEvents = await this.lnd.GetForwardingHistory(this.latestHtlcIndexOffset, this.startedAtUnix)
        this.latestHtlcIndexOffset = fwEvents.lastOffsetIndex
        fwEvents.forwardingEvents.forEach((event) => {
            this.accumulatedHtlcFees += Number(event.fee)
        })
    }

    handleRootOperations = async () => {
        let pendingChange = 0
        const pendingChainPayments = await this.storage.metricsStorage.GetPendingChainPayments()
        for (const payment of pendingChainPayments) {
            try {
                const tx = await this.lnd.GetTx(payment.operation_identifier)
                if (tx.numConfirmations > 0) {
                    await this.storage.metricsStorage.SetRootOpConfirmed(payment.serial_id)
                    continue
                }
                tx.outputDetails.forEach(o => pendingChange += o.isOurAddress ? Number(o.amount) : 0)
            } catch (err: any) {
                this.log("Error getting tx for root operation", err.message || err)
            }

        }
        let newReceived = 0
        let newSpent = 0
        if (this.lastHandlerRootOpsAtUnix === 0) {
            this.lastHandlerRootOpsAtUnix = Math.floor(Date.now() / 1000)
            return { newReceived, newSpent, pendingChange }
        }

        const newOps = await this.storage.metricsStorage.GetRootOperations({ from: this.lastHandlerRootOpsAtUnix })
        newOps.forEach(o => {
            switch (o.operation_type) {
                case 'chain_payment':
                    newSpent += Number(o.operation_amount)
                    break
                case 'invoice_payment':
                    newSpent += Number(o.operation_amount)
                    break
                case 'chain':
                    newReceived += Number(o.operation_amount)
                    break
                case 'invoice':
                    newReceived += Number(o.operation_amount)
                    break
            }
        })
        return { newReceived, newSpent, pendingChange }
    }

    getAggregatedExternalBalance = async () => {
        const { totalLndBalance, othersFromLnd } = await this.lnd.GetTotalBalace()
        const feesPaidForLiquidity = this.liquidityManager.GetPaidFees()
        const pb = await this.rugPullTracker.CheckProviderBalance()
        const providerBalance = pb.prevBalance || pb.balance
        const { newReceived, newSpent, pendingChange } = await this.handleRootOperations()
        const opsTotal = newReceived + pendingChange - newSpent
        return { totalExternal: totalLndBalance + providerBalance + feesPaidForLiquidity + opsTotal }
    }

    checkBalanceUpdate = async (deltaLnd: number, deltaUsers: number) => {
        this.utils.stateBundler.AddBalancePoint('deltaExternal', deltaLnd)
        this.utils.stateBundler.AddBalancePoint('deltaUsers', deltaUsers)
        const lndWithDeltaUsers = this.initialLndBalance + deltaUsers
        const result = this.checkDeltas(deltaLnd, deltaUsers)
        switch (result.type) {
            case 'mismatch':
                if (deltaLnd < 0) {
                    if (result.absoluteDiff > this.settings.getSettings().watchDogSettings.maxDiffSats) {
                        await this.updateDisruption(true, result.absoluteDiff, lndWithDeltaUsers)
                        return true
                    }
                } else {
                    this.log("WARNING! LND balance increased more than users balance with a difference of", result.absoluteDiff, "sats")
                    this.updateDisruption(false, result.absoluteDiff, lndWithDeltaUsers)
                    return false
                }
                break
            case 'negative':
                if (Math.abs(deltaLnd) > Math.abs(deltaUsers)) {
                    if (result.absoluteDiff > this.settings.getSettings().watchDogSettings.maxDiffSats) {
                        await this.updateDisruption(true, result.absoluteDiff, lndWithDeltaUsers)
                        return true
                    }
                } else if (deltaLnd === deltaUsers) {
                    await this.updateDisruption(false, 0, lndWithDeltaUsers)
                    return false
                } else {
                    this.log("WARNING! LND balance decreased less than users balance with a difference of", result.absoluteDiff, "sats")
                    await this.updateDisruption(false, result.absoluteDiff, lndWithDeltaUsers)
                    return false
                }
                break
            case 'positive':
                if (deltaLnd < deltaUsers) {
                    this.log("WARNING! LND balance increased less than users balance with a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > this.settings.getSettings().watchDogSettings.maxDiffSats) {
                        await this.updateDisruption(true, result.absoluteDiff, lndWithDeltaUsers)
                        return true
                    }
                } else if (deltaLnd === deltaUsers) {
                    await this.updateDisruption(false, 0, lndWithDeltaUsers)
                    return false
                } else {
                    await this.updateDisruption(false, result.absoluteDiff, lndWithDeltaUsers)
                    return false
                }
        }
        return false
    }

    updateDisruption = async (isDisrupted: boolean, absoluteDiff: number, lndWithDeltaUsers: number) => {
        const tracker = await this.getTracker()
        this.storage.liquidityStorage.UpdateTrackedProviderBalance('lnd', this.lndPubKey, lndWithDeltaUsers)
        const maxDiffSats = this.settings.getSettings().watchDogSettings.maxDiffSats
        if (isDisrupted) {
            if (tracker.latest_distruption_at_unix === 0) {
                await this.storage.liquidityStorage.UpdateTrackedProviderDisruption('lnd', this.lndPubKey, Math.floor(Date.now() / 1000))
                this.log("detected lnd loss of", absoluteDiff, "sats,", absoluteDiff - maxDiffSats, "above the max allowed")
            } else {
                this.log("ongoing lnd loss of", absoluteDiff, "sats,", absoluteDiff - maxDiffSats, "above the max allowed")
            }
        } else {
            if (tracker.latest_distruption_at_unix !== 0) {
                await this.storage.liquidityStorage.UpdateTrackedProviderDisruption('lnd', this.lndPubKey, 0)
                this.log("loss cleared after: ", Math.floor(Date.now() / 1000) - tracker.latest_distruption_at_unix, "seconds")
            } else if (absoluteDiff > 0) {
                this.log("lnd balance increased more than users balance by", absoluteDiff)
            }
        }
    }

    StartCheck = async () => {
        this.latestCheckStart = Date.now()
        try {
            await this.updateAccumulatedHtlcFees()
        } catch (err: any) {
            this.log("Error updating accumulated htlc fees", err.message || err)
            return
        }
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        this.utils.stateBundler.AddBalancePoint('usersBalance', totalUsersBalance)
        const { totalExternal } = await this.getAggregatedExternalBalance()
        this.utils.stateBundler.AddBalancePoint('accumulatedHtlcFees', this.accumulatedHtlcFees)
        const deltaLnd = totalExternal - (this.initialLndBalance + this.accumulatedHtlcFees)
        const deltaUsers = totalUsersBalance - this.initialUsersBalance
        const paymentFound = await this.storage.paymentStorage.GetMaxPaymentIndex()
        const maxFromDb = paymentFound.length > 0 ? paymentFound[0].paymentIndex : 0
        const knownMaxIndex = Math.max(maxFromDb, this.latestPaymentIndexOffset)
        const newLatest = await this.lnd.GetLatestPaymentIndex(knownMaxIndex)
        const historyMismatch = newLatest > knownMaxIndex
        const deny = await this.checkBalanceUpdate(deltaLnd, deltaUsers)
        if (historyMismatch) {
            getLogger({ component: 'bark' })("History mismatch detected in absolute update, locking outgoing operations")
            this.lnd.LockOutgoingOperations()
            return
        }
        if (deny) {
            this.log("Balance mismatch detected in absolute update, but history is ok")
        }
        this.lnd.UnlockOutgoingOperations()
    }

    PaymentRequested = async () => {
        // Skip watchdog check when bypass is enabled
        if (this.liquidProvider.getSettings().useOnlyLiquidityProvider) {
            return
        }
        if (!this.ready) {
            throw new Error("Watchdog not ready")
        }
        return new Promise<void>((res, rej) => {
            this.queue.Run({ res, rej })
        })
    }

    checkDeltas = (deltaLnd: number, deltaUsers: number): DeltaCheckResult => {
        if (deltaLnd < 0) {
            if (deltaUsers < 0) {
                const diff = Math.abs(deltaLnd - deltaUsers)
                return { type: 'negative', absoluteDiff: diff, relativeDiff: diff / Math.max(deltaLnd, deltaUsers) }
            } else {
                const diff = Math.abs(deltaLnd) + deltaUsers
                return { type: 'mismatch', absoluteDiff: diff }
            }
        } else {
            if (deltaUsers < 0) {
                const diff = deltaLnd + Math.abs(deltaUsers)
                return { type: 'mismatch', absoluteDiff: diff }
            } else {
                const diff = Math.abs(deltaLnd - deltaUsers)
                return { type: 'positive', absoluteDiff: diff, relativeDiff: diff / Math.max(deltaLnd, deltaUsers) }
            }
        }
    }

    getTracker = async () => {
        const tracker = await this.storage.liquidityStorage.GetTrackedProvider('lnd', this.lndPubKey)
        if (!tracker) {
            return this.storage.liquidityStorage.CreateTrackedProvider('lnd', this.lndPubKey, 0)
        }
        return tracker
    }
}
type DeltaCheckResult = { type: 'negative' | 'positive', absoluteDiff: number, relativeDiff: number } | { type: 'mismatch', absoluteDiff: number }