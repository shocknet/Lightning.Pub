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

    async addGrant(appUserId: string, appPubkey: string, expires_at_unix: number) {
        return this.dbs.CreateAndSave<ManagementGrant>('ManagementGrant', { app_user_id: appUserId, app_pubkey: appPubkey, expires_at_unix });
    }
} 