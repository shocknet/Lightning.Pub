import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
import crypto from 'crypto'
import { SimplePool, Event, UnsignedEvent, finalizeEvent, Relay, nip44, Filter } from 'nostr-tools'
import { ERROR, getLogger, PubLogger } from '../helpers/logger.js'
import { nip19 } from 'nostr-tools'
import { encrypt as encryptV1, decrypt as decryptV1, getSharedSecret as getConversationKeyV1 } from './nip44v1.js'
import { Subscription } from 'nostr-tools/lib/types/abstract-relay.js';
import { RelayConnection, RelaySettings } from './nostrRelayConnection.js'
const { nprofileEncode } = nip19
const { v2 } = nip44
const { encrypt: encryptV2, decrypt: decryptV2, utils } = v2
const { getConversationKey: getConversationKeyV2 } = utils
// const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
export type SendDataContent = { type: "content", content: string, pub: string }
export type SendDataEvent = { type: "event", event: UnsignedEvent, encrypt?: { toPub: string } }
export type SendData = SendDataContent | SendDataEvent
export type SendInitiator = { type: 'app', appId: string } | { type: 'client', clientId: string }
export type NostrSend = (initiator: SendInitiator, data: SendData, relays?: string[] | undefined) => void

export type LinkedProviderInfo = { pubkey: string, clientId: string, relayUrl: string }
export type AppInfo = { appId: string, publicKey: string, privateKey: string, name: string, provider?: LinkedProviderInfo }
// export type ClientInfo = { clientId: string, publicKey: string, privateKey: string, name: string }
export type NostrSettings = {
    apps: AppInfo[]
    relays: string[]
    // clients: ClientInfo[]
    maxEventContentLength: number
    // providerDestinationPub: string
}

export type NostrEvent = {
    id: string
    pub: string
    content: string
    appId: string
    startAtNano: string
    startAtMs: number
    kind: number
    relayConstraint?: 'service' | 'provider'
}
type RelayEvent = { type: 'event', event: NostrEvent } | { type: 'beacon', content: string, pub: string }
type RelayEventCallback = (event: RelayEvent) => void
const splitContent = (content: string, maxLength: number) => {
    const parts = []
    for (let i = 0; i < content.length; i += maxLength) {
        parts.push(content.slice(i, i + maxLength))
    }
    return parts
}
const actionKinds = [21000, 21001, 21002, 21003]
const beaconKind = 30078
const appTag = "Lightning.Pub"
export class NostrPool {
    relays: Record<string, RelayConnection> = {}
    apps: Record<string /* app pubKey */, AppInfo> = {}
    maxEventContentLength: number
    // providerDestinationPub: string | undefined
    eventCallback: RelayEventCallback
    log = getLogger({ component: "nostrMiddleware" })
    handledEvents: Map<string, { handledAt: number }> = new Map()  // add expiration handler
    providerInfo: (LinkedProviderInfo & { appPub: string }) | undefined = undefined
    cleanupInterval: NodeJS.Timeout | undefined = undefined
    constructor(eventCallback: RelayEventCallback) {
        this.eventCallback = eventCallback
    }

    StartCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            this.handledEvents.forEach((value, key) => {
                if (Date.now() - value.handledAt > 1000 * 60 * 60 * 2) {
                    this.handledEvents.delete(key)
                }
            })
        }, 1000 * 60 * 60 * 1)
    }

    UpdateSettings(settings: NostrSettings) {
        Object.values(this.relays).forEach(relay => relay.Stop())
        settings.apps.forEach(app => {
            this.log("appId:", app.appId, "pubkey:", app.publicKey, "nprofile:", nprofileEncode({ pubkey: app.publicKey, relays: settings.relays }))
        })
        this.maxEventContentLength = settings.maxEventContentLength
        const { apps, rSettings, providerInfo } = processApps(settings)
        this.providerInfo = providerInfo
        this.apps = apps
        this.relays = {}
        for (const r of rSettings) {
            this.relays[r.relayUrl] = new RelayConnection(r, (e, r) => this.onEvent(e, r))
        }

    }

    private onEvent = (e: Event, relay: RelayConnection) => {
        const validated = this.validateEvent(e, relay)
        if (!validated || this.handledEvents.has(e.id)) {
            return
        }
        this.handledEvents.set(e.id, { handledAt: Date.now() })
        if (validated.type === 'beacon') {
            this.eventCallback({ type: 'beacon', content: e.content, pub: validated.pub })
            return
        }
        const { app } = validated

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
        const relayConstraint = relay.getConstraint()
        const nostrEvent: NostrEvent = { id: e.id, content, pub: e.pubkey, appId: app.appId, startAtNano, startAtMs, kind: e.kind, relayConstraint }
        this.eventCallback({ type: 'event', event: nostrEvent })
    }

    private validateEvent(e: Event, relay: RelayConnection): { type: 'event', pub: string, app: AppInfo } | { type: 'beacon', content: string, pub: string } | null {
        if (e.kind === 30078 && this.providerInfo && e.pubkey === this.providerInfo.pubkey) {
            // Accept beacons from provider relay (which may also be a service relay)
            if (relay.isProviderRelay()) {
                return { type: 'beacon', content: e.content, pub: e.pubkey }
            }
        }
        if (!actionKinds.includes(e.kind) || !e.pubkey) {
            return null
        }
        const pubTags = e.tags.find(tags => tags && tags.length > 1 && tags[0] === 'p')
        if (!pubTags) {
            return null
        }
        const app = this.apps[pubTags[1]]
        if (!app) {
            return null
        }
        return { type: 'event', pub: e.pubkey, app }
    }

    async Send(initiator: SendInitiator, data: SendData, relays?: string[]) {
        try {
            const keys = this.getSendKeys(initiator)
            const r = this.getRelays(initiator, relays)
            const privateKey = Buffer.from(keys.privateKey, 'hex')
            const toSign = await this.handleSend(data, keys)
            await Promise.all(toSign.map(ue => this.sendEvent(ue, keys, r)))
        } catch (e: any) {
            this.log(ERROR, "failed to send event", e.message || e)
            throw e
        }
    }

    private async handleSend(data: SendData, keys: { name: string, privateKey: string, publicKey: string }): Promise<UnsignedEvent[]> {
        if (data.type === 'content') {
            const parts = splitContent(data.content, this.maxEventContentLength)
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

    private async handleSendDataContent(data: SendDataContent, keys: { name: string, privateKey: string, publicKey: string }): Promise<UnsignedEvent> {
        let content = encryptV1(data.content, getConversationKeyV1(keys.privateKey, data.pub))
        return {
            content,
            created_at: Math.floor(Date.now() / 1000),
            kind: 21000,
            pubkey: keys.publicKey,
            tags: [['p', data.pub]],
        }
    }

    private async handleSendDataEvent(data: SendDataEvent, keys: { name: string, privateKey: string, publicKey: string }): Promise<UnsignedEvent> {
        const toSign = data.event
        if (data.encrypt) {
            toSign.content = encryptV2(data.event.content, getConversationKeyV2(Buffer.from(keys.privateKey, 'hex'), data.encrypt.toPub))
        }
        if (!toSign.pubkey) {
            toSign.pubkey = keys.publicKey
        }
        return toSign
    }
    private getServiceRelays() {
        return Object.values(this.relays).filter(r => r.isServiceRelay()).map(r => r.GetUrl())
    }

    private getProviderRelays() {
        return Object.values(this.relays).filter(r => r.isProviderRelay()).map(r => r.GetUrl())
    }

    private async sendEvent(event: UnsignedEvent, keys: { name: string, privateKey: string }, relays: string[]) {
        const signed = finalizeEvent(event, Buffer.from(keys.privateKey, 'hex'))
        let sent = false
        const log = getLogger({ appName: keys.name })
        // const r = relays ? relays : this.getServiceRelays()
        const pool = new SimplePool()
        await Promise.all(pool.publish(relays, signed).map(async p => {
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

    private getRelays(initiator: SendInitiator, requestRelays?: string[]) {
        if (requestRelays) {
            return requestRelays
        }
        if (initiator.type === 'app') {
            return this.getServiceRelays()
        } else if (initiator.type === 'client') {
            return this.getProviderRelays()
        }
        throw new Error("unkown initiator type")
    }

    private getSendKeys(initiator: SendInitiator) {
        if (initiator.type === 'app') {
            const { appId } = initiator
            const found = Object.values(this.apps).find((info: AppInfo) => info.appId === appId)
            if (!found) {
                throw new Error("unkown app")
            }
            return { name: found.name, publicKey: found.publicKey, privateKey: found.privateKey }
        } else if (initiator.type === 'client') {
            const { clientId } = initiator
            const providerApp = this.apps[this.providerInfo?.appPub || ""]
            if (this.providerInfo && this.providerInfo.clientId === clientId && providerApp) {
                return { name: providerApp.name, publicKey: providerApp.publicKey, privateKey: providerApp.privateKey }
            }
            throw new Error("unkown client")
        }
        throw new Error("unkown initiator type")
    }
}

const processApps = (settings: NostrSettings) => {
    const apps: Record<string, AppInfo> = {}
    let providerInfo: (LinkedProviderInfo & { appPub: string }) | undefined = undefined

    for (const app of settings.apps) {
        apps[app.publicKey] = app
        // add provider info if the app has a provider
        if (app.provider) {
            // make sure only one provider is configured
            if (providerInfo) {
                throw new Error("found more than one provider")
            }
            providerInfo = { ...app.provider, appPub: app.publicKey }
        }
    }
    let providerAssigned = false
    const rSettings: RelaySettings[] = []
    new Set(settings.relays).forEach(r => {
        const filters = [getServiceFilter(apps)]
        // check if this service relay is also a provider relay, and add the beacon filter if so
        if (providerInfo && providerInfo.relayUrl === r) {
            providerAssigned = true
            filters.push(getBeaconFilter(providerInfo.pubkey))
        }
        // add the relay settings to the list
        rSettings.push({
            relayUrl: r,
            serviceRelay: true,
            providerRelay: r === providerInfo?.relayUrl,
            filters: filters,
        })
    })
    // if no provider was assigned to a service relay, add the provider relay settings with a provider filter
    if (!providerAssigned && providerInfo) {
        rSettings.push({
            relayUrl: providerInfo.relayUrl,
            providerRelay: true,
            serviceRelay: false,
            filters: [
                getProviderFilter(providerInfo.appPub, providerInfo.pubkey),
                getBeaconFilter(providerInfo.pubkey),
            ],
        })
    }
    return { apps, rSettings, providerInfo }
}

const getServiceFilter = (apps: Record<string, AppInfo>): Filter => {
    return {
        since: Math.ceil(Date.now() / 1000),
        kinds: actionKinds,
        '#p': Object.keys(apps),
    }
}

const getProviderFilter = (appPub: string, providerPub: string): Filter => {
    return {
        since: Math.ceil(Date.now() / 1000),
        kinds: actionKinds,
        '#p': [appPub],
        authors: [providerPub]
    }
}

const getBeaconFilter = (providerPub: string): Filter => {
    return {
        kinds: [beaconKind], '#d': [appTag],
        authors: [providerPub]
    }
}
