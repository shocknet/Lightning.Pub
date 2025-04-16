import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { Describe, expect, expectThrowsAsync, runSanityCheck, safelySetUserBalance, TestBase } from './testBase.js'
export const ignore = false
export const dev = false
export default async (T: TestBase) => {
    await safelySetUserBalance(T, T.user1, 2000)
    await testSuccessfulU2UPayment(T)
    await testFailedInternalPayment(T)
    await runSanityCheck(T)
}

const testSuccessfulU2UPayment = async (T: TestBase) => {
    T.d("starting testSuccessfulU2UPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const sentAmt = await T.main.paymentManager.SendUserToUserPayment(T.user1.userId, T.user2.userId, 1000, application)
    expect(sentAmt.amount).to.be.equal(1000)
    T.d("paid 1000 sats u2u from user1 to user2")
    const u1 = await T.main.storage.userStorage.GetUser(T.user1.userId)
    const u2 = await T.main.storage.userStorage.GetUser(T.user2.userId)
    const owner = await T.main.storage.userStorage.GetUser(application.owner.user_id)
    expect(u2.balance_sats).to.be.equal(1000)
    T.d("user2 balance is 1000")
    expect(u1.balance_sats).to.be.equal(994)
    T.d("user1 balance is 994 cuz he paid 6 sats fee")
    expect(owner.balance_sats).to.be.equal(6)
    T.d("app balance is 6 sats")
}

const testFailedInternalPayment = async (T: TestBase) => {
    T.d("starting testFailedInternalPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    await expectThrowsAsync(T.main.paymentManager.SendUserToUserPayment(T.user1.userId, T.user2.userId, 1000, application), "not enough balance to send payment")
    T.d("payment failed as expected, with the expected error message")
}

