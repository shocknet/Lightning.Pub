import {
    LiquiditySettings, LoadBitcoinCoreSettingsFromEnv, LoadLndNodeSettingsFromEnv,
    LoadLndSettingsFromEnv, LoadBobLndSettingsFromEnv
} from "../services/main/settings.js"
import { GetTestStorageSettings } from "../services/storage/index.js"
import { BitcoinCoreWrapper } from "./bitcoinCore.js"
import LND, { LndHooks } from '../services/lnd/lnd.js'
import { LiquidityProvider } from "../services/main/liquidityProvider.js"
import { Utils } from "../services/helpers/utilsWrapper.js"
import { LoadStorageSettingsFromEnv } from "../services/storage/index.js"
import { NostrSender } from "../services/nostr/sender.js"

type PeerInfo = { pubkey: string, host: string }

export type ChainTools = {
    mine: (amount: number) => Promise<void>
    sendToAddress: (address: string, amount: number) => Promise<void>
    aliceInfo: PeerInfo
    bobInfo: PeerInfo
    carolInfo: PeerInfo
    daveInfo: PeerInfo
}

const carolInfo: PeerInfo = { pubkey: '0232842d81b2423df97aa8a264f8c0811610a736af65afe2e145279f285625c1e4', host: "carol:9735" }
const daveInfo: PeerInfo = { pubkey: '027c50fde118af534ff27e59da722422d2f3e06505c31e94c1b40c112c48a83b1c', host: "dave:9735" }

export const setupNetwork = async (): Promise<ChainTools> => {
    const storageSettings = GetTestStorageSettings(LoadStorageSettingsFromEnv())
    const nostrSender = new NostrSender()
    const setupUtils = new Utils({ dataDir: storageSettings.dataDir, allowResetMetricsStorages: storageSettings.allowResetMetricsStorages }, nostrSender)
    //const settingsManager = new SettingsManager(storageSettings)
    const core = new BitcoinCoreWrapper(LoadBitcoinCoreSettingsFromEnv())
    await core.InitAddress()
    await core.Mine(1)
    const lndSettings = LoadLndSettingsFromEnv({})
    const lndNodeSettings = LoadLndNodeSettingsFromEnv({})
    const secondLndNodeSettings = LoadBobLndSettingsFromEnv()
    const liquiditySettings: LiquiditySettings = { disableLiquidityProvider: true, liquidityProviderPub: "", useOnlyLiquidityProvider: false, providerRelayUrl: "" }
    const hooks: LndHooks = {
        unlockLnd: async () => 'unlocked',
        addressPaidCb: async () => { },
        invoicePaidCb: async () => { },
        newBlockCb: async () => { },
        htlcCb: async () => { },
        channelEventCb: async () => { },
        newAddressCb: async () => { },
    }
    const alice = new LND(() => ({ lndSettings, lndNodeSettings }), new LiquidityProvider(() => liquiditySettings, setupUtils, async () => { }, async () => { }), setupUtils, hooks)
    const bob = new LND(() => ({ lndSettings, lndNodeSettings: secondLndNodeSettings }), new LiquidityProvider(() => liquiditySettings, setupUtils, async () => { }, async () => { }), setupUtils, hooks)
    await tryUntil<void>(async i => {
        const peers = await alice.ListPeers()
        if (peers.peers.length > 0) {
            return
        }
        await alice.ConnectPeer(carolInfo)
        await alice.ConnectPeer(daveInfo)
    }, 10, 8000)
    await tryUntil<void>(async i => {
        const { channels } = await alice.ListChannels()
        if (channels.some(c => c.active)) {
            return
        }
        throw new Error("alice has no active channels")
    }, 10, 6000)
    await tryUntil<void>(async i => {
        const peers = await bob.ListPeers()
        if (peers.peers.length > 0) {
            return
        }
        await bob.ConnectPeer(carolInfo)
    }, 10, 8000)
    await tryUntil<void>(async i => {
        const { channels } = await bob.ListChannels()
        if (channels.some(c => c.active)) {
            return
        }
        throw new Error("bob has no active channels")
    }, 10, 6000)

    const alicePubkey = await tryUntil<string>(async i => {
        const info = await alice.GetInfo()
        if (!info.syncedToChain) {
            throw new Error("alice not synced to chain")
        }
        if (!info.syncedToGraph) {
            //await lnd.ConnectPeer({})
            throw new Error("alice not synced to graph")
        }
        return info.identityPubkey
    }, 10, 8000)

    const aliceInfo: PeerInfo = { pubkey: alicePubkey, host: "alice:9735", }

    const bobPubkey = await tryUntil<string>(async i => {
        const info = await bob.GetInfo()
        if (!info.syncedToChain) {
            throw new Error("bob not synced to chain")
        }
        if (!info.syncedToGraph) {
            //await lnd.ConnectPeer({})
            throw new Error("bob not synced to graph")
        }
        return info.identityPubkey
    }, 10, 8000)

    const bobInfo: PeerInfo = { pubkey: bobPubkey, host: "bob:9735" }

    console.log("network setup complete, waiting for graph to settle...")
    await new Promise(resolve => setTimeout(resolve, 15000))

    alice.Stop()
    bob.Stop()
    return {
        mine: (amount: number) => core.Mine(amount),
        sendToAddress: (address: string, amount: number) => core.SendToAddress(address, amount),
        aliceInfo, bobInfo, carolInfo, daveInfo
    }
}

export const tryUntil = async <T>(fn: (attempt: number) => Promise<T>, maxTries: number, interval: number) => {
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