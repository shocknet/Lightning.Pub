export const CHANNEL_ALIAS_CACHE_TTL_MS = 1000 * 60 * 60 * 6
export const CHANNEL_ALIAS_RETRY_TTL_MS = 1000 * 60 * 5

type NamedPeer = { remotePubkey: string; peerAlias?: string }

export function aliasByRemotePubkey(channels: NamedPeer[]): Map<string, string> {
    const map = new Map<string, string>()
    for (const c of channels) {
        mergeAlias(map, c.remotePubkey, c.peerAlias)
    }
    return map
}

export function mergeAliasMaps(into: Map<string, string>, incoming: Map<string, string>): boolean {
    let changed = false
    for (const [pub, alias] of incoming) {
        if (mergeAlias(into, pub, alias)) changed = true
    }
    return changed
}

export function channelPeerLabel(cache: Map<string, string>, remotePubkey: string, peerAlias?: string): string {
    return cache.get(remotePubkey) || peerAlias || ""
}

function mergeAlias(into: Map<string, string>, remotePubkey: string, peerAlias?: string): boolean {
    if (!remotePubkey) return false
    const next = peerAlias || ""
    const prev = into.get(remotePubkey)
    if (prev === undefined) {
        into.set(remotePubkey, next)
        return !!next
    }
    if (!next || next === prev) return false
    into.set(remotePubkey, next)
    return true
}
