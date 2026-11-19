import assert from 'node:assert/strict'
import { waitForRequiredChannels } from './networkReadiness.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const carol = { pubkey: 'carol-key', host: 'carol:9735' }
const dave = { pubkey: 'dave-key', host: 'dave:9735' }

export default async () => {
    // An unrelated peer must not skip connecting the actual channel peers. If
    // Carol connects but Dave is still starting, Dave must be retried next poll.
    const connected = new Set(['unrelated'])
    const attempts: string[] = []
    let daveTries = 0
    await waitForRequiredChannels({
        ListPeers: async () => ({ peers: [...connected].map(pubKey => ({ pubKey })) }),
        ConnectPeer: async peer => {
            attempts.push(peer.pubkey)
            if (peer.pubkey === dave.pubkey) {
                if (++daveTries === 1) throw new Error('server is still in the process of starting')
                connected.add(peer.pubkey)
                // An automatic connection won the race with ConnectPeer.
                throw new Error('already connected to peer')
            }
            connected.add(peer.pubkey)
        },
        ListChannels: async () => ({ channels: [carol, dave].map(peer => ({ remotePubkey: peer.pubkey, active: connected.has(peer.pubkey) })) }),
    }, 'alice', [carol, dave], 1000, 0)
    assert.deepEqual(attempts, [carol.pubkey, dave.pubkey, dave.pubkey])

    // Keep repairing connections while waiting for channel activation.
    let online = true
    let channelPolls = 0
    let reconnects = 0
    await waitForRequiredChannels({
        ListPeers: async () => ({ peers: online ? [{ pubKey: carol.pubkey }] : [] }),
        ConnectPeer: async () => { reconnects++; online = true },
        ListChannels: async () => {
            if (++channelPolls === 1) online = false
            return { channels: [{ remotePubkey: carol.pubkey, active: channelPolls > 1 }] }
        },
    }, 'bob', [carol], 1000, 0)
    assert.equal(reconnects, 1)

    // ConnectPeer returning doesn't establish readiness until the peer is listed.
    await assert.rejects(waitForRequiredChannels({
        ListPeers: async () => ({ peers: [] }),
        ConnectPeer: async () => ({}),
        ListChannels: async () => ({ channels: [{ remotePubkey: carol.pubkey, active: true }] }),
    }, 'bob', [carol], 0), /bob network not ready: missing peers=\[carol:9735\]/)

    // Failure output must identify the node, required peers and underlying RPC.
    await assert.rejects(waitForRequiredChannels({
        ListPeers: async () => { throw new Error('server is still in the process of starting') },
        ConnectPeer: async () => ({}),
        ListChannels: async () => ({ channels: [] }),
    }, 'bob', [carol], 0), /bob network not ready:.*carol:9735.*server is still in the process of starting/)
}
