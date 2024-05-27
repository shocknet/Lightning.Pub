import { DataSource, EntityManager, EntityTarget } from "typeorm"
import { PubLogger, getLogger } from "../helpers/logger.js"

export type TX<T> = (entityManager: EntityManager | DataSource) => Promise<T>
export type TxOperation<T> = {
    exec: TX<T>
    dbTx: boolean
    description?: string
}

export default class {
    DB: DataSource | EntityManager
    pendingTx: boolean
    transactionsQueue: { op: TxOperation<any>, res: (v: any) => void, rej: (message: string) => void }[] = []
    log: PubLogger
    constructor(name: string, DB: DataSource | EntityManager) {
        this.DB = DB
        this.log = getLogger({ component: name })
    }

    PushToQueue<T>(op: TxOperation<T>) {
        if (!this.pendingTx) {
            this.log("queue empty, starting transaction", this.transactionsQueue.length)
            return this.execQueueItem(op)
        }
        this.log("queue not empty, possibly stuck")
        return new Promise<T>((res, rej) => {
            this.transactionsQueue.push({ op, res, rej })
        })
    }

    async execNextInQueue() {
        this.log("executing next in queue")
        this.pendingTx = false
        const next = this.transactionsQueue.pop()
        if (!next) {
            this.log("queue is clear")
            return
        }
        try {
            const res = await this.execQueueItem(next.op)
            if (next.op.description) this.log("done", next.op.description)
            next.res(res)
        } catch (err: any) {
            next.rej(err.message)
        }
    }

    execQueueItem<T>(op: TxOperation<T>) {
        if (this.pendingTx) {
            throw new Error("cannot start DB transaction")
        }
        this.pendingTx = true
        this.log("starting", op.dbTx ? "db transaction" : "operation", op.description || "")
        if (op.dbTx) {
            return this.doTransaction(op.exec)
        }
        return this.doOperation(op.exec)
    }

    async doOperation<T>(exec: TX<T>) {
        try {
            const res = await exec(this.DB)
            this.execNextInQueue()
            return res
        } catch (err) {
            this.execNextInQueue()
            throw err
        }
    }


    async doTransaction<T>(exec: TX<T>) {
        try {
            const res = await this.DB.transaction(async tx => {
                return exec(tx)
            })
            this.execNextInQueue()
            return res
        } catch (err: any) {
            this.execNextInQueue()
            this.log("transaction failed", err.message)
            throw err
        }
    }
}