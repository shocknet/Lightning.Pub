import { LiquidityProvider } from "../services/main/liquidityProvider.js"
import { RugPullTracker } from "../services/main/rugPullTracker.js"
import { Utils } from "../services/helpers/utilsWrapper.js"
import { NostrSender } from "../services/nostr/sender.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

type StubState = {
    ready: boolean
    known: boolean
    latest: number
    pending: number
}

type Harness = {
    T: StorageTestBase
    utils: Utils
    lp: LiquidityProvider
}

const peerPub = (n: number) => n.toString(16).padStart(64, "c")

const setupHarness = (T: StorageTestBase): Harness => {
    const pub = peerPub(Date.now())
    const utils = new Utils({
        dataDir: T.storage.getStorageSettings().dataDir,
        allowResetMetricsStorages: true,
        noCollector: true,
    }, new NostrSender())
    const lp = new LiquidityProvider(
        () => ({
            liquidityProviderPub: pub,
            disableLiquidityProvider: false,
            useOnlyLiquidityProvider: false,
            providerRelayUrl: "",
        }),
        utils,
        async () => { },
        async () => { },
    )
    return { T, utils, lp }
}

const newTracker = (h: Harness) => new RugPullTracker(h.T.storage, h.lp)

const stubProvider = (lp: LiquidityProvider, pub: string, state: StubState) => {
    lp.GetProviderPubkey = () => pub
    lp.IsReady = () => state.ready
    lp.HasKnownBalance = () => state.known
    lp.GetLatestBalance = () => state.latest
    lp.GetPendingBalance = async () => state.pending
    lp.refreshBalanceIfUnknown = async () => { }
}

const seedTrackedBalance = async (h: Harness, pub: string, latestBalance: number) => {
    await h.T.storage.liquidityStorage.CreateTrackedProvider("lnPub", pub, latestBalance)
}

export default async (T: StorageTestBase) => {
    const h = setupHarness(T)
    try {
        await testUnknownZeroDoesNotRug(h)
        await testKnownZeroDoesRug(h)
        await testRetrySnapshotMatchingBalanceDoesNotRug(h)
        await testKnownMatchingBalanceDoesNotRug(h)
    } finally {
        h.utils.Stop()
    }
}

const testUnknownZeroDoesNotRug = async (h: Harness) => {
    h.T.d("starting testUnknownZeroDoesNotRug")
    const pub = peerPub(Date.now() + 1)
    await seedTrackedBalance(h, pub, 10145)
    stubProvider(h.lp, pub, { ready: true, known: false, latest: 0, pending: 0 })
    const tracker = newTracker(h)
    const res = await tracker.CheckProviderBalance()
    h.T.expect(res.balance).to.equal(10145)
    h.T.expect(tracker.HasProviderRugPulled()).to.equal(false)
    const stored = await h.T.storage.liquidityStorage.GetTrackedProvider("lnPub", pub)
    h.T.expect(stored?.latest_distruption_at_unix).to.equal(0)
    h.T.d("unknown provider snapshot is not treated as a 0-sat rug")
}

const testKnownZeroDoesRug = async (h: Harness) => {
    h.T.d("starting testKnownZeroDoesRug")
    const pub = peerPub(Date.now() + 2)
    await seedTrackedBalance(h, pub, 10145)
    stubProvider(h.lp, pub, { ready: true, known: true, latest: 0, pending: 0 })
    const tracker = newTracker(h)
    const first = await tracker.CheckProviderBalance()
    h.T.expect(first.balance).to.equal(0)
    h.T.expect(first.prevBalance).to.equal(10145)
    h.T.expect(tracker.HasProviderRugPulled()).to.equal(true)
    const afterDetect = await h.T.storage.liquidityStorage.GetTrackedProvider("lnPub", pub)
    h.T.expect(afterDetect && afterDetect.latest_distruption_at_unix > 0).to.equal(true)
    const second = await tracker.CheckProviderBalance()
    h.T.expect(second.balance).to.equal(0)
    h.T.expect(tracker.HasProviderRugPulled()).to.equal(true)
    h.T.d("confirmed 0-sat snapshot against 10145 is a rug, including ongoing")
}

const testRetrySnapshotMatchingBalanceDoesNotRug = async (h: Harness) => {
    h.T.d("starting testRetrySnapshotMatchingBalanceDoesNotRug")
    const pub = peerPub(Date.now() + 3)
    await seedTrackedBalance(h, pub, 10145)
    const state: StubState = { ready: true, known: false, latest: 0, pending: 0 }
    stubProvider(h.lp, pub, state)
    h.lp.refreshBalanceIfUnknown = async () => {
        state.known = true
        state.latest = 10145
    }
    const tracker = newTracker(h)
    const res = await tracker.CheckProviderBalance()
    h.T.expect(res.balance).to.equal(10145)
    h.T.expect(tracker.HasProviderRugPulled()).to.equal(false)
    h.T.d("watchdog retry that fills in the real snapshot does not rug")
}

const testKnownMatchingBalanceDoesNotRug = async (h: Harness) => {
    h.T.d("starting testKnownMatchingBalanceDoesNotRug")
    const pub = peerPub(Date.now() + 4)
    await seedTrackedBalance(h, pub, 10145)
    stubProvider(h.lp, pub, { ready: true, known: true, latest: 10145, pending: 0 })
    const tracker = newTracker(h)
    const res = await tracker.CheckProviderBalance()
    h.T.expect(res.balance).to.equal(10145)
    h.T.expect(tracker.HasProviderRugPulled()).to.equal(false)
    h.T.d("matching confirmed snapshot does not rug")
}
