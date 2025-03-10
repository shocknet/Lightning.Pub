import { disableLoggers } from '../services/helpers/logger.js'
import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { Describe, expect, expectThrowsAsync, runSanityCheck, safelySetUserBalance, SetupTest, TestBase } from './testBase.js'
export const ignore = false

export default async (T: TestBase) => {
    disableLoggers([], ["EventsLogManager", "htlcTracker", "watchdog"])
    await safelySetUserBalance(T, T.user1, 2000)
    await testSpamExternalPayment(T)
    await runSanityCheck(T)
}


const testSpamExternalPayment = async (T: TestBase) => {
    T.d("starting testSpamExternalPayment")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoices = await Promise.all(new Array(10).fill(0).map(() => T.externalAccessToOtherLnd.NewInvoice(500, "test", defaultInvoiceExpiry, { from: 'system', useProvider: false })))
    T.d("generated 10 500 sats invoices for external node")
    const res = await Promise.all(invoices.map(async (invoice, i) => {
        try {
            const result = await T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoice.payRequest, amount: 0 }, application)
            return { success: true, result }
        } catch (e: any) {
            return { success: false, err: e }
        }
    }))

    const successfulPayments = res.filter(r => r.success)
    const failedPayments = res.filter(r => !r.success)
    failedPayments.forEach(f => expect(f.err).to.be.equal("Error: not enough balance to decrement"))
    successfulPayments.forEach(s => expect(s.result).to.contain({ amount_paid: 500, network_fee: 1, service_fee: 3 }))
    expect(successfulPayments.length).to.be.equal(3)
    expect(failedPayments.length).to.be.equal(7)
    T.d("3 payments succeeded, 7 failed as expected")
    const u = await T.main.storage.userStorage.GetUser(T.user1.userId)
    const owner = await T.main.storage.userStorage.GetUser(application.owner.user_id)
    expect(u.balance_sats).to.be.equal(488)
    T.d("user1 balance is now 488 (2000 - (500 + 3 fee + 1 routing) * 3)")
    expect(owner.balance_sats).to.be.equal(9)
    T.d("app balance is 9 sats")

}

