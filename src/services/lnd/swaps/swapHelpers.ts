import axios from 'axios';
import { Network } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Networks,
} from 'boltz-core';
import { PubLogger, ERROR } from '../../helpers/logger.js';
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