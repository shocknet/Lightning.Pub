import { generatePrivateKey, getPublicKey } from 'nostr-tools'
const p = generatePrivateKey()
console.log({
    privateKey: p,
    publicKey: getPublicKey(Buffer.from(p, 'hex'))
})
