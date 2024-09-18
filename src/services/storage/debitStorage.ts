import { DataSource, EntityManager } from "typeorm"
import UserStorage from './userStorage.js';
import TransactionsQueue from "./transactionsQueue.js";
import { DebitAccess, DebitAccessRules } from "./entity/DebitAccess.js";
export default class {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
    }

    async AddDebitAccess(appUserId: string, pubToAuthorize: string, entityManager = this.DB) {
        const entry = entityManager.getRepository(DebitAccess).create({
            app_user_id: appUserId,
            npub: pubToAuthorize,
            authorized: true,
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

    async UpdateDebitAccessRules(appUserId: string, authorizedPub: string, rules: DebitAccessRules) {
        return this.DB.getRepository(DebitAccess).update({ app_user_id: appUserId, npub: authorizedPub }, { rules })
    }

    async RemoveDebitAccess(appUserId: string, authorizedPub: string) {
        return this.DB.getRepository(DebitAccess).update({ app_user_id: appUserId, npub: authorizedPub }, { authorized: false })
    }
}