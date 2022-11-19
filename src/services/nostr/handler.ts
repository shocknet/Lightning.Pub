import { relayPool, Subscription, Event } from 'nostr-tools'
//@ts-ignore
import { decrypt, encrypt } from 'nostr-tools/nip04.js'
const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
export type NostrSettings = {
    privateKey: string
    publicKey: string
    relays: string[]
    allowedPubs: string[]
}
export type NostrEvent = {
    id: string
    pub: string
    content: string
}
type SettingsRequest = {
    type: 'settings'
    settings: NostrSettings
}

type SendRequest = {
    type: 'send'
    pub: string
    message: string
}
type ReadyResponse = {
    type: 'ready'
}
type EventResponse = {
    type: 'event'
    event: NostrEvent
}

export type ChildProcessRequest = SettingsRequest | SendRequest
export type ChildProcessResponse = ReadyResponse | EventResponse
const send = (message: ChildProcessResponse) => {
    if (process.send) {
        process.send(message)
    }
}
let subProcessHandler: Handler | undefined
process.on("message", (message: ChildProcessRequest) => {
    switch (message.type) {
        case 'settings':
            initSubprocessHandler(message.settings)
            break
        case 'send':
            sendToNostr(message.pub, message.message)
        default:
            console.error("unknown nostr request", message)
            break
    }
})
const initSubprocessHandler = (settings: NostrSettings) => {
    if (subProcessHandler) {
        console.error("nostr settings ignored since handler already exists")
        return
    }
    subProcessHandler = new Handler(settings, event => {
        send({
            type: 'event',
            event: event
        })
    })
}
const sendToNostr = (pub: string, message: string) => {
    if (!subProcessHandler) {
        console.error("nostr was not initialized")
        return
    }
    subProcessHandler.Send(pub, message)
}
send({ type: 'ready' })

export default class Handler {
    pool = relayPool()
    settings: NostrSettings
    sub: Subscription
    constructor(settings: NostrSettings, eventCallback: (event: NostrEvent) => void) {
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
                //@ts-ignore
                const eventId = e.id as string
                if (handledEvents.includes(eventId)) {
                    console.log("event already handled")
                    return
                }
                handledEvents.push(eventId)
                eventCallback({ id: eventId, content: decrypt(this.settings.privateKey, e.pubkey, e.content), pub: e.pubkey })
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