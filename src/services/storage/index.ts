import { DataSource, EntityManager } from "typeorm"
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db.js"
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import UserStorage from "./userStorage.js";
import PaymentStorage from "./paymentStorage.js";
import MetricsStorage from "./metricsStorage.js";
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import EventsLogManager from "./eventsLog.js";
export type StorageSettings = {
    dbSettings: DbSettings
    eventLogPath: string
}
export const LoadStorageSettingsFromEnv = (): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(), eventLogPath: "logs/eventLogV2.csv" }
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
    eventsLog: EventsLogManager
    constructor(settings: StorageSettings) {
        this.settings = settings
        this.eventsLog = new EventsLogManager(settings.eventLogPath)
    }
    async Connect(migrations: Function[], metricsMigrations: Function[]) {
        const { source, executedMigrations } = await NewDB(this.settings.dbSettings, migrations)
        this.DB = source
        this.txQueue = new TransactionsQueue("main", this.DB)
        this.userStorage = new UserStorage(this.DB, this.txQueue, this.eventsLog)
        this.productStorage = new ProductStorage(this.DB, this.txQueue)
        this.applicationStorage = new ApplicationStorage(this.DB, this.userStorage, this.txQueue)
        this.paymentStorage = new PaymentStorage(this.DB, this.userStorage, this.txQueue)
        this.metricsStorage = new MetricsStorage(this.settings)
        const executedMetricsMigrations = await this.metricsStorage.Connect(metricsMigrations)
        return { executedMigrations, executedMetricsMigrations };
    }

    StartTransaction<T>(exec: TX<T>, description?: string) {
        return this.txQueue.PushToQueue({ exec, dbTx: true, description })
    }
}