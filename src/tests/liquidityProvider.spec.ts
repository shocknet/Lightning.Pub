import { disableLoggers } from '../services/helpers/logger.js'
import { runSanityCheck, safelySetUserBalance, TestBase, TestUserData } from './testBase.js'
import { initBootstrappedInstance } from './setupBootstrapped.js'
import Main from '../services/main/index.js'
import { AppData } from '../services/main/init.js'
export const ignore = false
export const dev = false



export default async (T: TestBase) => {
    disableLoggers([], ["EventsLogManager", "watchdog", "htlcTracker", "debugHtlcs", "debugLndBalancev3", "metrics", "mainForTest", "main"])
    await safelySetUserBalance(T, T.user1, 2000)
    T.d("starting liquidityProvider tests...")
    const { bootstrapped, bootstrappedUser, stop } = await initBootstrappedInstance(T)
    await testInboundPaymentFromProvider(T, bootstrapped, bootstrappedUser)
    await testOutboundPaymentFromProvider(T, bootstrapped, bootstrappedUser)
    stop()
    await runSanityCheck(T)
}

const testInboundPaymentFromProvider = async (T: TestBase, bootstrapped: Main, bUser: TestUserData) => {
    T.d("starting testInboundPaymentFromProvider")
    const invoiceRes = await bootstrapped.appUserManager.NewInvoice({ app_id: bUser.appId, user_id: bUser.userId, app_user_id: bUser.appUserIdentifier }, { amountSats: 3000, memo: "liquidityTest" })

    await T.externalAccessToOtherLnd.PayInvoice(invoiceRes.invoice, 0, 100, 3000, { from: 'system', useProvider: false })
    await new Promise((resolve) => setTimeout(resolve, 200))
    const userBalance = await bootstrapped.appUserManager.GetUserInfo({ app_id: bUser.appId, user_id: bUser.userId, app_user_id: bUser.appUserIdentifier })
    T.expect(userBalance.balance).to.equal(3000)
    T.d("user balance is 3000")
    const providerBalance = await bootstrapped.liquidityProvider.GetLatestBalance()
    T.expect(providerBalance).to.equal(3000)
    T.d("provider balance is 3000")
    T.d("testInboundPaymentFromProvider done")
}

const testOutboundPaymentFromProvider = async (T: TestBase, bootstrapped: Main, bootstrappedUser: TestUserData) => {
    T.d("starting testOutboundPaymentFromProvider")

    const invoice = await T.externalAccessToOtherLnd.NewInvoice(2000, "", 60 * 60, { from: 'system', useProvider: false })
    const ctx = { app_id: bootstrappedUser.appId, user_id: bootstrappedUser.userId, app_user_id: bootstrappedUser.appUserIdentifier }
    const res = await bootstrapped.appUserManager.PayInvoice(ctx, { invoice: invoice.payRequest, amount: 0 })

    const userBalance = await bootstrapped.appUserManager.GetUserInfo(ctx)
    T.expect(userBalance.balance).to.equal(988) // 3000 - (2000 + 12)

    const providerBalance = await bootstrapped.liquidityProvider.GetLatestBalance()
    T.expect(providerBalance).to.equal(988) // 3000 - (2000 + 12)
    T.d("testOutboundPaymentFromProvider done")
}