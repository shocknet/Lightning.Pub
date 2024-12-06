import { DataSource, EntityManager } from "typeorm"
import crypto from 'crypto';
import UserStorage from './userStorage.js';
import TransactionsQueue from "./transactionsQueue.js";
import { DebitAccess, DebitAccessRules } from "./entity/DebitAccess.js";
import { UserOffer } from "./entity/UserOffer.js";
export default class {


    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
    }
    async AddDefaultUserOffer(appUserId: string): Promise<UserOffer> {
        const newUserOffer = this.DB.getRepository(UserOffer).create({
            app_user_id: appUserId,
            offer_id: appUserId,
            label: 'Default NIP-69 Offer',
        })
        return this.txQueue.PushToQueue<UserOffer>({ exec: async db => db.getRepository(UserOffer).save(newUserOffer), dbTx: false, description: `add default offer for ${appUserId}` })
    }
    async AddUserOffer(appUserId: string, req: Partial<UserOffer>): Promise<UserOffer> {
        const newUserOffer = this.DB.getRepository(UserOffer).create({
            ...req,
            app_user_id: appUserId,
            offer_id: crypto.randomBytes(34).toString('hex')
        })
        return this.txQueue.PushToQueue<UserOffer>({ exec: async db => db.getRepository(UserOffer).save(newUserOffer), dbTx: false, description: `add offer for ${appUserId}: ${req.label} ` })
    }

    async DeleteUserOffer(appUserId: string, offerId: string, entityManager = this.DB) {
        await entityManager.getRepository(UserOffer).delete({ app_user_id: appUserId, offer_id: offerId })
    }
    async UpdateUserOffer(app_user_id: string, req: Partial<UserOffer>) {
        return this.DB.getRepository(UserOffer).update({ app_user_id, offer_id: req.offer_id }, req)
    }

    async GetUserOffers(app_user_id: string): Promise<UserOffer[]> {
        return this.DB.getRepository(UserOffer).find({ where: { app_user_id } })
    }
    async GetUserOffer(app_user_id: string, offer_id: string): Promise<UserOffer | null> {
        return this.DB.getRepository(UserOffer).findOne({ where: { app_user_id, offer_id } })
    }
    async GetOffer(offer_id: string): Promise<UserOffer | null> {
        return this.DB.getRepository(UserOffer).findOne({ where: { offer_id } })
    }
}