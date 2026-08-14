type HitWindow = { hits: number[] }

export class EnrollRateLimiter {
    private perPub = new Map<string, HitWindow>()
    private globalCreates: number[] = []

    constructor(
        private readonly perPubMax: number,
        private readonly globalCreateMax: number,
        private readonly windowMs: number,
    ) { }

    tryRequest(pub: string): { ok: true } | { ok: false, retryAfterUnix: number } {
        return this.tryWindow(this.windowFor(pub), this.perPubMax)
    }

    tryCreate(): { ok: true } | { ok: false, retryAfterUnix: number } {
        this.globalCreates = this.prune(this.globalCreates)
        if (this.globalCreates.length >= this.globalCreateMax) {
            return { ok: false, retryAfterUnix: this.retryAfter(this.globalCreates[0]) }
        }
        this.globalCreates.push(Date.now())
        return { ok: true }
    }

    private windowFor(pub: string): HitWindow {
        const key = pub.toLowerCase()
        let window = this.perPub.get(key)
        if (!window) {
            window = { hits: [] }
            this.perPub.set(key, window)
        }
        return window
    }

    private tryWindow(window: HitWindow, max: number): { ok: true } | { ok: false, retryAfterUnix: number } {
        window.hits = this.prune(window.hits)
        if (window.hits.length >= max) {
            return { ok: false, retryAfterUnix: this.retryAfter(window.hits[0]) }
        }
        window.hits.push(Date.now())
        return { ok: true }
    }

    private prune(hits: number[]): number[] {
        const cutoff = Date.now() - this.windowMs
        return hits.filter(t => t > cutoff)
    }

    private retryAfter(oldestHit: number): number {
        return Math.ceil((oldestHit + this.windowMs) / 1000)
    }
}
