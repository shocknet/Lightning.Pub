import { DataSource, EntityManager } from "typeorm"
import crypto from 'crypto';
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db"
import { User } from "./entity/User"
import { UserAddress } from "./entity/UserAddress";
import { UserInvoice } from "./entity/UserInvoice";
import { AddressTransaction } from "./entity/AddressTransaction";
import { UserPayment } from "./entity/UserPayment";
export type StorageSettings = {
    dbSettings: DbSettings
}
export const LoadStorageSettingsFromEnv = (test = false): StorageSettings => {
    return { dbSettings: LoadDbSettingsFromEnv(test) }
}

export default class {
    DB: DataSource | EntityManager
    settings: StorageSettings
    constructor(settings: StorageSettings) {
        this.settings = settings
    }
    async Connect() {
        this.DB = await NewDB(this.settings.dbSettings)
    }
    StartTransaction(exec: (entityManager: EntityManager) => Promise<void>) {
        this.DB.transaction(exec)
    }
    async AddUser(name: string, callbackUrl: string, secret: string, entityManager = this.DB): Promise<User> {
        const newUser = entityManager.getRepository(User).create({
            user_id: crypto.randomBytes(32).toString('hex'),
            name: name,
            callbackUrl: callbackUrl,
            secret_sha256: crypto.createHash('sha256').update(secret).digest('base64')
        })
        return entityManager.getRepository(User).save(newUser)
    }
    FindUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).findOne({
            where: {
                user_id: userId
            }
        })
    }
    async GetUser(userId: string, entityManager = this.DB): Promise<User> {
        const user = await this.FindUser(userId, entityManager)
        if (!user) {
            throw new Error(`user ${userId} not found`) // TODO: fix logs doxing
        }
        return user
    }

    async AddAddressTransaction(address: string, txHash: string, outputIndex: number, amount: number, entityManager = this.DB) {
        const newAddressTransaction = entityManager.getRepository(AddressTransaction).create({
            user_address: { address: address },
            tx_hash: txHash,
            output_index: outputIndex,
            amount: amount
        })
        return entityManager.getRepository(AddressTransaction).save(newAddressTransaction)
    }

    async AddUserAddress(userId: string, address: string, callbackUrl = "", entityManager = this.DB): Promise<UserAddress> {
        const newUserAddress = entityManager.getRepository(UserAddress).create({
            address,
            callbackUrl,
            user: { user_id: userId }
        })
        return entityManager.getRepository(UserAddress).save(newUserAddress)
    }

    async FlagInvoiceAsPaid(invoiceSerialId: number, amount: number, entityManager = this.DB) {
        return entityManager.getRepository(UserInvoice).update(invoiceSerialId, { paid: true, settle_amount: amount })
    }

    async AddUserInvoice(userId: string, invoice: string, callbackUrl = "", entityManager = this.DB): Promise<UserInvoice> {
        const newUserInvoice = entityManager.getRepository(UserInvoice).create({
            invoice: invoice,
            callbackUrl,
            user: { user_id: userId }
        })
        return entityManager.getRepository(UserInvoice).save(newUserInvoice)
    }

    async GetAddressOwner(address: string, entityManager = this.DB): Promise<UserAddress | null> {
        return entityManager.getRepository(UserAddress).findOne({
            where: {
                address
            }
        })
    }

    async GetInvoiceOwner(paymentRequest: string, entityManager = this.DB): Promise<UserInvoice | null> {
        return entityManager.getRepository(UserInvoice).findOne({
            where: {
                invoice: paymentRequest
            }
        })
    }

    async AddUserPayment(userId: string, invoice: string, amount: number, entityManager = this.DB): Promise<UserPayment> {
        const newPayment = entityManager.getRepository(UserPayment).create({
            user: { user_id: userId },
            amount,
            invoice
        })
        return entityManager.getRepository(UserPayment).save(newPayment)
    }

    LockUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: true })
    }
    UnlockUser(userId: string, entityManager = this.DB) {
        return entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: false })
    }
    async IncrementUserBalance(userId: string, increment: number, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).increment({
            user_id: userId,
        }, "balance_sats", increment)
        if (!res.affected) {
            throw new Error("unaffected balance increment for " + userId) // TODO: fix logs doxing
        }
    }
    async DecrementUserBalance(userId: string, decrement: number, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).decrement({
            user_id: userId,
        }, "balance_sats", decrement)
        if (!res.affected) {
            throw new Error("unaffected balance decrement for " + userId) // TODO: fix logs doxing
        }
    }
}