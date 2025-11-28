import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { Describe, expect, expectThrowsAsync, runSanityCheck, safelySetUserBalance, TestBase } from './testBase.js'
export const ignore = false

export default async (T: TestBase) => {
    await safelySetUserBalance(T, T.user1, 2000)
    await testSuccessfulInternalPayment(T)
    await testFailedInternalPayment(T)
    await runSanityCheck(T)
}

const testSuccessfulInternalPayment = async (T: TestBase) => {
    T.d("starting testSuccessfulInternalPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoice = await T.main.paymentManager.NewInvoice(T.user2.userId, { amountSats: 1000, memo: "test" }, { linkedApplication: application, expiry: defaultInvoiceExpiry })
    expect(invoice.invoice).to.startWith("lnbcrt10u")
    T.d("generated 1000 sats invoice for user2")
    const pay = await T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoice.invoice, amount: 0 }, application)
    expect(pay.amount_paid).to.be.equal(1000)
    T.d("paid 1000 sats invoice from user1")
    const u1 = await T.main.storage.userStorage.GetUser(T.user1.userId)
    const u2 = await T.main.storage.userStorage.GetUser(T.user2.userId)
    const owner = await T.main.storage.userStorage.GetUser(application.owner.user_id)
    expect(u2.balance_sats).to.be.equal(1000)
    T.d("user2 balance is 1000")
    expect(u1.balance_sats).to.be.equal(990)
    T.d("user1 balance is 990 cuz he paid 10 sats fee")
    expect(owner.balance_sats).to.be.equal(10)
    T.d("app balance is 10 sats")
}

const testFailedInternalPayment = async (T: TestBase) => {
    T.d("starting testFailedInternalPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoice = await T.main.paymentManager.NewInvoice(T.user2.userId, { amountSats: 1000, memo: "test" }, { linkedApplication: application, expiry: defaultInvoiceExpiry })
    expect(invoice.invoice).to.startWith("lnbcrt10u")
    T.d("generated 1000 sats invoice for user2")
    await expectThrowsAsync(T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoice.invoice, amount: 0 }, application), "not enough balance to decrement")
    T.d("payment failed as expected, with the expected error message")
}

