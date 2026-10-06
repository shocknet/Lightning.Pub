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
import { acquirePubInstanceLock } from "../storage/instanceLock.js"
import { NostrSender } from "../nostr/sender.js"
import { Swaps } from "../lnd/swaps/swaps.js"
import { parseRestoreFlags, RestoreManager } from "../backup/restoreManager.js"
import { BackupManager } from "../backup/backupManager.js"
import { pickDefaultApp } from "./adminNodeSettings.js"
export type AppData = {
    privateKey: string;
    publicKey: string;
    appId: string;
    name: string;
}

export const initSettings = async (log: PubLogger, storageSettings: StorageSettings): Promise<{ settingsManager: SettingsManager, restore: RestoreManager, unlocker: Unlocker, nostrSender: NostrSender } | undefined> => {
    acquirePubInstanceLock(storageSettings.dbSettings.databaseFile)
    const nostrSender = new NostrSender()
    const utils = new Utils({ dataDir: storageSettings.dataDir, allowResetMetricsStorages: storageSettings.allowResetMetricsStorages }, nostrSender)
    const storageManager = new Storage(storageSettings, utils)
    await storageManager.Connect(log)
    const settingsManager = new SettingsManager(storageManager)
    await settingsManager.InitSettings()
    const unlocker = new Unlocker(settingsManager, storageManager, storageManager.NostrSender())
    const restore = new RestoreManager(storageManager, settingsManager, unlocker)

    const { keepOn } = await processPostSettingArgs(restore)
    if (!keepOn) {
        return undefined
    }
    return { settingsManager, restore, unlocker, nostrSender }
}
export const initMainHandler = async (log: PubLogger, settingsManager: SettingsManager, restore: RestoreManager, unlocker: Unlocker) => {
    const storageManager = settingsManager.storage
    const utils = storageManager.utils
    const swaps = new Swaps(settingsManager, storageManager)
    const adminManager = new AdminManager(settingsManager, storageManager, swaps)

    // The wizard is the only retry path for a failed restore, so it comes up before the recovery
    // gate and keeps serving while recovery is unfinished: the gate holds back the main server,
    // not the wizard. An ongoing recovery brings it up even when the wizard is disabled.
    const wizardEnabled = settingsManager.getSettings().serviceSettings.wizard
    let wizard: Wizard | null = null
    if (wizardEnabled || restore.HasOngoingRecovery()) {
        wizard = new Wizard(settingsManager, storageManager, adminManager, restore, unlocker)
    }

    // A failed retry leaves recovery active, so keep waiting instead of exiting: the operator
    // needs this process (and its wizard) alive to try again.
    const awaitRecovery = async (reason: string) => {
        if (!restore.IsRecoveryActive()) {
            return
        }
        log(reason, "To abandon the restore, delete .restore_checkpoint, .restore_phrase_hash, and .restore_wallet_pub, reset LND and the database, then restart Pub.")
        while (restore.IsRecoveryActive()) {
            await restore.WaitForRecoveryCompletion()
        }
        log("Restore completed; continuing normal startup")
    }

    await awaitRecovery("Ongoing restore detected; recovery-only mode until restore completes (wizard or `restore` CLI). Normal server will not start, the wizard stays reachable to retry.")

    // Only an absent wallet waits for the wizard to unlock, so restore stays possible.
    const walletExisted = await unlocker.WalletExists()
    if (walletExisted) {
        await unlocker.Unlock()
    }
    if (wizardEnabled && wizard) {
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
    // A restore launched from the wizard can still be running here. Unlock() would create a
    // fresh wallet on a node that has none, which would destroy the restore, so wait it out.
    await awaitRecovery("Restore is still unfinished after the wizard; normal startup stays blocked and the wizard stays reachable to retry.")
    if (!walletExisted) {
        await unlocker.Unlock()
    }

    const seed = await unlocker.GetSeedIfAvailable()
    const backupManager = new BackupManager(storageManager, settingsManager)
    await backupManager.InitKeys(seed)
    settingsManager.setBackupManager(backupManager)
    adminManager.setBackupManager(backupManager)
    unlocker.SetChannelBackupSink(scb => backupManager.ChannelBackupUpdate(scb))
    backupManager.notifyBackupTable('admin_settings', 'applications', 'user_balances')

    const mainHandler = new Main(settingsManager, storageManager, adminManager, utils, unlocker, backupManager)
    adminManager.setLND(mainHandler.lnd)
    await mainHandler.lnd.Warmup()
    if (!settingsManager.getSettings().liquiditySettings.useOnlyLiquidityProvider) {
        try {
            const addressCount = await mainHandler.lnd.CountAddresses()
            await backupManager.AddressUpdate(addressCount)
        } catch (err: any) {
            // The address count stays unset, so a later upload does not replace a stored count with 0.
            log("failed to snapshot address count for backup", err.message || err)
        }
        try {
            await unlocker.SyncChannelBackup()
        } catch (err: any) {
            // The channel state stays unknown, so indexes.enc is not replaced until a snapshot arrives.
            log("failed to snapshot channel backup", err.message || err)
        }
        try {
            await mainHandler.metricsManager.StampActiveChannels()
        } catch (err: any) {
            log("failed to stamp active channels", err.message || err)
        }
    }
    if (!settingsManager.getSettings().serviceSettings.skipSanityCheck && !settingsManager.getSettings().liquiditySettings.useOnlyLiquidityProvider) {
        const sanityChecker = new SanityChecker(storageManager, mainHandler.lnd)
        await sanityChecker.VerifyEventsLog()
    }
    const defaultAppName = settingsManager.getSettings().serviceSettings.defaultAppName
    const appsData = await mainHandler.storage.applicationStorage.GetApplications()
    if (!pickDefaultApp(appsData, defaultAppName)) {
        log("no default wallet app found, creating one...")
        const newWalletApp = await mainHandler.storage.applicationStorage.AddApplication(defaultAppName, true)
        appsData.push(newWalletApp)
        // Runs after the early applications/user_balances notify above — flush the new owner row too.
        backupManager.notifyBackupTable('applications', 'user_balances')
    }
    const apps: AppData[] = await Promise.all(appsData.map(async app => {
        if (!app.nostr_private_key || !app.nostr_public_key) { // TMP --
            const newAppCreds = await mainHandler.storage.applicationStorage.GenerateApplicationKeys(app);
            backupManager.notifyBackupTable('applications', 'user_balances')
            return newAppCreds
        } // --
        else {
            return { privateKey: app.nostr_private_key, publicKey: app.nostr_public_key, appId: app.app_id, name: app.name }
        }
    }))
    const localProviderClient = pickDefaultApp(apps, defaultAppName)
    if (!localProviderClient) {
        throw new Error("local app not initialized correctly")
    }
    mainHandler.liquidityProvider.setNostrInfo({ localId: `client_${localProviderClient.appId}`, localPubkey: localProviderClient.publicKey })
    const { keepOn } = await processPostInitArgs(mainHandler)
    if (!keepOn) {
        return undefined
    }
    await mainHandler.paymentManager.checkPaymentStatus()
    await mainHandler.paymentManager.checkMissedChainTxs()
    await mainHandler.paymentManager.CleanupOldUnpaidInvoices()
    await mainHandler.appUserManager.CleanupInactiveUsers()
    await mainHandler.appUserManager.CleanupNeverActiveUsers()
    await swaps.ResumeInvoiceSwaps()
    await mainHandler.paymentManager.watchDog.Start()
    return { mainHandler, apps, localProviderClient, wizard, adminManager }
}

const processPostInitArgs = async (mainHandler: Main): Promise<{ keepOn: boolean }> => {
    switch (process.argv[2]) {
        case 'updateUserBalance':
            await mainHandler.storage.userStorage.UpdateUser(process.argv[3], { balance_sats: +process.argv[4] })
            mainHandler.backupManager.notifyBackupTable('user_balances')
            getLogger({ userId: process.argv[3] })(`user balance updated correctly`)
            return { keepOn: false }
        case 'unlock':
            await mainHandler.storage.userStorage.UnbanUser(process.argv[3])
            mainHandler.backupManager.notifyBackupTable('user_balances')
            getLogger({ userId: process.argv[3] })(`user unlocked`)
            return { keepOn: false }
        default:
            return { keepOn: true }
    }
}

const processPostSettingArgs = async (restore: RestoreManager): Promise<{ keepOn: boolean }> => {
    switch (process.argv[2]) {
        case 'restore':
            const flags = parseCliFlags(process.argv.slice(3))
            const req = parseRestoreFlags(flags)
            const result = await restore.RestoreFromSource(req)
            if (result.success) {
                getLogger({ component: 'backupRestore' })(`restore complete`)
            } else {
                getLogger({ component: 'backupRestore' })(`restore failed: ${result.error}`)
            }
            return { keepOn: false }
        default:
            return { keepOn: true }
    }
}

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