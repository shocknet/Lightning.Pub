import crypto from 'crypto';
import { And, Between, Equal, FindOperator, In, IsNull, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not } from "typeorm"
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
import TransactionsQueue from "./db/transactionsQueue.js";
import { LoggedEvent } from './eventsLog.js';
import { StorageInterface } from './db/storageInterface.js';
import { TransactionSwap } from './entity/TransactionSwap.js';
import { InvoiceSwap } from './entity/InvoiceSwap.js';
export type InboundOptionals = { product?: Product, callbackUrl?: string, expiry: number, expectedPayer?: User, linkedApplication?: Application, zapInfo?: ZapInfo, offerId?: string, payerData?: Record<string, string>, rejectUnauthorized?: boolean, token?: string, blind?: boolean, clinkRequesterPub?: string, clinkRequesterEventId?: string }
export const defaultInvoiceExpiry = 60 * 60
export type AppOperationTotals = {
    received: number
    spent: number
    fees: number
    invoices: number
    operations: number
}
export type AppOperationsPage = {
    incomingInvoices: UserReceivingInvoice[]
    incomingTxs: AddressReceivingTransaction[]
    outgoingInvoices: UserInvoicePayment[]
    outgoingTxs: UserTransactionPayment[]
    userToUser: UserToUserPayment[]
}
export type AppOperationKind = keyof AppOperationsPage
export type AppOperationsCursor = {
    kind: AppOperationKind
    serialId: number
}
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
                serial_id: MoreThan(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'ASC'
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

    async FlagInvoiceAsPaid(invoice: UserReceivingInvoice, amount: number, serviceFee: number, internal: boolean, txId: string): Promise<UserReceivingInvoice> {
        if (amount <= 0) {
            throw new Error("amount cannot be zero or negative")
        }
        const i: Partial<UserReceivingInvoice> = { paid_at_unix: Math.floor(Date.now() / 1000), paid_amount: amount, service_fee: serviceFee, internal }
        if (!internal) {
            i.paidByLnd = true
        }
        await this.dbs.Update<UserReceivingInvoice>('UserReceivingInvoice', invoice.serial_id, i, txId)
        const updated = await this.dbs.FindOne<UserReceivingInvoice>('UserReceivingInvoice', { where: { serial_id: invoice.serial_id } }, txId)
        if (!updated) {
            throw new Error('invoice row missing after FlagInvoiceAsPaid')
        }
        return updated
    }

    async GetUserInvoicesFlaggedAsPaid(userSerialId: number, fromIndex: number, fromPaidTimestamp: number, take = 50, txId?: string): Promise<UserReceivingInvoice[]> {
        let items: UserReceivingInvoice[] = [];
        if (fromPaidTimestamp > 0) {
            // First fetch same paid_at_unix, higher serial_id
            const firstBatch = await this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', {
                where: {
                    user: { serial_id: userSerialId },
                    paid_at_unix: And(MoreThan(0), Equal(fromPaidTimestamp)),
                    serial_id: MoreThan(fromIndex)
                },
                order: {
                    paid_at_unix: 'ASC',
                    serial_id: 'ASC'
                },
                take
            }, txId);
            items.push(...firstBatch);
        }

        const needMore = take - items.length
        // If need more, fetch higher paid_at_unix
        if (needMore > 0) {
            const secondBatch = await this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', {
                where: {
                    user: { serial_id: userSerialId },
                    paid_at_unix: And(MoreThan(0), MoreThan(fromPaidTimestamp)),
                },
                order: {
                    paid_at_unix: 'ASC',
                    serial_id: 'ASC'
                },
                take: needMore
            }, txId)
            items.push(...secondBatch)
        }
        return items
    }

    async RemoveOldUnpaidInvoices(txId?: string) {
        return this.dbs.Delete<UserReceivingInvoice>('UserReceivingInvoice', { paid_at_unix: 0, expires_at_unix: LessThan(Math.floor(Date.now() / 1000)) }, txId)
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
            rejectUnauthorized: options.rejectUnauthorized,
            bearer_token: options.token,
            clink_requester_pub: options.clinkRequesterPub,
            clink_requester_event_id: options.clinkRequesterEventId
        }, txId)
    }

    async RemoveUserInvoices(userId: string, txId?: string) {
        const invoices = await this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', { where: { user: { user_id: userId } } }, txId)
        if (invoices.length === 0) {
            return 0
        }
        let deleted = 0
        for (const invoice of invoices) {
            deleted += await this.dbs.Delete<UserReceivingInvoice>('UserReceivingInvoice', invoice.serial_id, txId)
        }
        return deleted
    }

    async GetAddressOwner(address: string, txId?: string): Promise<UserReceivingAddress | null> {
        return this.dbs.FindOne<UserReceivingAddress>('UserReceivingAddress', { where: { address } }, txId)
    }

    async GetAddressReceivingTransactionOwner(address: string, txHash: string, outputIndex: number, txId?: string): Promise<AddressReceivingTransaction | null> {
        return this.dbs.FindOne<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { address }, tx_hash: txHash, output_index: outputIndex } }, txId)
    }

    async GetAddressReceivingTransactionsByTxHash(address: string, txHash: string, txId?: string): Promise<AddressReceivingTransaction[]> {
        return this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { address }, tx_hash: txHash } }, txId)
    }
    async GetUserTransactionPaymentOwner(address: string, txHash: string, txId?: string): Promise<UserTransactionPayment | null> {
        return this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { address, tx_hash: txHash } }, txId)
    }

    async GetTxHashPaymentOwner(txHash: string, txId?: string): Promise<UserTransactionPayment | null> {
        return this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { tx_hash: txHash } }, txId)
    }
    async GetTxHashPaymentOwners(txHashes: string[], txId?: string): Promise<UserTransactionPayment[]> {
        if (txHashes.length === 0) {
            return []
        }
        return this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', { where: { tx_hash: In(txHashes) } }, txId)
    }
    async GetAddressReceivingTransactionsByTxHashes(txHashes: string[], txId?: string): Promise<AddressReceivingTransaction[]> {
        if (txHashes.length === 0) {
            return []
        }
        return this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { tx_hash: In(txHashes) } }, txId)
    }

    async GetInvoiceOwner(paymentRequest: string, txId?: string): Promise<UserReceivingInvoice | null> {
        return this.dbs.FindOne<UserReceivingInvoice>('UserReceivingInvoice', { where: { invoice: paymentRequest } }, txId)
    }
    async GetInvoiceOwners(paymentRequests: string[], txId?: string): Promise<UserReceivingInvoice[]> {
        if (paymentRequests.length === 0) {
            return []
        }
        return this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', { where: { invoice: In(paymentRequests) } }, txId)
    }
    async GetPaymentOwner(paymentRequest: string, txId?: string): Promise<UserInvoicePayment | null> {
        return this.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', { where: { invoice: paymentRequest } }, txId)
    }
    async GetPaymentOwners(paymentRequests: string[], txId?: string): Promise<UserInvoicePayment[]> {
        if (paymentRequests.length === 0) {
            return []
        }
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { invoice: In(paymentRequests) } }, txId)
    }
    async GetUser2UserPayment(serialId: number, txId?: string): Promise<UserToUserPayment | null> {
        return this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { serial_id: serialId } }, txId)
    }

    async AddPendingExternalPayment(userId: string, invoice: string, amounts: { payAmount: number, serviceFee: number, networkFee: number }, linkedApplication: Application, liquidityProvider: string | undefined, txId: string, optionals: { debitNpub?: string, swapOperationId?: string } = {}): Promise<UserInvoicePayment> {
        const { debitNpub, swapOperationId } = optionals
        const user = await this.userStorage.GetUser(userId, txId)
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
            debit_to_pub: debitNpub,
            swap_operation_id: swapOperationId
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

    async AddInternalPayment(userId: string, invoice: string, amount: number, serviceFees: number, linkedApplication: Application, debitNpub?: string, txId?: string): Promise<UserInvoicePayment> {
        const user = await this.userStorage.GetUser(userId, txId)
        return this.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
            user,
            paid_amount: amount,
            invoice,
            routing_fees: 0,
            service_fees: serviceFees,
            paid_at_unix: Math.floor(Date.now() / 1000),
            internal: true,
            linkedApplication,
            debit_to_pub: debitNpub
        }, txId)
    }

    GetUserInvoicePayments(userId: string, fromIndex: number, take = 50, txId?: string): Promise<UserInvoicePayment[]> {
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', {
            where: {
                user: {
                    user_id: userId
                },
                serial_id: MoreThan(fromIndex),
                paid_at_unix: MoreThan(-1),
            },
            order: {
                paid_at_unix: 'ASC'
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

    async AddUserTransactionPayment(userId: string, address: string, txHash: string, txOutput: number, amount: number, chainFees: number, serviceFees: number, internal: boolean, height: number, linkedApplication: Application, txId?: string): Promise<UserTransactionPayment> {
        return this.dbs.CreateAndSave<UserTransactionPayment>('UserTransactionPayment', {
            user: await this.userStorage.GetUser(userId, txId),
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
        }, txId)
    }

    GetUserTransactionPayments(userId: string, fromIndex: number, take = 50, txId?: string): Promise<UserTransactionPayment[]> {
        return this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', {
            where: {
                user: {
                    user_id: userId
                },
                serial_id: MoreThan(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'ASC'
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

    async RemoveUserEphemeralKeys(userId: string, txId?: string) {
        const keys = await this.dbs.Find<UserEphemeralKey>('UserEphemeralKey', { where: { user: { user_id: userId } } }, txId)
        if (keys.length === 0) {
            return 0
        }
        let deleted = 0
        for (const key of keys) {
            deleted += await this.dbs.Delete<UserEphemeralKey>('UserEphemeralKey', key.serial_id, txId)
        }
        return deleted
    }

    async RemoveUserReceivingAddresses(userId: string, txId?: string) {
        const addresses = await this.dbs.Find<UserReceivingAddress>('UserReceivingAddress', { where: { user: { user_id: userId } } }, txId)
        for (const addr of addresses) {
            const txs = await this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { serial_id: addr.serial_id } } }, txId)
            for (const tx of txs) {
                await this.dbs.Delete<AddressReceivingTransaction>('AddressReceivingTransaction', tx.serial_id, txId)
            }
            await this.dbs.Delete<UserReceivingAddress>('UserReceivingAddress', addr.serial_id, txId)
        }
    }

    async RemoveUserInvoicePayments(userId: string, txId?: string) {
        const payments = await this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { user: { user_id: userId } } }, txId)
        for (const p of payments) {
            await this.dbs.Delete<UserInvoicePayment>('UserInvoicePayment', p.serial_id, txId)
        }
    }

    async RemoveUserTransactionPayments(userId: string, txId?: string) {
        const payments = await this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', { where: { user: { user_id: userId } } }, txId)
        for (const p of payments) {
            await this.dbs.Delete<UserTransactionPayment>('UserTransactionPayment', p.serial_id, txId)
        }
    }

    async RemoveUserToUserPayments(userId: string, txId?: string) {
        const asSender = await this.dbs.Find<UserToUserPayment>('UserToUserPayment', { where: { from_user: { user_id: userId } } }, txId)
        const asReceiver = await this.dbs.Find<UserToUserPayment>('UserToUserPayment', { where: { to_user: { user_id: userId } } }, txId)
        const seen = new Set<number>()
        for (const p of [...asSender, ...asReceiver]) {
            if (seen.has(p.serial_id)) continue
            seen.add(p.serial_id)
            await this.dbs.Delete<UserToUserPayment>('UserToUserPayment', p.serial_id, txId)
        }
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
                serial_id: MoreThan(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'ASC'
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
                serial_id: MoreThan(fromIndex),
                paid_at_unix: MoreThan(0),
            },
            order: {
                paid_at_unix: 'ASC'
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
        const q = appLink(application)
        const time = createdAtFilter({ from, to })
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
        const [invoice, tx, userToUser] = await Promise.all([
            this.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', { where: { user: { user_id: userId } } }),
            this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { user: { user_id: userId } } }),
            this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { from_user: { user_id: userId } } }),
        ])
        return !!invoice || !!tx || !!userToUser
    }

    async GetAppOperationTotals(application: Application | null, range: { from?: number, to?: number }): Promise<AppOperationTotals> {
        const invoiceCreated = appOpWhere(application, range)
        const paid = paidAtOpWhere(application, range)
        const inTxWhere = incomingTxPaidWhere(application, range)
        const confirmedTx = { ...inTxWhere, confs: MoreThan(1) }
        const [
            receivedIn, receivedTx, spentOut, spentTx,
            feeIn, feeTxIn, feeOut, routeOut, feeTxOut, chainOut, feeU2u,
            invoices, paidInCount, inTxCount, outCount, outTxCount, u2uCount,
        ] = await Promise.all([
            this.sumCol<UserReceivingInvoice>('UserReceivingInvoice', 'paid_amount', paid),
            this.sumCol<AddressReceivingTransaction>('AddressReceivingTransaction', 'paid_amount', confirmedTx),
            this.sumCol<UserInvoicePayment>('UserInvoicePayment', 'paid_amount', paid),
            this.sumCol<UserTransactionPayment>('UserTransactionPayment', 'paid_amount', paid),
            this.sumCol<UserReceivingInvoice>('UserReceivingInvoice', 'service_fee', paid),
            this.sumCol<AddressReceivingTransaction>('AddressReceivingTransaction', 'service_fee', confirmedTx),
            this.sumCol<UserInvoicePayment>('UserInvoicePayment', 'service_fees', paid),
            this.sumCol<UserInvoicePayment>('UserInvoicePayment', 'routing_fees', paid),
            this.sumCol<UserTransactionPayment>('UserTransactionPayment', 'service_fees', paid),
            this.sumCol<UserTransactionPayment>('UserTransactionPayment', 'chain_fees', paid),
            this.sumCol<UserToUserPayment>('UserToUserPayment', 'service_fees', paid),
            this.countWhere('UserReceivingInvoice', invoiceCreated),
            this.countWhere('UserReceivingInvoice', paid),
            this.countWhere('AddressReceivingTransaction', inTxWhere),
            this.countWhere('UserInvoicePayment', paid),
            this.countWhere('UserTransactionPayment', paid),
            this.countWhere('UserToUserPayment', paid),
        ])
        return {
            received: receivedIn + receivedTx,
            spent: spentOut + spentTx,
            fees: feeIn + feeTxIn + (feeOut - routeOut) + (feeTxOut - chainOut) + feeU2u,
            invoices,
            operations: paidInCount + inTxCount + outCount + outTxCount + u2uCount,
        }
    }

    async GetAppOperationsPage(application: Application | null, range: { from?: number, to?: number }, take: number, cursor?: AppOperationsCursor): Promise<AppOperationsPage> {
        const page = { order: { paid_at_unix: 'DESC' as const, serial_id: 'DESC' as const }, take }
        const [incomingInvoices, incomingTxs, outgoingInvoices, outgoingTxs, userToUser] = await Promise.all([
            this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', { where: appOperationPageWhere(application, range, 'incomingInvoices', cursor), ...page }),
            this.dbs.Find<AddressReceivingTransaction>('AddressReceivingTransaction', { where: appOperationPageWhere(application, range, 'incomingTxs', cursor), ...page }),
            this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: appOperationPageWhere(application, range, 'outgoingInvoices', cursor), ...page }),
            this.dbs.Find<UserTransactionPayment>('UserTransactionPayment', { where: appOperationPageWhere(application, range, 'outgoingTxs', cursor), ...page }),
            this.dbs.Find<UserToUserPayment>('UserToUserPayment', { where: appOperationPageWhere(application, range, 'userToUser', cursor), ...page }),
        ])
        return { incomingInvoices, incomingTxs, outgoingInvoices, outgoingTxs, userToUser }
    }

    private sumCol<T>(entity: 'UserReceivingInvoice' | 'AddressReceivingTransaction' | 'UserInvoicePayment' | 'UserTransactionPayment' | 'UserToUserPayment', column: string, where: object) {
        return this.dbs.Sum<T>(entity, column as never, where as never).then(n => n || 0)
    }

    private async countWhere(entity: 'UserReceivingInvoice' | 'AddressReceivingTransaction' | 'UserInvoicePayment' | 'UserTransactionPayment' | 'UserToUserPayment', where: object) {
        const [, n] = await this.dbs.FindAndCount(entity, { where, take: 1 })
        return n
    }

    async VerifyDbEvent(e: LoggedEvent) {
        switch (e.type) {
            case 'invoice_paid':
                return orFail(this.dbs.FindOne<UserReceivingInvoice>('UserReceivingInvoice', { where: { invoice: e.data, user: { user_id: e.userId }, paid_at_unix: MoreThan(0) } }), "invoice_paid not found for " + e.data)
            case 'invoice_payment':
                return orFail(this.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', { where: { invoice: e.data, user: { user_id: e.userId } } }), "invoice_payment not found for " + e.data)
            case 'address_paid':
                const [receivingAddress, receivedHash] = e.data.split(":")
                return orFail(this.dbs.FindOne<AddressReceivingTransaction>('AddressReceivingTransaction', { where: { user_address: { address: receivingAddress }, tx_hash: receivedHash, confs: MoreThan(0) } }), "address_paid not found for " + e.data)
            case 'address_payment':
                const [sentAddress, sentHash] = e.data.split(":")
                return orFail(this.dbs.FindOne<UserTransactionPayment>('UserTransactionPayment', { where: { address: sentAddress, tx_hash: sentHash, user: { user_id: e.userId } } }), "address_payment not found for " + e.data)
            case 'u2u_receiver':
                return orFail(this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { from_user: { user_id: e.data }, to_user: { user_id: e.userId } } }), "u2u_receiver not found for " + e.data)
            case 'u2u_sender':
                return orFail(this.dbs.FindOne<UserToUserPayment>('UserToUserPayment', { where: { to_user: { user_id: e.data }, from_user: { user_id: e.userId } } }), "u2u_sender not found for " + e.data)
            default:
                break;
        }
    }

    async GetUsersWithNegativeBalance(txId?: string) {
        return this.dbs.Find<User>('User', { where: { balance_sats: LessThan(0) } }, txId)
    }

    async GetTotalUsersBalance(excludeLocked?: boolean, txId?: string) {
        const where: { locked?: boolean } = {}
        if (excludeLocked) {
            where.locked = false
        }
        const total = await this.dbs.Sum<User>('User', "balance_sats", where, txId)
        return total || 0
    }

    async GetPendingPayments(txId?: string) {
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { paid_at_unix: 0 } })
    }

    async GetUserIdsWithPendingOutgoingPayments(txId?: string) {
        const pending = await this.GetPendingPayments(txId)
        return new Set(pending.map(p => p.user.user_id))
    }

    async GetOfferInvoices(offerId: string, includeUnpaid: boolean, txId?: string) {
        const where: { offer_id: string, paid_at_unix?: FindOperator<number> } = { offer_id: offerId }
        if (!includeUnpaid) {
            where.paid_at_unix = MoreThan(0)
        }
        return this.dbs.Find<UserReceivingInvoice>('UserReceivingInvoice', { where })
    }

    async AddTransactionSwap(swap: Partial<TransactionSwap>) {
        return this.dbs.CreateAndSave<TransactionSwap>('TransactionSwap', swap)
    }

    async GetTransactionSwap(swapOperationId: string, appUserId: string, txId?: string) {
        return this.dbs.FindOne<TransactionSwap>('TransactionSwap', { where: { swap_operation_id: swapOperationId, used: false, app_user_id: appUserId } }, txId)
    }

    async SetTransactionSwapPaid(swapOperationId: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        return this.dbs.Update<TransactionSwap>('TransactionSwap', { swap_operation_id: swapOperationId }, {
            paid_at_unix: now,
        }, txId)
    }

    async FinalizeTransactionSwap(swapOperationId: string, address: string, chainTxId: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        return this.dbs.Update<TransactionSwap>('TransactionSwap', { swap_operation_id: swapOperationId }, {
            used: true,
            tx_id: chainTxId,
            address_paid: address,
            completed_at_unix: now,
        }, txId)
    }

    async FailTransactionSwap(swapOperationId: string, address: string, failureReason: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        return this.dbs.Update<TransactionSwap>('TransactionSwap', { swap_operation_id: swapOperationId }, {
            used: true,
            failure_reason: failureReason,
            address_paid: address,
            completed_at_unix: now,
        }, txId)
    }

    async DeleteTransactionSwap(swapOperationId: string, txId?: string) {
        return this.dbs.Delete<TransactionSwap>('TransactionSwap', { swap_operation_id: swapOperationId }, txId)
    }

    async DeleteExpiredTransactionSwaps(currentHeight: number, txId?: string) {
        return this.dbs.Delete<TransactionSwap>('TransactionSwap', { timeout_block_height: LessThan(currentHeight), used: false }, txId)
    }

    async ListPendingTransactionSwaps(appUserId: string, txId?: string) {
        return this.dbs.Find<TransactionSwap>('TransactionSwap', { where: { used: false, app_user_id: appUserId } }, txId)
    }

    async ListTxSwapPayments(userId: string, txId?: string) {
        return this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { swap_operation_id: Not(IsNull()), user: { user_id: userId } } }, txId)
    }

    async ListCompletedTxSwaps(appUserId: string, payments: UserInvoicePayment[], txId?: string) {
        const completed = await this.dbs.Find<TransactionSwap>('TransactionSwap', { where: { used: true, app_user_id: appUserId } }, txId)
        // const payments = await this.dbs.Find<UserInvoicePayment>('UserInvoicePayment', { where: { swap_operation_id: Not(IsNull()), } }, txId)
        const paymentsMap = new Map<string, UserInvoicePayment>()
        payments.forEach(p => {
            paymentsMap.set(p.swap_operation_id, p)
        })
        return completed.map(c => ({
            swap: c, payment: paymentsMap.get(c.swap_operation_id)
        }))
    }

    async AddInvoiceSwap(swap: Partial<InvoiceSwap>) {
        return this.dbs.CreateAndSave<InvoiceSwap>('InvoiceSwap', swap)
    }

    async GetInvoiceSwap(swapOperationId: string, appUserId: string, txId?: string) {
        const swap = await this.dbs.FindOne<InvoiceSwap>('InvoiceSwap', { where: { swap_operation_id: swapOperationId, used: false, app_user_id: appUserId } }, txId)
        if (!swap || swap.tx_id) {
            return null
        }
        return swap
    }

    async FinalizeInvoiceSwap(swapOperationId: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        return this.dbs.Update<InvoiceSwap>('InvoiceSwap', { swap_operation_id: swapOperationId }, {
            used: true,
            completed_at_unix: now,
        }, txId)
    }

    async UpdateInvoiceSwap(swapOperationId: string, update: Partial<InvoiceSwap>, txId?: string) {
        return this.dbs.Update<InvoiceSwap>('InvoiceSwap', { swap_operation_id: swapOperationId }, update, txId)
    }

    async SetInvoiceSwapTxId(swapOperationId: string, chainTxId: string, chainFeeSats: number, lockupTxHex?: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        const update: Partial<InvoiceSwap> = {
            tx_id: chainTxId,
            paid_at_unix: now,
            chain_fee_sats: chainFeeSats,
        }
        if (lockupTxHex) {
            update.lockup_tx_hex = lockupTxHex
        }
        return this.dbs.Update<InvoiceSwap>('InvoiceSwap', { swap_operation_id: swapOperationId }, update, txId)
    }

    async FailInvoiceSwap(swapOperationId: string, failureReason: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        return this.dbs.Update<InvoiceSwap>('InvoiceSwap', { swap_operation_id: swapOperationId }, {
            used: true,
            failure_reason: failureReason,
            completed_at_unix: now,
        }, txId)
    }

    async DeleteInvoiceSwap(swapOperationId: string, txId?: string) {
        return this.dbs.Delete<InvoiceSwap>('InvoiceSwap', { swap_operation_id: swapOperationId }, txId)
    }

    async DeleteExpiredInvoiceSwaps(currentHeight: number, txId?: string) {
        return this.dbs.Delete<InvoiceSwap>('InvoiceSwap', { timeout_block_height: LessThan(currentHeight), used: false, tx_id: "" }, txId)
    }

    async ListCompletedInvoiceSwaps(appUserId: string, txId?: string) {
        return this.dbs.Find<InvoiceSwap>('InvoiceSwap', { where: { used: true, app_user_id: appUserId } }, txId)
    }

    async ListPendingInvoiceSwaps(appUserId: string, txId?: string) {
        return this.dbs.Find<InvoiceSwap>('InvoiceSwap', { where: { used: false, app_user_id: appUserId } }, txId)
    }

    async ListUnfinishedInvoiceSwaps(txId?: string) {
        const swaps = await this.dbs.Find<InvoiceSwap>('InvoiceSwap', { where: { used: false } }, txId)
        return swaps.filter(s => !!s.tx_id)
    }

    async UpdateRefundInvoiceSwap(swapOperationId: string, refundAddress: string, refundTxId: string, txId?: string) {
        const now = Math.floor(Date.now() / 1000)
        return this.dbs.Update<InvoiceSwap>('InvoiceSwap', { swap_operation_id: swapOperationId }, {
            refund_address: refundAddress,
            refund_at_unix: now,
            refund_tx_id: refundTxId,
        }, txId)
    }

    async GetRefundableInvoiceSwap(swapOperationId: string, txId?: string) {
        const swap = await this.dbs.FindOne<InvoiceSwap>('InvoiceSwap', { where: { swap_operation_id: swapOperationId } }, txId)
        if (!swap || !swap.tx_id) {
            return null
        }
        if (swap.used && !swap.failure_reason) {
            return null
        }
        return swap
    }

}

const orFail = async <T>(resultPromise: Promise<T | null>, message: string) => {
    const result = await resultPromise
    if (!result) {
        throw new Error(message)
    }
    return result
}

function appLink(application: Application | null) {
    return application ? { app_id: application.app_id } : IsNull()
}

function createdAtFilter(range: { from?: number, to?: number }): { created_at?: FindOperator<Date> } {
    if (range.from && range.to) {
        return { created_at: Between<Date>(new Date(range.from * 1000), new Date(range.to * 1000)) }
    }
    if (range.from) {
        return { created_at: MoreThanOrEqual<Date>(new Date(range.from * 1000)) }
    }
    if (range.to) {
        return { created_at: LessThanOrEqual<Date>(new Date(range.to * 1000)) }
    }
    return {}
}

function appOpWhere(application: Application | null, range: { from?: number, to?: number }) {
    return { linkedApplication: appLink(application), ...createdAtFilter(range) }
}

function paidAtFilter(range: { from?: number, to?: number }): { paid_at_unix: FindOperator<number> } {
    const bounds: FindOperator<number>[] = [MoreThan(0)]
    if (range.from) bounds.push(MoreThanOrEqual(range.from))
    if (range.to) bounds.push(LessThanOrEqual(range.to))
    return { paid_at_unix: combineAnd(bounds) }
}

function paidAtOpWhere(application: Application | null, range: { from?: number, to?: number }) {
    return { linkedApplication: appLink(application), ...paidAtFilter(range) }
}

function incomingTxPaidWhere(application: Application | null, range: { from?: number, to?: number }) {
    return { ...paidAtFilter(range), user_address: { linkedApplication: appLink(application) } }
}

const appOperationKinds: AppOperationKind[] = ['incomingInvoices', 'incomingTxs', 'outgoingInvoices', 'outgoingTxs', 'userToUser']

function appOperationPageWhere(application: Application | null, range: { from?: number, to?: number }, kind: AppOperationKind, cursor?: AppOperationsCursor): object | object[] {
    const linked = kind === 'incomingTxs'
        ? { user_address: { linkedApplication: appLink(application) } }
        : { linkedApplication: appLink(application) }
    if (!cursor || !range.to) {
        return { ...linked, ...paidAtFilter(range) }
    }

    const rank = appOperationKinds.indexOf(kind)
    const cursorRank = appOperationKinds.indexOf(cursor.kind)
    if (rank < cursorRank) {
        return { ...linked, ...paidAtFilterWithUpper(range, LessThan(range.to)) }
    }
    if (rank > cursorRank) {
        return { ...linked, ...paidAtFilter(range) }
    }

    return [
        { ...linked, ...paidAtFilterWithUpper(range, LessThan(range.to)) },
        { ...linked, ...paidAtFilterWithUpper(range, Equal(range.to)), serial_id: LessThan(cursor.serialId) },
    ]
}

function paidAtFilterWithUpper(range: { from?: number }, upper: FindOperator<number>) {
    const bounds: FindOperator<number>[] = [MoreThan(0), upper]
    if (range.from) bounds.push(MoreThanOrEqual(range.from))
    return { paid_at_unix: combineAnd(bounds) }
}

function combineAnd<T>(operators: FindOperator<T>[]): FindOperator<T> {
    return operators.reduce((left, right) => And(left, right))
}
