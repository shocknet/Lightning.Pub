import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp';
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule;
import { initEccLib, Transaction, address } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Musig, SwapTreeSerializer, TaprootUtils, detectSwap,
    constructClaimTransaction, OutputType, constructRefundTransaction
} from 'boltz-core';
import { randomBytes, createHash } from 'crypto';
import { ECPairFactory, ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import ws from 'ws';
import { getLogger, PubLogger, ERROR } from '../../helpers/logger.js';
import { BTCNetwork } from '../../main/settings.js';
import { loggedGet, loggedPost, getNetwork } from './swapHelpers.js';


type TransactionSwapFees = {
    percentage: number,
    minerFees: {
        claim: number,
        lockup: number,
    }
}

type TransactionSwapFeesRes = {
    BTC?: {
        BTC?: {
            fees: TransactionSwapFees
        }
    }
}


type TransactionSwapResponse = {
    id: string, refundPublicKey: string, swapTree: string,
    timeoutBlockHeight: number, lockupAddress: string, invoice: string,
    onchainAmount?: number
}
type TransactionSwapInfo = { destinationAddress: string, preimage: Buffer, keys: ECPairInterface, chainFee: number }
export type TransactionSwapData = { createdResponse: TransactionSwapResponse, info: TransactionSwapInfo }



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

    calculateFees = (fees: TransactionSwapFees, receiveAmount: number) => {
        const pct = fees.percentage / 100
        const minerFee = fees.minerFees.claim + fees.minerFees.lockup

        const preFee = receiveAmount + minerFee
        const fee = Math.ceil(preFee * pct)
        const total = preFee + fee
        return { total, fee, minerFee }
    }

    GetFees = async (): Promise<{ ok: true, fees: TransactionSwapFees, } | { ok: false, error: string }> => {
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
                const result = await this.handleSwapTransactionMessage(rawMsg, data, done)
                if (result) {
                    txId = result
                }
            } catch (err: any) {
                this.log(ERROR, 'Error handling transaction WebSocket message', err.message)
                isDone = true
                webSocket.close()
                swapDone({ ok: false, error: err.message })
                return
            }
        })
    }

    handleSwapTransactionMessage = async (rawMsg: ws.RawData, data: TransactionSwapData, done: (failureReason?: string) => void) => {
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
                return txIdRes.txId
            case 'invoice.settled':
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