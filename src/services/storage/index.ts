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
import { ManagementStorage } from "./managementStorage.js";
import { StorageInterface, TX } from "./db/storageInterface.js";
import { getLogger, PubLogger } from "../helpers/logger.js"
import { TlvStorageFactory } from './tlv/tlvFilesStorageFactory.js';
import { Utils } from '../helpers/utilsWrapper.js';
import SettingsStorage from "./settingsStorage.js";
import crypto from 'crypto';
export type StorageSettings = {
    dbSettings: DbSettings
    eventLogPath: string
    dataDir: string
    allowResetMetricsStorages: boolean
    walletPasswordPath: string
    walletSecretPath: string
    jwtSecret: string // Secret
}
const getDataPath = (dataDir: string, dataPath: string) => {
    return dataDir !== "" ? `${dataDir}/${dataPath}` : dataPath
}
export const LoadStorageSettingsFromEnv = (): StorageSettings => {
    const dataDir = process.env.DATA_DIR || ""
    return {
        dbSettings: LoadDbSettingsFromEnv(), eventLogPath: "logs/eventLogV3.csv", dataDir,
        allowResetMetricsStorages: process.env.ALLOW_RESET_METRICS_STORAGES === 'true' || false,
        walletSecretPath: process.env.WALLET_SECRET_PATH || getDataPath(dataDir, ".wallet_secret"),
        walletPasswordPath: process.env.WALLET_PASSWORD_PATH || getDataPath(dataDir, ".wallet_password"),
        jwtSecret: loadJwtSecret(dataDir)
    }
}
export const GetTestStorageSettings = (s: StorageSettings): StorageSettings => {
    const eventLogPath = `logs/eventLogV3Test${Date.now()}.csv`
    return {
        ...s,
        dbSettings: { ...s.dbSettings, databaseFile: ":memory:", metricsDatabaseFile: ":memory:" },
        eventLogPath, dataDir: "test-data"
    }
}
export const loadJwtSecret = (dataDir: string): string => {
    const secret = process.env["JWT_SECRET"]
    const log = getLogger({})
    if (secret) {
        return secret
    }
    log("JWT_SECRET not set in env, checking .jwt_secret file")
    const secretPath = getDataPath(dataDir, ".jwt_secret")
    try {
        const fileContent = fs.readFileSync(secretPath, "utf-8")
        return fileContent.trim()
    } catch (e) {
        log(".jwt_secret file not found, generating random secret")
        const secret = crypto.randomBytes(32).toString('hex')
        fs.writeFileSync(secretPath, secret)
        return secret
    }
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
    managementStorage: ManagementStorage
    eventsLog: EventsLogManager
    settingsStorage: SettingsStorage
    utils: Utils
    constructor(settings: StorageSettings, utils: Utils) {
        this.settings = settings
        this.utils = utils
        this.eventsLog = new EventsLogManager(settings.eventLogPath)
    }
    async Connect(log: PubLogger) {
        this.dbs = new StorageInterface(this.utils)
        await this.dbs.Connect(this.settings.dbSettings, 'main')
        //const { source, executedMigrations } = await NewDB(this.settings.dbSettings, allMigrations)
        //this.DB = source
        //this.txQueue = new TransactionsQueue("main", this.DB)
        this.settingsStorage = new SettingsStorage(this.dbs)
        this.userStorage = new UserStorage(this.dbs, this.eventsLog)
        this.productStorage = new ProductStorage(this.dbs)
        this.applicationStorage = new ApplicationStorage(this.dbs, this.userStorage)
        this.paymentStorage = new PaymentStorage(this.dbs, this.userStorage)
        this.metricsStorage = new MetricsStorage(this.settings, this.utils)
        this.metricsEventStorage = new MetricsEventStorage(this.settings, this.utils.tlvStorageFactory)
        this.liquidityStorage = new LiquidityStorage(this.dbs)
        this.debitStorage = new DebitStorage(this.dbs)
        this.offerStorage = new OfferStorage(this.dbs)
        this.managementStorage = new ManagementStorage(this.dbs);
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

    NostrSender() {
        return this.utils.nostrSender
    }

    getStorageSettings(): StorageSettings {
        return this.settings
    }

    Stop() {
        this.dbs.disconnect()
    }

    StartTransaction<T>(exec: TX<T>, description?: string) {
        return this.dbs.Tx(tx => exec(tx), description)
    }
}