//import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, signEvent } from 'nostr-tools'
import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
import { SimplePool, Event, UnsignedEvent, getEventHash, finalizeEvent, Relay, nip44 } from 'nostr-tools'
//import { encryptData, decryptData, getSharedSecret, decodePayload, encodePayload, EncryptedData, nip44 } from 'nostr-tools'
import { ERROR, getLogger } from '../helpers/logger.js'
import { nip19 } from 'nostr-tools'
import { encrypt as encryptV1, decrypt as decryptV1, getSharedSecret as getConversationKeyV1 } from './nip44v1.js'
const { nprofileEncode } = nip19
const { v2 } = nip44
const { encrypt: encryptV2, decrypt: decryptV2, utils } = v2
const { getConversationKey: getConversationKeyV2 } = utils
const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
type AppInfo = { appId: string, publicKey: string, privateKey: string, name: string }
type ClientInfo = { clientId: string, publicKey: string, privateKey: string, name: string }
export type SendData = { type: "content", content: string, pub: string } | { type: "event", event: UnsignedEvent, encrypt?: { toPub: string } }
export type SendInitiator = { type: 'app', appId: string } | { type: 'client', clientId: string }
export type NostrSend = (initiator: SendInitiator, data: SendData, relays?: string[] | undefined) => void

export type NostrSettings = {
    apps: AppInfo[]
    relays: string[]
    clients: ClientInfo[]
}
export type NostrEvent = {
    id: string
    pub: string
    content: string
    appId: string
    startAtNano: string
    startAtMs: number
    kind: number
}

type SettingsRequest = {
    type: 'settings'
    settings: NostrSettings
}

type SendRequest = {
    type: 'send'
    initiator: SendInitiator
    data: SendData
    relays?: string[]
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
        process.send(message, undefined, undefined, err => {
            if (err) {
                getLogger({ component: "nostrMiddleware" })(ERROR, "failed to send message to parent process", err, "message:", message)
                process.exit(1)
            }
        })
    }
}
let subProcessHandler: Handler | undefined
process.on("message", (message: ChildProcessRequest) => {
    switch (message.type) {
        case 'settings':
            initSubprocessHandler(message.settings)
            break
        case 'send':
            sendToNostr(message.initiator, message.data, message.relays)
            break
        default:
            getLogger({ component: "nostrMiddleware" })(ERROR, "unknown nostr request", message)
            break
    }
})
const initSubprocessHandler = (settings: NostrSettings) => {
    if (subProcessHandler) {
        getLogger({ component: "nostrMiddleware" })(ERROR, "nostr settings ignored since handler already exists")
        return
    }
    subProcessHandler = new Handler(settings, event => {
        send({
            type: 'event',
            event: event
        })
    })
}
const sendToNostr: NostrSend = (initiator, data, relays) => {
    if (!subProcessHandler) {
        getLogger({ component: "nostrMiddleware" })(ERROR, "nostr was not initialized")
        return
    }
    subProcessHandler.Send(initiator, data, relays)
}
send({ type: 'ready' })
const supportedKinds = [21000, 21001, 21002]
export default class Handler {
    pool = new SimplePool()
    settings: NostrSettings
    apps: Record<string, AppInfo> = {}
    eventCallback: (event: NostrEvent) => void
    log = getLogger({ component: "nostrMiddleware" })
    constructor(settings: NostrSettings, eventCallback: (event: NostrEvent) => void) {
        this.settings = settings
        this.log("connecting to relays:", settings.relays)
        this.settings.apps.forEach(app => {
            this.log("appId:", app.appId, "pubkey:", app.publicKey, "nprofile:", nprofileEncode({ pubkey: app.publicKey, relays: settings.relays }))
        })
        this.eventCallback = eventCallback
        this.settings.apps.forEach(app => {
            this.apps[app.publicKey] = app
        })
        this.Connect()
    }

    async Connect() {
        const log = getLogger({})
        log("conneting to relay...", this.settings.relays[0])
        let relay: Relay | null = null
        //const relay = relayInit(this.settings.relays[0]) // TODO: create multiple conns for multiple relays
        try {
            relay = await Relay.connect(this.settings.relays[0])
            if (!relay.connected) {
                throw new Error("failed to connect to relay")
            }
        } catch (err) {
            log("failed to connect to relay, will try again in 2 seconds")
            setTimeout(() => {
                this.Connect()
            }, 2000)
            return
        }

        log("connected, subbing...")
        relay.onclose = (() => {
            log("relay disconnected, will try to reconnect")
            relay.close()
            this.Connect()
        })
        const sub = relay.subscribe([
            {
                since: Math.ceil(Date.now() / 1000),
                kinds: supportedKinds,
                '#p': Object.keys(this.apps),
            }
        ], {
            oneose: () => {
                log("up to date with nostr events")
            },
            onevent: async (e) => {
                if (!supportedKinds.includes(e.kind) || !e.pubkey) {
                    return
                }
                const pubTags = e.tags.find(tags => tags && tags.length > 1 && tags[0] === 'p')
                if (!pubTags) {
                    return
                }
                const app = this.apps[pubTags[1]]
                if (app) {
                    await this.processEvent(e, app)
                    return
                }
            }
        })
    }

    async processEvent(e: Event, app: AppInfo) {
        const eventId = e.id
        if (handledEvents.includes(eventId)) {
            this.log("event already handled")
            return
        }
        handledEvents.push(eventId)
        const startAtMs = Date.now()
        const startAtNano = process.hrtime.bigint().toString()
        let content = ""
        try {
            if (e.kind === 21000) {
                content = decryptV1(e.content, getConversationKeyV1(app.privateKey, e.pubkey))
            } else {
                content = decryptV2(e.content, getConversationKeyV2(Buffer.from(app.privateKey, 'hex'), e.pubkey))
            }
        } catch (e: any) {
            this.log(ERROR, "failed to decrypt event", e.message, e.content)
            return

        }
        this.eventCallback({ id: eventId, content, pub: e.pubkey, appId: app.appId, startAtNano, startAtMs, kind: e.kind })
    }

    async Send(initiator: SendInitiator, data: SendData, relays?: string[]) {
        const keys = this.GetSendKeys(initiator)
        const privateKey = Buffer.from(keys.privateKey, 'hex')
        let toSign: UnsignedEvent
        if (data.type === 'content') {
            let content: string
            try {
                content = encryptV1(data.content, getConversationKeyV1(keys.privateKey, data.pub))
            } catch (e: any) {
                this.log(ERROR, "failed to encrypt content", e.message, data.content)
                return
            }
            toSign = {
                content,
                created_at: Math.floor(Date.now() / 1000),
                kind: 21000,
                pubkey: keys.publicKey,
                tags: [['p', data.pub]],
            }
        } else {
            console.log(data)
            toSign = data.event
            if (data.encrypt) {
                try {
                    toSign.content = encryptV2(data.event.content, getConversationKeyV2(Buffer.from(keys.privateKey, 'hex'), data.encrypt.toPub))
                } catch (e: any) {
                    this.log(ERROR, "failed to encrypt content", e.message)
                    return
                }
            }
            if (!toSign.pubkey) {
                toSign.pubkey = keys.publicKey
            }
        }

        const signed = finalizeEvent(toSign, Buffer.from(keys.privateKey, 'hex'))
        let sent = false
        const log = getLogger({ appName: keys.name })
        await Promise.all(this.pool.publish(relays || this.settings.relays, signed).map(async p => {
            try {
                await p
                sent = true
            } catch (e: any) {
                console.log(e)
                log(e)
            }
        }))
        if (!sent) {
            log("failed to send event")
        }
    }

    GetSendKeys(initiator: SendInitiator) {
        if (initiator.type === 'app') {
            const { appId } = initiator
            const found = this.settings.apps.find((info: AppInfo) => info.appId === appId)
            if (!found) {
                throw new Error("unkown app")
            }
            return found
        } else if (initiator.type === 'client') {
            const { clientId } = initiator
            const found = this.settings.clients.find((info: ClientInfo) => info.clientId === clientId)
            if (!found) {
                throw new Error("unkown client")
            }
            return found
        }
        throw new Error("unkown initiator type")
    }
}