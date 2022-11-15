import 'dotenv/config' // TODO - test env
import { Buffer } from 'buffer'
import { generatePrivateKey, getPublicKey, relayPool } from 'nostr-tools'
//@ts-ignore
import { decrypt, encrypt } from 'nostr-tools/nip04.js'
import NostrHandler, { LoadNosrtSettingsFromEnv, NostrSettings } from './index.js'
const settings = LoadNosrtSettingsFromEnv(true)
const clientPool = relayPool()
const clientPrivateKey = generatePrivateKey()
const clientPublicKey = getPublicKey(Buffer.from(clientPrivateKey, "hex"))

settings.privateKey = generatePrivateKey()
settings.publicKey = getPublicKey(Buffer.from(settings.privateKey, "hex"))
settings.allowedPubs = [clientPublicKey]

const nostr = new NostrHandler(settings, async id => { console.log(id); return true })
clientPool.setPrivateKey(clientPrivateKey)
export const setup = () => {
    settings.relays.forEach(relay => {
        try {
            clientPool.addRelay(relay, { read: true, write: true })
        } catch (e) {
            console.error("cannot add relay:", relay)
        }
    });
}

export default async (d: (message: string, failure?: boolean) => void) => {
    const e = await clientPool.publish({
        content: encrypt(clientPrivateKey, settings.publicKey, "test"),
        created_at: Math.floor(Date.now() / 1000),
        kind: 4,
        pubkey: clientPublicKey,
        //@ts-ignore
        tags: [['p', settings.publicKey]]
    }, (status, url) => {
        console.log(status, url)
    })
    d("nostr ok")
}