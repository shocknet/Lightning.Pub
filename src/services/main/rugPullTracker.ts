import FunctionQueue from "../helpers/functionQueue.js";
import { getLogger } from "../helpers/logger.js";
import { Utils } from "../helpers/utilsWrapper.js";
import { LiquidityProvider } from "./liquidityProvider.js";
import { TrackedProvider } from "../storage/entity/TrackedProvider.js";
import Storage from "../storage/index.js";

export class RugPullTracker {
    liquidProvider: LiquidityProvider
    storage: Storage
    log = getLogger({ component: "rugPullTracker" })
    rugPulled = false
    onRugPullDetected?: () => void
    constructor(storage: Storage, liquidProvider: LiquidityProvider, onRugPullDetected?: () => void) {
        this.liquidProvider = liquidProvider
        this.storage = storage
        this.onRugPullDetected = onRugPullDetected
    }

    HasProviderRugPulled = () => {
        return this.rugPulled
    }

    CheckProviderBalance = async (): Promise<{ balance: number, prevBalance?: number }> => {
        const pubDst = this.liquidProvider.GetProviderDestination()
        if (!pubDst) {
            return { balance: 0 }
        }
        const providerTracker = await this.storage.liquidityStorage.GetTrackedProvider('lnPub', pubDst)
        const ready = this.liquidProvider.IsReady()
        if (ready) {
            const balance = await this.liquidProvider.GetLatestBalance()
            const pendingBalance = await this.liquidProvider.GetPendingBalance()
            const trackedBalance = balance + pendingBalance
            if (!providerTracker) {
                this.log("starting to track provider", this.liquidProvider.GetProviderDestination())
                await this.storage.liquidityStorage.CreateTrackedProvider('lnPub', pubDst, trackedBalance)
                return { balance: trackedBalance }
            }
            return this.checkForDisruption(pubDst, trackedBalance, providerTracker)
        } else {
            return { balance: providerTracker?.latest_balance || 0 }
        }
    }

    checkForDisruption = async (pubDst: string, trackedBalance: number, providerTracker: TrackedProvider) => {
        const diff = trackedBalance - providerTracker.latest_balance
        if (diff < 0) {
            const wasNotRugPulled = !this.rugPulled
            this.rugPulled = true
            if (providerTracker.latest_distruption_at_unix === 0) {
                await this.storage.liquidityStorage.UpdateTrackedProviderDisruption('lnPub', pubDst, Math.floor(Date.now() / 1000))
                getLogger({ component: 'rugPull' })("detected rugpull from: ", pubDst, "provider balance changed from", providerTracker.latest_balance, "to", trackedBalance, "losing", diff)
                // Trigger relay switch on first detection
                if (wasNotRugPulled && this.onRugPullDetected) {
                    getLogger({ component: 'rugPull' })("triggering provider relay switch due to rugpull")
                    this.onRugPullDetected()
                }
            } else {
                getLogger({ component: 'rugPull' })("ongoing rugpull from: ", pubDst, "provider balance changed from", providerTracker.latest_balance, "to", trackedBalance, "losing", diff)
            }
        } else {
            this.rugPulled = false
            if (providerTracker.latest_distruption_at_unix !== 0) {
                await this.storage.liquidityStorage.UpdateTrackedProviderDisruption('lnPub', pubDst, 0)
                getLogger({ component: 'rugPull' })("rugpull from: ", pubDst, "cleared after: ", Math.floor(Date.now() / 1000) - providerTracker.latest_distruption_at_unix, "seconds")
            }
            if (diff > 0) {
                this.log("detected excees from: ", pubDst, "provider balance changed from", providerTracker.latest_balance, "to", trackedBalance, "gaining", diff)
            }
        }
        return { balance: trackedBalance, prevBalance: providerTracker.latest_balance }
    }
}