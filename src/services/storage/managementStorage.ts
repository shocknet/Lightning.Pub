import { ManagementGrantRow, mapManagementGrantBackupRow } from "../backup/segments.js";
import { StorageInterface } from "./db/storageInterface.js";
import { ManagementGrant } from "./entity/ManagementGrant.js";
import { getLogger } from "../helpers/logger.js";

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

    async GetAllManagementGrants(txId?: string) {
        return this.dbs.Find<ManagementGrant>('ManagementGrant', {}, txId)
    }

    async ExportManagementGrants(): Promise<ManagementGrantRow[]> {
        const grants = await this.GetAllManagementGrants()
        return grants.map(mapManagementGrantBackupRow)
    }

    async RestoreManagementGrants(grants: ManagementGrantRow[], txId: string): Promise<number> {
        let restoredGrants = 0;
        for (const grant of grants) {
            try {
                await this.dbs.CreateAndSave<ManagementGrant>('ManagementGrant', {
                    app_user_id: grant.app_user_id,
                    app_pubkey: grant.app_pubkey,
                    expires_at_unix: grant.expires_at_unix,
                    banned: grant.banned,
                }, txId)
                restoredGrants++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring management grant", error.message)
            }
        }
        return restoredGrants;
    }
}