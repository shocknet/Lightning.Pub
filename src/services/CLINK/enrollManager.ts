import Storage from "../storage/index.js"
import { ERROR, getLogger } from "../helpers/logger.js"
import SettingsManager from "../main/settingsManager.js"
import { BackupManager } from "../backup/backupManager.js"
import { encodeDefaultClinkPointers } from "./clinkPointers.js"
import { enrollPowSatisfied } from "../helpers/nip13.js"
import { ClinkCtx, clinkVersionFromTags } from "./clinkTypes.js"
import { ClinkRateLimiter } from "./clinkRateLimit.js"
import { CLINK_VERSION } from "./clinkConstants.js"
import { Application } from "../storage/entity/Application.js"
import { ApplicationUser } from "../storage/entity/ApplicationUser.js"
import { EnrollError, EnrollErrorOpts, EnrollOk } from "./enrollTypes.js"

export class EnrollManager {
    private log = getLogger({ component: "EnrollManager" })
    private limiter = new ClinkRateLimiter({ windowMs: 60_000, maxHits: 60, maxKeys: 1 })
    private replies = new ClinkRateLimiter({ windowMs: 60_000, maxHits: 3 })

    constructor(private storage: Storage, private settings: SettingsManager, private backupManager: BackupManager) { }

    async HandleClinkEnroll(ctx: ClinkCtx, payload: unknown): Promise<EnrollOk | null> {
        if (!this.replies.tryAdd(ctx.pub).ok) {
            return null
        }
        return this.doEnroll(payload, ctx)
    }

    doEnroll = async (payload: unknown, ctx: ClinkCtx): Promise<EnrollOk> => {
        try {
            return await this.enroll(payload, ctx)
        } catch (e: any) {
            if (e instanceof EnrollError) {
                throw e
            }
            this.log(ERROR, e.message || e)
            throw new EnrollError({ code: 2 })
        }
    }

    private async enroll(payload: unknown, ctx: ClinkCtx): Promise<EnrollOk> {
        this.assertValidRequest(payload, ctx)

        const app = await this.storage.applicationStorage.GetApplication(ctx.appId)
        const pub = ctx.pub.toLowerCase()
        const existing = await this.storage.applicationStorage.FindNostrAppUser(pub)
        if (existing) {
            return this.pointersForExisting(app, existing)
        }

        const powBits = this.settings.getSettings().nostrRelaySettings.enrollPowBits
        if (!enrollPowSatisfied(ctx.eventId, ctx.tags, powBits)) {
            this.deny(5, { required_difficulty: powBits })
        }
        if (!app.allow_user_creation) {
            this.deny(1)
        }
        const createRate = this.limiter.tryAdd("create")
        if (!createRate.ok) {
            this.deny(4, { retry_after: createRate.retryAfterUnix })
        }

        const created = await this.createAccount(app, pub)
        if (!created) {
            this.deny(1)
        }
        void this.backupManager.notifyBackupTable('application_users', 'user_balances')
        return this.encodePointers(app, created)
    }

    private assertValidRequest(payload: unknown, ctx: ClinkCtx) {
        if (clinkVersionFromTags(ctx.tags) !== CLINK_VERSION) {
            this.deny(6)
        }
        if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
            this.deny(6)
        }
        if (typeof ctx.created_at !== "number") {
            this.deny(6)
        }
        const maxDeltaMs = this.settings.getSettings().nostrRelaySettings.enrollMaxDeltaMs
        const actualDeltaMs = Math.abs(Date.now() - ctx.created_at * 1000)
        if (actualDeltaMs > maxDeltaMs) {
            this.deny(3, { delta: { max_delta_ms: maxDeltaMs, actual_delta_ms: actualDeltaMs } })
        }
    }

    private pointersForExisting(app: Application, existing: ApplicationUser): EnrollOk {
        if (existing.application.app_id !== app.app_id) {
            this.deny(1)
        }
        if (existing.user.locked) {
            this.deny(1)
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

    private encodePointers(app: Application, appUser: ApplicationUser): EnrollOk {
        const servicePubkey = app.nostr_public_key
        const relay = this.settings.getSettings().nostrRelaySettings.relays[0]
        if (!servicePubkey || !relay) {
            this.deny(2)
        }
        return {
            res: "ok",
            ...encodeDefaultClinkPointers(servicePubkey, relay, appUser.identifier),
        }
    }

    private deny(code: number, opts?: EnrollErrorOpts): never {
        throw new EnrollError({ code, opts })
    }
}
