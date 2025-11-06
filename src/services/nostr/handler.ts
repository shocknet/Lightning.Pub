//import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, signEvent } from 'nostr-tools'
import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
import crypto from 'crypto'
import { SimplePool, Event, UnsignedEvent, finalizeEvent, Relay, nip44 } from 'nostr-tools'
import { ERROR, getLogger } from '../helpers/logger.js'
import { nip19 } from 'nostr-tools'
import { encrypt as encryptV1, decrypt as decryptV1, getSharedSecret as getConversationKeyV1 } from './nip44v1.js'
import { ProcessMetrics, ProcessMetricsCollector } from '../storage/tlv/processMetricsCollector.js'
import { Subscription } from 'nostr-tools/lib/types/abstract-relay.js';
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
    providerRelay: string
    maxEventContentLength: number
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
            handleNostrSettings(message.settings)
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
const handleNostrSettings = (settings: NostrSettings) => {
    if (subProcessHandler) {
        getLogger({ component: "nostrMiddleware" })("got new nostr setting, resetting nostr handler")
        subProcessHandler.Stop()
        initNostrHandler(settings)
        return
    }
    initNostrHandler(settings)
    new ProcessMetricsCollector((metrics) => {
        send({
            type: 'processMetrics',
            metrics
        })
    })
}
const initNostrHandler = (settings: NostrSettings) => {
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
const supportedKinds = [21000, 21001, 21002, 21003]
export default class Handler {
    pool = new SimplePool()
    settings: NostrSettings
    apps: Record<string, AppInfo> = {}
    clients: Record<string, ClientInfo> = {}
    eventCallback: (event: NostrEvent) => void
    log = getLogger({ component: "nostrMiddleware" })
    relay: Relay | null = null
    providerRelay: Relay | null = null
    sub: Subscription | null = null
    providerSub: Subscription | null = null
    stopped = false
    constructor(settings: NostrSettings, eventCallback: (event: NostrEvent) => void) {
        this.settings = settings
        this.log("connecting to relays:", settings.relays)
        this.log("provider relay:", settings.providerRelay)
        this.settings.apps.forEach(app => {
            this.log("appId:", app.appId, "pubkey:", app.publicKey, "nprofile:", nprofileEncode({ pubkey: app.publicKey, relays: settings.relays }))
        })
        this.settings.clients.forEach(client => {
            this.log("clientId:", client.clientId, "pubkey:", client.publicKey, "name:", client.name)
        })
        this.eventCallback = (e) => { if (!this.stopped) eventCallback(e) }
        this.settings.apps.forEach(app => {
            this.apps[app.publicKey] = app
        })
        this.settings.clients.forEach(client => {
            this.clients[client.publicKey] = client
        })
        this.ConnectLoop()
    }

    async ConnectLoop() {
        let failures = 0
        while (!this.stopped) {
            await this.ConnectPromise()
            const pow = Math.pow(2, failures)
            const delay = Math.min(pow, 900)
            this.log("relay connection failed, will try again in", delay, "seconds (failures:", failures, ")")
            await new Promise(resolve => setTimeout(resolve, delay * 1000))
            failures++
        }
        this.log("nostr handler stopped")
    }

    Stop() {
        this.stopped = true
        this.sub?.close()
        this.relay?.close()
        this.relay = null
        this.sub = null
        this.providerSub?.close()
        this.providerRelay?.close()
        this.providerRelay = null
        this.providerSub = null
    }

    async ConnectPromise() {
        return new Promise<void>(async (res) => {
            // Connect to main relay for apps
            this.relay = await this.GetRelay(this.settings.relays[0], "main")
            if (!this.relay) {
                res()
                return
            }
            this.sub = this.Subscribe(this.relay, 'app')

            // Connect to provider relay for clients
            this.providerRelay = await this.GetRelay(this.settings.providerRelay, "provider")
            if (this.providerRelay) {
                this.providerSub = this.Subscribe(this.providerRelay, 'client')
            }

            const onclose = () => {
                this.log("relay disconnected")
                this.sub?.close()
                if (this.relay) {
                    this.relay.onclose = null
                    this.relay.close()
                    this.relay = null
                }
                this.sub = null

                this.providerSub?.close()
                if (this.providerRelay) {
                    this.providerRelay.onclose = null
                    this.providerRelay.close()
                    this.providerRelay = null
                }
                this.providerSub = null
                res()
            }

            this.relay.onclose = onclose
            if (this.providerRelay) {
                this.providerRelay.onclose = onclose
            }
        })
    }

    async GetRelay(relayUrl: string, relayType: string): Promise<Relay | null> {
        try {
            this.log(`connecting to ${relayType} relay:`, relayUrl)
            const relay = await Relay.connect(relayUrl)
            if (!relay.connected) {
                throw new Error(`failed to connect to ${relayType} relay`)
            }
            this.log(`connected to ${relayType} relay:`, relayUrl)
            return relay
        } catch (err: any) {
            this.log(`failed to connect to ${relayType} relay`, relayUrl, err.message || err)
            return null
        }
    }

    Subscribe(relay: Relay, type: 'app' | 'client') {
        const ids = type === 'app' ? Object.keys(this.apps) : Object.keys(this.clients)
        this.log(`🔍 [NOSTR SUBSCRIPTION] Setting up ${type} subscription`, {
            since: Math.ceil(Date.now() / 1000),
            kinds: supportedKinds,
            listeningForPubkeys: ids
        })

        return relay.subscribe([
            {
                since: Math.ceil(Date.now() / 1000),
                kinds: supportedKinds,
                '#p': ids,
            }
        ], {
            oneose: () => {
                this.log(`up to date with ${type} nostr events`)
            },
            onevent: async (e) => {
                if (!supportedKinds.includes(e.kind) || !e.pubkey) {
                    return
                }
                const pubTags = e.tags.find(tags => tags && tags.length > 1 && tags[0] === 'p')
                if (!pubTags) {
                    return
                }
                const targetPub = pubTags[1]
                const app = this.apps[targetPub]
                if (app) {
                    await this.processEvent(e, app)
                    return
                }
                // Check if it's a client message
                const client = this.clients[targetPub]
                if (client) {
                    await this.processEvent(e, client)
                    return
                }
            }
        })
    }

    async processEvent(e: Event, app: AppInfo | ClientInfo) {
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
        const appId = 'appId' in app ? app.appId : app.clientId
        this.eventCallback({ id: eventId, content, pub: e.pubkey, appId, startAtNano, startAtMs, kind: e.kind })
    }

    async Send(initiator: SendInitiator, data: SendData, relays?: string[]) {
        try {
            const keys = this.GetSendKeys(initiator)
            const privateKey = Buffer.from(keys.privateKey, 'hex')
            const toSign = await this.handleSend(data, keys)
            await Promise.all(toSign.map(ue => this.sendEvent(ue, keys, initiator, relays)))
        } catch (e: any) {
            this.log(ERROR, "failed to send event", e.message || e)
            throw e
        }

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

    async sendEvent(event: UnsignedEvent, keys: { name: string, privateKey: string }, initiator: SendInitiator, relays?: string[]) {
        const signed = finalizeEvent(event, Buffer.from(keys.privateKey, 'hex'))
        let sent = false
        const log = getLogger({ appName: keys.name })

        // If relays explicitly provided, use those
        // Otherwise, use providerRelay for clients, regular relays for apps
        let targetRelays = relays
        if (!targetRelays) {
            targetRelays = initiator.type === 'client' ? [this.settings.providerRelay] : this.settings.relays
            log(`using ${initiator.type} relays:`, targetRelays)
        }

        await Promise.all(this.pool.publish(targetRelays, signed).map(async p => {
            try {
                await p
                sent = true
            } catch (e: any) {
                console.log(e)
                log(e)
            }
        }))
        if (!sent) {
            log("failed to send event to", targetRelays)
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