import crypto from 'crypto';
import { Between, DataSource, EntityManager, FindOperator, IsNull, LessThanOrEqual, MoreThan, MoreThanOrEqual } from "typeorm"
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
import TransactionsQueue, { TX } from "./transactionsQueue.js";
export type InboundOptionals = { product?: Product, callbackUrl?: string, expiry: number, expectedPayer?: User, linkedApplication?: Application, zapInfo?: ZapInfo }
export const defaultInvoiceExpiry = 60 * 60
export default class {
    DB: DataSource | EntityManager
    userStorage: UserStorage
    txQueue: TransactionsQueue
    constructor(DB: DataSource | EntityManager, userStorage: UserStorage, txQueue: TransactionsQueue) {
        this.DB = DB
        this.userStorage = userStorage
        this.txQueue = txQueue
    }
    async AddAddressReceivingTransaction(address: UserReceivingAddress, txHash: string, outputIndex: number, amount: number, serviceFee: number, internal: boolean, height: number, dbTx: EntityManager | DataSource) {
        const newAddressTransaction = dbTx.getRepository(AddressReceivingTransaction).create({
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
        return dbTx.getRepository(AddressReceivingTransaction).save(newAddressTransaction)
    }

    GetUserReceivingTransactions(userId: string, fromIndex: number, take = 50, entityManager = this.DB): Promise<AddressReceivingTransaction[]> {
        return entityManager.getRepository(AddressReceivingTransaction).find({
            where: {
                user_address: { user: { user_id: userId } },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'DESC'
            },
            take
        })
    }

    async GetExistingUserAddress(userId: string, linkedApplication: Application, entityManager = this.DB) {
        return entityManager.getRepository(UserReceivingAddress).findOne({ where: { user: { user_id: userId }, linkedApplication: { app_id: linkedApplication.app_id } } })
    }

    async AddUserAddress(userId: string, address: string, opts: { callbackUrl?: string, linkedApplication?: Application } = {}): Promise<UserReceivingAddress> {
        const newUserAddress = this.DB.getRepository(UserReceivingAddress).create({
            address,
            callbackUrl: opts.callbackUrl || "",
            linkedApplication: opts.linkedApplication,
            user: await this.userStorage.GetUser(userId)
        })
        return this.txQueue.PushToQueue<UserReceivingAddress>({ exec: async db => db.getRepository(UserReceivingAddress).save(newUserAddress), dbTx: false, description: `add address for ${userId} linked to ${opts.linkedApplication?.app_id}: ${address} ` })
    }

    async FlagInvoiceAsPaid(invoice: UserReceivingInvoice, amount: number, serviceFee: number, internal: boolean, entityManager = this.DB) {
        const i: Partial<UserReceivingInvoice> = { paid_at_unix: Math.floor(Date.now() / 1000), paid_amount: amount, service_fee: serviceFee, internal }
        if (!internal) {
            i.paidByLnd = true
        }
        return entityManager.getRepository(UserReceivingInvoice).update(invoice.serial_id, i)
    }

    GetUserInvoicesFlaggedAsPaid(userId: string, fromIndex: number, take = 50, entityManager = this.DB): Promise<UserReceivingInvoice[]> {
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
            },
            take
        })
    }

    async AddUserInvoice(user: User, invoice: string, options: InboundOptionals = { expiry: defaultInvoiceExpiry }): Promise<UserReceivingInvoice> {
        const newUserInvoice = this.DB.getRepository(UserReceivingInvoice).create({
            invoice: invoice,
            callbackUrl: options.callbackUrl,
            user: user,
            product: options.product,
            expires_at_unix: Math.floor(Date.now() / 1000) + options.expiry,
            payer: options.expectedPayer,
            linkedApplication: options.linkedApplication,
            zap_info: options.zapInfo
        })
        return this.txQueue.PushToQueue<UserReceivingInvoice>({ exec: async db => db.getRepository(UserReceivingInvoice).save(newUserInvoice), dbTx: false, description: `add invoice for ${user.user_id} linked to ${options.linkedApplication?.app_id}: ${invoice} ` })
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

    async AddUserInvoicePayment(userId: string, invoice: string, amount: number, routingFees: number, serviceFees: number, internal: boolean, linkedApplication: Application): Promise<UserInvoicePayment> {
        const newPayment = this.DB.getRepository(UserInvoicePayment).create({
            user: await this.userStorage.GetUser(userId),
            paid_amount: amount,
            invoice,
            routing_fees: routingFees,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal,
            linkedApplication
        })
        return this.txQueue.PushToQueue<UserInvoicePayment>({ exec: async db => db.getRepository(UserInvoicePayment).save(newPayment), dbTx: false, description: `add invoice payment for ${userId} linked to ${linkedApplication.app_id}: ${invoice}, amt: ${amount} ` })
    }

    GetUserInvoicePayments(userId: string, fromIndex: number, take = 50, entityManager = this.DB): Promise<UserInvoicePayment[]> {
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
            },
            take
        })
    }

    async AddUserTransactionPayment(userId: string, address: string, txHash: string, txOutput: number, amount: number, chainFees: number, serviceFees: number, internal: boolean, height: number, linkedApplication: Application): Promise<UserTransactionPayment> {
        const newTx = this.DB.getRepository(UserTransactionPayment).create({
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
            confs: internal ? 10 : 0,
            linkedApplication
        })
        return this.txQueue.PushToQueue<UserTransactionPayment>({ exec: async db => db.getRepository(UserTransactionPayment).save(newTx), dbTx: false, description: `add tx payment for ${userId} linked to ${linkedApplication.app_id}: ${address}, amt: ${amount} ` })
    }

    GetUserTransactionPayments(userId: string, fromIndex: number, take = 50, entityManager = this.DB): Promise<UserTransactionPayment[]> {
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
            },
            take
        })
    }

    async GetPendingTransactions(entityManager = this.DB) {
        const incoming = await entityManager.getRepository(AddressReceivingTransaction).find({ where: { confs: 0 } })
        const outgoing = await entityManager.getRepository(UserTransactionPayment).find({ where: { confs: 0 } })
        return { incoming, outgoing }
    }

    async UpdateAddressReceivingTransaction(serialId: number, update: Partial<AddressReceivingTransaction>, entityManager = this.DB) {
        return entityManager.getRepository(AddressReceivingTransaction).update(serialId, update)
    }
    async UpdateUserTransactionPayment(serialId: number, update: Partial<UserTransactionPayment>, entityManager = this.DB) {
        await entityManager.getRepository(UserTransactionPayment).update(serialId, update)
    }


    async AddUserEphemeralKey(userId: string, keyType: EphemeralKeyType, linkedApplication: Application): Promise<UserEphemeralKey> {
        const found = await this.DB.getRepository(UserEphemeralKey).findOne({ where: { type: keyType, user: { user_id: userId }, linkedApplication: { app_id: linkedApplication.app_id } } })
        if (found) {
            return found
        }
        const newKey = this.DB.getRepository(UserEphemeralKey).create({
            user: await this.userStorage.GetUser(userId),
            key: crypto.randomBytes(31).toString('hex'),
            type: keyType,
            linkedApplication
        })
        return this.txQueue.PushToQueue<UserEphemeralKey>({ exec: async db => db.getRepository(UserEphemeralKey).save(newKey), dbTx: false })
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

    async AddUserToUserPayment(fromUserId: string, toUserId: string, amount: number, fee: number, linkedApplication: Application, dbTx: DataSource | EntityManager) {
        const newKey = dbTx.getRepository(UserToUserPayment).create({
            from_user: await this.userStorage.GetUser(fromUserId),
            to_user: await this.userStorage.GetUser(toUserId),
            paid_at_unix: Math.floor(Date.now() / 1000),
            paid_amount: amount,
            service_fees: fee,
            linkedApplication
        })
        return dbTx.getRepository(UserToUserPayment).save(newKey)
    }

    GetUserToUserReceivedPayments(userId: string, fromIndex: number, take = 50, entityManager = this.DB) {
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
            },
            take
        })
    }

    GetUserToUserSentPayments(userId: string, fromIndex: number, take = 50, entityManager = this.DB) {
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
            },
            take
        })
    }

    async GetTotalFeesPaidInApp(app: Application | null, entityManager = this.DB) {
        if (!app) {
            return 0
        }
        const entries = await Promise.all([
            entityManager.getRepository(UserReceivingInvoice).sum("service_fee", { linkedApplication: { app_id: app.app_id } }),
            entityManager.getRepository(AddressReceivingTransaction).sum("service_fee", { user_address: { linkedApplication: { app_id: app.app_id } } }),
            entityManager.getRepository(UserInvoicePayment).sum("service_fees", { linkedApplication: { app_id: app.app_id } }),
            entityManager.getRepository(UserTransactionPayment).sum("service_fees", { linkedApplication: { app_id: app.app_id } }),
            entityManager.getRepository(UserToUserPayment).sum("service_fees", { linkedApplication: { app_id: app.app_id } })
        ])
        let total = 0
        entries.forEach(e => {
            if (e) {
                total += e
            }
        })
        return total
    }

    async GetAppOperations(application: Application | null, { from, to }: { from?: number, to?: number }, entityManager = this.DB) {
        const q = application ? { app_id: application.app_id } : IsNull()
        let time: { created_at?: FindOperator<Date> } = {}
        if (!!from && !!to) {
            time.created_at = Between<Date>(new Date(from * 1000), new Date(to * 1000))
        } else if (!!from) {
            time.created_at = MoreThanOrEqual<Date>(new Date(from * 1000))
        } else if (!!to) {
            time.created_at = LessThanOrEqual<Date>(new Date(to * 1000))
        }

        const [receivingInvoices, receivingAddresses, outgoingInvoices, outgoingTransactions, userToUser] = await Promise.all([
            entityManager.getRepository(UserReceivingInvoice).find({ where: { linkedApplication: q, ...time } }),
            entityManager.getRepository(UserReceivingAddress).find({ where: { linkedApplication: q, ...time } }),
            entityManager.getRepository(UserInvoicePayment).find({ where: { linkedApplication: q, ...time } }),
            entityManager.getRepository(UserTransactionPayment).find({ where: { linkedApplication: q, ...time } }),
            entityManager.getRepository(UserToUserPayment).find({ where: { linkedApplication: q, ...time } })
        ])
        const receivingTransactions = await Promise.all(receivingAddresses.map(addr => entityManager.getRepository(AddressReceivingTransaction).find({ where: { user_address: { serial_id: addr.serial_id }, ...time } })))
        return {
            receivingInvoices, receivingAddresses, receivingTransactions,
            outgoingInvoices, outgoingTransactions,
            userToUser
        }
    }

    async UserHasOutgoingOperation(userId: string, entityManager = this.DB) {
        const [i, tx, u2u] = await Promise.all([
            entityManager.getRepository(UserInvoicePayment).findOne({ where: { user: { user_id: userId } } }),
            entityManager.getRepository(UserTransactionPayment).findOne({ where: { user: { user_id: userId } } }),
            entityManager.getRepository(UserToUserPayment).findOne({ where: { from_user: { user_id: userId } } }),
        ])
        return !!i || !!tx || !!u2u
    }
}