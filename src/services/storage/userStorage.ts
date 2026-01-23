import crypto from 'crypto';
import { User } from './entity/User.js';
import { UserBasicAuth } from './entity/UserBasicAuth.js';
import { getLogger } from '../helpers/logger.js';
import EventsLogManager from './eventsLog.js';
import { StorageInterface } from './db/storageInterface.js';
import { UserAccess } from './entity/UserAccess.js';
import { LessThan, MoreThan } from 'typeorm';
export default class {
    dbs: StorageInterface
    eventsLog: EventsLogManager
    constructor(dbs: StorageInterface, eventsLog: EventsLogManager) {
        this.dbs = dbs
        this.eventsLog = eventsLog
    }

    async AddUser(balance: number, txId: string): Promise<User> {
        if (balance && process.env.ALLOW_BALANCE_MIGRATION !== 'true') {
            throw new Error("balance migration is not allowed")
        }
        getLogger({})("Adding user with balance", balance)
        return this.dbs.CreateAndSave<User>('User', {
            user_id: crypto.randomBytes(32).toString('hex'),
            balance_sats: balance
        }, txId)
    }

    /*     async AddBasicUser(name: string, secret: string): Promise<UserBasicAuth> {
            return this.DB.transaction(async tx => {
                const user = await this.AddUser(0, tx)
                const newUserAuth = tx.getRepository(UserBasicAuth).create({
                    user: user,
                    name: name,
                    secret_sha256: crypto.createHash('sha256').update(secret).digest('base64')
                })
                return tx.getRepository(UserBasicAuth).save(newUserAuth)
            })
        } */
    FindUser(userId: string, txId?: string) {
        return this.dbs.FindOne<User>('User', { where: { user_id: userId } }, txId)
    }
    async GetUser(userId: string, txId?: string): Promise<User> {
        const user = await this.FindUser(userId, txId)
        if (!user) {
            throw new Error(`user not found`)
        }
        return user
    }

    async UnbanUser(userId: string, txId?: string) {
        const affected = await this.dbs.Update<User>('User', { user_id: userId }, { locked: false }, txId)
        if (!affected) {
            throw new Error("unaffected user unlock")
        }
    }

    async BanUser(userId: string, txId?: string) {
        const user = await this.GetUser(userId, txId)
        const affected = await this.dbs.Update<User>('User', { user_id: userId }, { balance_sats: 0, locked: true }, txId)
        if (!affected) {
            throw new Error("unaffected ban user")
        }
        if (user.balance_sats > 0) {
            this.eventsLog.LogEvent({ type: 'balance_decrement', userId, appId: "", appUserId: "", balance: user.balance_sats, data: 'ban', amount: user.balance_sats })
        }
        return user
    }
    async IncrementUserBalance(userId: string, increment: number, reason: string, txId?: string) {
        if (txId) {
            return this.IncrementUserBalanceInTx(userId, increment, reason, txId)
        }

        await this.dbs.Tx(async tx => {
            await this.IncrementUserBalanceInTx(userId, increment, reason, tx)
        }, `incrementing user ${userId} balance by ${increment}`)
    }

    async IncrementUserBalanceInTx(userId: string, increment: number, reason: string, txId: string) {
        const user = await this.GetUser(userId, txId)
        const affected = await this.dbs.Increment<User>('User', { user_id: userId }, "balance_sats", increment, txId)
        if (!affected) {
            getLogger({ userId: userId, component: "balanceUpdates" })("user unaffected by increment")
            throw new Error("unaffected balance increment")
        }
        getLogger({ userId: userId, component: "balanceUpdates" })("incremented balance from", user.balance_sats, "sats, by", increment, "sats")
        this.eventsLog.LogEvent({ type: 'balance_increment', userId, appId: "", appUserId: "", balance: user.balance_sats, data: reason, amount: increment })
    }

    async DecrementUserBalance(userId: string, decrement: number, reason: string, txId?: string) {
        if (txId) {
            return this.DecrementUserBalanceInTx(userId, decrement, reason, txId)
        }

        await this.dbs.Tx(async tx => {
            await this.DecrementUserBalanceInTx(userId, decrement, reason, tx)
        }, `decrementing user ${userId} balance by ${decrement}`)
    }

    async DecrementUserBalanceInTx(userId: string, decrement: number, reason: string, txId: string) {
        const user = await this.GetUser(userId, txId)
        if (!user || user.balance_sats < decrement) {
            getLogger({ userId: userId, component: "balanceUpdates" })("not enough balance to decrement")
            throw new Error("not enough balance to decrement")
        }
        const affected = await this.dbs.Decrement<User>('User', { user_id: userId }, "balance_sats", decrement, txId)
        if (!affected) {
            getLogger({ userId: userId, component: "balanceUpdates" })("user unaffected by decrement")
            throw new Error("unaffected balance decrement")
        }
        getLogger({ userId: userId, component: "balanceUpdates" })("decremented balance from", user.balance_sats, "sats, by", decrement, "sats")
        this.eventsLog.LogEvent({ type: 'balance_decrement', userId, appId: "", appUserId: "", balance: user.balance_sats, data: reason, amount: decrement })
    }

    async UpdateUser(userId: string, update: Partial<User>, txId?: string) {
        const user = await this.GetUser(userId, txId)
        await this.dbs.Update<User>('User', user.serial_id, update, txId)
    }

    async UpsertUserAccess(userId: string, lastSeenAtUnix: number, txId?: string) {
        return this.dbs.CreateAndSave<UserAccess>('UserAccess', { user_id: userId, last_seen_at_unix: lastSeenAtUnix }, txId)
    }

    async GetInactiveUsers(inactiveForDays: number) {
        const seconds = inactiveForDays * 24 * 60 * 60
        const now = Math.floor(Date.now() / 1000)
        const lastSeenAtUnix = now - seconds
        return this.dbs.Find<UserAccess>('UserAccess', { where: { last_seen_at_unix: LessThan(lastSeenAtUnix) } })
    }
}
