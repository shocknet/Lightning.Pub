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
import { NostrSender } from "../nostr/sender.js"
import { Swaps } from "../lnd/swaps/swaps.js"
// BACKUP CHANGE: import restore pipeline for CLI usage
import { type RestoreOptions, type RestoreSource, validRestoreSources, type RestoreParams, parseRestoreFlags, RestoreManager } from "../backup/restoreManager.js"
export type AppData = {
    privateKey: string;
    publicKey: string;
    appId: string;
    name: string;
}

export const initSettings = async (log: PubLogger, storageSettings: StorageSettings): Promise<{ settingsManager: SettingsManager, restore: RestoreManager } | undefined> => {
    const nostrSender = new NostrSender()
    const utils = new Utils({ dataDir: storageSettings.dataDir, allowResetMetricsStorages: storageSettings.allowResetMetricsStorages }, nostrSender)
    const storageManager = new Storage(storageSettings, utils)
    await storageManager.Connect(log)
    const settingsManager = new SettingsManager(storageManager)
    await settingsManager.InitSettings()
    const restore = new RestoreManager(storageManager, settingsManager)
    const stop = await processArgs(storageManager, restore)
    if (stop) {
        return
    }
    return { settingsManager, restore }
}
export const initMainHandler = async (log: PubLogger, settingsManager: SettingsManager, restore: RestoreManager) => {
    const storageManager = settingsManager.storage
    const utils = storageManager.utils
    const unlocker = new Unlocker(settingsManager, storageManager, storageManager.NostrSender())
    await unlocker.Unlock()
    const swaps = new Swaps(settingsManager, storageManager)
    const adminManager = new AdminManager(settingsManager, storageManager, swaps)
    let wizard: Wizard | null = null
    if (settingsManager.getSettings().serviceSettings.wizard) {
        wizard = new Wizard(settingsManager, storageManager, adminManager, restore)
        const wizardNonBlocking = settingsManager.getSettings().serviceSettings.wizardNonBlocking
        if (wizardNonBlocking) {
            // In dev mode, don't block on wizard - timeout after 1 second
            Promise.race([
                wizard.Configure(),
                new Promise(resolve => setTimeout(() => {
                    log("Wizard non-blocking mode: continuing startup without waiting for wizard config")
                    resolve(false)
                }, 1000))
            ]).catch(err => {
                log(`Wizard configure error (non-blocking): ${(err as Error).message}`)
            })
        } else {
            await wizard.Configure()
        }
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
    const existingWalletApp = appsData.find(app => defaultNames.includes(app.name))
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
    const localProviderClient = apps.find(app => defaultNames.includes(app.name))
    if (!localProviderClient) {
        throw new Error("local app not initialized correctly")
    }
    mainHandler.liquidityProvider.setNostrInfo({ localId: `client_${localProviderClient.appId}`, localPubkey: localProviderClient.publicKey })
    /*     const stop = await processArgs(mainHandler)
        if (stop) {
            return
        } */
    await mainHandler.paymentManager.checkPaymentStatus()
    await mainHandler.paymentManager.checkMissedChainTxs()
    await mainHandler.paymentManager.CleanupOldUnpaidInvoices()
    await mainHandler.appUserManager.CleanupInactiveUsers()
    await mainHandler.appUserManager.CleanupNeverActiveUsers()
    await swaps.ResumeInvoiceSwaps()
    await mainHandler.paymentManager.watchDog.Start()
    return { mainHandler, apps, localProviderClient, wizard, adminManager }
}

const processArgs = async (storage: Storage, restore: RestoreManager) => {
    switch (process.argv[2]) {
        case 'updateUserBalance':
            await storage.userStorage.UpdateUser(process.argv[3], { balance_sats: +process.argv[4] })
            getLogger({ userId: process.argv[3] })(`user balance updated correctly`)
            return false
        case 'unlock':
            await storage.userStorage.UnbanUser(process.argv[3])
            getLogger({ userId: process.argv[3] })(`user unlocked`)
            return false
        case 'restore':
            const flags = parseCliFlags(process.argv.slice(3))
            const req = parseRestoreFlags(flags)
            const result = await restore.RestoreFromSource(req)
            if (result.success) {
                getLogger({ component: 'backupRestore' })(`restore complete`)
            } else {
                getLogger({ component: 'backupRestore' })(`restore failed: ${result.error}`)
            }
            return false
        default:
            return false
    }
}

/* 

// BACKUP CHANGE: CLI restore command.
// Usage: node build/src/index.js restore --phrase "word1 word2 ..." --source cloud|ftp|local
//   [--ftp-host host] [--ftp-user user] [--ftp-pass pass]
//   [--local-path /path/to/db.sqlite]
//   [--relay wss://relay.example.com]
//
// Exits non-zero on failure with human-readable error.
// Shares restoreFromSource() with the wizard — single implementation path.
export const handleRestoreCli = (log: PubLogger, storageSettings: StorageSettings): Promise<boolean> => {
    if (process.argv[2] !== 'restore') return false

    log('Running CLI restore...')

    const flags = parseCliFlags(process.argv.slice(3))

    if (!flags['phrase']) {
        console.error('Error: --phrase is required')
        process.exit(1)
    }
    if (!flags['source']) {
        console.error('Error: --source is required (cloud|ftp|local)')
        process.exit(1)
    }
    if (!validRestoreSources.includes(flags['source'] as RestoreSource)) {
        console.error(`Error: --source must be one of: ${validRestoreSources.join(', ')}`)
        process.exit(1)
    }

    if (flags['source'] === 'ftp' && !flags['ftp-host']) {
        console.error('Error: --ftp-host is required when source=ftp')
        process.exit(1)
    }

    if (flags['source'] === 'local' && !flags['local-path']) {
        console.error('Error: --local-path is required when source=local')
        process.exit(1)
    }

    const nostrSender = new NostrSender()
    const utils = new Utils({ dataDir: storageSettings.dataDir, allowResetMetricsStorages: storageSettings.allowResetMetricsStorages }, nostrSender)
    const storageManager = new Storage(storageSettings, utils)
    await storageManager.Connect(log)

    const opts: RestoreOptions = {
        phrase: flags['phrase'],
        source: flags['source'] as RestoreSource,
        sftpHost: flags['ftp-host'],
        sftpUser: flags['ftp-user'],
        sftpPass: flags['ftp-pass'],
        localPath: flags['local-path'],
        relay: flags['relay'],
    }

    const result = await restoreFromSource(storageManager.dbs, opts)

    if (result.success) {
        log(`Restore complete. ${result.tablesRestored ?? 0} table groups imported.`)
    } else {
        console.error(`Restore failed: ${result.error}`)
        process.exit(1)
    }

    await storageManager.Stop()
    return true
}
 */



const parseCliFlags = (args: string[]): Record<string, string> => {
    const flags: Record<string, string> = {}
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--') && i + 1 < args.length) {
            const key = args[i].substring(2)
            flags[key] = args[i + 1]
            i++
        }
    }
    return flags
}