import { HDKey } from '@scure/bip32'

// LND derives its node identity key at m/1017'/coin'/6'/0/0 from the aezeed entropy.
// Coin type is 0 on mainnet and 1 on testnet/regtest/signet; both are returned because
// BTC_NETWORK is not a reliable signal of which network LND is actually on.
const LND_KEY_PURPOSE = 1017
const LND_NODE_KEY_FAMILY = 6
const LND_COIN_TYPES = [0, 1]

export const candidateNodePubkeys = (entropy: Uint8Array): string[] => {
    const root = HDKey.fromMasterSeed(entropy)
    return LND_COIN_TYPES.map(coin => {
        const key = root.derive(`m/${LND_KEY_PURPOSE}'/${coin}'/${LND_NODE_KEY_FAMILY}'/0/0`)
        if (!key.publicKey) {
            throw new Error("failed to derive node public key")
        }
        return Buffer.from(key.publicKey).toString('hex')
    })
}
