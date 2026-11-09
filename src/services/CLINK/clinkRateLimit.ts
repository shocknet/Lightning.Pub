export const CLINK_AUTH_TTL_MS = 10 * 60 * 1000
export const CLINK_RATE_LIMIT_MAX_KEYS = 2_000

export type ClinkRateLimitResult = { ok: true } | { ok: false, retryAfterUnix: number }

type Slot<T> = { hits: number[], payload?: T }

export type ClinkRateLimiterOpts = {
    windowMs: number
    maxHits: number
    maxKeys?: number
    now?: () => number
}

export const clinkRateKey = (...parts: string[]) => parts.map(part => part.toLowerCase()).join(":")

export class ClinkRateLimiter<T = void> {
    private slots = new Map<string, Slot<T>>()
    private readonly windowMs: number
    private readonly maxHits: number
    private readonly maxKeys: number
    private readonly now: () => number

    constructor(opts: ClinkRateLimiterOpts) {
        this.windowMs = opts.windowMs
        this.maxHits = opts.maxHits
        this.maxKeys = opts.maxKeys ?? CLINK_RATE_LIMIT_MAX_KEYS
        this.now = opts.now ?? Date.now
    }

    tryAdd(key: string, payload?: T): ClinkRateLimitResult {
        this.sweep()
        const id = this.id(key)
        const existing = this.slots.get(id)
        if (existing && existing.hits.length >= this.maxHits) {
            return { ok: false, retryAfterUnix: this.retryAfter(existing.hits[0]) }
        }
        if (!existing && this.slots.size >= this.maxKeys) {
            return { ok: false, retryAfterUnix: this.retryAfter(this.oldestHit() ?? this.now()) }
        }
        const slot = existing || { hits: [] }
        slot.hits.push(this.now())
        if (payload !== undefined) {
            slot.payload = payload
        }
        this.slots.set(id, slot)
        return { ok: true }
    }

    take(key: string): T | undefined {
        this.sweep()
        const id = this.id(key)
        const slot = this.slots.get(id)
        if (!slot) {
            return undefined
        }
        this.slots.delete(id)
        return slot.payload
    }

    private id(key: string) {
        return key.toLowerCase()
    }

    private retryAfter(oldestHit: number): number {
        return Math.ceil((oldestHit + this.windowMs) / 1000)
    }

    private oldestHit(): number | undefined {
        let oldest: number | undefined
        for (const slot of this.slots.values()) {
            const hit = slot.hits[0]
            if (hit === undefined) {
                continue
            }
            if (oldest === undefined || hit < oldest) {
                oldest = hit
            }
        }
        return oldest
    }

    private sweep() {
        const cutoff = this.now() - this.windowMs
        for (const [key, slot] of this.slots) {
            const live = slot.hits.filter(hit => hit > cutoff)
            if (live.length === 0) {
                this.slots.delete(key)
            } else {
                slot.hits = live
            }
        }
    }
}
