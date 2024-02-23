import { DataSource, EntityManager } from "typeorm"
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db.js"
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import UserStorage from "./userStorage.js";
import PaymentStorage from "./paymentStorage.js";
import MetricsStorage from "./metricsStorage.js";
import TransactionsQueue, { TX } from "./transactionsQueue.js";
export type StorageSettings = {
    dbSettings: DbSettings
}
export const LoadStorageSettingsFromEnv = (test = false): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(test) }
}

export default class {
    DB: DataSource | EntityManager
    settings: StorageSettings
    txQueue: TransactionsQueue
    productStorage: ProductStorage
    applicationStorage: ApplicationStorage
    userStorage: UserStorage
    paymentStorage: PaymentStorage
    metricsStorage: MetricsStorage
    constructor(settings: StorageSettings) {
        this.settings = settings
    }
    async Connect(migrations: Function[], metricsMigrations: Function[]) {
        const { source, executedMigrations } = await NewDB(this.settings.dbSettings, migrations)
        this.DB = source
        this.txQueue = new TransactionsQueue("main", this.DB)
        this.userStorage = new UserStorage(this.DB, this.txQueue)
        this.productStorage = new ProductStorage(this.DB, this.txQueue)
        this.applicationStorage = new ApplicationStorage(this.DB, this.userStorage, this.txQueue)
        this.paymentStorage = new PaymentStorage(this.DB, this.userStorage, this.txQueue)
        this.metricsStorage = new MetricsStorage(this.settings)
        const executedMetricsMigrations = await this.metricsStorage.Connect(metricsMigrations)
        return { executedMigrations, executedMetricsMigrations };
    }

    StartTransaction(exec: TX<void>) {
        return this.txQueue.PushToQueue({ exec, dbTx: true })
    }
}