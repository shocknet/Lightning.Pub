import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp'
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule
import { initEccLib, Transaction, address, payments } from 'bitcoinjs-lib'
import {
    Musig, SwapTreeSerializer, TaprootUtils, Scripts, swapTree, detectSwap, OutputType,
} from 'boltz-core'
import { createHash, randomBytes } from 'crypto'
import { ECPairFactory } from 'ecpair'
import http from 'http'
import * as ecc from 'tiny-secp256k1'
import { SubmarineSwaps } from '../services/lnd/swaps/submarineSwaps.js'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { assertLockupMatchesFunding, caughtErrorMessage, getNetwork, inspectRefundSpend, loggedGet, loggedPost, shouldReplacePersistedRefund, SWAP_PROVIDER_HTTP_TIMEOUT_MS, SWAP_PROVIDER_MAX_RESPONSE_BYTES } from '../services/lnd/swaps/swapHelpers.js'
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
    testShouldReplacePersistedRefund(T)
    testAssertLockupMatchesFunding(T)
    await testProviderHttpTimesOut(T)
    await testProviderHttpTrickleTimesOut(T)
    await testProviderHttpRejectsOversizedBody(T)
    await testTimeoutRefundSkipsCooperative(T)
    await testInvalidPartialFallsBackToUnilateral(T)
    await testRefundPublishesLocallyWithoutProvider(T)
    await testStaleProviderAckDoesNotBlockRefund(T)
    await testRefundHexPersistedBeforeBroadcast(T)
    await testRefundRetryFlushFailureDoesNotBroadcast(T)
    await testRefundRejectsZeroFee(T)
    await testRefundRetryAtHigherFeeReplacesHex(T)
    await testRefundLowerFeeRetryRebroadcasts(T)
    await testRefundSpendsTaprootNotDecoy(T)
    await testRefundRejectsDecoyOnlyLockup(T)
    await testRefundRejectsMissingLockupHex(T)
    await testRefundRejectsMismatchedLockupHex(T)
    await testRefundRejectsUnderpaidLockupHex(T)
    await testRefundDoesNotRepublishWrongOutpoint(T)
}

const testCaughtErrorMessage = (T: StorageTestBase) => {
    T.d('starting caughtErrorMessage reads thrown strings')
    T.expect(caughtErrorMessage('invalid partial signature')).to.equal('invalid partial signature')
    T.expect(caughtErrorMessage(new Error('boom'))).to.equal('boom')
    T.expect(caughtErrorMessage(undefined)).to.equal('undefined')
    T.d('string throws are not read as undefined')
}

const testShouldReplacePersistedRefund = (T: StorageTestBase) => {
    T.d('starting persisted refund replacement policy')
    T.expect(shouldReplacePersistedRefund(0, 20)).to.equal(true)
    T.expect(shouldReplacePersistedRefund(1, 20)).to.equal(true)
    T.expect(shouldReplacePersistedRefund(20, 20)).to.equal(false)
    T.expect(shouldReplacePersistedRefund(20, 1)).to.equal(false)
    T.expect(shouldReplacePersistedRefund(0, 0)).to.equal(false)
    T.d('only a strictly higher positive fee rate replaces a persisted refund')
}

const testAssertLockupMatchesFunding = (T: StorageTestBase) => {
    T.d('starting lockup funding bind checks txid and amount')
    const lockup = new Transaction()
    lockup.version = 2
    lockup.addInput(Buffer.alloc(32), 0)
    const script = address.toOutputScript(DEST, getNetwork('regtest'))
    lockup.addOutput(script, LOCKUP_SATS)
    const expected = { txId: lockup.getId(), outputScript: script, amountSats: LOCKUP_SATS }
    assertLockupMatchesFunding(lockup, expected)

    const wrongId = { ...expected, txId: randomBytes(32).toString('hex') }
    T.expect(() => assertLockupMatchesFunding(lockup, wrongId)).to.throw('lockup transaction does not match stored funding id')

    const wrongAmount = { ...expected, amountSats: 1_000 }
    T.expect(() => assertLockupMatchesFunding(lockup, wrongAmount)).to.throw('lockup output does not match expected amount 1000')

    const otherScript = payments.p2wpkh({
        pubkey: Buffer.from(ECPairFactory(ecc).makeRandom().publicKey),
        network: getNetwork('regtest'),
    }).output
    if (!otherScript) {
        throw new Error('failed to derive a decoy script')
    }
    T.expect(() => assertLockupMatchesFunding(lockup, { ...expected, outputScript: otherScript })).to.throw('lockup transaction does not pay the expected swap output')
    T.d('txid, amount, and script must all match the stored funding')
}

const listenHangServer = async (handler: http.RequestListener) => {
    const server = http.createServer(handler)
    const sockets = new Set<{ destroy: () => void }>()
    server.on('connection', socket => {
        sockets.add(socket)
        socket.on('close', () => sockets.delete(socket))
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address()
    if (!addr || typeof addr === 'string') {
        for (const socket of sockets) socket.destroy()
        server.close()
        throw new Error('failed to bind hang server')
    }
    return {
        url: `http://127.0.0.1:${addr.port}/v2/hang`,
        close: () => {
            for (const socket of sockets) socket.destroy()
            sockets.clear()
            server.close()
        },
    }
}

const testProviderHttpTimesOut = async (T: StorageTestBase) => {
    T.d('starting provider HTTP requests are bounded')
    const { url, close } = await listenHangServer((_req, _res) => { /* never respond */ })
    try {
        const started = Date.now()
        const result = await loggedPost(getLogger({ component: 'hang-test' }), url, {}, 200)
        const elapsed = Date.now() - started
        T.expect(result.ok).to.equal(false)
        T.expect(elapsed).to.be.lessThan(SWAP_PROVIDER_HTTP_TIMEOUT_MS)
        T.expect(elapsed).to.be.lessThan(2_000)
        T.d('hung provider request returned instead of stalling refund construction')
    } finally {
        close()
    }
}

const testProviderHttpTrickleTimesOut = async (T: StorageTestBase) => {
    T.d('starting provider HTTP trickle bodies are bounded')
    const timers: NodeJS.Timeout[] = []
    const { url, close } = await listenHangServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        const drip = setInterval(() => {
            if (res.destroyed || !res.writable) {
                clearInterval(drip)
                return
            }
            res.write(' ')
        }, 20)
        // If abort is broken, finish so the client fails an assertion instead of hanging.
        const finish = setTimeout(() => {
            clearInterval(drip)
            if (!res.destroyed && !res.writableEnded) {
                res.end('{}')
            }
        }, 800)
        const stop = () => {
            clearInterval(drip)
            clearTimeout(finish)
        }
        timers.push(drip, finish)
        res.on('close', stop)
        res.on('error', stop)
    })
    try {
        const log = getLogger({ component: 'trickle-test' })
        const started = Date.now()
        const posted = await loggedPost(log, url, {}, 200)
        const gotten = await loggedGet(log, url, 200)
        const elapsed = Date.now() - started
        T.expect(posted.ok).to.equal(false)
        T.expect(gotten.ok).to.equal(false)
        T.expect(elapsed).to.be.lessThan(700)
        T.d('trickling provider body was aborted instead of completing after the idle timeout')
    } finally {
        for (const timer of timers) {
            clearInterval(timer)
            clearTimeout(timer)
        }
        close()
    }
}

const testProviderHttpRejectsOversizedBody = async (T: StorageTestBase) => {
    T.d('starting provider HTTP rejects oversized bodies')
    // Valid JSON over the cap: without maxContentLength axios would parse this as success.
    const payload = `{"pad":"${'a'.repeat(SWAP_PROVIDER_MAX_RESPONSE_BYTES)}"}`
    const { url, close } = await listenHangServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(payload)
    })
    try {
        const result = await loggedGet(getLogger({ component: 'size-test' }), url, 2_000)
        T.expect(result.ok).to.equal(false)
        T.d('oversized provider body was rejected')
    } finally {
        close()
    }
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

const testRefundRejectsZeroFee = async (T: StorageTestBase) => {
    T.d('starting refund rejects a zero sat/vbyte fee')
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
    let threw = false
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 0, DEST, TIMEOUT)
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('sat per v byte must be a positive integer')
    }
    T.expect(threw).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex || '').to.equal('')
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('zero-fee refunds are refused before persist or broadcast')
}

const testRefundRetryAtHigherFeeReplacesHex = async (T: StorageTestBase) => {
    T.d('starting a higher-fee refund retry replaces the persisted hex')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture)
    const swaps = disabledSwaps(T)
    swaps.SetLnd({
        BroadcastTransaction: async () => { throw new Error('min relay fee not met') },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 1, DEST, TIMEOUT)
    } catch (err: any) {
        T.expect(err.message).to.equal('min relay fee not met')
    }
    const persisted = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(!!persisted?.refund_tx_hex).to.equal(true)
    T.expect(persisted?.refund_address).to.equal(DEST)
    const lockupTx = Transaction.fromHex(fixture.lockupHex)
    const original = inspectRefundSpend(Transaction.fromHex(persisted!.refund_tx_hex), lockupTx)
    T.expect(original.satPerVbyte).to.equal(1)

    const otherDest = payments.p2wpkh({
        pubkey: Buffer.from(ECPairFactory(ecc).makeRandom().publicKey),
        network: getNetwork('regtest'),
    }).address
    if (!otherDest) {
        throw new Error('failed to derive a second refund address')
    }
    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    const retried = await swaps.RefundInvoiceSwap(saved.swap_operation_id, 20, otherDest, TIMEOUT)
    T.expect(broadcasts.length).to.equal(1)
    T.expect(broadcasts[0]).to.not.equal(persisted?.refund_tx_hex)
    const replacement = inspectRefundSpend(Transaction.fromHex(broadcasts[0]), lockupTx)
    T.expect(replacement.prevTxId).to.equal(original.prevTxId)
    T.expect(replacement.vout).to.equal(original.vout)
    T.expect(replacement.outputScript.equals(original.outputScript)).to.equal(true)
    T.expect(replacement.feeSats).to.be.greaterThan(original.feeSats)
    T.expect(replacement.satPerVbyte).to.be.greaterThan(original.satPerVbyte)
    T.expect(retried.txId).to.equal(Transaction.fromHex(broadcasts[0]).getId())
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex).to.equal(broadcasts[0])
    T.expect(row?.refund_address).to.equal(DEST)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('retry at 20 sat/vbyte published a higher-fee spend of the same outpoint to the persisted destination')
}

const testRefundLowerFeeRetryRebroadcasts = async (T: StorageTestBase) => {
    T.d('starting a lower-fee refund retry rebroadcasts the persisted hex')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture)
    const swaps = disabledSwaps(T)
    swaps.SetLnd({
        BroadcastTransaction: async () => { throw new Error('no peers') },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 20, DEST, TIMEOUT)
    } catch (err: any) {
        T.expect(err.message).to.equal('no peers')
    }
    const persisted = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(!!persisted?.refund_tx_hex).to.equal(true)

    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    const retried = await swaps.RefundInvoiceSwap(saved.swap_operation_id, 1, DEST, TIMEOUT)
    T.expect(broadcasts).to.deep.equal([persisted?.refund_tx_hex])
    T.expect(retried.txId).to.equal(Transaction.fromHex(broadcasts[0]).getId())
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('a lower requested fee did not replace the persisted refund')
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

const testRefundRejectsMissingLockupHex = async (T: StorageTestBase) => {
    T.d('starting refund refuses a funded row with no lockup hex')
    const fixture = await buildSubmarineLockup()
    const saved = await insertFundedRefundable(T, fixture, { lockup_tx_hex: '' })
    const swaps = disabledSwaps(T)
    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    let threw = false
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('lockup transaction hex is required')
    }
    T.expect(threw).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex || '').to.equal('')
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('missing lockup hex fails closed instead of fetching from a provider')
}

const testRefundRejectsMismatchedLockupHex = async (T: StorageTestBase) => {
    T.d('starting refund rejects a stored lockup whose txid does not match funding')
    const fixture = await buildSubmarineLockup()
    const genuine = Transaction.fromHex(fixture.lockupHex)
    const substitute = lockupPayingScript(genuine.outs[0].script, LOCKUP_SATS)
    T.expect(substitute.getId()).to.not.equal(genuine.getId())
    const saved = await insertFundedRefundable(T, fixture, { lockup_tx_hex: substitute.toHex() })
    const swaps = disabledSwaps(T)
    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    let threw = false
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('lockup transaction does not match stored funding id')
    }
    T.expect(threw).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex || '').to.equal('')
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('a stored hex that does not match the funding id is not refunded')
}

const testRefundRejectsUnderpaidLockupHex = async (T: StorageTestBase) => {
    T.d('starting refund rejects a stored lockup with the wrong amount')
    const fixture = await buildSubmarineLockup()
    const genuine = Transaction.fromHex(fixture.lockupHex)
    const underpaid = lockupPayingScript(genuine.outs[0].script, 1_000)
    const saved = await insertFundedRefundable(T, fixture, {
        lockup_tx_hex: underpaid.toHex(),
        tx_id: underpaid.getId(),
    })
    const swaps = disabledSwaps(T)
    const broadcasts: string[] = []
    swaps.SetLnd({
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIMEOUT }),
    } as any)
    let threw = false
    try {
        await swaps.RefundInvoiceSwap(saved.swap_operation_id, 2, DEST, TIMEOUT)
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('lockup output does not match expected amount 100000')
    }
    T.expect(threw).to.equal(true)
    T.expect(broadcasts).to.deep.equal([])
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex || '').to.equal('')
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('an underpaid P2TR is not treated as the funded lockup')
}

const testRefundDoesNotRepublishWrongOutpoint = async (T: StorageTestBase) => {
    T.d('starting a leftover refund of a substituted lockup is reconstructed against the verified funding')
    const fixture = await buildSubmarineLockup()
    const genuine = Transaction.fromHex(fixture.lockupHex)
    const substitute = lockupPayingScript(genuine.outs[0].script, LOCKUP_SATS)
    const swapper = new SubmarineSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const poison = await swapper.RefundSwap({
        swapId: fixture.swapId,
        claimPublicKey: fixture.claimPublicKey,
        swapTree: fixture.swapTree,
        timeoutBlockHeight: TIMEOUT,
        privateKeyHex: fixture.refundPriv,
        refundAddress: DEST,
        currentHeight: TIMEOUT,
        lockupTxHex: substitute.toHex(),
        feePerVbyte: 2,
        allowEarlyRefund: false,
    })
    T.expect(poison.ok, !poison.ok ? poison.error : '').to.equal(true)
    if (!poison.ok) {
        throw new Error(poison.error)
    }
    const saved = await insertFundedRefundable(T, fixture, {
        refund_tx_hex: poison.publish.txHex,
        refund_address: DEST,
    })
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
    T.expect(broadcasts.length).to.equal(1)
    T.expect(broadcasts[0]).to.not.equal(poison.publish.txHex)
    const refundTx = Transaction.fromHex(broadcasts[0])
    T.expect(refundTx.ins[0].hash.equals(genuine.getHash())).to.equal(true)
    T.expect(refundTx.ins[0].hash.equals(substitute.getHash())).to.equal(false)
    T.expect(result.txId).to.equal(refundTx.getId())
    const row = await T.storage.paymentStorage.GetRefundableInvoiceSwap(saved.swap_operation_id)
    T.expect(row?.refund_tx_hex).to.equal(broadcasts[0])
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('the bound lockup refund replaced a leftover spend of the wrong outpoint')
}

const lockupPayingScript = (script: Buffer, value: number) => {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(randomBytes(32), 0)
    tx.addOutput(script, value)
    return tx
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
        tx_id: Transaction.fromHex(fixture.lockupHex).getId(),
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
