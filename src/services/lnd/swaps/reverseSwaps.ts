import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp';
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule;
import { initEccLib, Transaction, address } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils,
    constructClaimTransaction, OutputType, targetFee,
    reverseSwapTree, compareTrees, Scripts
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { isNonNegativeSats, isPositiveSats } from '../../helpers/sats.js';
import { BTCNetwork } from '../../main/settings.js';
import {
    loggedGet, loggedPost, getNetwork, scriptDustLimit,
    findTaprootSwapOutput, isExactTaprootSwapOutput, TaprootSwapOutput,
} from './swapHelpers.js';


export type ReverseSwapFees = {
    percentage: number,
    minerFees: {
        claim: number,
        lockup: number,
    }
}

type TransactionSwapFeesRes = {
    BTC?: {
        BTC?: {
            fees: ReverseSwapFees
        }
    }
}

export type ReverseSwapTreeJson = {
    claimLeaf: { version: number, output: string },
    refundLeaf: { version: number, output: string },
}

export type TransactionSwapResponse = {
    id: string
    refundPublicKey: string
    swapTree: string | ReverseSwapTreeJson
    timeoutBlockHeight: number
    lockupAddress: string
    invoice: string
    onchainAmount?: number
}
type TransactionSwapInfo = { destinationAddress: string, preimage: Buffer, keys: ECPairInterface, chainFee: number }
export type TransactionSwapData = { createdResponse: TransactionSwapResponse, info: TransactionSwapInfo }

export type ReverseLockupSpendQuery = {
    txHash: Buffer
    vout: number
    script: Buffer
    heightHint: number
    abort?: AbortSignal
}

export type LockupSpendOutcome = { kind: 'spent' } | { kind: 'failed', error: Error }

/**
 * Live spend watch for a reverse-swap lockup. waitForHistorical reports a spend
 * LND already knows; a quiet wait keeps this armed until stop() so a late
 * spend still blocks disclosure. Stream errors fail closed.
 */
export type LockupSpendGuard = {
    waitForHistorical: () => Promise<boolean>
    isSpent: () => boolean
    failure: () => Error | undefined
    outcome: Promise<LockupSpendOutcome>
    stop: () => void
}

export type ReverseClaimFeeRates = {
    satPerVbyte: number
    minRelaySatPerVbyte: number
}

export type ReverseClaimDeps = {
    publish: (txHex: string) => Promise<void>
    persistClaim?: (txHex: string) => Promise<void>
    getClaimFeeRates: (confTarget: number) => Promise<ReverseClaimFeeRates>
    getChainTip: () => Promise<number>
    watchLockupSpend: (req: ReverseLockupSpendQuery) => LockupSpendGuard | Promise<LockupSpendGuard>
    heightHint?: number
    abortSignal?: AbortSignal
    watchHeights?: (onHeight: (height: number) => void, abort: AbortSignal) => void
    /**
     * Unpublished crash-recovery signature. Tried after first-disclosure
     * checks, including remaining-window fees, before reconstructing.
     */
    savedClaimHex?: string
}

export type ReverseClaimChain = ReverseClaimDeps & {
    waitForLockup: (script: Buffer, numConfs: number, heightHint: number, abort?: AbortSignal) => Promise<{ txHex: string, blockHeight?: number }>
    heightHint: number
}

type ParsedLockup = {
    lockupTx: Transaction
    swapOutput: TaprootSwapOutput
    swapTree: ReturnType<typeof SwapTreeSerializer.deserializeSwapTree>
    internalKey: Buffer
    boltzPublicKey: Buffer
}

/**
 * BIP65: locktimes below this are block heights. At or above it they are unix times,
 * so a refund leaf built from such a value is not a block-height timeout.
 */
export const REVERSE_LOCKTIME_THRESHOLD = 500_000_000

/**
 * Shortest claim window we will accept, in blocks (~12 hours).
 * Boltz reverse timeouts are 144 blocks; this is below that so a quote
 * still verifies after small tip skew and a few new blocks before pay.
 */
export const MIN_REVERSE_TIMEOUT_BLOCKS = 72

/**
 * Longest claim window we will accept, in blocks (~2 weeks).
 * Matches Boltz's upper reverse-swap timeout bound.
 */
export const MAX_REVERSE_TIMEOUT_BLOCKS = 2_016

/** Deliberate policy: do not disclose the preimage on a mempool lockup. */
export const REVERSE_CLAIM_CONFIRMATIONS = 1

/**
 * Blocks that must remain before the refund height when we disclose the preimage.
 * Quote-time MIN_REVERSE_TIMEOUT_BLOCKS is the start window; this is only enough
 * runway for a claim to confirm first. SendPaymentV2's one-hour timeout is not
 * a safety bound: an in-flight HTLC can remain active past that setting.
 */
export const REVERSE_CLAIM_MIN_REMAINING_BLOCKS = 6

/**
 * SendPaymentV2 must stay in-flight until the lockup confirms and we claim.
 * The claim is a local script-path broadcast, not a provider round-trip.
 */
export const REVERSE_SWAP_PAYMENT_TIMEOUT_SECONDS = 60 * 60

/** Bitcoin Core default minrelaytxfee: 1 sat/vbyte. */
export const MIN_CLAIM_SAT_PER_VBYTE = 1

/**
 * Conservative script-path claim size used at quote/pay time, before the
 * destination script is known. A taproot reverse claim is ~150–180 vbytes;
 * this leaves room for a P2PKH output and targetFee's extra input buffer.
 * Admission uses min relay, not next-block, so a congested mempool cannot
 * reject a quote whose lockup still pays a relayable claim.
 */
export const REVERSE_CLAIM_VBYTE_BUDGET = 200

/** Reverse-swap hold invoices must be paid by our node, not a liquidity provider. */
export const SWAP_INVOICE_MUST_USE_LND = 'swaps cannot be paid via the liquidity provider'

/**
 * Reject provider-chosen refund heights that are not safe block heights inside
 * [tip + min, tip + max]. Building a local tree from the same height and comparing
 * it to the provider tree does not make an out-of-range height safe.
 */
export const checkReverseTimeout = (
    timeoutBlockHeight: number,
    currentHeight: number,
): { ok: true } | { ok: false, error: string } => {
    if (!Number.isSafeInteger(currentHeight) || currentHeight <= 0 || currentHeight >= REVERSE_LOCKTIME_THRESHOLD) {
        return { ok: false, error: 'untrusted chain tip' }
    }
    if (!Number.isSafeInteger(timeoutBlockHeight) || timeoutBlockHeight <= 0 || timeoutBlockHeight >= REVERSE_LOCKTIME_THRESHOLD) {
        return { ok: false, error: 'invalid timeoutBlockHeight from swap service' }
    }
    if (timeoutBlockHeight <= currentHeight) {
        return { ok: false, error: `swap quote expired at block ${timeoutBlockHeight} (tip ${currentHeight})` }
    }
    const earliest = currentHeight + MIN_REVERSE_TIMEOUT_BLOCKS
    if (timeoutBlockHeight < earliest) {
        return {
            ok: false,
            error: `timeoutBlockHeight ${timeoutBlockHeight} is sooner than ${MIN_REVERSE_TIMEOUT_BLOCKS} blocks from tip ${currentHeight}`,
        }
    }
    const latest = currentHeight + MAX_REVERSE_TIMEOUT_BLOCKS
    if (timeoutBlockHeight > latest) {
        return {
            ok: false,
            error: `timeoutBlockHeight ${timeoutBlockHeight} is later than ${MAX_REVERSE_TIMEOUT_BLOCKS} blocks from tip ${currentHeight}`,
        }
    }
    return { ok: true }
}

/**
 * A persisted reverse-swap signature is crash-recovery material, not proof the
 * preimage was disclosed. Resume may rebroadcast without first-disclosure
 * checks only after a successful publish (or a restored claim_published flag).
 */
export const isReverseClaimExposed = (swap: {
    claim_tx_hex?: string
    claim_published?: boolean
}): boolean => !!(swap.claim_tx_hex && swap.claim_published)

/**
 * Claim-time refund window against a trusted tip. Unlike checkReverseTimeout,
 * this does not require the original 72-block start window: confirmation wait
 * consumes some of that. It still refuses disclosure once the refund is valid
 * or closer than REVERSE_CLAIM_MIN_REMAINING_BLOCKS.
 */
export const checkReverseClaimWindow = (
    timeoutBlockHeight: number,
    currentHeight: number,
): { ok: true } | { ok: false, error: string } => {
    if (!Number.isSafeInteger(currentHeight) || currentHeight <= 0 || currentHeight >= REVERSE_LOCKTIME_THRESHOLD) {
        return { ok: false, error: 'untrusted chain tip' }
    }
    if (!Number.isSafeInteger(timeoutBlockHeight) || timeoutBlockHeight <= 0 || timeoutBlockHeight >= REVERSE_LOCKTIME_THRESHOLD) {
        return { ok: false, error: 'invalid timeoutBlockHeight from swap service' }
    }
    if (timeoutBlockHeight <= currentHeight) {
        return { ok: false, error: `refund already valid at block ${timeoutBlockHeight} (tip ${currentHeight})` }
    }
    const remaining = timeoutBlockHeight - currentHeight
    if (remaining < REVERSE_CLAIM_MIN_REMAINING_BLOCKS) {
        return {
            ok: false,
            error: `only ${remaining} blocks left to claim before refund at ${timeoutBlockHeight} (tip ${currentHeight}, need ${REVERSE_CLAIM_MIN_REMAINING_BLOCKS})`,
        }
    }
    return { ok: true }
}

export const resolveClaimSatPerVbyte = (satPerVbyte: number): { ok: true, satPerVbyte: number } | { ok: false, error: string } => {
    if (!Number.isSafeInteger(satPerVbyte) || satPerVbyte < MIN_CLAIM_SAT_PER_VBYTE) {
        return { ok: false, error: `invalid local claim fee rate ${satPerVbyte}` }
    }
    return { ok: true, satPerVbyte }
}

/**
 * Provider miner fees are a lockup budget, not a claim feerate. Refuse quotes
 * that cannot pay a locally sized script-path spend at min relay. Next-block
 * estimates are not an admission floor; claim-time still refuses disclosure
 * if this budget cannot meet the remaining-window feerate.
 */
export const checkReverseClaimBudget = (
    minerFee: number,
    satPerVbyte: number,
    vbytes = REVERSE_CLAIM_VBYTE_BUDGET,
): { ok: true } | { ok: false, error: string } => {
    const rate = resolveClaimSatPerVbyte(satPerVbyte)
    if (!rate.ok) {
        return rate
    }
    if (!isNonNegativeSats(minerFee)) {
        return { ok: false, error: 'invalid miner fees from swap service' }
    }
    if (!isPositiveSats(vbytes)) {
        return { ok: false, error: 'invalid claim size' }
    }
    const floor = rate.satPerVbyte * vbytes
    if (minerFee < floor) {
        return {
            ok: false,
            error: `swap miner fee budget ${minerFee} is below local claim floor ${floor}`,
        }
    }
    return { ok: true }
}

/**
 * First-disclosure sat/vbyte: at least the remaining-window estimate and min
 * relay, at most the quoted miner budget. Do not cap below that target; a
 * relayable-but-slow claim discloses the preimage to a competing refund.
 */
export const resolveClaimFeeRate = (
    liveSatPerVbyte: number,
    minRelaySatPerVbyte: number,
    minerFee: number,
    vbytes: number,
): { ok: true, satPerVbyte: number } | { ok: false, error: string } => {
    const minRelay = resolveClaimSatPerVbyte(minRelaySatPerVbyte)
    if (!minRelay.ok) {
        return minRelay
    }
    const live = resolveClaimSatPerVbyte(liveSatPerVbyte)
    if (!live.ok) {
        return live
    }
    const budget = checkReverseClaimBudget(minerFee, minRelay.satPerVbyte, vbytes)
    if (!budget.ok) {
        return budget
    }
    const maxRate = Math.floor(minerFee / vbytes)
    const required = Math.max(live.satPerVbyte, minRelay.satPerVbyte)
    if (maxRate < required) {
        return { ok: false, error: `quoted miner budget ${minerFee} cannot pay ${required} sat/vbyte for the remaining claim window` }
    }
    return { ok: true, satPerVbyte: required }
}

/** Matches boltz-core targetFee: (virtualSize + input count) * sat/vbyte. */
export const claimTargetVbytes = (tx: Transaction): number => tx.virtualSize() + tx.ins.length

/**
 * The script-path claim is the only disclosure of the preimage. It must meet
 * the chosen sat/vbyte floor, stay within the quoted miner budget, and leave a
 * standard, spendable output.
 */
export const checkUnilateralClaimRelayable = (
    tx: Transaction,
    inputValue: number,
    satPerVbyte: number,
    maxFee: number,
): { ok: true } | { ok: false, error: string } => {
    const rate = resolveClaimSatPerVbyte(satPerVbyte)
    if (!rate.ok) {
        return rate
    }
    if (!isPositiveSats(inputValue)) {
        return { ok: false, error: 'invalid lockup value for reverse-swap claim' }
    }
    if (!isNonNegativeSats(maxFee)) {
        return { ok: false, error: 'invalid quoted miner fee budget' }
    }
    if (tx.ins.length !== 1 || tx.outs.length !== 1) {
        return { ok: false, error: 'unilateral claim must be a single-input single-output spend' }
    }
    const output = tx.outs[0]
    const dust = scriptDustLimit(output.script)
    if (dust <= 0) {
        return { ok: false, error: 'claim destination is unspendable' }
    }
    if (!isNonNegativeSats(output.value) || output.value < dust) {
        return { ok: false, error: `claim output ${output.value} is below dust limit ${dust}` }
    }
    const fee = inputValue - output.value
    if (!isPositiveSats(fee)) {
        return { ok: false, error: 'unilateral claim fee is below the local relay floor' }
    }
    const vsize = tx.virtualSize()
    if (!isPositiveSats(vsize)) {
        return { ok: false, error: 'invalid unilateral claim size' }
    }
    const minFee = vsize * rate.satPerVbyte
    if (fee < minFee) {
        return { ok: false, error: `unilateral claim fee ${fee} is below local floor ${minFee} (${rate.satPerVbyte} sat/vbyte)` }
    }
    if (fee > maxFee) {
        return { ok: false, error: `unilateral claim fee ${fee} exceeds quoted miner budget ${maxFee}` }
    }
    return { ok: true }
}

/**
 * Reverse swap amounts as Boltz computes them when we specify onchainAmount:
 * lockup = receive + claim + lockup miner fees;
 * invoice = ceil((lockup + lockup miner fee) / (1 - pct/100)).
 */
export const calculateReverseQuoteAmounts = (receiveAmountSats: number, fees: ReverseSwapFees): {
    minerFee: number
    onchainAmount: number
    swapFee: number
    invoiceAmount: number
} => {
    if (!isPositiveSats(receiveAmountSats)) {
        throw new Error('receive amount must be a positive integer number of sats')
    }
    if (!isNonNegativeSats(fees.minerFees.claim) || !isNonNegativeSats(fees.minerFees.lockup)) {
        throw new Error('invalid miner fees from swap service')
    }
    if (!Number.isFinite(fees.percentage) || fees.percentage < 0 || fees.percentage >= 100) {
        throw new Error('invalid percentage fee from swap service')
    }
    const minerFee = fees.minerFees.claim + fees.minerFees.lockup
    const onchainAmount = receiveAmountSats + minerFee
    const invoiceAmount = Math.ceil((onchainAmount + fees.minerFees.lockup) / (1 - fees.percentage / 100))
    if (!isPositiveSats(invoiceAmount)) {
        throw new Error('invalid invoice amount from swap service')
    }
    const swapFee = invoiceAmount - onchainAmount
    if (!isNonNegativeSats(swapFee)) {
        throw new Error('invalid swap fee from swap service')
    }
    return {
        minerFee,
        onchainAmount,
        swapFee,
        invoiceAmount,
    }
}

export class ReverseSwaps {
    // settings: SettingsManager
    private httpUrl: string
    private wsUrl: string
    log: PubLogger
    private network: BTCNetwork
    constructor({ httpUrl, wsUrl, network }: { httpUrl: string, wsUrl: string, network: BTCNetwork }) {
        this.httpUrl = httpUrl
        this.wsUrl = wsUrl
        this.network = network
        this.log = getLogger({ component: 'ReverseSwaps' })
        initEccLib(ecc)
    }

    getHttpUrl = () => {
        return this.httpUrl
    }
    getWsUrl = () => {
        return this.wsUrl
    }

    calculateFees = (fees: ReverseSwapFees, receiveAmount: number) => {
        const amounts = calculateReverseQuoteAmounts(receiveAmount, fees)
        return { total: amounts.invoiceAmount, fee: amounts.swapFee, minerFee: amounts.minerFee }
    }

    GetFees = async (): Promise<{ ok: true, fees: ReverseSwapFees, } | { ok: false, error: string }> => {
        const url = `${this.httpUrl}/v2/swap/reverse`
        const feesRes = await loggedGet<TransactionSwapFeesRes>(this.log, url)
        if (!feesRes.ok) {
            return { ok: false, error: feesRes.error }
        }
        if (!feesRes.data.BTC?.BTC?.fees) {
            return { ok: false, error: 'No fees found for BTC to BTC swap' }
        }

        return { ok: true, fees: feesRes.data.BTC.BTC.fees }
    }

    SwapTransaction = async (txAmount: number): Promise<{ ok: true, createdResponse: TransactionSwapResponse, preimage: string, pubkey: string, privKey: string } | { ok: false, error: string }> => {
        const preimage = randomBytes(32);
        const keys = ECPairFactory(ecc).makeRandom()
        if (!keys.privateKey) {
            return { ok: false, error: 'Failed to generate keys' }
        }
        const url = `${this.httpUrl}/v2/swap/reverse`
        const req: any = {
            onchainAmount: txAmount,
            to: 'BTC',
            from: 'BTC',
            claimPublicKey: Buffer.from(keys.publicKey).toString('hex'),
            preimageHash: createHash('sha256').update(preimage).digest('hex'),
        }
        const createdResponseRes = await loggedPost<TransactionSwapResponse>(this.log, url, req)
        if (!createdResponseRes.ok) {
            return createdResponseRes
        }
        const createdResponse = createdResponseRes.data
        this.log('Created transaction swap');
        this.log(createdResponse);
        return {
            ok: true, createdResponse,
            preimage: Buffer.from(preimage).toString('hex'),
            pubkey: Buffer.from(keys.publicKey).toString('hex'),
            privKey: Buffer.from(keys.privateKey).toString('hex')
        }
    }

    /**
     * Verify untrusted reverse-swap quote fields before paying the Lightning invoice.
     * Checks invoice payment hash against SHA256 of our preimage, invoice and
     * on-chain amounts against locally computed values, that timeoutBlockHeight
     * is a safe block height inside the local claim window relative to a trusted
     * chain tip, that swapTree matches a reverse tree built from our preimage
     * hash / claim key, and that the lockup address derives from that tree.
     */
    VerifyReverseQuote = async (params: {
        preimageHex: string
        claimPrivateKeyHex: string
        invoicePaymentHashHex: string
        invoiceAmountSats: number
        expectedInvoiceAmountSats: number
        expectedOnchainAmountSats: number
        currentHeight: number
        created: TransactionSwapResponse
    }): Promise<{ ok: true } | { ok: false, error: string }> => {
        const {
            preimageHex,
            claimPrivateKeyHex,
            invoicePaymentHashHex,
            invoiceAmountSats,
            expectedInvoiceAmountSats,
            expectedOnchainAmountSats,
            currentHeight,
            created,
        } = params

        if (!isPositiveSats(expectedOnchainAmountSats) || !isPositiveSats(expectedInvoiceAmountSats)) {
            return { ok: false, error: 'invalid expected reverse-swap amounts' }
        }
        if (!isPositiveSats(invoiceAmountSats)) {
            return { ok: false, error: 'invalid invoice amount from swap service' }
        }
        if (invoiceAmountSats !== expectedInvoiceAmountSats) {
            return {
                ok: false,
                error: `invoice amount mismatch: got ${invoiceAmountSats}, want ${expectedInvoiceAmountSats}`,
            }
        }
        if (!Number.isFinite(created.onchainAmount) || created.onchainAmount === undefined) {
            return { ok: false, error: 'invalid onchainAmount from swap service' }
        }
        if (!isPositiveSats(created.onchainAmount)) {
            return { ok: false, error: 'invalid onchainAmount from swap service' }
        }
        if (created.onchainAmount !== expectedOnchainAmountSats) {
            return {
                ok: false,
                error: `onchainAmount mismatch: got ${created.onchainAmount}, want ${expectedOnchainAmountSats}`,
            }
        }

        const timeout = checkReverseTimeout(created.timeoutBlockHeight, currentHeight)
        if (!timeout.ok) {
            return timeout
        }
        if (!created.refundPublicKey || !created.lockupAddress || !created.swapTree || !created.invoice) {
            return { ok: false, error: 'incomplete swap quote from swap service' }
        }

        let claimKeys: ECPairInterface
        try {
            claimKeys = ECPairFactory(ecc).fromPrivateKey(Buffer.from(claimPrivateKeyHex, 'hex'))
        } catch (err: any) {
            return { ok: false, error: `invalid claim private key: ${err.message}` }
        }

        let refundPublicKey: Buffer
        let preimage: Buffer
        let invoicePaymentHash: Buffer
        try {
            refundPublicKey = Buffer.from(created.refundPublicKey, 'hex')
            preimage = Buffer.from(preimageHex, 'hex')
            invoicePaymentHash = Buffer.from(invoicePaymentHashHex, 'hex')
            if (refundPublicKey.length !== 33) {
                return { ok: false, error: 'invalid refundPublicKey length' }
            }
            if (preimage.length !== 32) {
                return { ok: false, error: 'invalid preimage length' }
            }
            if (invoicePaymentHash.length !== 32) {
                return { ok: false, error: 'invalid invoice payment hash length' }
            }
        } catch (err: any) {
            return { ok: false, error: `invalid hex in quote fields: ${err.message}` }
        }

        const preimageHash = createHash('sha256').update(preimage).digest()
        if (!preimageHash.equals(invoicePaymentHash)) {
            return { ok: false, error: 'invoice payment hash does not match preimage hash' }
        }

        const localTree = reverseSwapTree(
            false,
            preimageHash,
            Buffer.from(claimKeys.publicKey),
            refundPublicKey,
            created.timeoutBlockHeight,
        )

        let remoteTree
        try {
            remoteTree = SwapTreeSerializer.deserializeSwapTree(created.swapTree)
        } catch (err: any) {
            return { ok: false, error: `failed to deserialize swapTree: ${err.message}` }
        }

        if (!compareTrees(localTree, remoteTree)) {
            return { ok: false, error: 'swapTree does not match locally derived tree' }
        }

        try {
            const musig = new Musig(await zkpInit(), claimKeys, randomBytes(32), [
                refundPublicKey,
                Buffer.from(claimKeys.publicKey),
            ])
            const tweakedKey = TaprootUtils.tweakMusig(musig, localTree.tree)
            const network = getNetwork(this.network)
            const derivedAddress = address.fromOutputScript(Scripts.p2trOutput(tweakedKey), network)
            if (derivedAddress !== created.lockupAddress) {
                return {
                    ok: false,
                    error: `address mismatch: got ${created.lockupAddress}, derived ${derivedAddress}`,
                }
            }
        } catch (err: any) {
            return { ok: false, error: `failed to derive lockup address: ${err.message}` }
        }

        return { ok: true }
    }

    SubscribeToTransactionSwap = async (
        data: TransactionSwapData,
        swapDone: (result: { ok: true, txId: string } | { ok: false, error: string }) => void,
        chain: ReverseClaimChain,
    ) => {
        const webSocket = new ws(`${this.wsUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [data.createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })
        const interval = setInterval(() => {
            webSocket.ping()
        }, 30 * 1000)
        interval.unref()
        const localAbort = new AbortController()
        const onParentAbort = () => localAbort.abort()
        chain.abortSignal?.addEventListener('abort', onParentAbort)
        let txId = "", isDone = false
        const done = (failureReason?: string) => {
            if (isDone) {
                return
            }
            isDone = true
            localAbort.abort()
            chain.abortSignal?.removeEventListener('abort', onParentAbort)
            clearInterval(interval)
            webSocket.close()
            if (failureReason) {
                swapDone({ ok: false, error: failureReason })
            } else if (!txId) {
                swapDone({ ok: false, error: 'swap settled without a validated on-chain claim' })
            } else {
                swapDone({ ok: true, txId })
            }
        }
        webSocket.on('pong', () => {
            this.log('WebSocket transaction swap pong received')
        })
        webSocket.on('error', (err) => {
            this.log(ERROR, 'Error in WebSocket', err.message)
        })
        webSocket.on('close', () => {
            if (!isDone) {
                this.log('WebSocket closed; continuing to wait for an independently confirmed lockup')
            }
        })
        webSocket.on('message', async (rawMsg) => {
            try {
                await this.handleSwapTransactionMessage(rawMsg)
            } catch (err: any) {
                this.log(ERROR, 'Error handling transaction WebSocket message', err.message)
            }
        })
        void this.claimWhenLockupConfirmed(data, chain, localAbort.signal, (id) => { txId = id }, done)
    }

    /**
     * Provider websocket is informational only. It must never finish the swap or
     * abort the chain watch: a hostile update (failed/expired, or malformed JSON)
     * would otherwise cancel an independent 1-conf claim.
     */
    handleSwapTransactionMessage = async (rawMsg: ws.RawData) => {
        let msg: any
        try {
            msg = JSON.parse(rawMsg.toString('utf-8'))
        } catch (err: any) {
            this.log(ERROR, 'Invalid swap websocket payload', err.message)
            return
        }
        if (msg.event !== 'update') {
            return
        }

        this.log('Got WebSocket update')
        this.log(msg)
        const status = msg.args?.[0]?.status
        switch (status) {
            case 'swap.created':
                this.log('Waiting invoice to be paid')
                return
            case 'transaction.mempool':
            case 'transaction.confirmed':
                this.log('Provider reported lockup', status, '- waiting for independent confirmation')
                return
            case 'invoice.settled':
                this.log('Provider reported invoice settled; waiting for independent claim publish')
                return
            case 'invoice.expired':
            case 'swap.expired':
            case 'transaction.failed':
                this.log('Provider reported', status, '- ignoring; claim depends on independent confirmation')
                return
            default:
                this.log('Unknown swap transaction WebSocket message', msg)
                return
        }
    }

    private claimWhenLockupConfirmed = async (
        data: TransactionSwapData,
        chain: ReverseClaimChain,
        abort: AbortSignal,
        setClaimTxId: (id: string) => void,
        done: (failureReason?: string) => void,
    ) => {
        const timeout = data.createdResponse.timeoutBlockHeight
        let windowError: string | undefined
        const localAbort = new AbortController()
        const onParentAbort = () => localAbort.abort()
        abort.addEventListener('abort', onParentAbort)
        const onHeight = (height: number) => {
            const window = checkReverseClaimWindow(timeout, height)
            if (!window.ok) {
                windowError = window.error
                localAbort.abort()
            }
        }
        try {
            const tip = await chain.getChainTip()
            onHeight(tip)
            if (windowError) {
                done(windowError)
                return
            }
            chain.watchHeights?.(onHeight, localAbort.signal)
            const network = getNetwork(this.network)
            const script = address.toOutputScript(data.createdResponse.lockupAddress, network)
            const confirmed = await chain.waitForLockup(script, REVERSE_CLAIM_CONFIRMATIONS, chain.heightHint, localAbort.signal)
            if (windowError) {
                done(windowError)
                return
            }
            if (abort.aborted || localAbort.signal.aborted) {
                return
            }
            const claimed = await this.claimConfirmedLockup(data, confirmed.txHex, {
                ...chain,
                heightHint: confirmed.blockHeight || chain.heightHint,
                abortSignal: localAbort.signal,
            })
            if (!claimed.ok) {
                done(claimed.error)
                return
            }
            setClaimTxId(claimed.txId)
            done()
        } catch (err: any) {
            if (windowError) {
                done(windowError)
                return
            }
            if (abort.aborted) {
                return
            }
            this.log(ERROR, 'Failed waiting for confirmed reverse-swap lockup', err.message || err)
            done(err.message || String(err))
        } finally {
            abort.removeEventListener('abort', onParentAbort)
            localAbort.abort()
        }
    }

    /**
     * Claim a lockup that our node has already confirmed. The preimage is
     * disclosed only by broadcasting a locally sized script-path spend; a
     * provider round-trip would settle Lightning without a relayable fallback.
     */
    claimConfirmedLockup = async (
        data: TransactionSwapData,
        confirmedTxHex: string,
        deps: ReverseClaimDeps,
    ): Promise<{ ok: true, txId: string } | { ok: false, error: string }> => {
        const parsed = await this.parseAndValidateLockup(data, confirmedTxHex)
        if (!parsed.ok) {
            return parsed
        }

        let guard: LockupSpendGuard | undefined
        try {
            const spendable = await this.ensureLockupStillClaimable(data, parsed, deps)
            if (!spendable.ok) {
                return spendable
            }
            guard = spendable.guard

            let feeRates: ReverseClaimFeeRates
            try {
                feeRates = await deps.getClaimFeeRates(spendable.confTarget)
            } catch (err: any) {
                return { ok: false, error: `failed to read local claim fee rate: ${err.message || err}` }
            }

            let probe: Transaction
            try {
                probe = this.buildUnilateralClaim(data, parsed, MIN_CLAIM_SAT_PER_VBYTE)
            } catch (err: any) {
                return { ok: false, error: `failed to construct unilateral claim: ${err.message}` }
            }
            const vbytes = claimTargetVbytes(probe)
            const rate = resolveClaimFeeRate(
                feeRates.satPerVbyte,
                feeRates.minRelaySatPerVbyte,
                data.info.chainFee,
                vbytes,
            )
            if (!rate.ok) {
                return rate
            }

            const savedHex = this.matchingSavedClaimHex(deps.savedClaimHex, parsed, data.info.preimage)
            if (savedHex) {
                const saved = Transaction.fromHex(savedHex)
                const savedRelayable = checkUnilateralClaimRelayable(
                    saved,
                    parsed.swapOutput.value,
                    rate.satPerVbyte,
                    data.info.chainFee,
                )
                if (savedRelayable.ok) {
                    const beforeSavedPublish = await this.claimPublicationBlocked(data, deps, guard)
                    if (beforeSavedPublish) {
                        return beforeSavedPublish
                    }
                    try {
                        await deps.publish(savedHex)
                        const txId = saved.getId()
                        this.log('Reverse-swap claim published', { txId })
                        return { ok: true, txId }
                    } catch (err: any) {
                        this.log('saved reverse-swap claim was not accepted; reconstructing', {
                            error: err.message || err,
                        })
                    }
                }
            }

            let unilateral: Transaction
            try {
                unilateral = this.buildUnilateralClaim(data, parsed, rate.satPerVbyte)
            } catch (err: any) {
                return { ok: false, error: `failed to construct unilateral claim: ${err.message}` }
            }

            const relayable = checkUnilateralClaimRelayable(
                unilateral,
                parsed.swapOutput.value,
                rate.satPerVbyte,
                data.info.chainFee,
            )
            if (!relayable.ok) {
                return relayable
            }

            // Persist the script-path spend before broadcasting so a crash still
            // has a locally relayable claim to rebroadcast. Persistence is not
            // disclosure: unpublished saved claims must still pass the checks
            // above (saved hex) or below (reconstructed hex), and the same
            // checks on resume, before the preimage goes out.
            try {
                await deps.persistClaim?.(unilateral.toHex())
            } catch (err: any) {
                return { ok: false, error: `failed to persist reverse-swap claim: ${err.message || err}` }
            }

            const beforePublish = await this.claimPublicationBlocked(data, deps, guard)
            if (beforePublish) {
                return beforePublish
            }

            try {
                await deps.publish(unilateral.toHex())
            } catch (err: any) {
                return { ok: false, error: err.message || String(err) }
            }
            this.log('Reverse-swap claim published', { txId: unilateral.getId() })
            return { ok: true, txId: unilateral.getId() }
        } finally {
            guard?.stop()
        }
    }

    parseAndValidateLockup = async (
        data: TransactionSwapData,
        txHex: string,
    ): Promise<{ ok: true } & ParsedLockup | { ok: false, error: string }> => {
        const { createdResponse, info } = data
        const boltzPublicKey = Buffer.from(createdResponse.refundPublicKey, 'hex')
        let swapTree
        try {
            swapTree = SwapTreeSerializer.deserializeSwapTree(createdResponse.swapTree)
        } catch (err: any) {
            return { ok: false, error: `failed to deserialize swapTree: ${err.message}` }
        }

        const musig = new Musig(await zkpInit(), info.keys, randomBytes(32), [
            boltzPublicKey,
            Buffer.from(info.keys.publicKey),
        ])
        const tweakedKey = TaprootUtils.tweakMusig(musig, swapTree.tree)
        const lockupTx = Transaction.fromHex(txHex)
        if (lockupTx.isCoinbase()) {
            return { ok: false, error: 'coinbase lockup cannot be claimed before maturity' }
        }
        const swapOutput = findTaprootSwapOutput(tweakedKey, lockupTx)
        if (swapOutput === undefined || !isExactTaprootSwapOutput(swapOutput, lockupTx, tweakedKey)) {
            this.log(ERROR, 'No swap output found in lockup transaction')
            return { ok: false, error: 'No swap output found in lockup transaction' }
        }

        const expectedAmount = createdResponse.onchainAmount
        if (!Number.isFinite(expectedAmount) || expectedAmount === undefined || expectedAmount <= 0) {
            return { ok: false, error: 'Missing or invalid quoted onchainAmount for reverse swap' }
        }
        if (swapOutput.value < expectedAmount) {
            this.log(ERROR, 'Lockup output underfunded', { got: swapOutput.value, want: expectedAmount, vout: swapOutput.vout })
            return {
                ok: false,
                error: `Lockup output underfunded: got ${swapOutput.value}, want at least ${expectedAmount}`,
            }
        }

        return {
            ok: true,
            lockupTx,
            swapOutput,
            swapTree,
            internalKey: musig.getAggregatedPublicKey(),
            boltzPublicKey,
        }
    }

    /**
     * Historical confirmation is not enough to disclose the preimage. Recheck
     * the trusted tip and arm a spend watch before returning a live guard.
     * Coinbase lockups are already rejected in parseAndValidateLockup.
     */
    private ensureLockupStillClaimable = async (
        data: TransactionSwapData,
        parsed: ParsedLockup,
        deps: ReverseClaimDeps,
    ): Promise<{ ok: true, guard: LockupSpendGuard, confTarget: number } | { ok: false, error: string }> => {
        let tip: number
        try {
            tip = await deps.getChainTip()
        } catch (err: any) {
            return { ok: false, error: `failed to read chain tip before claim: ${err.message || err}` }
        }
        const window = checkReverseClaimWindow(data.createdResponse.timeoutBlockHeight, tip)
        if (!window.ok) {
            return window
        }
        let guard: LockupSpendGuard
        try {
            guard = await deps.watchLockupSpend({
                txHash: parsed.lockupTx.getHash(),
                vout: parsed.swapOutput.vout,
                script: parsed.swapOutput.script,
                heightHint: Math.max(1, deps.heightHint || tip),
                abort: deps.abortSignal,
            })
        } catch (err: any) {
            return { ok: false, error: `failed to check lockup spend status: ${err.message || err}` }
        }
        try {
            const spent = await guard.waitForHistorical()
            if (spent) {
                guard.stop()
                return { ok: false, error: 'lockup output is already spent' }
            }
            const unsafe = this.lockupSpendUnsafe(guard)
            if (unsafe) {
                guard.stop()
                return unsafe
            }
            return { ok: true, guard, confTarget: data.createdResponse.timeoutBlockHeight - tip }
        } catch (err: any) {
            guard.stop()
            return { ok: false, error: `failed to check lockup spend status: ${err.message || err}` }
        }
    }

    /**
     * Persistence, fee lookup, and signing are async. Re-check abort, a fresh
     * trusted tip, and spend-watch state immediately before the preimage goes
     * out: the height watcher may have closed the window while we were preparing.
     */
    private claimPublicationBlocked = async (
        data: TransactionSwapData,
        deps: ReverseClaimDeps,
        guard: LockupSpendGuard,
    ): Promise<{ ok: false, error: string } | undefined> => {
        let tip: number
        try {
            tip = await deps.getChainTip()
        } catch (err: any) {
            return { ok: false, error: `failed to read chain tip before claim: ${err.message || err}` }
        }
        const window = checkReverseClaimWindow(data.createdResponse.timeoutBlockHeight, tip)
        if (!window.ok) {
            return window
        }
        if (deps.abortSignal?.aborted) {
            return this.lockupSpendUnsafe(guard) ?? { ok: false, error: 'claim aborted before publication' }
        }
        return this.lockupSpendUnsafe(guard)
    }

    /**
     * Reuse a persisted signature only when it still spends this independently
     * confirmed lockup and carries our preimage. Remaining-window fee policy is
     * applied by the caller before first disclosure; publish() may still reject
     * a duplicate that no longer meets live min-relay.
     */
    private matchingSavedClaimHex = (
        savedHex: string | undefined,
        parsed: ParsedLockup,
        preimage: Buffer,
    ): string | undefined => {
        if (!savedHex) {
            return undefined
        }
        let claim: Transaction
        try {
            claim = Transaction.fromHex(savedHex)
        } catch {
            return undefined
        }
        if (claim.ins.length !== 1 || claim.outs.length !== 1) {
            return undefined
        }
        const vin = claim.ins[0]
        if (vin.index !== parsed.swapOutput.vout || !vin.hash.equals(parsed.lockupTx.getHash())) {
            return undefined
        }
        const hasPreimage = (vin.witness || []).some(item => Buffer.from(item).equals(preimage))
        if (!hasPreimage) {
            return undefined
        }
        return savedHex
    }

    private lockupSpendUnsafe = (guard: LockupSpendGuard): { ok: false, error: string } | undefined => {
        if (guard.isSpent()) {
            return { ok: false, error: 'lockup output is already spent' }
        }
        const failure = guard.failure()
        if (failure) {
            return { ok: false, error: `failed to check lockup spend status: ${failure.message}` }
        }
        return undefined
    }

    private buildUnilateralClaim = (data: TransactionSwapData, parsed: ParsedLockup, satPerVbyte: number): Transaction => {
        const { info } = data
        const network = getNetwork(this.network)
        const destination = address.toOutputScript(info.destinationAddress, network)
        const utxos = [
            {
                ...parsed.swapOutput,
                keys: info.keys,
                preimage: info.preimage,
                cooperative: false,
                type: OutputType.Taproot,
                txHash: parsed.lockupTx.getHash(),
                swapTree: parsed.swapTree,
                internalKey: parsed.internalKey,
            },
        ]
        return targetFee(satPerVbyte, (fee) => constructClaimTransaction(utxos, destination, fee))
    }
}
