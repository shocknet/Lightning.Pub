import { Event } from "nostr-tools"
import { EventsDeduper, RelayConnection } from "../services/nostr/nostrRelayConnection.js"
import { MAX_FALLBACK_IN_FLIGHT, NostrPool } from "../services/nostr/nostrPool.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testSendUsesConnectedRelay(T)
    testSendThrowsWhenRelayDown(T)
    await testPoolReusesConnectedRelay(T)
    await testPoolFallsBackWhenRelayDown(T)
    await testPoolFallsBackIfSendRacesDisconnect(T)
    await testFallbackPoolIsShared(T)
    await testFallbackOverflowFailsClosed(T)
    await testStopDoesNotCreatePoolAfterAcquire(T)
}

const settings = {
    relayUrl: "wss://example.invalid",
    filters: [],
    serviceRelay: true,
    providerRelay: false,
}

const dummyEvent = {
    id: "a".repeat(64),
    pubkey: "b".repeat(64),
    created_at: 1,
    kind: 21000,
    tags: [],
    content: "x",
    sig: "c".repeat(128),
} as Event

const testSendUsesConnectedRelay = (T: StorageTestBase) => {
    T.d("starting testSendUsesConnectedRelay")
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    const relay = fakeRelay()
    conn.relay = relay as never
    T.expect(conn.IsConnected()).to.equal(true)
    void conn.Send(dummyEvent)
    T.expect(relay.published).to.equal(1)
    conn.Stop()
    deduper.Stop()
    T.d("send uses the connected relay")
}

const testSendThrowsWhenRelayDown = (T: StorageTestBase) => {
    T.d("starting testSendThrowsWhenRelayDown")
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    T.expect(conn.IsConnected()).to.equal(false)
    let message = ""
    try {
        conn.Send(dummyEvent)
    } catch (e: any) {
        message = e.message
    }
    T.expect(message).to.equal("relay not connected")
    conn.Stop()
    deduper.Stop()
    T.d("send fails closed when the relay is down")
}

const testPoolReusesConnectedRelay = async (T: StorageTestBase) => {
    T.d("starting testPoolReusesConnectedRelay")
    const { pool, conn, fallback, stop } = poolHarness()
    const relay = fakeRelay()
    conn.relay = relay as never
    await publish(pool, settings.relayUrl)
    T.expect(relay.published).to.equal(1)
    T.expect(fallback.calls).to.equal(0)
    stop()
    T.d("pool publishes on the live listen socket")
}

const testPoolFallsBackWhenRelayDown = async (T: StorageTestBase) => {
    T.d("starting testPoolFallsBackWhenRelayDown")
    const { pool, fallback, stop } = poolHarness()
    await publish(pool, settings.relayUrl)
    T.expect(fallback.calls).to.equal(1)
    stop()
    T.d("pool does not drop the send while the listen socket is down")
}

const testPoolFallsBackIfSendRacesDisconnect = async (T: StorageTestBase) => {
    T.d("starting testPoolFallsBackIfSendRacesDisconnect")
    const { pool, conn, fallback, stop } = poolHarness()
    conn.relay = fakeRelay() as never
    conn.Send = () => { throw new Error("relay not connected") }
    await publish(pool, settings.relayUrl)
    T.expect(fallback.calls).to.equal(1)
    stop()
    T.d("pool falls back if the listen socket drops mid-send")
}

const poolHarness = () => {
    const pool = new NostrPool(() => { })
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    pool.relays[settings.relayUrl] = conn
    const fallback = { calls: 0 }
    const proto = pool as unknown as { publishViaFallbackPool: (url: string, event: Event) => Promise<void> }
    proto.publishViaFallbackPool = async () => { fallback.calls++ }
    return {
        pool,
        conn,
        fallback,
        stop: () => {
            conn.Stop()
            deduper.Stop()
            pool.Stop()
        },
    }
}

const publish = (pool: NostrPool, url: string) => {
    const proto = pool as unknown as { publishEvent: (url: string, event: Event) => Promise<void> }
    return proto.publishEvent(url, dummyEvent)
}

const fakeRelay = () => {
    const relay = {
        connected: true,
        published: 0,
        publish() {
            relay.published++
            return Promise.resolve("")
        },
        close() { },
    }
    return relay
}

const testFallbackPoolIsShared = async (T: StorageTestBase) => {
    T.d("starting testFallbackPoolIsShared")
    const created = { n: 0, publishes: 0, destroyed: 0 }
    const pool = new NostrPool(() => { }, () => {
        created.n++
        return resolvingPool(created)
    })
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    pool.relays[settings.relayUrl] = conn
    await Promise.all([publish(pool, settings.relayUrl), publish(pool, settings.relayUrl), publish(pool, settings.relayUrl)])
    T.expect(created.n).to.equal(1)
    T.expect(created.publishes).to.equal(3)
    pool.Stop()
    T.expect(created.destroyed).to.equal(1)
    conn.Stop()
    deduper.Stop()
    T.d("outage sends share one fallback pool")
}

const testFallbackOverflowFailsClosed = async (T: StorageTestBase) => {
    T.d("starting testFallbackOverflowFailsClosed")
    const created = { publishes: 0, destroyed: 0 }
    const pending: Array<(err: Error) => void> = []
    const pool = new NostrPool(() => { }, () => hangingPool(created, pending))
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    pool.relays[settings.relayUrl] = conn
    const jobs = Array.from({ length: MAX_FALLBACK_IN_FLIGHT + 12 }, () =>
        publish(pool, settings.relayUrl).then(() => "ok", (e: Error) => e.message)
    )
    await Promise.resolve()
    T.expect(created.publishes).to.equal(MAX_FALLBACK_IN_FLIGHT)
    const overflow = await Promise.all(jobs.slice(MAX_FALLBACK_IN_FLIGHT))
    T.expect(overflow.every(m => m === "fallback publish limit reached")).to.equal(true)
    pool.Stop()
    await Promise.all(jobs.slice(0, MAX_FALLBACK_IN_FLIGHT))
    conn.Stop()
    deduper.Stop()
    T.d("overflow fails closed instead of queueing timestamped events")
}

const testStopDoesNotCreatePoolAfterAcquire = async (T: StorageTestBase) => {
    T.d("starting testStopDoesNotCreatePoolAfterAcquire")
    const created = { n: 0, publishes: 0, destroyed: 0 }
    const pool = new NostrPool(() => { }, () => {
        created.n++
        return resolvingPool(created)
    })
    const proto = pool as unknown as { acquireFallbackSlot: () => void }
    const acquire = proto.acquireFallbackSlot.bind(pool)
    proto.acquireFallbackSlot = () => {
        acquire()
        pool.Stop()
    }
    let message = ""
    try {
        await publish(pool, settings.relayUrl)
    } catch (e: any) {
        message = e.message
    }
    T.expect(message).to.equal("nostr pool stopped")
    T.expect(created.n).to.equal(0)
    T.expect(created.publishes).to.equal(0)
    T.expect(created.destroyed).to.equal(0)
    T.d("Stop after slot acquire does not create a leftover pool")
}

const resolvingPool = (created: { publishes: number, destroyed: number }) => {
    return {
        publish() {
            created.publishes++
            return [Promise.resolve("ok")]
        },
        close() { },
        destroy() {
            created.destroyed++
        },
    } as never
}

const hangingPool = (created: { publishes: number, destroyed: number }, pending: Array<(err: Error) => void>) => {
    return {
        publish() {
            created.publishes++
            return [new Promise<string>((_, reject) => pending.push(reject))]
        },
        close() { },
        destroy() {
            created.destroyed++
            const err = new Error("nostr pool stopped")
            pending.splice(0).forEach(reject => reject(err))
        },
    } as never
}
