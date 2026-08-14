const DEFAULT_MAX_TRACKED_PUBS = 2_000

export class EnrollRateLimiter {
    private creates: number[] = []

    constructor(
        private readonly maxCreates: number,
        private readonly windowMs: number,
        private readonly now = Date.now,
    ) { }

    tryCreate(): { ok: true } | { ok: false, retryAfterUnix: number } {
        this.creates = this.prune(this.creates)
        if (this.creates.length >= this.maxCreates) {
            return { ok: false, retryAfterUnix: this.retryAfter(this.creates[0]) }
        }
        this.creates.push(this.now())
        return { ok: true }
    }

    private prune(hits: number[]): number[] {
        const cutoff = this.now() - this.windowMs
        return hits.filter(t => t > cutoff)
    }

    private retryAfter(oldestHit: number): number {
        return Math.ceil((oldestHit + this.windowMs) / 1000)
    }
}

export class EnrollReplyGate {
    private sent = new Map<string, number[]>()

    constructor(
        private readonly windowMs: number,
        private readonly maxTrackedPubs = DEFAULT_MAX_TRACKED_PUBS,
        private readonly now = Date.now,
        private readonly maxReplies = 3,
    ) { }

    allow(pub: string): boolean {
        this.sweepIdle()
        const key = pub.toLowerCase()
        const hits = this.sent.get(key) || []
        if (hits.length >= this.maxReplies) {
            return false
        }
        if (!this.sent.has(key) && this.sent.size >= this.maxTrackedPubs) {
            return false
        }
        hits.push(this.now())
        this.sent.set(key, hits)
        return true
    }

    private sweepIdle(): void {
        const cutoff = this.now() - this.windowMs
        for (const [key, hits] of this.sent) {
            const live = hits.filter(t => t > cutoff)
            if (live.length === 0) {
                this.sent.delete(key)
            } else {
                this.sent.set(key, live)
            }
        }
    }
}
