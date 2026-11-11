import { Transaction } from 'bitcoinjs-lib'
import { randomBytes } from 'crypto'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { MAX_REVERSE_TIMEOUT_BLOCKS, ReverseSwaps } from '../services/lnd/swaps/reverseSwaps.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const MOCK_URL = 'http://mock-boltz'
const DEST = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080'
const CLAIM_HEX = dummyTxHex('aa')
const OTHER_CLAIM_HEX = dummyTxHex('bb')
const LOCKUP_HEX = dummyTxHex('cc')

export default async (T: StorageTestBase) => {
    await testExpiredCleanupKeepsStartedReverseSwaps(T)
    await testPayPersistsDestinationBeforeInvoice(T)
    await testPayPersistsClaimBeforeBroadcast(T)
    await testPayKeepsPersistedClaimRetryable(T)
    await testPayRetryUnpublishedExpiredClaimDoesNotBroadcast(T)
    await testPayRetryPublishedClaimRebroadcastsAfterRefundHeight(T)
    await testSetClaimTxKeepsPublishedMarker(T)
    await testPayMarkerFlushFailureDoesNotReconstruct(T)
    await testReserveFlushFailureDoesNotPay(T)
    await testAlreadyReservedFlushFailureDoesNotPay(T)
    await testAlreadyReservedFlushSuccessStillPays(T)
    await testConcurrentAlreadyReservedDoesNotPayDuringFailedFlush(T)
    await testResumeClaimFlushFailureDoesNotBroadcast(T)
    await testResumeRebroadcastsPersistedClaim(T)
    await testResumeRebroadcastsFailedSwapWithClaim(T)
    await testResumeDoesNotBroadcastUnpublishedClaimAfterRefundHeight(T)
    await testResumeTakesFirstDisclosurePathForUnpublishedClaim(T)
    await testResumeDoesNotBlockOnLockupWatch(T)
    await testResumeRejectsMissingDestination(T)
    await testResumeRechecksSavedLockupOnChain(T)
    await testResumeRejectsExpiredClaimWindow(T)
    await testResumeWatchesFromTimeoutWindow(T)
    await testResumeRetriesUntilLndSynced(T)
}

function dummyTxHex(tag: string) {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(Buffer.alloc(32), 0)
    tx.addOutput(Buffer.from('6a' + tag.padEnd(2, '0'), 'hex'), 0)
    return tx.toHex()
}

const requiredSwap = (userId: string, extra: Record<string, unknown> = {}) => ({
    app_user_id: userId,
    swap_quote_id: `swap-${randomBytes(8).toString('hex')}`,
    swap_tree: '{}',
    lockup_address: 'bcrt1qlockup',
    refund_public_key: '11'.repeat(33),
    timeout_block_height: 10,
    invoice: 'lnbc1-rev',
    invoice_amount: 1200,
    transaction_amount: 1000,
    swap_fee_sats: 50,
        chain_fee_sats: 200,
    preimage: '22'.repeat(32),
    ephemeral_public_key: '33'.repeat(33),
    ephemeral_private_key: '44'.repeat(32),
    service_url: MOCK_URL,
    ...extra,
})

const mockSettings = {
    getSettings: () => ({
        lndSettings: { network: 'regtest' as const },
        swapsSettings: {
            enableSwaps: true,
            boltzHttpUrl: '',
            boltzWebSocketUrl: '',
            boltsHttpUrlAlt: '',
            boltsWebSocketUrlAlt: '',
        },
    }),
}

const deleteOtherUnfinished = async (T: StorageTestBase, keepId: string) => {
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== keepId) {
            await T.storage.paymentStorage.DeleteTransactionSwap(swap.swap_operation_id)
        }
    }
}

const makeSwaps = (T: StorageTestBase) => {
    const swapper = new ReverseSwaps({ httpUrl: MOCK_URL, wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps(mockSettings as any, T.storage)
    swaps.revSwappers[MOCK_URL] = swapper
    const broadcasts: string[] = []
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => ({
            waitForHistorical: async () => false,
            isSpent: () => false,
            failure: () => undefined,
            outcome: new Promise(() => { }),
            stop: () => { },
        }),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    return { swaps, swapper, broadcasts }
}

const testExpiredCleanupKeepsStartedReverseSwaps = async (T: StorageTestBase) => {
    T.d('starting expired reverse-swap cleanup keeps started operations')
    const userId = `rev-clean-${randomBytes(8).toString('hex')}`
    const quote = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId))
    const started = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        timeout_block_height: 10,
    }))
    await T.storage.paymentStorage.DeleteExpiredTransactionSwaps(11)
    const leftover = await T.storage.paymentStorage.ListPendingTransactionSwaps(userId)
    T.expect(leftover.map(s => s.swap_operation_id)).to.deep.equal([started.swap_operation_id])
    T.expect(leftover[0].ephemeral_private_key).to.equal(started.ephemeral_private_key)
    const unfinished = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === started.swap_operation_id)).to.equal(true)
    T.expect(unfinished.some(s => s.swap_operation_id === quote.swap_operation_id)).to.equal(false)
    await T.storage.paymentStorage.DeleteTransactionSwap(started.swap_operation_id)
    T.d('never-started quotes are deleted; started reverse swaps keep their keys')
}

const testPayPersistsDestinationBeforeInvoice = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap persists destination before paying the invoice')
    const userId = `rev-dest-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    let destinationAtPay = ''
    let paid = false
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => {
        paid = true
        const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
        destinationAtPay = row?.address_paid || ''
    })
    T.expect(paid).to.equal(true)
    T.expect(destinationAtPay).to.equal(DEST)
    T.d('destination and execution state were durable before the Lightning payment started')
}

const testPayPersistsClaimBeforeBroadcast = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap persists the claim tx before broadcast')
    const userId = `rev-claim-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    let claimInDbAtPublish = ''
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
        claimInDbAtPublish = row?.claim_tx_hex || ''
        T.expect(!!row?.claim_published).to.equal(false)
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    T.expect(claimInDbAtPublish).to.equal(CLAIM_HEX)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const exported = await T.storage.paymentStorage.ExportTransactionSwaps()
    const completed = exported.find(s => s.swap_operation_id === saved.swap_operation_id)
    T.expect(completed?.claim_published).to.equal(true)
    T.d('claim transaction was durable before broadcast')
}

const testPayKeepsPersistedClaimRetryable = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not mark used after a persisted claim fails to publish')
    const userId = `rev-keep-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async () => { throw new Error('no peers') },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.publish(CLAIM_HEX)
            done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
        } catch (err: any) {
            done({ ok: false, error: err.message || String(err) })
        }
    }
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('no peers')
    }
    T.expect(threw).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(false)
    const unfinished = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('persisted claim stayed unused so resume can rebroadcast')
}

const testPayRetryUnpublishedExpiredClaimDoesNotBroadcast = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not publish an unpublished claim after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-unpub-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let paid = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        try {
            await chain.waitForLockup(Buffer.alloc(0), 1, chain.heightHint)
            done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
        } catch (err: any) {
            done({ ok: false, error: err.message || String(err) })
        }
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: timeout }),
        WatchLockupSpend: () => ({
            waitForHistorical: async () => false,
            isSpent: () => false,
            failure: () => undefined,
            outcome: new Promise(() => { }),
            stop: () => { },
        }),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    }
    T.expect(threw).to.equal(true)
    T.expect(paid).to.equal(false)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(false)
    T.expect(unpublishedClaimManualWarning(logs, saved.swap_operation_id, Transaction.fromHex(CLAIM_HEX).getId())).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a stored unpublished signature did not disclose the preimage after the refund height')
}

const testPayRetryPublishedClaimRebroadcastsAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts an already-exposed claim after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-pub-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    const { swaps, broadcasts } = makeSwaps(T)
    let paid = false
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.d('recovery of an already-exposed claim did not wait for the claim window')
}

const testSetClaimTxKeepsPublishedMarker = async (T: StorageTestBase) => {
    T.d('starting SetTransactionSwapClaimTx does not clear claim_published')
    const userId = `rev-mono-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 920_000 + 1_008,
    }))
    await T.storage.paymentStorage.SetTransactionSwapClaimTx(saved.swap_operation_id, OTHER_CLAIM_HEX)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.claim_tx_hex).to.equal(OTHER_CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('reconstructing a claim hex kept the exposure marker')
}

const testPayMarkerFlushFailureDoesNotReconstruct = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap treats a post-broadcast backup failure as publication success')
    const userId = `rev-markflush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    swaps.SetBackupManager({
        notifyBackupTable: async () => { },
        flushTablesNow: async () => {
            const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
            if (row?.claim_published) {
                throw new Error('backup dest down')
            }
        },
    } as any)
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const exported = await T.storage.paymentStorage.ExportTransactionSwaps()
    const completed = exported.find(s => s.swap_operation_id === saved.swap_operation_id)
    T.expect(completed?.claim_published).to.equal(true)
    T.expect(completed?.tx_id).to.equal(Transaction.fromHex(CLAIM_HEX).getId())
    T.expect(logs.some(line =>
        line.includes('WARNING: reverse-swap claim was broadcast but claim_published failed')
        && line.includes(saved.swap_operation_id)
    )).to.equal(true)
    T.d('backup failure after broadcast did not reconstruct or drop the exposure marker')
}

const failingBackup = (flush: () => Promise<void> = async () => { throw new Error('backup dest down') }) => ({
    notifyBackupTable: async () => { },
    flushTablesNow: flush,
} as any)

const captureSwapLogs = (swaps: Swaps) => {
    const lines: string[] = []
    const inner = swaps.log
    swaps.log = (...message) => {
        lines.push(message.map(m => {
            if (typeof m === 'symbol') {
                return 'ERROR'
            }
            if (typeof m === 'object' && m) {
                return JSON.stringify(m)
            }
            return String(m)
        }).join(' '))
        inner(...message)
    }
    return lines
}

const unpublishedClaimManualWarning = (lines: string[], swapOpId: string, claimTxId: string) =>
    lines.some(line =>
        line.includes('WARNING: reverse-swap claim is saved without claim_published')
        && line.includes(swapOpId)
        && line.includes(claimTxId)
    )

const testReserveFlushFailureDoesNotPay = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not pay if the destination backup flush fails')
    const userId = `rev-flush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swaps.SetBackupManager(failingBackup())
    let paid = false
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('backup dest down')
    }
    T.expect(threw).to.equal(true)
    T.expect(paid).to.equal(false)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.address_paid).to.equal(DEST)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('invoice payment did not start after a failed destination backup')
}

const testAlreadyReservedFlushFailureDoesNotPay = async (T: StorageTestBase) => {
    T.d('starting an already-reserved reverse swap still requires a successful backup flush')
    const userId = `rev-retry-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    await T.storage.paymentStorage.StartTransactionSwap(saved.swap_operation_id, DEST, userId)
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swaps.SetBackupManager(failingBackup())
    let paid = false
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('backup dest down')
    }
    T.expect(threw).to.equal(true)
    T.expect(paid).to.equal(false)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('retrying a reserved destination did not skip the backup barrier')
}

const testAlreadyReservedFlushSuccessStillPays = async (T: StorageTestBase) => {
    T.d('starting an already-reserved reverse swap pays after a successful backup flush')
    const userId = `rev-okflush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    await T.storage.paymentStorage.StartTransactionSwap(saved.swap_operation_id, DEST, userId)
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    let flushCalls = 0
    swaps.SetBackupManager(failingBackup(async () => { flushCalls++ }))
    let paid = false
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(true)
    T.expect(flushCalls).to.be.greaterThan(0)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('same-destination retry paid only after the backup flush succeeded')
}

const testConcurrentAlreadyReservedDoesNotPayDuringFailedFlush = async (T: StorageTestBase) => {
    T.d('starting concurrent same-destination pay waits for backup instead of skipping it')
    const userId = `rev-conc-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    let releaseFlush!: (err?: Error) => void
    const holdFlush = new Promise<void>((resolve, reject) => {
        releaseFlush = (err) => err ? reject(err) : resolve()
    })
    void holdFlush.catch(() => { })
    let flushStarted = 0
    let firstEntered!: () => void
    const firstFlush = new Promise<void>(resolve => { firstEntered = resolve })
    swaps.SetBackupManager(failingBackup(async () => {
        flushStarted++
        if (flushStarted === 1) firstEntered()
        await holdFlush
    }))
    let paid = 0
    const pay = () => swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid++ })
    const first = pay()
    await firstFlush
    const second = pay()
    await new Promise(resolve => setTimeout(resolve, 50))
    T.expect(paid).to.equal(0)
    releaseFlush(new Error('backup dest down'))
    const results = await Promise.allSettled([first, second])
    T.expect(results.every(r => r.status === 'rejected')).to.equal(true)
    T.expect(paid).to.equal(0)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a concurrent retry did not start payment while the backup flush was still failing')
}

const testResumeClaimFlushFailureDoesNotBroadcast = async (T: StorageTestBase) => {
    T.d('starting resume does not rebroadcast a persisted claim if the backup flush fails')
    const userId = `rev-resumeflush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetBackupManager(failingBackup())
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume kept the already-exposed claim unpublished without a successful backup')
}

const testResumeRebroadcastsPersistedClaim = async (T: StorageTestBase) => {
    T.d('starting ResumeTransactionSwaps rebroadcasts a persisted claim without paying')
    const userId = `rev-resume-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 10 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(false)
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c => c.swap.swap_operation_id === saved.swap_operation_id && c.swap.tx_id === Transaction.fromHex(CLAIM_HEX).getId())).to.equal(true)
    T.d('startup resume published the persisted claim and marked the swap complete')
}

const testResumeRebroadcastsFailedSwapWithClaim = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts a used=true swap that still has a claim hex')
    const userId = `rev-failed-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        used: true,
        failure_reason: 'no peers',
        completed_at_unix: 9,
        timeout_block_height: 10,
    }))
    const failedNoClaim = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        used: true,
        failure_reason: 'invoice failed',
        completed_at_unix: 9,
        timeout_block_height: 10,
    }))
    const unfinished = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    T.expect(unfinished.some(s => s.swap_operation_id === failedNoClaim.swap_operation_id)).to.equal(false)
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(false)
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c =>
        c.swap.swap_operation_id === saved.swap_operation_id
        && c.swap.tx_id === Transaction.fromHex(CLAIM_HEX).getId()
        && !c.swap.failure_reason
    )).to.equal(true)
    T.d('failed reverse swaps with a persisted claim are rebroadcast and finalized')
}

const testResumeDoesNotBroadcastUnpublishedClaimAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume does not publish an unpublished saved claim after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-unpub-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let waitError = ''
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        try {
            await chain.waitForLockup(Buffer.alloc(0), 1, chain.heightHint)
        } catch (err: any) {
            waitError = err.message || String(err)
        }
        done({ ok: false, error: waitError || 'expected claim window error' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: timeout }),
        WatchLockupSpend: () => ({
            waitForHistorical: async () => false,
            isSpent: () => false,
            failure: () => undefined,
            outcome: new Promise(() => { }),
            stop: () => { },
        }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    const deadline = Date.now() + 500
    while ((!waitError || !unpublishedClaimManualWarning(logs, saved.swap_operation_id, claimTxId)) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(broadcasts).to.deep.equal([])
    T.expect(waitError).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    T.expect(unpublishedClaimManualWarning(logs, saved.swap_operation_id, claimTxId)).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume kept an unpublished saved claim off the wire after the refund became valid')
}

const testResumeTakesFirstDisclosurePathForUnpublishedClaim = async (T: StorageTestBase) => {
    T.d('starting resume rechecks an unpublished saved claim instead of rebroadcasting it')
    const userId = `rev-unpub-path-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: 920_000 + 1_008,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let watched = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        watched = true
        done({ ok: false, error: 'stop after first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 920_500 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const deadline = Date.now() + 500
    while (!watched && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(watched).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an unpublished saved signature took the live claim path instead of a blind rebroadcast')
}

const testResumeDoesNotBlockOnLockupWatch = async (T: StorageTestBase) => {
    T.d('starting ResumeTransactionSwaps returns without waiting for lockup')
    const userId = `rev-noblock-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        timeout_block_height: 920_000 + 1_008,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    let watchStarted = false
    swapper.SubscribeToTransactionSwap = async () => {
        watchStarted = true
        await new Promise<void>(() => { })
    }
    const started = Date.now()
    await swaps.ResumeTransactionSwaps()
    T.expect(Date.now() - started).to.be.lessThan(1000)
    const deadline = Date.now() + 500
    while (!watchStarted && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(watchStarted).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume started the lockup watch without blocking boot')
}

const testResumeRejectsMissingDestination = async (T: StorageTestBase) => {
    T.d('starting resume without destination does not delete the claim key')
    const userId = `rev-nodest-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts.length).to.equal(0)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('started rows without a destination are kept for a later verified pay')
}

const testResumeRechecksSavedLockupOnChain = async (T: StorageTestBase) => {
    T.d('starting resume rechecks a persisted lockup hex against the current chain')
    const userId = `rev-lockup-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_tx_hex: LOCKUP_HEX,
        timeout_block_height: 920_000 + 1_008,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    let waitedScript = false
    let returnedHex = ''
    let heightHint = -1
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        heightHint = chain.heightHint
        const confirmed = await chain.waitForLockup(Buffer.alloc(0), 1, chain.heightHint)
        returnedHex = confirmed.txHex
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 920_500 }),
        BroadcastTransaction: async (txHex: string) => ({ txId: Transaction.fromHex(txHex).getId() }),
        WaitForScriptConfirmations: async () => {
            waitedScript = true
            return { txHex: OTHER_CLAIM_HEX, blockHeight: 920_500 }
        },
        WatchLockupSpend: () => ({
            waitForHistorical: async () => false,
            isSpent: () => false,
            failure: () => undefined,
            outcome: new Promise(() => { }),
            stop: () => { },
        }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const deadline = Date.now() + 500
    while (!returnedHex && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(waitedScript).to.equal(true)
    T.expect(returnedHex).to.equal(OTHER_CLAIM_HEX)
    T.expect(heightHint).to.equal(Math.max(1, 920_000 + 1_008 - MAX_REVERSE_TIMEOUT_BLOCKS))
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume asked LND for the current lockup instead of trusting the saved hex')
}

const testResumeRejectsExpiredClaimWindow = async (T: StorageTestBase) => {
    T.d('starting resume refuses to wait for a lockup after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-expired-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_tx_hex: LOCKUP_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    let waitError = ''
    let waitedScript = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        try {
            await chain.waitForLockup(Buffer.alloc(0), 1, chain.heightHint)
        } catch (err: any) {
            waitError = err.message || String(err)
        }
        done({ ok: false, error: waitError || 'expected claim window error' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => ({ txId: Transaction.fromHex(txHex).getId() }),
        WaitForScriptConfirmations: async () => {
            waitedScript = true
            return { txHex: LOCKUP_HEX, blockHeight: timeout }
        },
        WatchLockupSpend: () => ({
            waitForHistorical: async () => false,
            isSpent: () => false,
            failure: () => undefined,
            outcome: new Promise(() => { }),
            stop: () => { },
        }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const deadline = Date.now() + 500
    while (!waitError && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(waitedScript).to.equal(false)
    T.expect(waitError).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume did not watch for lockup after the refund became valid')
}

const testResumeWatchesFromTimeoutWindow = async (T: StorageTestBase) => {
    T.d('starting resume watches for lockup from the timeout window, not the tip')
    const userId = `rev-hint-${randomBytes(8).toString('hex')}`
    const timeout = 920_000 + 1_008
    const tip = 920_500
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    let heightHint = -1
    let waitHeightHint = -1
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        heightHint = chain.heightHint
        await chain.waitForLockup(Buffer.alloc(0), 1, chain.heightHint)
        waitHeightHint = chain.heightHint
        done({ ok: false, error: 'stop after recording hint' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => ({ txId: Transaction.fromHex(txHex).getId() }),
        WaitForScriptConfirmations: async (_script: Buffer, _confs: number, hint: number) => {
            waitHeightHint = hint
            return { txHex: LOCKUP_HEX, blockHeight: tip }
        },
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const deadline = Date.now() + 500
    while ((heightHint < 0 || waitHeightHint < 0) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    const expected = Math.max(1, Math.min(tip, timeout - MAX_REVERSE_TIMEOUT_BLOCKS))
    T.expect(expected).to.equal(timeout - MAX_REVERSE_TIMEOUT_BLOCKS)
    T.expect(expected).to.be.lessThan(tip)
    T.expect(heightHint).to.equal(expected)
    T.expect(waitHeightHint).to.equal(expected)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume asked LND to scan from the start of the reverse-swap timeout window')
}

const testResumeRetriesUntilLndSynced = async (T: StorageTestBase) => {
    T.d('starting resume retries until LND is synced instead of giving up')
    const userId = `rev-sync-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        timeout_block_height: 920_000 + 1_008,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    swaps.chainTipRetryMs = 10
    let infoCalls = 0
    let watchStarted = false
    swapper.SubscribeToTransactionSwap = async () => {
        watchStarted = true
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => {
            infoCalls++
            if (infoCalls < 3) {
                return { syncedToChain: false, blockHeight: 0 }
            }
            return { syncedToChain: true, blockHeight: 920_500 }
        },
        BroadcastTransaction: async (txHex: string) => ({ txId: Transaction.fromHex(txHex).getId() }),
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: 920_500 }),
    } as any)
    const started = Date.now()
    await swaps.ResumeTransactionSwaps()
    T.expect(Date.now() - started).to.be.lessThan(1000)
    const deadline = Date.now() + 1000
    while (!watchStarted && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(watchStarted).to.equal(true)
    T.expect(infoCalls).to.be.greaterThan(2)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume kept retrying until LND reported a synced chain tip')
}
