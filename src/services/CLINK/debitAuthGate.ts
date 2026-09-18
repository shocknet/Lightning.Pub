import { CLINK_AUTH_TTL_MS, clinkRateKey } from "./clinkRateLimit.js"

export const CLINK_DEBIT_POINTER_MAX_HITS = 3
export const CLINK_DEBIT_GLOBAL_WINDOW_MS = 60_000
export const CLINK_DEBIT_GLOBAL_MAX_HITS = 60

export type DebitAuthGateResult = { ok: true } | { ok: false, retryAfterUnix: number }

export type DebitAuthGateOpts = {
    occupancyTtlMs?: number
    pointerWindowMs?: number
    pointerMax?: number
    globalWindowMs?: number
    globalMax?: number
    now?: () => number
}

type Pending = { pointer: string, requestId: string, expiresAt: number, committed: boolean }

export class DebitAuthGate {
    private pending = new Map<string, Pending>()
    private pointerHits = new Map<string, number[]>()
    private globalHits: number[] = []
    private readonly occupancyTtlMs: number
    private readonly pointerWindowMs: number
    private readonly pointerMax: number
    private readonly globalWindowMs: number
    private readonly globalMax: number
    private readonly now: () => number

    constructor(opts: DebitAuthGateOpts = {}) {
        this.occupancyTtlMs = opts.occupancyTtlMs ?? CLINK_AUTH_TTL_MS
        this.pointerWindowMs = opts.pointerWindowMs ?? CLINK_AUTH_TTL_MS
        this.pointerMax = opts.pointerMax ?? CLINK_DEBIT_POINTER_MAX_HITS
        this.globalWindowMs = opts.globalWindowMs ?? CLINK_DEBIT_GLOBAL_WINDOW_MS
        this.globalMax = opts.globalMax ?? CLINK_DEBIT_GLOBAL_MAX_HITS
        this.now = opts.now ?? Date.now
    }

    tryReserve(pointer: string, pub: string, requestId: string): DebitAuthGateResult {
        this.sweep()
        const pairKey = this.pairKey(pointer, pub)
        const pointerKey = this.pointerKey(pointer)
        const existing = this.pending.get(pairKey)
        if (existing) {
            return { ok: false, retryAfterUnix: this.toUnix(existing.expiresAt) }
        }
        const pointerRetry = this.pointerRetryAfter(pointerKey)
        if (pointerRetry !== null) {
            return { ok: false, retryAfterUnix: pointerRetry }
        }
        const globalRetry = this.globalRetryAfter()
        if (globalRetry !== null) {
            return { ok: false, retryAfterUnix: globalRetry }
        }
        this.pending.set(pairKey, {
            pointer: pointerKey,
            requestId: this.id(requestId),
            expiresAt: this.now() + this.occupancyTtlMs,
            committed: false,
        })
        return { ok: true }
    }

    commitNotify(pointer: string, pub: string, requestId: string): void {
        this.sweep()
        const slot = this.pending.get(this.pairKey(pointer, pub))
        if (!slot || slot.committed || slot.requestId !== this.id(requestId)) {
            return
        }
        slot.committed = true
        const at = this.now()
        const pointerKey = slot.pointer
        const hits = this.pointerHits.get(pointerKey) || []
        hits.push(at)
        this.pointerHits.set(pointerKey, hits)
        this.globalHits.push(at)
    }

    abortReserve(pointer: string, pub: string, requestId: string): void {
        this.clearPending(pointer, pub, requestId)
    }

    clearPair(pointer: string, pub: string): void {
        this.pending.delete(this.pairKey(pointer, pub))
    }

    clearPending(pointer: string, pub: string, requestId: string): void {
        const key = this.pairKey(pointer, pub)
        const slot = this.pending.get(key)
        if (!slot || slot.requestId !== this.id(requestId)) {
            return
        }
        this.pending.delete(key)
    }

    private pointerRetryAfter(pointerKey: string): number | null {
        const hits = this.liveHits(this.pointerHits.get(pointerKey) || [], this.pointerWindowMs)
        const inFlight = this.inFlightExpires(slot => slot.pointer === pointerKey)
        if (hits.length + inFlight.length < this.pointerMax) {
            return null
        }
        return this.budgetRetryAfter(hits, this.pointerWindowMs, inFlight)
    }

    private globalRetryAfter(): number | null {
        const hits = this.liveHits(this.globalHits, this.globalWindowMs)
        const inFlight = this.inFlightExpires()
        if (hits.length + inFlight.length < this.globalMax) {
            return null
        }
        const horizon = this.now() + this.globalWindowMs
        const capped = inFlight.map(expiresAt => Math.min(expiresAt, horizon))
        return this.budgetRetryAfter(hits, this.globalWindowMs, capped)
    }

    private inFlightExpires(match?: (slot: Pending) => boolean): number[] {
        const expires: number[] = []
        for (const slot of this.pending.values()) {
            if (slot.committed) {
                continue
            }
            if (match && !match(slot)) {
                continue
            }
            expires.push(slot.expiresAt)
        }
        return expires
    }

    private budgetRetryAfter(hits: number[], windowMs: number, inFlightExpires: number[]): number {
        let soonest: number | undefined
        if (hits[0] !== undefined) {
            soonest = hits[0] + windowMs
        }
        for (const expiresAt of inFlightExpires) {
            if (soonest === undefined || expiresAt < soonest) {
                soonest = expiresAt
            }
        }
        return this.toUnix(soonest ?? this.now() + windowMs)
    }

    private liveHits(hits: number[], windowMs: number): number[] {
        const cutoff = this.now() - windowMs
        return hits.filter(hit => hit > cutoff)
    }

    private sweep() {
        const now = this.now()
        for (const [key, slot] of this.pending) {
            if (slot.expiresAt <= now) {
                this.pending.delete(key)
            }
        }
        for (const [key, hits] of this.pointerHits) {
            const live = this.liveHits(hits, this.pointerWindowMs)
            if (live.length === 0) {
                this.pointerHits.delete(key)
            } else {
                this.pointerHits.set(key, live)
            }
        }
        this.globalHits = this.liveHits(this.globalHits, this.globalWindowMs)
    }

    private pairKey(pointer: string, pub: string) {
        return clinkRateKey(pointer, pub)
    }

    private pointerKey(pointer: string) {
        return clinkRateKey(pointer)
    }

    private id(requestId: string) {
        return requestId.toLowerCase()
    }

    private toUnix(ms: number) {
        return Math.ceil(ms / 1000)
    }
}
