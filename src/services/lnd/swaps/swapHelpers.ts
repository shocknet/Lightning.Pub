import axios from 'axios';
import { Network, Transaction } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Networks, OutputType, Scripts,
} from 'boltz-core';
import { PubLogger, ERROR } from '../../helpers/logger.js';
import { isNonNegativeIndex, isNonNegativeSats } from '../../helpers/sats.js';
import { BTCNetwork } from '../../main/settings.js';

/** Bound every provider HTTP call so a hung peer cannot stall refund/claim fallback. */
export const SWAP_PROVIDER_HTTP_TIMEOUT_MS = 10_000

export const caughtErrorMessage = (error: unknown): string => {
    if (typeof error === 'string' && error) {
        return error
    }
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
        return (error as { message: string }).message
    }
    return String(error)
}

export const loggedPost = async <T>(log: PubLogger, url: string, req: any, timeoutMs = SWAP_PROVIDER_HTTP_TIMEOUT_MS): Promise<{ ok: true, data: T } | { ok: false, error: string }> => {
    try {
        const { data } = await axios.post(url, req, { timeout: timeoutMs })
        return { ok: true, data: data as T }
    } catch (err: any) {
        if (err.response?.data) {
            log(ERROR, 'Error sending request', err.response.data)
            return { ok: false, error: JSON.stringify(err.response.data) }
        }
        log(ERROR, 'Error sending request', caughtErrorMessage(err))
        return { ok: false, error: caughtErrorMessage(err) }
    }
}

export const loggedGet = async <T>(log: PubLogger, url: string, timeoutMs = SWAP_PROVIDER_HTTP_TIMEOUT_MS): Promise<{ ok: true, data: T } | { ok: false, error: string }> => {
    try {
        const { data } = await axios.get(url, { timeout: timeoutMs })
        return { ok: true, data: data as T }
    } catch (err: any) {
        if (err.response?.data) {
            log(ERROR, 'Error getting request', err.response.data)
            return { ok: false, error: err.response.data }
        }
        log(ERROR, 'Error getting request', caughtErrorMessage(err))
        return { ok: false, error: caughtErrorMessage(err) }
    }
}

export const getNetwork = (network: BTCNetwork): Network => {
    switch (network) {
        case 'mainnet':
            return Networks.bitcoinMainnet
        case 'testnet':
            return Networks.bitcoinTestnet
        case 'regtest':
            return Networks.bitcoinRegtest
        default:
            throw new Error(`Invalid network: ${network}`)
    }
}

export type TaprootSwapOutput = {
    type: OutputType.Taproot
    vout: number
    value: number
    script: Buffer
}

/**
 * Locate the locally derived P2TR lockup output.
 * boltz-core detectSwap matches P2SH / P2SH-P2WSH / P2WSH / P2TR and returns
 * the first hit, so a full-value decoy can steal amount validation from a
 * later genuine Taproot output. Claim and refund construction must bind to
 * this exact script, type, value, and vout.
 */
export const findTaprootSwapOutput = (
    tweakedKey: Buffer,
    lockupTx: Transaction,
): TaprootSwapOutput | undefined => {
    const expectedScript = Scripts.p2trOutput(tweakedKey)
    for (let vout = 0; vout < lockupTx.outs.length; vout++) {
        const output = lockupTx.outs[vout]
        if (!expectedScript.equals(output.script) || !isNonNegativeSats(output.value)) {
            continue
        }
        return {
            type: OutputType.Taproot,
            vout,
            value: output.value,
            script: output.script,
        }
    }
    return undefined
}

/**
 * Bitcoin Core dust with the default 3 sat/vbyte dustRelayFee.
 * OP_RETURN / empty scripts are unspendable (limit 0) and are not valid claim
 * destinations; callers must reject them rather than treating 0 as "not dust".
 */
export const scriptDustLimit = (script: Buffer): number => {
    if (script.length === 0 || script[0] === 0x6a) {
        return 0
    }
    const outputSize = 8 + 1 + script.length
    const witnessProgram = script[0] === 0x00 || script[0] === 0x51
    const inputSize = witnessProgram
        ? 32 + 4 + 1 + Math.floor(107 / 4) + 4
        : 32 + 4 + 1 + 107 + 4
    return Math.ceil(3_000 * (outputSize + inputSize) / 1000)
}

export const isExactTaprootSwapOutput = (
    swapOutput: TaprootSwapOutput,
    lockupTx: Transaction,
    tweakedKey: Buffer,
): boolean => {
    const expectedScript = Scripts.p2trOutput(tweakedKey)
    if (swapOutput.type !== OutputType.Taproot || !isNonNegativeIndex(swapOutput.vout)) {
        return false
    }
    const indexed = lockupTx.outs[swapOutput.vout]
    return !!indexed
        && expectedScript.equals(swapOutput.script)
        && expectedScript.equals(indexed.script)
        && indexed.value === swapOutput.value
}