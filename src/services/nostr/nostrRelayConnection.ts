import WebSocket from 'ws'
Object.assign(global, { WebSocket: WebSocket });
import { Event, UnsignedEvent, Relay, Filter } from 'nostr-tools'
import { getLogger, PubLogger } from '../helpers/logger.js'
import { Subscription } from 'nostr-tools/lib/types/abstract-relay.js';

type RelayCallback = (event: Event, relay: RelayConnection) => void
export type RelaySettings = { relayUrl: string, filters: PartialFilter[], serviceRelay: boolean, providerRelay: boolean }

export type PartialFilter = { f: Filter, populateSince: boolean }
const completeFilter = (filter: PartialFilter, sinceMs: number): Filter => {
    if (filter.populateSince) {
        return { ...filter.f, since: Math.ceil(sinceMs / 1000) }
    }
    return filter.f
}
/* nostr events deduper will remove events older than NOSTR_EVENTS_TTL_MS */
export const NOSTR_EVENTS_TTL_MS = 1000 * 60 * 20 // 20 minutes
/* allow moderate clock skew for senders slightly ahead of this node */
export const NOSTR_EVENT_MAX_FUTURE_SKEW_MS = 1000 * 60 * 2 // 2 minutes
/* interval used to trigger the cleanup check, */
const INTERVAL_MS = NOSTR_EVENTS_TTL_MS / 2 // 10 minutes
/* Event age must be at least NOSTR_EVENTS_TTL_MS ms old to be deduped (20min)
IF uptime < INTERVAL_MS (10min):
- since = startedAtMs (events can only be as old as uptime)
ELSE:
- since = now - INTERVAL_MS (events can be up to 10min old)
*/

/** Reject signed events whose created_at is too old (replay) or too far in the future (clock skew). */
export const isEventTimestampFresh = (createdAtSec: number, nowMs = Date.now()): boolean => {
    if (!Number.isFinite(createdAtSec) || createdAtSec <= 0) {
        return false
    }
    const createdAtMs = createdAtSec * 1000
    if (createdAtMs > nowMs + NOSTR_EVENT_MAX_FUTURE_SKEW_MS) {
        return false
    }
    if (nowMs - createdAtMs > NOSTR_EVENTS_TTL_MS) {
        return false
    }
    return true
}
export class EventsDeduper {
    handledEvents: Map<string, { handledAt: number }> = new Map()
    cleanupInterval: NodeJS.Timeout | undefined
    startedAtMs = Date.now()
    constructor() {
        this.StartCleanupInterval()
    }

    ResetStartTime = () => {
        this.startedAtMs = Date.now()
    }

    GetSinceMs = () => {
        if (Date.now() - this.startedAtMs < INTERVAL_MS) {
            return this.startedAtMs
        }
        return Date.now() - INTERVAL_MS
    }

    Dedupe = (eventId: string): { alreadyHandled: boolean } => {
        if (this.handledEvents.has(eventId)) {
            return { alreadyHandled: true }
        }
        this.handledEvents.set(eventId, { handledAt: Date.now() })
        return { alreadyHandled: false }
    }

    Stop = () => {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval)
        }
    }

    StartCleanupInterval() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now()
            this.handledEvents.forEach((value, key) => {
                if (now - value.handledAt > NOSTR_EVENTS_TTL_MS) {
                    this.handledEvents.delete(key)
                }
            })
        }, INTERVAL_MS)
    }
}

export class RelayConnection {
    eventCallback: RelayCallback
    log: PubLogger
    relay: Relay | null = null
    sub: Subscription | null = null
    stopped = false
    settings: RelaySettings
    eventsDeduper: EventsDeduper
    constructor(settings: RelaySettings, eventCallback: RelayCallback, deduper: EventsDeduper, autoconnect = true) {
        this.log = getLogger({ component: "relay:" + settings.relayUrl })
        this.settings = settings
        this.eventCallback = eventCallback
        this.eventsDeduper = deduper
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
            await this.ConnectPromise(() => failures = 0)
            const pow = Math.pow(2, failures)
            const delay = Math.min(pow, 900)
            this.log("connection failed, will try again in", delay, "seconds (failures:", failures, ")")
            await new Promise(resolve => setTimeout(resolve, delay * 1000))
            failures++
        }
        this.log("nostr handler stopped")
    }

    async ConnectPromise(onReady: () => void) {
        return new Promise<void>(async (res) => {
            this.relay = await this.GetRelay()
            if (!this.relay) {
                res()
                return
            }
            this.sub = this.Subscribe(this.relay, onReady)
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

    Subscribe(relay: Relay, onReady: () => void) {
        this.log("🔍 subscribing...")
        const sinceMs = this.eventsDeduper.GetSinceMs()
        const filters = this.settings.filters.map(f => completeFilter(f, sinceMs))
        this.log("🔍 subscribing with filters:", filters)
        return relay.subscribe(filters, {
            oneose: () => {
                this.log("is ready")
                onReady()
            },
            onevent: (e) => this.eventCallback(e, this)
        })
    }

    Send(e: Event) {
        if (!this.relay?.connected) {
            throw new Error("relay not connected")
        }
        return this.relay.publish(e)
    }

    IsConnected() {
        return !!this.relay?.connected
    }
}

