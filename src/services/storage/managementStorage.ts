import { StorageInterface } from "./db/storageInterface.js";
import { ManagementGrant } from "./entity/ManagementGrant.js";

export class ManagementStorage {
    private dbs: StorageInterface;
    constructor(dbs: StorageInterface) {
        this.dbs = dbs;
    }

    getGrant(user_id: string, app_pubkey: string) {
        return this.dbs.FindOne<ManagementGrant>('ManagementGrant' as any, { where: { user_id, app_pubkey } });
    }

    async addGrant(user_id: string, app_pubkey: string, expires_at?: Date) {
        return this.dbs.CreateAndSave<ManagementGrant>('ManagementGrant' as any, { user_id, app_pubkey, expires_at });
    }
} 