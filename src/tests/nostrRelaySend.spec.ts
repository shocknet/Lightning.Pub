import { Event } from "nostr-tools"
import { EventsDeduper, RelayConnection } from "../services/nostr/nostrRelayConnection.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testSendUsesConnectedRelay(T)
    testSendThrowsWhenRelayDown(T)
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
