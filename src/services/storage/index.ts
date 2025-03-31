import fs from 'fs'
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db/db.js"
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import UserStorage from "./userStorage.js";
import PaymentStorage from "./paymentStorage.js";
import MetricsStorage from "./metricsStorage.js";
import MetricsEventStorage from "./tlv/metricsEventStorage.js";
import EventsLogManager from "./eventsLog.js";
import { LiquidityStorage } from "./liquidityStorage.js";
import DebitStorage from "./debitStorage.js"
import OfferStorage from "./offerStorage.js"
import { StorageInterface, TX } from "./db/storageInterface.js";
import { PubLogger } from "../helpers/logger.js"
import { TlvStorageFactory } from './tlv/tlvFilesStorageFactory.js';
export type StorageSettings = {
    dbSettings: DbSettings
    eventLogPath: string
    dataDir: string
}
export const LoadStorageSettingsFromEnv = (): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(), eventLogPath: "logs/eventLogV3.csv", dataDir: process.env.DATA_DIR || "" }
}
export default class {
    //DB: DataSource | EntityManager
    settings: StorageSettings
    //txQueue: TransactionsQueue
    dbs: StorageInterface
    productStorage: ProductStorage
    applicationStorage: ApplicationStorage
    userStorage: UserStorage
    paymentStorage: PaymentStorage
    metricsStorage: MetricsStorage
    metricsEventStorage: MetricsEventStorage
    liquidityStorage: LiquidityStorage
    debitStorage: DebitStorage
    offerStorage: OfferStorage
    eventsLog: EventsLogManager
    constructor(settings: StorageSettings) {
        this.settings = settings
        this.eventsLog = new EventsLogManager(settings.eventLogPath)
    }
    async Connect(log: PubLogger, tlvStorageFactory: TlvStorageFactory) {
        this.dbs = new StorageInterface()
        await this.dbs.Connect(this.settings.dbSettings, 'main')
        //const { source, executedMigrations } = await NewDB(this.settings.dbSettings, allMigrations)
        //this.DB = source
        //this.txQueue = new TransactionsQueue("main", this.DB)
        this.userStorage = new UserStorage(this.dbs, this.eventsLog)
        this.productStorage = new ProductStorage(this.dbs)
        this.applicationStorage = new ApplicationStorage(this.dbs, this.userStorage)
        this.paymentStorage = new PaymentStorage(this.dbs, this.userStorage)
        this.metricsStorage = new MetricsStorage(this.settings)
        this.metricsEventStorage = new MetricsEventStorage(this.settings, tlvStorageFactory)
        this.liquidityStorage = new LiquidityStorage(this.dbs)
        this.debitStorage = new DebitStorage(this.dbs)
        this.offerStorage = new OfferStorage(this.dbs)
        try { if (this.settings.dataDir) fs.mkdirSync(this.settings.dataDir) } catch (e) { }
        /* const executedMetricsMigrations = */ await this.metricsStorage.Connect()
        /*         if (executedMigrations.length > 0) {
                    log(executedMigrations.length, "new migrations executed")
                    log("-------------------")
        
                }  */
        /*         if (executedMetricsMigrations.length > 0) {
                    log(executedMetricsMigrations.length, "new metrics migrations executed")
                    log("-------------------")
                } */
    }

    Stop() {
        this.dbs.disconnect()
    }

    StartTransaction<T>(exec: TX<T>, description?: string) {
        return this.dbs.Tx(tx => exec(tx), description)
    }
}