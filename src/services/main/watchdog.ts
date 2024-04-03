import { EnvCanBeInteger } from "../helpers/envParser.js";
import { getLogger } from "../helpers/logger.js";
import { LightningHandler } from "../lnd/index.js";
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

    initialLndBalance: number;
    initialUsersBalance: number;
    lnd: LightningHandler;
    settings: WatchdogSettings;
    storage: Storage;
    latestCheckStart = 0
    log = getLogger({ appName: "watchdog" })
    enabled = false
    interval: NodeJS.Timer;
    constructor(settings: WatchdogSettings, lnd: LightningHandler, storage: Storage) {
        this.lnd = lnd;
        this.settings = settings;
        this.storage = storage;
    }

    Stop() {
        if (this.interval) {
            clearInterval(this.interval)
        }
    }

    Start = async () => {
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        this.initialLndBalance = await this.getTotalLndBalance()
        this.initialUsersBalance = totalUsersBalance
        this.enabled = true

        this.interval = setInterval(() => {
            if (this.latestCheckStart + (1000 * 60) < Date.now()) {
                this.log("No balance check was made in the last minute, checking now")
                this.PaymentRequested()
            }
        }, 1000 * 60)
    }

    getTotalLndBalance = async () => {
        const { confirmedBalance, channelsBalance } = await this.lnd.GetBalance()
        let total = confirmedBalance
        channelsBalance.forEach(c => {
            let outgoingSats = 0
            c.htlcs.forEach(htlc => {
                if (!htlc.incoming) {
                    outgoingSats += Number(htlc.amount)
                }
            })
            total += Number(c.localBalanceSats) - outgoingSats
        })
        return total
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

    PaymentRequested = async () => {
        this.log("Payment requested, checking balance")
        if (!this.enabled) {
            this.log("WARNING! Watchdog not enabled, skipping balance check")
            return
        }
        this.latestCheckStart = Date.now()
        const totalUsersBalance = await this.storage.paymentStorage.GetTotalUsersBalance()
        const totalLndBalance = await this.getTotalLndBalance()
        const deltaLnd = totalLndBalance - this.initialLndBalance
        const deltaUsers = totalUsersBalance - this.initialUsersBalance
        const deny = this.checkBalanceUpdate(deltaLnd, deltaUsers)
        if (deny) {
            this.log("Balance mismatch detected in absolute update, locking outgoing operations")
            this.lnd.LockOutgoingOperations()
            return
        }
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