import { relayPool, Subscription } from 'nostr-tools'
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
    shouldHandleEvent: (eventId: string) => Promise<boolean>
    pool = relayPool()
    settings: NostrSettings
    sub: Subscription
    constructor(settings: NostrSettings, shouldHandleCb: (eventId: string) => Promise<boolean>) {
        this.settings = settings
        this.shouldHandleEvent = shouldHandleCb
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
                kinds: [4],
                '#p': [settings.publicKey],
                authors: settings.allowedPubs,
            },
            cb: async (event, relay) => {
                console.log(decrypt(this.settings.privateKey, event.pubkey, event.content))
            }
        })
    }
}