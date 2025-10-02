import { StorageInterface } from "./db/storageInterface.js";
import { ManagementGrant } from "./entity/ManagementGrant.js";

export class ManagementStorage {
    private dbs: StorageInterface;
    constructor(dbs: StorageInterface) {
        this.dbs = dbs;
    }

    getGrant(appUserId: string, appPubkey: string) {
        return this.dbs.FindOne<ManagementGrant>('ManagementGrant', { where: { app_pubkey: appPubkey, app_user_id: appUserId } });
    }

    async addGrant(appUserId: string, appPubkey: string, banned: boolean, expires_at_unix = 0) {
        return this.dbs.CreateAndSave<ManagementGrant>('ManagementGrant', { app_user_id: appUserId, app_pubkey: appPubkey, banned, expires_at_unix });
    }

    async getGrants(appUserId: string) {
        return this.dbs.Find<ManagementGrant>('ManagementGrant', { where: { app_user_id: appUserId } });
    }

    async removeGrant(appUserId: string, appPubkey: string) {
        return this.dbs.Delete<ManagementGrant>('ManagementGrant', { app_pubkey: appPubkey, app_user_id: appUserId });
    }

    async removeUserGrants(appUserId: string, txId?: string) {
        return this.dbs.Delete<ManagementGrant>('ManagementGrant', { app_user_id: appUserId }, txId);
    }
}