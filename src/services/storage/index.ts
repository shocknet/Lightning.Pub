import { DataSource, EntityManager } from "typeorm"
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db.js"
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import UserStorage from "./userStorage.js";
import PaymentStorage from "./paymentStorage.js";
import MetricsStorage from "./metricsStorage.js";
export type StorageSettings = {
    dbSettings: DbSettings
}
export const LoadStorageSettingsFromEnv = (test = false): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(test) }
}
type TX = (entityManager: EntityManager) => Promise<void>

export default class {
    DB: DataSource | EntityManager
    settings: StorageSettings
    productStorage: ProductStorage
    applicationStorage: ApplicationStorage
    userStorage: UserStorage
    paymentStorage: PaymentStorage
    metricsStorage: MetricsStorage
    pendingTx: boolean
    transactionsQueue: { exec: TX, res: () => void, rej: (message: string) => void }[] = []
    constructor(settings: StorageSettings) {
        this.settings = settings
    }
    async Connect() {
        this.DB = await NewDB(this.settings.dbSettings)
        this.userStorage = new UserStorage(this.DB)
        this.productStorage = new ProductStorage(this.DB)
        this.applicationStorage = new ApplicationStorage(this.DB, this.userStorage)
        this.paymentStorage = new PaymentStorage(this.DB, this.userStorage)
        this.metricsStorage = new MetricsStorage(this.DB)
    }

    StartTransaction(exec: TX) {
        if (!this.pendingTx) {
            return this.doTransaction(exec)
        }

        return new Promise<void>((res, rej) => {
            this.transactionsQueue.push({ exec, res, rej })
        })
    }

    async ExecNextInQueue() {
        this.pendingTx = false
        const next = this.transactionsQueue.pop()
        if (!next) {
            return
        }
        try {
            await this.doTransaction(next.exec)
            next.res()
        } catch (err: any) {
            next.rej(err.message)
        }
    }

    doTransaction(exec: TX) {
        if (this.pendingTx) {
            throw new Error("cannot start DB transaction")
        }
        this.pendingTx = true
        return this.DB.transaction(async tx => {
            try {
                await exec(tx)
                this.ExecNextInQueue()
            } catch (err) {
                this.ExecNextInQueue()
                throw err
            }
        })
    }
}