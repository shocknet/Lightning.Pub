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

    SubscribeToTransactionSwap = async (data: TransactionSwapData, swapDone: (result: { ok: true, txId: string } | { ok: false, error: string }) => void) => {
        const webSocket = new ws(`${this.wsUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [data.createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })
        const interval = setInterval(() => {
            webSocket.ping()
        }, 30 * 1000)
        let txId = "", isDone = false
        const done = (failureReason?: string) => {
            isDone = true
            clearInterval(interval)
            webSocket.close()
            if (failureReason) {
                swapDone({ ok: false, error: failureReason })
            } else if (!txId) {
                // Never report success without a validated on-chain claim tx
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
                this.log(ERROR, 'WebSocket closed before swap was done');
                done('WebSocket closed before swap was done')
            }
        })
        webSocket.on('message', async (rawMsg) => {
            try {
                await this.handleSwapTransactionMessage(rawMsg, data, done, {
                    getClaimTxId: () => txId,
                    setClaimTxId: (id: string) => { txId = id },
                })
            } catch (err: any) {
                this.log(ERROR, 'Error handling transaction WebSocket message', err.message)
                done(err.message)
                return
            }
        })
    }

    handleSwapTransactionMessage = async (
        rawMsg: ws.RawData,
        data: TransactionSwapData,
        done: (failureReason?: string) => void,
        claim: { getClaimTxId: () => string, setClaimTxId: (txId: string) => void },
    ) => {
        const msg = JSON.parse(rawMsg.toString('utf-8'));
        if (msg.event !== 'update') {
            return;
        }

        this.log('Got WebSocket update');
        this.log(msg);
        switch (msg.args[0].status) {
            // "swap.created" means Boltz is waiting for the invoice to be paid
            case 'swap.created':
                this.log('Waiting invoice to be paid');
                return;

            // "transaction.mempool" means that Boltz sent an onchain transaction
            case 'transaction.mempool':
                const txIdRes = await this.handleTransactionMempool(data, msg.args[0].transaction.hex)
                if (!txIdRes.ok) {
                    throw new Error(txIdRes.error)
                }
                // Record claim tx before any later invoice.settled can succeed
                claim.setClaimTxId(txIdRes.txId)
                return
            case 'invoice.settled':
                if (!claim.getClaimTxId()) {
                    done(`swap ${data.createdResponse.id} settled without a validated on-chain claim`)
                    return
                }
                this.log('Transaction swap successful');
                done()
                return;
            case 'invoice.expired':
            case 'swap.expired':
            case 'transaction.failed':
                done(`swap ${data.createdResponse.id} failed with status ${msg.args[0].status}`)
                return;
            default:
                this.log('Unknown swap transaction WebSocket message', msg)
                return;

        }
    }

    handleTransactionMempool = async (data: TransactionSwapData, txHex: string): Promise<{ ok: true, txId: string } | { ok: false, error: string }> => {
        this.log('Creating claim transaction');
        const { createdResponse, info } = data
        const { destinationAddress, keys, preimage, chainFee } = info
        const boltzPublicKey = Buffer.from(
            createdResponse.refundPublicKey,
            'hex',
        );

        // Create a musig signing session and tweak it with the Taptree of the swap scripts
        const musig = new Musig(await zkpInit(), keys, randomBytes(32), [
            boltzPublicKey,
            Buffer.from(keys.publicKey),
        ]);
        const tweakedKey = TaprootUtils.tweakMusig(
            musig,
            // swap tree can either be a string or an object
            SwapTreeSerializer.deserializeSwapTree(createdResponse.swapTree).tree,
        );

        // Parse the lockup transaction and find the output relevant for the swap
        const lockupTx = Transaction.fromHex(txHex);
        const swapOutput = detectSwap(tweakedKey, lockupTx);
        if (swapOutput === undefined) {
            this.log(ERROR, 'No swap output found in lockup transaction');
            return { ok: false, error: 'No swap output found in lockup transaction' }
        }

        // Refuse to claim (and reveal the preimage) unless the lockup pays at least
        // the quoted on-chain amount. Script match alone is not enough.
        const expectedAmount = createdResponse.onchainAmount
        if (!Number.isFinite(expectedAmount) || expectedAmount === undefined || expectedAmount <= 0) {
            this.log(ERROR, 'Missing or invalid quoted onchainAmount for reverse swap');
            return { ok: false, error: 'Missing or invalid quoted onchainAmount for reverse swap' }
        }
        if (swapOutput.value < expectedAmount) {
            this.log(ERROR, 'Lockup output underfunded', { got: swapOutput.value, want: expectedAmount });
            return {
                ok: false,
                error: `Lockup output underfunded: got ${swapOutput.value}, want at least ${expectedAmount}`,
            }
        }

        const network = getNetwork(this.network)
        // Create a claim transaction to be signed cooperatively via a key path spend
        const claimTx = constructClaimTransaction(
            [
                {
                    ...swapOutput,
                    keys,
                    preimage,
                    cooperative: true,
                    type: OutputType.Taproot,
                    txHash: lockupTx.getHash(),
                },
            ],
            address.toOutputScript(destinationAddress, network),
            chainFee,
        )
        // Get the partial signature from Boltz
        const claimUrl = `${this.httpUrl}/v2/swap/reverse/${createdResponse.id}/claim`
        const claimReq = {
            index: 0,
            transaction: claimTx.toHex(),
            preimage: preimage.toString('hex'),
            pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
        }
        const boltzSigRes = await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, claimUrl, claimReq)
        if (!boltzSigRes.ok) {
            return boltzSigRes
        }
        const boltzSig = boltzSigRes.data

        // Aggregate the nonces
        musig.aggregateNonces([
            [boltzPublicKey, Buffer.from(boltzSig.pubNonce, 'hex')],
        ]);

        // Initialize the session to sign the claim transaction
        musig.initializeSession(
            claimTx.hashForWitnessV1(
                0,
                [swapOutput.script],
                [swapOutput.value],
                Transaction.SIGHASH_DEFAULT,
            ),
        );

        // Add the partial signature from Boltz
        musig.addPartial(
            boltzPublicKey,
            Buffer.from(boltzSig.partialSignature, 'hex'),
        );

        // Create our partial signature
        musig.signPartial();

        // Witness of the input to the aggregated signature
        claimTx.ins[0].witness = [musig.aggregatePartials()];

        // Broadcast the finalized transaction
        const broadcastUrl = `${this.httpUrl}/v2/chain/BTC/transaction`
        const broadcastReq = {
            hex: claimTx.toHex(),
        }

        const broadcastResponse = await loggedPost<any>(this.log, broadcastUrl, broadcastReq)
        if (!broadcastResponse.ok) {
            return broadcastResponse
        }
        this.log('Transaction broadcasted', broadcastResponse.data)
        const txId = claimTx.getId()
        return { ok: true, txId }
    }
}