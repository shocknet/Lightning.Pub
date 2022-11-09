import { DataSource, EntityManager } from "typeorm"
import crypto from 'crypto';
import NewDB, { DbSettings, LoadDbSettingsFromEnv } from "./db"
import { User } from "./entity/User"
import { UserReceivingAddress } from "./entity/UserReceivingAddress";
import { UserReceivingInvoice } from "./entity/UserReceivingInvoice";
import { AddressReceivingTransaction } from "./entity/AddressReceivingTransaction";
import { UserInvoicePayment } from "./entity/UserInvoicePayment";
import { UserTransactionPayment } from "./entity/UserTransactionPayment";
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
        return this.DB.transaction(exec)
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

    async AddAddressReceivingTransaction(address: UserReceivingAddress, txHash: string, outputIndex: number, amount: number, serviceFee: number, entityManager = this.DB) {
        const newAddressTransaction = entityManager.getRepository(AddressReceivingTransaction).create({
            user_address: address,
            tx_hash: txHash,
            output_index: outputIndex,
            amount: amount,
            service_fee: serviceFee
        })
        return entityManager.getRepository(AddressReceivingTransaction).save(newAddressTransaction)
    }

    async AddUserAddress(userId: string, address: string, callbackUrl = "", entityManager = this.DB): Promise<UserReceivingAddress> {
        const newUserAddress = entityManager.getRepository(UserReceivingAddress).create({
            address,
            callbackUrl,
            user: await this.GetUser(userId, entityManager)
        })
        return entityManager.getRepository(UserReceivingAddress).save(newUserAddress)
    }

    async FlagInvoiceAsPaid(invoice: UserReceivingInvoice, amount: number, serviceFee: number, entityManager = this.DB) {
        return entityManager.getRepository(UserReceivingInvoice).update(invoice.serial_id, { paid: true, settle_amount: amount, service_fee: serviceFee })
    }

    async AddUserInvoice(userId: string, invoice: string, callbackUrl = "", entityManager = this.DB): Promise<UserReceivingInvoice> {
        const newUserInvoice = entityManager.getRepository(UserReceivingInvoice).create({
            invoice: invoice,
            callbackUrl,
            user: await this.GetUser(userId, entityManager)
        })
        return entityManager.getRepository(UserReceivingInvoice).save(newUserInvoice)
    }

    async GetAddressOwner(address: string, entityManager = this.DB): Promise<UserReceivingAddress | null> {
        return entityManager.getRepository(UserReceivingAddress).findOne({
            where: {
                address
            }
        })
    }

    async GetInvoiceOwner(paymentRequest: string, entityManager = this.DB): Promise<UserReceivingInvoice | null> {
        return entityManager.getRepository(UserReceivingInvoice).findOne({
            where: {
                invoice: paymentRequest
            }
        })
    }

    async AddUserInvoicePayment(userId: string, invoice: string, amount: number, routingFees: number, serviceFees: number, entityManager = this.DB): Promise<UserInvoicePayment> {
        const newPayment = entityManager.getRepository(UserInvoicePayment).create({
            user: await this.GetUser(userId),
            amount,
            invoice,
            routing_fees: routingFees,
            service_fees: serviceFees
        })
        return entityManager.getRepository(UserInvoicePayment).save(newPayment)
    }

    async AddUserTransactionPayment(userId: string, address: string, txHash: string, txOutput: number, amount: number, chainFees: number, serviceFees: number, entityManager = this.DB): Promise<UserTransactionPayment> {
        const newTx = entityManager.getRepository(UserTransactionPayment).create({
            user: await this.GetUser(userId),
            address,
            amount,
            chain_fees: chainFees,
            output_index: txOutput,
            tx_hash: txHash,
            service_fees: serviceFees
        })
        return entityManager.getRepository(UserTransactionPayment).save(newTx)
    }
    async LockUser(userId: string, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: true })
        if (!res.affected) {
            throw new Error("unaffected user lock for " + userId) // TODO: fix logs doxing
        }
    }
    async UnlockUser(userId: string, entityManager = this.DB) {
        const res = await entityManager.getRepository(User).update({
            user_id: userId
        }, { locked: false })
        if (!res.affected) {
            throw new Error("unaffected user unlock for " + userId) // TODO: fix logs doxing
        }
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