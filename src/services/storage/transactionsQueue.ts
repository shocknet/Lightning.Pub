import { DataSource, EntityManager, EntityTarget } from "typeorm"
import { getLogger } from "../helpers/logger"

export type TX<T> = (entityManager: EntityManager | DataSource) => Promise<T>
export type TxOperation<T> = {
    exec: TX<T>
    dbTx: boolean
}

export default class {
    DB: DataSource | EntityManager
    pendingTx: boolean
    transactionsQueue: { op: TxOperation<any>, res: (v: any) => void, rej: (message: string) => void }[] = []
    log = getLogger({})
    constructor(DB: DataSource | EntityManager) {
        this.DB = DB
    }

    PushToQueue<T>(op: TxOperation<T>) {
        if (!this.pendingTx) {
            this.log("executing item immediately")
            return this.execQueueItem(op)
        }
        this.log("holding item in queue")
        return new Promise<T>((res, rej) => {
            this.transactionsQueue.push({ op, res, rej })
        })
    }

    async execNextInQueue() {
        this.pendingTx = false
        const next = this.transactionsQueue.pop()
        if (!next) {
            this.log("no more items in queue")
            return
        }
        try {
            this.log("executing next item in queue")
            const res = await this.execQueueItem(next.op)
            this.log("resolving next item in queue")
            next.res(res)
        } catch (err: any) {
            this.log("rejecting next item in queue")
            next.rej(err.message)
        }
    }

    execQueueItem<T>(op: TxOperation<T>) {
        if (this.pendingTx) {
            throw new Error("cannot start DB transaction")
        }
        this.pendingTx = true
        if (op.dbTx) {
            this.log("executing item transaction")
            return this.doTransaction(op.exec)
        }
        this.log("executing item operation")
        return this.doOperation(op.exec)
    }

    async doOperation<T>(exec: TX<T>) {
        try {
            const res = await exec(this.DB)
            this.log("executing item operation done")
            this.execNextInQueue()
            return res
        } catch (err) {
            this.log("executing item operation failed")
            this.execNextInQueue()
            throw err
        }
    }


    doTransaction<T>(exec: TX<T>) {
        return this.DB.transaction(async tx => {
            try {
                const res = await exec(tx)
                this.log("executing item transaction done")
                this.execNextInQueue()
                return res
            } catch (err) {
                this.log("executing item transaction failed")
                this.execNextInQueue()
                throw err
            }
        })
    }
}