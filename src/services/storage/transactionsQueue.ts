import { DataSource, EntityManager, EntityTarget } from "typeorm"

export type TX<T> = (entityManager: EntityManager | DataSource) => Promise<T>
export type TxOperation<T> = {
    exec: TX<T>
    dbTx: boolean
}

export default class {
    DB: DataSource | EntityManager
    pendingTx: boolean
    transactionsQueue: { op: TxOperation<any>, res: (v: any) => void, rej: (message: string) => void }[] = []
    constructor(DB: DataSource | EntityManager) {
        this.DB = DB
    }

    PushToQueue<T>(op: TxOperation<T>) {
        if (!this.pendingTx) {
            return this.execQueueItem(op)
        }

        return new Promise<T>((res, rej) => {
            this.transactionsQueue.push({ op, res, rej })
        })
    }

    async execNextInQueue() {
        this.pendingTx = false
        const next = this.transactionsQueue.pop()
        if (!next) {
            return
        }
        try {
            const res = await this.execQueueItem(next.op)
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


    doTransaction<T>(exec: TX<T>) {
        return this.DB.transaction(async tx => {
            try {
                const res = await exec(tx)
                this.execNextInQueue()
                return res
            } catch (err) {
                this.execNextInQueue()
                throw err
            }
        })
    }
}