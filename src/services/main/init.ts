import { PubLogger, getLogger } from "../helpers/logger.js"
import { LiquidityProvider } from "./liquidityProvider.js"
import { Unlocker } from "./unlocker.js"
import Storage from "../storage/index.js"
import { TypeOrmMigrationRunner } from "../storage/migrations/runner.js"
import Main from "./index.js"
import SanityChecker from "./sanityChecker.js"
import { MainSettings } from "./settings.js"
import { Utils } from "../helpers/utilsWrapper.js"
export type AppData = {
    privateKey: string;
    publicKey: string;
    appId: string;
    name: string;
}
export const initMainHandler = async (log: PubLogger, mainSettings: MainSettings) => {
    const utils = new Utils(mainSettings)
    const storageManager = new Storage(mainSettings.storageSettings)
    const manualMigration = await TypeOrmMigrationRunner(log, storageManager, mainSettings.storageSettings.dbSettings, process.argv[2])
    if (manualMigration) {
        return
    }
    const unlocker = new Unlocker(mainSettings, storageManager)
    await unlocker.Unlock()

    const mainHandler = new Main(mainSettings, storageManager, utils)
    await mainHandler.lnd.Warmup()
    if (!mainSettings.skipSanityCheck) {
        const sanityChecker = new SanityChecker(storageManager, mainHandler.lnd)
        await sanityChecker.VerifyEventsLog()
    }
    const appsData = await mainHandler.storage.applicationStorage.GetApplications()
    const existingWalletApp = await appsData.find(app => app.name === 'wallet' || app.name === 'wallet-test')
    if (!existingWalletApp) {
        log("no default wallet app found, creating one...")
        const newWalletApp = await mainHandler.storage.applicationStorage.AddApplication('wallet', true)
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
    const liquidityProviderApp = apps.find(app => app.name === 'wallet' || app.name === 'wallet-test')
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
    mainHandler.paymentManager.watchDog.Start()
    return { mainHandler, apps, liquidityProviderInfo, liquidityProviderApp }
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