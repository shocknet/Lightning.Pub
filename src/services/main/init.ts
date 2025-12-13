import { PubLogger, getLogger } from "../helpers/logger.js"
import { LiquidityProvider } from "./liquidityProvider.js"
import { Unlocker } from "./unlocker.js"
import Storage, { StorageSettings } from "../storage/index.js"
/* import { TypeOrmMigrationRunner } from "../storage/migrations/runner.js" */
import Main from "./index.js"
import SanityChecker from "./sanityChecker.js"
import { Utils } from "../helpers/utilsWrapper.js"
import { Wizard } from "../wizard/index.js"
import { AdminManager } from "./adminManager.js"
import SettingsManager from "./settingsManager.js"
import { LoadStorageSettingsFromEnv } from "../storage/index.js"
export type AppData = {
    privateKey: string;
    publicKey: string;
    appId: string;
    name: string;
}

export const initSettings = async (log: PubLogger, storageSettings: StorageSettings): Promise<SettingsManager> => {
    const utils = new Utils({ dataDir: storageSettings.dataDir, allowResetMetricsStorages: storageSettings.allowResetMetricsStorages })
    const storageManager = new Storage(storageSettings, utils)
    await storageManager.Connect(log)
    const settingsManager = new SettingsManager(storageManager)
    await settingsManager.InitSettings()
    return settingsManager
}
export const initMainHandler = async (log: PubLogger, settingsManager: SettingsManager) => {
    const storageManager = settingsManager.storage
    const utils = storageManager.utils
    const unlocker = new Unlocker(settingsManager, storageManager)
    await unlocker.Unlock()
    const adminManager = new AdminManager(settingsManager, storageManager)
    let wizard: Wizard | null = null
    if (settingsManager.getSettings().serviceSettings.wizard) {
        wizard = new Wizard(settingsManager, storageManager, adminManager)
        await wizard.Configure()
    }

    const mainHandler = new Main(settingsManager, storageManager, adminManager, utils, unlocker)
    adminManager.setLND(mainHandler.lnd)
    await mainHandler.lnd.Warmup()
    if (!settingsManager.getSettings().serviceSettings.skipSanityCheck && !settingsManager.getSettings().liquiditySettings.useOnlyLiquidityProvider) {
        const sanityChecker = new SanityChecker(storageManager, mainHandler.lnd)
        await sanityChecker.VerifyEventsLog()
    }
    const defaultAppName = settingsManager.getSettings().serviceSettings.defaultAppName
    const appsData = await mainHandler.storage.applicationStorage.GetApplications()
    const defaultNames = ['wallet', 'wallet-test', defaultAppName]
    const existingWalletApp = await appsData.find(app => defaultNames.includes(app.name))
    if (!existingWalletApp) {
        log("no default wallet app found, creating one...")
        const newWalletApp = await mainHandler.storage.applicationStorage.AddApplication(defaultAppName, true)
        appsData.push(newWalletApp)
    }
    const apps: AppData[] = await Promise.all(appsData.map(app => {
        if (!app.nostr_private_key || !app.nostr_public_key) { // TMP --
            return mainHandler.storage.applicationStorage.GenerateApplicationKeys(app);
        } // --
        else {
            return { privateKey: app.nostr_private_key, publicKey: app.nostr_public_key, appId: app.app_id, name: app.name }
        }
    }))
    const liquidityProviderApp = apps.find(app => defaultNames.includes(app.name))
    if (!liquidityProviderApp) {
        throw new Error("wallet app not initialized correctly")
    }
    const liquidityProviderInfo = {
        privateKey: liquidityProviderApp.privateKey,
        publicKey: liquidityProviderApp.publicKey,
        name: "liquidity_provider", clientId: `client_${liquidityProviderApp.appId}`
    }
    mainHandler.liquidityProvider.setNostrInfo({ clientId: liquidityProviderInfo.clientId, myPub: liquidityProviderInfo.publicKey })
    const stop = await processArgs(mainHandler)
    if (stop) {
        return
    }
    await mainHandler.paymentManager.checkPendingPayments()
    await mainHandler.paymentManager.CleanupOldUnpaidInvoices()
    await mainHandler.appUserManager.CleanupInactiveUsers()
    await mainHandler.appUserManager.CleanupNeverActiveUsers()
    await mainHandler.paymentManager.watchDog.Start()
    return { mainHandler, apps, liquidityProviderInfo, liquidityProviderApp, wizard, adminManager }
}

const processArgs = async (mainHandler: Main) => {
    switch (process.argv[2]) {
        case 'updateUserBalance':
            await mainHandler.storage.userStorage.UpdateUser(process.argv[3], { balance_sats: +process.argv[4] })
            getLogger({ userId: process.argv[3] })(`user balance updated correctly`)
            return false
        case 'unlock':
            await mainHandler.storage.userStorage.UnbanUser(process.argv[3])
            getLogger({ userId: process.argv[3] })(`user unlocked`)
            return false
        default:
            return false
    }
}