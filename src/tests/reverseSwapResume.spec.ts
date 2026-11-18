import { Transaction } from 'bitcoinjs-lib'
import { createHash, randomBytes } from 'crypto'
import { Payment_PaymentStatus } from '../../proto/lnd/lightning.js'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { MAX_REVERSE_TIMEOUT_BLOCKS, REVERSE_CLAIM_MIN_REMAINING_BLOCKS, ReverseSwaps } from '../services/lnd/swaps/reverseSwaps.js'
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
    await testDeleteUnusedTransactionSwapIgnoresStarted(T)
    await testPayPersistsDestinationBeforeInvoice(T)
    await testPayPersistsClaimBeforeBroadcast(T)
    await testPayErrorAfterPublicationRecordRetriesFirstDisclosure(T)
    await testPayDoesNotFinalizeAtBroadcast(T)
    await testPayKeepsPersistedClaimRetryable(T)
    await testPayStopsUnacceptedClaimRetryAfterRefundWindow(T)
    await testPayStopsUnacceptedClaimRetryWhenRefundHeightArrivesDuringFeeLookup(T)
    await testPayStopsUnacceptedClaimRetryWhenRemainingMovesDuringFeeLookup(T)
    await testPayRetriesUnacceptedClaimWhenLightningSettlesAfterRefundWindow(T)
    await testPayStopsUnacceptedClaimRetryWhenFeeExceedsBudget(T)
    await testPayStopsUnacceptedClaimRetryWhenSavedClaimBelowLiveRate(T)
    await testPayRetriesUnacceptedClaimWhenLightningSettlesAfterFeeExceedsBudget(T)
    await testPayRetriesAcceptedClaimWhenFeeExceedsBudget(T)
    await testPayKeepsWatchingUnacceptedClaimAfterRefundWindow(T)
    await testPayRetriesAcceptedClaimAfterFailedFlagWrite(T)
    await testPaySerializesClaimRebroadcasts(T)
    await testPayRetryUnpublishedExpiredClaimDoesNotBroadcast(T)
    await testPayRetryPublishedUnspentClaimDoesNotBroadcastAfterRefundHeight(T)
    await testPayRetryPublishedUnspentClaimRebroadcastsWhenLightningSettledAfterRefundHeight(T)
    await testPayRetryAcceptedUnspentClaimRebroadcastsAfterRefundHeight(T)
    await testPayRetryPublishedClaimRebroadcastsAfterRefundHeight(T)
    await testPayRetryReconcilesUnpublishedClaimSpendAfterRefundHeight(T)
    await testPayRetryDoesNotDiscloseCompetingSpendAfterRefundHeight(T)
    await testSetClaimTxKeepsPublishedMarker(T)
    await testPayMarkerFlushFailureDoesNotReconstruct(T)
    await testReserveFlushFailureDoesNotPay(T)
    await testAlreadyReservedFlushFailureDoesNotPay(T)
    await testAlreadyReservedFlushSuccessStillPays(T)
    await testConcurrentAlreadyReservedDoesNotPayDuringFailedFlush(T)
    await testResumeClaimFlushFailureStillBroadcasts(T)
    await testResumeAcceptedClaimFlushFailureStillBroadcasts(T)
    await testPayExposedClaimFlushFailureStillBroadcasts(T)
    await testPayAcceptedClaimFlushFailureStillBroadcasts(T)
    await testResumeRebroadcastsPersistedClaim(T)
    await testResumeRebroadcastsFailedSwapWithClaim(T)
    await testResumeFinalizesWhenClaimSpendConfirms(T)
    await testResumeFailsWhenCompetingSpendConfirms(T)
    await testResumeRearmsClaimWatchAfterSpendStreamError(T)
    await testResumeRetriesClaimWatchAfterRecordReadError(T)
    await testResumeRebroadcastsUnconfirmedClaimOnNewBlocks(T)
    await testResumeRebroadcastsUnconfirmedClaimOnTimer(T)
    await testResumeDoesNotBroadcastUnpublishedClaimAfterRefundHeight(T)
    await testResumeDoesNotBroadcastPublishedUnspentClaimAfterRefundHeight(T)
    await testResumeRebroadcastsPublishedUnspentClaimWhenLightningSettledAfterRefundHeight(T)
    await testResumeDoesNotBroadcastPublishedUnspentClaimWhenLightningInFlightAfterRefundHeight(T)
    await testResumeRecoversPublishedUnspentClaimWhenLightningSettlesAfterFirstLookup(T)
    await testResumeDoesNotBroadcastUnpublishedClaimWhenBackupFails(T)
    await testResumeDoesNotBroadcastUnpublishedClaimWhenRefundHeightArrivesDuringFallbackMarker(T)
    await testResumeRecoversUnpublishedClaimWhenLightningSettlesAfterBackupFailure(T)
    await testResumeRebroadcastsAcceptedUnspentClaimAfterRefundHeight(T)
    await testResumeReconcilesUnpublishedClaimSpendAfterRefundHeight(T)
    await testResumeDoesNotPromoteCompetingConfirmedSpendAfterRefundHeight(T)
    await testResumeDoesNotPromoteCompetingMempoolSpendAfterRefundHeight(T)
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

function claimHexPayingSatPerVbyte(tag: string, inputValue: number, satPerVbyte: number) {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(Buffer.alloc(32), 0)
    tx.addOutput(Buffer.from('6a' + tag.padEnd(2, '0'), 'hex'), 0)
    const fee = tx.virtualSize() * satPerVbyte
    tx.outs[0].value = inputValue - fee
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

const CLAIM_PREIMAGE = '22'.repeat(32)
const paymentHashForPreimage = (preimageHex: string) =>
    createHash('sha256').update(Buffer.from(preimageHex, 'hex')).digest('hex')

const hangingSpendGuard = () => ({
    waitForHistorical: async () => false as const,
    isSpent: () => false,
    failure: () => undefined,
    outcome: new Promise(() => { }),
    waitForConfirmedSpend: () => new Promise(() => { }),
    stop: () => { },
})

const claimSpend = (hex: string, spendingHeight: number) => ({
    spendingTxId: Transaction.fromHex(hex).getId(),
    spendingHeight,
})

const spentSpendGuard = (spend: { spendingTxId: string, spendingHeight: number }) => ({
    ...hangingSpendGuard(),
    waitForHistorical: async () => spend,
    isSpent: () => true,
    outcome: Promise.resolve({ kind: 'spent' as const, spend }),
})

const ourClaimMempoolGuard = (confirmed?: () => Promise<{ spendingTxId: string, spendingHeight: number }>) => ({
    ...spentSpendGuard(claimSpend(CLAIM_HEX, 0)),
    waitForConfirmedSpend: confirmed || hangingSpendGuard().waitForConfirmedSpend,
})

const waitUntil = async (ok: () => boolean | Promise<boolean>, ms = 500) => {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
        if (await ok()) {
            return
        }
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    throw new Error('timed out waiting for condition')
}

const withTimeout = async <T>(p: Promise<T>, ms: number, msg: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
        return await Promise.race([
            p,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => reject(new Error(msg)), ms)
            }),
        ])
    } finally {
        if (timer) {
            clearTimeout(timer)
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
        WatchLockupSpend: () => hangingSpendGuard(),
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

const testDeleteUnusedTransactionSwapIgnoresStarted = async (T: StorageTestBase) => {
    T.d('starting DeleteUnusedTransactionSwap only removes never-started quotes')
    const userId = `rev-delunused-${randomBytes(8).toString('hex')}`
    const quote = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId))
    const started = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
    }))
    T.expect(await T.storage.paymentStorage.DeleteUnusedTransactionSwap(started.swap_operation_id, userId)).to.equal(0)
    T.expect(await T.storage.paymentStorage.GetTransactionSwap(started.swap_operation_id, userId)).to.not.equal(null)
    T.expect(await T.storage.paymentStorage.DeleteUnusedTransactionSwap(quote.swap_operation_id, userId)).to.equal(1)
    T.expect(await T.storage.paymentStorage.GetTransactionSwap(quote.swap_operation_id, userId)).to.equal(null)
    await T.storage.paymentStorage.DeleteTransactionSwap(started.swap_operation_id)
    T.d('a started reverse swap survived unused-quote delete')
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
    let publishedAtBroadcast = false
    let acceptedAtBroadcast = false
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
            publishedAtBroadcast = !!row?.claim_published
            acceptedAtBroadcast = !!row?.claim_broadcast_accepted
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
        claimInDbAtPublish = row?.claim_tx_hex || ''
        T.expect(!!row?.claim_published).to.equal(false)
        await chain.recordPublication()
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    T.expect(claimInDbAtPublish).to.equal(CLAIM_HEX)
    T.expect(publishedAtBroadcast).to.equal(true)
    T.expect(acceptedAtBroadcast).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const exported = await T.storage.paymentStorage.ExportTransactionSwaps()
    const completed = exported.find(s => s.swap_operation_id === saved.swap_operation_id)
    T.expect(completed?.claim_published).to.equal(true)
    T.expect(completed?.claim_broadcast_accepted).to.equal(true)
    T.expect(completed?.tx_id || '').to.equal('')
    T.d('claim transaction and publication attempt were durable before broadcast')
}

const testPayErrorAfterPublicationRecordRetriesFirstDisclosure = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap retries a post-record claim error with first-disclosure checks')
    const timeout = 920_000 + 1_008
    const userId = `rev-postrec-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.recordPublication()
        done({ ok: false, error: `refund already valid at block ${timeout} (tip ${timeout})` })
    }
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    }
    T.expect(threw).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    const afterError = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(afterError?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!afterError?.claim_published).to.equal(true)
    T.expect(!!afterError?.claim_broadcast_accepted).to.equal(false)
    T.expect(afterError?.used).to.equal(false)
    let firstDisclosureRetries = 0
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        firstDisclosureRetries++
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
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    }
    T.expect(threw).to.equal(true)
    T.expect(firstDisclosureRetries).to.equal(1)
    T.expect(broadcasts).to.deep.equal([])
    T.expect(publishedUnspentManualWarning(logs, saved.swap_operation_id, Transaction.fromHex(CLAIM_HEX).getId())).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('returning an error after the exposure marker without broadcasting still rechecked the claim window on retry')
}

const testPayDoesNotFinalizeAtBroadcast = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap keeps the reverse claim open after broadcast')
    const userId = `rev-open-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.recordPublication()
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    const paid = await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    T.expect(paid.txId).to.equal(Transaction.fromHex(CLAIM_HEX).getId())
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.tx_id || '').to.equal('')
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    const unfinished = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('broadcast returned a txid without marking the swap complete')
}

const testPayKeepsPersistedClaimRetryable = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not mark used after a persisted claim fails to publish')
    const userId = `rev-keep-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const broadcasts: string[] = []
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            throw new Error('no peers')
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    await waitUntil(() => broadcasts.length >= 2)
    T.expect(broadcasts.slice(0, 2)).to.deep.equal([CLAIM_HEX, CLAIM_HEX])
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    const unfinished = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('failed broadcast kept the publication attempt and retried until stop')
}

const testPayStopsUnacceptedClaimRetryAfterRefundWindow = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap stops unaccepted claim retries after the refund window closes')
    const timeout = 920_000 + 1_008
    const userId = `rev-unacc-win-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    let tip = timeout - 20
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            tip = timeout
            throw new Error('no peers')
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    await waitUntil(() => publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an LND reject did not retry broadcast after the refund window closed')
}

const testPayStopsUnacceptedClaimRetryWhenRefundHeightArrivesDuringFeeLookup = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not first-publish an unaccepted retry if the refund height arrives during fee lookup')
    const timeout = 920_000 + 1_008
    const userId = `rev-unacc-fee-exp-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    let tip = timeout - 20
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            if (broadcasts.length === 1) {
                throw new Error('no peers')
            }
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async (confTarget?: number) => {
            if (typeof confTarget === 'number' && confTarget > 1) {
                tip = timeout
            }
            return { satPerVbyte: 1, minRelaySatPerVbyte: 1 }
        },
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    await waitUntil(() => publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('advancing to the refund height during retry fee estimation did not produce a first successful broadcast')
}

const testPayStopsUnacceptedClaimRetryWhenRemainingMovesDuringFeeLookup = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not first-publish an unaccepted retry at a cheaper earlier-window estimate if remaining keeps moving')
    const timeout = 920_000 + 1_008
    const userId = `rev-unacc-fee-move-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    const feeTargets: number[] = []
    let tip = timeout - 20
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            if (broadcasts.length === 1) {
                throw new Error('no peers')
            }
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async (confTarget?: number) => {
            if (typeof confTarget === 'number') {
                feeTargets.push(confTarget)
                if (confTarget > REVERSE_CLAIM_MIN_REMAINING_BLOCKS) {
                    tip = timeout - (confTarget === 20 ? 10 : REVERSE_CLAIM_MIN_REMAINING_BLOCKS)
                    return { satPerVbyte: 1, minRelaySatPerVbyte: 1 }
                }
            }
            return { satPerVbyte: 50, minRelaySatPerVbyte: 1 }
        },
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => logs.some(line => line.includes('remaining window moved during fee estimate')))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect(feeTargets.includes(20)).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a cheaper 20-block estimate was not first-published after remaining moved during fee lookup')
}

const testPayRetriesUnacceptedClaimWhenLightningSettlesAfterRefundWindow = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap resumes an unaccepted live retry after refund height if the lightning payment later settles')
    const timeout = 920_000 + 1_008
    const userId = `rev-unacc-win-ln-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    const lookedUp: string[] = []
    let settled = false
    let tip = timeout - 20
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            tip = timeout
            if (!settled) {
                throw new Error('no peers')
            }
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async (paymentHash: string) => {
            lookedUp.push(paymentHash)
            if (!settled) {
                return { status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }
            }
            return { status: Payment_PaymentStatus.SUCCEEDED, paymentPreimage: CLAIM_PREIMAGE }
        },
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    await waitUntil(() => publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    settled = true
    await waitUntil(() => broadcasts.length >= 2)
    T.expect(broadcasts.slice(0, 2)).to.deep.equal([CLAIM_HEX, CLAIM_HEX])
    T.expect(lookedUp.includes(paymentHashForPreimage(CLAIM_PREIMAGE))).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a live unaccepted retry recovered after the refund height once the reverse-swap invoice settled')
}

const testPayStopsUnacceptedClaimRetryWhenFeeExceedsBudget = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not first-publish an unaccepted claim below the remaining-window feerate')
    const timeout = 920_000 + 1_008
    const remaining = 6
    const userId = `rev-unacc-fee-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    const feeTargets: number[] = []
    const tip = timeout - remaining
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            throw new Error('no peers')
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async (confTarget?: number) => {
            if (typeof confTarget === 'number') {
                feeTargets.push(confTarget)
            }
            return { satPerVbyte: 50, minRelaySatPerVbyte: 1 }
        },
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => logs.some(line => line.includes('current fee exceeds quoted miner budget')))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect(feeTargets.includes(remaining)).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an LND reject did not retry a cheap claim when the remaining-window estimate was 50 sat/vbyte')
}

const testPayStopsUnacceptedClaimRetryWhenSavedClaimBelowLiveRate = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not retry a saved claim below the remaining-window feerate')
    const timeout = 920_000 + 1_008
    const remaining = 6
    const inputValue = 1000
    const cheapHex = claimHexPayingSatPerVbyte('aa', inputValue, 1)
    const userId = `rev-unacc-signed-fee-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
        transaction_amount: inputValue,
        chain_fee_sats: 200,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    const feeTargets: number[] = []
    const tip = timeout - remaining
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            throw new Error('no peers')
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async (confTarget?: number) => {
            if (typeof confTarget === 'number') {
                feeTargets.push(confTarget)
            }
            return { satPerVbyte: 2, minRelaySatPerVbyte: 1 }
        },
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(cheapHex)
        try {
            await chain.recordPublication()
            await chain.publish(cheapHex)
            done({ ok: true, txId: Transaction.fromHex(cheapHex).getId() })
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
    T.expect(broadcasts).to.deep.equal([cheapHex])
    await waitUntil(() => logs.some(line => line.includes('saved claim is below remaining-window feerate')))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([cheapHex])
    T.expect(feeTargets.includes(remaining)).to.equal(true)
    T.expect(logs.some(line => line.includes('current fee exceeds quoted miner budget'))).to.equal(false)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.used).to.equal(false)
    T.expect(row?.claim_tx_hex).to.equal(cheapHex)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an LND reject did not retry a 1 sat/vbyte claim when the remaining-window estimate was 2 sat/vbyte')
}

const testPayRetriesUnacceptedClaimWhenLightningSettlesAfterFeeExceedsBudget = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap resumes an unaccepted live retry after fees rise if the lightning payment later settles')
    const timeout = 920_000 + 1_008
    const remaining = 6
    const userId = `rev-unacc-fee-ln-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    const lookedUp: string[] = []
    let settled = false
    const tip = timeout - remaining
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            if (!settled) {
                throw new Error('no peers')
            }
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 50, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async (paymentHash: string) => {
            lookedUp.push(paymentHash)
            if (!settled) {
                return { status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }
            }
            return { status: Payment_PaymentStatus.SUCCEEDED, paymentPreimage: CLAIM_PREIMAGE }
        },
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => logs.some(line => line.includes('current fee exceeds quoted miner budget')))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    settled = true
    await waitUntil(() => broadcasts.length >= 2)
    T.expect(broadcasts.slice(0, 2)).to.deep.equal([CLAIM_HEX, CLAIM_HEX])
    T.expect(lookedUp.includes(paymentHashForPreimage(CLAIM_PREIMAGE))).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a live unaccepted retry recovered after fees rose once the reverse-swap invoice settled')
}

const testPayRetriesAcceptedClaimWhenFeeExceedsBudget = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap keeps retrying an accepted claim even if the remaining-window feerate exceeds the quoted budget')
    const timeout = 920_000 + 1_008
    const remaining = 6
    const userId = `rev-acc-fee-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const broadcasts: string[] = []
    const tip = timeout - remaining
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 50, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.recordPublication()
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => broadcasts.length >= 2)
    T.expect(broadcasts.slice(0, 2)).to.deep.equal([CLAIM_HEX, CLAIM_HEX])
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an accepted claim kept rebroadcasting after fees rose')
}

const testPayKeepsWatchingUnacceptedClaimAfterRefundWindow = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap keeps watching confirmation after unaccepted retries stop')
    const timeout = 920_000 + 1_008
    const userId = `rev-unacc-watch-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
        lockup_address: DEST,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    const broadcasts: string[] = []
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    let tip = timeout - 20
    let resolveSpend!: (value: { spendingTxId: string, spendingHeight: number }) => void
    const spend = new Promise<{ spendingTxId: string, spendingHeight: number }>(resolve => { resolveSpend = resolve })
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            tip = timeout
            throw new Error('no peers')
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => ourClaimMempoolGuard(() => spend),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        try {
            await chain.recordPublication()
            await chain.publish(CLAIM_HEX)
            done({ ok: true, txId: claimTxId })
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
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    resolveSpend({ spendingTxId: claimTxId, spendingHeight: timeout })
    await waitUntil(async () => {
        const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
        return !leftover.some(s => s.swap_operation_id === saved.swap_operation_id)
    })
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c => c.swap.swap_operation_id === saved.swap_operation_id && c.swap.tx_id === claimTxId && !c.swap.failure_reason)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an LND reject after the refund window still finalized when our claim confirmed')
}

const testPayRetriesAcceptedClaimAfterFailedFlagWrite = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap keeps retrying an accepted claim if claim_broadcast_accepted failed to persist')
    const timeout = 920_000 + 1_008
    const userId = `rev-acc-flag-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
        lockup_address: DEST,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const broadcasts: string[] = []
    let tip = timeout - 20
    let onHeight: ((height: number) => void) | undefined
    const originalMark = T.storage.paymentStorage.MarkTransactionSwapClaimBroadcastAccepted.bind(T.storage.paymentStorage)
    let markAttempts = 0
    T.storage.paymentStorage.MarkTransactionSwapClaimBroadcastAccepted = async (swapOperationId: string, txId?: string) => {
        markAttempts++
        if (markAttempts === 1) {
            throw new Error('db write failed')
        }
        return originalMark(swapOperationId, txId)
    }
    swaps.claimRebroadcastMs = 0
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            tip = timeout
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        WatchBlockHeights: (cb: (height: number) => void) => { onHeight = cb },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.recordPublication()
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
        const afterFirst = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
        T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
        T.expect(!!afterFirst?.claim_broadcast_accepted).to.equal(false)
        await waitUntil(() => !!onHeight)
        onHeight?.(timeout)
        await waitUntil(() => broadcasts.length >= 2)
        await waitUntil(async () => {
            const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
            return !!row?.claim_broadcast_accepted
        })
        T.expect(markAttempts >= 2).to.equal(true)
        const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
        T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
        T.expect(row?.used).to.equal(false)
    } finally {
        T.storage.paymentStorage.MarkTransactionSwapClaimBroadcastAccepted = originalMark
        swaps.Stop()
        await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    }
    T.d('a failed claim_broadcast_accepted write still rebroadcast after the refund window and persisted the flag')
}

const testPaySerializesClaimRebroadcasts = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap runs only one reverse-claim rebroadcast at a time')
    const timeout = 920_000 + 1_008
    const userId = `rev-serial-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: timeout,
        lockup_address: DEST,
    }))
    const { swaps, swapper } = makeSwaps(T)
    const broadcasts: string[] = []
    let inFlight = 0
    let maxInFlight = 0
    let releaseSecond!: () => void
    const second = new Promise<void>(resolve => { releaseSecond = resolve })
    let onHeight: ((height: number) => void) | undefined
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            inFlight++
            maxInFlight = Math.max(maxInFlight, inFlight)
            broadcasts.push(txHex)
            try {
                if (broadcasts.length >= 2) {
                    await second
                }
            } finally {
                inFlight--
            }
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: OTHER_CLAIM_HEX, blockHeight: 6 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        WatchBlockHeights: (cb: (height: number) => void) => { onHeight = cb },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.recordPublication()
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { })
        await waitUntil(() => broadcasts.length >= 2)
        await waitUntil(() => !!onHeight)
        onHeight?.(6)
        onHeight?.(7)
        onHeight?.(8)
        await new Promise(resolve => setTimeout(resolve, 80))
        T.expect(maxInFlight).to.equal(1)
        T.expect(broadcasts.length).to.equal(2)
    } finally {
        releaseSecond()
        swaps.Stop()
        await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    }
    T.d('overlapping block and timer retries did not start a second LND broadcast')
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
        WatchLockupSpend: () => hangingSpendGuard(),
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
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    T.expect(unpublishedClaimManualWarning(logs, saved.swap_operation_id, Transaction.fromHex(CLAIM_HEX).getId())).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a stored unpublished signature did not disclose the preimage after the refund height')
}

const testPayRetryPublishedUnspentClaimDoesNotBroadcastAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not publish a marked but unspent claim after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-pub-unspent-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let paid = false
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        firstDisclosure = true
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
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    }
    T.expect(threw).to.equal(true)
    T.expect(paid).to.equal(false)
    T.expect(firstDisclosure).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    T.expect(publishedUnspentManualWarning(logs, saved.swap_operation_id, Transaction.fromHex(CLAIM_HEX).getId())).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a publication marker without our lockup spend did not disclose the preimage after the refund height')
}

const testPayRetryPublishedUnspentClaimRebroadcastsWhenLightningSettledAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts a published unspent claim after refund height if the lightning payment already settled')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-ln-settled-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let paid = false
    let firstDisclosure = false
    const lookedUp: string[] = []
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async (paymentHash: string) => {
            lookedUp.push(paymentHash)
            return { status: Payment_PaymentStatus.SUCCEEDED, paymentPreimage: CLAIM_PREIMAGE }
        },
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { throw new Error('backup dest down') } } as any)
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(firstDisclosure).to.equal(false)
    T.expect(lookedUp).to.deep.equal([paymentHashForPreimage(CLAIM_PREIMAGE)])
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a settled reverse-swap invoice recovered the claim after the refund height without a visible lockup spend')
}

const testPayRetryAcceptedUnspentClaimRebroadcastsAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts an accepted claim even if the lockup spend is invisible after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-accepted-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        claim_broadcast_accepted: true,
        timeout_block_height: timeout,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let paid = false
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { throw new Error('backup dest down') } } as any)
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(firstDisclosure).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an LND-accepted claim was rebroadcast without backup or window gates when the mempool spend was invisible')
}

const testPayRetryPublishedClaimRebroadcastsAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts an already-exposed claim after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-pub-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let paid = false
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(firstDisclosure).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.d('recovery of a claim that already spent the lockup did not wait for the claim window')
}

const testPayRetryReconcilesUnpublishedClaimSpendAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts an unpublished claim if our claim already spent the lockup after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-recon-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    const { swaps, broadcasts } = makeSwaps(T)
    let paid = false
    let heightHint = -1
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: (req: { heightHint: number }) => {
            heightHint = req.heightHint
            return spentSpendGuard(claimSpend(CLAIM_HEX, 12))
        },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect(heightHint).to.equal(Math.max(1, Math.min(timeout, timeout - MAX_REVERSE_TIMEOUT_BLOCKS)))
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('our already-broadcast claim was promoted and rebroadcast after the refund height')
}

const testPayRetryDoesNotDiscloseCompetingSpendAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not broadcast an unpublished claim when a competing spend confirmed after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pay-comp-${randomBytes(8).toString('hex')}`
    const competing = claimSpend(OTHER_CLAIM_HEX, 12)
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
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
        WatchLockupSpend: () => spentSpendGuard(competing),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.include(competing.spendingTxId)
    }
    T.expect(threw).to.equal(true)
    T.expect(paid).to.equal(false)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_published).to.equal(false)
    T.expect(row?.tx_id).to.equal(competing.spendingTxId)
    T.expect(row?.used).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a competing confirmed spend closed the unpublished claim without disclosing the preimage')
}

const testSetClaimTxKeepsPublishedMarker = async (T: StorageTestBase) => {
    T.d('starting SetTransactionSwapClaimTx does not clear claim_published')
    const userId = `rev-mono-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        claim_broadcast_accepted: true,
        timeout_block_height: 920_000 + 1_008,
    }))
    await T.storage.paymentStorage.SetTransactionSwapClaimTx(saved.swap_operation_id, OTHER_CLAIM_HEX)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.claim_tx_hex).to.equal(OTHER_CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('reconstructing a claim hex kept the exposure marker')
}

const testPayMarkerFlushFailureDoesNotReconstruct = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap does not wait on marker backup between record and broadcast')
    const userId = `rev-markflush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        await chain.recordPublication()
        await chain.publish(CLAIM_HEX)
        done({ ok: true, txId: Transaction.fromHex(CLAIM_HEX).getId() })
    }
    let releaseBackup!: () => void
    const holdBackup = new Promise<void>(resolve => { releaseBackup = resolve })
    const hangIfPublished = async () => {
        const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
        if (row?.claim_published) {
            await holdBackup
        }
    }
    swaps.SetBackupManager({
        notifyBackupTable: hangIfPublished,
        flushTablesNow: hangIfPublished,
    } as any)
    try {
        await withTimeout(
            swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { }),
            1000,
            'publication waited on marker backup before broadcast',
        )
        T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
        const exported = await T.storage.paymentStorage.ExportTransactionSwaps()
        const completed = exported.find(s => s.swap_operation_id === saved.swap_operation_id)
        T.expect(completed?.claim_published).to.equal(true)
        T.expect(completed?.claim_broadcast_accepted).to.equal(true)
        T.expect(completed?.tx_id || '').to.equal('')
    } finally {
        releaseBackup()
        swaps.Stop()
        await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    }
    T.d('a hung marker backup did not block broadcast or drop the exposure marker')
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

const publishedUnspentManualWarning = (lines: string[], swapOpId: string, claimTxId: string) =>
    lines.some(line =>
        line.includes('WARNING: reverse-swap claim_published was set without a lockup spend by our claim')
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

const testResumeClaimFlushFailureStillBroadcasts = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts an already-exposed claim even if the backup flush fails')
    const userId = `rev-resumeflush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager(failingBackup())
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume published the already-exposed claim without waiting on backup')
}

const testResumeAcceptedClaimFlushFailureStillBroadcasts = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts an LND-accepted claim even if the backup flush fails and the mempool spend is invisible')
    const userId = `rev-resume-accepted-flush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        claim_broadcast_accepted: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager(failingBackup())
    await swaps.ResumeTransactionSwaps()
    T.expect(firstDisclosure).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume published the accepted claim without waiting on backup or a visible mempool spend')
}

const testPayExposedClaimFlushFailureStillBroadcasts = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts an already-exposed claim even if the backup flush fails')
    const userId = `rev-payflush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, broadcasts } = makeSwaps(T)
    let paid = false
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager(failingBackup())
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an exposed-claim retry published without waiting on backup')
}

const testPayAcceptedClaimFlushFailureStillBroadcasts = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rebroadcasts an LND-accepted claim even if the backup flush fails and the mempool spend is invisible')
    const userId = `rev-pay-accepted-flush-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        claim_broadcast_accepted: true,
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let paid = false
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager(failingBackup())
    await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => { paid = true })
    T.expect(paid).to.equal(false)
    T.expect(firstDisclosure).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an accepted-claim retry published without waiting on backup or a visible mempool spend')
}

const testResumeRebroadcastsPersistedClaim = async (T: StorageTestBase) => {
    T.d('starting ResumeTransactionSwaps rebroadcasts a persisted claim without paying')
    const userId = `rev-resume-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
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
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c => c.swap.swap_operation_id === saved.swap_operation_id)).to.equal(false)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume published the persisted claim without marking it complete')
}

const testResumeRebroadcastsFailedSwapWithClaim = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts a used=true swap that still has a claim hex')
    const userId = `rev-failed-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
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
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c =>
        c.swap.swap_operation_id === saved.swap_operation_id
        && c.swap.tx_id === Transaction.fromHex(CLAIM_HEX).getId()
        && !c.swap.failure_reason
    )).to.equal(false)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    await T.storage.paymentStorage.DeleteTransactionSwap(failedNoClaim.swap_operation_id)
    T.d('failed reverse swaps with a persisted claim are rebroadcast and kept open')
}

const testResumeFinalizesWhenClaimSpendConfirms = async (T: StorageTestBase) => {
    T.d('starting resume finalizes a reverse claim only after the lockup spend confirms')
    const userId = `rev-conf-${randomBytes(8).toString('hex')}`
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    let resolveSpend!: (value: { spendingTxId: string, spendingHeight: number }) => void
    const spend = new Promise<{ spendingTxId: string, spendingHeight: number }>(resolve => { resolveSpend = resolve })
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 10 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(() => spend),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect((await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()).some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    resolveSpend({ spendingTxId: claimTxId, spendingHeight: 12 })
    await waitUntil(async () => {
        const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
        return !leftover.some(s => s.swap_operation_id === saved.swap_operation_id)
    })
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c => c.swap.swap_operation_id === saved.swap_operation_id && c.swap.tx_id === claimTxId && !c.swap.failure_reason)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a confirmed spend of our claim marked the reverse swap complete')
}

const testResumeFailsWhenCompetingSpendConfirms = async (T: StorageTestBase) => {
    T.d('starting resume closes a reverse claim when a competing lockup spend confirms')
    const userId = `rev-comp-${randomBytes(8).toString('hex')}`
    const competingTxId = Transaction.fromHex(OTHER_CLAIM_HEX).getId()
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    let resolveSpend!: (value: { spendingTxId: string, spendingHeight: number }) => void
    const spend = new Promise<{ spendingTxId: string, spendingHeight: number }>(resolve => { resolveSpend = resolve })
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 10 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(() => spend),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    resolveSpend({ spendingTxId: competingTxId, spendingHeight: 12 })
    await waitUntil(async () => {
        const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
        return !leftover.some(s => s.swap_operation_id === saved.swap_operation_id)
    })
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    const row = completed.find(c => c.swap.swap_operation_id === saved.swap_operation_id)?.swap
    T.expect(row?.tx_id).to.equal(competingTxId)
    T.expect(row?.failure_reason || '').to.include(competingTxId)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a confirmed competing spend stopped reverse-claim resume')
}

const testResumeRearmsClaimWatchAfterSpendStreamError = async (T: StorageTestBase) => {
    T.d('starting resume re-arms reverse-claim confirmation watch after a spend-stream error')
    const userId = `rev-rearm-${randomBytes(8).toString('hex')}`
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    let attempts = 0
    let resolveSpend!: (value: { spendingTxId: string, spendingHeight: number }) => void
    const spend = new Promise<{ spendingTxId: string, spendingHeight: number }>(resolve => { resolveSpend = resolve })
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.chainTipRetryMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 10 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => {
            attempts++
            if (attempts === 2) {
                return ourClaimMempoolGuard(() => Promise.reject(new Error('chain notifier down')))
            }
            return ourClaimMempoolGuard(() => spend)
        },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => attempts >= 2)
    resolveSpend({ spendingTxId: claimTxId, spendingHeight: 12 })
    await waitUntil(async () => {
        const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
        return !leftover.some(s => s.swap_operation_id === saved.swap_operation_id)
    })
    const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
    T.expect(completed.some(c => c.swap.swap_operation_id === saved.swap_operation_id && c.swap.tx_id === claimTxId && !c.swap.failure_reason)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a spend-watch failure was retried until the claim confirmed')
}

const testResumeRetriesClaimWatchAfterRecordReadError = async (T: StorageTestBase) => {
    T.d('starting resume keeps reverse-claim tracking after a failed claim-record read')
    const userId = `rev-dbread-${randomBytes(8).toString('hex')}`
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const originalGet = T.storage.paymentStorage.GetTransactionSwapRecord.bind(T.storage.paymentStorage)
    let recordReads = 0
    T.storage.paymentStorage.GetTransactionSwapRecord = async (swapOperationId: string, txId?: string) => {
        recordReads++
        if (recordReads <= 2) {
            throw new Error('db busy')
        }
        return originalGet(swapOperationId, txId)
    }
    let attempts = 0
    let onHeight: ((height: number) => void) | undefined
    let resolveSpend!: (value: { spendingTxId: string, spendingHeight: number }) => void
    const spend = new Promise<{ spendingTxId: string, spendingHeight: number }>(resolve => { resolveSpend = resolve })
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.chainTipRetryMs = 20
    swaps.claimRebroadcastMs = 0
    try {
        swaps.SetLnd({
            DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
            GetInfo: async () => ({ syncedToChain: true, blockHeight: 10 }),
            BroadcastTransaction: async (txHex: string) => {
                broadcasts.push(txHex)
                return { txId: Transaction.fromHex(txHex).getId() }
            },
            WatchLockupSpend: () => {
                attempts++
                return ourClaimMempoolGuard(() => spend)
            },
            WatchBlockHeights: (cb: (height: number) => void) => { onHeight = cb },
            EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        } as any)
        swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
        await swaps.ResumeTransactionSwaps()
        T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
        await waitUntil(() => attempts >= 1)
        await waitUntil(() => !!onHeight)
        onHeight?.(11)
        await waitUntil(() => broadcasts.length >= 2)
        resolveSpend({ spendingTxId: claimTxId, spendingHeight: 12 })
        await waitUntil(async () => {
            const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
            return !leftover.some(s => s.swap_operation_id === saved.swap_operation_id)
        })
        const completed = await T.storage.paymentStorage.ListCompletedTxSwaps(userId, [])
        T.expect(completed.some(c => c.swap.swap_operation_id === saved.swap_operation_id && c.swap.tx_id === claimTxId && !c.swap.failure_reason)).to.equal(true)
    } finally {
        T.storage.paymentStorage.GetTransactionSwapRecord = originalGet
        swaps.Stop()
        await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    }
    T.d('a failed claim-record read was retried without dropping rebroadcasts')
}

const testResumeRebroadcastsUnconfirmedClaimOnNewBlocks = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts an unconfirmed reverse claim on new blocks')
    const userId = `rev-rebcast-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    let onHeight: ((height: number) => void) | undefined
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 10 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        WatchBlockHeights: (cb: (height: number) => void) => { onHeight = cb },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.claimRebroadcastMs = 0
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => !!onHeight)
    onHeight?.(11)
    await waitUntil(() => broadcasts.length === 2)
    onHeight?.(12)
    await waitUntil(() => broadcasts.length === 3)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX, CLAIM_HEX, CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('new blocks rebroadcast the persisted claim until it confirms')
}

const testResumeRebroadcastsUnconfirmedClaimOnTimer = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts an unconfirmed reverse claim on a timer')
    const userId = `rev-timer-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: 10,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    swaps.claimRebroadcastMs = 20
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => ourClaimMempoolGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    await waitUntil(() => broadcasts.length >= 2)
    T.expect(broadcasts.slice(0, 2)).to.deep.equal([CLAIM_HEX, CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('timer retries kept republishing the persisted claim without a new block')
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
        WatchLockupSpend: () => hangingSpendGuard(),
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
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume kept an unpublished saved claim off the wire after the refund became valid')
}

const testResumeDoesNotBroadcastPublishedUnspentClaimAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume does not publish a marked but unspent claim after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-pub-unspent-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let waitError = ''
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        firstDisclosure = true
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
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    const deadline = Date.now() + 500
    while ((!waitError || !publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId)) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(firstDisclosure).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    T.expect(waitError).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    T.expect(publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId)).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume kept a publication marker off the wire when the lockup was still unspent after the refund became valid')
}

const testResumeRebroadcastsPublishedUnspentClaimWhenLightningSettledAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts a published unspent claim after refund height if the lightning payment already settled')
    const timeout = 920_000 + 1_008
    const userId = `rev-resume-ln-settled-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let firstDisclosure = false
    const lookedUp: string[] = []
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async (paymentHash: string) => {
            lookedUp.push(paymentHash)
            return { status: Payment_PaymentStatus.SUCCEEDED, paymentPreimage: CLAIM_PREIMAGE }
        },
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { throw new Error('backup dest down') } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(firstDisclosure).to.equal(false)
    T.expect(lookedUp).to.deep.equal([paymentHashForPreimage(CLAIM_PREIMAGE)])
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume recovered an accepted-in-lightning claim without a visible mempool spend')
}

const testResumeDoesNotBroadcastPublishedUnspentClaimWhenLightningInFlightAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume still refuses a published unspent claim after refund height if the lightning payment is in flight')
    const timeout = 920_000 + 1_008
    const userId = `rev-resume-ln-inflight-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let waitError = ''
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        firstDisclosure = true
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
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async () => ({ status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    const deadline = Date.now() + 500
    while ((!waitError || !publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId)) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(firstDisclosure).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    T.expect(waitError).to.equal(`refund already valid at block ${timeout} (tip ${timeout})`)
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('an in-flight reverse-swap invoice did not skip first-disclosure checks after the refund height')
}

const testResumeRecoversPublishedUnspentClaimWhenLightningSettlesAfterFirstLookup = async (T: StorageTestBase) => {
    T.d('starting resume recovers a published unspent claim if lightning settles after the first lookup')
    const timeout = 920_000 + 1_008
    const remaining = REVERSE_CLAIM_MIN_REMAINING_BLOCKS - 1
    const tip = timeout - remaining
    const userId = `rev-resume-ln-later-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let waitError = ''
    let firstDisclosure = false
    let settled = false
    const lookedUp: string[] = []
    swaps.claimRebroadcastMs = 20
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        firstDisclosure = true
        try {
            await chain.waitForLockup(Buffer.alloc(0), 1, chain.heightHint)
        } catch (err: any) {
            waitError = err.message || String(err)
        }
        done({ ok: false, error: waitError || 'expected claim window error' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: tip }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async (paymentHash: string) => {
            lookedUp.push(paymentHash)
            if (!settled) {
                return { status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }
            }
            return { status: Payment_PaymentStatus.SUCCEEDED, paymentPreimage: CLAIM_PREIMAGE }
        },
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { throw new Error('backup dest down') } } as any)
    await swaps.ResumeTransactionSwaps()
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    await waitUntil(() => firstDisclosure && !!waitError && publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId))
    T.expect(firstDisclosure).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    T.expect(waitError).to.equal(`only ${remaining} blocks left to claim before refund at ${timeout} (tip ${tip}, need ${REVERSE_CLAIM_MIN_REMAINING_BLOCKS})`)
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([])
    settled = true
    await waitUntil(() => broadcasts.length >= 1)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect(lookedUp.includes(paymentHashForPreimage(CLAIM_PREIMAGE))).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume rebroadcast after a later lightning settlement without a second resume')
}

const testResumeDoesNotBroadcastUnpublishedClaimWhenBackupFails = async (T: StorageTestBase) => {
    T.d('starting resume does not first-publish an unpublished claim if the required backup flush fails')
    const timeout = 920_000 + 1_008
    const userId = `rev-resume-unpub-backup-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let flushCalls = 0
    swaps.claimRebroadcastMs = 20
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        try {
            await chain.persistClaim?.(CLAIM_HEX)
            done({ ok: false, error: 'should not publish after backup failure' })
        } catch (err: any) {
            done({ ok: false, error: err.message || String(err) })
        }
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout - 20 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: timeout - 20 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async () => ({ status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }),
    } as any)
    swaps.SetBackupManager(failingBackup(async () => {
        flushCalls++
        throw new Error('backup dest down')
    }))
    await swaps.ResumeTransactionSwaps()
    await waitUntil(() => logs.some(line => line.includes('claim backup failed')) && flushCalls >= 2)
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([])
    T.expect(flushCalls).to.be.greaterThan(1)
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(row?.claim_tx_hex).to.equal(CLAIM_HEX)
    T.expect(!!row?.claim_published).to.equal(false)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a failed claim backup kept the unpublished signature off the wire')
}

const testResumeDoesNotBroadcastUnpublishedClaimWhenRefundHeightArrivesDuringFallbackMarker = async (T: StorageTestBase) => {
    T.d('starting resume does not first-publish if the refund height arrives during the fallback marker write')
    const timeout = 920_000 + 1_008
    const userId = `rev-resume-unpub-marker-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    swaps.claimRebroadcastMs = 20
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        await chain.persistClaim?.(CLAIM_HEX)
        done({ ok: false, error: 'first-disclosure missed the spend watch' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => {
            const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
            const height = row?.claim_published ? timeout : timeout - 20
            return { syncedToChain: true, blockHeight: height }
        },
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: timeout - 20 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async () => ({ status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const claimTxId = Transaction.fromHex(CLAIM_HEX).getId()
    await waitUntil(() => publishedUnspentManualWarning(logs, saved.swap_operation_id, claimTxId))
    await new Promise(resolve => setTimeout(resolve, 80))
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('expiry during the fallback exposure marker did not disclose the preimage')
}

const testResumeRecoversUnpublishedClaimWhenLightningSettlesAfterBackupFailure = async (T: StorageTestBase) => {
    T.d('starting resume recovers an unpublished claim if lightning settles after a failed backup')
    const timeout = 920_000 + 1_008
    const userId = `rev-resume-unpub-ln-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const logs = captureSwapLogs(swaps)
    let settled = false
    const lookedUp: string[] = []
    let flushCalls = 0
    swaps.claimRebroadcastMs = 20
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        try {
            await chain.persistClaim?.(CLAIM_HEX)
            done({ ok: false, error: 'should not publish after backup failure' })
        } catch (err: any) {
            done({ ok: false, error: err.message || String(err) })
        }
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout - 20 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: timeout - 20 }),
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
        GetPaymentFromHash: async (paymentHash: string) => {
            lookedUp.push(paymentHash)
            if (!settled) {
                return { status: Payment_PaymentStatus.IN_FLIGHT, paymentPreimage: '' }
            }
            return { status: Payment_PaymentStatus.SUCCEEDED, paymentPreimage: CLAIM_PREIMAGE }
        },
    } as any)
    swaps.SetBackupManager(failingBackup(async () => {
        flushCalls++
        throw new Error('backup dest down')
    }))
    await swaps.ResumeTransactionSwaps()
    await waitUntil(() => logs.some(line => line.includes('claim backup failed')) && flushCalls >= 2)
    T.expect(broadcasts).to.deep.equal([])
    settled = true
    await waitUntil(() => broadcasts.length >= 1)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect(lookedUp.includes(paymentHashForPreimage(CLAIM_PREIMAGE))).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('startup resume kept watching until lightning settlement after a failed first-publication backup')
}

const testResumeRebroadcastsAcceptedUnspentClaimAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts an accepted claim even if the lockup spend is invisible after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-resume-accepted-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        claim_published: true,
        claim_broadcast_accepted: true,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let firstDisclosure = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        firstDisclosure = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => hangingSpendGuard(),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { throw new Error('backup dest down') } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(firstDisclosure).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume rebroadcasted an LND-accepted claim after the refund height without a visible mempool spend')
}

const testResumeReconcilesUnpublishedClaimSpendAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume rebroadcasts an unpublished claim if our claim already spent the lockup after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-recon-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let watched = false
    let heightHint = -1
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        watched = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: (req: { heightHint: number }) => {
            heightHint = req.heightHint
            return spentSpendGuard(claimSpend(CLAIM_HEX, 12))
        },
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(watched).to.equal(false)
    T.expect(broadcasts).to.deep.equal([CLAIM_HEX])
    T.expect(heightHint).to.equal(Math.max(1, Math.min(timeout, timeout - MAX_REVERSE_TIMEOUT_BLOCKS)))
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_published).to.equal(true)
    T.expect(!!row?.claim_broadcast_accepted).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume promoted our already-broadcast claim and rebroadcast after the refund height')
}

const testResumeDoesNotPromoteCompetingConfirmedSpendAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume does not broadcast an unpublished claim when a competing spend confirmed after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-recon-comp-${randomBytes(8).toString('hex')}`
    const competing = claimSpend(OTHER_CLAIM_HEX, 12)
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let watched = false
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        watched = true
        done({ ok: false, error: 'should not take first-disclosure path' })
    }
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: timeout }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        WatchLockupSpend: () => spentSpendGuard(competing),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    T.expect(watched).to.equal(false)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_published).to.equal(false)
    T.expect(row?.tx_id).to.equal(competing.spendingTxId)
    T.expect(row?.used).to.equal(true)
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(false)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('resume closed a competing confirmed spend without disclosing the preimage')
}

const testResumeDoesNotPromoteCompetingMempoolSpendAfterRefundHeight = async (T: StorageTestBase) => {
    T.d('starting resume does not broadcast an unpublished claim when a competing mempool spend is seen after the refund height')
    const timeout = 920_000 + 1_008
    const userId = `rev-recon-mem-${randomBytes(8).toString('hex')}`
    const competing = claimSpend(OTHER_CLAIM_HEX, 0)
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        paid_at_unix: 1,
        address_paid: DEST,
        lockup_address: DEST,
        claim_tx_hex: CLAIM_HEX,
        timeout_block_height: timeout,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let watched = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        watched = true
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
        WaitForScriptConfirmations: async () => ({ txHex: LOCKUP_HEX, blockHeight: timeout }),
        WatchLockupSpend: () => spentSpendGuard(competing),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    swaps.SetBackupManager({ notifyBackupTable: async () => { }, flushTablesNow: async () => { } } as any)
    await swaps.ResumeTransactionSwaps()
    const deadline = Date.now() + 500
    while (!watched && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
    }
    T.expect(watched).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetTransactionSwapRecord(saved.swap_operation_id)
    T.expect(!!row?.claim_published).to.equal(false)
    T.expect(row?.tx_id || '').to.equal('')
    const leftover = await T.storage.paymentStorage.ListUnfinishedTransactionSwaps()
    T.expect(leftover.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    swaps.Stop()
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a competing mempool spend left the unpublished claim off the wire after the refund height')
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
        WatchLockupSpend: () => hangingSpendGuard(),
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
        WatchLockupSpend: () => hangingSpendGuard(),
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
