import { aliasByRemotePubkey, channelPeerLabel, mergeAliasMaps } from "../services/helpers/channelAliases.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testAliasByRemotePubkey(T)
    testMergeAliasMaps(T)
    testChannelPeerLabel(T)
}

const testAliasByRemotePubkey = (T: StorageTestBase) => {
    T.d("starting testAliasByRemotePubkey")
    const map = aliasByRemotePubkey([
        { remotePubkey: "a", peerAlias: "" },
        { remotePubkey: "a", peerAlias: "Alice" },
        { remotePubkey: "b", peerAlias: "Bob" },
        { remotePubkey: "", peerAlias: "ghost" },
    ])
    T.expect(map.get("a")).to.equal("Alice")
    T.expect(map.get("b")).to.equal("Bob")
    T.expect(map.has("")).to.equal(false)
    T.d("empty alias is filled by a later named channel to the same peer")
}

const testMergeAliasMaps = (T: StorageTestBase) => {
    T.d("starting testMergeAliasMaps")
    const into = aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "" }])
    T.expect(mergeAliasMaps(into, aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "" }]))).to.equal(false)
    T.expect(mergeAliasMaps(into, aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "Alice" }]))).to.equal(true)
    T.expect(mergeAliasMaps(into, aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "Alice" }]))).to.equal(false)
    T.expect(mergeAliasMaps(into, aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "Alicia" }]))).to.equal(true)
    T.expect(mergeAliasMaps(into, aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "" }]))).to.equal(false)
    T.expect(into.get("a")).to.equal("Alicia")
    T.d("a renamed peer replaces the cached name; an empty lookup does not")
}

const testChannelPeerLabel = (T: StorageTestBase) => {
    T.d("starting testChannelPeerLabel")
    const cache = aliasByRemotePubkey([{ remotePubkey: "a", peerAlias: "Alice" }])
    T.expect(channelPeerLabel(cache, "a", "")).to.equal("Alice")
    T.expect(channelPeerLabel(cache, "b", "Bob")).to.equal("Bob")
    T.expect(channelPeerLabel(cache, "c", "")).to.equal("")
    T.d("label prefers cache, then live alias, never the raw pubkey")
}
