//import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, signEvent } from 'nostr-tools'
import { SimplePool, Sub, Event, UnsignedEvent, getEventHash, finishEvent, relayInit } from './tools/index.js'
import { encryptData, decryptData, getSharedSecret, decodePayload, encodePayload } from './nip44.js'
const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
type AppInfo = { appId: string, publicKey: string, privateKey: string, name: string }
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
            sendToNostr(message.appId, message.pub, message.message)
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
const sendToNostr = (appId: string, pub: string, message: string) => {
    if (!subProcessHandler) {
        console.error("nostr was not initialized")
        return
    }
    subProcessHandler.Send(appId, pub, message)
}
send({ type: 'ready' })

export default class Handler {
    pool = new SimplePool()
    settings: NostrSettings
    subs: Sub[] = []
    constructor(settings: NostrSettings, eventCallback: (event: NostrEvent) => void) {
        this.settings = settings
        console.log(settings)
        this.settings.apps.forEach(app => {
            this.SubForApp(app, eventCallback)
        })
    }

    async SubForApp(appInfo: AppInfo, eventCallback: (event: NostrEvent) => void) {
        const relay = relayInit(this.settings.relays[0])
        relay.on('connect', () => {
            console.log(`connected to ${relay.url}`)
        })
        relay.on('error', () => {
            console.log(`failed to connect to ${relay.url}`)
        })

        await relay.connect()
        console.log("relay connected")
        const sub = relay.sub([
            {
                since: Math.ceil(Date.now() / 1000),
                kinds: [4],
                '#p': [appInfo.publicKey],
            }
        ])
        sub.on("event", async (e) => {
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
            const decoded = decodePayload(e.content)
            const content = await decryptData(decoded, getSharedSecret(appInfo.privateKey, e.pubkey))
            eventCallback({ id: eventId, content, pub: e.pubkey, appId: appInfo.appId })
            //eventCallback({ id: eventId, content: await nip04.decrypt(appInfo.privateKey, e.pubkey, e.content), pub: e.pubkey, appId: appInfo.appId })
        })
        this.subs.push(sub)
    }

    async Send(appId: string, pubKey: string, message: string) {
        const appInfo = this.GetAppKeys({ appId })
        const decoded = await encryptData(message, getSharedSecret(appInfo.privateKey, pubKey))
        const content = encodePayload(decoded)
        const event: UnsignedEvent = {
            content,
            created_at: Math.floor(Date.now() / 1000),
            kind: 4,
            pubkey: appInfo.publicKey,
            tags: [['p', pubKey]],
        }
        const signed = finishEvent(event, appInfo.privateKey)
        this.pool.publish(this.settings.relays, signed).forEach(p => {
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