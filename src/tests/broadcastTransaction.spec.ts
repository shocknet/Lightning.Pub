import { Transaction } from 'bitcoinjs-lib'
import { broadcastPublishedTx, isAlreadyBroadcastError, type KnownTx } from '../services/lnd/publishError.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const dummyTxHex = (): string => {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(Buffer.alloc(32), 0)
    tx.addOutput(Buffer.from('6a', 'hex'), 0)
    return tx.toHex()
}

const unknown = async (): Promise<KnownTx | null> => null
const knownFor = (txId: string) => async (id: string): Promise<KnownTx | null> =>
    id === txId ? { txHash: txId } : null

export default async (T: StorageTestBase) => {
    await testBroadcastPublishedTx(T)
}

const testBroadcastPublishedTx = async (T: StorageTestBase) => {
    T.d('starting broadcastPublishedTx uses tx lookup, with mempool-duplicate fallback')
    const txHex = dummyTxHex()
    const expectedTxId = Transaction.fromHex(txHex).getId()
    const known = knownFor(expectedTxId)

    T.expect(isAlreadyBroadcastError('already have transaction')).to.equal(true)
    T.expect(isAlreadyBroadcastError('already in mempool')).to.equal(true)
    T.expect(isAlreadyBroadcastError('txn-already-in-mempool')).to.equal(true)
    T.expect(isAlreadyBroadcastError('insufficient fee')).to.equal(false)

    const ok = await broadcastPublishedTx(txHex, async () => ({ publishError: '' }), unknown)
    T.expect(ok.txId).to.equal(expectedTxId)

    let lookedUp = false
    const unusedLookup = async (): Promise<KnownTx | null> => {
        lookedUp = true
        return null
    }
    await broadcastPublishedTx(txHex, async () => ({ publishError: '' }), unusedLookup)
    T.expect(lookedUp).to.equal(false)

    const alreadyKnown = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'insufficient fee' }),
        known,
    )
    T.expect(alreadyKnown.txId).to.equal(expectedTxId)

    const thrownKnown = await broadcastPublishedTx(
        txHex,
        async () => { throw new Error('min relay fee not met') },
        known,
    )
    T.expect(thrownKnown.txId).to.equal(expectedTxId)

    const mixedCase = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'anything' }),
        async () => ({ txHash: expectedTxId.toUpperCase() }),
    )
    T.expect(mixedCase.txId).to.equal(expectedTxId)

    const mempoolDup = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'already have transaction' }),
        unknown,
    )
    T.expect(mempoolDup.txId).to.equal(expectedTxId)

    const mempoolDupThrown = await broadcastPublishedTx(
        txHex,
        async () => { throw new Error('already in mempool') },
        async () => { throw new Error('lookup failed') },
    )
    T.expect(mempoolDupThrown.txId).to.equal(expectedTxId)

    const mempoolDupWrongLookup = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'txn-already-known' }),
        async () => ({ txHash: 'ab'.repeat(32) }),
    )
    T.expect(mempoolDupWrongLookup.txId).to.equal(expectedTxId)

    let rejected = false
    try {
        await broadcastPublishedTx(txHex, async () => ({ publishError: 'insufficient fee' }), unknown)
    } catch (err: any) {
        rejected = true
        T.expect(err.message).to.equal('insufficient fee')
    }
    T.expect(rejected).to.equal(true)

    rejected = false
    try {
        await broadcastPublishedTx(txHex, async () => {
            throw new Error('min relay fee not met')
        }, unknown)
    } catch (err: any) {
        rejected = true
        T.expect(err.message).to.equal('min relay fee not met')
    }
    T.expect(rejected).to.equal(true)

    T.d('rejected broadcasts throw unless LND already has this txid or reports a mempool duplicate')
}
