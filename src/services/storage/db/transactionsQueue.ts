import { DataSource, EntityManager, EntityTarget } from "typeorm"
import { PubLogger, getLogger } from "../../helpers/logger.js"

type TX<T> = (entityManager: EntityManager | DataSource) => Promise<T>
type TxOperation<T> = {
    exec: TX<T>
    dbTx: boolean
    description?: string
}
/* type Locks = {
    beforeQueue: () => Promise<void>
    afterQueue: () => void
} */
export default class {
    DB: DataSource | EntityManager
    pendingTx: boolean
    transactionsQueue: { op: TxOperation<any>, res: (v: any) => void, rej: (message: string) => void }[] = []
    readersQueue: { res: () => void, rej: (message: string) => void }[] = []
    activeReaders = 0
    writeRequested = false
    log: PubLogger

    constructor(name: string, DB: DataSource | EntityManager) {
        this.DB = DB
        this.log = getLogger({ component: name })

    }

    private async executeRead(read: (tx: DataSource | EntityManager) => Promise<any>) {
        try {
            this.activeReaders++
            const res = await read(this.DB)
            this.doneReading()
            return res
        } catch (err) {
            this.doneReading()
            throw err
        }
    }
    async Read(read: (tx: DataSource | EntityManager) => Promise<any>) {
        //console.log("Read", this.activeReaders, this.pendingTx, this.writeRequested)
        if (!this.writeRequested) {
            return this.executeRead(read)
        }
        await this.waitWritingDone()
        return this.executeRead(read)
    }

    async waitWritingDone() {
        if (!this.writeRequested) {
            return
        }
        return new Promise<void>((res, rej) => {
            this.readersQueue.push({ res, rej })
        })
    }

    doneWriting() {
        this.writeRequested = false
        this.readersQueue.forEach(r => {
            r.res()
        })
        this.readersQueue = []
    }

    doneReading() {
        this.activeReaders--
        if (this.activeReaders === 0 && !this.pendingTx) {
            this.execNextInQueue()
        }
    }

    PushToQueue<T>(op: TxOperation<T>) {
        //console.log("PushToQueue", this.activeReaders, this.pendingTx, this.writeRequested)
        this.writeRequested = true
        if (!this.pendingTx && this.activeReaders === 0) {
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
            this.doneWriting()
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