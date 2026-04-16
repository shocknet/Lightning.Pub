import { IsNull, MoreThan, Not } from "typeorm"
import { LspOrder } from "./entity/LspOrder.js";
import { LndNodeInfo } from "./entity/LndNodeInfo.js";
import { TrackedProvider } from "./entity/TrackedProvider.js";
import { StorageInterface } from "./db/storageInterface.js";
import { mapTrackedProviderBackupRow, TrackedProviderRow } from "../backup/segments.js";
import { getLogger } from "../helpers/logger.js";
export class LiquidityStorage {
    dbs: StorageInterface
    constructor(dbs: StorageInterface) {
        this.dbs = dbs
    }

    GetLatestLspOrder() {
        return this.dbs.FindOne<LspOrder>('LspOrder', { where: { serial_id: MoreThan(0) }, order: { serial_id: "DESC" } })
    }

    SaveLspOrder(order: Partial<LspOrder>) {
        return this.dbs.CreateAndSave<LspOrder>('LspOrder', order)
    }

    async GetNoodeSeed(pubkey: string) {
        const node = await this.dbs.FindOne<LndNodeInfo>('LndNodeInfo', { where: { pubkey/* , seed: Not(IsNull()) */ } })
        return node?.seed
    }

    async SaveNodeSeed(pubkey: string, seed: string) {
        const existing = await this.dbs.FindOne<LndNodeInfo>('LndNodeInfo', { where: { pubkey } })
        if (existing) {
            throw new Error("A seed already exists for this pub key")
        }
        return this.dbs.CreateAndSave<LndNodeInfo>('LndNodeInfo', { pubkey, seed })
    }

    async SaveNodeBackup(pubkey: string, backup: string) {
        const existing = await this.dbs.FindOne<LndNodeInfo>('LndNodeInfo', { where: { pubkey } })
        if (existing) {
            await this.dbs.Update<LndNodeInfo>('LndNodeInfo', existing.serial_id, { backup })
            return
        }
        return this.dbs.CreateAndSave<LndNodeInfo>('LndNodeInfo', { pubkey, backup })
    }

    async GetTrackedProviders() {
        return this.dbs.Find<TrackedProvider>('TrackedProvider', {})
    }

    async ExportTrackedProviders(): Promise<TrackedProviderRow[]> {
        const providers = await this.GetTrackedProviders()
        return providers.map(mapTrackedProviderBackupRow)
    }

    async RestoreTrackedProviders(providers: TrackedProviderRow[], txId: string): Promise<number> {
        let restoredProviders = 0;
        for (const provider of providers) {
            try {
                await this.dbs.CreateAndSave<TrackedProvider>('TrackedProvider', {
                    provider_type: provider.provider_type as 'lnd' | 'lnPub',
                    provider_pubkey: provider.provider_pubkey,
                    latest_balance: provider.latest_balance,
                    latest_distruption_at_unix: provider.latest_distruption_at_unix,
                    latest_checked_height: provider.latest_checked_height,
                }, txId)
                restoredProviders++;
            } catch (error: any) {
                getLogger({ component: "backupRestore" })("error restoring tracked provider", error.message)
            }
        }
        return restoredProviders;
    }

    async GetTrackedProvider(providerType: 'lnd' | 'lnPub', pub: string) {
        return this.dbs.FindOne<TrackedProvider>('TrackedProvider', { where: { provider_pubkey: pub, provider_type: providerType } })
    }
    async CreateTrackedProvider(providerType: 'lnd' | 'lnPub', pub: string, latestBalance = 0) {
        return this.dbs.CreateAndSave<TrackedProvider>('TrackedProvider', { provider_pubkey: pub, provider_type: providerType, latest_balance: latestBalance })
    }
    async UpdateTrackedProviderBalance(providerType: 'lnd' | 'lnPub', pub: string, latestBalance: number) {
        console.log("updating tracked balance:", latestBalance)
        return this.dbs.Update<TrackedProvider>('TrackedProvider', { provider_pubkey: pub, provider_type: providerType }, { latest_balance: latestBalance })
    }
    async IncrementTrackedProviderBalance(providerType: 'lnd' | 'lnPub', pub: string, amount: number) {
        if (amount < 0) {
            return this.dbs.Increment<TrackedProvider>('TrackedProvider', { provider_pubkey: pub, provider_type: providerType }, "latest_balance", amount)
        } else {
            return this.dbs.Decrement<TrackedProvider>('TrackedProvider', { provider_pubkey: pub, provider_type: providerType }, "latest_balance", -amount)
        }

    }
    async UpdateTrackedProviderDisruption(providerType: 'lnd' | 'lnPub', pub: string, latestDisruptionAtUnix: number) {
        return this.dbs.Update<TrackedProvider>('TrackedProvider', { provider_pubkey: pub, provider_type: providerType }, { latest_distruption_at_unix: latestDisruptionAtUnix })
    }

    async GetLatestCheckedHeight(providerType: 'lnd' | 'lnPub', pub: string): Promise<number> {
        const provider = await this.GetTrackedProvider(providerType, pub)
        return provider?.latest_checked_height || 0
    }

    async UpdateLatestCheckedHeight(providerType: 'lnd' | 'lnPub', pub: string, height: number) {
        return this.dbs.Update<TrackedProvider>('TrackedProvider', { provider_pubkey: pub, provider_type: providerType }, { latest_checked_height: height })
    }
}