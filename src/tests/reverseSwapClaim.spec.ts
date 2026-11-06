import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp'
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule
import { initEccLib, Transaction, address } from 'bitcoinjs-lib'
import {
    Musig, SwapTreeSerializer, TaprootUtils, reverseSwapTree, Scripts,
    detectSwap, OutputType,
} from 'boltz-core'
import { createHash, randomBytes } from 'crypto'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import {
    REVERSE_CLAIM_CONFIRMATIONS,
    LockupSpendGuard,
    LockupSpendOutcome,
    ReverseClaimChain,
    ReverseClaimDeps,
    ReverseSwaps,
    TransactionSwapData,
    calculateReverseQuoteAmounts,
} from '../services/lnd/swaps/reverseSwaps.js'
import { getNetwork } from '../services/lnd/swaps/swapHelpers.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const TIP = 920_000
const FEES = { percentage: 0.5, minerFees: { claim: 150, lockup: 200 } }
const RECEIVE_SATS = 100_000
const AMOUNTS = calculateReverseQuoteAmounts(RECEIVE_SATS, FEES)
const DEST = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080'
const DUMMY_PREVOUT = Buffer.alloc(32, 1)

initEccLib(ecc)

const idleSpendGuard = (overrides: Partial<LockupSpendGuard> = {}): LockupSpendGuard => ({
    waitForHistorical: async () => false,
    isSpent: () => false,
    failure: () => undefined,
    outcome: new Promise<LockupSpendOutcome>(() => { }),
    stop: () => { },
    ...overrides,
})

const safeClaimDeps = (overrides: Partial<ReverseClaimDeps> = {}): ReverseClaimDeps => ({
    getChainTip: async () => TIP,
    watchLockupSpend: () => idleSpendGuard(),
    publish: async () => { },
    ...overrides,
})

export default async (T: StorageTestBase) => {
    await testLockupMustMatchSwapOutputAndAmount(T)
    await testDecoyOutputDoesNotBypassFundingValidation(T)
    await testClaimSpendsGenuineTaprootAfterDecoy(T)
    await testProviderWebsocketCannotFinishOrAbort(T)
    await testSignatureRefusalStillPublishesUnilateral(T)
    await testSubscribeClaimsOnlyAfterIndependentConfirmation(T)
    await testPersistsClaimBeforeCooperativeOrBroadcast(T)
    await testCoopPersistFailurePublishesUnilateral(T)
    await testCoinbaseLockupIsRejected(T)
    await testSpentLockupDoesNotDisclosePreimage(T)
    await testSpendAfterHistoricalWaitDoesNotDisclosePreimage(T)
    await testSpendWatchFailureDoesNotDisclosePreimage(T)
    await testClaimWindowClosingDoesNotDisclosePreimage(T)
    await testTimeoutDuringWaitDoesNotDisclosePreimage(T)
}

const testLockupMustMatchSwapOutputAndAmount = async (T: StorageTestBase) => {
    T.d('starting lockup parse rejects fabricated / underfunded txs')
    const { swapper, data, lockupAddress } = await setupClaim(T)
    const network = getNetwork('regtest')

    const wrongScript = new Transaction()
    wrongScript.version = 2
    wrongScript.addInput(DUMMY_PREVOUT, 0)
    wrongScript.addOutput(address.toOutputScript(DEST, network), AMOUNTS.onchainAmount)
    const missing = await swapper.parseAndValidateLockup(data, wrongScript.toHex())
    T.expect(missing.ok).to.equal(false)
    if (!missing.ok) {
        T.expect(missing.error).to.equal('No swap output found in lockup transaction')
    }

    const underfunded = new Transaction()
    underfunded.version = 2
    underfunded.addInput(DUMMY_PREVOUT, 0)
    underfunded.addOutput(address.toOutputScript(lockupAddress, network), AMOUNTS.onchainAmount - 1)
    const low = await swapper.parseAndValidateLockup(data, underfunded.toHex())
    T.expect(low.ok).to.equal(false)
    if (!low.ok) {
        T.expect(low.error).to.match(/^Lockup output underfunded/)
    }
    T.d('fabricated and underfunded lockups are rejected before any claim')
}

const DUST_SATS = 330

const testDecoyOutputDoesNotBypassFundingValidation = async (T: StorageTestBase) => {
    T.d('starting a full-value P2WSH decoy before a dust P2TR does not pass funding validation')
    const { swapper, data, lockupAddress } = await setupClaim(T)
    const tweakedKey = await tweakedKeyFromData(data)
    const decoyHex = buildDecoyLockupHex(tweakedKey, lockupAddress, AMOUNTS.onchainAmount, DUST_SATS)

    const detected = detectSwap(tweakedKey, Transaction.fromHex(decoyHex))
    T.expect(detected?.vout).to.equal(0)
    T.expect(detected?.value).to.equal(AMOUNTS.onchainAmount)
    T.expect(detected?.type).to.not.equal(OutputType.Taproot)

    let preimageSent = false
    const published: string[] = []
    const claimed = await swapper.claimConfirmedLockup(data, decoyHex, safeClaimDeps({
        cooperativeClaim: async () => {
            preimageSent = true
            return { ok: false, error: 'should not disclose preimage' }
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(claimed.ok).to.equal(false)
    if (!claimed.ok) {
        T.expect(claimed.error).to.match(/^Lockup output underfunded/)
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('decoy amount was ignored; dust P2TR was underfunded and the preimage stayed secret')
}

const testClaimSpendsGenuineTaprootAfterDecoy = async (T: StorageTestBase) => {
    T.d('starting claim spends the funded P2TR even when a matching P2WSH decoy precedes it')
    const { swapper, data, lockupAddress, preimage } = await setupClaim(T)
    const tweakedKey = await tweakedKeyFromData(data)
    const lockupHex = buildDecoyLockupHex(tweakedKey, lockupAddress, AMOUNTS.onchainAmount, AMOUNTS.onchainAmount)
    const parsed = await swapper.parseAndValidateLockup(data, lockupHex)
    T.expect(parsed.ok, !parsed.ok ? parsed.error : '').to.equal(true)
    if (!parsed.ok) {
        return
    }
    T.expect(parsed.swapOutput.type).to.equal(OutputType.Taproot)
    T.expect(parsed.swapOutput.vout).to.equal(1)
    T.expect(parsed.swapOutput.value).to.equal(AMOUNTS.onchainAmount)

    const published: string[] = []
    const result = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        cooperativeClaim: async () => ({ ok: false, error: 'signature refused' }),
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    T.expect(published.length).to.equal(1)
    const claimTx = Transaction.fromHex(published[0])
    T.expect(claimTx.ins[0].index).to.equal(1)
    T.expect(claimTx.ins[0].witness.length).to.equal(4)
    T.expect(Buffer.from(claimTx.ins[0].witness[1]).equals(Buffer.from(preimage, 'hex'))).to.equal(true)
    T.d('funded P2TR at vout 1 was claimed; the preceding decoy was not spent')
}

const testProviderWebsocketCannotFinishOrAbort = async (T: StorageTestBase) => {
    T.d('starting provider websocket statuses and bad payloads do not finish the swap')
    const { swapper, data, lockupHex, preimage } = await setupClaim(T)
    const statuses = [
        'transaction.mempool',
        'transaction.confirmed',
        'invoice.settled',
        'invoice.expired',
        'swap.expired',
        'transaction.failed',
    ]
    for (const status of statuses) {
        await swapper.handleSwapTransactionMessage(Buffer.from(JSON.stringify({
            event: 'update',
            args: [{ status, transaction: { hex: lockupHex } }],
        })))
    }
    await swapper.handleSwapTransactionMessage(Buffer.from('not-json'))
    await swapper.handleSwapTransactionMessage(Buffer.from(JSON.stringify({ event: 'update', args: [] })))

    let waitStarted: (() => void) | undefined
    const waiting = new Promise<void>(resolve => { waitStarted = resolve })
    let releaseLockup: ((value: { txHex: string }) => void) | undefined
    const published: string[] = []
    const done = new Promise<{ ok: true, txId: string } | { ok: false, error: string }>((resolve) => {
        void swapper.SubscribeToTransactionSwap(data, resolve, {
            ...safeClaimDeps({
                publish: async (txHex) => { published.push(txHex) },
                cooperativeClaim: async () => ({ ok: false, error: 'signature refused' }),
            }),
            heightHint: TIP,
            waitForLockup: () => {
                waitStarted?.()
                return new Promise(res => { releaseLockup = res })
            },
        })
    })
    await waiting
    await swapper.handleSwapTransactionMessage(Buffer.from(JSON.stringify({
        event: 'update',
        args: [{ status: 'transaction.failed' }],
    })))
    T.expect(published.length).to.equal(0)
    releaseLockup!({ txHex: lockupHex })
    const result = await done
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    T.expect(published.length).to.equal(1)
    const claimTx = Transaction.fromHex(published[0])
    T.expect(claimTx.ins[0].witness.length).to.equal(4)
    T.expect(Buffer.from(claimTx.ins[0].witness[1]).equals(Buffer.from(preimage, 'hex'))).to.equal(true)
    T.d('failed/expired websocket updates and bad payloads did not abort the independent claim')
}

const testSignatureRefusalStillPublishesUnilateral = async (T: StorageTestBase) => {
    T.d('starting cooperative signature refusal still publishes a script-path claim')
    const { swapper, data, lockupHex, preimage } = await setupClaim(T)
    let preimageSent = false
    const published: string[] = []
    const result = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        cooperativeClaim: async (req) => {
            preimageSent = true
            T.expect(req.preimage).to.equal(preimage)
            T.expect(published.length).to.equal(0)
            return { ok: false, error: 'signature refused' }
        },
        publish: async (txHex) => {
            T.expect(preimageSent).to.equal(true)
            published.push(txHex)
        },
    }))
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    if (!result.ok) {
        return
    }
    T.expect(result.usedCooperative).to.equal(false)
    T.expect(published.length).to.equal(1)
    const claimTx = Transaction.fromHex(published[0])
    T.expect(claimTx.getId()).to.equal(result.txId)
    T.expect(claimTx.ins.length).to.equal(1)
    T.expect(claimTx.ins[0].witness.length).to.equal(4)
    T.expect(Buffer.from(claimTx.ins[0].witness[1]).equals(Buffer.from(preimage, 'hex'))).to.equal(true)
    T.d('signature refusal still independently published a script-path claim')
}

const testSubscribeClaimsOnlyAfterIndependentConfirmation = async (T: StorageTestBase) => {
    T.d('starting subscribe waits for independent 1-conf lockup before claiming')
    const { swapper, data, lockupHex, lockupAddress, preimage } = await setupClaim(T)
    const network = getNetwork('regtest')
    const expectedScript = address.toOutputScript(lockupAddress, network)
    let waitScript: Buffer | undefined
    let waitConfs: number | undefined
    const published: string[] = []
    const done = new Promise<{ ok: true, txId: string } | { ok: false, error: string }>((resolve) => {
        void swapper.SubscribeToTransactionSwap(data, resolve, {
            ...safeClaimDeps({
                cooperativeClaim: async () => ({ ok: false, error: 'signature refused' }),
                publish: async (txHex) => { published.push(txHex) },
            }),
            heightHint: TIP,
            waitForLockup: async (script, numConfs) => {
                waitScript = script
                waitConfs = numConfs
                return { txHex: lockupHex }
            },
        })
    })
    const result = await done
    T.expect(waitConfs).to.equal(REVERSE_CLAIM_CONFIRMATIONS)
    T.expect(waitScript && expectedScript.equals(waitScript)).to.equal(true)
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    T.expect(published.length).to.equal(1)
    const claimTx = Transaction.fromHex(published[0])
    T.expect(claimTx.ins[0].witness.length).to.equal(4)
    T.expect(Buffer.from(claimTx.ins[0].witness[1]).equals(Buffer.from(preimage, 'hex'))).to.equal(true)
    T.d('subscribe claimed only after independent confirmation and published unilaterally')
}

const testPersistsClaimBeforeCooperativeOrBroadcast = async (T: StorageTestBase) => {
    T.d('starting claim is persisted before preimage disclosure or broadcast')
    const { swapper, data, lockupHex } = await setupClaim(T)
    const order: string[] = []
    const result = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        persistClaim: async () => { order.push('persist') },
        cooperativeClaim: async () => {
            order.push('coop')
            return { ok: false, error: 'signature refused' }
        },
        publish: async () => { order.push('publish') },
    }))
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    T.expect(order).to.deep.equal(['persist', 'coop', 'publish'])
    T.d('unilateral claim was persisted before cooperative disclosure and broadcast')
}

const testCoopPersistFailurePublishesUnilateral = async (T: StorageTestBase) => {
    T.d('starting cooperative persist failure publishes the script-path claim')
    const { swapper, data, lockupHex, preimage } = await setupClaim(T)
    const coopTx = new Transaction()
    coopTx.version = 2
    coopTx.addInput(Buffer.alloc(32), 1)
    coopTx.addOutput(Buffer.from('6a', 'hex'), 0)
    ;(swapper as any).tryCooperativeClaim = async () => ({ ok: true, tx: coopTx })
    const persisted: string[] = []
    const published: string[] = []
    const result = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        persistClaim: async (txHex) => {
            if (persisted.length >= 1) {
                throw new Error('coop persist fail')
            }
            persisted.push(txHex)
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    if (!result.ok) {
        return
    }
    T.expect(result.usedCooperative).to.equal(false)
    T.expect(published.length).to.equal(1)
    T.expect(published[0]).to.equal(persisted[0])
    T.expect(published[0]).to.not.equal(coopTx.toHex())
    const claimTx = Transaction.fromHex(published[0])
    T.expect(claimTx.ins[0].witness.length).to.equal(4)
    T.expect(Buffer.from(claimTx.ins[0].witness[1]).equals(Buffer.from(preimage, 'hex'))).to.equal(true)
    T.d('failed cooperative persist still published the already-saved script-path claim')
}

const testCoinbaseLockupIsRejected = async (T: StorageTestBase) => {
    T.d('starting coinbase lockup is rejected before preimage disclosure')
    const { swapper, data, lockupAddress } = await setupClaim(T)
    const coinbaseHex = buildLockupHex(lockupAddress, AMOUNTS.onchainAmount, Buffer.alloc(32), 0xffffffff)
    let preimageSent = false
    const published: string[] = []
    const parsed = await swapper.parseAndValidateLockup(data, coinbaseHex)
    T.expect(parsed.ok).to.equal(false)
    if (!parsed.ok) {
        T.expect(parsed.error).to.equal('coinbase lockup cannot be claimed before maturity')
    }
    const claimed = await swapper.claimConfirmedLockup(data, coinbaseHex, safeClaimDeps({
        cooperativeClaim: async () => {
            preimageSent = true
            return { ok: false, error: 'should not disclose preimage' }
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(claimed.ok).to.equal(false)
    if (!claimed.ok) {
        T.expect(claimed.error).to.equal('coinbase lockup cannot be claimed before maturity')
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('coinbase funding was rejected and the preimage stayed secret')
}

const testSpentLockupDoesNotDisclosePreimage = async (T: StorageTestBase) => {
    T.d('starting spent lockup does not disclose the preimage')
    const { swapper, data, lockupHex } = await setupClaim(T)
    let preimageSent = false
    const published: string[] = []
    const claimed = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        watchLockupSpend: () => idleSpendGuard({
            waitForHistorical: async () => true,
            isSpent: () => true,
            outcome: Promise.resolve({ kind: 'spent' }),
        }),
        cooperativeClaim: async () => {
            preimageSent = true
            return { ok: false, error: 'should not disclose preimage' }
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(claimed.ok).to.equal(false)
    if (!claimed.ok) {
        T.expect(claimed.error).to.equal('lockup output is already spent')
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('a historical confirmation of a spent output did not disclose the preimage')
}

const testSpendAfterHistoricalWaitDoesNotDisclosePreimage = async (T: StorageTestBase) => {
    T.d('starting a spend reported after the historical wait does not disclose the preimage')
    const { swapper, data, lockupHex } = await setupClaim(T)
    let preimageSent = false
    const published: string[] = []
    let spent = false
    const claimed = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        watchLockupSpend: () => idleSpendGuard({
            waitForHistorical: async () => false,
            isSpent: () => spent,
        }),
        persistClaim: async () => {
            spent = true
        },
        cooperativeClaim: async () => {
            preimageSent = true
            return { ok: false, error: 'should not disclose preimage' }
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(claimed.ok).to.equal(false)
    if (!claimed.ok) {
        T.expect(claimed.error).to.equal('lockup output is already spent')
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('a late spend still blocked preimage disclosure')
}

const testSpendWatchFailureDoesNotDisclosePreimage = async (T: StorageTestBase) => {
    T.d('starting a spend-watch failure after the historical wait does not disclose the preimage')
    const { swapper, data, lockupHex } = await setupClaim(T)
    let preimageSent = false
    const published: string[] = []
    const watchError = new Error('chain notifier down')
    let failed: Error | undefined
    const claimed = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        watchLockupSpend: () => idleSpendGuard({
            waitForHistorical: async () => false,
            failure: () => failed,
        }),
        persistClaim: async () => {
            failed = watchError
        },
        cooperativeClaim: async () => {
            preimageSent = true
            return { ok: false, error: 'should not disclose preimage' }
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(claimed.ok).to.equal(false)
    if (!claimed.ok) {
        T.expect(claimed.error).to.equal('failed to check lockup spend status: chain notifier down')
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('a dead spend watch failed closed and kept the preimage secret')
}

const testClaimWindowClosingDoesNotDisclosePreimage = async (T: StorageTestBase) => {
    T.d('starting claim refuses disclosure when the refund height is too close')
    const { swapper, data, lockupHex } = await setupClaim(T)
    let preimageSent = false
    const published: string[] = []
    const claimed = await swapper.claimConfirmedLockup(data, lockupHex, safeClaimDeps({
        getChainTip: async () => data.createdResponse.timeoutBlockHeight - 1,
        cooperativeClaim: async () => {
            preimageSent = true
            return { ok: false, error: 'should not disclose preimage' }
        },
        publish: async (txHex) => { published.push(txHex) },
    }))
    T.expect(claimed.ok).to.equal(false)
    if (!claimed.ok) {
        T.expect(claimed.error).to.match(/only 1 blocks left to claim/)
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('refund-eligible confirmation did not disclose the preimage')
}

const testTimeoutDuringWaitDoesNotDisclosePreimage = async (T: StorageTestBase) => {
    T.d('starting subscribe rechecks the tip after confirmation before disclosure')
    const { swapper, data, lockupHex } = await setupClaim(T)
    let tip = TIP
    let preimageSent = false
    const published: string[] = []
    const chain: ReverseClaimChain = {
        ...safeClaimDeps({
            getChainTip: async () => tip,
            cooperativeClaim: async () => {
                preimageSent = true
                return { ok: false, error: 'should not disclose preimage' }
            },
            publish: async (txHex) => { published.push(txHex) },
        }),
        heightHint: TIP,
        waitForLockup: async () => {
            tip = data.createdResponse.timeoutBlockHeight
            return { txHex: lockupHex }
        },
    }
    const done = new Promise<{ ok: true, txId: string } | { ok: false, error: string }>((resolve) => {
        void swapper.SubscribeToTransactionSwap(data, resolve, chain)
    })
    const result = await done
    T.expect(result.ok).to.equal(false)
    if (!result.ok) {
        T.expect(result.error).to.equal(`refund already valid at block ${data.createdResponse.timeoutBlockHeight} (tip ${data.createdResponse.timeoutBlockHeight})`)
    }
    T.expect(preimageSent).to.equal(false)
    T.expect(published.length).to.equal(0)
    T.d('a lockup confirmed after the refund deadline did not disclose the preimage')
}

const setupClaim = async (T: StorageTestBase) => {
    const valid = await buildValidReverseQuote()
    const swapper = new ReverseSwaps({ httpUrl: 'http://mock-boltz', wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const keys = ECPairFactory(ecc).fromPrivateKey(Buffer.from(valid.privKey, 'hex'))
    const data: TransactionSwapData = {
        createdResponse: valid.created,
        info: {
            destinationAddress: DEST,
            keys,
            chainFee: AMOUNTS.minerFee,
            preimage: Buffer.from(valid.preimage, 'hex'),
        },
    }
    const lockupHex = buildLockupHex(valid.created.lockupAddress, AMOUNTS.onchainAmount)
    T.expect(lockupHex.length).to.be.greaterThan(0)
    return { swapper, data, lockupHex, lockupAddress: valid.created.lockupAddress, preimage: valid.preimage }
}

const buildLockupHex = (lockupAddress: string, value: number, prevout = DUMMY_PREVOUT, vout = 0) => {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(prevout, vout)
    tx.addOutput(address.toOutputScript(lockupAddress, getNetwork('regtest')), value)
    return tx.toHex()
}

const buildDecoyLockupHex = (
    tweakedKey: Buffer,
    lockupAddress: string,
    decoyValue: number,
    genuineValue: number,
) => {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(DUMMY_PREVOUT, 0)
    tx.addOutput(Scripts.p2wshOutput(tweakedKey), decoyValue)
    tx.addOutput(address.toOutputScript(lockupAddress, getNetwork('regtest')), genuineValue)
    return tx.toHex()
}

const tweakedKeyFromData = async (data: TransactionSwapData) => {
    const boltzPublicKey = Buffer.from(data.createdResponse.refundPublicKey, 'hex')
    const swapTree = SwapTreeSerializer.deserializeSwapTree(data.createdResponse.swapTree)
    const musig = new Musig(await zkpInit(), data.info.keys, randomBytes(32), [
        boltzPublicKey,
        Buffer.from(data.info.keys.publicKey),
    ])
    return TaprootUtils.tweakMusig(musig, swapTree.tree)
}

const buildValidReverseQuote = async (timeout = TIP + 1_008) => {
    const preimage = randomBytes(32)
    const preimageHash = createHash('sha256').update(preimage).digest()
    const claimKeys = ECPairFactory(ecc).makeRandom()
    const refundKeys = ECPairFactory(ecc).makeRandom()
    if (!claimKeys.privateKey) {
        throw new Error('failed to generate claim key')
    }
    const tree = reverseSwapTree(
        false,
        preimageHash,
        Buffer.from(claimKeys.publicKey),
        Buffer.from(refundKeys.publicKey),
        timeout,
    )
    const musig = new Musig(await zkpInit(), claimKeys, randomBytes(32), [
        Buffer.from(refundKeys.publicKey),
        Buffer.from(claimKeys.publicKey),
    ])
    const tweakedKey = TaprootUtils.tweakMusig(musig, tree.tree)
    const lockupAddress = address.fromOutputScript(Scripts.p2trOutput(tweakedKey), getNetwork('regtest'))
    return {
        preimage: preimage.toString('hex'),
        preimageHash: preimageHash.toString('hex'),
        privKey: Buffer.from(claimKeys.privateKey).toString('hex'),
        pubkey: Buffer.from(claimKeys.publicKey).toString('hex'),
        created: {
            id: `swap-${randomBytes(8).toString('hex')}`,
            invoice: 'lnbc-test-invoice',
            lockupAddress,
            refundPublicKey: Buffer.from(refundKeys.publicKey).toString('hex'),
            swapTree: SwapTreeSerializer.serializeSwapTree(tree),
            timeoutBlockHeight: timeout,
            onchainAmount: AMOUNTS.onchainAmount,
        },
    }
}
