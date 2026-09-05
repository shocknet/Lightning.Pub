import { decodeBech32 } from "@shocknet/clink-sdk"
import { NostrEvent } from "../services/nostr/nostrPool.js"
import { countLeadingZeroBits, enrollPowSatisfied, parseNip13Nonce } from "../services/helpers/nip13.js"
import { buildClinkBeaconContent, buildServiceBeaconEvent, operatorPubkeyHex } from "../services/helpers/clinkBeacon.js"
import { CLINK_BEACON_D_TAG, CLINK_ENROLL_KIND, CLINK_VERSION, LEGACY_BEACON_D_TAG } from "../services/helpers/clinkConstants.js"
import { EnrollManager } from "../services/main/enrollManager.js"
import { EnrollRateLimiter, EnrollReplyGate } from "../services/helpers/enrollRateLimit.js"
import SettingsManager from "../services/main/settingsManager.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

const enrollPub = (n: number) => n.toString(16).padStart(64, "a")

type Harness = {
    T: StorageTestBase
    enroll: EnrollManager
    settings: SettingsManager
    appId: string
    publicKey: string
}

const enrollEvent = (h: Harness, pub: string, overrides: Partial<NostrEvent> = {}): NostrEvent => ({
    id: "f".repeat(64),
    pub,
    content: "{}",
    appId: h.appId,
    startAtNano: "0",
    startAtMs: Date.now(),
    kind: CLINK_ENROLL_KIND,
    tags: [["p", h.publicKey], ["clink_version", CLINK_VERSION]],
    created_at: Math.floor(Date.now() / 1000),
    ...overrides,
})

const setEnrollPowBits = (h: Harness, bits: number) => {
    h.settings.OverrideTestSettings(s => {
        s.nostrRelaySettings.enrollPowBits = bits
        return s
    })
}

const setupHarness = async (T: StorageTestBase): Promise<Harness> => {
    const settings = new SettingsManager(T.storage)
    await settings.InitSettings()
    settings.OverrideTestSettings(s => {
        s.nostrRelaySettings.enrollPowBits = 0
        if (!s.nostrRelaySettings.relays[0]) {
            s.nostrRelaySettings.relays = ["wss://relay.lightning.pub"]
        }
        return s
    })
    const app = await T.storage.applicationStorage.AddApplication(`enroll-app-${Date.now()}`, true)
    const keys = await T.storage.applicationStorage.GenerateApplicationKeys(app)
    return {
        T,
        settings,
        enroll: new EnrollManager(T.storage, settings),
        appId: keys.appId,
        publicKey: keys.publicKey,
    }
}

const testNip13Helpers = (T: StorageTestBase) => {
    T.d("starting testNip13Helpers")
    T.expect(countLeadingZeroBits("0".repeat(64))).to.equal(256)
    T.expect(countLeadingZeroBits("f".repeat(64))).to.equal(0)
    T.expect(countLeadingZeroBits("1" + "f".repeat(63))).to.equal(3)
    T.expect(parseNip13Nonce([["nonce", "1", "18"]])).to.deep.equal({ counter: "1", targetDifficulty: 18 })
    T.expect(enrollPowSatisfied("f".repeat(64), [], 0)).to.equal(true)
    T.expect(enrollPowSatisfied("f".repeat(64), [], 8)).to.equal(false)
    T.expect(enrollPowSatisfied("0".repeat(64), [["nonce", "1", "8"]], 8)).to.equal(true)
    T.expect(enrollPowSatisfied("0".repeat(64), [["nonce", "1", "4"]], 8)).to.equal(false)
    T.d("nip13 helpers count bits and enforce committed target")
}

const testEnrollCreateLimiter = (T: StorageTestBase) => {
    T.d("starting testEnrollCreateLimiter")
    let now = 1_000
    const limiter = new EnrollRateLimiter(2, 1_000, () => now)
    T.expect(limiter.tryCreate().ok).to.equal(true)
    T.expect(limiter.tryCreate().ok).to.equal(true)
    T.expect(limiter.tryCreate().ok).to.equal(false)
    now += 1_001
    T.expect(limiter.tryCreate().ok).to.equal(true)
    T.d("new account creates are capped per window")
}

const testEnrollReplyGateCapsPublishes = (T: StorageTestBase) => {
    T.d("starting testEnrollReplyGateCapsPublishes")
    let now = 1_000
    const gate = new EnrollReplyGate(1_000, 2, () => now)
    T.expect(gate.allow("aa".repeat(32))).to.equal(true)
    T.expect(gate.allow("aa".repeat(32))).to.equal(true)
    T.expect(gate.allow("aa".repeat(32))).to.equal(true)
    T.expect(gate.allow("aa".repeat(32))).to.equal(false)
    T.expect(gate.allow("bb".repeat(32))).to.equal(true)
    T.expect(gate.allow("cc".repeat(32))).to.equal(false)
    now += 1_001
    T.expect(gate.allow("aa".repeat(32))).to.equal(true)
    T.d("enroll publishes at most three per key per window including ok")
}

const testBeaconBuilders = (T: StorageTestBase) => {
    T.d("starting testBeaconBuilders")
    const app = { name: "wallet", avatar_url: "https://example.com/a.png" } as any
    const clinkContent = buildClinkBeaconContent({
        app,
        relays: ["wss://relay.lightning.pub"],
        fees: { serviceFeeFloor: 1, serviceFeeBps: 60 },
        enrollPowBits: 18,
        website: " https://example.com ",
        description: " Short blurb ",
    })
    T.expect(clinkContent.enroll_difficulty).to.equal(18)
    T.expect(clinkContent.supported_kinds).to.include(CLINK_ENROLL_KIND)
    T.expect(clinkContent.website).to.equal("https://example.com")
    T.expect(clinkContent.description).to.equal("Short blurb")
    T.expect(clinkContent.avatarUrl).to.equal("https://example.com/a.png")
    const httpAvatar = buildClinkBeaconContent({
        app: { name: "wallet", avatar_url: "http://insecure.example/a.png" } as any,
        relays: ["wss://r"],
        fees: { serviceFeeFloor: 0, serviceFeeBps: 0 },
        enrollPowBits: 0,
    })
    T.expect(httpAvatar.avatarUrl).to.equal(undefined)
    const noPow = buildClinkBeaconContent({ app, relays: ["wss://r"], fees: { serviceFeeFloor: 0, serviceFeeBps: 0 }, enrollPowBits: 0 })
    T.expect(noPow.enroll_difficulty).to.equal(undefined)
    T.expect(noPow.website).to.equal(undefined)
    T.expect(noPow.description).to.equal(undefined)

    const beacon = buildServiceBeaconEvent(
        "ab".repeat(32),
        { type: "service", name: "wallet" },
        clinkContent,
        "cd".repeat(32),
    )
    T.expect(beacon.tags.filter(t => t[0] === "d").map(t => t[1])).to.deep.equal([LEGACY_BEACON_D_TAG, CLINK_BEACON_D_TAG])
    T.expect(beacon.tags.find(t => t[0] === "clink_version")?.[1]).to.equal(CLINK_VERSION)
    T.expect(beacon.tags.find(t => t[0] === "operator")?.[1]).to.equal("cd".repeat(32))
    const parsed = JSON.parse(beacon.content)
    T.expect(parsed.type).to.equal("service")
    T.expect(parsed.enroll_difficulty).to.equal(18)
    const noOperator = buildServiceBeaconEvent("ab".repeat(32), { type: "service", name: "wallet" }, clinkContent)
    T.expect(noOperator.tags.find(t => t[0] === "operator")).to.equal(undefined)
    T.expect(operatorPubkeyHex("AB".repeat(32))).to.equal("ab".repeat(32))
    T.expect(operatorPubkeyHex("")).to.equal(undefined)
    T.d("one service beacon carries Lightning.Pub and clink-node d-tags")
}

const testEnrollCreatesAccountAndPointers = async (h: Harness) => {
    h.T.d("starting testEnrollCreatesAccountAndPointers")
    const pub = enrollPub(1)
    const res = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(res.res).to.equal("ok")
    if (res.res !== "ok") {
        return
    }
    const noffer = decodeBech32(res.noffer)
    const ndebit = decodeBech32(res.ndebit)
    const nmanage = decodeBech32(res.nmanage)
    h.T.expect(noffer.type).to.equal("noffer")
    h.T.expect(ndebit.type).to.equal("ndebit")
    h.T.expect(nmanage.type).to.equal("nmanage")
    if (noffer.type === "noffer") {
        h.T.expect(noffer.data.pubkey).to.equal(h.publicKey)
    }
    const stored = await h.T.storage.applicationStorage.FindNostrAppUser(pub)
    h.T.expect(stored).to.not.equal(null)
    h.T.expect(stored!.application.app_id).to.equal(h.appId)
    h.T.expect(!!stored!.owner_only_clink).to.equal(true)
    h.T.d("enroll created account and returned noffer/ndebit/nmanage")
}

const testEnrollIdempotent = async (h: Harness) => {
    h.T.d("starting testEnrollIdempotent")
    const pub = enrollPub(2)
    const first = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    const second = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(first).to.deep.equal(second)
    h.T.d("repeat enroll returned equivalent pointers")
}

const testEnrollExistingSkipsPow = async (h: Harness) => {
    h.T.d("starting testEnrollExistingSkipsPow")
    const pub = enrollPub(3)
    const created = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(created.res).to.equal("ok")
    setEnrollPowBits(h, 18)
    const again = await h.enroll.doEnroll({}, enrollEvent(h, pub, { id: "f".repeat(64), tags: [["clink_version", CLINK_VERSION]] }))
    h.T.expect(again.res).to.equal("ok")
    setEnrollPowBits(h, 0)
    h.T.d("existing account enroll skipped proof of work")
}

const testEnrollPowRequired = async (h: Harness) => {
    h.T.d("starting testEnrollPowRequired")
    setEnrollPowBits(h, 8)
    const res = await h.enroll.doEnroll({}, enrollEvent(h, enrollPub(4)))
    h.T.expect(res.res).to.equal("GFY")
    if (res.res === "GFY") {
        h.T.expect(res.code).to.equal(5)
        h.T.expect(res.required_difficulty).to.equal(8)
    }
    setEnrollPowBits(h, 0)
    h.T.d("new enroll without pow returned code 5 and required_difficulty")
}

const testEnrollExpired = async (h: Harness) => {
    h.T.d("starting testEnrollExpired")
    const res = await h.enroll.doEnroll({}, enrollEvent(h, enrollPub(5), {
        created_at: Math.floor(Date.now() / 1000) - 120,
    }))
    h.T.expect(res.res).to.equal("GFY")
    if (res.res === "GFY") {
        h.T.expect(res.code).to.equal(3)
        h.T.expect(res.delta?.max_delta_ms).to.equal(h.settings.getSettings().nostrRelaySettings.enrollMaxDeltaMs)
    }
    h.T.d("stale enroll created_at returned expired")
}

const testEnrollInvalidVersion = async (h: Harness) => {
    h.T.d("starting testEnrollInvalidVersion")
    const res = await h.enroll.doEnroll({}, enrollEvent(h, enrollPub(6), {
        tags: [["clink_version", "2"]],
    }))
    h.T.expect(res.res).to.equal("GFY")
    if (res.res === "GFY") {
        h.T.expect(res.code).to.equal(6)
    }
    h.T.d("unsupported clink_version returned invalid request")
}

const testEnrollUserCreationDisabled = async (h: Harness) => {
    h.T.d("starting testEnrollUserCreationDisabled")
    const app = await h.T.storage.applicationStorage.AddApplication(`no-enroll-${Date.now()}`, false)
    const keys = await h.T.storage.applicationStorage.GenerateApplicationKeys(app)
    const res = await h.enroll.doEnroll({}, enrollEvent(h, enrollPub(7), { appId: keys.appId }))
    h.T.expect(res.res).to.equal("GFY")
    if (res.res === "GFY") {
        h.T.expect(res.code).to.equal(1)
    }
    h.T.d("enroll denied when app disallows user creation")
}

const testEnrollLockedUserDenied = async (h: Harness) => {
    h.T.d("starting testEnrollLockedUserDenied")
    const pub = enrollPub(8)
    const ok = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(ok.res).to.equal("ok")
    const appUser = await h.T.storage.applicationStorage.FindNostrAppUser(pub)
    await h.T.storage.userStorage.BanUser(appUser!.user.user_id)
    const res = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(res.res).to.equal("GFY")
    if (res.res === "GFY") {
        h.T.expect(res.code).to.equal(1)
    }
    h.T.d("enroll denied for locked existing account")
}

const testEnrollExistingSkipsRateLimit = async (h: Harness) => {
    h.T.d("starting testEnrollExistingSkipsRateLimit")
    const pub = enrollPub(9)
    const first = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(first.res).to.equal("ok")
    for (let i = 0; i < 25; i++) {
        const again = await h.enroll.doEnroll({}, enrollEvent(h, pub))
        h.T.expect(again.res).to.equal("ok")
    }
    h.T.d("repeat enroll from an existing key was not rate limited")
}

const testEnrollWalletUserKeepsLiveAuth = async (h: Harness) => {
    h.T.d("starting testEnrollWalletUserKeepsLiveAuth")
    const pub = enrollPub(10)
    const app = await h.T.storage.applicationStorage.GetApplication(h.appId)
    await h.T.storage.applicationStorage.GetOrCreateNostrAppUser(app, pub)
    const before = await h.T.storage.applicationStorage.FindNostrAppUser(pub)
    h.T.expect(!!before!.owner_only_clink).to.equal(false)
    const res = await h.enroll.doEnroll({}, enrollEvent(h, pub))
    h.T.expect(res.res).to.equal("ok")
    const after = await h.T.storage.applicationStorage.FindNostrAppUser(pub)
    h.T.expect(!!after!.owner_only_clink).to.equal(false)
    h.T.d("enroll of an existing wallet account did not flip owner-only")
}

const testClinkSettingsLoaded = async (h: Harness) => {
    h.T.d("starting testClinkSettingsLoaded")
    const nostr = h.settings.getSettings().nostrRelaySettings
    h.T.expect(nostr.enrollPowBits).to.be.at.least(0)
    h.T.expect(nostr.enrollPowBits).to.be.at.most(32)
    h.T.expect(nostr.enrollMaxDeltaMs).to.be.at.least(1000)
    h.T.expect(typeof nostr.beaconWebsite).to.equal("string")
    h.T.expect(typeof nostr.beaconDescription).to.equal("string")
    h.T.expect(typeof nostr.operatorNpub).to.equal("string")
    h.T.d("clink env defaults were loaded via loadEnvs")
}

export default async (T: StorageTestBase) => {
    testNip13Helpers(T)
    testEnrollCreateLimiter(T)
    testEnrollReplyGateCapsPublishes(T)
    testBeaconBuilders(T)
    const h = await setupHarness(T)
    await testClinkSettingsLoaded(h)
    await testEnrollCreatesAccountAndPointers(h)
    await testEnrollIdempotent(h)
    await testEnrollExistingSkipsPow(h)
    await testEnrollPowRequired(h)
    await testEnrollExpired(h)
    await testEnrollInvalidVersion(h)
    await testEnrollUserCreationDisabled(h)
    await testEnrollLockedUserDenied(h)
    await testEnrollExistingSkipsRateLimit(h)
    await testEnrollWalletUserKeepsLiveAuth(h)
}
