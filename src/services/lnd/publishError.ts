import { Transaction } from 'bitcoinjs-lib'

export type KnownTx = { txHash: string, numConfirmations?: number }

const sameTxId = (left: string, right: string): boolean =>
    left.toLowerCase() === right.toLowerCase()

const asError = (err: unknown): Error =>
    err instanceof Error ? err : new Error(String(err))

const isConfirmedKnownTx = (known: KnownTx | null, txId: string): boolean =>
    !!known && sameTxId(known.txHash, txId) && (known.numConfirmations ?? 0) > 0

/**
 * LND / bitcoind mempool-duplicate text. Used only after we submitted this hex
 * (txid is computed locally). WalletKit GetTransaction does not index a swap
 * claim that spends a foreign lockup to an external address, so a rebroadcast
 * of our own claim must still count as success.
 */
export const isAlreadyBroadcastError = (message: string): boolean => {
    const msg = message.toLowerCase()
    return msg.includes('already in') || msg.includes('already have') || msg.includes('txn-already')
}

/**
 * Publish via `publish`, then return the locally computed txid.
 *
 * LND reports broadcast failure in PublishResponse.publishError, not gRPC
 * status. A nonempty error or thrown RPC is still success when the tx is
 * confirmed on chain, or when the error is a mempool duplicate of the tx we
 * just submitted. Wallet history alone is not acceptance: an evicted or
 * policy-rejected tx can remain in GetTransaction with 0 confirmations.
 */
export const broadcastPublishedTx = async (
    txHex: string,
    publish: () => Promise<{ publishError?: string }>,
    lookupKnownTx: (txId: string) => Promise<KnownTx | null>,
): Promise<{ txId: string }> => {
    const txId = Transaction.fromHex(txHex).getId()

    let publishErr: unknown
    try {
        const res = await publish()
        if (!res.publishError) {
            return { txId }
        }
        publishErr = new Error(res.publishError)
    } catch (err) {
        publishErr = err
    }

    let known: KnownTx | null = null
    try {
        known = await lookupKnownTx(txId)
    } catch {
        known = null
    }
    if (isConfirmedKnownTx(known, txId)) {
        return { txId }
    }
    if (isAlreadyBroadcastError(asError(publishErr).message)) {
        return { txId }
    }
    throw asError(publishErr)
}
