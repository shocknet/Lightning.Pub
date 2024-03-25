import 'dotenv/config' // TODO - test env
import chai from 'chai'
import { AppData, initMainHandler } from './init.js'
import Main from './index.js'
import { User } from '../storage/entity/User.js'
import { LoadMainSettingsFromEnv, LoadTestSettingsFromEnv, MainSettings } from './settings.js'
import chaiString from 'chai-string'
import { defaultInvoiceExpiry } from '../storage/paymentStorage.js'
chai.use(chaiString)
const expect = chai.expect
export const ignore = false
let main: Main
let app: AppData
let user1: { userId: string, appUserIdentifier: string, appId: string }
let user2: { userId: string, appUserIdentifier: string, appId: string }
export const setup = async () => {
    const settings = LoadTestSettingsFromEnv()
    const initialized = await initMainHandler(console.log, settings)
    if (!initialized) {
        throw new Error("failed to initialize main handler")
    }
    main = initialized.mainHandler
    app = initialized.apps[0]
    const u1 = await main.applicationManager.AddAppUser(app.appId, { identifier: "user1", balance: 0, fail_if_exists: true })
    const u2 = await main.applicationManager.AddAppUser(app.appId, { identifier: "user2", balance: 2000, fail_if_exists: true })
    user1 = { userId: u1.info.userId, appUserIdentifier: u1.identifier, appId: app.appId }
    user2 = { userId: u2.info.userId, appUserIdentifier: u2.identifier, appId: app.appId }
}
export const teardown = () => {
    console.log("teardown")
}

export default async (d: (message: string, failure?: boolean) => void) => {
    const application = await main.storage.applicationStorage.GetApplication(app.appId)
    const invoice = await main.paymentManager.NewInvoice(user1.userId, { amountSats: 1000, memo: "test" }, { linkedApplication: application, expiry: defaultInvoiceExpiry })
    expect(invoice.invoice).to.startWith("lnbcrtmockin")
    d("got the invoice")

    const pay = await main.paymentManager.PayInvoice(user2.userId, { invoice: invoice.invoice, amount: 0 }, application)
    expect(pay.amount_paid).to.be.equal(1000)
    const u1 = await main.storage.userStorage.GetUser(user1.userId)
    const u2 = await main.storage.userStorage.GetUser(user2.userId)
    const owner = await main.storage.userStorage.GetUser(application.owner.user_id)
    expect(u1.balance_sats).to.be.equal(1000)
    expect(u2.balance_sats).to.be.equal(994)
    expect(owner.balance_sats).to.be.equal(6)
}