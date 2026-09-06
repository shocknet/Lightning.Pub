import crypto from 'crypto'
import { Application } from '../services/storage/entity/Application.js'
import { User } from '../services/storage/entity/User.js'
import { UserReceivingAddress } from '../services/storage/entity/UserReceivingAddress.js'
import { UserReceivingInvoice } from '../services/storage/entity/UserReceivingInvoice.js'
import { UserInvoicePayment } from '../services/storage/entity/UserInvoicePayment.js'
import { UserTransactionPayment } from '../services/storage/entity/UserTransactionPayment.js'
import { AddressReceivingTransaction } from '../services/storage/entity/AddressReceivingTransaction.js'
import { UserToUserPayment } from '../services/storage/entity/UserToUserPayment.js'
import { StorageTestBase } from './testBase.js'
import MetricsHandler from '../services/metrics/index.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

type Seed = {
    app: Application
    other: Application
    user: User
    peer: User
}

export default async (T: StorageTestBase) => {
    const seed = await seedAppOps(T)
    await testTotalsMatchScan(T, seed)
    await testUnpaidInvoiceCounts(T, seed)
    await testUnconfirmedTxExcludedFromReceived(T, seed)
    await testPeriodUsesPaidAt(T, seed)
    await testPageIsCapped(T, seed)
    await testSameSecondPagination(T, seed)
    await testUserCount(T, seed)
    await testBoundedModeIsExplicit(T, seed)
}

const seedAppOps = async (T: StorageTestBase): Promise<Seed> => {
    const suffix = Date.now().toString()
    const app = await T.storage.applicationStorage.AddApplication(`app-ops-${suffix}`, true)
    const other = await T.storage.applicationStorage.AddApplication(`app-ops-other-${suffix}`, true)
    const user = app.owner
    const peer = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `app-ops-peer-${suffix}`,
        balance_sats: 0,
        locked: false,
    })
    await T.storage.applicationStorage.AddApplicationUser(app, `u1-${suffix}`, 0)
    await T.storage.applicationStorage.AddApplicationUser(app, `u2-${suffix}`, 0)

    await T.storage.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
        user,
        linkedApplication: app,
        invoice: `lnbc-paid-${suffix}`,
        expires_at_unix: 1_800_000_000,
        paid_at_unix: 1_700_000_100,
        paid_amount: 1000,
        service_fee: 10,
        internal: false,
    })
    await T.storage.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
        user,
        linkedApplication: app,
        invoice: `lnbc-unpaid-${suffix}`,
        expires_at_unix: 1_800_000_000,
        paid_at_unix: 0,
        paid_amount: 0,
        service_fee: 0,
        internal: false,
    })
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-out-${suffix}`,
        paid_amount: 200,
        routing_fees: 1,
        service_fees: 5,
        paid_at_unix: 1_700_000_200,
        internal: false,
    })
    const address = await T.storage.dbs.CreateAndSave<UserReceivingAddress>('UserReceivingAddress', {
        user,
        linkedApplication: app,
        address: `bcrt1appops${suffix}`,
        callbackUrl: '',
    })
    await T.storage.dbs.CreateAndSave<AddressReceivingTransaction>('AddressReceivingTransaction', {
        user_address: address,
        tx_hash: crypto.randomBytes(32).toString('hex'),
        output_index: 0,
        paid_amount: 300,
        service_fee: 3,
        paid_at_unix: 1_700_000_300,
        confs: 3,
        internal: false,
    })
    await T.storage.dbs.CreateAndSave<AddressReceivingTransaction>('AddressReceivingTransaction', {
        user_address: address,
        tx_hash: crypto.randomBytes(32).toString('hex'),
        output_index: 1,
        paid_amount: 50,
        service_fee: 1,
        paid_at_unix: 1_700_000_310,
        confs: 0,
        internal: false,
    })
    await T.storage.dbs.CreateAndSave<UserTransactionPayment>('UserTransactionPayment', {
        user,
        linkedApplication: app,
        address: `bcrt1out${suffix}`,
        tx_hash: crypto.randomBytes(32).toString('hex'),
        output_index: 0,
        paid_amount: 80,
        chain_fees: 2,
        service_fees: 6,
        paid_at_unix: 1_700_000_400,
        internal: false,
    })
    await T.storage.dbs.CreateAndSave<UserToUserPayment>('UserToUserPayment', {
        from_user: user,
        to_user: peer,
        linkedApplication: app,
        paid_amount: 40,
        service_fees: 7,
        paid_at_unix: 1_700_000_500,
    })
    await T.storage.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
        user,
        linkedApplication: other,
        invoice: `lnbc-other-${suffix}`,
        expires_at_unix: 1_800_000_000,
        paid_at_unix: 1_700_000_600,
        paid_amount: 9999,
        service_fee: 99,
        internal: false,
    })
    for (let i = 0; i < 25; i++) {
        await T.storage.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
            user,
            linkedApplication: app,
            invoice: `lnbc-page-${suffix}-${i}`,
            expires_at_unix: 1_800_000_000,
            paid_at_unix: 1_700_000_700,
            paid_amount: 1,
            service_fee: 0,
            internal: false,
        })
    }
    return { app, other, user, peer }
}

const testTotalsMatchScan = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testTotalsMatchScan')
    const totals = await T.storage.paymentStorage.GetAppOperationTotals(seed.app, {})
    T.expect(totals).to.deep.equal(scanTotals(await T.storage.paymentStorage.GetAppOperations(seed.app, {})))
    T.expect(totals.received).to.equal(1000 + 300 + 25)
    T.expect(totals.spent).to.equal(200 + 80)
    T.expect(totals.fees).to.equal(10 + 3 + (5 - 1) + (6 - 2) + 7)
    T.d('Finished testTotalsMatchScan')
}

const testUnpaidInvoiceCounts = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testUnpaidInvoiceCounts')
    const totals = await T.storage.paymentStorage.GetAppOperationTotals(seed.app, {})
    T.expect(totals.invoices).to.equal(2 + 25)
    T.d('Finished testUnpaidInvoiceCounts')
}

const testUnconfirmedTxExcludedFromReceived = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testUnconfirmedTxExcludedFromReceived')
    const totals = await T.storage.paymentStorage.GetAppOperationTotals(seed.app, {})
    T.expect(totals.received).to.equal(1000 + 300 + 25)
    T.expect(totals.operations).to.equal(1 + 2 + 1 + 1 + 1 + 25)
    T.d('Finished testUnconfirmedTxExcludedFromReceived')
}

const testPeriodUsesPaidAt = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testPeriodUsesPaidAt')
    const totals = await T.storage.paymentStorage.GetAppOperationTotals(seed.app, {
        from: 1_700_000_000,
        to: 1_700_000_600,
    })
    T.expect(totals.received).to.equal(1000 + 300)
    T.expect(totals.spent).to.equal(200 + 80)
    T.expect(totals.fees).to.equal(10 + 3 + (5 - 1) + (6 - 2) + 7)
    T.expect(totals.operations).to.equal(6)
    // Invoice issuance remains a creation-time KPI; operation amounts use payment time.
    T.expect(totals.invoices).to.equal(0)
    T.d('Finished testPeriodUsesPaidAt')
}

const testPageIsCapped = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testPageIsCapped')
    const page = await T.storage.paymentStorage.GetAppOperationsPage(seed.app, {}, 5)
    T.expect(page.incomingInvoices.length).to.equal(5)
    T.expect(page.incomingInvoices[0].serial_id).to.be.greaterThan(page.incomingInvoices[4].serial_id)
    const other = await T.storage.paymentStorage.GetAppOperationsPage(seed.other, {}, 5)
    T.expect(other.incomingInvoices.length).to.equal(1)
    T.expect(other.incomingInvoices[0].paid_amount).to.equal(9999)
    T.d('Finished testPageIsCapped')
}

const testSameSecondPagination = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testSameSecondPagination')
    const first = await T.storage.paymentStorage.GetAppOperationsPage(seed.app, {}, 20)
    const cursorRow = first.incomingInvoices[19]
    const second = await T.storage.paymentStorage.GetAppOperationsPage(
        seed.app,
        { to: cursorRow.paid_at_unix },
        20,
        { kind: 'incomingInvoices', serialId: cursorRow.serial_id },
    )
    const firstIds = new Set(first.incomingInvoices.map(row => row.serial_id))
    const secondAtBoundary = second.incomingInvoices.filter(row => row.paid_at_unix === cursorRow.paid_at_unix)
    T.expect(secondAtBoundary).to.have.length(5)
    T.expect(secondAtBoundary.some(row => firstIds.has(row.serial_id))).to.equal(false)
    T.d('Finished testSameSecondPagination')
}

const testUserCount = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testUserCount')
    const n = await T.storage.applicationStorage.CountApplicationUsers(seed.app, {})
    const rows = await T.storage.applicationStorage.GetApplicationUsers(seed.app, {})
    T.expect(n).to.equal(rows.length)
    T.expect(n).to.equal(2)
    T.d('Finished testUserCount')
}

const testBoundedModeIsExplicit = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testBoundedModeIsExplicit')
    const metrics = new MetricsHandler(T.storage, null as never)
    const existingResponse = await metrics.GetAppMetrics({ include_operations: false }, seed.app)
    T.expect(existingResponse.users.no_balance).to.equal(2)
    T.expect(existingResponse.users.always_been_inactive).to.equal(2)

    const boundedResponse = await metrics.GetAppMetrics({ include_operations: false, bounded: true }, seed.app)
    T.expect(boundedResponse.users.total).to.equal(2)
    T.expect(boundedResponse.users.no_balance).to.equal(0)
    T.expect(boundedResponse.operations).to.deep.equal([])
    T.d('Finished testBoundedModeIsExplicit')
}

const scanTotals = (ops: Awaited<ReturnType<StorageTestBase['storage']['paymentStorage']['GetAppOperations']>>) => {
    let received = 0
    let spent = 0
    let fees = 0
    let operations = 0
    for (const i of ops.receivingInvoices) {
        if (i.paid_at_unix > 0) {
            received += i.paid_amount
            fees += i.service_fee
            operations++
        }
    }
    for (const txs of ops.receivingTransactions) {
        for (const tx of txs) {
            operations++
            if (tx.confs > 1) {
                received += tx.paid_amount
                fees += tx.service_fee
            }
        }
    }
    for (const i of ops.outgoingInvoices) {
        spent += i.paid_amount
        fees += i.service_fees - i.routing_fees
        operations++
    }
    for (const tx of ops.outgoingTransactions) {
        spent += tx.paid_amount
        fees += tx.service_fees - tx.chain_fees
        operations++
    }
    for (const op of ops.userToUser) {
        fees += op.service_fees
        operations++
    }
    return {
        received,
        spent,
        fees,
        invoices: ops.receivingInvoices.length,
        operations,
    }
}
