import { LoadTestSettingsFromEnv } from "../services/main/settings.js"
import { BitcoinCoreWrapper } from "./bitcoinCore.js"
import LND from '../services/lnd/lnd.js'
import { LiquidityProvider } from "../services/lnd/liquidityProvider.js"

export const setupNetwork = async () => {
    const settings = LoadTestSettingsFromEnv()
    const core = new BitcoinCoreWrapper(settings)
    await core.InitAddress()
    await core.Mine(1)
    const alice = new LND(settings.lndSettings, { liquidProvider: new LiquidityProvider("", () => { }) }, () => { }, () => { }, () => { }, () => { })
    const bob = new LND({ ...settings.lndSettings, mainNode: settings.lndSettings.otherNode }, { liquidProvider: new LiquidityProvider("", () => { }) }, () => { }, () => { }, () => { }, () => { })
    await tryUntil<void>(async i => {
        const peers = await alice.ListPeers()
        if (peers.peers.length > 0) {
            return
        }
        await alice.ConnectPeer({ pubkey: '0232842d81b2423df97aa8a264f8c0811610a736af65afe2e145279f285625c1e4', host: "carol:9735" })
        await alice.ConnectPeer({ pubkey: '027c50fde118af534ff27e59da722422d2f3e06505c31e94c1b40c112c48a83b1c', host: "dave:9735" })
    }, 15, 2000)
    await tryUntil<void>(async i => {
        const peers = await bob.ListPeers()
        if (peers.peers.length > 0) {
            return
        }
        await bob.ConnectPeer({ pubkey: '0232842d81b2423df97aa8a264f8c0811610a736af65afe2e145279f285625c1e4', host: "carol:9735" })
    }, 15, 2000)

    await tryUntil<void>(async i => {
        const info = await alice.GetInfo()
        if (!info.syncedToChain) {
            throw new Error("alice not synced to chain")
        }
        if (!info.syncedToGraph) {
            //await lnd.ConnectPeer({})
            throw new Error("alice not synced to graph")
        }
    }, 15, 2000)

    await tryUntil<void>(async i => {
        const info = await bob.GetInfo()
        if (!info.syncedToChain) {
            throw new Error("bob not synced to chain")
        }
        if (!info.syncedToGraph) {
            //await lnd.ConnectPeer({})
            throw new Error("bob not synced to graph")
        }
    }, 15, 2000)

    alice.Stop()
    bob.Stop()
}

const tryUntil = async <T>(fn: (attempt: number) => Promise<T>, maxTries: number, interval: number) => {
    for (let i = 0; i < maxTries; i++) {
        try {
            return await fn(i)
        } catch (e) {
            console.log("tryUntil error", e)
            await new Promise(resolve => setTimeout(resolve, interval))
        }
    }
    throw new Error("tryUntil failed")
}