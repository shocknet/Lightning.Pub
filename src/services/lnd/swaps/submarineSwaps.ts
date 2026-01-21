import zkpInit from '@vulpemventures/secp256k1-zkp';
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { loggedGet, loggedPost } from './swapHelpers.js';
import { BTCNetwork } from '../../main/settings.js';

type InvoiceSwapResponse = { id: string, claimPublicKey: string, swapTree: string }
type InvoiceSwapInfo = { paymentHash: string, keys: ECPairInterface }
type InvoiceSwapData = { createdResponse: InvoiceSwapResponse, info: InvoiceSwapInfo }


export class SubmarineSwaps {
    private httpUrl: string
    private wsUrl: string
    log: PubLogger
    constructor({ httpUrl, wsUrl }: { httpUrl: string, wsUrl: string, network: BTCNetwork }) {
        this.httpUrl = httpUrl
        this.wsUrl = wsUrl
        this.log = getLogger({ component: 'SubmarineSwaps' })
    }

    getHttpUrl = () => {
        return this.httpUrl
    }
    getWsUrl = () => {
        return this.wsUrl
    }

    SwapInvoice = async (invoice: string, paymentHash: string) => {
        const keys = ECPairFactory(ecc).makeRandom()
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


    }

    SubscribeToInvoiceSwap = async (data: InvoiceSwapData, swapDone: (result: { ok: true, txId: string } | { ok: false, error: string }) => void) => {
        const webSocket = new ws(`${this.wsUrl}/v2/ws`)
        const subReq = { op: 'subscribe', channel: 'swap.update', args: [data.createdResponse.id] }
        webSocket.on('open', () => {
            webSocket.send(JSON.stringify(subReq))
        })
        let txId = "", isDone = false
        const done = () => {
            isDone = true
            webSocket.close()
            swapDone({ ok: true, txId })
        }
        webSocket.on('error', (err) => {
            this.log(ERROR, 'Error in WebSocket', err.message)
        })
        webSocket.on('close', () => {
            if (!isDone) {
                this.log(ERROR, 'WebSocket closed before swap was done');
                swapDone({ ok: false, error: 'WebSocket closed before swap was done' })
            }
        })
        webSocket.on('message', async (rawMsg) => {
            try {
                await this.handleSwapInvoiceMessage(rawMsg, data, done)
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
