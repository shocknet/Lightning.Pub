//import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, signEvent } from 'nostr-tools'
import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, finishEvent, relayInit } from './tools/index.js'
import { encryptData, decryptData, getSharedSecret, decodePayload, encodePayload } from './nip44.js'
import { getLogger } from '../helpers/logger.js'
const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
type AppInfo = { appId: string, publicKey: string, privateKey: string, name: string }
export type SendData = { type: "content", content: string, pub: string } | { type: "event", event: UnsignedEvent }
export type NostrSend = (appId: string, data: SendData, relays?: string[] | undefined) => void

export type NostrSettings = {
    apps: AppInfo[]
    relays: string[]
}
export type NostrEvent = {
    id: string
    pub: string
    content: string
    appId: string
}
type SettingsRequest = {
    type: 'settings'
    settings: NostrSettings
}

type SendRequest = {
    type: 'send'
    appId: string
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
            sendToNostr(message.appId, message.data, message.relays)
            break
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
const sendToNostr: NostrSend = (appId, data, relays) => {
    if (!subProcessHandler) {
        console.error("nostr was not initialized")
        return
    }
    subProcessHandler.Send(appId, data, relays)
}
send({ type: 'ready' })

export default class Handler {
    pool = new SimplePool()
    settings: NostrSettings
    subs: Sub[] = []
    apps: Record<string, AppInfo> = {}
    eventCallback: (event: NostrEvent) => void
    constructor(settings: NostrSettings, eventCallback: (event: NostrEvent) => void) {
        this.settings = settings
        console.log(settings)
        this.eventCallback = eventCallback
        this.settings.apps.forEach(app => {
            this.apps[app.publicKey] = app
        })
        this.Connect()
    }

    async Connect() {
        const log = getLogger({})
        log("conneting to relay...", this.settings.relays[0])
        const relay = relayInit(this.settings.relays[0]) // TODO: create multiple conns for multiple relays
        await relay.connect()
        log("connected, subbing...")
        relay.on('disconnect', () => {
            log("relay disconnected, will try to reconnect")
            relay.close()
            this.Connect()
        })
        const sub = s.sub([
            {
                since: Math.ceil(Date.now() / 1000),
                kinds: [21000],
                '#p': Object.keys(this.apps),
            }
        ])
        sub.on('eose', () => {
            log("up to date with nostr events")
        })
        sub.on('event', async (e) => {
            if (e.kind !== 21000 || !e.pubkey) {
                return
            }
            const pubTags = e.tags.find(tags => tags && tags.length > 1 && tags[0] === 'p')
            if (!pubTags) {
                return
            }
            const app = this.apps[pubTags[1]]
            if (!app) {
                return
            }
            const eventId = e.id
            if (handledEvents.includes(eventId)) {
                console.log("event already handled")
                return
            }
            handledEvents.push(eventId)
            const decoded = decodePayload(e.content)
            const content = await decryptData(decoded, getSharedSecret(app.privateKey, e.pubkey))
            this.eventCallback({ id: eventId, content, pub: e.pubkey, appId: app.appId })
        })


    }

    async Send(appId: string, data: SendData, relays?: string[]) {
        const appInfo = this.GetAppKeys({ appId })
        let toSign: UnsignedEvent
        if (data.type === 'content') {
            const decoded = await encryptData(data.content, getSharedSecret(appInfo.privateKey, data.pub))
            const content = encodePayload(decoded)
            toSign = {
                content,
                created_at: Math.floor(Date.now() / 1000),
                kind: 21000,
                pubkey: appInfo.publicKey,
                tags: [['p', data.pub]],
            }
        } else {
            toSign = data.event
        }

        const signed = finishEvent(toSign, appInfo.privateKey)
        this.pool.publish(relays || this.settings.relays, signed).forEach(p => {
            p.then(() => console.log("sent ok"))
            p.catch(() => console.log("failed to send"))
        })
    }

    GetAppKeys(appInfo: Partial<AppInfo>) {
        let check: (info: AppInfo) => boolean
        if (appInfo.appId) {
            check = (info: AppInfo) => info.appId === appInfo.appId
        } else if (appInfo.privateKey) {
            check = (info: AppInfo) => info.privateKey === appInfo.privateKey
        } else if (appInfo.publicKey) {
            check = (info: AppInfo) => info.publicKey === appInfo.publicKey
        } else {
            throw new Error("app info is empty")
        }
        const found = this.settings.apps.find(check)
        if (!found) {
            throw new Error("unkown app")
        }
        return found
    }
}