import crypto from 'crypto';
import { Between, FindOperator, IsNull, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not } from "typeorm"
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
import TransactionsQueue from "./transactionsQueue.js";
import { LoggedEvent } from './eventsLog.js';
import { StorageInterface } from './storageInterface.js';
export type InboundOptionals = { product?: Product, callbackUrl?: string, expiry: number, expectedPayer?: User, linkedApplication?: Application, zapInfo?: ZapInfo, offerId?: string, payerData?: Record<string, string> }
export const defaultInvoiceExpiry = 60 * 60
export default class {
    dbs: StorageInterface
    userStorage: UserStorage
    constructor(dbs: StorageInterface, userStorage: UserStorage) {
        this.dbs = dbs
        this.userStorage = userStorage
    }

    async AddAddressReceivingTransaction(address: UserReceivingAddress, txHash: string, outputIndex: number, amount: number, serviceFee: number, internal: boolean, height: number, txId: string) {
        return this.dbs.CreateAndSave<AddressReceivingTransaction>('AddressReceivingTransaction', {
            user_address: address,
            tx_hash: txHash,
            output_index: outputIndex,
            paid_amount: amount,
            service_fee: serviceFee,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal,
            broadcast_height: height,
            confs: internal ? 10 : 0
        }, txId)
    }

    GetUserReceivingTransactions(userId: string, fromIndex: number, take = 50, txId?: string): Promise<AddressReceivingTransaction[]> {
        return this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', {
            where: {
                user_address: { user: { user_id: userId } },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'DESC'
            },
            take
        }, txId)
    }

    async GetExistingUserAddress(userId: string, linkedApplication: Application, txId?: string) {
        return this.dbs.FindOne<UserReceivingAddress>('UserReceivingAddress', { where: { user: { user_id: userId }, linkedApplication: { app_id: linkedApplication.app_id } } }, txId)
    }

    async AddUserAddress(user: User, address: string, opts: { callbackUrl?: string, linkedApplication?: Application } = {}, txId?: string): Promise<UserReceivingAddress> {
        return this.dbs.CreateAndSave<UserReceivingAddress>('UserReceivingAddress', {
            address,
            callbackUrl: opts.callbackUrl || "",
            linkedApplication: opts.linkedApplication,
            user
        }, txId)
    }

    async FlagInvoiceAsPaid(invoice: UserReceivingInvoice, amount: number, serviceFee: number, internal: boolean, txId: string) {
        const i: Partial<UserReceivingInvoice> = { paid_at_unix: Math.floor(Date.now() / 1000), paid_amount: amount, service_fee: serviceFee, internal }
        if (!internal) {
            i.paidByLnd = true
        }
        return this.dbs.Update<UserReceivingInvoice>('UserReceivingInvoice', invoice.serial_id, i, txId)
    }

    GetUserInvoicesFlaggedAsPaid(userId: string, fromIndex: number, take = 50, txId?: string): Promise<UserReceivingInvoice[]> {
        return this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', {
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
        }, txId)
    }

    async AddUserInvoice(user: User, invoice: string, options: InboundOptionals = { expiry: defaultInvoiceExpiry }, providerDestination?: string, txId?: string): Promise<UserReceivingInvoice> {
        return this.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
            invoice: invoice,
            callbackUrl: options.callbackUrl,
            user: user,
            product: options.product,
            expires_at_unix: Math.floor(Date.now() / 1000) + options.expiry,
            payer: options.expectedPayer,
            linkedApplication: options.linkedApplication,
            zap_info: options.zapInfo,
            liquidityProvider: providerDestination,
            offer_id: options.offerId,
            payer_data: options.payerData,
        }, txId)
    }

    async GetAddressOwner(address: string, txId?: string): Promise<UserReceivingAddress | null> {
        return this.dbs.FindOne<UserReceivingAddress>('UserReceivingAddress', { where: { address } }, txId)
    }

    async GetAddressReceivingTransactionOwner(address: string, txHash: string, txId?: string): Promise<AddressReceivingTransaction | null> {
        return this.dbs.FindOne<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { address }, tx_hash: txHash } }, txId)
    }
    async GetUserTransactionPaymentOwner(address: string, txHash: string, txId?: string): Promise<UserTransactionPayment | null> {
        return this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { address, tx_hash: txHash } }, txId)
    }

    async GetInvoiceOwner(paymentRequest: string, txId?: string): Promise<UserReceivingInvoice | null> {
        return this.dbs.FindOne<UserReceivingInvoice>('UserReceivingInvoice', { where: { invoice: paymentRequest } }, txId)
    }
    async GetPaymentOwner(paymentRequest: string, txId?: string): Promise<UserInvoicePayment | null> {
        return this.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', { where: { invoice: paymentRequest } }, txId)
    }
    async GetUser2UserPayment(serialId: number, txId?: string): Promise<UserToUserPayment | null> {
        return this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { serial_id: serialId } }, txId)
    }

    async AddPendingExternalPayment(userId: string, invoice: string, amounts: { payAmount: number, serviceFee: number, networkFee: number }, linkedApplication: Application, liquidityProvider: string | undefined, txId: string, debitNpub?: string): Promise<UserInvoicePayment> {
        const user = await this.userStorage.GetUser(userId)
        return this.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
            user,
            paid_amount: amounts.payAmount,
            invoice,
            routing_fees: amounts.networkFee,
            service_fees: amounts.serviceFee,
            paid_at_unix: 0,
            internal: false,
            linkedApplication,
            liquidityProvider,
            debit_to_pub: debitNpub
        }, txId)
    }

    async GetMaxPaymentIndex(txId?: string) {
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { order: { paymentIndex: 'DESC' }, take: 1 }, txId)
    }

    async SetExternalPaymentIndex(invoicePaymentSerialId: number, index: number, txId?: string) {
        return this.dbs.Update<UserInvoicePayment>('UserInvoicePayment', invoicePaymentSerialId, { paymentIndex: index }, txId)
    }
    async UpdateExternalPayment(invoicePaymentSerialId: number, routingFees: number, serviceFees: number, success: boolean, providerDestination?: string, txId?: string) {
        const up: Partial<UserInvoicePayment> = {
            routing_fees: routingFees,
            service_fees: serviceFees,
            paid_at_unix: success ? Math.floor(Date.now() / 1000) : -1,
        }
        if (providerDestination) {
            up.liquidityProvider = providerDestination
        }
        return this.dbs.Update<UserInvoicePayment>('UserInvoicePayment', invoicePaymentSerialId, up, txId)
    }

    async AddInternalPayment(userId: string, invoice: string, amount: number, serviceFees: number, linkedApplication: Application, debitNpub?: string): Promise<UserInvoicePayment> {
        const user = await this.userStorage.GetUser(userId)
        return this.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
            user: await this.userStorage.GetUser(userId),
            paid_amount: amount,
            invoice,
            routing_fees: 0,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal: true,
            linkedApplication,
            debit_to_pub: debitNpub
        })
    }

    GetUserInvoicePayments(userId: string, fromIndex: number, take = 50, txId?: string): Promise<UserInvoicePayment[]> {
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', {
            where: {
                user: {
                    user_id: userId
                },
                serial_id: MoreThanOrEqual(fromIndex),
                paid_at_unix: MoreThan(-1),
            },
            order: {
                paid_at_unix: 'DESC'
            },
            take
        }, txId)
    }

    GetUserDebitPayments(userId: string, sinceUnix: number, debitToNpub: string, txId?: string): Promise<UserInvoicePayment[]> {
        const pending = {
            user: { user_id: userId },
            debit_to_pub: debitToNpub,
            paid_at_unix: 0,
        }
        const paid = {
            user: { user_id: userId },
            debit_to_pub: debitToNpub,
            paid_at_unix: MoreThan(sinceUnix),
        }
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: [pending, paid], order: { paid_at_unix: 'DESC' } }, txId)
    }

    async AddUserTransactionPayment(userId: string, address: string, txHash: string, txOutput: number, amount: number, chainFees: number, serviceFees: number, internal: boolean, height: number, linkedApplication: Application): Promise<UserTransactionPayment> {
        const user = await this.userStorage.GetUser(userId)
        return this.dbs.CreateAndSave<UserTransactionPayment>('UserTransactionPayment', {
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
    }

    GetUserTransactionPayments(userId: string, fromIndex: number, take = 50, txId?: string): Promise<UserTransactionPayment[]> {
        return this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', {
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
        }, txId)
    }

    async GetPendingTransactions(txId?: string) {
        const incoming = await this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { confs: 0 } }, txId)
        const outgoing = await this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', { where: { confs: 0 } }, txId)
        return { incoming, outgoing }
    }

    async UpdateAddressReceivingTransaction(serialId: number, update: Partial<AddressReceivingTransaction>, txId?: string) {
        return this.dbs.Update<AddressReceivingTransaction>('AddressReceivingTransaction', serialId, update, txId)
    }
    async UpdateUserTransactionPayment(serialId: number, update: Partial<UserTransactionPayment>, txId?: string) {
        return this.dbs.Update<UserTransactionPayment>('UserTransactionPayment', serialId, update, txId)
    }


    async AddUserEphemeralKey(userId: string, keyType: EphemeralKeyType, linkedApplication: Application): Promise<UserEphemeralKey> {
        const found = await this.dbs.FindOne<UserEphemeralKey>('UserEphemeralKey', { where: { type: keyType, user: { user_id: userId }, linkedApplication: { app_id: linkedApplication.app_id } } })
        if (found) {
            return found
        }

        return this.dbs.CreateAndSave<UserEphemeralKey>('UserEphemeralKey', {
            user: await this.userStorage.GetUser(userId),
            key: crypto.randomBytes(31).toString('hex'),
            type: keyType,
            linkedApplication
        })
    }

    async UseUserEphemeralKey(key: string, keyType: EphemeralKeyType, persist = false, txId?: string): Promise<UserEphemeralKey> {
        const found = await this.dbs.FindOne<UserEphemeralKey>('UserEphemeralKey', { where: { key: key, type: keyType } })
        if (!found) {
            throw new Error("the provided ephemeral key is invalid")
        }
        if (!persist) {
            await this.dbs.Delete<UserEphemeralKey>('UserEphemeralKey', found.serial_id, txId)
        }
        return found
    }

    async AddPendingUserToUserPayment(fromUserId: string, toUserId: string, amount: number, fee: number, linkedApplication: Application, txId: string) {
        return this.dbs.CreateAndSave<UserToUserPayment>('UserToUserPayment', {
            from_user: await this.userStorage.GetUser(fromUserId, txId),
            to_user: await this.userStorage.GetUser(toUserId, txId),
            paid_at_unix: 0,
            paid_amount: amount,
            service_fees: fee,
            linkedApplication
        }, txId)
    }
    async SetPendingUserToUserPaymentAsPaid(serialId: number, txId: string) {
        return this.dbs.Update<UserToUserPayment>('UserToUserPayment', serialId, { paid_at_unix: Math.floor(Date.now() / 1000) }, txId)
    }

    GetUserToUserReceivedPayments(userId: string, fromIndex: number, take = 50, txId?: string) {
        return this.dbs.Find<UserToUserPayment>('UserToUserPayment', {
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
        }, txId)
    }

    GetUserToUserSentPayments(userId: string, fromIndex: number, take = 50, txId?: string) {

        return this.dbs.Find<UserToUserPayment>('UserToUserPayment', {
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
        }, txId)
    }

    async GetTotalFeesPaidInApp(app: Application | null, txId?: string) {
        if (!app) {
            return 0
        }
        const entries = await Promise.all([
            this.dbs.Sum<UserReceivingInvoice>('UserReceivingInvoice', "service_fee", { linkedApplication: { app_id: app.app_id } }, txId),
            this.dbs.Sum<AddressReceivingTransaction>('AddressReceivingTransaction', "service_fee", { user_address: { linkedApplication: { app_id: app.app_id } } }, txId),
            this.dbs.Sum<UserInvoicePayment>('UserInvoicePayment', "service_fees", { linkedApplication: { app_id: app.app_id } }, txId),
            this.dbs.Sum<UserTransactionPayment>('UserTransactionPayment', "service_fees", { linkedApplication: { app_id: app.app_id } }, txId),
            this.dbs.Sum<UserToUserPayment>('UserToUserPayment', "service_fees", { linkedApplication: { app_id: app.app_id } }, txId)
        ])
        let total = 0
        entries.forEach(e => {
            if (e) {
                total += e
            }
        })
        return total
    }

    async GetAppOperations(application: Application | null, { from, to }: { from?: number, to?: number }) {
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
            this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', { where: { linkedApplication: q, ...time } }),
            this.dbs.Find<UserReceivingAddress>('UserReceivingAddress', { where: { linkedApplication: q, ...time } }),
            this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { linkedApplication: q, ...time } }),
            this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', { where: { linkedApplication: q, ...time } }),
            this.dbs.Find<UserToUserPayment>('UserToUserPayment', { where: { linkedApplication: q, ...time } })
        ])
        const receivingTransactions = await Promise.all(receivingAddresses.map(addr =>
            this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { serial_id: addr.serial_id }, ...time } })))
        return {
            receivingInvoices, receivingAddresses, receivingTransactions,
            outgoingInvoices, outgoingTransactions,
            userToUser
        }
    }

    async UserHasOutgoingOperation(userId: string) {
        const [i, tx, u2u] = await Promise.all([
            this.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', { where: { user: { user_id: userId } } }),
            this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { user: { user_id: userId } } }),
            this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { from_user: { user_id: userId } } }),
        ])
        return !!i || !!tx || !!u2u
    }

    async VerifyDbEvent(e: LoggedEvent) {
        switch (e.type) {
            case "new_invoice":
                return orFail(this.dbs.FindOne<UserReceivingInvoice>('UserReceivingInvoice', { where: { invoice: e.data, user: { user_id: e.userId } } }))
            case 'new_address':
                return orFail(this.dbs.FindOne<UserReceivingAddress>('UserReceivingAddress', { where: { address: e.data, user: { user_id: e.userId } } }))
            case 'invoice_paid':
                return orFail(this.dbs.FindOne<UserReceivingInvoice>('UserReceivingInvoice', { where: { invoice: e.data, user: { user_id: e.userId }, paid_at_unix: MoreThan(0) } }))
            case 'invoice_payment':
                return orFail(this.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', { where: { invoice: e.data, user: { user_id: e.userId } } }))
            case 'address_paid':
                const [receivingAddress, receivedHash] = e.data.split(":")
                return orFail(this.dbs.FindOne<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { address: receivingAddress }, tx_hash: receivedHash, confs: MoreThan(0) } }))
            case 'address_payment':
                const [sentAddress, sentHash] = e.data.split(":")
                return orFail(this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { address: sentAddress, tx_hash: sentHash, user: { user_id: e.userId } } }))
            case 'u2u_receiver':
                return orFail(this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { from_user: { user_id: e.data }, to_user: { user_id: e.userId } } }))
            case 'u2u_sender':
                return orFail(this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { to_user: { user_id: e.data }, from_user: { user_id: e.userId } } }))
            default:
                break;
        }
    }

    async GetTotalUsersBalance(txId?: string) {
        const total = await this.dbs.Sum<User>('User', "balance_sats", {})
        return total || 0
    }

    async GetPendingPayments(txId?: string) {
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { paid_at_unix: 0 } })
    }

    async GetOfferInvoices(offerId: string, includeUnpaid: boolean, txId?: string) {
        const where: { offer_id: string, paid_at_unix?: FindOperator<number> } = { offer_id: offerId }
        if (!includeUnpaid) {
            where.paid_at_unix = MoreThan(0)
        }
        return this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', { where })
    }
}

const orFail = async <T>(resultPromise: Promise<T | null>) => {
    const result = await resultPromise
    if (!result) {
        throw new Error("the requested value was not found")
    }
    return result
}