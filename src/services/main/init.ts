import { PubLogger, getLogger } from "../helpers/logger.js"
import Storage from "../storage/index.js"
import { TypeOrmMigrationRunner } from "../storage/migrations/runner.js"
import Main from "./index.js"
import { MainSettings } from "./settings.js"
export type AppData = {
    privateKey: string;
    publicKey: string;
    appId: string;
    name: string;
}
export const initMainHandler = async (log: PubLogger, mainSettings: MainSettings) => {
    const storageManager = new Storage(mainSettings.storageSettings)
    const manualMigration = await TypeOrmMigrationRunner(log, storageManager, mainSettings.storageSettings.dbSettings, process.argv[2])
    if (manualMigration) {
        return
    }
    const mainHandler = new Main(mainSettings, storageManager)
    await mainHandler.lnd.Warmup()
    if (!mainSettings.skipSanityCheck) {
        const totalUsersBalance = await mainHandler.VerifyEventsLog()
        await mainHandler.paymentManager.watchDog.SeedLndBalance(totalUsersBalance)
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
    const stop = await processArgs(mainHandler)
    if (stop) {
        return
    }
    return { mainHandler, apps }
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