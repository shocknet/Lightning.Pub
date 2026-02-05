import axios from 'axios';
import { Network } from 'bitcoinjs-lib';
// import bolt11 from 'bolt11';
import {
    Networks,
} from 'boltz-core';
import { PubLogger, ERROR } from '../../helpers/logger.js';
import { BTCNetwork } from '../../main/settings.js';


export const loggedPost = async <T>(log: PubLogger, url: string, req: any): Promise<{ ok: true, data: T } | { ok: false, error: string }> => {
    try {
        const { data } = await axios.post(url, req)
        return { ok: true, data: data as T }
    } catch (err: any) {
        if (err.response?.data) {
            log(ERROR, 'Error sending request', err.response.data)
            return { ok: false, error: JSON.stringify(err.response.data) }
        }
        log(ERROR, 'Error sending request', err.message)
        return { ok: false, error: err.message }
    }
}

export const loggedGet = async <T>(log: PubLogger, url: string): Promise<{ ok: true, data: T } | { ok: false, error: string }> => {
    try {
        const { data } = await axios.get(url)
        return { ok: true, data: data as T }
    } catch (err: any) {
        if (err.response?.data) {
            log(ERROR, 'Error getting request', err.response.data)
            return { ok: false, error: err.response.data }
        }
        log(ERROR, 'Error getting request', err.message)
        return { ok: false, error: err.message }
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