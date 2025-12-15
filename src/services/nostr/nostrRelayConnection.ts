import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
import { Event, UnsignedEvent, Relay, Filter } from 'nostr-tools'
import { ERROR, getLogger, PubLogger } from '../helpers/logger.js'
import { Subscription } from 'nostr-tools/lib/types/abstract-relay.js';
// const handledEvents: string[] = [] // TODO: - big memory leak here, add TTL
/* export type SendDataContent = { type: "content", content: string, pub: string }
export type SendDataEvent = { type: "event", event: UnsignedEvent, encrypt?: { toPub: string } }
export type SendData = SendDataContent | SendDataEvent
export type SendInitiator = { type: 'app', appId: string } | { type: 'client', clientId: string }
export type NostrSend = (initiator: SendInitiator, data: SendData, relays?: string[] | undefined) => void */

/* export type LinkedProviderInfo = { pubDestination: string, clientId: string, relayUrl: string }
export type AppInfo = { appId: string, publicKey: string, privateKey: string, name: string, provider?: LinkedProviderInfo } */
// export type ClientInfo = { clientId: string, publicKey: string, privateKey: string, name: string }
/* export type NostrSettings = {
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
} */

type RelayCallback = (event: Event, relay: RelayConnection) => void
export type RelaySettings = { relayUrl: string, filters: Filter[], serviceRelay: boolean, providerRelay: boolean }


export class RelayConnection {
    eventCallback: RelayCallback
    log: PubLogger
    relay: Relay | null = null
    sub: Subscription | null = null
    // relayUrl: string
    stopped = false
    // filters: Filter[]
    settings: RelaySettings
    constructor(settings: RelaySettings, eventCallback: RelayCallback, autoconnect = true) {
        this.log = getLogger({ component: "relay:" + settings.relayUrl })
        // this.relayUrl = relayUrl
        // this.filters = filters
        this.settings = settings
        this.eventCallback = eventCallback
        if (autoconnect) {
            this.ConnectLoop()
        }
    }

    GetUrl() {
        return this.settings.relayUrl
    }

    Stop() {
        this.stopped = true
        this.sub?.close()
        this.relay?.close()
        this.relay = null
        this.sub = null
    }

    isServiceRelay() {
        return this.settings.serviceRelay
    }
    isProviderRelay() {
        return this.settings.providerRelay
    }

    getConstraint(): 'service' | 'provider' | undefined {
        if (this.isProviderRelay() && !this.isServiceRelay()) {
            return 'provider'
        }
        if (this.isServiceRelay() && !this.isProviderRelay()) {
            return 'service'
        }
        return undefined
    }

    async ConnectLoop() {
        let failures = 0
        while (!this.stopped) {
            await this.ConnectPromise()
            const pow = Math.pow(2, failures)
            const delay = Math.min(pow, 900)
            this.log("connection failed, will try again in", delay, "seconds (failures:", failures, ")")
            await new Promise(resolve => setTimeout(resolve, delay * 1000))
            failures++
        }
        this.log("nostr handler stopped")
    }

    async ConnectPromise() {
        return new Promise<void>(async (res) => {
            this.relay = await this.GetRelay()
            if (!this.relay) {
                res()
                return
            }
            this.sub = this.Subscribe(this.relay)
            this.relay.onclose = (() => {
                this.log("disconnected")
                this.sub?.close()
                if (this.relay) {
                    this.relay.onclose = null
                    this.relay.close()
                    this.relay = null
                }
                this.sub = null
                res()
            })
        })
    }

    async GetRelay(): Promise<Relay | null> {
        try {
            const relay = await Relay.connect(this.settings.relayUrl)
            if (!relay.connected) {
                throw new Error("failed to connect to relay")
            }
            return relay
        } catch (err: any) {
            this.log("failed to connect to relay", err.message || err)
            return null
        }
    }

    Subscribe(relay: Relay) {
        this.log("🔍 subscribing...")
        return relay.subscribe(this.settings.filters, {
            oneose: () => this.log("is ready"),
            onevent: (e) => this.eventCallback(e, this)
        })
    }

    Send(e: Event) {
        if (!this.relay) {
            throw new Error("relay not connected")
        }
        return this.relay.publish(e)
    }


}