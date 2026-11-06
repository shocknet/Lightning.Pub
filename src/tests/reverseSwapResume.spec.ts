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
    await testResumeRebroadcastsPersistedClaim(T)
    await testResumeRebroadcastsFailedSwapWithClaim(T)
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
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    T.expect(claimInDbAtPublish).to.equal(CLAIM_HEX)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
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
    const unfinished = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('persisted claim stayed unused so resume can rebroadcast')
}

const testResumeRebroadcastsPersistedClaim = async (T: StorageTestBase) => {
    T.d('starting ResumeTransactionSwaps rebroadcasts a persisted claim without paying')
    const userId = `rev-resume-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
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
