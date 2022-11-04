import { DataSource, EntityManager } from "typeorm"
import crypto from 'crypto';
import NewDB from "./db"
import { User } from "./entity/User"

export default class {
    DB: DataSource
    async Connect() {
        this.DB = await NewDB()
    }
    async AddUser(name: string, callbackUrl: string, secret: string, entityManager = this.DB) {
        return entityManager.getRepository(User).create({
            name: name,
            callbackUrl: callbackUrl,
            secret_sha256: crypto.createHash('sha256').update(secret).digest('base64')
        })
    }
    FindUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).findOne({
            where: {
                user_id: userId
            }
        })
    }
    async GetUser(user_id: string, entityManager = this.DB): Promise<User> {
        const user = await this.FindUser(user_id, entityManager)
        if (!user) {
            throw new Error(`user ${user_id} not found`) // TODO: fix logs doxing
        }
        return user
    }
    LockUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: true })
    }
    UnlockUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: false })
    }
    async IncrementUserBalance(userId: string, increment: number, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).increment({
            user_id: userId,
        }, "balance_sats", increment)
        if (!res.affected) {
            throw new Error("unaffected balance increment for " + userId) // TODO: fix logs doxing
        }
    }
    async DecrementUserBalance(userId: string, decrement: number, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).decrement({
            user_id: userId,
        }, "balance_sats", decrement)
        if (!res.affected) {
            throw new Error("unaffected balance decrement for " + userId) // TODO: fix logs doxing
        }
    }
}