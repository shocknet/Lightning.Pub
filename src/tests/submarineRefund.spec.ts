import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp'
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule
import { initEccLib, Transaction, address } from 'bitcoinjs-lib'
import {
    Musig, SwapTreeSerializer, TaprootUtils, Scripts, swapTree, detectSwap, OutputType,
} from 'boltz-core'
import { createHash, randomBytes } from 'crypto'
import { ECPairFactory } from 'ecpair'
import http from 'http'
import * as ecc from 'tiny-secp256k1'
import { SubmarineSwaps } from '../services/lnd/swaps/submarineSwaps.js'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { caughtErrorMessage, getNetwork, loggedPost, SWAP_PROVIDER_HTTP_TIMEOUT_MS } from '../services/lnd/swaps/swapHelpers.js'
import { getLogger } from '../services/helpers/logger.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

initEccLib(ecc)

const TIP = 920_000
const TIMEOUT = TIP + 144
const DEST = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080'
const LOCKUP_SATS = 100_000

export default async (T: StorageTestBase) => {
    testCaughtErrorMessage(T)
    await testProviderHttpTimesOut(T)
    await testTimeoutRefundSkipsCooperative(T)
    await testInvalidPartialFallsBackToUnilateral(T)
    await testRefundPublishesLocallyWithoutProvider(T)
    await testStaleProviderAckDoesNotBlockRefund(T)
    await testRefundHexPersistedBeforeBroadcast(T)
    await testRefundRetryFlushFailureDoesNotBroadcast(T)
    await testRefundSpendsTaprootNotDecoy(T)
    await testRefundRejectsDecoyOnlyLockup(T)
}

const testCaughtErrorMessage = (T: StorageTestBase) => {
    T.d('starting caughtErrorMessage reads thrown strings')
    T.expect(caughtErrorMessage('invalid partial signature')).to.equal('invalid partial signature')
    T.expect(caughtErrorMessage(new Error('boom'))).to.equal('boom')
    T.expect(caughtErrorMessage(undefined)).to.equal('undefined')
    T.d('string throws are not read as undefined')
}

const testProviderHttpTimesOut = async (T: StorageTestBase) => {
    T.d('starting provider HTTP requests are bounded')
    const server = http.createServer((_req, _res) => { /* never respond */ })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address()
    if (!addr || typeof addr === 'string') {
        throw new Error('failed to bind hang server')
    }
    const started = Date.now()
    const result = await loggedPost(getLogger({ component: 'hang-test' }), `http://127.0.0.1:${addr.port}/v2/hang`, {}, 200)
    const elapsed = Date.now() - started
    server.close()
    T.expect(result.ok).to.equal(false)
    T.expect(elapsed).to.be.lessThan(SWAP_PROVIDER_HTTP_TIMEOUT_MS)
    T.expect(elapsed).to.be.lessThan(2_000)
    T.d('hung provider request returned instead of stalling refund construction')
}

const testTimeoutRefundSkipsCooperative = async (T: StorageTestBase) => {
    T.d('starting timeout refund does not ask the provider for a cooperative signature')
    const fixture = await buildSubmarineLockup()
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    let coopCalls = 0
    swapper.getPartialRefundSignature = async () => {
        coopCalls++
        return { ok: false, error: 'should not be called' }
    }
    const result = await swapper.RefundSwap({
        swapId: fixture.swapId,
        claimPublicKey: fixture.claimPublicKey,
        swapTree: fixture.swapTree,
        timeoutBlockHeight: TIMEOUT,
        privateKeyHex: fixture.refundPriv,
        refundAddress: DEST,
        currentHeight: TIMEOUT,
        lockupTxHex: fixture.lockupHex,
        feePerVbyte: 2,
        allowEarlyRefund: false,
    })
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    T.expect(coopCalls).to.equal(0)
    if (result.ok) {
        T.expect(result.publish.done).to.equal(false)
        T.expect(result.publish.usedCooperative).to.equal(false)
        T.expect(result.publish.txId).to.equal(Transaction.fromHex(result.publish.txHex).getId())
    }
    T.d('timed-out refunds are built unilaterally with a locally computed txid')
}

const testInvalidPartialFallsBackToUnilateral = async (T: StorageTestBase) => {
    T.d('starting invalid partial signature (string throw) is classified as unilateral')
    const fixture = await buildSubmarineLockup()
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    swapper.getPartialRefundSignature = async () => {
        throw 'invalid partial signature'
    }
    const refundKeys = ECPairFactory(ecc).fromPrivateKey(Buffer.from(fixture.refundPriv, 'hex'))
    const constructed = await swapper.constructTaprootRefund(
        fixture.swapId,
        fixture.claimPublicKey,
        fixture.swapTree,
        TIMEOUT,
        Transaction.fromHex(fixture.lockupHex),
        refundKeys,
        DEST,
        2,
        true,
        true,
    )
    T.expect(constructed.ok, !constructed.ok ? constructed.error : '').to.equal(true)
    if (constructed.ok) {
        T.expect(constructed.usedCooperative).to.equal(false)
        T.expect(constructed.transaction.ins[0].witness.length).to.be.greaterThan(1)
    }
    T.d('string-throw invalid partials fall back to a script-path refund instead of a cooperative publish')
}

const testRefundPublishesLocallyWithoutProvider = async (T: StorageTestBase) => {
    T.d('starting refund recovery when swaps are disabled and the provider URL is gone')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture)
    const swaps = disabledSwaps(T)
    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    const result = await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    T.expect(result.published).to.equal(true)
    T.expect(broadcasts.length).to.equal(1)
    T.expect(result.txId).to.equal(Transaction.fromHex(broadcasts[0]).getId())
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex).to.equal(broadcasts[0])
    T.expect(row?.refund_tx_id).to.equal(result.txId)
    T.expect(row?.refund_tx_id).to.not.equal('provider-said-this')
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('refund published through LND with a locally computed id while swaps were disabled')
}

const testStaleProviderAckDoesNotBlockRefund = async (T: StorageTestBase) => {
    T.d('starting a leftover provider refund id without hex does not skip independent publish')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture, { refund_tx_id: 'ff'.repeat(32) })
    const swaps = disabledSwaps(T)
    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    const result = await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    T.expect(result.published).to.equal(true)
    T.expect(result.txId).to.not.equal('ff'.repeat(32))
    T.expect(broadcasts.length).to.equal(1)
    T.expect(result.txId).to.equal(Transaction.fromHex(broadcasts[0]).getId())
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('false publication acknowledgement did not freeze recovery')
}

const testRefundHexPersistedBeforeBroadcast = async (T: StorageTestBase) => {
    T.d('starting refund hex is durable before LND broadcast')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture)
    const swaps = disabledSwaps(T)
    swaps.SetLnd({
        BroadcastTransaction: async () => { throw new Error('no peers') },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    let threw = false
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('no peers')
    }
    T.expect(threw).to.equal(true)
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(!!row?.refund_tx_hex).to.equal(true)
    T.expect(row?.refund_tx_id || '').to.equal('')

    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    const retried = await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    T.expect(retried.published).to.equal(true)
    T.expect(broadcasts).to.deep.equal([row?.refund_tx_hex])
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('retry rebroadcast the saved hex instead of trusting a provider id')
}

const testRefundRetryFlushFailureDoesNotBroadcast = async (T: StorageTestBase) => {
    T.d('starting refund retry does not broadcast if the backup flush fails')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture)
    const swaps = disabledSwaps(T)
    swaps.SetLnd({
        BroadcastTransaction: async () => { throw new Error('no peers') },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    } catch (err: any) {
        T.expect(err.message).to.equal('no peers')
    }
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(!!row?.refund_tx_hex).to.equal(true)

    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    swaps.SetBackupManager({
        notifyBackupTable: async () => { },
        flushTablesNow: async () => { throw new Error('backup dest down') },
    } as any)
    let threw = false
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('backup dest down')
    }
    T.expect(threw).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('persisted refund hex stayed unpublished without a successful backup')
}

const testRefundSpendsTaprootNotDecoy = async (T: StorageTestBase) => {
    T.d('starting refund spends the P2TR lockup when a matching P2WSH decoy precedes it')
    const fixture = await buildSubmarineLockup()
    const decoyTx = prependP2wshDecoy(fixture.lockupHex, fixture.tweakedKey, LOCKUP_SATS)
    const detected = detectSwap(fixture.tweakedKey, decoyTx)
    T.expect(detected?.vout).to.equal(0)
    T.expect(detected?.type).to.not.equal(OutputType.Taproot)

    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const result = await swapper.RefundSwap({
        swapId: fixture.swapId,
        claimPublicKey: fixture.claimPublicKey,
        swapTree: fixture.swapTree,
        timeoutBlockHeight: TIMEOUT,
        privateKeyHex: fixture.refundPriv,
        refundAddress: DEST,
        currentHeight: TIMEOUT,
        lockupTxHex: decoyTx.toHex(),
        feePerVbyte: 2,
        allowEarlyRefund: false,
    })
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    if (result.ok) {
        const refundTx = Transaction.fromHex(result.publish.txHex)
        T.expect(refundTx.ins[0].index).to.equal(1)
        T.expect(result.publish.usedCooperative).to.equal(false)
    }
    T.d('timeout refund spent the genuine P2TR at vout 1 rather than the decoy')
}

const testRefundRejectsDecoyOnlyLockup = async (T: StorageTestBase) => {
    T.d('starting refund rejects a lockup that only has a P2WSH decoy')
    const fixture = await buildSubmarineLockup()
    const decoyOnly = new Transaction()
    decoyOnly.version = 2
    decoyOnly.addInput(Buffer.alloc(32), 0)
    decoyOnly.addOutput(Scripts.p2wshOutput(fixture.tweakedKey), LOCKUP_SATS)
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const result = await swapper.RefundSwap({
        swapId: fixture.swapId,
        claimPublicKey: fixture.claimPublicKey,
        swapTree: fixture.swapTree,
        timeoutBlockHeight: TIMEOUT,
        privateKeyHex: fixture.refundPriv,
        refundAddress: DEST,
        currentHeight: TIMEOUT,
        lockupTxHex: decoyOnly.toHex(),
        feePerVbyte: 2,
        allowEarlyRefund: false,
    })
    T.expect(result.ok).to.equal(false)
    if (!result.ok) {
        T.expect(result.error).to.equal('Could not detect swap output in lockup transaction')
    }
    T.d('a P2WSH-only lockup is not treated as a refundable Taproot output')
}

const disabledSwaps = (T: StorageTestBase) => {
    return new Swaps({
        getSettings: () => ({
            lndSettings: { network: 'regtest' as const },
            swapsSettings: {
                enableSwaps: false,
                boltzHttpUrl: '',
                boltzWebSocketUrl: '',
                boltsHttpUrlAlt: '',
                boltsWebSocketUrlAlt: '',
            },
        }),
    } as any, T.storage)
}

const insertFundedRefundable = async (T: StorageTestBase, fixture: Awaited<ReturnType<typeof buildSubmarineLockup>>, extra: Record<string, unknown> = {}) => {
    return T.storage.paymentStorage.AddInvoiceSwap({
        app_user_id: 'system:admin',
        swap_quote_id: fixture.swapId,
        swap_tree: typeof fixture.swapTree === 'string' ? fixture.swapTree : JSON.stringify(fixture.swapTree),
        claim_public_key: fixture.claimPublicKey,
        payment_hash: fixture.paymentHash,
        timeout_block_height: TIMEOUT,
        invoice: 'lnbcrt-test',
        invoice_amount: LOCKUP_SATS - 1_000,
        transaction_amount: LOCKUP_SATS,
        swap_fee_sats: 800,
        chain_fee_sats: 200,
        ephemeral_public_key: fixture.refundPub,
        ephemeral_private_key: fixture.refundPriv,
        address: fixture.lockupAddress,
        service_url: 'http://old-provider-that-was-removed',
        tx_id: randomBytes(32).toString('hex'),
        lockup_tx_hex: fixture.lockupHex,
        ...extra,
    })
}

const buildSubmarineLockup = async () => {
    const paymentHash = createHash('sha256').update(randomBytes(32)).digest()
    const refundKeys = ECPairFactory(ecc).makeRandom()
    const claimKeys = ECPairFactory(ecc).makeRandom()
    if (!refundKeys.privateKey) {
        throw new Error('failed to generate refund key')
    }
    const tree = swapTree(
        false,
        paymentHash,
        Buffer.from(claimKeys.publicKey),
        Buffer.from(refundKeys.publicKey),
        TIMEOUT,
    )
    const musig = new Musig(await zkpInit(), refundKeys, randomBytes(32), [
        Buffer.from(claimKeys.publicKey),
        Buffer.from(refundKeys.publicKey),
    ])
    const tweakedKey = TaprootUtils.tweakMusig(musig, tree.tree)
    const lockupAddress = address.fromOutputScript(Scripts.p2trOutput(tweakedKey), getNetwork('regtest'))
    const lockup = new Transaction()
    lockup.version = 2
    lockup.addInput(Buffer.alloc(32), 0)
    lockup.addOutput(address.toOutputScript(lockupAddress, getNetwork('regtest')), LOCKUP_SATS)
    return {
        swapId: `swap-${randomBytes(8).toString('hex')}`,
        paymentHash: paymentHash.toString('hex'),
        refundPriv: Buffer.from(refundKeys.privateKey).toString('hex'),
        refundPub: Buffer.from(refundKeys.publicKey).toString('hex'),
        claimPublicKey: Buffer.from(claimKeys.publicKey).toString('hex'),
        swapTree: JSON.stringify(SwapTreeSerializer.serializeSwapTree(tree)),
        lockupAddress,
        lockupHex: lockup.toHex(),
        tweakedKey,
    }
}

const prependP2wshDecoy = (lockupHex: string, tweakedKey: Buffer, decoyValue: number) => {
    const original = Transaction.fromHex(lockupHex)
    const decoy = new Transaction()
    decoy.version = 2
    decoy.addInput(Buffer.alloc(32), 0)
    decoy.addOutput(Scripts.p2wshOutput(tweakedKey), decoyValue)
    for (const output of original.outs) {
        decoy.addOutput(output.script, output.value)
    }
    return decoy
}
