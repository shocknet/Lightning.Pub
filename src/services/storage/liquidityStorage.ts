import { DataSource, EntityManager, MoreThan } from "typeorm"
import { LspOrder } from "./entity/LspOrder.js";
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import { LndNodeInfo } from "./entity/LndNodeInfo.js";
import { TrackedProvider } from "./entity/TrackedProvider.js";
export class LiquidityStorage {
    DB: DataSource | EntityManager
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, txQueue: TransactionsQueue) {
        this.DB = DB
        this.txQueue = txQueue
    }

    GetLatestLspOrder() {
        return this.DB.getRepository(LspOrder).findOne({ where: { serial_id: MoreThan(0) }, order: { serial_id: "DESC" } })
    }

    SaveLspOrder(order: Partial<LspOrder>) {
        const entry = this.DB.getRepository(LspOrder).create(order)
        return this.txQueue.PushToQueue<LspOrder>({ exec: async db => db.getRepository(LspOrder).save(entry), dbTx: false })
    }

    async SaveNodeSeed(pubkey: string, seed: string) {
        const existing = await this.DB.getRepository(LndNodeInfo).findOne({ where: { pubkey } })
        if (existing) {
            throw new Error("A seed already exists for this pub key")
        }
        const entry = this.DB.getRepository(LndNodeInfo).create({ pubkey, seed })
        return this.txQueue.PushToQueue<LndNodeInfo>({ exec: async db => db.getRepository(LndNodeInfo).save(entry), dbTx: false })
    }

    async SaveNodeBackup(pubkey: string, backup: string) {
        const existing = await this.DB.getRepository(LndNodeInfo).findOne({ where: { pubkey } })
        if (existing) {
            await this.DB.getRepository(LndNodeInfo).update(existing.serial_id, { backup })
            return
        }
        const entry = this.DB.getRepository(LndNodeInfo).create({ pubkey, backup })
        await this.txQueue.PushToQueue<LndNodeInfo>({ exec: async db => db.getRepository(LndNodeInfo).save(entry), dbTx: false })
    }

    async GetTrackedProvider(providerType: 'lnd' | 'lnPub', pub: string) {
        return this.DB.getRepository(TrackedProvider).findOne({ where: { provider_pubkey: pub, provider_type: providerType } })
    }
    async CreateTrackedProvider(providerType: 'lnd' | 'lnPub', pub: string, latestBalance = 0) {
        const entry = this.DB.getRepository(TrackedProvider).create({ provider_pubkey: pub, provider_type: providerType, latest_balance: latestBalance })
        return this.txQueue.PushToQueue<TrackedProvider>({ exec: async db => db.getRepository(TrackedProvider).save(entry), dbTx: false })
    }
    async UpdateTrackedProviderBalance(providerType: 'lnd' | 'lnPub', pub: string, latestBalance: number) {
        console.log("updating tracked balance:", latestBalance)
        return this.DB.getRepository(TrackedProvider).update({ provider_pubkey: pub, provider_type: providerType }, { latest_balance: latestBalance })
    }
    async UpdateTrackedProviderDisruption(providerType: 'lnd' | 'lnPub', pub: string, latestDisruptionAtUnix: number) {
        return this.DB.getRepository(TrackedProvider).update({ provider_pubkey: pub, provider_type: providerType }, { latest_distruption_at_unix: latestDisruptionAtUnix })
    }
}