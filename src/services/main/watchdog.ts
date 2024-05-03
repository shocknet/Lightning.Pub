import { EnvCanBeInteger } from "../helpers/envParser.js";
import FunctionQueue from "../helpers/functionQueue.js";
import { getLogger } from "../helpers/logger.js";
import LND from "../lnd/lnd.js";
import { ChannelBalance } from "../lnd/settings.js";
import Storage from '../storage/index.js'
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
    latestIndexOffset: number;
    accumulatedHtlcFees: number;
    lnd: LND;
    settings: WatchdogSettings;
    storage: Storage;
    latestCheckStart = 0
    log = getLogger({ appName: "watchdog" })
    ready = false
    interval: NodeJS.Timer;
    constructor(settings: WatchdogSettings, lnd: LND, storage: Storage) {
        this.lnd = lnd;
        this.settings = settings;
        this.storage = storage;
        this.queue = new FunctionQueue("watchdog::queue", () => this.StartCheck())
    }

    Stop() {
        if (this.interval) {
            clearInterval(this.interval)
        }
    }

    Start = async () => {
        this.startedAtUnix = Math.floor(Date.now() / 1000)
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        this.initialLndBalance = await this.getTotalLndBalance(totalUsersBalance)
        this.initialUsersBalance = totalUsersBalance
        const fwEvents = await this.lnd.GetForwardingHistory(0, this.startedAtUnix)
        this.latestIndexOffset = fwEvents.lastOffsetIndex
        this.accumulatedHtlcFees = 0

        this.interval = setInterval(() => {
            if (this.latestCheckStart + (1000 * 60) < Date.now()) {
                this.log("No balance check was made in the last minute, checking now")
                this.PaymentRequested()
            }
        }, 1000 * 60)

        this.ready = true
    }

    updateAccumulatedHtlcFees = async () => {
        const fwEvents = await this.lnd.GetForwardingHistory(this.latestIndexOffset, this.startedAtUnix)
        this.latestIndexOffset = fwEvents.lastOffsetIndex
        fwEvents.forwardingEvents.forEach((event) => {
            this.accumulatedHtlcFees += Number(event.fee)
        })

    }



    getTotalLndBalance = async (usersTotal: number) => {
        const walletBalance = await this.lnd.GetWalletBalance()
        this.log(Number(walletBalance.confirmedBalance), "sats in chain wallet")
        const channelsBalance = await this.lnd.GetChannelBalance()
        getLogger({ appName: "debugLndBalancev3" })({ w: walletBalance, c: channelsBalance, u: usersTotal, f: this.accumulatedHtlcFees })

        const localChannelsBalance = Number(channelsBalance.localBalance?.sat || 0)
        const unsettledLocalBalance = Number(channelsBalance.unsettledLocalBalance?.sat || 0)
        return Number(walletBalance.confirmedBalance) + localChannelsBalance + unsettledLocalBalance
    }

    checkBalanceUpdate = (deltaLnd: number, deltaUsers: number) => {
        this.log("LND balance update:", deltaLnd, "sats since app startup")
        this.log("Users balance update:", deltaUsers, "sats since app startup")

        const result = this.checkDeltas(deltaLnd, deltaUsers)
        switch (result.type) {
            case 'mismatch':
                if (deltaLnd < 0) {
                    this.log("WARNING! LND balance decreased while users balance increased creating a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > this.settings.maxDiffSats) {
                        this.log("Difference is too big for an update, locking outgoing operations")
                        return true
                    }
                } else {
                    this.log("LND balance increased while users balance decreased creating a difference of", result.absoluteDiff, "sats, could be caused by data loss, or liquidity injection")
                    return false
                }
                break
            case 'negative':
                if (Math.abs(deltaLnd) > Math.abs(deltaUsers)) {
                    this.log("WARNING! LND balance decreased more than users balance with a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > this.settings.maxDiffSats) {
                        this.log("Difference is too big for an update, locking outgoing operations")
                        return true
                    }
                } else if (deltaLnd === deltaUsers) {
                    this.log("LND and users balance went both DOWN consistently")
                    return false
                } else {
                    this.log("LND balance decreased less than users balance with a difference of", result.absoluteDiff, "sats, could be caused by data loss, or liquidity injection")
                    return false
                }
                break
            case 'positive':
                if (deltaLnd < deltaUsers) {
                    this.log("WARNING! LND balance increased less than users balance with a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > this.settings.maxDiffSats) {
                        this.log("Difference is too big for an update, locking outgoing operations")
                        return true
                    }
                } else if (deltaLnd === deltaUsers) {
                    this.log("LND and users balance went both UP consistently")
                    return false
                } else {
                    this.log("LND balance increased more than users balance with a difference of", result.absoluteDiff, "sats, could be caused by data loss, or liquidity injection")
                    return false
                }
        }
        return false
    }

    StartCheck = async () => {
        this.latestCheckStart = Date.now()
        await this.updateAccumulatedHtlcFees()
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        const totalLndBalance = await this.getTotalLndBalance(totalUsersBalance)
        const deltaLnd = totalLndBalance - (this.initialLndBalance + this.accumulatedHtlcFees)
        const deltaUsers = totalUsersBalance - this.initialUsersBalance
        const deny = this.checkBalanceUpdate(deltaLnd, deltaUsers)
        if (deny) {
            this.log("Balance mismatch detected in absolute update, locking outgoing operations")
            this.lnd.LockOutgoingOperations()
            return
        }
        this.lnd.UnlockOutgoingOperations()
    }

    PaymentRequested = async () => {
        this.log("Payment requested, checking balance")
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
}
type DeltaCheckResult = { type: 'negative' | 'positive', absoluteDiff: number, relativeDiff: number } | { type: 'mismatch', absoluteDiff: number }