/// <reference types="node" />
/// <reference types="typeorm" />
import { DataSource, EntityManager } from "typeorm"
import { PubLogger, getLogger } from "../helpers/logger.js"
import { IDbOperations } from "./dbProxy.js"

export type TX<T> = (entityManager: EntityManager | IDbOperations) => Promise<T>
export type TxOperation<T> = {
    exec: TX<T>
    dbTx: boolean
    description?: string
}

export default class {
    DB: IDbOperations
    pendingTx: boolean
    transactionsQueue: { op: TxOperation<any>, res: (v: any) => void, rej: (message: string) => void }[] = []
    log: PubLogger

    constructor(name: string, DB: IDbOperations) {
        this.DB = DB
        this.log = getLogger({ component: name })
    }

    PushToQueue<T>(op: TxOperation<T>) {
        if (!this.pendingTx) {
            return this.execQueueItem(op)
        }
        this.log("pushing to queue", this.transactionsQueue.length)
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
            const res = await this.DB.StartTransaction(async (manager) => {
                return exec(manager)
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