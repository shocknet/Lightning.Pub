import { Event } from "nostr-tools"
import { EventsDeduper, RelayConnection } from "../services/nostr/nostrRelayConnection.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testSendUsesPublisherNotInbound(T)
    testSendThrowsWhenPublisherDown(T)
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

const testSendUsesPublisherNotInbound = (T: StorageTestBase) => {
    T.d("starting testSendUsesPublisherNotInbound")
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    const inbound = fakeRelay("inbound")
    const outbound = fakeRelay("outbound")
    conn.relay = inbound as never
    conn.publisher = outbound as never
    void conn.Send(dummyEvent)
    T.expect(outbound.published).to.equal(1)
    T.expect(inbound.published).to.equal(0)
    conn.Stop()
    deduper.Stop()
    T.d("send uses the outbound socket, not the subscribe socket")
}

const testSendThrowsWhenPublisherDown = (T: StorageTestBase) => {
    T.d("starting testSendThrowsWhenPublisherDown")
    const deduper = new EventsDeduper()
    const conn = new RelayConnection(settings, () => { }, deduper, false)
    conn.relay = fakeRelay("inbound") as never
    let message = ""
    try {
        conn.Send(dummyEvent)
    } catch (e: any) {
        message = e.message
    }
    T.expect(message).to.equal("relay not connected")
    conn.Stop()
    deduper.Stop()
    T.d("send fails closed when the outbound socket is down")
}

const fakeRelay = (name: string) => {
    const relay = {
        connected: true,
        published: 0,
        name,
        publish() {
            relay.published++
            return Promise.resolve("")
        },
        close() { },
    }
    return relay
}
