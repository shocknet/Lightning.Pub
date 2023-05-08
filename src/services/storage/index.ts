import { DataSource, EntityManager, MoreThan, MoreThanOrEqual } from "typeorm"
import crypto from 'crypto';
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db.js"
import { User } from "./entity/User.js"
import { UserReceivingAddress } from "./entity/UserReceivingAddress.js";
import { UserReceivingInvoice } from "./entity/UserReceivingInvoice.js";
import { AddressReceivingTransaction } from "./entity/AddressReceivingTransaction.js";
import { UserInvoicePayment } from "./entity/UserInvoicePayment.js";
import { UserTransactionPayment } from "./entity/UserTransactionPayment.js";
import { UserNostrAuth } from "./entity/UserNostrAuth.js";
import { UserBasicAuth } from "./entity/UserBasicAuth.js";
import { EphemeralKeyType, UserEphemeralKey } from "./entity/UserEphemeralKey.js";
import ProductStorage from './productStorage.js'
import ApplicationStorage from './applicationStorage.js'
import { Product } from "./entity/Product.js";
import UserStorage from "./userStorage.js";
import PaymentStorage from "./paymentStorage.js";
export type StorageSettings = {
    dbSettings: DbSettings
}
export const LoadStorageSettingsFromEnv = (test = false): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(test) }
}

export default class {
    DB: DataSource | EntityManager
    settings: StorageSettings
    productStorage: ProductStorage
    applicationStorage: ApplicationStorage
    userStorage: UserStorage
    paymentStorage: PaymentStorage
    constructor(settings: StorageSettings) {
        this.settings = settings
    }
    async Connect() {
        this.DB = await NewDB(this.settings.dbSettings)
        this.userStorage = new UserStorage(this.DB)
        this.productStorage = new ProductStorage(this.DB)
        this.applicationStorage = new ApplicationStorage(this.DB, this.userStorage)
        this.paymentStorage = new PaymentStorage(this.DB, this.userStorage)
    }
    StartTransaction(exec: (entityManager: EntityManager) => Promise<void>) {
        return this.DB.transaction(exec)
    }
}