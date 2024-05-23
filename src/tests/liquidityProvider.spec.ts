import { initMainHandler } from '../services/main/init.js'
import { LoadTestSettingsFromEnv } from '../services/main/settings.js'
import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { runSanityCheck, safelySetUserBalance, TestBase } from './testBase.js'
export const ignore = false
export const dev = true



export default async (T: TestBase) => {
    await safelySetUserBalance(T, T.user1, 2000)
    const bootstrapped = await initBootstrappedInstance(T)
    bootstrapped.appUserManager.NewInvoice({ app_id: T.user1.appId, user_id: T.user1.userId, app_user_id: T.user1.appUserIdentifier }, { amountSats: 2000, memo: "liquidityTest" })
    await runSanityCheck(T)
}

const initBootstrappedInstance = async (T: TestBase) => {
    const settings = LoadTestSettingsFromEnv()
    settings.lndSettings.useOnlyLiquidityProvider = true
    const initialized = await initMainHandler(console.log, settings)
    if (!initialized) {
        throw new Error("failed to initialize bootstrapped main handler")
    }
    const { mainHandler: bootstrapped, liquidityProviderInfo } = initialized

    bootstrapped.liquidProvider.attachNostrSend((identifier, data, r) => {
        console.log(identifier, data)
    })
    bootstrapped.liquidProvider.setNostrInfo({ clientId: liquidityProviderInfo.clientId, myPub: liquidityProviderInfo.publicKey })
    return bootstrapped
}