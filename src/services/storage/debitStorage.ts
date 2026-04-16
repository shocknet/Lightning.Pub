import { DebitAccess, DebitAccessRules } from "./entity/DebitAccess.js";
import { StorageInterface } from "./db/storageInterface.js";
import { DebitAccessRow, mapDebitAccessBackupRow } from "../backup/segments.js";
import { getLogger } from "../helpers/logger.js";
type AccessToAdd = {
    npub: string
    rules?: DebitAccessRules
    authorize: boolean
}
export default class {
    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }

    async AddDebitAccess(appUserId: string, access: AccessToAdd) {
        return this.dbs.CreateAndSave<DebitAccess>('DebitAccess', {
            app_user_id: appUserId,
            npub: access.npub,
            authorized: access.authorize,
            rules: access.rules,
        })
    }

    async GetAllUserDebitAccess(appUserId: string, txId?: string) {
        return this.dbs.Find<DebitAccess>('DebitAccess', { where: { app_user_id: appUserId } }, txId)
    }

    async GetDebitAccess(appUserId: string, authorizedPub: string, txId?: string) {
        return this.dbs.FindOne<DebitAccess>('DebitAccess', { where: { app_user_id: appUserId, npub: authorizedPub } }, txId)
    }

    async IncrementDebitAccess(appUserId: string, authorizedPub: string, amount: number, txId?: string) {
        return this.dbs.Increment<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, 'total_debits', amount, txId)
    }

    async UpdateDebitAccess(appUserId: string, authorizedPub: string, authorized: boolean, txId?: string) {
        return this.dbs.Update<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, { authorized }, txId)
    }
    async UpdateDebitAccessRules(appUserId: string, authorizedPub: string, rules?: DebitAccessRules, txId?: string) {
        return this.dbs.Update<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, { rules: rules || null }, txId)
    }

    async DenyDebitAccess(appUserId: string, pub: string) {
        const access = await this.GetDebitAccess(appUserId, pub)
        if (!access) {
            await this.AddDebitAccess(appUserId, { npub: pub, authorize: false })
        }
        await this.UpdateDebitAccess(appUserId, pub, false)
    }

    async RemoveDebitAccess(appUserId: string, authorizedPub: string, txId?: string) {
        return this.dbs.Delete<DebitAccess>('DebitAccess', { app_user_id: appUserId, npub: authorizedPub }, txId)
    }

    async RemoveUserDebitAccess(appUserId: string, txId?: string) {
        return this.dbs.Delete<DebitAccess>('DebitAccess', { app_user_id: appUserId }, txId)
    }

    async GetAllDebitAccess(txId?: string) {
        return this.dbs.Find<DebitAccess>('DebitAccess', {}, txId)
    }

    async ExportDebitAccess(): Promise<DebitAccessRow[]> {
        const access = await this.GetAllDebitAccess()
        return access.map(mapDebitAccessBackupRow)
    }

    async RestoreDebitAccesses(accesses: DebitAccessRow[], txId: string): Promise<number> {
        let restoredAccess = 0;
        for (const access of accesses) {
            try {
                await this.dbs.CreateAndSave<DebitAccess>('DebitAccess', {
                    app_user_id: access.app_user_id,
                    npub: access.npub,
                    authorized: access.authorized,
                    rules: access.rules,
                    total_debits: access.total_debits,
                }, txId)
                restoredAccess++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring debit access", error.message)
            }
        }
        return restoredAccess;
    }
}