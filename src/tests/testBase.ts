import 'dotenv/config' // TODO - test env
import chai from 'chai'
import { AppData, initMainHandler } from '../services/main/init.js'
import Main from '../services/main/index.js'
import Storage from '../services/storage/index.js'
import { User } from '../services/storage/entity/User.js'
import { LoadMainSettingsFromEnv, LoadTestSettingsFromEnv, MainSettings } from '../services/main/settings.js'
import chaiString from 'chai-string'
import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import SanityChecker from '../services/main/sanityChecker.js'
import LND from '../services/lnd/lnd.js'
import { LightningHandler } from '../services/lnd/index.js'
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
    externalAccessToMainLnd: LND
    externalAccessToOtherLnd: LND
    d: Describe
}

export const SetupTest = async (d: Describe): Promise<TestBase> => {
    const settings = LoadTestSettingsFromEnv()
    const initialized = await initMainHandler(console.log, settings)
    if (!initialized) {
        throw new Error("failed to initialize main handler")
    }
    const main = initialized.mainHandler
    const app = initialized.apps[0]
    const u1 = await main.applicationManager.AddAppUser(app.appId, { identifier: "user1", balance: 0, fail_if_exists: true })
    const u2 = await main.applicationManager.AddAppUser(app.appId, { identifier: "user2", balance: 0, fail_if_exists: true })
    const user1 = { userId: u1.info.userId, appUserIdentifier: u1.identifier, appId: app.appId }
    const user2 = { userId: u2.info.userId, appUserIdentifier: u2.identifier, appId: app.appId }


    const externalAccessToMainLnd = new LND(settings.lndSettings, console.log, console.log, () => { }, () => { })
    const otherLndSetting = { ...settings.lndSettings, lndCertPath: settings.lndSettings.otherLndCertPath, lndMacaroonPath: settings.lndSettings.otherLndMacaroonPath, lndAddr: settings.lndSettings.otherLndAddr }
    const externalAccessToOtherLnd = new LND(otherLndSetting, console.log, console.log, () => { }, () => { })
    await externalAccessToMainLnd.Warmup()
    await externalAccessToOtherLnd.Warmup()


    return {
        expect, main, app,
        user1, user2,
        externalAccessToMainLnd, externalAccessToOtherLnd,
        d
    }
}

export const teardown = async (T: TestBase) => {
    T.main.paymentManager.watchDog.Stop()
    T.main.lnd.Stop()
    T.externalAccessToMainLnd.Stop()
    T.externalAccessToOtherLnd.Stop()
    console.log("teardown")
}

export const safelySetUserBalance = async (T: TestBase, user: TestUserData, amount: number) => {
    const app = await T.main.storage.applicationStorage.GetApplication(user.appId)
    const invoice = await T.main.paymentManager.NewInvoice(user.userId, { amountSats: amount, memo: "test" }, { linkedApplication: app, expiry: defaultInvoiceExpiry })
    await T.externalAccessToOtherLnd.PayInvoice(invoice.invoice, 0, 100)
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