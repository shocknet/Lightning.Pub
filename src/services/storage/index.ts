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
    async AddUser(entityManager = this.DB): Promise<User> {

        const newUser = entityManager.getRepository(User).create({
            user_id: crypto.randomBytes(32).toString('hex')
        })
        return entityManager.getRepository(User).save(newUser)
    }
    async AddBasicUser(name: string, secret: string): Promise<UserBasicAuth> {
        return this.DB.transaction(async tx => {
            const user = await this.AddUser(tx)
            const newUserAuth = tx.getRepository(UserBasicAuth).create({
                user: user,
                name: name,
                secret_sha256: crypto.createHash('sha256').update(secret).digest('base64')
            })
            return tx.getRepository(UserBasicAuth).save(newUserAuth)
        })

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

    async FindNostrUser(nostrPub: string, entityManager = this.DB): Promise<UserNostrAuth | null> {
        return entityManager.getRepository(UserNostrAuth).findOne({
            where: { nostr_pub: nostrPub }
        })

    }
    async AddNostrUser(nostrPub: string): Promise<UserNostrAuth> {
        return this.DB.transaction(async tx => {
            const user = await this.AddUser(tx)
            const newAuth = tx.getRepository(UserNostrAuth).create({
                user: user,
                nostr_pub: nostrPub
            })
            return tx.getRepository(UserNostrAuth).save(newAuth)
        })

    }

    async AddAddressReceivingTransaction(address: UserReceivingAddress, txHash: string, outputIndex: number, amount: number, serviceFee: number, entityManager = this.DB) {
        const newAddressTransaction = entityManager.getRepository(AddressReceivingTransaction).create({
            user_address: address,
            tx_hash: txHash,
            output_index: outputIndex,
            paid_amount: amount,
            service_fee: serviceFee,
            paid_at_unix: Math.floor(Date.now() / 1000)
        })
        return entityManager.getRepository(AddressReceivingTransaction).save(newAddressTransaction)
    }

    GetUserReceivingTransactions(userId: string, fromIndex: number, entityManager = this.DB): Promise<AddressReceivingTransaction[]> {
        return entityManager.getRepository(AddressReceivingTransaction).find({
            where: {
                user_address: { user: { user_id: userId } },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'DESC'
            }
        })
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
        return entityManager.getRepository(UserReceivingInvoice).update(invoice.serial_id, { paid_at_unix: Math.floor(Date.now() / 1000), paid_amount: amount, service_fee: serviceFee })
    }

    GetUserInvoicesFlaggedAsPaid(userId: string, fromIndex: number, entityManager = this.DB): Promise<UserReceivingInvoice[]> {
        return entityManager.getRepository(UserReceivingInvoice).find({
            where: {
                user: {
                    user_id: userId
                },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'DESC'
            }
        })
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
            paid_amount: amount,
            invoice,
            routing_fees: routingFees,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000)
        })
        return entityManager.getRepository(UserInvoicePayment).save(newPayment)
    }

    GetUserInvoicePayments(userId: string, fromIndex: number, entityManager = this.DB): Promise<UserInvoicePayment[]> {
        return entityManager.getRepository(UserInvoicePayment).find({
            where: {
                user: {
                    user_id: userId
                },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'DESC'
            }
        })
    }

    async AddUserTransactionPayment(userId: string, address: string, txHash: string, txOutput: number, amount: number, chainFees: number, serviceFees: number, entityManager = this.DB): Promise<UserTransactionPayment> {
        const newTx = entityManager.getRepository(UserTransactionPayment).create({
            user: await this.GetUser(userId),
            address,
            paid_amount: amount,
            chain_fees: chainFees,
            output_index: txOutput,
            tx_hash: txHash,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000)
        })
        return entityManager.getRepository(UserTransactionPayment).save(newTx)
    }

    GetUserTransactionPayments(userId: string, fromIndex: number, entityManager = this.DB): Promise<UserTransactionPayment[]> {
        return entityManager.getRepository(UserTransactionPayment).find({
            where: {
                user: {
                    user_id: userId
                },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'DESC'
            }
        })
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

    async AddUserEphemeralKey(userId: string, keyType: EphemeralKeyType, entityManager = this.DB): Promise<UserEphemeralKey> {
        const newKey = entityManager.getRepository(UserEphemeralKey).create({
            user: await this.GetUser(userId, entityManager),
            key: crypto.randomBytes(31).toString('hex'),
            type: keyType
        })
        return entityManager.getRepository(UserEphemeralKey).save(newKey)
    }

    async UseUserEphemeralKey(key: string, keyType: EphemeralKeyType, entityManager = this.DB): Promise<UserEphemeralKey> {
        const found = await entityManager.getRepository(UserEphemeralKey).findOne({
            where: {
                key: key,
                type: keyType
            }
        })
        if (!found) {
            throw new Error("the provided ephemeral key is invalid")
        }
        await entityManager.getRepository(UserEphemeralKey).delete(found.serial_id)
        return found
    }
}