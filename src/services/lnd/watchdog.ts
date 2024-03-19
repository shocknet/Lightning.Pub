import { EnvMustBeInteger } from "../helpers/envParser.js";
import { getLogger } from "../helpers/logger.js";
import { LightningHandler } from "./index.js";
export type WatchdogSettings = {
    maxDiffBps: number
    maxDiffSats: number
}
export const LoadWatchdogSettingsFromEnv = (test = false): WatchdogSettings => {
    return {
        maxDiffBps: EnvMustBeInteger("WATCHDOG_MAX_DIFF_BPS"),
        maxDiffSats: EnvMustBeInteger("WATCHDOG_MAX_DIFF_SATS")
    }
}
export class Watchdog {
    lnd: LightningHandler;
    settings: WatchdogSettings;
    log = getLogger({ appName: "watchdog" })
    constructor(settings: WatchdogSettings, lnd: LightningHandler) {
        this.lnd = lnd;
        this.settings = settings;
    }

    PaymentRequested = async (totalUsersBalance: number) => {
        this.log("Payment requested, checking balance")
        const { channelsBalance, confirmedBalance } = await this.lnd.GetBalance()
        const totalLndBalance = confirmedBalance + channelsBalance.reduce((acc, { localBalanceSats }) => acc + localBalanceSats, 0)
        const diffSats = Math.abs(totalLndBalance - totalUsersBalance)
        const diffBps = (diffSats / Math.max(totalLndBalance, totalUsersBalance)) * 10_000
        if (diffSats > this.settings.maxDiffSats || diffBps > this.settings.maxDiffBps) {
            this.log(`LND balance ${totalLndBalance} is too different from users balance ${totalUsersBalance}`)
            this.lnd.LockOutgoingOperations()
        }
    }
}