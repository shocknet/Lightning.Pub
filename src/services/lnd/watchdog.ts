import { EnvMustBeInteger } from "../helpers/envParser.js";
import { getLogger } from "../helpers/logger.js";
import { LightningHandler } from "./index.js";
export type WatchdogSettings = {
    maxDiffSats: number
    maxUpdateDiffSats: number
}
export const LoadWatchdogSettingsFromEnv = (test = false): WatchdogSettings => {
    return {
        maxDiffSats: EnvMustBeInteger("WATCHDOG_MAX_DIFF_SATS"),
        maxUpdateDiffSats: EnvMustBeInteger("WATCHDOG_MAX_UPDATE_DIFF_SATS")
    }
}
export class Watchdog {
    initialLndBalance: number;
    initialUsersBalance: number;
    lastLndBalance: number;
    lastUsersBalance: number;
    lnd: LightningHandler;
    settings: WatchdogSettings;
    log = getLogger({ appName: "watchdog" })
    constructor(settings: WatchdogSettings, lnd: LightningHandler) {
        this.lnd = lnd;
        this.settings = settings;
    }

    SeedLndBalance = async (totalUsersBalance: number) => {
        this.initialLndBalance = await this.getTotalLndBalance()
        this.lastLndBalance = this.initialLndBalance

        this.initialUsersBalance = totalUsersBalance
        this.lastUsersBalance = this.initialUsersBalance
    }

    getTotalLndBalance = async () => {
        const { channelsBalance, confirmedBalance } = await this.lnd.GetBalance()
        return confirmedBalance + channelsBalance.reduce((acc, { localBalanceSats }) => acc + localBalanceSats, 0)
    }

    checkBalanceUpdate = (deltaLnd: number, deltaUsers: number, type: 'incremental' | 'absolute', threshold: number) => {
        this.log("LND balance update:", deltaLnd, "sats", type === 'incremental' ? "since last balance check" : "since app startup")
        this.log("Users balance update:", deltaUsers, "sats", type === 'incremental' ? "since last balance check" : "since app startup")

        const result = this.checkDeltas(deltaLnd, deltaUsers)
        switch (result.type) {
            case 'mismatch':
                if (deltaLnd < 0) {
                    this.log("WARNING! LND balance decreased while users balance increased creating a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > threshold) {
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
                    if (result.absoluteDiff > threshold) {
                        this.log("Difference is too big for an update, locking outgoing operations")
                        return true
                    }
                } else {
                    this.log("LND balance decreased less than users balance with a difference of", result.absoluteDiff, "sats, could be caused by data loss, or liquidity injection")
                    return false
                }
                break
            case 'positive':
                if (deltaLnd < deltaUsers) {
                    this.log("WARNING! LND balance increased less than users balance with a difference of", result.absoluteDiff, "sats")
                    if (result.absoluteDiff > threshold) {
                        this.log("Difference is too big for an update, locking outgoing operations")
                        return true
                    }
                } else {
                    this.log("LND balance increased more than users balance with a difference of", result.absoluteDiff, "sats, could be caused by data loss, or liquidity injection")
                    return false
                }
        }
        return false
    }

    PaymentRequested = async (totalUsersBalance: number) => {
        this.log("Payment requested, checking balance")
        const totalLndBalance = await this.getTotalLndBalance()
        const IncDeltaLnd = totalLndBalance - this.lastLndBalance
        const IncDeltaUsers = totalUsersBalance - this.lastUsersBalance
        const denyIncremental = this.checkBalanceUpdate(IncDeltaLnd, IncDeltaUsers, 'incremental', this.settings.maxUpdateDiffSats)
        if (denyIncremental) {
            this.log("Balance mismatch detected in incremental update, locking outgoing operations")
            this.lnd.LockOutgoingOperations()
            return
        }
        const AbsDeltaLnd = totalLndBalance - this.initialLndBalance
        const AbsDeltaUsers = totalUsersBalance - this.initialUsersBalance
        const denyAbsolute = this.checkBalanceUpdate(AbsDeltaLnd, AbsDeltaUsers, 'absolute', this.settings.maxDiffSats)
        if (denyAbsolute) {
            this.log("Balance mismatch detected in absolute update, locking outgoing operations")
            this.lnd.LockOutgoingOperations()
            return
        }
        this.lastLndBalance = totalLndBalance
        this.lastUsersBalance = totalUsersBalance
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