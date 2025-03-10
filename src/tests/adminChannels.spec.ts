import { defaultInvoiceExpiry } from '../services/storage/paymentStorage.js'
import { runSanityCheck, safelySetUserBalance, TestBase } from './testBase.js'
export const ignore = false
export const dev = false

export default async (T: TestBase) => {
    T.main.storage.dbs.setDebug(true)
    await safelySetUserBalance(T, T.user1, 2000)
    await openAdminChannel(T)
    await runSanityCheck(T)
}

const openAdminChannel = async (T: TestBase) => {
    T.d("starting openAdminChannel")
    const info = await T.externalAccessToThirdLnd.GetInfo()
    console.log(info)
    const otherPub = info.identityPubkey
    const openChannel = await T.main.adminManager.OpenChannel({
        node_pubkey: otherPub, local_funding_amount: 100000, sat_per_v_byte: 1
    })
    console.log(openChannel)
    T.d("opened admin channel")
}