import crypto from 'crypto';
import { UserOffer } from "./entity/UserOffer.js";
import { StorageInterface } from "./db/storageInterface.js";
import { mapUserOfferBackupRow, UserOfferRow } from '../backup/segments.js';
import { getLogger } from '../helpers/logger.js';
export default class {


    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }

    async GetAllUserOffers(txId?: string) {
        return this.dbs.Find<UserOffer>('UserOffer', {}, txId)
    }

    async ExportUserOffers(): Promise<UserOfferRow[]> {
        const offers = await this.GetAllUserOffers()
        return offers.map(mapUserOfferBackupRow)
    }

    async RestoreUserOffers(offers: UserOfferRow[], txId: string): Promise<number> {
        let restoredOffers = 0;
        for (const offer of offers) {
            try {
                await this.dbs.CreateAndSave<UserOffer>('UserOffer', {
                    app_user_id: offer.app_user_id,
                    offer_id: offer.offer_id,
                    management_pubkey: offer.management_pubkey,
                    label: offer.label,
                    price_sats: offer.price_sats,
                    callback_url: offer.callback_url,
                    payer_data: offer.payer_data,
                    bearer_token: offer.bearer_token,
                    rejectUnauthorized: offer.rejectUnauthorized,
                    blind: offer.blind,
                }, txId)
                restoredOffers++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring user offer", error.message)
            }
        }
        return restoredOffers;
    }

    async AddDefaultUserOffer(appUserId: string): Promise<UserOffer> {
        return this.dbs.CreateAndSave<UserOffer>('UserOffer', {
            app_user_id: appUserId,
            offer_id: appUserId,
            label: 'Default CLINK Offer',
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

    async DeleteUserOffers(appUserId: string, txId?: string) {
        await this.dbs.Delete<UserOffer>('UserOffer', { app_user_id: appUserId }, txId)
    }

    async UpdateUserOffer(app_user_id: string, offerId: string, req: Partial<UserOffer>, txId?: string) {
        return this.dbs.Update<UserOffer>('UserOffer', { app_user_id, offer_id: offerId }, req, txId)
    }

    async GetUserOffers(app_user_id: string): Promise<UserOffer[]> {
        return this.dbs.Find<UserOffer>('UserOffer', { where: { app_user_id } })
    }

    async getManagedUserOffers(app_user_id: string, management_pubkey: string): Promise<UserOffer[]> {
        return this.dbs.Find<UserOffer>('UserOffer', { where: { app_user_id, management_pubkey } })
    }

    async GetUserOffer(app_user_id: string, offer_id: string): Promise<UserOffer | null> {
        return this.dbs.FindOne<UserOffer>('UserOffer', { where: { app_user_id, offer_id } })
    }
    async GetOffer(offer_id: string): Promise<UserOffer | null> {
        return this.dbs.FindOne<UserOffer>('UserOffer', { where: { offer_id } })
    }
}