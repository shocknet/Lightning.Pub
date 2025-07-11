//import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, signEvent } from 'nostr-tools'
import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
import crypto from 'crypto'
import { SimplePool, Event, UnsignedEvent, finalizeEvent, Relay, nip44 } from 'nostr-tools'
import { ERROR, getLogger } from '../helpers/logger.js'
import { nip19 } from 'nostr-tools'
import { encrypt as encryptV1, decrypt as decryptV1, getSharedSecret as getConversationKeyV1 } from './nip44v1.js'
import { ProcessMetrics, ProcessMetricsCollector } from '../storage/tlv/processMetricsCollector.js'
import { EnvCanBeInteger, } from '../helpers/envParser.js'
const { nprofileEncode } = nip19
const { v2 } = nip44
const { encrypt: encryptV2, decrypt: decryptV2, utils } = v2
const { getConversationKey: getConversationKeyV2 } = utils
const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
type AppInfo = { appId: string, publicKey: string, privateKey: string, name: string }
type ClientInfo = { clientId: string, publicKey: string, privateKey: string, name: string }
type SendDataContent = { type: "content", content: string, pub: string }
type SendDataEvent = { type: "event", event: UnsignedEvent, encrypt?: { toPub: string } }
export type SendData = SendDataContent | SendDataEvent
export type SendInitiator = { type: 'app', appId: string } | { type: 'client', clientId: string }
export type NostrSend = (initiator: SendInitiator, data: SendData, relays?: string[] | undefined) => void

export type NostrSettings = {
    apps: AppInfo[]
    relays: string[]
    clients: ClientInfo[]
    maxEventContentLength: number
}

export type NostrRelaySettings = {
    relays: string[],
    maxEventContentLength: number
}

const getEnvOrDefault = (name: string, defaultValue: string): string => {
    return process.env[name] || defaultValue;
}

export const LoadNosrtRelaySettingsFromEnv = (test = false): NostrRelaySettings => {
    const relaysEnv = getEnvOrDefault("NOSTR_RELAYS", "wss://relay.lightning.pub");
    const maxEventContentLength = EnvCanBeInteger("NOSTR_MAX_EVENT_CONTENT_LENGTH", 40000)
    return {
        relays: relaysEnv.split(' '),
        maxEventContentLength
    }
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

type PingRequest = {
    type: 'ping'
}

type SendRequest = {
    type: 'send'
    initiator: SendInitiator
    data: SendData
    relays?: string[]
}

type PingResponse = {
    type: 'pong'
}

type ReadyResponse = {
    type: 'ready'
}
type EventResponse = {
    type: 'event'
    event: NostrEvent
}
type ProcessMetricsResponse = {
    type: 'processMetrics'
    metrics: ProcessMetrics
}

export type ChildProcessRequest = SettingsRequest | SendRequest | PingRequest
export type ChildProcessResponse = ReadyResponse | EventResponse | ProcessMetricsResponse | PingResponse
const send = (message: ChildProcessResponse) => {
    if (process.send) {
        process.send(message, undefined, undefined, err => {
            if (err) {
                getLogger({ component: "nostrMiddleware" })(ERROR, "failed to send message to parent process from nostr handler", err, "message:", message)
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
        case 'ping':
            send({ type: 'pong' })
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

    new ProcessMetricsCollector((metrics) => {
        send({
            type: 'processMetrics',
            metrics
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
const supportedKinds = [21000, 21001, 21002, 21003]
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
        const toSign = await this.handleSend(data, keys)
        await Promise.all(toSign.map(ue => this.sendEvent(ue, keys, relays)))
    }

    async handleSend(data: SendData, keys: { name: string, privateKey: string, publicKey: string }): Promise<UnsignedEvent[]> {
        if (data.type === 'content') {
            const parts = splitContent(data.content, this.settings.maxEventContentLength)
            if (parts.length > 1) {
                const shardsId = crypto.randomBytes(16).toString('hex')
                const totalShards = parts.length
                const ues = await Promise.all(parts.map((part, index) => this.handleSendDataContent({ ...data, content: JSON.stringify({ part, index, totalShards, shardsId }) }, keys)))
                return ues
            }
            return [await this.handleSendDataContent(data, keys)]
        }
        const ue = await this.handleSendDataEvent(data, keys)
        return [ue]
    }

    async handleSendDataContent(data: SendDataContent, keys: { name: string, privateKey: string, publicKey: string }): Promise<UnsignedEvent> {
        let content = encryptV1(data.content, getConversationKeyV1(keys.privateKey, data.pub))
        return {
            content,
            created_at: Math.floor(Date.now() / 1000),
            kind: 21000,
            pubkey: keys.publicKey,
            tags: [['p', data.pub]],
        }
    }

    async handleSendDataEvent(data: SendDataEvent, keys: { name: string, privateKey: string, publicKey: string }): Promise<UnsignedEvent> {
        const toSign = data.event
        if (data.encrypt) {
            toSign.content = encryptV2(data.event.content, getConversationKeyV2(Buffer.from(keys.privateKey, 'hex'), data.encrypt.toPub))
        }
        if (!toSign.pubkey) {
            toSign.pubkey = keys.publicKey
        }
        return toSign
    }

    async sendEvent(event: UnsignedEvent, keys: { name: string, privateKey: string }, relays?: string[]) {
        const signed = finalizeEvent(event, Buffer.from(keys.privateKey, 'hex'))
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
        } else {
            //log("sent event")
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

const splitContent = (content: string, maxLength: number) => {
    const parts = []
    for (let i = 0; i < content.length; i += maxLength) {
        parts.push(content.slice(i, i + maxLength))
    }
    return parts
}