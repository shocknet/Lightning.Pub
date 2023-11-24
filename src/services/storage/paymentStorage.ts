import crypto from 'crypto';
import { DataSource, EntityManager, MoreThan, MoreThanOrEqual } from "typeorm"
import { User } from './entity/User.js';
import { UserTransactionPayment } from './entity/UserTransactionPayment.js';
import { EphemeralKeyType, UserEphemeralKey } from './entity/UserEphemeralKey.js';
import { UserReceivingInvoice, ZapInfo } from './entity/UserReceivingInvoice.js';
import { UserReceivingAddress } from './entity/UserReceivingAddress.js';
import { Product } from './entity/Product.js';
import UserStorage from './userStorage.js';
import { AddressReceivingTransaction } from './entity/AddressReceivingTransaction.js';
import { UserInvoicePayment } from './entity/UserInvoicePayment.js';
import { UserToUserPayment } from './entity/UserToUserPayment.js';
import { Application } from './entity/Application.js';
export type InboundOptionals = { product?: Product, callbackUrl?: string, expiry: number, expectedPayer?: User, linkedApplication?: Application, zapInfo?: ZapInfo }
export const defaultInvoiceExpiry = 60 * 60
export default class {
    DB: DataSource | EntityManager
    userStorage: UserStorage
    constructor(DB: DataSource | EntityManager, userStorage: UserStorage) {
        this.DB = DB
        this.userStorage = userStorage
    }
    async AddAddressReceivingTransaction(address: UserReceivingAddress, txHash: string, outputIndex: number, amount: number, serviceFee: number, internal: boolean, height: number, entityManager = this.DB) {
        const newAddressTransaction = entityManager.getRepository(AddressReceivingTransaction).create({
            user_address: address,
            tx_hash: txHash,
            output_index: outputIndex,
            paid_amount: amount,
            service_fee: serviceFee,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal,
            broadcast_height: height,
            confs: internal ? 10 : 0
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



    async AddUserAddress(userId: string, address: string, opts: { callbackUrl?: string, linkedApplication?: Application } = {}, entityManager = this.DB): Promise<UserReceivingAddress> {
        const newUserAddress = entityManager.getRepository(UserReceivingAddress).create({
            address,
            callbackUrl: opts.callbackUrl || "",
            linkedApplication: opts.linkedApplication,
            user: await this.userStorage.GetUser(userId, entityManager)
        })
        return entityManager.getRepository(UserReceivingAddress).save(newUserAddress)
    }

    async FlagInvoiceAsPaid(invoice: UserReceivingInvoice, amount: number, serviceFee: number, internal: boolean, entityManager = this.DB) {
        const i: Partial<UserReceivingInvoice> = { paid_at_unix: Math.floor(Date.now() / 1000), paid_amount: amount, service_fee: serviceFee, internal }
        if (!internal) {
            i.paidByLnd = true
        }
        return entityManager.getRepository(UserReceivingInvoice).update(invoice.serial_id, i)
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

    async AddUserInvoice(user: User, invoice: string, options: InboundOptionals = { expiry: defaultInvoiceExpiry }, entityManager = this.DB): Promise<UserReceivingInvoice> {
        const newUserInvoice = entityManager.getRepository(UserReceivingInvoice).create({
            invoice: invoice,
            callbackUrl: options.callbackUrl,
            user: user,
            product: options.product,
            expires_at_unix: Math.floor(Date.now() / 1000) + options.expiry,
            payer: options.expectedPayer,
            linkedApplication: options.linkedApplication,
            zap_info: options.zapInfo
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

    async AddUserInvoicePayment(userId: string, invoice: string, amount: number, routingFees: number, serviceFees: number, internal: boolean, entityManager = this.DB): Promise<UserInvoicePayment> {
        const newPayment = entityManager.getRepository(UserInvoicePayment).create({
            user: await this.userStorage.GetUser(userId),
            paid_amount: amount,
            invoice,
            routing_fees: routingFees,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal
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

    async AddUserTransactionPayment(userId: string, address: string, txHash: string, txOutput: number, amount: number, chainFees: number, serviceFees: number, internal: boolean, height: number, entityManager = this.DB): Promise<UserTransactionPayment> {
        const newTx = entityManager.getRepository(UserTransactionPayment).create({
            user: await this.userStorage.GetUser(userId),
            address,
            paid_amount: amount,
            chain_fees: chainFees,
            output_index: txOutput,
            tx_hash: txHash,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal,
            broadcast_height: height,
            confs: internal ? 10 : 0
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

    async GetPendingTransactions(entityManager = this.DB) {
        const incoming = await entityManager.getRepository(AddressReceivingTransaction).find({ where: { confs: 0 } })
        const outgoing = await entityManager.getRepository(UserTransactionPayment).find({ where: { confs: 0 } })
        return { incoming, outgoing }
    }

    async UpdateAddressReceivingTransaction(serialId: number, update: Partial<AddressReceivingTransaction>, entityManager = this.DB) {
        await entityManager.getRepository(AddressReceivingTransaction).update(serialId, update)
    }
    async UpdateUserTransactionPayment(serialId: number, update: Partial<UserTransactionPayment>, entityManager = this.DB) {
        await entityManager.getRepository(UserTransactionPayment).update(serialId, update)
    }


    async AddUserEphemeralKey(userId: string, keyType: EphemeralKeyType, linkedApplication: Application, entityManager = this.DB): Promise<UserEphemeralKey> {
        const found = await entityManager.getRepository(UserEphemeralKey).findOne({ where: { type: keyType, user: { user_id: userId }, linkedApplication: { app_id: linkedApplication.app_id } } })
        if (found) {
            return found
        }
        const newKey = entityManager.getRepository(UserEphemeralKey).create({
            user: await this.userStorage.GetUser(userId, entityManager),
            key: crypto.randomBytes(31).toString('hex'),
            type: keyType,
            linkedApplication
        })
        return entityManager.getRepository(UserEphemeralKey).save(newKey)
    }

    async UseUserEphemeralKey(key: string, keyType: EphemeralKeyType, persist = false, entityManager = this.DB): Promise<UserEphemeralKey> {
        const found = await entityManager.getRepository(UserEphemeralKey).findOne({
            where: {
                key: key,
                type: keyType
            }
        })
        if (!found) {
            throw new Error("the provided ephemeral key is invalid")
        }
        if (!persist) {
            await entityManager.getRepository(UserEphemeralKey).delete(found.serial_id)
        }
        return found
    }

    async AddUserToUserPayment(fromUserId: string, toUserId: string, amount: number, fee: number, entityManager = this.DB) {
        const newKey = entityManager.getRepository(UserToUserPayment).create({
            from_user: await this.userStorage.GetUser(fromUserId, entityManager),
            to_user: await this.userStorage.GetUser(toUserId, entityManager),
            paid_at_unix: Math.floor(Date.now() / 1000),
            paid_amount: amount,
            service_fees: fee
        })
        return entityManager.getRepository(UserToUserPayment).save(newKey)
    }

    GetUserToUserReceivedPayments(userId: string, fromIndex: number, entityManager = this.DB) {
        return entityManager.getRepository(UserToUserPayment).find({
            where: {
                to_user: {
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

    GetUserToUserSentPayments(userId: string, fromIndex: number, entityManager = this.DB) {
        return entityManager.getRepository(UserToUserPayment).find({
            where: {
                from_user: {
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

}