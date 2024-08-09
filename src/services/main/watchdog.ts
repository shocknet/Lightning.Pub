import { EnvCanBeInteger } from "../helpers/envParser.js";
import FunctionQueue from "../helpers/functionQueue.js";
import { getLogger } from "../helpers/logger.js";
import { Utils } from "../helpers/utilsWrapper.js";
import { LiquidityProvider } from "./liquidityProvider.js";
import LND from "../lnd/lnd.js";
import { ChannelBalance } from "../lnd/settings.js";
import Storage from '../storage/index.js'
import { LiquidityManager } from "./liquidityManager.js";
import { RugPullTracker } from "./rugPullTracker.js";
export type WatchdogSettings = {
    maxDiffSats: number
}
export const LoadWatchdogSettingsFromEnv = (test = false): WatchdogSettings => {
    return {
        maxDiffSats: EnvCanBeInteger("WATCHDOG_MAX_DIFF_SATS")
    }
}
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
    settings: WatchdogSettings;
    storage: Storage;
    rugPullTracker: RugPullTracker
    utils: Utils
    latestCheckStart = 0
    log = getLogger({ component: "watchdog" })
    ready = false
    interval: NodeJS.Timer;
    lndPubKey: string;
    constructor(settings: WatchdogSettings, liquidityManager: LiquidityManager, lnd: LND, storage: Storage, utils: Utils, rugPullTracker: RugPullTracker) {
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
        this.log("Starting watchdog")
        this.startedAtUnix = Math.floor(Date.now() / 1000)
        const info = await this.lnd.GetInfo()
        this.lndPubKey = info.identityPubkey
        await this.getTracker()
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        this.utils.stateBundler.AddBalancePoint('usersBalance', totalUsersBalance)
        const { totalExternal, otherExternal } = await this.getAggregatedExternalBalance()
        this.initialLndBalance = totalExternal
        this.initialUsersBalance = totalUsersBalance
        const fwEvents = await this.lnd.GetForwardingHistory(0, this.startedAtUnix)
        this.latestHtlcIndexOffset = fwEvents.lastOffsetIndex
        this.accumulatedHtlcFees = 0
        const paymentFound = await this.storage.paymentStorage.GetMaxPaymentIndex()
        const knownMaxIndex = paymentFound.length > 0 ? Math.max(paymentFound[0].paymentIndex,0) : 0
        this.latestPaymentIndexOffset = await this.lnd.GetLatestPaymentIndex(knownMaxIndex)
        const other = { ilnd: this.initialLndBalance, hf: this.accumulatedHtlcFees, iu: this.initialUsersBalance, tu: totalUsersBalance, oext: otherExternal }
        getLogger({ component: 'watchdog_debug2' })(JSON.stringify({ deltaLnd: 0, deltaUsers: 0, totalExternal, latestIndex: this.latestPaymentIndexOffset, other }))
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

    getAggregatedExternalBalance = async () => {
        const { totalLndBalance, othersFromLnd } = await this.lnd.GetTotalBalace()
        const feesPaidForLiquidity = this.liquidityManager.GetPaidFees()
        const pb = await this.rugPullTracker.CheckProviderBalance()
        const providerBalance = pb.prevBalance || pb.balance
        const otherExternal = { pb: providerBalance, f: feesPaidForLiquidity, lnd: totalLndBalance, olnd: othersFromLnd }
        return { totalExternal: totalLndBalance + providerBalance + feesPaidForLiquidity, otherExternal }
    }

    checkBalanceUpdate = async (deltaLnd: number, deltaUsers: number) => {
        this.utils.stateBundler.AddBalancePoint('deltaExternal', deltaLnd)
        this.utils.stateBundler.AddBalancePoint('deltaUsers', deltaUsers)

        const result = this.checkDeltas(deltaLnd, deltaUsers)
        switch (result.type) {
            case 'mismatch':
                if (deltaLnd < 0) {
                    if (result.absoluteDiff > this.settings.maxDiffSats) {
                        await this.updateDisruption(true, result.absoluteDiff)
                        return true
                    }
                } else {
                    this.log("WARNING! LND balance increased more than users balance with a difference of", result.absoluteDiff, "sats")
                    this.updateDisruption(false, result.absoluteDiff)
                    return false
                }
                break
            case 'negative':
                if (Math.abs(deltaLnd) > Math.abs(deltaUsers)) {
                    if (result.absoluteDiff > this.settings.maxDiffSats) {
                        await this.updateDisruption(true, result.absoluteDiff)
                        return true
                    }
                } else if (deltaLnd === deltaUsers) {
                    await this.updateDisruption(false, 0)
                    return false
                } else {
                    this.log("WARNING! LND balance decreased less than users balance with a difference of", result.absoluteDiff, "sats")
                    await this.updateDisruption(false, result.absoluteDiff)
                    return false
                }
                break
            case 'positive':
                if (deltaLnd < deltaUsers) {
                    this.log("WARNING! LND balance increased less than users balance with a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > this.settings.maxDiffSats) {
                        await this.updateDisruption(true, result.absoluteDiff)
                        return true
                    }
                } else if (deltaLnd === deltaUsers) {
                    await this.updateDisruption(false, 0)
                    return false
                } else {
                    await this.updateDisruption(false, result.absoluteDiff)
                    return false
                }
        }
        return false
    }

    updateDisruption = async (isDisrupted: boolean, absoluteDiff: number) => {
        const tracker = await this.getTracker()
        if (isDisrupted) {
            if (tracker.latest_distruption_at_unix === 0) {
                await this.storage.liquidityStorage.UpdateTrackedProviderDisruption('lnd', this.lndPubKey, Math.floor(Date.now() / 1000))
                getLogger({ component: 'bark' })("detected lnd loss of", absoluteDiff, "sats,", absoluteDiff - this.settings.maxDiffSats, "above the max allowed")
            } else {
                getLogger({ component: 'bark' })("ongoing lnd loss of", absoluteDiff, "sats,", absoluteDiff - this.settings.maxDiffSats, "above the max allowed")
            }
        } else {
            if (tracker.latest_distruption_at_unix !== 0) {
                await this.storage.liquidityStorage.UpdateTrackedProviderDisruption('lnd', this.lndPubKey, 0)
                getLogger({ component: 'bark' })("loss cleared after: ", Math.floor(Date.now() / 1000) - tracker.latest_distruption_at_unix, "seconds")
            } else if (absoluteDiff > 0) {
                this.log("lnd balance increased more than users balance by", absoluteDiff)
            }
        }
    }

    StartCheck = async () => {
        this.latestCheckStart = Date.now()
        await this.updateAccumulatedHtlcFees()
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        this.utils.stateBundler.AddBalancePoint('usersBalance', totalUsersBalance)
        const { totalExternal, otherExternal } = await this.getAggregatedExternalBalance()
        this.utils.stateBundler.AddBalancePoint('accumulatedHtlcFees', this.accumulatedHtlcFees)
        const deltaLnd = totalExternal - (this.initialLndBalance + this.accumulatedHtlcFees)
        const deltaUsers = totalUsersBalance - this.initialUsersBalance
        const paymentFound = await this.storage.paymentStorage.GetMaxPaymentIndex()
        const maxFromDb = paymentFound.length > 0 ? paymentFound[0].paymentIndex : 0
        const knownMaxIndex = Math.max(maxFromDb, this.latestPaymentIndexOffset)
        const newLatest = await this.lnd.GetLatestPaymentIndex(knownMaxIndex)
        const historyMismatch = newLatest > knownMaxIndex
        const other = { ilnd: this.initialLndBalance, hf: this.accumulatedHtlcFees, iu: this.initialUsersBalance, tu: totalUsersBalance, km: knownMaxIndex, nl: newLatest, oext: otherExternal }
        getLogger({ component: 'watchdog_debug2' })(JSON.stringify({ deltaLnd, deltaUsers, totalExternal, other }))
        const deny = await this.checkBalanceUpdate(deltaLnd, deltaUsers)
        if (historyMismatch) {
            this.log("History mismatch detected in absolute update, locking outgoing operations")
            this.lnd.LockOutgoingOperations()
            return
        }
        if (deny) {
            this.log("Balance mismatch detected in absolute update, but history is ok")
        }
        this.lnd.UnlockOutgoingOperations()
    }

    PaymentRequested = async () => {
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