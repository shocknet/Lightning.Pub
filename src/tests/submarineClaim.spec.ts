import { createHash, randomBytes } from 'crypto'
import { initEccLib, Transaction, address } from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import { getNetwork } from '../services/lnd/swaps/swapHelpers.js'
import {
    SubmarineSwaps,
    verifySubmarineClaimPreimage,
    type InvoiceSwapData,
} from '../services/lnd/swaps/submarineSwaps.js'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { InvoiceSwap } from '../services/storage/entity/InvoiceSwap.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

initEccLib(ecc)

const DEST = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080'
const LOCKUP_SATS = 101_000

const matchingLockup = (tag: string) => {
    const tx = new Transaction()
    tx.version = 2
    const prev = Buffer.alloc(32)
    Buffer.from(tag, 'utf8').copy(prev)
    tx.addInput(prev, 0)
    tx.addOutput(address.toOutputScript(DEST, getNetwork('regtest')), LOCKUP_SATS)
    return tx
}

export default async (T: StorageTestBase) => {
    testVerifyClaimPreimage(T)
    await testProviderWebsocketDoesNotFinalize(T)
    await testInvoiceWebsocketReconnectReplaysSetOnce(T)
    await testInvoiceWebsocketOpenReplaysHttpStatus(T)
    await testInvoiceClaimPendingIsSingleFlight(T)
    await testClaimedReconcilesLocalSettledInvoice(T)
    await testClaimedWithoutLocalPreimageDoesNotFinalize(T)
    await testWrongIdClaimedDoesNotBlockRefund(T)
    await testUsedSuccessDoesNotVetoRefund(T)
    await testResumeInvoiceSwapWithoutLockupHex(T)
    await testResumeInvoiceSwapBroadcastRejectionDoesNotThrow(T)
    await testResumeInvoiceSwapFlushFailureDoesNotBroadcast(T)
    await testResumeDoesNotFinalizeSettledInvoiceUntilClaimed(T)
    await testResumeClaimedReconcilesLocalInvoice(T)
}

const testVerifyClaimPreimage = (T: StorageTestBase) => {
    T.d('starting verified claim preimage must match the invoice payment hash')
    const preimage = randomBytes(32)
    const paymentHash = createHash('sha256').update(preimage).digest('hex')
    T.expect(verifySubmarineClaimPreimage(preimage.toString('hex'), paymentHash).ok).to.equal(true)

    const other = randomBytes(32)
    const mismatch = verifySubmarineClaimPreimage(other.toString('hex'), paymentHash)
    T.expect(mismatch.ok).to.equal(false)
    if (!mismatch.ok) {
        T.expect(mismatch.error).to.equal('preimage does not match payment hash')
    }

    const short = verifySubmarineClaimPreimage('aa', paymentHash)
    T.expect(short.ok).to.equal(false)
    T.d('preimage verification rejects mismatches and short values')
}

const testProviderWebsocketDoesNotFinalize = async (T: StorageTestBase) => {
    T.d('starting provider websocket statuses do not finalize or fail the swap')
    const { swapper, data } = setupSubmarine()
    let waiting = 0
    let preimages: string[] = []
    const handlers = {
        waitingTx: () => { waiting++ },
        onVerifiedPreimage: (preimage: string) => { preimages.push(preimage) },
    }

    const send = (payload: unknown) =>
        swapper.handleSwapInvoiceMessage(Buffer.from(JSON.stringify(payload)), data, handlers)

    await send({ event: 'update', args: [{ id: 'other-swap', status: 'invoice.set' }] })
    await send({ event: 'update', args: [{ id: 'other-swap', status: 'transaction.claimed' }] })
    await send({ event: 'update', args: [{ status: 'transaction.claimed' }] })
    await send({ event: 'update', args: [] })
    await swapper.handleSwapInvoiceMessage(Buffer.from('not-json'), data, handlers)

    T.expect(waiting).to.equal(0)
    T.expect(preimages.length).to.equal(0)

    await send({ event: 'update', args: [{ id: data.createdResponse.id, status: 'transaction.claimed' }] })
    await send({ event: 'update', args: [{ id: data.createdResponse.id, status: 'swap.expired' }] })
    await send({ event: 'update', args: [{ id: data.createdResponse.id, status: 'invoice.failedToPay' }] })
    await send({ event: 'update', args: [{ id: data.createdResponse.id, status: 'transaction.lockupFailed' }] })
    T.expect(waiting).to.equal(0)
    T.expect(preimages.length).to.equal(0)

    await send({ event: 'update', args: [{ id: data.createdResponse.id, status: 'invoice.set' }] })
    T.expect(waiting).to.equal(1)
    T.expect(preimages.length).to.equal(0)
    T.d('wrong-id and claimed/failure updates did not fund or finalize; invoice.set with matching id still funds')
}

const waitMs = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
const waitUntil = async (ok: () => boolean, ms = 500) => {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
        if (ok()) {
            return
        }
        await waitMs(10)
    }
    throw new Error('timed out waiting for condition')
}

class FakeSwapSocket {
    readonly sent: string[] = []
    private handlers: { open?: () => void, close?: () => void, message?: (data: unknown) => void } = {}
    on(event: 'open' | 'close' | 'error' | 'message' | 'pong', cb: (...args: any[]) => void) {
        if (event === 'open' || event === 'close' || event === 'message') {
            this.handlers[event] = cb
        }
    }
    send(data: string) {
        this.sent.push(data)
    }
    ping() { }
    close() {
        this.handlers.close?.()
    }
    emitOpen() {
        this.handlers.open?.()
    }
    emitClose() {
        this.handlers.close?.()
    }
    emitMessage(data: unknown) {
        this.handlers.message?.(data)
    }
}

const invoiceUpdate = (id: string, status: string) => Buffer.from(JSON.stringify({
    event: 'update',
    args: [{ id, status }],
}))

const testInvoiceWebsocketReconnectReplaysSetOnce = async (T: StorageTestBase) => {
    T.d('starting invoice websocket reconnect does not fund twice on a replayed invoice.set')
    const { swapper, data } = setupSubmarine()
    const sockets: FakeSwapSocket[] = []
    swapper.connectSwapSocket = () => {
        const socket = new FakeSwapSocket()
        sockets.push(socket)
        return socket
    }
    swapper.swapWsRetryMs = 20
    swapper.swapWsRetryMaxMs = 20
    swapper.fetchSwapStatus = async () => undefined
    let waiting = 0
    const close = swapper.SubscribeToInvoiceSwap(data, () => { }, () => { waiting++ })
    T.expect(sockets.length).to.equal(1)
    sockets[0].emitOpen()
    await waitMs(10)
    sockets[0].emitMessage(invoiceUpdate(data.createdResponse.id, 'invoice.set'))
    await waitUntil(() => waiting === 1)
    sockets[0].emitClose()
    await waitUntil(() => sockets.length === 2)
    sockets[1].emitOpen()
    await waitMs(10)
    sockets[1].emitMessage(invoiceUpdate(data.createdResponse.id, 'invoice.set'))
    await waitMs(20)
    T.expect(waiting).to.equal(1)
    close()
    await waitMs(40)
    T.expect(sockets.length).to.equal(2)
    T.d('reconnect resubscribed; a second invoice.set did not publish another lockup')
}

const testInvoiceWebsocketOpenReplaysHttpStatus = async (T: StorageTestBase) => {
    T.d('starting invoice websocket open replays the current HTTP swap status')
    const { swapper, data } = setupSubmarine()
    const sockets: FakeSwapSocket[] = []
    swapper.connectSwapSocket = () => {
        const socket = new FakeSwapSocket()
        sockets.push(socket)
        return socket
    }
    swapper.fetchSwapStatus = async () => ({ id: data.createdResponse.id, status: 'invoice.set' })
    let waiting = 0
    const close = swapper.SubscribeToInvoiceSwap(data, () => { }, () => { waiting++ })
    sockets[0].emitOpen()
    await waitUntil(() => waiting === 1)
    T.expect(waiting).to.equal(1)
    close()
    T.d('a missed invoice.set was recovered from HTTP status after subscribe')
}

const testInvoiceClaimPendingIsSingleFlight = async (T: StorageTestBase) => {
    T.d('starting invoice claim.pending does not run two provider claim fetches at once')
    const { swapper, data } = setupSubmarine()
    let claims = 0
    let release!: () => void
    const hold = new Promise<void>(resolve => { release = resolve })
    swapper.handleInvoiceClaimPending = async () => {
        claims++
        await hold
        return { ok: true as const, preimage: 'aa'.repeat(32) }
    }
    const preimages: string[] = []
    const handlers = {
        waitingTx: () => { },
        onVerifiedPreimage: (preimage: string) => { preimages.push(preimage) },
    }
    const pending = invoiceUpdate(data.createdResponse.id, 'transaction.claim.pending')
    const first = swapper.handleSwapInvoiceMessage(pending, data, handlers)
    const second = swapper.handleSwapInvoiceMessage(pending, data, handlers)
    await waitUntil(() => claims === 1)
    T.expect(claims).to.equal(1)
    release()
    await first
    await second
    T.expect(claims).to.equal(1)
    T.expect(preimages).to.deep.equal(['aa'.repeat(32)])
    T.d('a second claim.pending during an in-flight fetch was ignored')
}

const testClaimedReconcilesLocalSettledInvoice = async (T: StorageTestBase) => {
    T.d('starting claimed status finalizes only with a verified local preimage')
    const preimage = randomBytes(32)
    const { swapper, data } = setupSubmarine()
    data.info.paymentHash = createHash('sha256').update(preimage).digest('hex')
    let lookups = 0
    const preimages: string[] = []
    await swapper.handleSwapInvoiceMessage(
        Buffer.from(JSON.stringify({
            event: 'update',
            args: [{ id: data.createdResponse.id, status: 'transaction.claimed' }],
        })),
        data,
        {
            waitingTx: () => { },
            onVerifiedPreimage: (value) => { preimages.push(value) },
            reconcileSettledPreimage: async () => {
                lookups++
                return preimage.toString('hex')
            },
        },
    )
    T.expect(lookups).to.equal(1)
    T.expect(preimages).to.deep.equal([preimage.toString('hex')])
    T.d('claimed hint reconciled the local settled invoice without trusting the provider status')
}

const testClaimedWithoutLocalPreimageDoesNotFinalize = async (T: StorageTestBase) => {
    T.d('starting claimed status without a local preimage leaves the swap open')
    const { swapper, data } = setupSubmarine()
    let finalized = false
    await swapper.handleSwapInvoiceMessage(
        Buffer.from(JSON.stringify({
            event: 'update',
            args: [{ id: data.createdResponse.id, status: 'transaction.claimed' }],
        })),
        data,
        {
            waitingTx: () => { },
            onVerifiedPreimage: () => { finalized = true },
            reconcileSettledPreimage: async () => undefined,
        },
    )
    T.expect(finalized).to.equal(false)

    const other = randomBytes(32)
    await swapper.handleSwapInvoiceMessage(
        Buffer.from(JSON.stringify({
            event: 'update',
            args: [{ id: data.createdResponse.id, status: 'transaction.claimed' }],
        })),
        data,
        {
            waitingTx: () => { },
            onVerifiedPreimage: () => { finalized = true },
            reconcileSettledPreimage: async () => other.toString('hex'),
        },
    )
    T.expect(finalized).to.equal(false)
    T.d('claimed without a matching local preimage did not finalize')
}

const testWrongIdClaimedDoesNotBlockRefund = async (T: StorageTestBase) => {
    T.d('starting wrong-id claimed event leaves the funded swap refundable')
    const swap = await insertFundedSwap(T, { used: false })
    const { swapper, data } = setupSubmarine(swap.swap_quote_id)
    let finalized = false
    await swapper.handleSwapInvoiceMessage(
        Buffer.from(JSON.stringify({
            event: 'update',
            args: [{ id: 'wrong-id', status: 'transaction.claimed' }],
        })),
        data,
        {
            waitingTx: () => { },
            onVerifiedPreimage: () => { finalized = true },
        },
    )
    T.expect(finalized).to.equal(false)
    const refundable = await T.storage.paymentStorage.GetRefundableInvoiceSwap(swap.swap_operation_id)
    T.expect(refundable).to.not.equal(null)
    T.expect(refundable?.used).to.equal(false)
    T.d('wrong-id success event did not mark the swap used or remove refund eligibility')
}

const testUsedSuccessDoesNotVetoRefund = async (T: StorageTestBase) => {
    T.d('starting used success without independent spend still refundable')
    const unmarked = await insertFundedSwap(T, { used: true, failure_reason: '' })
    const refundableUnmarked = await T.storage.paymentStorage.GetRefundableInvoiceSwap(unmarked.swap_operation_id)
    T.expect(refundableUnmarked).to.not.equal(null)

    const preimage = randomBytes(32)
    const withPreimage = await insertFundedSwap(T, {
        used: true,
        failure_reason: '',
        preimage: preimage.toString('hex'),
        payment_hash: createHash('sha256').update(preimage).digest('hex'),
    })
    const refundablePaid = await T.storage.paymentStorage.GetRefundableInvoiceSwap(withPreimage.swap_operation_id)
    T.expect(refundablePaid).to.not.equal(null)

    const unfunded = await insertFundedSwap(T, { used: false, tx_id: '' })
    const notRefundable = await T.storage.paymentStorage.GetRefundableInvoiceSwap(unfunded.swap_operation_id)
    T.expect(notRefundable).to.equal(null)
    T.d('used success does not veto refund; unfunded quotes are still excluded')
}

const testResumeInvoiceSwapWithoutLockupHex = async (T: StorageTestBase) => {
    T.d('starting resume of a funded invoice swap without lockup hex does not throw')
    const saved = await insertFundedSwap(T, { lockup_tx_hex: '' })
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== saved.swap_operation_id) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps({
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
    } as any, T.storage)
    swaps.subSwappers['http://mock-boltz'] = swapper
    let waitingTxCalls = 0
    let waitingTxError: string | undefined
    let waitingTxDone: Promise<void> = Promise.resolve()
    swapper.SubscribeToInvoiceSwap = (_data, _done, waitingTx) => {
        waitingTxCalls++
        waitingTxDone = Promise.resolve().then(() => waitingTx()).catch((err: any) => {
            waitingTxError = err.message || String(err)
        })
        return () => { }
    }
    let broadcast = false
    swaps.SetLnd({
        BroadcastTransaction: async () => {
            broadcast = true
            return { txId: 'should-not-broadcast' }
        },
    } as any)
    await swaps.ResumeInvoiceSwaps()
    await waitingTxDone
    T.expect(waitingTxCalls).to.equal(1)
    T.expect(waitingTxError).to.equal(undefined)
    T.expect(broadcast).to.equal(false)
    const stillOpen = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    T.expect(stillOpen.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('resume waited for claim without throwing or republishing a missing lockup hex')
}

const testResumeInvoiceSwapBroadcastRejectionDoesNotThrow = async (T: StorageTestBase) => {
    T.d('starting resume of a funded invoice swap survives a rejected lockup rebroadcast')
    const saved = await insertFundedSwap(T)
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== saved.swap_operation_id) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps({
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
    } as any, T.storage)
    swaps.subSwappers['http://mock-boltz'] = swapper
    let waitingTxDone: Promise<void> = Promise.resolve()
    let waitingTxError: string | undefined
    swapper.SubscribeToInvoiceSwap = (_data, _done, waitingTx) => {
        waitingTxDone = Promise.resolve().then(() => waitingTx()).catch((err: any) => {
            waitingTxError = err.message || String(err)
        })
        return () => { }
    }
    const rejections: string[] = []
    const onUnhandled = (reason: unknown) => {
        rejections.push(reason instanceof Error ? reason.message : String(reason))
    }
    process.on('unhandledRejection', onUnhandled)
    let broadcast = false
    try {
        swaps.SetLnd({
            BroadcastTransaction: async () => {
                broadcast = true
                throw new Error('no peers')
            },
        } as any)
        await swaps.ResumeInvoiceSwaps()
        await waitingTxDone
        await new Promise<void>(resolve => setImmediate(resolve))
        T.expect(broadcast).to.equal(true)
        T.expect(waitingTxError).to.equal(undefined)
        T.expect(rejections).to.deep.equal([])
        const stillOpen = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
        T.expect(stillOpen.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    } finally {
        process.removeListener('unhandledRejection', onUnhandled)
        await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    }
    T.d('rejected lockup rebroadcast was caught and did not reject the resume callback')
}

const testResumeInvoiceSwapFlushFailureDoesNotBroadcast = async (T: StorageTestBase) => {
    T.d('starting resume of a funded invoice swap does not broadcast if the backup flush fails')
    const saved = await insertFundedSwap(T)
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== saved.swap_operation_id) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps({
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
    } as any, T.storage)
    swaps.subSwappers['http://mock-boltz'] = swapper
    let waitingTxDone: Promise<void> = Promise.resolve()
    swapper.SubscribeToInvoiceSwap = (_data, _done, waitingTx) => {
        waitingTxDone = Promise.resolve().then(() => waitingTx())
        return () => { }
    }
    let broadcast = false
    swaps.SetLnd({
        BroadcastTransaction: async () => {
            broadcast = true
            return { txId: 'should-not-broadcast' }
        },
    } as any)
    swaps.SetBackupManager({
        notifyBackupTable: async () => { },
        flushTablesNow: async () => { throw new Error('backup dest down') },
    } as any)
    await swaps.ResumeInvoiceSwaps()
    await waitingTxDone
    T.expect(broadcast).to.equal(false)
    const stillOpen = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    T.expect(stillOpen.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('failed backup flush blocked lockup republish on resume')
}

const testResumeDoesNotFinalizeSettledInvoiceUntilClaimed = async (T: StorageTestBase) => {
    T.d('starting resume of a settled invoice does not skip cooperative claim')
    const preimage = randomBytes(32)
    const saved = await insertFundedSwap(T, {
        payment_hash: createHash('sha256').update(preimage).digest('hex'),
    })
    await keepOnlyInvoiceSwap(T, saved.swap_operation_id)
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps({
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
    } as any, T.storage)
    swaps.subSwappers['http://mock-boltz'] = swapper
    let sawReconcile = false
    let waitingTxDone: Promise<void> = Promise.resolve()
    swapper.SubscribeToInvoiceSwap = (_data, _done, waitingTx, reconcile) => {
        sawReconcile = typeof reconcile === 'function'
        waitingTxDone = Promise.resolve().then(() => waitingTx())
        return () => { }
    }
    let lookups = 0
    swaps.SetLnd({
        LookupSettledInvoicePreimage: async () => {
            lookups++
            return preimage.toString('hex')
        },
        BroadcastTransaction: async () => ({ txId: saved.tx_id }),
    } as any)
    await swaps.ResumeInvoiceSwaps()
    await waitingTxDone
    T.expect(sawReconcile).to.equal(true)
    T.expect(lookups).to.equal(0)
    const stillOpen = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    T.expect(stillOpen.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('resume left a settled invoice open until claimed so cooperative claim can still run')
}

const testResumeClaimedReconcilesLocalInvoice = async (T: StorageTestBase) => {
    T.d('starting resume finalizes a claimed swap from the local settled invoice')
    const preimage = randomBytes(32)
    const saved = await insertFundedSwap(T, {
        payment_hash: createHash('sha256').update(preimage).digest('hex'),
    })
    await keepOnlyInvoiceSwap(T, saved.swap_operation_id)
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps({
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
    } as any, T.storage)
    swaps.subSwappers['http://mock-boltz'] = swapper
    let waitingTxDone: Promise<void> = Promise.resolve()
    swapper.SubscribeToInvoiceSwap = (data, done, waitingTx, reconcile) => {
        waitingTxDone = Promise.resolve().then(async () => {
            await waitingTx()
            await swapper.handleSwapInvoiceMessage(
                Buffer.from(JSON.stringify({
                    event: 'update',
                    args: [{ id: data.createdResponse.id, status: 'transaction.claimed' }],
                })),
                data,
                {
                    waitingTx: () => { },
                    onVerifiedPreimage: (value) => done({ ok: true, preimage: value }),
                    reconcileSettledPreimage: reconcile,
                },
            )
        })
        return () => { }
    }
    swaps.SetLnd({
        LookupSettledInvoicePreimage: async (hash: string) => {
            T.expect(hash).to.equal(saved.payment_hash)
            return preimage.toString('hex')
        },
        BroadcastTransaction: async () => ({ txId: saved.tx_id }),
    } as any)
    await swaps.ResumeInvoiceSwaps()
    await waitingTxDone
    let row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    for (let i = 0; i < 40 && !row?.used; i++) {
        await new Promise<void>(resolve => setImmediate(resolve))
        row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    }
    const unfinished = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    T.expect(unfinished.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(false)
    T.expect(row?.used).to.equal(true)
    T.expect(row?.preimage).to.equal(preimage.toString('hex'))
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('claimed on resume finalized from the local invoice preimage')
}

const setupSubmarine = (swapId = `swap-${randomBytes(8).toString('hex')}`): { swapper: SubmarineSwaps, data: InvoiceSwapData } => {
    const keys = ECPairFactory(ecc).makeRandom()
    const paymentHash = randomBytes(32).toString('hex')
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const data: InvoiceSwapData = {
        createdResponse: {
            id: swapId,
            claimPublicKey: Buffer.from(keys.publicKey).toString('hex'),
            swapTree: '{}',
            timeoutBlockHeight: 920_000 + 144,
            expectedAmount: 100_000,
            address: 'bcrt1qtest',
        },
        info: {
            keys,
            paymentHash,
        },
    }
    return { swapper, data }
}

const keepOnlyInvoiceSwap = async (T: StorageTestBase, keepId: string) => {
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== keepId) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
}

const insertFundedSwap = async (T: StorageTestBase, override: Partial<InvoiceSwap> = {}) => {
    const keys = ECPairFactory(ecc).makeRandom()
    if (!keys.privateKey) {
        throw new Error('failed to generate keys')
    }
    const lockup = matchingLockup(randomBytes(8).toString('hex'))
    return T.storage.paymentStorage.AddInvoiceSwap({
        app_user_id: 'admin',
        swap_quote_id: `quote-${randomBytes(8).toString('hex')}`,
        swap_tree: '{}',
        claim_public_key: Buffer.from(keys.publicKey).toString('hex'),
        payment_hash: randomBytes(32).toString('hex'),
        timeout_block_height: 920_000 + 144,
        invoice: 'lnbcrt-test',
        invoice_amount: 100_000,
        transaction_amount: LOCKUP_SATS,
        swap_fee_sats: 1_000,
        chain_fee_sats: 200,
        ephemeral_public_key: Buffer.from(keys.publicKey).toString('hex'),
        ephemeral_private_key: Buffer.from(keys.privateKey).toString('hex'),
        address: DEST,
        service_url: 'http://mock-boltz',
        tx_id: lockup.getId(),
        lockup_tx_hex: lockup.toHex(),
        ...override,
    })
}
