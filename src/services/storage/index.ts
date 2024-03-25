import { DataSource, EntityManager } from "typeorm"
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db.js"
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import UserStorage from "./userStorage.js";
import PaymentStorage from "./paymentStorage.js";
import MetricsStorage from "./metricsStorage.js";
import TransactionsQueue, { TX } from "./transactionsQueue.js";
import EventsLogManager, { LoggedEvent } from "./eventsLog.js";
export type StorageSettings = {
    dbSettings: DbSettings
}
export const LoadStorageSettingsFromEnv = (): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv() }
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
        this.eventsLog = new EventsLogManager()
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

    async VerifyEventsLog() {
        const events = await this.eventsLog.GetAllLogs()

        const users: Record<string, { ts: number, updatedBalance: number }> = {}
        for (let i = 0; i < events.length; i++) {
            const e = events[i]
            if (e.type === 'balance_decrement' || e.type === 'balance_increment') {
                users[e.userId] = this.checkUserEntry(e, users[e.userId])
            } else {
                await this.paymentStorage.VerifyDbEvent(e)
            }
        }
        await Promise.all(Object.entries(users).map(async ([userId, u]) => {
            const user = await this.userStorage.GetUser(userId)
            if (user.balance_sats !== u.updatedBalance) {
                throw new Error("sanity check on balance failed, expected: " + u.updatedBalance + " found: " + user.balance_sats)
            }
        }))
    }

    checkUserEntry(e: LoggedEvent, u: { ts: number, updatedBalance: number } | undefined) {
        const newEntry = { ts: e.timestampMs, updatedBalance: e.balance + e.amount * (e.type === 'balance_decrement' ? -1 : 1) }
        if (!u) {
            return newEntry
        }
        if (e.timestampMs < u.ts) {
            throw new Error("entry out of order " + e.timestampMs + " " + u.ts)
        }
        if (e.balance !== u.updatedBalance) {
            throw new Error("inconsistent balance update got: " + e.balance + " expected " + u.updatedBalance)
        }
        return newEntry
    }

    StartTransaction(exec: TX<void>, description?: string) {
        return this.txQueue.PushToQueue({ exec, dbTx: true, description })
    }
}