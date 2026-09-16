import { NmanageRequest } from "@shocknet/clink-sdk"
import { ClinkCtx } from "./clinkTypes.js"

export const MANAGE_AUTH_TTL_MS = 10 * 60 * 1000
const DEFAULT_MAX_PENDING = 2_000

export type PendingManage = { request: NmanageRequest, ctx: ClinkCtx }

export class PendingManageRequests {
    private pending = new Map<string, PendingManage & { createdAt: number }>()

    constructor(
        private readonly ttlMs = MANAGE_AUTH_TTL_MS,
        private readonly maxPending = DEFAULT_MAX_PENDING,
        private readonly now = Date.now,
    ) { }

    tryAdd(pub: string, entry: PendingManage): { ok: true } | { ok: false, retryAfterUnix: number } {
        this.sweep()
        const key = pub.toLowerCase()
        const existing = this.pending.get(key)
        if (existing) {
            return { ok: false, retryAfterUnix: this.retryAfter(existing.createdAt) }
        }
        if (this.pending.size >= this.maxPending) {
            return { ok: false, retryAfterUnix: this.retryAfter(this.oldestCreatedAt() ?? this.now()) }
        }
        this.pending.set(key, { ...entry, createdAt: this.now() })
        return { ok: true }
    }

    take(pub: string): PendingManage | undefined {
        this.sweep()
        const key = pub.toLowerCase()
        const entry = this.pending.get(key)
        if (!entry) {
            return undefined
        }
        this.pending.delete(key)
        return { request: entry.request, ctx: entry.ctx }
    }

    private retryAfter(createdAt: number): number {
        return Math.ceil((createdAt + this.ttlMs) / 1000)
    }

    private oldestCreatedAt(): number | undefined {
        let oldest: number | undefined
        for (const entry of this.pending.values()) {
            if (oldest === undefined || entry.createdAt < oldest) {
                oldest = entry.createdAt
            }
        }
        return oldest
    }

    private sweep() {
        const cutoff = this.now() - this.ttlMs
        for (const [key, entry] of this.pending) {
            if (entry.createdAt <= cutoff) {
                this.pending.delete(key)
            }
        }
    }
}
