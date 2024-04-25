import { LoadTestSettingsFromEnv } from "../services/main/settings.js"
import { BitcoinCoreWrapper } from "./bitcoinCore.js"
import LND from '../services/lnd/lnd.js'
export const setupNetwork = async () => {

    const settings = LoadTestSettingsFromEnv()
    //const core = new BitcoinCoreWrapper(settings)
    //await core.InitAddress()
    //await core.Mine(1)
    const lnd = new LND(settings.lndSettings, () => { }, () => { }, () => { }, () => { })
    for (let i = 0; i < 30; i++) {
        try {
            const info = await lnd.GetInfo()
            if (!info.syncedToChain) {
                throw new Error("not synced to chain")
            }
            if (!info.syncedToGraph) {
                //await lnd.ConnectPeer({})
                throw new Error("not synced to graph")
            }
            return
        } catch (e) {
            console.log("waiting for lnd to be ready", e)
            console.log(await lnd.ListPeers())
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }
    throw new Error("lnd is not ready after 30 seconds")
}