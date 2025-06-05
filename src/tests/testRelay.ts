import { SimplePool, UnsignedEvent, finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools"
import { encrypt as encryptV1, decrypt as decryptV1, getSharedSecret as getConversationKeyV1 } from '../services/nostr/nip44v1.js'
import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
const pool = new SimplePool()

const relays = [
    "wss://strfry.shock.network"
]
const secretKey = generateSecretKey()
const publicKey = getPublicKey(secretKey)
const content = Array(1000).fill("A").join("")
console.log("content length", content.length)
const encrypted = encryptV1(content, getConversationKeyV1(Buffer.from(secretKey).toString('hex'), publicKey))
console.log("encrypted length", encrypted.length)
console.log("encrypted", encrypted)
const e: UnsignedEvent = {
    content: encrypted,
    created_at: Math.floor(Date.now() / 1000),
    kind: 21000,
    pubkey: publicKey,
    tags: [["p", publicKey]],
}
const signed = finalizeEvent(e, Buffer.from(secretKey))
Promise.all(pool.publish(relays, signed)).then(r => {
    console.log("sent", r)
}).catch(e => {
    console.error("error", e)
})