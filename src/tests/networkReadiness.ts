export type PeerInfo = { pubkey: string; host: string }

type NetworkNode = {
    ListPeers(): Promise<{ peers: { pubKey: string }[] }>
    ConnectPeer(peer: PeerInfo): Promise<unknown>
    ListChannels(): Promise<{ channels: { remotePubkey: string; active: boolean }[] }>
}

/** Retry missing fixture connections until every required channel is active.
 * A connection request can succeed before a peer appears in ListPeers, and
 * another peer (including an unrelated auto-reconnected peer) isn't sufficient.
 */
export async function waitForRequiredChannels(
    node: NetworkNode,
    name: string,
    required: PeerInfo[],
    timeoutMs = 80_000,
    pollMs = 500,
): Promise<void> {
    const deadline = Date.now() + timeoutMs
    let connected = new Set<string>()
    let active = new Set<string>()
    while (true) {
        const errors: string[] = []
        try {
            connected = new Set((await node.ListPeers()).peers.map(peer => peer.pubKey))
            for (const peer of required) {
                if (connected.has(peer.pubkey)) continue
                try {
                    await node.ConnectPeer(peer)
                } catch (error) {
                    // LND can still be starting, or can auto-connect between
                    // ListPeers and ConnectPeer. Recheck on the next poll.
                    errors.push(`${peer.host}: ${String(error)}`)
                }
            }
            active = new Set((await node.ListChannels()).channels.filter(channel => channel.active).map(channel => channel.remotePubkey))
            if (required.every(peer => connected.has(peer.pubkey) && active.has(peer.pubkey))) return
        } catch (error) {
            errors.push(String(error))
        }
        if (Date.now() >= deadline) {
            const missingPeers = required.filter(peer => !connected.has(peer.pubkey)).map(peer => peer.host)
            const missingChannels = required.filter(peer => !active.has(peer.pubkey)).map(peer => peer.host)
            throw new Error(`${name} network not ready: missing peers=[${missingPeers}], inactive channels=[${missingChannels}]${errors.length ? `; ${errors.join('; ')}` : ''}`)
        }
        await new Promise(resolve => setTimeout(resolve, Math.min(pollMs, Math.max(0, deadline - Date.now()))))
    }
}
