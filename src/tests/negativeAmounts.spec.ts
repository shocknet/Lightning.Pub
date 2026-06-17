import { defaultInvoiceExpiry } from "../services/storage/paymentStorage.js"
import { expectThrowsAsync, runSanityCheck, safelySetUserBalance, TestBase } from "./testBase.js"

export const ignore = false
export const dev = false

const testPayInvoiceRejectsNegativeAmount = async (T: TestBase) => {
    T.d("starting testPayInvoiceRejectsNegativeAmount")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoice = await T.externalAccessToOtherLnd.NewInvoice(0, "zero amount", defaultInvoiceExpiry, { from: "system", useProvider: false })
    await expectThrowsAsync(
        T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoice.payRequest, amount: -100 }, application),
        "amount cannot be negative",
    )
    T.d("PayInvoice rejects negative amount on zero-value invoice")
}

const testPayInternalInvoiceRejectsNegativeAmount = async (T: TestBase) => {
    T.d("starting testPayInternalInvoiceRejectsNegativeAmount")
    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const invoice = await T.main.paymentManager.NewInvoice(T.user2.userId, { amountSats: 1000, memo: "test" }, { linkedApplication: application, expiry: defaultInvoiceExpiry })
    const internalInvoice = await T.main.storage.paymentStorage.GetInvoiceOwner(invoice.invoice)
    T.expect(internalInvoice).to.not.equal(null)
    await expectThrowsAsync(
        T.main.paymentManager.PayInternalInvoice(T.user1.userId, internalInvoice!, { payAmount: -100, serviceFee: 10 }, application),
        "amount cannot be negative",
    )
    T.d("PayInternalInvoice rejects negative payAmount")
}

const testIncrementUserBalanceRejectsNegativeAmount = async (T: TestBase) => {
    T.d("starting testIncrementUserBalanceRejectsNegativeAmount")
    const user = await T.main.storage.userStorage.GetUser(T.user1.userId)
    const balanceBefore = user.balance_sats
    await expectThrowsAsync(
        T.main.storage.userStorage.IncrementUserBalance(T.user1.userId, -100, "negative increment test"),
        "increment cannot be negative",
    )
    const userAfter = await T.main.storage.userStorage.GetUser(T.user1.userId)
    T.expect(userAfter.balance_sats).to.equal(balanceBefore)
    T.d("IncrementUserBalance rejects negative increment and leaves balance unchanged")
}

const testDecrementUserBalanceRejectsNegativeAmount = async (T: TestBase) => {
    T.d("starting testDecrementUserBalanceRejectsNegativeAmount")
    const user = await T.main.storage.userStorage.GetUser(T.user1.userId)
    const balanceBefore = user.balance_sats
    await expectThrowsAsync(
        T.main.storage.userStorage.DecrementUserBalance(T.user1.userId, -100, "negative decrement test"),
        "decrement cannot be negative",
    )
    const userAfter = await T.main.storage.userStorage.GetUser(T.user1.userId)
    T.expect(userAfter.balance_sats).to.equal(balanceBefore)
    T.d("DecrementUserBalance rejects negative decrement and leaves balance unchanged")
}

export default async (T: TestBase) => {
    await safelySetUserBalance(T, T.user1, 2000)
    await testPayInvoiceRejectsNegativeAmount(T)
    await testPayInternalInvoiceRejectsNegativeAmount(T)
    await testIncrementUserBalanceRejectsNegativeAmount(T)
    await testDecrementUserBalanceRejectsNegativeAmount(T)
    await runSanityCheck(T)
}
