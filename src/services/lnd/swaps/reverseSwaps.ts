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
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { isNonNegativeSats, isPositiveSats } from '../../helpers/sats.js';
import { BTCNetwork } from '../../main/settings.js';
import {
    loggedGet, loggedPost, getNetwork, scriptDustLimit,
    findTaprootSwapOutput, isExactTaprootSwapOutput, TaprootSwapOutput,
} from './swapHelpers.js';
import {
    SWAP_WS_PING_MS, SWAP_WS_RETRY_MAX_MS, SWAP_WS_RETRY_MS,
    SwapWsConnect, connectSwapUpdates, defaultSwapWsConnect, swapWsPayloadText,
} from './swapWebsocket.js';


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

export type LockupSpend = {
    spendingTxId: string
    spendingHeight: number
}

export type LockupSpendOutcome = { kind: 'spent', spend: LockupSpend } | { kind: 'failed', error: Error }

export type ConfirmedLockupSpend = LockupSpend

/**
 * Live spend watch for a reverse-swap lockup. waitForHistorical reports a spend
 * LND already knows, including mempool (spending_height 0); a quiet wait keeps
 * this armed until stop() so a late spend still blocks disclosure.
 * waitForConfirmedSpend waits until the spend is in a block
 * (spending_height > 0). Stream errors fail closed.
 */
export type LockupSpendGuard = {
    waitForHistorical: () => Promise<LockupSpend | false>
    isSpent: () => boolean
    failure: () => Error | undefined
    outcome: Promise<LockupSpendOutcome>
    waitForConfirmedSpend: () => Promise<ConfirmedLockupSpend>
    stop: () => void
}

export type ReverseClaimFeeRates = {
    satPerVbyte: number
    minRelaySatPerVbyte: number
}

export type ReverseClaimDeps = {
    /**
     * Durable publication intent. Must succeed before publish() so a crash
     * resumes as a publication attempt. Must not wait on backup: that delay
     * belongs before the safety checks (persistClaim), not between a check
     * and broadcast. The caller re-checks expiry, spend, and abort after this
     * write; a leftover marker without our spend is not disclosure.
     */
    recordPublication: () => Promise<void>
    /**
     * Broadcast an already-recorded claim. Reject only when the transaction
     * was not accepted. The caller re-checks safety after writing the
     * exposure marker; do not re-check the claim window here. Backup flush
     * after the marker must not delay this call.
     */
    publish: (txHex: string) => Promise<void>
    /**
     * Persist the unpublished claim hex and wait for backup before the
     * safety checks. Required for reconstructed and reused saved signatures so
     * a crash after first disclosure still has a relayable claim.
     * Remaining-window fees are re-checked after this wait: a cheaper
     * earlier-window estimate must not first-disclose.
     */
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
     * Must still go through persistClaim before publish.
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
 * Rebuilds after backup moved the remaining-window feerate. Each rebuild
 * waits on persist again. Fail closed rather than disclose at a stale rate.
 */
const MAX_CLAIM_FEE_RERATES = 8

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
 * preimage was disclosed. claim_published records a publication attempt, including
 * a crash between the marker and broadcast. Resume and PayAddrWithSwap retry must
 * still prove our lockup spend before skipping first-disclosure checks, unless
 * claim_broadcast_accepted is set or the reverse-swap lightning payment has
 * already settled. LND acceptance or a succeeded hold invoice means the
 * preimage is public, so a missed mempool spend must not re-run backup or
 * window gates.
 * Unspent marked claims take the saved-hex path (window and fees).
 * claim_published: false is not proof of secrecy after restore of an earlier
 * backup; resume reconciles a spent lockup.
 */
export const isReverseClaimExposed = (swap: {
    claim_tx_hex?: string
    claim_published?: boolean
}): boolean => !!(swap.claim_tx_hex && swap.claim_published)

export const isReverseClaimBroadcastAccepted = (swap: {
    claim_tx_hex?: string
    claim_broadcast_accepted?: boolean
}): boolean => !!(swap.claim_tx_hex && swap.claim_broadcast_accepted)

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
 * Signed-fee floor for first disclosure and unaccepted retry. Looks at the
 * transaction's actual fee, not whether the quoted miner budget could pay
 * the remaining-window feerate.
 */
export const checkUnilateralClaimPaysRate = (
    tx: Transaction,
    inputValue: number,
    satPerVbyte: number,
): { ok: true, fee: number } | { ok: false, error: string } => {
    const rate = resolveClaimSatPerVbyte(satPerVbyte)
    if (!rate.ok) {
        return rate
    }
    if (!isPositiveSats(inputValue)) {
        return { ok: false, error: 'invalid lockup value for reverse-swap claim' }
    }
    if (tx.ins.length !== 1 || tx.outs.length !== 1) {
        return { ok: false, error: 'unilateral claim must be a single-input single-output spend' }
    }
    const output = tx.outs[0]
    if (!isNonNegativeSats(output.value)) {
        return { ok: false, error: 'invalid claim output value' }
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
    return { ok: true, fee }
}

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
    const paid = checkUnilateralClaimPaysRate(tx, inputValue, satPerVbyte)
    if (!paid.ok) {
        return paid
    }
    if (paid.fee > maxFee) {
        return { ok: false, error: `unilateral claim fee ${paid.fee} exceeds quoted miner budget ${maxFee}` }
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
    connectSwapSocket: SwapWsConnect = defaultSwapWsConnect
    swapWsPingMs = SWAP_WS_PING_MS
    swapWsRetryMs = SWAP_WS_RETRY_MS
    swapWsRetryMaxMs = SWAP_WS_RETRY_MAX_MS
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
        const localAbort = new AbortController()
        const onParentAbort = () => localAbort.abort()
        chain.abortSignal?.addEventListener('abort', onParentAbort)
        let txId = "", isDone = false
        const session = connectSwapUpdates({
            wsUrl: this.wsUrl,
            swapId: data.createdResponse.id,
            log: this.log,
            abort: localAbort.signal,
            connect: this.connectSwapSocket,
            pingMs: this.swapWsPingMs,
            retryMs: this.swapWsRetryMs,
            retryMaxMs: this.swapWsRetryMaxMs,
            onMessage: async (rawMsg) => {
                await this.handleSwapTransactionMessage(rawMsg)
            },
        })
        const done = (failureReason?: string) => {
            if (isDone) {
                return
            }
            isDone = true
            localAbort.abort()
            chain.abortSignal?.removeEventListener('abort', onParentAbort)
            session.close()
            if (failureReason) {
                swapDone({ ok: false, error: failureReason })
            } else if (!txId) {
                swapDone({ ok: false, error: 'swap settled without a validated on-chain claim' })
            } else {
                swapDone({ ok: true, txId })
            }
        }
        void this.claimWhenLockupConfirmed(data, chain, localAbort.signal, (id) => { txId = id }, done)
    }

    /**
     * Provider websocket is informational only. It must never finish the swap or
     * abort the chain watch: a hostile update (failed/expired, or malformed JSON)
     * would otherwise cancel an independent 1-conf claim.
     */
    handleSwapTransactionMessage = async (rawMsg: unknown) => {
        let msg: any
        try {
            msg = JSON.parse(swapWsPayloadText(rawMsg))
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

            let probe: Transaction
            try {
                probe = this.buildUnilateralClaim(data, parsed, MIN_CLAIM_SAT_PER_VBYTE)
            } catch (err: any) {
                return { ok: false, error: `failed to construct unilateral claim: ${err.message}` }
            }
            const vbytes = claimTargetVbytes(probe)
            const firstRate = await this.remainingWindowFeeRate(data, deps, vbytes)
            if (!firstRate.ok) {
                return firstRate
            }
            let satPerVbyte = firstRate.satPerVbyte

            const savedHex = this.matchingSavedClaimHex(deps.savedClaimHex, parsed, data.info.preimage)
            if (savedHex) {
                const saved = Transaction.fromHex(savedHex)
                const savedRelayable = checkUnilateralClaimRelayable(
                    saved,
                    parsed.swapOutput.value,
                    satPerVbyte,
                    data.info.chainFee,
                )
                if (savedRelayable.ok) {
                    const recheck = await this.persistAndRecheckRemainingWindow(data, parsed, deps, saved, vbytes)
                    if (recheck.kind === 'ready') {
                        const beforeSavedPublish = await this.prepareClaimBroadcast(data, deps, guard)
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
                    } else if (recheck.kind === 'reconstruct') {
                        satPerVbyte = recheck.satPerVbyte
                    } else {
                        return { ok: false, error: recheck.error }
                    }
                }
            }

            for (let attempt = 0; attempt < MAX_CLAIM_FEE_RERATES; attempt++) {
                let unilateral: Transaction
                try {
                    unilateral = this.buildUnilateralClaim(data, parsed, satPerVbyte)
                } catch (err: any) {
                    return { ok: false, error: `failed to construct unilateral claim: ${err.message}` }
                }

                const relayable = checkUnilateralClaimRelayable(
                    unilateral,
                    parsed.swapOutput.value,
                    satPerVbyte,
                    data.info.chainFee,
                )
                if (!relayable.ok) {
                    return relayable
                }

                // Persist the script-path spend and wait for that backup before the
                // safety checks so a crash still has a locally relayable claim.
                // Persistence is not disclosure: unpublished saved claims must still
                // pass the checks above (saved hex) or below (reconstructed hex).
                // After backup, re-price against the current remaining window; a
                // cheaper earlier-window estimate must not first-disclose.
                // After that check the exposure marker is written, then the same
                // checks run again before broadcast. Refusing after the marker
                // leaves claim_published set; retry/resume still run first-disclosure
                // unless our spend or LND acceptance is already proven.
                const recheck = await this.persistAndRecheckRemainingWindow(data, parsed, deps, unilateral, vbytes)
                if (recheck.kind === 'reconstruct') {
                    satPerVbyte = recheck.satPerVbyte
                    continue
                }
                if (recheck.kind !== 'ready') {
                    return { ok: false, error: recheck.error }
                }

                const beforePublish = await this.prepareClaimBroadcast(data, deps, guard)
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
            }
            return { ok: false, error: 'failed to size reverse-swap claim for the remaining window' }
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
     * Remaining-window sat/vbyte against a fresh tip. Fee lookup is async:
     * re-read the tip after it and re-estimate if remaining shrank, so a
     * cheaper earlier-window estimate cannot first-disclose. Persist can
     * still wait on backup; callers re-price after that wait.
     */
    private remainingWindowFeeRate = async (
        data: TransactionSwapData,
        deps: ReverseClaimDeps,
        vbytes: number,
    ): Promise<{ ok: true, satPerVbyte: number } | { ok: false, error: string }> => {
        const timeout = data.createdResponse.timeoutBlockHeight
        let feeRates: ReverseClaimFeeRates | undefined
        for (let attempt = 0; attempt < 2; attempt++) {
            let tip: number
            try {
                tip = await deps.getChainTip()
            } catch (err: any) {
                return { ok: false, error: `failed to read chain tip before claim: ${err.message || err}` }
            }
            const window = checkReverseClaimWindow(timeout, tip)
            if (!window.ok) {
                return window
            }
            const remaining = timeout - tip
            try {
                feeRates = await deps.getClaimFeeRates(remaining)
            } catch (err: any) {
                return { ok: false, error: `failed to read local claim fee rate: ${err.message || err}` }
            }
            try {
                tip = await deps.getChainTip()
            } catch (err: any) {
                return { ok: false, error: `failed to read chain tip before claim: ${err.message || err}` }
            }
            const windowAfter = checkReverseClaimWindow(timeout, tip)
            if (!windowAfter.ok) {
                return windowAfter
            }
            if (timeout - tip === remaining) {
                return resolveClaimFeeRate(
                    feeRates.satPerVbyte,
                    feeRates.minRelaySatPerVbyte,
                    data.info.chainFee,
                    vbytes,
                )
            }
        }
        if (!feeRates) {
            return { ok: false, error: 'failed to read local claim fee rate' }
        }
        return resolveClaimFeeRate(
            feeRates.satPerVbyte,
            feeRates.minRelaySatPerVbyte,
            data.info.chainFee,
            vbytes,
        )
    }

    /**
     * Persist the unpublished claim, then re-price against the remaining
     * window. Backup can move the tip; a cheaper earlier-window signature
     * must not first-disclose. Reconstruct when the budget can still pay
     * the live rate; refuse when it cannot.
     */
    private persistAndRecheckRemainingWindow = async (
        data: TransactionSwapData,
        parsed: ParsedLockup,
        deps: ReverseClaimDeps,
        tx: Transaction,
        vbytes: number,
    ): Promise<
        | { kind: 'ready', satPerVbyte: number }
        | { kind: 'error', error: string }
        | { kind: 'reconstruct', satPerVbyte: number }
    > => {
        const persist = await this.persistClaimHex(deps, tx.toHex())
        if (persist) {
            return { kind: 'error', error: persist.error }
        }
        const live = await this.remainingWindowFeeRate(data, deps, vbytes)
        if (!live.ok) {
            return { kind: 'error', error: live.error }
        }
        const paid = checkUnilateralClaimPaysRate(tx, parsed.swapOutput.value, live.satPerVbyte)
        if (!paid.ok) {
            return { kind: 'reconstruct', satPerVbyte: live.satPerVbyte }
        }
        const relayable = checkUnilateralClaimRelayable(
            tx,
            parsed.swapOutput.value,
            live.satPerVbyte,
            data.info.chainFee,
        )
        if (!relayable.ok) {
            return { kind: 'error', error: relayable.error }
        }
        return { kind: 'ready', satPerVbyte: live.satPerVbyte }
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
    ): Promise<{ ok: true, guard: LockupSpendGuard } | { ok: false, error: string }> => {
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
            return { ok: true, guard }
        } catch (err: any) {
            guard.stop()
            return { ok: false, error: `failed to check lockup spend status: ${err.message || err}` }
        }
    }

    private persistClaimHex = async (
        deps: ReverseClaimDeps,
        txHex: string,
    ): Promise<{ ok: false, error: string } | undefined> => {
        try {
            await deps.persistClaim?.(txHex)
        } catch (err: any) {
            return { ok: false, error: `failed to persist reverse-swap claim: ${err.message || err}` }
        }
        return undefined
    }

    /**
     * Safety check, then the exposure marker, then the same check again.
     * Expiry, spend, or abort during the marker write must still refuse
     * broadcast. A leftover claim_published without a spend is not disclosure:
     * PayAddrWithSwap retry and resume re-run first-disclosure checks unless
     * our lockup spend or LND acceptance is already proven. Backup of the
     * unpublished claim already waited in persistClaim; the marker backup
     * must not sit in this gap.
     */
    private prepareClaimBroadcast = async (
        data: TransactionSwapData,
        deps: ReverseClaimDeps,
        guard: LockupSpendGuard,
    ): Promise<{ ok: false, error: string } | undefined> => {
        const blocked = await this.claimPublicationBlocked(data, deps, guard)
        if (blocked) {
            return blocked
        }
        try {
            await deps.recordPublication()
        } catch (err: any) {
            return { ok: false, error: `failed to record reverse-swap claim publication: ${err.message || err}` }
        }
        return this.claimPublicationBlocked(data, deps, guard)
    }

    /**
     * Persistence, fee lookup, signing, and the marker write are async.
     * Re-check abort, a fresh trusted tip, and spend-watch state immediately
     * before the exposure marker and again after it: the height watcher may
     * have closed the window while we were preparing or while the marker was
     * being written.
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
