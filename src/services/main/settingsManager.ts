import Storage, { StorageSettings } from "../storage/index.js"
import { EnvCacher } from "../helpers/envParser.js"
import { getLogger, PubLogger } from "../helpers/logger.js"
import {
    LiquiditySettings, LndNodeSettings, LndSettings, LoadLiquiditySettingsFromEnv,
    LoadLSPSettingsFromEnv, LSPSettings, ServiceFeeSettings, ServiceSettings, LoadServiceFeeSettingsFromEnv,
    LoadNostrRelaySettingsFromEnv, LoadServiceSettingsFromEnv, LoadWatchdogSettingsFromEnv,
    LoadLndNodeSettingsFromEnv, LoadLndSettingsFromEnv, NostrRelaySettings, WatchdogSettings
} from "./settings.js"
export default class SettingsManager {
    storage: Storage
    private settings: FullSettings | null = null

    log: PubLogger
    constructor(storage: Storage) {
        this.storage = storage
        this.log = getLogger({ component: "SettingsManager" })
    }

    loadEnvs(dbEnv: Record<string, string | undefined>, addToDb?: EnvCacher): FullSettings {
        return {
            lndNodeSettings: LoadLndNodeSettingsFromEnv(dbEnv, addToDb),
            lndSettings: LoadLndSettingsFromEnv(dbEnv, addToDb),
            liquiditySettings: LoadLiquiditySettingsFromEnv(dbEnv, addToDb),
            lspSettings: LoadLSPSettingsFromEnv(dbEnv, addToDb),
            nostrRelaySettings: LoadNostrRelaySettingsFromEnv(dbEnv, addToDb),
            serviceFeeSettings: LoadServiceFeeSettingsFromEnv(dbEnv, addToDb),
            serviceSettings: LoadServiceSettingsFromEnv(dbEnv, addToDb),
            watchDogSettings: LoadWatchdogSettingsFromEnv(dbEnv, addToDb),
        }
    }

    OverrideTestSettings(f: (s: FullSettings) => FullSettings) {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        this.settings = f(this.settings)
    }

    async InitSettings(): Promise<FullSettings> {
        const dbSettings = await this.storage.settingsStorage.getAllDbEnvs()
        const toAdd: Record<string, string> = {}
        const addToDb = (key: string, value: string) => {
            toAdd[key] = value
        }
        this.settings = this.loadEnvs(dbSettings, addToDb)
        this.log("adding", toAdd.length, "settings to db")
        for (const key in toAdd) {
            await this.storage.settingsStorage.setDbEnvIFNeeded(key, toAdd[key])
        }
        return this.settings
    }

    getStorageSettings(): StorageSettings {
        return this.storage.getStorageSettings()
    }

    getSettings(): FullSettings {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        return this.settings
    }

    async updateDefaultAppName(name: string): Promise<boolean> {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        if (name === this.settings.serviceSettings.defaultAppName) {
            return false
        }
        if (!!process.env.DEFAULT_APP_NAME) {
            return false
        }
        await this.storage.settingsStorage.setDbEnvIFNeeded("DEFAULT_APP_NAME", name)
        this.settings.serviceSettings.defaultAppName = name
        return true
    }

    async updateRelayUrl(url: string): Promise<boolean> {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        if (url === this.settings.nostrRelaySettings.relays[0]) {
            return false
        }
        if (!!process.env.RELAY_URL) {
            return false
        }
        await this.storage.settingsStorage.setDbEnvIFNeeded("NOSTR_RELAYS", url)
        this.settings.nostrRelaySettings.relays = [url]
        return true
    }

    async updateDisableLiquidityProvider(disable: boolean): Promise<boolean> {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        if (disable === this.settings.liquiditySettings.disableLiquidityProvider) {
            return false
        }
        if (!!process.env.DISABLE_LIQUIDITY_PROVIDER) {
            return false
        }
        await this.storage.settingsStorage.setDbEnvIFNeeded("DISABLE_LIQUIDITY_PROVIDER", disable ? "true" : "false")
        this.settings.liquiditySettings.disableLiquidityProvider = disable
        return true
    }



    async updatePushBackupsToNostr(push: boolean): Promise<boolean> {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        if (push === this.settings.serviceSettings.pushBackupsToNostr) {
            return false
        }
        if (!!process.env.PUSH_BACKUPS_TO_NOSTR) {
            return false
        }
        await this.storage.settingsStorage.setDbEnvIFNeeded("PUSH_BACKUPS_TO_NOSTR", push ? "true" : "false")
        this.settings.serviceSettings.pushBackupsToNostr = push
        return true
    }

    async updateSkipSanityCheck(skip: boolean): Promise<boolean> {
        if (!this.settings) {
            throw new Error("Settings not initialized")
        }
        if (skip === this.settings.serviceSettings.skipSanityCheck) {
            return false
        }
        if (!!process.env.SKIP_SANITY_CHECK) {
            return false
        }
        await this.storage.settingsStorage.setDbEnvIFNeeded("SKIP_SANITY_CHECK", skip ? "true" : "false")
        this.settings.serviceSettings.skipSanityCheck = skip
        return true
    }
}

type FullSettings = {
    lndNodeSettings: LndNodeSettings
    lndSettings: LndSettings
    liquiditySettings: LiquiditySettings
    watchDogSettings: WatchdogSettings,
    nostrRelaySettings: NostrRelaySettings,
    serviceFeeSettings: ServiceFeeSettings,
    serviceSettings: ServiceSettings,
    lspSettings: LSPSettings
}