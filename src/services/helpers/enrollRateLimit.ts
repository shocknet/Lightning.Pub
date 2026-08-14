type HitWindow = { hits: number[] }

const DEFAULT_MAX_TRACKED_PUBS = 2_000

export class EnrollRateLimiter {
    private perPub = new Map<string, HitWindow>()
    private globalCreates: number[] = []

    constructor(
        private readonly perPubMax: number,
        private readonly globalCreateMax: number,
        private readonly windowMs: number,
        private readonly maxTrackedPubs = DEFAULT_MAX_TRACKED_PUBS,
        private readonly now = Date.now,
    ) { }

    tryRequest(pub: string): { ok: true } | { ok: false, retryAfterUnix: number } {
        this.sweepIdle()
        const window = this.windowFor(pub.toLowerCase())
        if (!window) {
            return { ok: false, retryAfterUnix: this.retryAfter(this.now()) }
        }
        return this.tryWindow(window, this.perPubMax)
    }

    tryCreate(): { ok: true } | { ok: false, retryAfterUnix: number } {
        this.globalCreates = this.prune(this.globalCreates)
        if (this.globalCreates.length >= this.globalCreateMax) {
            return { ok: false, retryAfterUnix: this.retryAfter(this.globalCreates[0]) }
        }
        this.globalCreates.push(this.now())
        return { ok: true }
    }

    private windowFor(key: string): HitWindow | null {
        const existing = this.perPub.get(key)
        if (existing) {
            return existing
        }
        if (this.perPub.size >= this.maxTrackedPubs) {
            return null
        }
        const window: HitWindow = { hits: [] }
        this.perPub.set(key, window)
        return window
    }

    private tryWindow(window: HitWindow, max: number): { ok: true } | { ok: false, retryAfterUnix: number } {
        window.hits = this.prune(window.hits)
        if (window.hits.length >= max) {
            return { ok: false, retryAfterUnix: this.retryAfter(window.hits[0]) }
        }
        window.hits.push(this.now())
        return { ok: true }
    }

    private sweepIdle(): void {
        const cutoff = this.now() - this.windowMs
        for (const [key, window] of this.perPub) {
            window.hits = window.hits.filter(t => t > cutoff)
            if (window.hits.length === 0) {
                this.perPub.delete(key)
            }
        }
    }

    private prune(hits: number[]): number[] {
        const cutoff = this.now() - this.windowMs
        return hits.filter(t => t > cutoff)
    }

    private retryAfter(oldestHit: number): number {
        return Math.ceil((oldestHit + this.windowMs) / 1000)
    }
}
