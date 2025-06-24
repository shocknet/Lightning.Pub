import 'dotenv/config' // TODO - test env
import chai from 'chai'
import { AppData, initMainHandler } from '../services/main/init.js'
import Main from '../services/main/index.js'
import Storage from '../services/storage/index.js'
import { User } from '../services/storage/entity/User.js'
import { GetTestStorageSettings, LoadMainSettingsFromEnv, LoadTestSettingsFromEnv, MainSettings } from '../services/main/settings.js'
import chaiString from 'chai-string'
import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import SanityChecker from '../services/main/sanityChecker.js'
import LND from '../services/lnd/lnd.js'
import { getLogger, resetDisabledLoggers } from '../services/helpers/logger.js'
import { LiquidityProvider } from '../services/main/liquidityProvider.js'
import { Utils } from '../services/helpers/utilsWrapper.js'
import { AdminManager } from '../services/main/adminManager.js'
import { TlvStorageFactory } from '../services/storage/tlv/tlvFilesStorageFactory.js'
import { ChainTools } from './networkSetup.js'
chai.use(chaiString)
export const expect = chai.expect
export type Describe = (message: string, failure?: boolean) => void
export type TestUserData = {
    userId: string;
    appUserIdentifier: string;
    appId: string;

}
export type TestBase = {
    expect: Chai.ExpectStatic;
    main: Main
    app: AppData
    user1: TestUserData
    user2: TestUserData
    //externalAccessToMainLnd: LND
    externalAccessToOtherLnd: LND
    externalAccessToThirdLnd: LND
    adminManager: AdminManager
    d: Describe
    chainTools: ChainTools
}

export type StorageTestBase = {
    expect: Chai.ExpectStatic;
    storage: Storage
    d: Describe
}

export const setupStorageTest = async (d: Describe): Promise<StorageTestBase> => {
    const settings = GetTestStorageSettings()
    const utils = new Utils({ dataDir: settings.dataDir, allowResetMetricsStorages: true })
    const storageManager = new Storage(settings, utils)
    await storageManager.Connect(console.log)
    return {
        expect,
        storage: storageManager,
        d
    }
}

export const teardownStorageTest = async (T: StorageTestBase) => {
    T.storage.Stop()
}

export const SetupTest = async (d: Describe, chainTools: ChainTools): Promise<TestBase> => {
    const settings = LoadTestSettingsFromEnv()
    const initialized = await initMainHandler(getLogger({ component: "mainForTest" }), settings)
    if (!initialized) {
        throw new Error("failed to initialize main handler")
    }
    const main = initialized.mainHandler
    const app = initialized.apps[0]
    const u1 = await main.applicationManager.AddAppUser(app.appId, { identifier: "user1", balance: 0, fail_if_exists: true })
    const u2 = await main.applicationManager.AddAppUser(app.appId, { identifier: "user2", balance: 0, fail_if_exists: true })
    const user1 = { userId: u1.info.userId, appUserIdentifier: u1.identifier, appId: app.appId }
    const user2 = { userId: u2.info.userId, appUserIdentifier: u2.identifier, appId: app.appId }

    const extermnalUtils = new Utils({ dataDir: settings.storageSettings.dataDir, allowResetMetricsStorages: settings.allowResetMetricsStorages })
    /*     const externalAccessToMainLnd = new LND(settings.lndSettings, new LiquidityProvider("", extermnalUtils, async () => { }, async () => { }), extermnalUtils, async () => { }, async () => { }, () => { }, () => { })
        await externalAccessToMainLnd.Warmup() */

    const otherLndSetting = { ...settings.lndSettings, mainNode: settings.lndSettings.otherNode }
    const externalAccessToOtherLnd = new LND(otherLndSetting, new LiquidityProvider("", extermnalUtils, async () => { }, async () => { }), extermnalUtils, async () => { }, async () => { }, () => { }, () => { }, () => { })
    await externalAccessToOtherLnd.Warmup()

    const thirdLndSetting = { ...settings.lndSettings, mainNode: settings.lndSettings.thirdNode }
    const externalAccessToThirdLnd = new LND(thirdLndSetting, new LiquidityProvider("", extermnalUtils, async () => { }, async () => { }), extermnalUtils, async () => { }, async () => { }, () => { }, () => { }, () => { })
    await externalAccessToThirdLnd.Warmup()


    return {
        expect, main, app,
        user1, user2,
        /* externalAccessToMainLnd, */ externalAccessToOtherLnd, externalAccessToThirdLnd,
        d,
        adminManager: initialized.adminManager,
        chainTools
    }
}

export const teardown = async (T: TestBase) => {
    T.main.Stop()
    /* T.externalAccessToMainLnd.Stop() */
    T.externalAccessToOtherLnd.Stop()
    T.externalAccessToThirdLnd.Stop()
    T.adminManager.Stop()
    resetDisabledLoggers()
    console.log("teardown")
}

export const safelySetUserBalance = async (T: TestBase, user: TestUserData, amount: number) => {
    const app = await T.main.storage.applicationStorage.GetApplication(user.appId)
    const invoice = await T.main.paymentManager.NewInvoice(user.userId, { amountSats: amount, memo: "test" }, { linkedApplication: app, expiry: defaultInvoiceExpiry })
    await T.externalAccessToOtherLnd.PayInvoice(invoice.invoice, 0, 100, amount, { from: 'system', useProvider: false })
    const u = await T.main.storage.userStorage.GetUser(user.userId)
    expect(u.balance_sats).to.be.equal(amount)
    T.d(`user ${user.appUserIdentifier} balance is now ${amount}`)
}

export const runSanityCheck = async (T: TestBase) => {
    const sanityChecker = new SanityChecker(T.main.storage, T.main.lnd)
    await sanityChecker.VerifyEventsLog()
}

export const expectThrowsAsync = async (promise: Promise<any>, errorMessage?: string) => {
    let error: Error | null = null
    try {
        await promise
    }
    catch (err: any) {
        error = err as Error
    }
    expect(error).to.be.an('Error')
    console.log(error!.message)
    if (errorMessage) {
        expect(error!.message).to.equal(errorMessage)
    }
}