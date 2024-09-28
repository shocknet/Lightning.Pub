import { DataSource, EntityManager } from "typeorm"
import UserStorage from './userStorage.js';
import TransactionsQueue from "./transactionsQueue.js";
import { DebitAccess, DebitAccessRules } from "./entity/DebitAccess.js";
type AccessToAdd = {
    npub: string
    rules?: DebitAccessRules
    authorize: boolean
}
export default class {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
    }

    async AddDebitAccess(appUserId: string, access: AccessToAdd, entityManager = this.DB) {
        const entry = entityManager.getRepository(DebitAccess).create({
            app_user_id: appUserId,
            npub: access.npub,
            authorized: access.authorize,
            rules: access.rules,
        })
        return this.txQueue.PushToQueue<DebitAccess>({ exec: async db => db.getRepository(DebitAccess).save(entry), dbTx: false })
    }

    async GetAllUserDebitAccess(appUserId: string) {
        return this.DB.getRepository(DebitAccess).find({ where: { app_user_id: appUserId } })
    }

    async GetDebitAccess(appUserId: string, authorizedPub: string) {
        return this.DB.getRepository(DebitAccess).findOne({ where: { app_user_id: appUserId, npub: authorizedPub } })
    }

    async IncrementDebitAccess(appUserId: string, authorizedPub: string, amount: number) {
        return this.DB.getRepository(DebitAccess).increment({ app_user_id: appUserId, npub: authorizedPub }, 'total_debits', amount)
    }

    async UpdateDebitAccess(appUserId: string, authorizedPub: string, authorized: boolean) {
        return this.DB.getRepository(DebitAccess).update({ app_user_id: appUserId, npub: authorizedPub }, { authorized })
    }
    async UpdateDebitAccessRules(appUserId: string, authorizedPub: string, rules?: DebitAccessRules) {
        return this.DB.getRepository(DebitAccess).update({ app_user_id: appUserId, npub: authorizedPub }, { rules })
    }

    async DenyDebitAccess(appUserId: string, pub: string) {
        const access = await this.GetDebitAccess(appUserId, pub)
        if (!access) {
            await this.AddDebitAccess(appUserId, { npub: pub, authorize: false })
        }
        await this.UpdateDebitAccess(appUserId, pub, false)
    }

    async RemoveDebitAccess(appUserId: string, authorizedPub: string) {
        return this.DB.getRepository(DebitAccess).delete({ app_user_id: appUserId, npub: authorizedPub })
    }
}