import assert from 'node:assert/strict'
import { waitForLndSync } from './lndSync.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

export default async () => {
    // Alice may already credit a deposit while Bob still reports the previous
    // tip, or is temporarily not synced during its block processing.
    const states = [
        { blockHeight: 99, syncedToChain: true, syncedToGraph: true },
        { blockHeight: 100, syncedToChain: false, syncedToGraph: true },
        { blockHeight: 100, syncedToChain: true, syncedToGraph: false },
        { blockHeight: 100, syncedToChain: true, syncedToGraph: true },
    ]
    let calls = 0
    const result = await waitForLndSync({ GetInfo: async () => states[calls++] }, 100, 1000, 0)
    assert.equal(calls, 4)
    assert.deepEqual(result, states[3])

    // A node that never catches up must fail with its last observed state.
    await assert.rejects(
        waitForLndSync({ GetInfo: async () => states[0] }, 100, 0),
        /LND did not sync to height 100: height=99, syncedToChain=true, syncedToGraph=true/,
    )
}
