import zkpInit from '@vulpemventures/secp256k1-zkp';
import axios from 'axios';
import { crypto, initEccLib, Transaction, address, Network } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils, detectSwap,
    constructClaimTransaction, targetFee, OutputType
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../helpers/logger.js';
import SettingsManager from '../main/settingsManager.js';

type InvoiceSwapResponse = { id: string, claimPublicKey: string, swapTree: string }
type InvoiceSwapInfo = { paymentHash: string, keys: ECPairInterface }
type InvoiceSwapData = { createdResponse: InvoiceSwapResponse, info: InvoiceSwapInfo }

type TransactionSwapResponse = { id: string, refundPublicKey: string, swapTree: string }
type TransactionSwapInfo = { destinationAddress: string, network: Network, preimage: Buffer, keys: ECPairInterface, txHex: string }
type TransactionSwapData = { createdResponse: TransactionSwapResponse, info: TransactionSwapInfo }

export class Swaps {
    settings: SettingsManager
    log: PubLogger
    constructor(settings: SettingsManager) {
        this.settings = settings
        this.log = getLogger({ component: 'SwapsService' })
        initEccLib(ecc)
    }

    SwapInvoice = async (invoice: string, paymentHash: string) => {
        if (!this.settings.getSettings().swapsSettings.enableSwaps) {
            this.log(ERROR, 'Swaps are not enabled');
            return;
        }
        const keys = ECPairFactory(ecc).makeRandom()
        const refundPublicKey = Buffer.from(keys.publicKey).toString('hex')
        const req = { invoice, to: 'BTC', from: 'BTC', refundPublicKey }
        const url = `${this.settings.getSettings().swapsSettings.boltzHttpUrl}/v2/swap/submarine`
        this.log('Sending invoice swap request to', url);
        const createdResponse = await loggedPost<InvoiceSwapResponse>(this.log, url, req)
        if (!createdResponse) {
            return;
        }

        this.log('Created invoice swap');
        this.log(createdResponse);

        const webSocket = new ws(`${this.settings.getSettings().swapsSettings.boltzWebSocketUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })

        webSocket.on('message', async (rawMsg) => {
            try {
                await this.handleSwapInvoiceMessage(rawMsg, { createdResponse, info: { paymentHash, keys } }, () => webSocket.close())
            } catch (err: any) {
                this.log(ERROR, 'Error handling invoice WebSocket message', err.message)
                webSocket.close()
                return
            }
        });
    }

    handleSwapInvoiceMessage = async (rawMsg: ws.RawData, data: InvoiceSwapData, closeWebSocket: () => void) => {
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
                return;
            // Create a partial signature to allow Boltz to do a key path spend to claim the mainchain coins
            case 'transaction.claim.pending':
                await this.handleInvoiceClaimPending(data)
                return;

            case 'transaction.claimed':
                this.log('Invoice swap successful');
                closeWebSocket()
                return;
        }

    }

    handleInvoiceClaimPending = async (data: InvoiceSwapData) => {
        this.log('Creating cooperative claim transaction');
        const { createdResponse, info } = data
        const { paymentHash, keys } = info
        const { boltzHttpUrl } = this.settings.getSettings().swapsSettings
        // Get the information request to create a partial signature
        const url = `${boltzHttpUrl}/v2/swap/submarine/${createdResponse.id}/claim`
        const claimTxDetails = await loggedGet<{ preimage: string, transactionHash: string, pubNonce: string }>(this.log, url)
        if (!claimTxDetails) {
            return;
        }

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
        const claimUrl = `${boltzHttpUrl}/v2/swap/submarine/${createdResponse.id}/claim`
        const claimReq = {
            pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
            partialSignature: Buffer.from(musig.signPartial()).toString('hex'),
        }
        const claimResponse = await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, claimUrl, claimReq)
        if (!claimResponse) {
            return;
        }
        this.log('Claim response', claimResponse)
    }

    SwapTransaction = async (destinationAddress: string, invoiceAmount: number, network: Network) => {
        if (!this.settings.getSettings().swapsSettings.enableSwaps) {
            this.log(ERROR, 'Swaps are not enabled');
            return;
        }
        const preimage = randomBytes(32);
        const keys = ECPairFactory(ecc).makeRandom()
        const url = `${this.settings.getSettings().swapsSettings.boltzHttpUrl}/v2/swap/reverse`
        const req = {
            invoiceAmount,
            to: 'BTC',
            from: 'BTC',
            claimPublicKey: Buffer.from(keys.publicKey).toString('hex'),
            preimageHash: createHash('sha256').update(preimage).digest('hex'),
        }
        const createdResponse = await loggedPost<TransactionSwapResponse>(this.log, url, req)
        if (!createdResponse) {
            return;
        }
        this.log('Created transaction swap');
        this.log(createdResponse);

        const webSocket = new ws(`${this.settings.getSettings().swapsSettings.boltzWebSocketUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })

        webSocket.on('message', async (rawMsg) => {
            try {
                await this.handleSwapTransactionMessage(rawMsg, { createdResponse, info: { destinationAddress, network, preimage, keys, txHex: '' } }, () => webSocket.close())
            } catch (err: any) {
                this.log(ERROR, 'Error handling transaction WebSocket message', err.message)
                webSocket.close()
                return
            }
        })
    }

    handleSwapTransactionMessage = async (rawMsg: ws.RawData, data: TransactionSwapData, closeWebSocket: () => void) => {
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
                data.info.txHex = msg.args[0].transaction.hex
                await this.handleTransactionMempool(data)
                return
            case 'invoice.settled':
                this.log('Transaction swap successful');
                closeWebSocket()
                return;
        }
    }

    handleTransactionMempool = async (data: TransactionSwapData) => {
        this.log('Creating claim transaction');
        const { createdResponse, info } = data
        const { destinationAddress, network, keys, preimage, txHex } = info
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
            SwapTreeSerializer.deserializeSwapTree(createdResponse.swapTree).tree,
        );

        // Parse the lockup transaction and find the output relevant for the swap
        const lockupTx = Transaction.fromHex(txHex);
        const swapOutput = detectSwap(tweakedKey, lockupTx);
        if (swapOutput === undefined) {
            this.log(ERROR, 'No swap output found in lockup transaction');
            return;
        }

        // Create a claim transaction to be signed cooperatively via a key path spend
        const claimTx = targetFee(2, (fee) =>
            constructClaimTransaction(
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
                fee,
            ),
        );
        const { boltzHttpUrl } = this.settings.getSettings().swapsSettings
        // Get the partial signature from Boltz
        const claimUrl = `${boltzHttpUrl}/v2/swap/reverse/${createdResponse.id}/claim`
        const claimReq = {
            index: 0,
            transaction: claimTx.toHex(),
            preimage: preimage.toString('hex'),
            pubNonce: Buffer.from(musig.getPublicNonce()).toString('hex'),
        }
        const boltzSig = await loggedPost<{ pubNonce: string, partialSignature: string }>(this.log, claimUrl, claimReq)
        if (!boltzSig) {
            return;
        }

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
        const broadcastUrl = `${boltzHttpUrl}/v2/chain/BTC/transaction`
        const broadcastReq = {
            hex: claimTx.toHex(),
        }
        const broadcastResponse = await loggedPost(this.log, broadcastUrl, broadcastReq)
        if (!broadcastResponse) {
            return;
        }
        this.log('Transaction broadcasted', broadcastResponse)
    }
}

const loggedPost = async <T>(log: PubLogger, url: string, req: any): Promise<T | null> => {
    try {
        const { data } = await axios.post(url, req)
        return data as T
    } catch (err: any) {
        if (err.response?.data) {
            log(ERROR, 'Error sending request', err.response.data)
            return null
        }
        log(ERROR, 'Error sending request', err.message)
        return null
    }
}

const loggedGet = async <T>(log: PubLogger, url: string): Promise<T | null> => {
    try {
        const { data } = await axios.get(url)
        return data as T
    } catch (err: any) {
        if (err.response?.data) {
            log(ERROR, 'Error getting request', err.response.data)
            return null
        }
        log(ERROR, 'Error getting request', err.message)
        return null
    }
}