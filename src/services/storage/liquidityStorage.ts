import { IsNull, MoreThan, Not } from "typeorm"
import { LspOrder } from "./entity/LspOrder.js";
import { LndNodeInfo } from "./entity/LndNodeInfo.js";
import { TrackedProvider } from "./entity/TrackedProvider.js";
import { StorageInterface } from "./db/storageInterface.js";
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
        return this.dbs.FindOne<LndNodeInfo>('LndNodeInfo', { where: { pubkey, seed: Not(IsNull()) } })
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
}