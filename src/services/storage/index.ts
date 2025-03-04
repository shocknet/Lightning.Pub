/// <reference types="node" />
/// <reference types="typeorm" />
import { DataSource, EntityManager } from "typeorm"
import fs from 'fs'
import { DbSettings, LoadDbSettingsFromEnv } from "./db.js"
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import UserStorage from "./userStorage.js"
import PaymentStorage from "./paymentStorage.js"
import MetricsStorage from "./metricsStorage.js"
import MetricsEventStorage from "./metricsEventStorage.js"
import TransactionsQueue, { TX } from "./transactionsQueue.js"
import EventsLogManager from "./eventsLog.js"
import { LiquidityStorage } from "./liquidityStorage.js"
import { StateBundler } from "./stateBundler.js"
import DebitStorage from "./debitStorage.js"
import OfferStorage from "./offerStorage.js"
import { DbProxy, IDbOperations } from "./dbProxy.js"
import { User } from './entity/User.js'
import { UserReceivingInvoice } from './entity/UserReceivingInvoice.js'
import { UserReceivingAddress } from './entity/UserReceivingAddress.js'
import { AddressReceivingTransaction } from './entity/AddressReceivingTransaction.js'
import { UserInvoicePayment } from './entity/UserInvoicePayment.js'
import { UserTransactionPayment } from './entity/UserTransactionPayment.js'
import { UserBasicAuth } from './entity/UserBasicAuth.js'
import { UserEphemeralKey } from './entity/UserEphemeralKey.js'
import { Product } from './entity/Product.js'
import { UserToUserPayment } from './entity/UserToUserPayment.js'
import { Application } from './entity/Application.js'
import { ApplicationUser } from './entity/ApplicationUser.js'
import { LspOrder } from './entity/LspOrder.js'
import { LndNodeInfo } from './entity/LndNodeInfo.js'
import { TrackedProvider } from './entity/TrackedProvider.js'
import { InviteToken } from './entity/InviteToken.js'
import { DebitAccess } from './entity/DebitAccess.js'
import { UserOffer } from './entity/UserOffer.js'

export type StorageSettings = {
    dbSettings: DbSettings
    eventLogPath: string
    dataDir: string
}

export const LoadStorageSettingsFromEnv = (): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(), eventLogPath: "logs/eventLogV3.csv", dataDir: process.env.DATA_DIR || "" }
}

type DbType = DataSource | EntityManager | IDbOperations

export default class {
    DB: DbType
    settings: StorageSettings
    txQueue: TransactionsQueue
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
    stateBundler: StateBundler

    constructor(settings: StorageSettings) {
        this.settings = settings
        this.eventsLog = new EventsLogManager(settings.eventLogPath)
    }

    async Connect(migrations: Function[], metricsMigrations: Function[]) {
        this.DB = new DbProxy()
        await this.DB.initialize(this.settings.dbSettings, [
            User, UserReceivingInvoice, UserReceivingAddress, AddressReceivingTransaction, 
            UserInvoicePayment, UserTransactionPayment, UserBasicAuth, UserEphemeralKey, 
            Product, UserToUserPayment, Application, ApplicationUser, UserToUserPayment, 
            LspOrder, LndNodeInfo, TrackedProvider, InviteToken, DebitAccess, UserOffer
        ], migrations)

        this.txQueue = new TransactionsQueue("main", this.DB)
        this.userStorage = new UserStorage(this.DB, this.txQueue, this.eventsLog)
        this.productStorage = new ProductStorage(this.DB, this.txQueue)
        this.applicationStorage = new ApplicationStorage(this.DB, this.userStorage, this.txQueue)
        this.paymentStorage = new PaymentStorage(this.DB, this.userStorage, this.txQueue)
        this.metricsStorage = new MetricsStorage(this.settings)
        this.metricsEventStorage = new MetricsEventStorage(this.settings)
        this.liquidityStorage = new LiquidityStorage(this.DB, this.txQueue)
        this.debitStorage = new DebitStorage(this.DB, this.txQueue)
        this.offerStorage = new OfferStorage(this.DB, this.txQueue)

        try { 
            if (this.settings.dataDir) fs.mkdirSync(this.settings.dataDir) 
        } catch (e) { }

        const executedMetricsMigrations = await this.metricsStorage.Connect(metricsMigrations)
        return { executedMigrations: [], executedMetricsMigrations }
    }

    StartTransaction<T>(exec: TX<T>, description?: string) {
        if ('StartTransaction' in this.DB) {
            return this.DB.StartTransaction(exec, description)
        } else if (this.DB instanceof DataSource) {
            return this.txQueue.PushToQueue({ exec, dbTx: true, description })
        }
        throw new Error('Database does not support transactions')
    }

    async close() {
        if ('close' in this.DB) {
            await this.DB.close()
        }
    }
}