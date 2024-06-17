import { DataSource, EntityManager, MoreThan } from "typeorm"
import { LspOrder } from "./entity/LspOrder.js";
import TransactionsQueue, { TX } from "./transactionsQueue.js";
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
}