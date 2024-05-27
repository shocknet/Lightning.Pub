import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { runSanityCheck, safelySetUserBalance, TestBase } from './testBase.js'
export const ignore = false
export const dev = false

export default async (T: TestBase) => {
    await safelySetUserBalance(T, T.user1, 2000)
    await testSuccessfulUserPaymentToExternalNode(T)
    await testSuccessfulUserPaymentToExternalNode(T)
    await runSanityCheck(T)
}

const testSuccessfulUserPaymentToExternalNode = async (T: TestBase) => {
    T.d("starting testSuccessfulUserPaymentToExternalNode")
    const invoice = await T.externalAccessToOtherLnd.NewInvoice(500, "test", defaultInvoiceExpiry)
    const payment = await T.main.appUserManager.PayInvoice({ app_id: T.user1.appId, user_id: T.user1.userId, app_user_id: T.user1.appUserIdentifier }, { invoice: invoice.payRequest, amount: 0 })
    T.d("paid 500 sats invoice from user1 to external node")
}