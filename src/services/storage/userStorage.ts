import crypto from 'crypto';
import { DataSource, EntityManager } from "typeorm"
import { User } from './entity/User.js';
import { UserBasicAuth } from './entity/UserBasicAuth.js';
import { getLogger } from '../helpers/logger.js';
import TransactionsQueue from "./transactionsQueue.js";
export default class {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
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

    async LockUser(userId: string, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: true })
        if (!res.affected) {
            throw new Error("unaffected user lock for " + userId) // TODO: fix logs doxing
        }
    }
    async UnlockUser(userId: string, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: false })
        if (!res.affected) {
            throw new Error("unaffected user unlock for " + userId) // TODO: fix logs doxing
        }
    }
    async IncrementUserBalance(userId: string, increment: number, entityManager = this.DB) {
        const user = await this.GetUser(userId, entityManager)
        const res = await entityManager.getRepository(User).increment({
            user_id: userId,
        }, "balance_sats", increment)
        if (!res.affected) {
            throw new Error("unaffected balance increment for " + userId) // TODO: fix logs doxing
        }
        getLogger({ userId: userId, appName: "balanceUpdates" })("incremented balance from", user.balance_sats, "sats, by", increment, "sats")
    }
    async DecrementUserBalance(userId: string, decrement: number, entityManager = this.DB) {
        const user = await this.GetUser(userId, entityManager)
        if (!user || user.balance_sats < decrement) {
            throw new Error("not enough balance to decrement")
        }
        const res = await entityManager.getRepository(User).decrement({
            user_id: userId,
        }, "balance_sats", decrement)
        if (!res.affected) {
            throw new Error("unaffected balance decrement for " + userId) // TODO: fix logs doxing
        }
        getLogger({ userId: userId, appName: "balanceUpdates" })("decremented balance from", user.balance_sats, "sats, by", decrement, "sats")
    }

    async UpdateUser(userId: string, update: Partial<User>, entityManager = this.DB) {
        const user = await this.GetUser(userId, entityManager)
        await entityManager.getRepository(User).update(user.serial_id, update)
    }
}