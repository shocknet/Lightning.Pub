import crypto from 'crypto';
import { UserOffer } from "./entity/UserOffer.js";
import { StorageInterface } from "./storageInterface.js";
export default class {


    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }
    async AddDefaultUserOffer(appUserId: string): Promise<UserOffer> {
        return this.dbs.CreateAndSave<UserOffer>('UserOffer', {
            app_user_id: appUserId,
            offer_id: appUserId,
            label: 'Default NIP-69 Offer',
        })
    }
    async AddUserOffer(appUserId: string, req: Partial<UserOffer>): Promise<UserOffer> {
        const offer = await this.dbs.CreateAndSave<UserOffer>('UserOffer', {
            ...req,
            app_user_id: appUserId,
            offer_id: crypto.randomBytes(34).toString('hex')
        })
        return offer
    }

    async DeleteUserOffer(appUserId: string, offerId: string, txId?: string) {
        await this.dbs.Delete<UserOffer>('UserOffer', { app_user_id: appUserId, offer_id: offerId }, txId)
    }
    async UpdateUserOffer(app_user_id: string, offerId: string, req: Partial<UserOffer>, txId?: string) {
        return this.dbs.Update<UserOffer>('UserOffer', { app_user_id, offer_id: offerId }, req, txId)
    }

    async GetUserOffers(app_user_id: string): Promise<UserOffer[]> {
        return this.dbs.Find<UserOffer>('UserOffer', { where: { app_user_id } })
    }
    async GetUserOffer(app_user_id: string, offer_id: string): Promise<UserOffer | null> {
        return this.dbs.FindOne<UserOffer>('UserOffer', { where: { app_user_id, offer_id } })
    }
    async GetOffer(offer_id: string): Promise<UserOffer | null> {
        return this.dbs.FindOne<UserOffer>('UserOffer', { where: { offer_id } })
    }
}