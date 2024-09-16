import { DataSource, EntityManager } from "typeorm"
import UserStorage from './userStorage.js';
import TransactionsQueue from "./transactionsQueue.js";
import { DebitAccess, DebitKeyType } from "./entity/DebitAccess.js";
export default class {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
    }

    async AddDebitAccess(appUserId: string, key: string, keyType: DebitKeyType, entityManager = this.DB) {
        const entry = entityManager.getRepository(DebitAccess).create({
            app_user_id: appUserId,
            key: key,
            key_type: keyType

        })
        return this.txQueue.PushToQueue<DebitAccess>({ exec: async db => db.getRepository(DebitAccess).save(entry), dbTx: false })
    }

    async GetAllUserDebitAccess(appUserId: string) {
        return this.DB.getRepository(DebitAccess).find({ where: { app_user_id: appUserId } })
    }

    async GetDebitAccess(appUserId: string, key: string, keyType: DebitKeyType) {
        return this.DB.getRepository(DebitAccess).findOne({ where: { app_user_id: appUserId, key, key_type: keyType } })
    }

    async IncrementDebitAccess(appUserId: string, key: string, keyType: DebitKeyType, amount: number) {
        return this.DB.getRepository(DebitAccess).increment({ app_user_id: appUserId, key, key_type: keyType }, 'total_debits', amount)
    }

    async RemoveDebitAccess(appUserId: string, serialId: number) {
        return this.DB.getRepository(DebitAccess).delete({ app_user_id: appUserId, serial_id: serialId })
    }
}