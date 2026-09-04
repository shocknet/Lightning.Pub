import { finalizeEvent, generateSecretKey, verifyEvent } from "nostr-tools"
import { toNip01Event } from "../services/nostr/nip01Event.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testStripsExtraFields(T)
    testKeepsSignatureValid(T)
}

const signedEvent = () => {
    const sk = generateSecretKey()
    return finalizeEvent({
        content: "ok",
        created_at: Math.floor(Date.now() / 1000),
        kind: 21002,
        tags: [["p", "a".repeat(64)], ["e", "b".repeat(64)], ["clink_version", "1"]],
    }, sk)
}

const testStripsExtraFields = (T: StorageTestBase) => {
    T.d("starting testStripsExtraFields")
    const signed = signedEvent() as ReturnType<typeof signedEvent> & { extra: string }
    signed.extra = "drop-me"
    const wire = toNip01Event(signed)
    T.expect(Object.keys(wire).sort()).to.deep.equal(["content", "created_at", "id", "kind", "pubkey", "sig", "tags"].sort())
    T.expect("extra" in wire).to.equal(false)
    T.d("wire event only has the seven nostr fields")
}

const testKeepsSignatureValid = (T: StorageTestBase) => {
    T.d("starting testKeepsSignatureValid")
    const wire = toNip01Event(signedEvent())
    T.expect(verifyEvent(wire)).to.equal(true)
    T.d("stripped event still verifies")
}
