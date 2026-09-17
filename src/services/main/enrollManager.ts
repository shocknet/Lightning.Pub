import { UnsignedEvent } from "nostr-tools"
import Storage from "../storage/index.js"
import { NostrEvent } from "../nostr/nostrPool.js"
import { ERROR, getLogger } from "../helpers/logger.js"
import SettingsManager from "./settingsManager.js"
import { encodeDefaultClinkPointers } from "../helpers/clinkPointers.js"
import { enrollPowSatisfied } from "../helpers/nip13.js"
import { clinkResponseTags, clinkVersionFromTags } from "../helpers/clinkTags.js"
import { EnrollRateLimiter, EnrollReplyGate } from "../helpers/enrollRateLimit.js"
import { CLINK_ENROLL_KIND, CLINK_VERSION } from "../helpers/clinkConstants.js"
import { Application } from "../storage/entity/Application.js"
import { ApplicationUser } from "../storage/entity/ApplicationUser.js"

type EnrollOk = { res: "ok", noffer: string, ndebit: string, nmanage: string }
type EnrollGfy = {
    res: "GFY"
    code: number
    error: string
    required_difficulty?: number
    retry_after?: number
    delta?: { max_delta_ms: number, actual_delta_ms: number }
}
export type EnrollResponse = EnrollOk | EnrollGfy

const enrollErrors: Record<number, string> = {
    1: "Denied / not allowed",
    2: "Temporary Failure / Service unavailable",
    3: "Expired Request",
    4: "Rate limited",
    5: "Insufficient proof of work",
    6: "Invalid Request",
}

export class EnrollManager {
    private log = getLogger({ component: "EnrollManager" })
    private limiter = new EnrollRateLimiter(60, 60_000)
    private replies = new EnrollReplyGate(60_000)

    constructor(private storage: Storage, private settings: SettingsManager) { }

    handleEnroll = async (payload: unknown, event: NostrEvent): Promise<void> => {
        const res = await this.doEnroll(payload, event)
        if (!this.replies.allow(event.pub)) {
            return
        }
        const e = newNenrollResponse(JSON.stringify(res), event)
        this.storage.NostrSender().Send(
            { type: "app", appId: event.appId },
            { type: "event", event: e, encrypt: { toPub: event.pub } },
        )
    }

    doEnroll = async (payload: unknown, event: NostrEvent): Promise<EnrollResponse> => {
        try {
            return await this.enroll(payload, event)
        } catch (e: any) {
            this.log(ERROR, e.message || e)
            return this.gfy(2)
        }
    }

    private async enroll(payload: unknown, event: NostrEvent): Promise<EnrollResponse> {
        const invalid = this.validateRequest(payload, event)
        if (invalid) {
            return invalid
        }

        const app = await this.storage.applicationStorage.GetApplication(event.appId)
        const pub = event.pub.toLowerCase()
        const existing = await this.storage.applicationStorage.FindNostrAppUser(pub)
        if (existing) {
            return this.pointersForExisting(app, existing)
        }

        const powBits = this.settings.getSettings().nostrRelaySettings.enrollPowBits
        if (!enrollPowSatisfied(event.id, event.tags, powBits)) {
            return this.gfy(5, { required_difficulty: powBits })
        }
        if (!app.allow_user_creation) {
            return this.gfy(1)
        }
        const createRate = this.limiter.tryCreate()
        if (!createRate.ok) {
            return this.gfy(4, { retry_after: createRate.retryAfterUnix })
        }

        const created = await this.createAccount(app, pub)
        if (!created) {
            return this.gfy(1)
        }
        return this.encodePointers(app, created)
    }

    private validateRequest(payload: unknown, event: NostrEvent): EnrollGfy | null {
        if (clinkVersionFromTags(event.tags) !== CLINK_VERSION) {
            return this.gfy(6)
        }
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
            return this.gfy(6)
        }
        if (typeof event.created_at !== "number") {
            return this.gfy(6)
        }
        const maxDeltaMs = this.settings.getSettings().nostrRelaySettings.enrollMaxDeltaMs
        const actualDeltaMs = Math.abs(Date.now() - event.created_at * 1000)
        if (actualDeltaMs > maxDeltaMs) {
            return this.gfy(3, { delta: { max_delta_ms: maxDeltaMs, actual_delta_ms: actualDeltaMs } })
        }
        return null
    }

    private pointersForExisting(app: Application, existing: ApplicationUser): EnrollResponse {
        if (existing.application.app_id !== app.app_id) {
            return this.gfy(1)
        }
        if (existing.user.locked) {
            return this.gfy(1)
        }
        return this.encodePointers(app, existing)
    }

    private async createAccount(app: Application, pub: string): Promise<ApplicationUser | null> {
        try {
            return await this.storage.applicationStorage.GetOrCreateNostrAppUser(app, pub, { ownerOnlyClink: true })
        } catch (e: any) {
            const raced = await this.storage.applicationStorage.FindNostrAppUser(pub)
            if (raced && raced.application.app_id === app.app_id && !raced.user.locked) {
                return raced
            }
            this.log(ERROR, "enroll create failed", e.message || e)
            return null
        }
    }

    private encodePointers(app: Application, appUser: ApplicationUser): EnrollResponse {
        const servicePubkey = app.nostr_public_key
        const relay = this.settings.getSettings().nostrRelaySettings.relays[0]
        if (!servicePubkey || !relay) {
            return this.gfy(2)
        }
        return {
            res: "ok",
            ...encodeDefaultClinkPointers(servicePubkey, relay, appUser.identifier),
        }
    }

    private gfy(code: number, extra?: Partial<EnrollGfy>): EnrollGfy {
        return {
            res: "GFY",
            code,
            error: enrollErrors[code] || enrollErrors[6],
            ...extra,
        }
    }
}

const newNenrollResponse = (content: string, event: NostrEvent): UnsignedEvent => {
    return {
        content,
        created_at: Math.floor(Date.now() / 1000),
        kind: CLINK_ENROLL_KIND,
        pubkey: "",
        tags: clinkResponseTags(event.pub, event.id),
    }
}
