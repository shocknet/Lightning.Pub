import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp';
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule;
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils, constructRefundTransaction,
    OutputType, targetFee, swapTree, compareTrees, Scripts
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { Transaction, address } from 'bitcoinjs-lib';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { caughtErrorMessage, loggedGet, loggedPost, getNetwork, findTaprootSwapOutput, isExactTaprootSwapOutput } from './swapHelpers.js';
import { BTCNetwork } from '../../main/settings.js';

/* type InvoiceSwapFees = {
    hash: string,
    rate: number,
    limits: {
        maximal: number,
        minimal: number,
        maximalZeroConf: number
    },
    fees: {
        percentage: number,
        minerFees: number,
    }
} */

export type InvoiceSwapFees = {
    percentage: number,
    minerFees: number,
}

type InvoiceSwapFeesRes = {
    BTC?: {
        BTC?: {
            fees: InvoiceSwapFees
        }
    }
}
type InvoiceSwapResponse = {
    id: string, claimPublicKey: string, swapTree: string | { claimLeaf: { version: number, output: string }, refundLeaf: { version: number, output: string } }, timeoutBlockHeight: number,
    expectedAmount: number, address: string
}
type InvoiceSwapInfo = { paymentHash: string, keys: ECPairInterface }
export type InvoiceSwapData = { createdResponse: InvoiceSwapResponse, info: InvoiceSwapInfo }

/**
 * BIP65: locktimes below this are block heights. At or above it they are unix times,
 * so a refund leaf built from such a value is not a block-height timeout.
 */
export const SUBMARINE_LOCKTIME_THRESHOLD = 500_000_000

/**
 * Shortest refund delay we will fund, in blocks (~1 day).
 * Boltz's shortest submarine timeout (swapMinimal = 1440 minutes) is 144 Bitcoin blocks.
 */
export const MIN_SUBMARINE_TIMEOUT_BLOCKS = 144

/**
 * Longest refund delay we will fund, in blocks (~2 weeks).
 * Boltz's taproot submarine timeout (swapTaproot = 10080 minutes) is 1008 Bitcoin blocks.
 */
export const MAX_SUBMARINE_TIMEOUT_BLOCKS = 2_016

/**
 * Reject provider-chosen refund heights that are not safe block heights inside
 * [tip + min, tip + max]. Building a local tree from the same height and comparing
 * it to the provider tree does not make an out-of-range height safe.
 */
export const checkSubmarineTimeout = (
    timeoutBlockHeight: number,
    currentHeight: number,
): { ok: true } | { ok: false, error: string } => {
    if (!Number.isSafeInteger(currentHeight) || currentHeight <= 0 || currentHeight >= SUBMARINE_LOCKTIME_THRESHOLD) {
        return { ok: false, error: 'untrusted chain tip' }
    }
    if (!Number.isSafeInteger(timeoutBlockHeight) || timeoutBlockHeight <= 0 || timeoutBlockHeight >= SUBMARINE_LOCKTIME_THRESHOLD) {
        return { ok: false, error: 'invalid timeoutBlockHeight from swap service' }
    }
    if (timeoutBlockHeight <= currentHeight) {
        return { ok: false, error: `swap quote expired at block ${timeoutBlockHeight} (tip ${currentHeight})` }
    }
    const earliest = currentHeight + MIN_SUBMARINE_TIMEOUT_BLOCKS
    if (timeoutBlockHeight < earliest) {
        return {
            ok: false,
            error: `timeoutBlockHeight ${timeoutBlockHeight} is sooner than ${MIN_SUBMARINE_TIMEOUT_BLOCKS} blocks from tip ${currentHeight}`,
        }
    }
    const latest = currentHeight + MAX_SUBMARINE_TIMEOUT_BLOCKS
    if (timeoutBlockHeight > latest) {
        return {
            ok: false,
            error: `timeoutBlockHeight ${timeoutBlockHeight} is later than ${MAX_SUBMARINE_TIMEOUT_BLOCKS} blocks from tip ${currentHeight}`,
        }
    }
    return { ok: true }
}

/** Boltz submarine: amountToSend = invoice + ceil(invoice * pct) + claim miner fee */
export const calculateSubmarineLockupAmount = (invoiceAmountSats: number, fees: InvoiceSwapFees): number => {
    const percentageFee = Math.ceil((fees.percentage / 100) * invoiceAmountSats)
    return invoiceAmountSats + percentageFee + fees.minerFees
}

/**
 * Cryptographic proof the provider paid our invoice: SHA256(preimage) must
 * equal the invoice payment hash. A websocket "claimed" status is not this.
 */
export const verifySubmarineClaimPreimage = (
    preimageHex: string,
    paymentHashHex: string,
): { ok: true } | { ok: false, error: string } => {
    try {
        const preimage = Buffer.from(preimageHex, 'hex')
        const paymentHash = Buffer.from(paymentHashHex, 'hex')
        if (preimage.length !== 32) {
            return { ok: false, error: 'invalid preimage length' }
        }
        if (paymentHash.length !== 32) {
            return { ok: false, error: 'invalid payment hash length' }
        }
        const hash = createHash('sha256').update(preimage).digest()
        if (!hash.equals(paymentHash)) {
            return { ok: false, error: 'preimage does not match payment hash' }
        }
        return { ok: true }
    } catch (err: any) {
        return { ok: false, error: err.message || String(err) }
    }
}

export type InvoiceSwapResult = { ok: true, preimage: string } | { ok: false, error: string }

export class SubmarineSwaps {
    private httpUrl: string
    private wsUrl: string
    private network: BTCNetwork
    log: PubLogger
    constructor({ httpUrl, wsUrl, network }: { httpUrl: string, wsUrl: string, network: BTCNetwork }) {
        this.httpUrl = httpUrl
        this.wsUrl = wsUrl
        this.network = network
        this.log = getLogger({ component: 'SubmarineSwaps' })
    }

    getHttpUrl = () => {
        return this.httpUrl
    }
    getWsUrl = () => {
        return this.wsUrl
    }

    GetFees = async (): Promise<{ ok: true, fees: InvoiceSwapFees, } | { ok: false, error: string }> => {
        const url = `${this.httpUrl}/v2/swap/submarine`
        const feesRes = await loggedGet<InvoiceSwapFeesRes>(this.log, url)
        if (!feesRes.ok) {
            return { ok: false, error: feesRes.error }
        }
        if (!feesRes.data.BTC?.BTC?.fees) {
            return { ok: false, error: 'No fees found for BTC to BTC swap' }
        }
        return { ok: true, fees: feesRes.data.BTC.BTC.fees }
    }

    SwapInvoice = async (invoice: string): Promise<{ ok: true, createdResponse: InvoiceSwapResponse, pubkey: string, privKey: string } | { ok: false, error: string }> => {
        const keys = ECPairFactory(ecc).makeRandom()
        if (!keys.privateKey) {
            return { ok: false, error: 'Failed to generate keys' }
        }
        const refundPublicKey = Buffer.from(keys.publicKey).toString('hex')
        const req = { invoice, to: 'BTC', from: 'BTC', refundPublicKey }
        const url = `${this.httpUrl}/v2/swap/submarine`
        this.log('Sending invoice swap request to', url);
        const createdResponseRes = await loggedPost<InvoiceSwapResponse>(this.log, url, req)
        if (!createdResponseRes.ok) {
            return createdResponseRes
        }
        const createdResponse = createdResponseRes.data
        this.log('Created invoice swap');
        this.log(createdResponse);
        return {
            ok: true, createdResponse,
            pubkey: refundPublicKey,
            privKey: Buffer.from(keys.privateKey).toString('hex')
        }

    }

    /**
     * Verify untrusted swap-service quote fields before any on-chain spend.
     * Checks expectedAmount against a locally computed lockup amount, that
     * timeoutBlockHeight is a safe block height inside the local refund window
     * relative to a trusted chain tip, that swapTree matches a tree built from
     * our payment hash / refund key, and that the lockup address derives from that tree.
     */
    VerifySubmarineQuote = async (params: {
        paymentHashHex: string
        refundPrivateKeyHex: string
        expectedLockupAmount: number
        currentHeight: number
        created: InvoiceSwapResponse
    }): Promise<{ ok: true } | { ok: false, error: string }> => {
        const { paymentHashHex, refundPrivateKeyHex, expectedLockupAmount, currentHeight, created } = params

        if (!Number.isFinite(created.expectedAmount) || created.expectedAmount <= 0) {
            return { ok: false, error: 'invalid expectedAmount from swap service' }
        }
        if (created.expectedAmount !== expectedLockupAmount) {
            return {
                ok: false,
                error: `expectedAmount mismatch: got ${created.expectedAmount}, want ${expectedLockupAmount}`,
            }
        }
        const timeout = checkSubmarineTimeout(created.timeoutBlockHeight, currentHeight)
        if (!timeout.ok) {
            return timeout
        }
        if (!created.claimPublicKey || !created.address || !created.swapTree) {
            return { ok: false, error: 'incomplete swap quote from swap service' }
        }

        let refundKeys: ECPairInterface
        try {
            refundKeys = ECPairFactory(ecc).fromPrivateKey(Buffer.from(refundPrivateKeyHex, 'hex'))
        } catch (err: any) {
            return { ok: false, error: `invalid refund private key: ${err.message}` }
        }

        let claimPublicKey: Buffer
        let paymentHash: Buffer
        try {
            claimPublicKey = Buffer.from(created.claimPublicKey, 'hex')
            paymentHash = Buffer.from(paymentHashHex, 'hex')
            if (claimPublicKey.length !== 33) {
                return { ok: false, error: 'invalid claimPublicKey length' }
            }
            if (paymentHash.length !== 32) {
                return { ok: false, error: 'invalid payment hash length' }
            }
        } catch (err: any) {
            return { ok: false, error: `invalid hex in quote fields: ${err.message}` }
        }

        const localTree = swapTree(
            false,
            paymentHash,
            claimPublicKey,
            Buffer.from(refundKeys.publicKey),
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
            const musig = new Musig(await zkpInit(), refundKeys, randomBytes(32), [
                claimPublicKey,
                Buffer.from(refundKeys.publicKey),
            ])
            const tweakedKey = TaprootUtils.tweakMusig(musig, localTree.tree)
            const network = getNetwork(this.network)
            const derivedAddress = address.fromOutputScript(Scripts.p2trOutput(tweakedKey), network)
            if (derivedAddress !== created.address) {
                return {
                    ok: false,
                    error: `address mismatch: got ${created.address}, derived ${derivedAddress}`,
                }
            }
        } catch (err: any) {
            return { ok: false, error: `failed to derive lockup address: ${err.message}` }
        }

        return { ok: true }
    }

    /**
     * Get partial refund signature from Boltz for cooperative refund.
     * HTTP is bounded; a hung provider must not block the unilateral path.
     */
    getPartialRefundSignature = async (
        swapId: string,
        pubNonce: Buffer,
        transaction: Transaction,
        index: number
    ): Promise<{ ok: true, data: { pubNonce: string, partialSignature: string } } | { ok: false, error: string }> => {
        if (!this.httpUrl) {
            return { ok: false, error: 'no swap provider configured' }
        }
        const url = `${this.httpUrl}/v2/swap/submarine/${swapId}/refund`
        const req = {
            index,
            pubNonce: pubNonce.toString('hex'),
            transaction: transaction.toHex()
        }
        return await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, url, req)
    }

    /**
     * Constructs a Taproot refund transaction (cooperative or uncooperative).
     * Mode is an explicit flag; never infer cooperative vs unilateral from error.message.
     * boltz-core Musig.addPartial throws a string on an invalid partial signature.
     */
    constructTaprootRefund = async (
        swapId: string,
        claimPublicKey: string,
        swapTree: string,
        timeoutBlockHeight: number,
        lockupTx: Transaction,
        privateKey: ECPairInterface,
        refundAddress: string,
        feePerVbyte: number,
        cooperative: boolean = true,
        allowUncooperativeFallback: boolean = true,
    ): Promise<{
        ok: true,
        transaction: Transaction,
        usedCooperative: boolean
    } | {
        ok: false,
        error: string
    }> => {
        this.log(`Constructing ${cooperative ? 'cooperative' : 'uncooperative'} Taproot refund for swap ${swapId}`)

        const boltzPublicKey = Buffer.from(claimPublicKey, 'hex')
        const swapTreeDeserialized = SwapTreeSerializer.deserializeSwapTree(swapTree)

        // Create musig and tweak it
        let musig = new Musig(await zkpInit(), privateKey, randomBytes(32), [
            boltzPublicKey,
            Buffer.from(privateKey.publicKey),
        ])
        const tweakedKey = TaprootUtils.tweakMusig(musig, swapTreeDeserialized.tree)

        const swapOutput = findTaprootSwapOutput(tweakedKey, lockupTx)
        if (!swapOutput || !isExactTaprootSwapOutput(swapOutput, lockupTx, tweakedKey)) {
            return { ok: false, error: 'Could not detect swap output in lockup transaction' }
        }

        const network = getNetwork(this.network)
        // const decodedAddress = address.fromBech32(refundAddress)

        const details = [
            {
                ...swapOutput,
                keys: privateKey,
                cooperative,
                type: OutputType.Taproot,
                txHash: lockupTx.getHash(),
                swapTree: swapTreeDeserialized,
                internalKey: musig.getAggregatedPublicKey(),
            }
        ]
        const outputScript = address.toOutputScript(refundAddress, network)
        // Construct the refund transaction: targetFee converts sat/vbyte rate to flat fee
        const refundTx = targetFee(
            feePerVbyte,
            (fee) => constructRefundTransaction(
                details,
                outputScript,
                cooperative ? 0 : timeoutBlockHeight,
                fee,
                true
            )
        )

        if (!cooperative) {
            return {
                ok: true,
                transaction: refundTx,
                usedCooperative: false,
            }
        }

        // For cooperative refund, get Boltz's partial signature
        try {
            musig = new Musig(await zkpInit(), privateKey, randomBytes(32), [
                boltzPublicKey,
                Buffer.from(privateKey.publicKey),
            ])
            // Get the partial signature from Boltz
            const boltzSigRes = await this.getPartialRefundSignature(
                swapId,
                Buffer.from(musig.getPublicNonce()),
                refundTx,
                0
            )

            if (!boltzSigRes.ok) {
                this.log(ERROR, 'Failed to get Boltz partial signature')
                if (!allowUncooperativeFallback) {
                    return { ok: false, error: `Failed to get Boltz partial signature: ${boltzSigRes.error}` }
                }
                this.log(ERROR, 'Falling back to uncooperative refund')
                return await this.constructTaprootRefund(
                    swapId,
                    claimPublicKey,
                    swapTree,
                    timeoutBlockHeight,
                    lockupTx,
                    privateKey,
                    refundAddress,
                    feePerVbyte,
                    false,
                    allowUncooperativeFallback,
                )
            }

            const boltzSig = boltzSigRes.data

            // Aggregate nonces
            musig.aggregateNonces([
                [boltzPublicKey, Musig.parsePubNonce(boltzSig.pubNonce)],
            ])

            // Tweak musig again after aggregating nonces
            TaprootUtils.tweakMusig(musig, swapTreeDeserialized.tree)

            // Initialize session and sign
            musig.initializeSession(
                TaprootUtils.hashForWitnessV1(
                    details,
                    refundTx,
                    0
                )
            )

            musig.signPartial()
            musig.addPartial(boltzPublicKey, Buffer.from(boltzSig.partialSignature, 'hex'))

            // Set the witness to the aggregated signature
            refundTx.ins[0].witness = [musig.aggregatePartials()]

            return { ok: true, transaction: refundTx, usedCooperative: true }
        } catch (error: unknown) {
            const message = caughtErrorMessage(error)
            this.log(ERROR, 'Cooperative refund failed:', message)
            if (!allowUncooperativeFallback) {
                return { ok: false, error: `Cooperative refund failed: ${message}` }
            }
            return await this.constructTaprootRefund(
                swapId,
                claimPublicKey,
                swapTree,
                timeoutBlockHeight,
                lockupTx,
                privateKey,
                refundAddress,
                feePerVbyte,
                false,
                allowUncooperativeFallback,
            )
        }
    }

    /**
     * Refund a submarine swap
     * @param swapId - The swap ID
     * @param claimPublicKey - Boltz's claim public key
     * @param swapTree - The swap tree
     * @param timeoutBlockHeight - The timeout block height
     * @param privateKey - The refund private key (hex string)
     * @param refundAddress - The address to refund to
     * @param currentHeight - The current block height
     * @param lockupTxHex - The persisted lockup transaction hex
     * @param feePerVbyte - Fee rate in sat/vbyte (optional, will use default if not provided)
     */
    RefundSwap = async (params: {
        swapId: string,
        claimPublicKey: string,
        swapTree: string,
        timeoutBlockHeight: number,
        privateKeyHex: string,
        refundAddress: string,
        currentHeight: number,
        lockupTxHex: string,
        feePerVbyte?: number,
        allowEarlyRefund?: boolean
    }): Promise<{ ok: true, publish: { done: false, txHex: string, txId: string, usedCooperative: boolean } } | { ok: false, error: string }> => {
        const { swapId, claimPublicKey, swapTree, timeoutBlockHeight, privateKeyHex, refundAddress, currentHeight, lockupTxHex, feePerVbyte = 2, allowEarlyRefund = false } = params

        this.log('Starting refund process for swap:', swapId)

        if (!lockupTxHex) {
            return { ok: false, error: 'lockup transaction hex is required' }
        }
        this.log('Using provided lockup transaction hex')
        const lockupTx = Transaction.fromHex(lockupTxHex)
        this.log('Lockup transaction retrieved:', lockupTx.getId())

        const hasTimedOut = currentHeight >= timeoutBlockHeight

        // For stuck swaps, only allow refund after timeout. For completed (failed) swaps,
        // we may attempt a cooperative refund before timeout.
        if (!hasTimedOut && !allowEarlyRefund) {
            return {
                ok: false,
                error: `Swap has not timed out yet. Current height: ${currentHeight}, timeout: ${timeoutBlockHeight}`
            }
        }
        if (hasTimedOut) {
            this.log(`Swap has timed out. Current height: ${currentHeight}, timeout: ${timeoutBlockHeight}`)
        } else {
            this.log(`Swap has not timed out yet, attempting cooperative refund`)
        }

        // Parse the private key
        const privateKey = ECPairFactory(ecc).fromPrivateKey(Buffer.from(privateKeyHex, 'hex'))

        // After timeout the refund is unilateral. Cooperative is a bounded optional
        // path only before timeout; publication always happens independently via LND.
        const tryCooperative = !hasTimedOut && allowEarlyRefund && !!this.httpUrl
        if (!hasTimedOut && !tryCooperative) {
            return { ok: false, error: 'cooperative refund requires a swap provider' }
        }
        const refundTxRes = await this.constructTaprootRefund(
            swapId,
            claimPublicKey,
            swapTree,
            timeoutBlockHeight,
            lockupTx,
            privateKey,
            refundAddress,
            feePerVbyte,
            tryCooperative,
            hasTimedOut,
        )

        if (!refundTxRes.ok) {
            return { ok: false, error: refundTxRes.error }
        }

        const txHex = refundTxRes.transaction.toHex()
        const txId = refundTxRes.transaction.getId()
        this.log(`Refund transaction constructed (${refundTxRes.usedCooperative ? 'cooperative' : 'uncooperative'}):`, txId)
        return { ok: true, publish: { done: false, txHex, txId, usedCooperative: refundTxRes.usedCooperative } }
    }

    SubscribeToInvoiceSwap = (
        data: InvoiceSwapData,
        swapDone: (result: InvoiceSwapResult) => void,
        waitingTx: () => void | Promise<void>,
        reconcileSettledPreimage?: () => Promise<string | undefined>,
    ) => {
        this.log("subscribing to invoice swap", { id: data.createdResponse.id })
        const webSocket = new ws(`${this.wsUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [data.createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })
        const interval = setInterval(() => {
            webSocket.ping()
        }, 30 * 1000)
        interval.unref()
        let isDone = false
        const done = (result: InvoiceSwapResult) => {
            if (isDone) {
                return
            }
            isDone = true
            clearInterval(interval)
            webSocket.close()
            swapDone(result)
        }
        webSocket.on('pong', () => {
            this.log('WebSocket invoice swap pong received')
        })
        webSocket.on('error', (err) => {
            this.log(ERROR, 'Error in WebSocket', err.message)
        })
        webSocket.on('close', () => {
            if (!isDone) {
                this.log('WebSocket closed; completion still requires a verified preimage')
            }
        })
        let txRequested = false
        const requestTx = () => {
            if (txRequested) {
                this.log('Tx already requested')
                return
            }
            txRequested = true
            // waitingTx may be async (resume rebroadcast). requestTx itself is not
            // awaited by the websocket handler, so catch here to avoid an unhandled
            // rejection taking down the process.
            void Promise.resolve().then(() => waitingTx()).catch((err: any) => {
                this.log(ERROR, 'Error requesting invoice swap lockup', err.message || err)
            })
        }
        webSocket.on('message', async (rawMsg) => {
            try {
                await this.handleSwapInvoiceMessage(rawMsg, data, {
                    waitingTx: requestTx,
                    onVerifiedPreimage: (preimage) => done({ ok: true, preimage }),
                    reconcileSettledPreimage,
                })
            } catch (err: any) {
                this.log(ERROR, 'Error handling invoice WebSocket message', err.message)
            }
        });
        return () => {
            webSocket.close()
        }
    }

    /**
     * Provider websocket is informational except for invoice.set (fund) and
     * claim.pending (verify preimage, then optionally cooperate).
     * transaction.claimed is untrusted: it is only a hint to reconcile a locally
     * settled invoice. That does not skip cooperative claim; we still wait for
     * claim.pending while the swap is in flight.
     */
    handleSwapInvoiceMessage = async (
        rawMsg: ws.RawData,
        data: InvoiceSwapData,
        handlers: {
            waitingTx: () => void | Promise<void>
            onVerifiedPreimage?: (preimage: string) => void
            reconcileSettledPreimage?: () => Promise<string | undefined>
        },
    ) => {
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

        this.log('Got invoice WebSocket update')
        this.log(msg)
        const update = msg.args?.[0]
        const status = update?.status
        const updateId = update?.id
        if (updateId && updateId !== data.createdResponse.id) {
            this.log(ERROR, 'Ignoring swap websocket update for a different swap', { updateId, expected: data.createdResponse.id })
            return
        }
        if (!updateId) {
            this.log(ERROR, 'Ignoring swap websocket update with no swap id')
            return
        }
        switch (status) {
            case 'invoice.set':
                this.log('Waiting for onchain transaction')
                handlers.waitingTx()
                return
            case 'transaction.claim.pending': {
                const claimed = await this.handleInvoiceClaimPending(data)
                if (claimed.ok) {
                    handlers.onVerifiedPreimage?.(claimed.preimage)
                }
                return
            }
            case 'transaction.claimed': {
                this.log('Provider reported transaction.claimed - reconciling independently')
                let preimage: string | undefined
                try {
                    preimage = await handlers.reconcileSettledPreimage?.()
                } catch (err: any) {
                    this.log(ERROR, 'Failed to reconcile claimed invoice swap', err.message || err)
                    return
                }
                if (!preimage) {
                    this.log('No independent preimage for claimed swap; leaving open')
                    return
                }
                const verified = verifySubmarineClaimPreimage(preimage, data.info.paymentHash)
                if (!verified.ok) {
                    this.log(ERROR, 'Reconciled claimed preimage failed verification', verified.error)
                    return
                }
                handlers.onVerifiedPreimage?.(preimage)
                return
            }
            case 'swap.expired':
            case 'transaction.lockupFailed':
            case 'invoice.failedToPay':
                this.log('Provider reported', status, '- ignoring; refund still depends on independent lockup state')
                return
            default:
                this.log('Unknown swap invoice WebSocket message', msg)
                return
        }
    }

    handleInvoiceClaimPending = async (data: InvoiceSwapData): Promise<{ ok: true, preimage: string } | { ok: false, error: string }> => {
        this.log('Creating cooperative claim transaction');
        const { createdResponse, info } = data
        const { paymentHash, keys } = info
        const url = `${this.httpUrl}/v2/swap/submarine/${createdResponse.id}/claim`
        const claimTxDetailsRes = await loggedGet<{ preimage: string, transactionHash: string, pubNonce: string }>(this.log, url)
        if (!claimTxDetailsRes.ok) {
            return claimTxDetailsRes
        }
        const claimTxDetails = claimTxDetailsRes.data
        const verified = verifySubmarineClaimPreimage(claimTxDetails.preimage, paymentHash)
        if (!verified.ok) {
            this.log(ERROR, 'Boltz provided invalid preimage', verified.error)
            return verified
        }

        try {
            const boltzPublicKey = Buffer.from(createdResponse.claimPublicKey, 'hex')

            const musig = new Musig(await zkpInit(), keys, randomBytes(32), [
                boltzPublicKey,
                Buffer.from(keys.publicKey),
            ]);
            TaprootUtils.tweakMusig(
                musig,
                SwapTreeSerializer.deserializeSwapTree(createdResponse.swapTree).tree,
            );

            musig.aggregateNonces([
                [boltzPublicKey, Buffer.from(claimTxDetails.pubNonce, 'hex')],
            ]);
            musig.initializeSession(
                Buffer.from(claimTxDetails.transactionHash, 'hex'),
            );

            const claimUrl = `${this.httpUrl}/v2/swap/submarine/${createdResponse.id}/claim`
            const claimReq = {
                pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
                partialSignature: Buffer.from(musig.signPartial()).toString('hex'),
            }
            const claimResponseRes = await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, claimUrl, claimReq)
            if (!claimResponseRes.ok) {
                this.log(ERROR, 'Cooperative claim signature post failed', claimResponseRes.error)
            } else {
                this.log('Claim response', claimResponseRes.data)
            }
        } catch (err: any) {
            this.log(ERROR, 'Cooperative claim signing failed', err.message || err)
        }

        return { ok: true, preimage: claimTxDetails.preimage }
    }
}
