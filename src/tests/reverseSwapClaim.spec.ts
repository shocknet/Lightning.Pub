import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp'
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule
import { initEccLib, Transaction, address } from 'bitcoinjs-lib'
import {
    Musig, SwapTreeSerializer, TaprootUtils, reverseSwapTree, Scripts,
} from 'boltz-core'
import { createHash, randomBytes } from 'crypto'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import {
    REVERSE_CLAIM_CONFIRMATIONS,
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

initEccLib(ecc)

export default async (T: StorageTestBase) => {
    await testLockupMustMatchSwapOutputAndAmount(T)
    await testProviderWebsocketCannotFinishOrAbort(T)
    await testSignatureRefusalStillPublishesUnilateral(T)
    await testSubscribeClaimsOnlyAfterIndependentConfirmation(T)
    await testPersistsClaimBeforeCooperativeOrBroadcast(T)
}

const testLockupMustMatchSwapOutputAndAmount = async (T: StorageTestBase) => {
    T.d('starting lockup parse rejects fabricated / underfunded txs')
    const { swapper, data, lockupAddress } = await setupClaim(T)
    const network = getNetwork('regtest')

    const wrongScript = new Transaction()
    wrongScript.version = 2
    wrongScript.addInput(Buffer.alloc(32), 0)
    wrongScript.addOutput(address.toOutputScript(DEST, network), AMOUNTS.onchainAmount)
    const missing = await swapper.parseAndValidateLockup(data, wrongScript.toHex())
    T.expect(missing.ok).to.equal(false)
    if (!missing.ok) {
        T.expect(missing.error).to.equal('No swap output found in lockup transaction')
    }

    const underfunded = new Transaction()
    underfunded.version = 2
    underfunded.addInput(Buffer.alloc(32), 0)
    underfunded.addOutput(address.toOutputScript(lockupAddress, network), AMOUNTS.onchainAmount - 1)
    const low = await swapper.parseAndValidateLockup(data, underfunded.toHex())
    T.expect(low.ok).to.equal(false)
    if (!low.ok) {
        T.expect(low.error).to.match(/^Lockup output underfunded/)
    }
    T.d('fabricated and underfunded lockups are rejected before any claim')
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
            heightHint: TIP,
            waitForLockup: () => {
                waitStarted?.()
                return new Promise(res => { releaseLockup = res })
            },
            cooperativeClaim: async () => ({ ok: false, error: 'signature refused' }),
            publish: async (txHex) => { published.push(txHex) },
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
    const result = await swapper.claimConfirmedLockup(data, lockupHex, {
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
    })
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
            heightHint: TIP,
            waitForLockup: async (script, numConfs) => {
                waitScript = script
                waitConfs = numConfs
                return { txHex: lockupHex }
            },
            cooperativeClaim: async () => ({ ok: false, error: 'signature refused' }),
            publish: async (txHex) => { published.push(txHex) },
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
    const result = await swapper.claimConfirmedLockup(data, lockupHex, {
        persistClaim: async () => { order.push('persist') },
        cooperativeClaim: async () => {
            order.push('coop')
            return { ok: false, error: 'signature refused' }
        },
        publish: async () => { order.push('publish') },
    })
    T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    T.expect(order).to.deep.equal(['persist', 'coop', 'publish'])
    T.d('unilateral claim was persisted before cooperative disclosure and broadcast')
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

const buildLockupHex = (lockupAddress: string, value: number) => {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(Buffer.alloc(32), 0)
    tx.addOutput(address.toOutputScript(lockupAddress, getNetwork('regtest')), value)
    return tx.toHex()
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
