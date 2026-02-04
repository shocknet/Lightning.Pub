import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp';
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule;
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils, constructRefundTransaction,
    detectSwap, OutputType
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { Transaction, address } from 'bitcoinjs-lib';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { loggedGet, loggedPost, getNetwork } from './swapHelpers.js';
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

type InvoiceSwapFees = {
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
    id: string, claimPublicKey: string, swapTree: string, timeoutBlockHeight: number,
    expectedAmount: number, address: string
}
type InvoiceSwapInfo = { paymentHash: string, keys: ECPairInterface }
export type InvoiceSwapData = { createdResponse: InvoiceSwapResponse, info: InvoiceSwapInfo }

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
     * Get the lockup transaction for a swap from Boltz
     */
    private getLockupTransaction = async (swapId: string): Promise<{ ok: true, data: { hex: string } } | { ok: false, error: string }> => {
        const url = `${this.httpUrl}/v2/swap/submarine/${swapId}/transaction`
        return await loggedGet<{ hex: string }>(this.log, url)
    }

    /**
     * Get partial refund signature from Boltz for cooperative refund
     */
    private getPartialRefundSignature = async (
        swapId: string,
        pubNonce: Buffer,
        transaction: Transaction,
        index: number
    ): Promise<{ ok: true, data: { pubNonce: string, partialSignature: string } } | { ok: false, error: string }> => {
        const url = `${this.httpUrl}/v2/swap/submarine/${swapId}/refund`
        const req = {
            index,
            pubNonce: pubNonce.toString('hex'),
            transaction: transaction.toHex()
        }
        return await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, url, req)
    }

    /**
     * Constructs a Taproot refund transaction (cooperative or uncooperative)
     */
    private constructTaprootRefund = async (
        swapId: string,
        claimPublicKey: string,
        swapTree: string,
        timeoutBlockHeight: number,
        lockupTx: Transaction,
        privateKey: ECPairInterface,
        refundAddress: string,
        feePerVbyte: number,
        cooperative: boolean = true
    ): Promise<{
        ok: true,
        transaction: Transaction,
        cooperativeError?: string
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

        // Detect the swap output in the lockup transaction
        const swapOutput = detectSwap(tweakedKey, lockupTx)
        if (!swapOutput) {
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
        // Construct the refund transaction
        const refundTx = constructRefundTransaction(
            details,
            outputScript,
            cooperative ? 0 : timeoutBlockHeight,
            feePerVbyte,
            true
        )

        if (!cooperative) {
            return { ok: true, transaction: refundTx }
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
                this.log(ERROR, 'Failed to get Boltz partial signature, falling back to uncooperative refund')
                // Fallback to uncooperative refund
                return await this.constructTaprootRefund(
                    swapId,
                    claimPublicKey,
                    swapTree,
                    timeoutBlockHeight,
                    lockupTx,
                    privateKey,
                    refundAddress,
                    feePerVbyte,
                    false
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

            return { ok: true, transaction: refundTx }
        } catch (error: any) {
            this.log(ERROR, 'Cooperative refund failed:', error.message)
            // Fallback to uncooperative refund
            return await this.constructTaprootRefund(
                swapId,
                claimPublicKey,
                swapTree,
                timeoutBlockHeight,
                lockupTx,
                privateKey,
                refundAddress,
                feePerVbyte,
                false
            )
        }
    }

    /**
     * Broadcasts a refund transaction
     */
    private broadcastRefundTransaction = async (transaction: Transaction): Promise<{ ok: true, txId: string } | { ok: false, error: string }> => {
        const url = `${this.httpUrl}/v2/chain/BTC/transaction`
        const req = { hex: transaction.toHex() }

        const result = await loggedPost<{ id: string }>(this.log, url, req)
        if (!result.ok) {
            return result
        }

        return { ok: true, txId: result.data.id }
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
     * @param lockupTxHex - The lockup transaction hex (optional, will fetch from Boltz if not provided)
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
        lockupTxHex?: string,
        feePerVbyte?: number
    }): Promise<{ ok: true, publish: { done: false, txHex: string, txId: string } | { done: true, txId: string } } | { ok: false, error: string }> => {
        const { swapId, claimPublicKey, swapTree, timeoutBlockHeight, privateKeyHex, refundAddress, currentHeight, lockupTxHex, feePerVbyte = 2 } = params

        this.log('Starting refund process for swap:', swapId)

        // Get the lockup transaction (from parameter or fetch from Boltz)
        let lockupTx: Transaction
        if (lockupTxHex) {
            this.log('Using provided lockup transaction hex')
            lockupTx = Transaction.fromHex(lockupTxHex)
        } else {
            this.log('Fetching lockup transaction from Boltz')
            const lockupTxRes = await this.getLockupTransaction(swapId)
            if (!lockupTxRes.ok) {
                return { ok: false, error: `Failed to get lockup transaction: ${lockupTxRes.error}` }
            }
            lockupTx = Transaction.fromHex(lockupTxRes.data.hex)
        }
        this.log('Lockup transaction retrieved:', lockupTx.getId())

        // Check if swap has timed out
        if (currentHeight < timeoutBlockHeight) {
            return {
                ok: false,
                error: `Swap has not timed out yet. Current height: ${currentHeight}, timeout: ${timeoutBlockHeight}`
            }
        }
        this.log(`Swap has timed out. Current height: ${currentHeight}, timeout: ${timeoutBlockHeight}`)

        // Parse the private key
        const privateKey = ECPairFactory(ecc).fromPrivateKey(Buffer.from(privateKeyHex, 'hex'))

        // Construct the refund transaction (tries cooperative first, then falls back to uncooperative)
        const refundTxRes = await this.constructTaprootRefund(
            swapId,
            claimPublicKey,
            swapTree,
            timeoutBlockHeight,
            lockupTx,
            privateKey,
            refundAddress,
            feePerVbyte,
            true // Try cooperative first
        )

        if (!refundTxRes.ok) {
            return { ok: false, error: refundTxRes.error }
        }

        const cooperative = !refundTxRes.cooperativeError
        this.log(`Refund transaction constructed (${cooperative ? 'cooperative' : 'uncooperative'}):`, refundTxRes.transaction.getId())
        if (!cooperative) {
            return { ok: true, publish: { done: false, txHex: refundTxRes.transaction.toHex(), txId: refundTxRes.transaction.getId() } }
        }
        // Broadcast the refund transaction
        const broadcastRes = await this.broadcastRefundTransaction(refundTxRes.transaction)
        if (!broadcastRes.ok) {
            return { ok: false, error: `Failed to broadcast refund transaction: ${broadcastRes.error}` }
        }

        this.log('Refund transaction broadcasted successfully:', broadcastRes.txId)
        return { ok: true, publish: { done: true, txId: broadcastRes.txId } }
    }

    SubscribeToInvoiceSwap = (data: InvoiceSwapData, swapDone: (result: { ok: true } | { ok: false, error: string }) => void, waitingTx: () => void) => {
        this.log("subscribing to invoice swap", { id: data.createdResponse.id })
        const webSocket = new ws(`${this.wsUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [data.createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })
        let isDone = false
        const done = (failureReason?: string) => {
            isDone = true
            webSocket.close()
            if (failureReason) {
                swapDone({ ok: false, error: failureReason })
            } else {
                swapDone({ ok: true })
            }
        }
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
                await this.handleSwapInvoiceMessage(rawMsg, data, done, waitingTx)
            } catch (err: any) {
                this.log(ERROR, 'Error handling invoice WebSocket message', err.message)
                webSocket.close()
                return
            }
        });
        return () => {
            webSocket.close()
        }
    }

    handleSwapInvoiceMessage = async (rawMsg: ws.RawData, data: InvoiceSwapData, closeWebSocket: (failureReason?: string) => void, waitingTx: () => void) => {
        const msg = JSON.parse(rawMsg.toString('utf-8'));
        if (msg.event !== 'update') {
            return;
        }

        this.log('Got invoice WebSocket update');
        this.log(msg);
        switch (msg.args[0].status) {
            // "invoice.set" means Boltz is waiting for an onchain transaction to be sent
            case 'invoice.set':
                this.log('Waiting for onchain transaction');
                waitingTx()
                return;
            // Create a partial signature to allow Boltz to do a key path spend to claim the mainchain coins
            case 'transaction.claim.pending':
                await this.handleInvoiceClaimPending(data)
                return;

            case 'transaction.claimed':
                this.log('Invoice swap successful');
                closeWebSocket()
                return;
            case 'swap.expired':
            case 'transaction.lockupFailed':
            case 'invoice.failedToPay':
                closeWebSocket(`swap ${data.createdResponse.id} failed with status ${msg.args[0].status}`)
                return;
            default:
                this.log('Unknown swap invoice WebSocket message', msg)
                return;
        }

    }

    handleInvoiceClaimPending = async (data: InvoiceSwapData) => {
        this.log('Creating cooperative claim transaction');
        const { createdResponse, info } = data
        const { paymentHash, keys } = info
        // Get the information request to create a partial signature
        const url = `${this.httpUrl}/v2/swap/submarine/${createdResponse.id}/claim`
        const claimTxDetailsRes = await loggedGet<{ preimage: string, transactionHash: string, pubNonce: string }>(this.log, url)
        if (!claimTxDetailsRes.ok) {
            return claimTxDetailsRes
        }
        const claimTxDetails = claimTxDetailsRes.data
        // Verify that Boltz actually paid the invoice by comparing the preimage hash
        // of the invoice to the SHA256 hash of the preimage from the response
        const claimTxPreimageHash = createHash('sha256').update(Buffer.from(claimTxDetails.preimage, 'hex')).digest()
        const invoicePreimageHash = Buffer.from(paymentHash, 'hex')

        if (!claimTxPreimageHash.equals(invoicePreimageHash)) {
            this.log(ERROR, 'Boltz provided invalid preimage');
            return;
        }

        const boltzPublicKey = Buffer.from(createdResponse.claimPublicKey, 'hex')

        // Create a musig signing instance
        const musig = new Musig(await zkpInit(), keys, randomBytes(32), [
            boltzPublicKey,
            Buffer.from(keys.publicKey),
        ]);
        // Tweak that musig with the Taptree of the swap scripts
        TaprootUtils.tweakMusig(
            musig,
            SwapTreeSerializer.deserializeSwapTree(createdResponse.swapTree).tree,
        );

        // Aggregate the nonces
        musig.aggregateNonces([
            [boltzPublicKey, Buffer.from(claimTxDetails.pubNonce, 'hex')],
        ]);
        // Initialize the session to sign the transaction hash from the response
        musig.initializeSession(
            Buffer.from(claimTxDetails.transactionHash, 'hex'),
        );

        // Give our public nonce and the partial signature to Boltz
        const claimUrl = `${this.httpUrl}/v2/swap/submarine/${createdResponse.id}/claim`
        const claimReq = {
            pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
            partialSignature: Buffer.from(musig.signPartial()).toString('hex'),
        }
        const claimResponseRes = await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, claimUrl, claimReq)
        if (!claimResponseRes.ok) {
            return claimResponseRes
        }
        const claimResponse = claimResponseRes.data
        this.log('Claim response', claimResponse)
    }
}
