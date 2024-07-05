import { DataSource, EntityManager, MoreThan } from "typeorm"
import { LspOrder } from "./entity/LspOrder.js";
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import { LndNodeInfo } from "./entity/LndNodeInfo.js";
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
}