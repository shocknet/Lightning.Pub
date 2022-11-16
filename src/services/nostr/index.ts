import { relayPool, Subscription, Event } from 'nostr-tools'
//@ts-ignore
import { decrypt, encrypt } from 'nostr-tools/nip04.js'
import { EnvMustBeNonEmptyString } from '../helpers/envParser.js';

export type NostrSettings = {
    privateKey: string
    publicKey: string
    relays: string[]
    allowedPubs: string[]
}
export const LoadNosrtSettingsFromEnv = (test = false): NostrSettings => {
    return {
        allowedPubs: EnvMustBeNonEmptyString("NOSTR_ALLOWED_PUBS").split(' '),
        privateKey: EnvMustBeNonEmptyString("NOSTR_PRIVATE_KEY"),
        publicKey: EnvMustBeNonEmptyString("NOSTR_PUBLIC_KEY"),
        relays: EnvMustBeNonEmptyString("NOSTR_RELAYS").split(' ')
    }
}
export default class {
    pool = relayPool()
    settings: NostrSettings
    sub: Subscription
    constructor(settings: NostrSettings, eventCallback: (event: Event, getContent: () => string) => void) {
        this.settings = settings
        this.pool.setPrivateKey(settings.privateKey)
        settings.relays.forEach(relay => {
            try {
                this.pool.addRelay(relay, { read: true, write: true })
            } catch (e) {
                console.error("cannot add relay:", relay)
            }
        });
        this.sub = this.pool.sub({
            //@ts-ignore
            filter: {
                since: Math.ceil(Date.now() / 1000),
                kinds: [4],
                '#p': [settings.publicKey],
            },
            cb: async (e, relay) => {
                if (e.kind !== 4 || !e.pubkey) {
                    return
                }
                eventCallback(e, () => {
                    return decrypt(this.settings.privateKey, e.pubkey, e.content)
                })
            }
        })
    }

    Send(nostrPub: string, message: string) {
        this.pool.publish({
            content: encrypt(this.settings.privateKey, nostrPub, message),
            created_at: Math.floor(Date.now() / 1000),
            kind: 4,
            pubkey: this.settings.publicKey,
            //@ts-ignore
            tags: [['p', nostrPub]]
        }, (status, url) => {
            console.log(status, url) // TODO
        })
    }
}