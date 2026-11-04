import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp';
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule;
import { initEccLib, Transaction, address } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils, detectSwap,
    constructClaimTransaction, OutputType, constructRefundTransaction,
    reverseSwapTree, compareTrees, Scripts
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { isNonNegativeSats, isPositiveSats } from '../../helpers/sats.js';
import { BTCNetwork } from '../../main/settings.js';
import { loggedGet, loggedPost, getNetwork } from './swapHelpers.js';


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

export type CooperativeClaimResult = { pubNonce: string, partialSignature: string }
export type CooperativeClaimFn = (req: {
    id: string
    transaction: string
    preimage: string
    pubNonce: string
}) => Promise<{ ok: true, data: CooperativeClaimResult } | { ok: false, error: string }>

export type ReverseClaimChain = {
    waitForLockup: (script: Buffer, numConfs: number, heightHint: number, abort?: AbortSignal) => Promise<{ txHex: string }>
    publish: (txHex: string) => Promise<void>
    persistClaim?: (txHex: string) => Promise<void>
    heightHint: number
    abortSignal?: AbortSignal
    cooperativeClaim?: CooperativeClaimFn
}

type ParsedLockup = {
    lockupTx: Transaction
    swapOutput: NonNullable<ReturnType<typeof detectSwap>>
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
 * SendPaymentV2 must stay in-flight until the lockup confirms and we claim.
 * 50s is only enough for the old mempool-speed cooperative path.
 */
export const REVERSE_SWAP_PAYMENT_TIMEOUT_SECONDS = 60 * 60

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
        try {
            const network = getNetwork(this.network)
            const script = address.toOutputScript(data.createdResponse.lockupAddress, network)
            const confirmed = await chain.waitForLockup(script, REVERSE_CLAIM_CONFIRMATIONS, chain.heightHint, abort)
            if (abort.aborted) {
                return
            }
            const claimed = await this.claimConfirmedLockup(data, confirmed.txHex, chain)
            if (!claimed.ok) {
                done(claimed.error)
                return
            }
            setClaimTxId(claimed.txId)
            done()
        } catch (err: any) {
            if (abort.aborted) {
                return
            }
            this.log(ERROR, 'Failed waiting for confirmed reverse-swap lockup', err.message || err)
            done(err.message || String(err))
        }
    }

    /**
     * Claim a lockup that our node has already confirmed. Builds the script-path
     * spend first so a withheld cooperative signature is not theft, then tries
     * the cheaper key-path claim. Always publishes via the injected chain client.
     */
    claimConfirmedLockup = async (
        data: TransactionSwapData,
        confirmedTxHex: string,
        deps: { publish: (txHex: string) => Promise<void>, persistClaim?: (txHex: string) => Promise<void>, cooperativeClaim?: CooperativeClaimFn },
    ): Promise<{ ok: true, txId: string, usedCooperative: boolean } | { ok: false, error: string }> => {
        const parsed = await this.parseAndValidateLockup(data, confirmedTxHex)
        if (!parsed.ok) {
            return parsed
        }

        let unilateral: Transaction
        try {
            unilateral = this.buildUnilateralClaim(data, parsed)
        } catch (err: any) {
            return { ok: false, error: `failed to construct unilateral claim: ${err.message}` }
        }

        // Persist the script-path spend before disclosing the preimage cooperatively
        // or broadcasting, so a crash still has a claim to rebroadcast.
        try {
            await deps.persistClaim?.(unilateral.toHex())
        } catch (err: any) {
            return { ok: false, error: `failed to persist reverse-swap claim: ${err.message || err}` }
        }

        let toPublish = unilateral
        let usedCooperative = false
        const coop = await this.tryCooperativeClaim(data, parsed, deps.cooperativeClaim)
        if (coop.ok) {
            try {
                await deps.persistClaim?.(coop.tx.toHex())
            } catch (err: any) {
                this.log(ERROR, 'Failed to persist cooperative claim, publishing script-path claim', err.message || err)
            }
            toPublish = coop.tx
            usedCooperative = true
        } else {
            this.log(ERROR, 'Cooperative reverse-swap claim failed, publishing script-path claim', coop.error)
        }

        try {
            await deps.publish(toPublish.toHex())
        } catch (err: any) {
            if (usedCooperative) {
                this.log(ERROR, 'Cooperative claim publish failed, broadcasting script-path claim', err.message)
                await deps.persistClaim?.(unilateral.toHex()).catch(() => undefined)
                await deps.publish(unilateral.toHex())
                toPublish = unilateral
                usedCooperative = false
            } else {
                return { ok: false, error: err.message || String(err) }
            }
        }
        this.log('Reverse-swap claim published', { txId: toPublish.getId(), usedCooperative })
        return { ok: true, txId: toPublish.getId(), usedCooperative }
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
        const swapOutput = detectSwap(tweakedKey, lockupTx)
        if (swapOutput === undefined) {
            this.log(ERROR, 'No swap output found in lockup transaction')
            return { ok: false, error: 'No swap output found in lockup transaction' }
        }

        const expectedAmount = createdResponse.onchainAmount
        if (!Number.isFinite(expectedAmount) || expectedAmount === undefined || expectedAmount <= 0) {
            return { ok: false, error: 'Missing or invalid quoted onchainAmount for reverse swap' }
        }
        if (swapOutput.value < expectedAmount) {
            this.log(ERROR, 'Lockup output underfunded', { got: swapOutput.value, want: expectedAmount })
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

    private buildUnilateralClaim = (data: TransactionSwapData, parsed: ParsedLockup): Transaction => {
        const { info } = data
        const network = getNetwork(this.network)
        return constructClaimTransaction(
            [
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
            ],
            address.toOutputScript(info.destinationAddress, network),
            info.chainFee,
        )
    }

    private tryCooperativeClaim = async (
        data: TransactionSwapData,
        parsed: ParsedLockup,
        cooperativeClaim?: CooperativeClaimFn,
    ): Promise<{ ok: true, tx: Transaction } | { ok: false, error: string }> => {
        const { createdResponse, info } = data
        const { keys, preimage, chainFee, destinationAddress } = info
        try {
            const musig = new Musig(await zkpInit(), keys, randomBytes(32), [
                parsed.boltzPublicKey,
                Buffer.from(keys.publicKey),
            ])
            TaprootUtils.tweakMusig(musig, parsed.swapTree.tree)
            const network = getNetwork(this.network)
            const claimTx = constructClaimTransaction(
                [
                    {
                        ...parsed.swapOutput,
                        keys,
                        preimage,
                        cooperative: true,
                        type: OutputType.Taproot,
                        txHash: parsed.lockupTx.getHash(),
                    },
                ],
                address.toOutputScript(destinationAddress, network),
                chainFee,
            )
            const postClaim = cooperativeClaim ?? this.postCooperativeClaim
            const boltzSigRes = await postClaim({
                id: createdResponse.id,
                transaction: claimTx.toHex(),
                preimage: preimage.toString('hex'),
                pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
            })
            if (!boltzSigRes.ok) {
                return boltzSigRes
            }
            const boltzSig = boltzSigRes.data
            musig.aggregateNonces([
                [parsed.boltzPublicKey, Musig.parsePubNonce(boltzSig.pubNonce)],
            ])
            musig.initializeSession(
                claimTx.hashForWitnessV1(
                    0,
                    [parsed.swapOutput.script],
                    [parsed.swapOutput.value],
                    Transaction.SIGHASH_DEFAULT,
                ),
            )
            musig.addPartial(
                parsed.boltzPublicKey,
                Buffer.from(boltzSig.partialSignature, 'hex'),
            )
            musig.signPartial()
            claimTx.ins[0].witness = [musig.aggregatePartials()]
            return { ok: true, tx: claimTx }
        } catch (err: any) {
            return { ok: false, error: err.message || String(err) }
        }
    }

    private postCooperativeClaim: CooperativeClaimFn = async (req) => {
        const claimUrl = `${this.httpUrl}/v2/swap/reverse/${req.id}/claim`
        return loggedPost<CooperativeClaimResult>(this.log, claimUrl, {
            index: 0,
            transaction: req.transaction,
            preimage: req.preimage,
            pubNonce: req.pubNonce,
        })
    }
}