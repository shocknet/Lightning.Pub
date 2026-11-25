import crypto from "crypto"
import { WebSocketServer, WebSocket } from "ws"
import { finalizeEvent, getPublicKey, nip44 } from "nostr-tools"
import nostrMiddleware, { parseNostrRequestBody } from "../nostrMiddleware.js"
import { encrypt as encryptV1, getSharedSecret as getSharedSecretV1 } from "../services/nostr/nip44v1.js"
import { CLINK_OFFER_KIND, CLINK_VERSION, PUB_RPC_KIND } from "../services/CLINK/clinkConstants.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testParseNostrRequestBody(T)
    await testSubprocessSurvivesNonObjectEventBodies(T)
}

const testParseNostrRequestBody = (T: StorageTestBase) => {
    T.d("starting testParseNostrRequestBody")
    for (const invalid of ["null", "", "{not-json", "5", '"text"', "[]", "true", "false"]) {
        T.expect(parseNostrRequestBody(invalid)).to.equal(null)
    }
    T.expect(parseNostrRequestBody("{}")).to.deep.equal({})
    T.expect(parseNostrRequestBody('{"rpcName":"UserHealth","requestId":"r1"}')).to.deep.equal({
        rpcName: "UserHealth",
        requestId: "r1",
    })
    T.d("parseNostrRequestBody rejects non-object JSON values and accepts objects")
}

type MockRelay = {
    url: string
    waitForSubscription: () => Promise<void>
    broadcast: (ev: object) => void
    close: () => Promise<void>
}

const startMockRelay = async (): Promise<MockRelay> => {
    const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 })
    await new Promise<void>(resolve => wss.once("listening", () => resolve()))
    const addr = wss.address()
    if (!addr || typeof addr === "string") {
        throw new Error("failed to bind mock relay")
    }
    const subs: Array<{ ws: WebSocket, subId: string }> = []
    let resolveSub: (() => void) | null = null
    const subReady = new Promise<void>(resolve => { resolveSub = resolve })

    wss.on("connection", ws => {
        ws.on("message", buf => {
            let msg: unknown
            try {
                msg = JSON.parse(buf.toString())
            } catch {
                return
            }
            if (!Array.isArray(msg)) {
                return
            }
            if (msg[0] === "REQ" && typeof msg[1] === "string") {
                subs.push({ ws, subId: msg[1] })
                ws.send(JSON.stringify(["EOSE", msg[1]]))
                resolveSub?.()
                resolveSub = null
            } else if (msg[0] === "EVENT" && msg[1] && typeof msg[1] === "object") {
                const ev = msg[1] as { id?: string }
                if (ev.id) {
                    ws.send(JSON.stringify(["OK", ev.id, true, ""]))
                }
            }
        })
    })

    return {
        url: `ws://127.0.0.1:${addr.port}`,
        waitForSubscription: () => subReady,
        broadcast: ev => {
            for (const { ws, subId } of subs) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(["EVENT", subId, ev]))
                }
            }
        },
        close: () => new Promise<void>(resolve => {
            wss.clients.forEach(c => c.terminate())
            wss.close(() => resolve())
        }),
    }
}

const makeEncryptedEvent = (
    senderSk: Uint8Array,
    appPub: string,
    kind: number,
    plaintext: string,
    extraTags: string[][] = [],
) => {
    const content = kind === PUB_RPC_KIND
        ? encryptV1(plaintext, getSharedSecretV1(Buffer.from(senderSk).toString("hex"), appPub))
        : nip44.v2.encrypt(plaintext, nip44.v2.utils.getConversationKey(Buffer.from(senderSk), appPub))
    return finalizeEvent({
        kind,
        created_at: Math.ceil(Date.now() / 1000) + 1,
        tags: [["p", appPub], ...extraTags],
        content,
    }, senderSk)
}

const testSubprocessSurvivesNonObjectEventBodies = async (T: StorageTestBase) => {
    T.d("starting testSubprocessSurvivesNonObjectEventBodies")
    const relay = await startMockRelay()
    const appSk = crypto.randomBytes(32)
    const appPub = getPublicKey(appSk)
    const senderSk = crypto.randomBytes(32)
    const receivedClientEvents: Array<{ e: { requestId: string }, fromPub: string }> = []
    let resolveMarker: (() => void) | null = null
    const markerReceived = new Promise<void>(resolve => { resolveMarker = resolve })

    const fakeMain = {
        utils: { tlvStorageFactory: { ProcessMetrics: () => { } } },
        adminManager: { setNostrConnected: () => { } },
        liquidityProvider: { onBeaconEvent: () => { } },
    } as never

    const middleware = nostrMiddleware(
        {} as never,
        async () => null,
        fakeMain,
        {
            relays: [relay.url],
            maxEventContentLength: 60000,
            apps: [{
                appId: "app-test",
                publicKey: appPub,
                privateKey: appSk.toString("hex"),
                name: "test-app",
            }],
        },
        (e, fromPub) => {
            receivedClientEvents.push({ e, fromPub })
            if (e?.requestId === "ok-after-null") {
                resolveMarker?.()
                resolveMarker = null
            }
        },
    )

    try {
        await relay.waitForSubscription()
        for (const payload of ["null", "5", '"text"', "[]", "true"]) {
            relay.broadcast(makeEncryptedEvent(senderSk, appPub, PUB_RPC_KIND, payload))
        }
        relay.broadcast(makeEncryptedEvent(senderSk, appPub, CLINK_OFFER_KIND, "null", [["clink_version", CLINK_VERSION]]))
        relay.broadcast(makeEncryptedEvent(senderSk, appPub, PUB_RPC_KIND, JSON.stringify({ requestId: "ok-after-null" })))

        await Promise.race([
            markerReceived,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timed out waiting for valid event after null payload")), 5000)),
        ])
        await middleware.Ping()
        T.expect(receivedClientEvents).to.have.length(1)
        T.expect(receivedClientEvents[0].e.requestId).to.equal("ok-after-null")
        T.d("nostrMiddleware drops non-object JSON event bodies without crashing the process")
    } finally {
        middleware.Stop()
        await relay.close()
    }
}
