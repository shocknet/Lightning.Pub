import crypto from 'crypto';
import { DataSource, EntityManager } from "typeorm"
import { User } from './entity/User.js';
import { UserBasicAuth } from './entity/UserBasicAuth.js';
import { getLogger } from '../helpers/logger.js';
import TransactionsQueue from "./transactionsQueue.js";
import EventsLogManager from './eventsLog.js';
export default class {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    eventsLog: EventsLogManager
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue, eventsLog: EventsLogManager) {
        this.DB = DB
        this.txQueue = txQueue
        this.eventsLog = eventsLog
    }

    async AddUser(balance: number, dbTx: DataSource | EntityManager): Promise<User> {
        if (balance && process.env.ALLOW_BALANCE_MIGRATION !== 'true') {
            throw new Error("balance migration is not allowed")
        }
        getLogger({})("Adding user with balance", balance)
        const newUser = dbTx.getRepository(User).create({
            user_id: crypto.randomBytes(32).toString('hex'),
            balance_sats: balance
        })
        return dbTx.getRepository(User).save(newUser)
    }

    async AddBasicUser(name: string, secret: string): Promise<UserBasicAuth> {
        return this.DB.transaction(async tx => {
            const user = await this.AddUser(0, tx)
            const newUserAuth = tx.getRepository(UserBasicAuth).create({
                user: user,
                name: name,
                secret_sha256: crypto.createHash('sha256').update(secret).digest('base64')
            })
            return tx.getRepository(UserBasicAuth).save(newUserAuth)
        })

    }
    FindUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).findOne({
            where: {
                user_id: userId
            }
        })
    }
    async GetUser(userId: string, entityManager = this.DB): Promise<User> {
        const user = await this.FindUser(userId, entityManager)
        if (!user) {
            throw new Error(`user ${userId} not found`) // TODO: fix logs doxing
        }
        return user
    }

    async UnbanUser(userId: string, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: false })
        if (!res.affected) {
            throw new Error("unaffected user unlock for " + userId) // TODO: fix logs doxing
        }
    }

    async BanUser(userId: string, entityManager = this.DB) {
        const user = await this.GetUser(userId, entityManager)
        const res = await entityManager.getRepository(User).update({
            user_id: userId
        }, { balance_sats: 0, locked: true })
        if (!res.affected) {
            throw new Error("unaffected ban user for " + userId) // TODO: fix logs doxing
        }
        if (user.balance_sats > 0) {
            this.eventsLog.LogEvent({ type: 'balance_decrement', userId, appId: "", appUserId: "", balance: user.balance_sats, data: 'ban', amount: user.balance_sats })
        }
        return user
    }
    async IncrementUserBalance(userId: string, increment: number, reason: string, entityManager?: DataSource | EntityManager) {
        if (entityManager) {
            return this.IncrementUserBalanceInTx(userId, increment, reason, entityManager)
        }
        await this.txQueue.PushToQueue({
            dbTx: true,
            description: `incrementing user ${userId} balance by ${increment}`,
            exec: async tx => {
                await this.IncrementUserBalanceInTx(userId, increment, reason, tx)
            }
        })
    }
    async IncrementUserBalanceInTx(userId: string, increment: number, reason: string, dbTx: DataSource | EntityManager) {
        const user = await this.GetUser(userId, dbTx)
        const res = await dbTx.getRepository(User).increment({
            user_id: userId,
        }, "balance_sats", increment)
        if (!res.affected) {
            getLogger({ userId: userId, component: "balanceUpdates" })("user unaffected by increment")
            throw new Error("unaffected balance increment for " + userId) // TODO: fix logs doxing
        }
        getLogger({ userId: userId, component: "balanceUpdates" })("incremented balance from", user.balance_sats, "sats, by", increment, "sats")
        this.eventsLog.LogEvent({ type: 'balance_increment', userId, appId: "", appUserId: "", balance: user.balance_sats, data: reason, amount: increment })
    }
    async DecrementUserBalance(userId: string, decrement: number, reason: string, entityManager?: DataSource | EntityManager) {
        if (entityManager) {
            return this.DecrementUserBalanceInTx(userId, decrement, reason, entityManager)
        }
        await this.txQueue.PushToQueue({
            dbTx: true,
            description: `decrementing user ${userId} balance by ${decrement}`,
            exec: async tx => {
                await this.DecrementUserBalanceInTx(userId, decrement, reason, tx)
            }
        })
    }

    async DecrementUserBalanceInTx(userId: string, decrement: number, reason: string, dbTx: DataSource | EntityManager) {
        const user = await this.GetUser(userId, dbTx)
        if (!user || user.balance_sats < decrement) {
            getLogger({ userId: userId, component: "balanceUpdates" })("not enough balance to decrement")
            throw new Error("not enough balance to decrement")
        }
        const res = await dbTx.getRepository(User).decrement({
            user_id: userId,
        }, "balance_sats", decrement)
        if (!res.affected) {
            getLogger({ userId: userId, component: "balanceUpdates" })("user unaffected by decrement")
            throw new Error("unaffected balance decrement for " + userId) // TODO: fix logs doxing
        }
        getLogger({ userId: userId, component: "balanceUpdates" })("decremented balance from", user.balance_sats, "sats, by", decrement, "sats")
        this.eventsLog.LogEvent({ type: 'balance_decrement', userId, appId: "", appUserId: "", balance: user.balance_sats, data: reason, amount: decrement })
    }

    async UpdateUser(userId: string, update: Partial<User>, entityManager = this.DB) {
        const user = await this.GetUser(userId, entityManager)
        await entityManager.getRepository(User).update(user.serial_id, update)
    }
}