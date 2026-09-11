import { DebitAccess, DebitAccessRules } from "./entity/DebitAccess.js";
import { ConsumedDebitK1, DebitK1Status } from "./entity/ConsumedDebitK1.js";
import { StorageInterface } from "./db/storageInterface.js";
import {
    DebitK1AlreadyProcessedError, DebitRateLimitedError,
} from "../main/debitTypes.js";
import { LessThan, MoreThan } from "typeorm";

export const K1_CONSUME_WINDOW_MS = 60_000
export const K1_CONSUME_MAX_PER_WINDOW = 60
export const K1_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1000
export const K1_PRUNE_INTERVAL_MS = 60_000

const isUniqueConstraintError = (e: unknown) => {
    const err = e as { code?: string, message?: string, driverError?: { code?: string, message?: string } }
    const code = err.code || err.driverError?.code || ""
    const message = err.message || err.driverError?.message || ""
    return code.includes("SQLITE_CONSTRAINT")
        || /UNIQUE constraint failed/i.test(message)
        || /SQLITE_CONSTRAINT_UNIQUE/i.test(message)
}

type AccessToAdd = {
    npub: string
    rules?: DebitAccessRules
    authorize: boolean
}
export default class {
    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }

    async AddDebitAccess(appUserId: string, access: AccessToAdd) {
        return this.dbs.CreateAndSave<DebitAccess>('DebitAccess', {
            app_user_id: appUserId,
            npub: access.npub,
            authorized: access.authorize,
            rules: access.rules,
        })
    }

    async GetAllUserDebitAccess(appUserId: string, txId?: string) {
        return this.dbs.Find<DebitAccess>('DebitAccess', { where: { app_user_id: appUserId } }, txId)
    }

    async GetDebitAccess(appUserId: string, authorizedPub: string, txId?: string) {
        return this.dbs.FindOne<DebitAccess>('DebitAccess', { where: { app_user_id: appUserId, npub: authorizedPub } }, txId)
    }

    async IncrementDebitAccess(appUserId: string, authorizedPub: string, amount: number, txId?: string) {
        return this.dbs.Increment<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, 'total_debits', amount, txId)
    }

    async UpdateDebitAccess(appUserId: string, authorizedPub: string, authorized: boolean, txId?: string) {
        return this.dbs.Update<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, { authorized }, txId)
    }
    async UpdateDebitAccessRules(appUserId: string, authorizedPub: string, rules?: DebitAccessRules, txId?: string) {
        return this.dbs.Update<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, { rules: rules || null }, txId)
    }

    async DenyDebitAccess(appUserId: string, pub: string) {
        const access = await this.GetDebitAccess(appUserId, pub)
        if (!access) {
            await this.AddDebitAccess(appUserId, { npub: pub, authorize: false })
        }
        await this.UpdateDebitAccess(appUserId, pub, false)
    }

    async RemoveDebitAccess(appUserId: string, authorizedPub: string, txId?: string) {
        return this.dbs.Delete<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, txId)
    }

    async RemoveUserDebitAccess(appUserId: string, txId?: string) {
        return this.dbs.Delete<DebitAccess>('DebitAccess', { app_user_id: appUserId }, txId)
    }

    async ConsumeDebitK1(appId: string, pointer: string, k1: string, details: { txId?: string, invoice?: string, requestId?: string, npub?: string, status?: DebitK1Status } = {}) {
        const run = async (tx: string) => {
            if (await this.findActiveK1(appId, pointer, k1, tx)) {
                throw new DebitK1AlreadyProcessedError()
            }
            await this.assertK1ConsumeRate(appId, pointer, tx)
            try {
                return await this.dbs.CreateAndSave<ConsumedDebitK1>('ConsumedDebitK1', this.k1AttemptRow(appId, pointer, k1, details), tx)
            } catch (e) {
                if (isUniqueConstraintError(e)) {
                    throw new DebitK1AlreadyProcessedError()
                }
                throw e
            }
        }
        if (details.txId) {
            return run(details.txId)
        }
        return this.dbs.Tx(tx => run(tx), 'consume debit k1')
    }

    k1AttemptRow(appId: string, pointer: string, k1: string, details: { invoice?: string, requestId?: string, npub?: string, status?: DebitK1Status }) {
        const row: { app_id: string, pointer: string, k1: string, status: DebitK1Status, invoice?: string, request_id?: string, npub?: string } = {
            app_id: appId,
            pointer,
            k1,
            status: details.status || "held",
        }
        if (details.invoice) {
            row.invoice = details.invoice.toLowerCase()
        }
        if (details.requestId) {
            row.request_id = details.requestId
        }
        if (details.npub) {
            row.npub = details.npub.toLowerCase()
        }
        return row
    }

    async findK1AttemptForRequest(appId: string, pointer: string, requestId: string, txId?: string) {
        return this.dbs.FindOne<ConsumedDebitK1>('ConsumedDebitK1', {
            where: { app_id: appId, pointer, request_id: requestId },
        }, txId)
    }

    async k1AlreadySucceeded(appId: string, pointer: string, k1: string, txId?: string) {
        const rows = await this.dbs.Find<ConsumedDebitK1>('ConsumedDebitK1', {
            where: { app_id: appId, pointer, k1 },
        }, txId)
        return rows.some(row => row.status === "succeeded")
    }

    async RebindDebitK1Invoice(appId: string, pointer: string, requestId: string, invoice: string, txId?: string) {
        return this.dbs.Update<ConsumedDebitK1>('ConsumedDebitK1', {
            app_id: appId,
            pointer,
            request_id: requestId,
        }, { invoice: invoice.toLowerCase() }, txId)
    }

    async ReleaseDebitK1ForRequest(appId: string, pointer: string, requestId: string, txId?: string) {
        return this.dbs.Update<ConsumedDebitK1>('ConsumedDebitK1', {
            app_id: appId,
            pointer,
            request_id: requestId,
            status: "held",
        }, { status: "released" }, txId)
    }

    async markK1Succeeded(appId: string, pointer: string, requestId: string, txId?: string) {
        const run = async (tx: string) => {
            const paid = await this.findK1AttemptForRequest(appId, pointer, requestId, tx)
            if (!paid) {
                return 0
            }
            await this.releaseOtherActiveK1Attempts(paid, tx)
            if (paid.status === "succeeded") {
                return 0
            }
            try {
                return await this.dbs.Update<ConsumedDebitK1>('ConsumedDebitK1', { serial_id: paid.serial_id }, { status: "succeeded" }, tx)
            } catch (e) {
                if (isUniqueConstraintError(e)) {
                    throw new DebitK1AlreadyProcessedError()
                }
                throw e
            }
        }
        if (txId) {
            return run(txId)
        }
        return this.dbs.Tx(tx => run(tx), "mark debit k1 succeeded")
    }

    async releaseOtherActiveK1Attempts(paid: ConsumedDebitK1, txId: string) {
        const rows = await this.dbs.Find<ConsumedDebitK1>('ConsumedDebitK1', {
            where: { app_id: paid.app_id, pointer: paid.pointer, k1: paid.k1 },
        }, txId)
        for (const row of rows) {
            if (row.serial_id === paid.serial_id || row.status === "released") {
                continue
            }
            if (row.status === "succeeded") {
                throw new DebitK1AlreadyProcessedError()
            }
            await this.dbs.Update<ConsumedDebitK1>('ConsumedDebitK1', { serial_id: row.serial_id }, { status: "released" }, txId)
        }
    }

    async ReleaseDebitK1ForInvoice(invoice: string, txId?: string) {
        const canonical = invoice.toLowerCase()
        const run = async (tx: string) => {
            const held = await this.dbs.Update<ConsumedDebitK1>('ConsumedDebitK1', { invoice: canonical, status: "held" }, { status: "released" }, tx)
            const succeeded = await this.dbs.Update<ConsumedDebitK1>('ConsumedDebitK1', { invoice: canonical, status: "succeeded" }, { status: "released" }, tx)
            return (held || 0) + (succeeded || 0)
        }
        if (txId) {
            return run(txId)
        }
        return this.dbs.Tx(tx => run(tx), "release debit k1")
    }

    async findActiveK1(appId: string, pointer: string, k1: string, txId?: string) {
        const rows = await this.dbs.Find<ConsumedDebitK1>('ConsumedDebitK1', {
            where: { app_id: appId, pointer, k1 },
        }, txId)
        return rows.find(row => row.status !== "released") || null
    }

    async PruneDebitK1Attempts(now = Date.now()) {
        const cutoff = new Date(now - K1_ATTEMPT_TTL_MS)
        const run = async (tx: string) => {
            const released = await this.dbs.Delete<ConsumedDebitK1>('ConsumedDebitK1', { created_at: LessThan(cutoff), status: "released" }, tx)
            return released || 0
        }
        return this.dbs.Tx(tx => run(tx), "prune debit k1 attempts")
    }

    async assertK1ConsumeRate(appId: string, pointer: string, txId?: string) {
        const since = new Date(Date.now() - K1_CONSUME_WINDOW_MS)
        const recent = await this.dbs.Find<ConsumedDebitK1>('ConsumedDebitK1', {
            where: { app_id: appId, pointer, created_at: MoreThan(since) },
            take: K1_CONSUME_MAX_PER_WINDOW,
        }, txId)
        if (recent.length >= K1_CONSUME_MAX_PER_WINDOW) {
            throw new DebitRateLimitedError(Math.floor(Date.now() / 1000) + Math.ceil(K1_CONSUME_WINDOW_MS / 1000))
        }
    }
}