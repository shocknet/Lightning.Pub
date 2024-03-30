import { EnvCanBeInteger } from "../helpers/envParser.js";
import { getLogger } from "../helpers/logger.js";
import { LightningHandler } from "./index.js";
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
    log = getLogger({ appName: "watchdog" })
    enabled = false
    constructor(settings: WatchdogSettings, lnd: LightningHandler) {
        this.lnd = lnd;
        this.settings = settings;
    }

    SeedLndBalance = async (totalUsersBalance: number) => {
        this.initialLndBalance = await this.getTotalLndBalance()
        this.initialUsersBalance = totalUsersBalance
        this.enabled = true
    }

    getTotalLndBalance = async () => {
        const { channelsBalance, confirmedBalance } = await this.lnd.GetBalance()
        return confirmedBalance + channelsBalance.reduce((acc, { localBalanceSats }) => acc + localBalanceSats, 0)
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
                } else {
                    this.log("LND balance increased more than users balance with a difference of", result.absoluteDiff, "sats, could be caused by data loss, or liquidity injection")
                    return false
                }
        }
        return false
    }

    PaymentRequested = async (totalUsersBalance: number) => {
        this.log("Payment requested, checking balance")
        if (!this.enabled) {
            this.log("WARNING! Watchdog not enabled, skipping balance check")
            return
        }
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