//import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, signEvent } from 'nostr-tools'
import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, finishEvent, relayInit } from './tools/index.js'
import { encryptData, decryptData, getSharedSecret, decodePayload, encodePayload } from './nip44.js'
import { getLogger } from '../helpers/logger.js'
import { encodeNprofile } from '../../custom-nip19.js'
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
    startAtNano: string
    startAtMs: number
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

const EVENT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL_SECONDS = 60
const handledEvents: { eventId: string, addedAtUnix: number }[] = []
const removeExpiredEvents = () => {
    const now = Date.now();
    for (let i = handledEvents.length - 1; i >= 0; i--) {
        if (now - handledEvents[i].addedAtUnix > EVENT_TTL_MS) {
            handledEvents.splice(i, 1);
        }
    }
}
setInterval(removeExpiredEvents, CLEANUP_INTERVAL_SECONDS * 1000);


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
            getLogger({ appName: "nostrMiddleware" })("ERROR", "unknown nostr request", message)
            break
    }
})
const initSubprocessHandler = (settings: NostrSettings) => {
    if (subProcessHandler) {
        getLogger({ appName: "nostrMiddleware" })("ERROR", "nostr settings ignored since handler already exists")
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
        getLogger({ appName: "nostrMiddleware" })("ERROR", "nostr was not initialized")
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
    log = getLogger({ appName: "nostrMiddleware" })
    constructor(settings: NostrSettings, eventCallback: (event: NostrEvent) => void) {
        this.settings = settings
        this.log(
            {
                ...settings,
                apps: settings.apps.map(app => {
                    const { privateKey, ...rest } = app;
                    return {
                        ...rest,
                        nprofile: encodeNprofile({ pubkey: rest.publicKey, relays: settings.relays })
                    }
                })
            }
        )
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
        try {
            await relay.connect()
        } catch (err) {
            log("failed to connect to relay, will try again in 2 seconds")
            setTimeout(() => {
                this.Connect()
            }, 2000)
            return
        }
        log("connected, subbing...")
        relay.on('disconnect', () => {
            log("relay disconnected, will try to reconnect")
            relay.close()
            this.Connect()
        })
        const sub = relay.sub([
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
						if (handledEvents.find(e => e.eventId === eventId)) {
                console.log("event already handled")
                return
            }
            handledEvents.push({eventId, addedAtUnix: Date.now()});
            const startAtMs = Date.now()
            const startAtNano = process.hrtime.bigint().toString()
            const decoded = decodePayload(e.content)
            const content = await decryptData(decoded, getSharedSecret(app.privateKey, e.pubkey))
            this.eventCallback({ id: eventId, content, pub: e.pubkey, appId: app.appId, startAtNano, startAtMs })
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
        let sent = false
        const log = getLogger({ appName: appInfo.name })
        await Promise.all(this.pool.publish(relays || this.settings.relays, signed).map(async p => {
            try {
                await p
                sent = true
            } catch (e: any) {
                log(e)
            }
        }))
        if (!sent) {
            log("failed to send event")
        }
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