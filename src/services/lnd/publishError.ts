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

/** Core reports the minimum in its explicit mempool and replacement fee rejects. */
export const rejectedClaimFeeFloor = (err: unknown, currentFee: number): number | undefined => {
    const match = /\b(mempool min fee not met|min relay fee not met|not enough additional fees to relay|less fees than conflicting txs)[,;:]?\s+(\d+(?:\.\d+)?)\s*<\s*(\d+(?:\.\d+)?)/i
        .exec(asError(err).message)
    if (!match) {
        return undefined
    }
    const [, reason, paidText, minimumText] = match
    // Older Core versions format replacement-policy amounts in BTC.
    const satoshis = (value: string) => value.includes('.') ? Math.round(Number(value) * 100_000_000) : Number(value)
    const paid = satoshis(paidText)
    const minimum = satoshis(minimumText)
    if (!Number.isSafeInteger(paid) || !Number.isSafeInteger(minimum) || minimum <= paid) {
        return undefined
    }
    switch (reason.toLowerCase()) {
        case 'not enough additional fees to relay':
            return currentFee + minimum - paid
        case 'less fees than conflicting txs':
            return minimum + 1
        default:
            return minimum
    }
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
