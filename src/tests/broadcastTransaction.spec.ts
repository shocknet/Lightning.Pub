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
const knownFor = (txId: string, numConfirmations = 0) => async (id: string): Promise<KnownTx | null> =>
    id === txId ? { txHash: txId, numConfirmations } : null

const expectRejected = async (T: StorageTestBase, run: () => Promise<unknown>, message: string) => {
    let rejected = false
    try {
        await run()
    } catch (err: any) {
        rejected = true
        T.expect(err.message).to.equal(message)
    }
    T.expect(rejected).to.equal(true)
}

export default async (T: StorageTestBase) => {
    await testBroadcastPublishedTx(T)
}

const testBroadcastPublishedTx = async (T: StorageTestBase) => {
    T.d('starting broadcastPublishedTx uses confirmed lookup, with mempool-duplicate fallback')
    const txHex = dummyTxHex()
    const expectedTxId = Transaction.fromHex(txHex).getId()
    const unconfirmed = knownFor(expectedTxId, 0)
    const confirmed = knownFor(expectedTxId, 1)

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

    const confirmedKnown = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'insufficient fee' }),
        confirmed,
    )
    T.expect(confirmedKnown.txId).to.equal(expectedTxId)

    const confirmedThrown = await broadcastPublishedTx(
        txHex,
        async () => { throw new Error('min relay fee not met') },
        confirmed,
    )
    T.expect(confirmedThrown.txId).to.equal(expectedTxId)

    const mixedCaseConfirmed = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'anything' }),
        async () => ({ txHash: expectedTxId.toUpperCase(), numConfirmations: 2 }),
    )
    T.expect(mixedCaseConfirmed.txId).to.equal(expectedTxId)

    await expectRejected(
        T,
        () => broadcastPublishedTx(txHex, async () => ({ publishError: 'insufficient fee' }), unconfirmed),
        'insufficient fee',
    )
    await expectRejected(
        T,
        () => broadcastPublishedTx(txHex, async () => { throw new Error('min relay fee not met') }, unconfirmed),
        'min relay fee not met',
    )
    await expectRejected(
        T,
        () => broadcastPublishedTx(
            txHex,
            async () => ({ publishError: 'insufficient fee' }),
            async () => ({ txHash: expectedTxId }),
        ),
        'insufficient fee',
    )

    const mempoolDup = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'already have transaction' }),
        unknown,
    )
    T.expect(mempoolDup.txId).to.equal(expectedTxId)

    const mempoolDupUnconfirmed = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'already have transaction' }),
        unconfirmed,
    )
    T.expect(mempoolDupUnconfirmed.txId).to.equal(expectedTxId)

    const mempoolDupThrown = await broadcastPublishedTx(
        txHex,
        async () => { throw new Error('already in mempool') },
        async () => { throw new Error('lookup failed') },
    )
    T.expect(mempoolDupThrown.txId).to.equal(expectedTxId)

    const mempoolDupWrongLookup = await broadcastPublishedTx(
        txHex,
        async () => ({ publishError: 'txn-already-known' }),
        async () => ({ txHash: 'ab'.repeat(32), numConfirmations: 6 }),
    )
    T.expect(mempoolDupWrongLookup.txId).to.equal(expectedTxId)

    await expectRejected(
        T,
        () => broadcastPublishedTx(txHex, async () => ({ publishError: 'insufficient fee' }), unknown),
        'insufficient fee',
    )
    await expectRejected(
        T,
        () => broadcastPublishedTx(txHex, async () => {
            throw new Error('min relay fee not met')
        }, unknown),
        'min relay fee not met',
    )

    T.d('rejected broadcasts throw unless this txid is confirmed or LND reports a mempool duplicate')
}
