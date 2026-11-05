import { createHash, randomBytes } from 'crypto'
import { initEccLib } from 'bitcoinjs-lib'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
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

export default async (T: StorageTestBase) => {
    testVerifyClaimPreimage(T)
    await testProviderWebsocketDoesNotFinalize(T)
    await testWrongIdClaimedDoesNotBlockRefund(T)
    await testUsedSuccessDoesNotVetoRefund(T)
    await testResumeInvoiceSwapWithoutLockupHex(T)
    await testResumeInvoiceSwapBroadcastRejectionDoesNotThrow(T)
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
    const saved = await insertFundedSwap(T, { lockup_tx_hex: '020000000001aabb' })
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

const insertFundedSwap = async (T: StorageTestBase, override: Partial<InvoiceSwap> = {}) => {
    const keys = ECPairFactory(ecc).makeRandom()
    if (!keys.privateKey) {
        throw new Error('failed to generate keys')
    }
    return T.storage.paymentStorage.AddInvoiceSwap({
        app_user_id: 'admin',
        swap_quote_id: `quote-${randomBytes(8).toString('hex')}`,
        swap_tree: '{}',
        claim_public_key: Buffer.from(keys.publicKey).toString('hex'),
        payment_hash: randomBytes(32).toString('hex'),
        timeout_block_height: 920_000 + 144,
        invoice: 'lnbcrt-test',
        invoice_amount: 100_000,
        transaction_amount: 101_000,
        swap_fee_sats: 1_000,
        chain_fee_sats: 200,
        ephemeral_public_key: Buffer.from(keys.publicKey).toString('hex'),
        ephemeral_private_key: Buffer.from(keys.privateKey).toString('hex'),
        address: 'bcrt1qlockup',
        service_url: 'http://mock-boltz',
        tx_id: randomBytes(32).toString('hex'),
        lockup_tx_hex: '00',
        ...override,
    })
}
