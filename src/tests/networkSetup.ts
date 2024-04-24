// @ts-ignore
import BitcoinCore from 'bitcoin-core';
import { LoadTestSettingsFromEnv, TestSettings } from "../services/main/settings.js"
import LND from '../services/lnd/lnd.js'
// dave <--> alice <--> carol <--> bob
export const setupNetwork = async () => {
    const settings = LoadTestSettingsFromEnv()
    const core = await initBitcoinCore(settings)
    const { alice, bob, carol, dave } = await initLndInstances(settings)
}

const initLndInstances = async (settings: TestSettings) => {
    const alice = new LND(settings.lndSettings, console.log, console.log, () => { }, () => { })
    await alice.Warmup()

    const bobSettings = { ...settings.lndSettings, mainNode: settings.lndSettings.otherNode }
    const bob = new LND(bobSettings, console.log, console.log, () => { }, () => { })
    await bob.Warmup()

    const carolSettings = { ...settings.lndSettings, mainNode: settings.lndSettings.thirdNode }
    const carol = new LND(carolSettings, console.log, console.log, () => { }, () => { })
    await carol.Warmup()

    const daveSettings = { ...settings.lndSettings, mainNode: settings.lndSettings.fourthNode }
    const dave = new LND(daveSettings, console.log, console.log, () => { }, () => { })
    await dave.Warmup()
    return { alice, bob, carol, dave }
}

const initBitcoinCore = async (settings: TestSettings) => {
    const core = new BitcoinCore({
        //network: 'regtest',
        host: '127.0.0.1',
        port: `${settings.bitcoinCoreSettings.port}`,
        username: settings.bitcoinCoreSettings.user,
        password: settings.bitcoinCoreSettings.pass,
        // use a long timeout due to the time it takes to mine a lot of blocks
        timeout: 5 * 60 * 1000,
    })
    const wallet = await core.createWallet('');
    console.log({ wallet })
    const addr = await core.getNewAddress()
    console.log({ addr })
    await core.generateToAddress(101, addr)
    const info = await core.getWalletInfo();
    console.log({ info })
}