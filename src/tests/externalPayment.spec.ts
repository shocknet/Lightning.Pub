import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { Describe, expect, expectThrowsAsync, runSanityCheck, safelySetUserBalance, SetupTest, TestBase } from './testBase.js'
export const ignore = false
export const dev = false
export default async (T: TestBase) => {
    T.main.storage.dbs.setDebug(true)
    await safelySetUserBalance(T, T.user1, 2000)
    await testSuccessfulExternalPayment(T)
    await testFailedExternalPayment(T)
    await runSanityCheck(T)
    T.main.storage.dbs.setDebug(false)
}


const testSuccessfulExternalPayment = async (T: TestBase) => {
    T.d("starting testSuccessfulExternalPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoice = await T.externalAccessToOtherLnd.NewInvoice(500, "test", defaultInvoiceExpiry, { from: 'system', useProvider: false })
    expect(invoice.payRequest).to.startWith("lnbcrt5u")
    T.d("generated 500 sats invoice for external node")

    const pay = await T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoice.payRequest, amount: 0 }, application)
    expect(pay.amount_paid).to.be.equal(500)
    T.d("paid 500 sats invoice from user1")
    const u1 = await T.main.storage.userStorage.GetUser(T.user1.userId)
    const owner = await T.main.storage.userStorage.GetUser(application.owner.user_id)
    expect(u1.balance_sats).to.be.equal(1496)
    T.d("user1 balance is now 1496 (2000 - (500 + 3 fee + 1 routing))")
    expect(owner.balance_sats).to.be.equal(3)
    T.d("app balance is 3 sats")

}

const testFailedExternalPayment = async (T: TestBase) => {
    T.d("starting testFailedExternalPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoice = await T.externalAccessToOtherLnd.NewInvoice(1500, "test", defaultInvoiceExpiry, { from: 'system', useProvider: false })
    expect(invoice.payRequest).to.startWith("lnbcrt15u")
    T.d("generated 1500 sats invoice for external node")

    await expectThrowsAsync(T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoice.payRequest, amount: 0 }, application), "not enough balance to decrement")
    T.d("payment failed as expected, with the expected error message")
    const u1 = await T.main.storage.userStorage.GetUser(T.user1.userId)
    expect(u1.balance_sats).to.be.equal(1496)
    T.d("user1 balance is still 1496")
    const owner = await T.main.storage.userStorage.GetUser(application.owner.user_id)
    expect(owner.balance_sats).to.be.equal(3)
    T.d("app balance is still 3 sats")
}