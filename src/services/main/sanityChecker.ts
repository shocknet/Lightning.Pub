import Storage from '../storage/index.js'
import { LightningHandler } from "../lnd/index.js"
import { LoggedEvent } from '../storage/eventsLog.js'
import { Invoice, Payment } from '../../../proto/lnd/lightning';
const LN_INVOICE_REGEX = /^(lightning:)?(lnbc|lntb)[0-9a-zA-Z]+$/;
const BITCOIN_ADDRESS_REGEX = /^(bitcoin:)?([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-zA-HJ-NP-Z0-9]{39,59})$/;
type UniqueDecrementReasons = 'ban'
type UniqueIncrementReasons = 'fees' | 'routing_fee_refund' | 'payment_refund'
type CommonReasons = 'invoice' | 'address' | 'u2u'
type Reason = UniqueDecrementReasons | UniqueIncrementReasons | CommonReasons
const incrementTwiceAllowed = ['fees', 'ban']
export default class SanityChecker {
    storage: Storage
    lnd: LightningHandler

    events: LoggedEvent[] = []
    invoices: Invoice[] = []
    payments: Payment[] = []
    incrementSources: Record<string, boolean> = {}
    decrementSources: Record<string, boolean> = {}
    decrementEvents: Record<string, { userId: string, refund: number, failure: boolean }> = {}
    users: Record<string, { ts: number, updatedBalance: number }> = {}
    constructor(storage: Storage, lnd: LightningHandler) {
        this.storage = storage
        this.lnd = lnd
    }

    parseDataField(data: string): { type: Reason, data: string, txHash?: string, serialId?: number } {
        const parts = data.split(":")
        if (parts.length === 1) {
            const [fullData] = parts
            if (fullData === 'fees' || fullData === 'ban') {
                return { type: fullData, data: fullData }
            } else if (LN_INVOICE_REGEX.test(fullData)) {
                return { type: 'invoice', data: fullData }
            } else if (BITCOIN_ADDRESS_REGEX.test(fullData)) {
                return { type: 'address', data: fullData }
            } else {
                return { type: 'u2u', data: fullData }
            }
        } else if (parts.length === 2) {
            const [prefix, data] = parts
            if (prefix === 'routing_fee_refund' || prefix === 'payment_refund') {
                return { type: prefix, data }
            } else if (BITCOIN_ADDRESS_REGEX.test(prefix)) {
                return { type: 'address', data: prefix, txHash: data }
            } else {
                return { type: 'u2u', data: prefix, serialId: +data }
            }
        }
        throw new Error("unknown data format")
    }

    async verifyDecrementEvent(e: LoggedEvent) {
        if (this.decrementSources[e.data]) {
            throw new Error("entry decremented more that once " + e.data)
        }
        this.decrementSources[e.data] = !incrementTwiceAllowed.includes(e.data)
        this.users[e.userId] = this.checkUserEntry(e, this.users[e.userId])
        const parsed = this.parseDataField(e.data)
        switch (parsed.type) {
            case 'ban':
                return
            case 'address':
                return this.validateUserTransactionPayment({ address: parsed.data, txHash: parsed.txHash, userId: e.userId })
            case 'invoice':
                return this.validateUserInvoicePayment({ invoice: parsed.data, userId: e.userId, amt: e.amount })
            case 'u2u':
                return this.validateUser2UserPayment({ fromUser: e.userId, toUser: parsed.data, serialId: parsed.serialId })
            default:
                throw new Error("unknown decrement type " + parsed.type)
        }
    }

    async validateUserTransactionPayment({ address, txHash, userId }: { userId: string, address: string, txHash?: string }) {
        if (!txHash) {
            throw new Error("no tx hash provided to payment for address " + address)
        }
        const entry = await this.storage.paymentStorage.GetUserTransactionPaymentOwner(address, txHash)
        if (!entry) {
            throw new Error("no payment found for tx hash " + txHash)
        }
        if (entry.user.user_id !== userId) {
            throw new Error("payment user id mismatch for tx hash " + txHash)
        }
        if (entry.paid_at_unix <= 0) {
            throw new Error("payment not paid for tx hash " + txHash)
        }
    }

    async validateUserInvoicePayment({ invoice, userId, amt }: { userId: string, invoice: string, amt: number }) {
        const entry = await this.storage.paymentStorage.GetPaymentOwner(invoice)
        if (!entry) {
            throw new Error("no payment found for invoice " + invoice)
        }
        if (entry.user.user_id !== userId) {
            throw new Error("payment user id mismatch for invoice " + invoice)
        }
        if (entry.paid_at_unix === 0) {
            throw new Error("payment never settled for invoice " + invoice) // TODO: check if this is correct
        }
        if (entry.paid_at_unix === -1) {
            this.decrementEvents[invoice] = { userId, refund: amt, failure: true }
        } else {
            const refund = amt - (entry.paid_amount + entry.routing_fees + entry.service_fees)
            this.decrementEvents[invoice] = { userId, refund, failure: false }
        }
        if (!entry.internal) {
            const lndEntry = this.payments.find(i => i.paymentRequest === invoice)
            if (!lndEntry) {
                throw new Error("payment not found in lnd for invoice " + invoice)
            }
        }
    }

    async validateUser2UserPayment({ fromUser, toUser, serialId }: { fromUser: string, toUser: string, serialId?: number }) {
        if (!serialId) {
            throw new Error("no serial id provided to u2u payment")
        }
        const entry = await this.storage.paymentStorage.GetUser2UserPayment(serialId)
        if (!entry) {
            throw new Error("no payment u2u found for serial id " + serialId)
        }
        if (entry.from_user.user_id !== fromUser || entry.to_user.user_id !== toUser) {
            throw new Error("u2u payment user id mismatch for serial id " + serialId)
        }
        if (entry.paid_at_unix <= 0) {
            throw new Error("payment not paid for serial id " + serialId)
        }
    }

    async verifyIncrementEvent(e: LoggedEvent) {
        if (this.incrementSources[e.data]) {
            throw new Error("entry incremented more that once " + e.data)
        }
        this.incrementSources[e.data] = !incrementTwiceAllowed.includes(e.data)
        this.users[e.userId] = this.checkUserEntry(e, this.users[e.userId])
        const parsed = this.parseDataField(e.data)
        switch (parsed.type) {
            case 'fees':
                return
            case 'address':
                return this.validateAddressReceivingTransaction({ address: parsed.data, txHash: parsed.txHash, userId: e.userId })
            case 'invoice':
                return this.validateReceivingInvoice({ invoice: parsed.data, userId: e.userId })
            case 'u2u':
                return this.validateUser2UserPayment({ fromUser: parsed.data, toUser: e.userId, serialId: parsed.serialId })
            case 'routing_fee_refund':
                return this.validateRoutingFeeRefund({ amt: e.amount, invoice: parsed.data, userId: e.userId })
            case 'payment_refund':
                return this.validatePaymentRefund({ amt: e.amount, invoice: parsed.data, userId: e.userId })
            default:
                throw new Error("unknown increment type " + parsed.type)
        }
    }

    async validateAddressReceivingTransaction({ userId, address, txHash }: { userId: string, address: string, txHash?: string }) {
        if (!txHash) {
            throw new Error("no tx hash provided to address " + address)
        }
        const entry = await this.storage.paymentStorage.GetAddressReceivingTransactionOwner(address, txHash)
        if (!entry) {
            throw new Error("no tx found for tx hash " + txHash)
        }
        if (entry.user_address.user.user_id !== userId) {
            throw new Error("tx user id mismatch for tx hash " + txHash)
        }
        if (entry.paid_at_unix <= 0) {
            throw new Error("tx not paid for tx hash " + txHash)
        }
    }

    async validateReceivingInvoice({ userId, invoice }: { userId: string, invoice: string }) {
        const entry = await this.storage.paymentStorage.GetInvoiceOwner(invoice)
        if (!entry) {
            throw new Error("no invoice found for invoice " + invoice)
        }
        if (entry.user.user_id !== userId) {
            throw new Error("invoice user id mismatch for invoice " + invoice)
        }
        if (entry.paid_at_unix <= 0) {
            throw new Error("invoice not paid for invoice " + invoice)
        }
        if (!entry.internal) {
            const entry = this.invoices.find(i => i.paymentRequest === invoice)
            if (!entry) {
                throw new Error("invoice not found in lnd " + invoice)
            }
        }
    }

    async validateRoutingFeeRefund({ amt, invoice, userId }: { userId: string, invoice: string, amt: number }) {
        const entry = this.decrementEvents[invoice]
        if (!entry) {
            throw new Error("no decrement event found for invoice routing fee refound " + invoice)
        }
        if (entry.userId !== userId) {
            throw new Error("user id mismatch for routing fee refund " + invoice)
        }
        if (entry.failure) {
            throw new Error("payment failled, should not refund routing fees " + invoice)
        }
        if (entry.refund !== amt) {
            console.log(entry.refund, amt)
            throw new Error("refund amount mismatch for routing fee refund " + invoice)
        }
    }

    async validatePaymentRefund({ amt, invoice, userId }: { userId: string, invoice: string, amt: number }) {
        const entry = this.decrementEvents[invoice]
        if (!entry) {
            throw new Error("no decrement event found for invoice payment refund " + invoice)
        }
        if (entry.userId !== userId) {
            throw new Error("user id mismatch for payment refund " + invoice)
        }
        if (!entry.failure) {
            throw new Error("payment did not fail, should not refund payment " + invoice)
        }
        if (entry.refund !== amt) {
            throw new Error("refund amount mismatch for payment refund " + invoice)
        }
    }

    async VerifyEventsLog() {
        this.events = await this.storage.eventsLog.GetAllLogs()
        this.invoices = (await this.lnd.GetAllPaidInvoices(1000)).invoices
        this.payments = (await this.lnd.GetAllPayments(1000)).payments
        this.incrementSources = {}
        this.decrementSources = {}
        this.users = {}
        this.users = {}
        this.decrementEvents = {}
        for (let i = 0; i < this.events.length; i++) {
            const e = this.events[i]
            if (e.type === 'balance_decrement') {
                await this.verifyDecrementEvent(e)
            } else if (e.type === 'balance_increment') {
                await this.verifyIncrementEvent(e)
            } else {
                await this.storage.paymentStorage.VerifyDbEvent(e)
            }
        }
        await Promise.all(Object.entries(this.users).map(async ([userId, u]) => {
            const user = await this.storage.userStorage.GetUser(userId)
            if (user.balance_sats !== u.updatedBalance) {
                throw new Error("sanity check on balance failed, expected: " + u.updatedBalance + " found: " + user.balance_sats)
            }
        }))
    }

    checkUserEntry(e: LoggedEvent, u: { ts: number, updatedBalance: number } | undefined) {
        const newEntry = { ts: e.timestampMs, updatedBalance: e.balance + e.amount * (e.type === 'balance_decrement' ? -1 : 1) }
        console.log(e)
        if (!u) {
            console.log(e.userId, "balance starts at", e.balance, "sats and moves by", e.amount * (e.type === 'balance_decrement' ? -1 : 1), "sats, resulting in", newEntry.updatedBalance, "sats")
            return newEntry
        }
        if (e.timestampMs < u.ts) {
            throw new Error("entry out of order " + e.timestampMs + " " + u.ts)
        }
        if (e.balance !== u.updatedBalance) {
            throw new Error("inconsistent balance update got: " + e.balance + " expected " + u.updatedBalance)
        }
        console.log(e.userId, "balance updates from", e.balance, "sats and moves by", e.amount * (e.type === 'balance_decrement' ? -1 : 1), "sats, resulting in", newEntry.updatedBalance, "sats")
        return newEntry
    }
}