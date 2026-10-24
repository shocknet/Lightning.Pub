import { UnsignedEvent } from "nostr-tools"
import { NostrEvent } from "../services/nostr/nostrPool.js"
import { newClinkTransport } from "../services/serverMethods/clinkTransport.js"
import { ClinkRouter } from "../services/serverMethods/clinkRouter.js"
import { ClinkCtx, ClinkError } from "../services/CLINK/clinkTypes.js"
import { NmanageError } from "../services/CLINK/manageTypes.js"
import { NofferError } from "../services/CLINK/offerTypes.js"
import { NdebitError, gfy6Reason } from "../services/CLINK/debitTypes.js"
import { EnrollError, validateEnrollReq } from "../services/CLINK/enrollTypes.js"
import { CLINK_DEBIT_KIND, CLINK_ENROLL_KIND, CLINK_MANAGE_KIND, CLINK_OFFER_KIND, CLINK_VERSION } from "../services/CLINK/clinkConstants.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

const mockEvent = (overrides: Partial<NostrEvent> = {}): NostrEvent => ({
    id: "event-id",
    pub: "a".repeat(64),
    content: JSON.stringify({ hello: "world" }),
    appId: "app-id",
    startAtNano: "0",
    startAtMs: Date.now(),
    kind: CLINK_MANAGE_KIND,
    ...overrides,
})

const runTransport = async (router: ClinkRouter, event: NostrEvent) => {
    const sent: UnsignedEvent[] = []
    const transport = newClinkTransport(router)
    await transport(event, e => { sent.push(e) })
    return sent
}

const parseBody = (event: UnsignedEvent) => JSON.parse(event.content)

const expectClinkEnvelope = (T: StorageTestBase, reply: UnsignedEvent, event: NostrEvent) => {
    T.expect(reply.kind).to.equal(event.kind)
    T.expect(reply.pubkey).to.equal("")
    T.expect(reply.tags).to.deep.include(["p", event.pub])
    T.expect(reply.tags).to.deep.include(["e", event.id])
    T.expect(reply.tags).to.deep.include(["clink_version", CLINK_VERSION])
}

const testSuccessSendsBodyWithEventKind = async (T: StorageTestBase) => {
    T.d("starting testSuccessSendsBodyWithEventKind")
    const event = mockEvent({ kind: CLINK_MANAGE_KIND })
    const body = { res: "ok" as const, resource: "offer" as const }
    const sent = await runTransport(async () => body, event)
    T.expect(sent).to.have.length(1)
    expectClinkEnvelope(T, sent[0], event)
    T.expect(parseBody(sent[0])).to.deep.equal(body)
    T.d("transport success reply uses request kind, tags, and body")
}

const testOfferKindIsPreserved = async (T: StorageTestBase) => {
    T.d("starting testOfferKindIsPreserved")
    const event = mockEvent({ kind: CLINK_OFFER_KIND })
    const body = { bolt11: "lnbcrt1test" }
    const sent = await runTransport(async () => body, event)
    T.expect(sent).to.have.length(1)
    T.expect(sent[0].kind).to.equal(CLINK_OFFER_KIND)
    T.expect(parseBody(sent[0])).to.deep.equal(body)
    T.d("transport offer reply keeps kind 21001")
}

const testNullBodyDoesNotSend = async (T: StorageTestBase) => {
    T.d("starting testNullBodyDoesNotSend")
    const sent = await runTransport(async () => null, mockEvent())
    T.expect(sent).to.have.length(0)
    T.d("transport does not send when handler returns null")
}

const testForwardsCtxKindAndParsedReq = async (T: StorageTestBase) => {
    T.d("starting testForwardsCtxKindAndParsedReq")
    const event = mockEvent({
        content: JSON.stringify({ action: "list", resource: "offer" }),
        kind: CLINK_MANAGE_KIND,
    })
    let seen: { ctx: ClinkCtx, kind: number, req: object } | undefined
    await runTransport(async (ctx, kind, req) => {
        seen = { ctx, kind, req }
        return { res: "ok", resource: "offer" }
    }, event)
    T.expect(seen).to.not.equal(undefined)
    T.expect(seen!.kind).to.equal(CLINK_MANAGE_KIND)
    T.expect(seen!.req).to.deep.equal({ action: "list", resource: "offer" })
    T.expect(seen!.ctx).to.deep.equal({
        pub: event.pub,
        appId: event.appId,
        eventId: event.id,
        tags: event.tags,
        created_at: event.created_at,
    })
    T.d("transport parses JSON and forwards ctx, kind, and request")
}

const testInvalidJsonSendsCode6ForManageKind = async (T: StorageTestBase) => {
    T.d("starting testInvalidJsonSendsCode6ForManageKind")
    let called = false
    const event = mockEvent({ content: "{not-json", kind: CLINK_MANAGE_KIND })
    const sent = await runTransport(async () => {
        called = true
        return { res: "ok", resource: "offer" }
    }, event)
    T.expect(called).to.equal(false)
    T.expect(sent).to.have.length(1)
    expectClinkEnvelope(T, sent[0], event)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 6,
        error: "Invalid Request: malformed request",
    })
    T.d("invalid JSON replies GFY code 6 on the request kind without calling the handler")
}

const testInvalidJsonPreservesOfferKind = async (T: StorageTestBase) => {
    T.d("starting testInvalidJsonPreservesOfferKind")
    const event = mockEvent({ content: "not-json", kind: CLINK_OFFER_KIND })
    const sent = await runTransport(async () => ({ bolt11: "nope" }), event)
    T.expect(sent).to.have.length(1)
    T.expect(sent[0].kind).to.equal(CLINK_OFFER_KIND)
    T.expect(parseBody(sent[0]).code).to.equal(6)
    T.expect(parseBody(sent[0]).res).to.equal("GFY")
    T.expect(parseBody(sent[0]).error).to.equal("Invalid Request: malformed request")
    T.d("invalid JSON on an offer event still replies as kind 21001")
}

const testClinkErrorPayloadIsForwarded = async (T: StorageTestBase) => {
    T.d("starting testClinkErrorPayloadIsForwarded")
    const event = mockEvent({ kind: CLINK_OFFER_KIND })
    const sent = await runTransport(async () => {
        throw new ClinkError("denied", 1)
    }, event)
    T.expect(sent).to.have.length(1)
    expectClinkEnvelope(T, sent[0], event)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 1,
        error: "denied",
    })
    T.d("ClinkError payload is sent on the request kind")
}

const testNmanageErrorIncludesField = async (T: StorageTestBase) => {
    T.d("starting testNmanageErrorIncludesField")
    const event = mockEvent({ kind: CLINK_MANAGE_KIND })
    const sent = await runTransport(async () => {
        throw new NmanageError({ code: 5, message: "Invalid Field/Value", opts: { field: "label" } })
    }, event)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 5,
        error: "Invalid Field/Value",
        field: "label",
    })
    T.expect(sent[0].kind).to.equal(CLINK_MANAGE_KIND)
    T.d("NmanageError field is included in the transport payload")
}

const testNofferErrorIncludesRange = async (T: StorageTestBase) => {
    T.d("starting testNofferErrorIncludesRange")
    const event = mockEvent({ kind: CLINK_OFFER_KIND })
    const sent = await runTransport(async () => {
        throw new NofferError({ code: 5, opts: { maxSats: 1000 } })
    }, event)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 5,
        error: "Invalid Amount",
        range: { min: 10, max: 1000 },
    })
    T.expect(sent[0].kind).to.equal(CLINK_OFFER_KIND)
    T.d("NofferError range is included in the transport payload")
}

const testUnexpectedErrorSendsTemporaryFailure = async (T: StorageTestBase) => {
    T.d("starting testUnexpectedErrorSendsTemporaryFailure")
    const event = mockEvent({ kind: CLINK_MANAGE_KIND })
    const sent = await runTransport(async () => {
        throw new Error("db exploded")
    }, event)
    T.expect(sent).to.have.length(1)
    expectClinkEnvelope(T, sent[0], event)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 2,
        error: "Temporary Failure",
    })
    T.d("unexpected errors reply GFY code 2 Temporary Failure")
}

const testNdebitErrorIncludesReason = async (T: StorageTestBase) => {
    T.d("starting testNdebitErrorIncludesReason")
    const event = mockEvent({ kind: CLINK_DEBIT_KIND })
    const sent = await runTransport(async () => {
        throw new NdebitError({
            code: 6,
            message: "Invalid Request: k1 already processed",
            opts: { reason: gfy6Reason.k1AlreadyProcessed },
        })
    }, event)
    T.expect(sent[0].kind).to.equal(CLINK_DEBIT_KIND)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 6,
        error: "Invalid Request: k1 already processed",
        reason: "k1_already_processed",
    })
    T.d("NdebitError extras are included in the transport payload")
}

const testEnrollErrorIncludesDifficulty = async (T: StorageTestBase) => {
    T.d("starting testEnrollErrorIncludesDifficulty")
    const event = mockEvent({ kind: CLINK_ENROLL_KIND })
    const sent = await runTransport(async () => {
        throw new EnrollError({ code: 5, opts: { required_difficulty: 18 } })
    }, event)
    T.expect(sent[0].kind).to.equal(CLINK_ENROLL_KIND)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 5,
        error: "Insufficient proof of work",
        required_difficulty: 18,
    })
    T.d("EnrollError extras are included in the transport payload")
}

const testDebitAndEnrollKindsArePreserved = async (T: StorageTestBase) => {
    T.d("starting testDebitAndEnrollKindsArePreserved")
    const debitEvent = mockEvent({ kind: CLINK_DEBIT_KIND })
    const debitSent = await runTransport(async () => ({ res: "ok" as const, preimage: "aa" }), debitEvent)
    T.expect(debitSent[0].kind).to.equal(CLINK_DEBIT_KIND)
    T.expect(parseBody(debitSent[0])).to.deep.equal({ res: "ok", preimage: "aa" })
    const enrollEvent = mockEvent({ kind: CLINK_ENROLL_KIND })
    const enrollSent = await runTransport(async () => ({
        res: "ok" as const,
        noffer: "n1",
        ndebit: "n2",
        nmanage: "n3",
    }), enrollEvent)
    T.expect(enrollSent[0].kind).to.equal(CLINK_ENROLL_KIND)
    T.expect(parseBody(enrollSent[0]).noffer).to.equal("n1")
    T.d("transport debit and enroll replies keep kinds 21002 and 21004")
}

const testEnrollNonObjectPayloadSendsCode6 = async (T: StorageTestBase) => {
    T.d("starting testEnrollNonObjectPayloadSendsCode6")
    const event = mockEvent({ kind: CLINK_ENROLL_KIND, content: "[]" })
    const sent = await runTransport(async (_ctx, _kind, req) => {
        validateEnrollReq(req)
        return { res: "ok" as const, noffer: "n1", ndebit: "n2", nmanage: "n3" }
    }, event)
    T.expect(sent).to.have.length(1)
    T.expect(sent[0].kind).to.equal(CLINK_ENROLL_KIND)
    T.expect(parseBody(sent[0])).to.deep.equal({
        res: "GFY",
        code: 6,
        error: "Invalid Request",
    })
    T.d("enroll adapter rejects array payloads as GFY code 6 on kind 21004")
}

export default async (T: StorageTestBase) => {
    await testSuccessSendsBodyWithEventKind(T)
    await testOfferKindIsPreserved(T)
    await testNullBodyDoesNotSend(T)
    await testForwardsCtxKindAndParsedReq(T)
    await testInvalidJsonSendsCode6ForManageKind(T)
    await testInvalidJsonPreservesOfferKind(T)
    await testClinkErrorPayloadIsForwarded(T)
    await testNmanageErrorIncludesField(T)
    await testNofferErrorIncludesRange(T)
    await testUnexpectedErrorSendsTemporaryFailure(T)
    await testNdebitErrorIncludesReason(T)
    await testEnrollErrorIncludesDifficulty(T)
    await testDebitAndEnrollKindsArePreserved(T)
    await testEnrollNonObjectPayloadSendsCode6(T)
}
