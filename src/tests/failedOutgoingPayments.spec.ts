import { Application } from '../services/storage/entity/Application.js'
import { User } from '../services/storage/entity/User.js'
import { UserInvoicePayment } from '../services/storage/entity/UserInvoicePayment.js'
import MetricsHandler from '../services/metrics/index.js'
import { StorageTestBase } from './testBase.js'
import { isLndPaymentFailureReason, toOperatorPaymentFailure } from '../services/helpers/paymentFailureReason.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

type Seed = {
    app: Application
    user: User
    noRoute: UserInvoicePayment
    liquidity: UserInvoicePayment
    timeout: UserInvoicePayment
    pending: UserInvoicePayment
    success: UserInvoicePayment
}

export default async (T: StorageTestBase) => {
    testOperatorReasonMapping(T)
    const seed = await seedFailedPayments(T)
    await testListExcludesSuccessAndPending(T, seed)
    await testListIsTimeBounded(T, seed)
    await testReasonCountsMatchWindow(T, seed)
    await testSerialCursorDoesNotDropRows(T, seed)
}

const testOperatorReasonMapping = (T: StorageTestBase) => {
    T.d('Starting testOperatorReasonMapping')
    T.expect(toOperatorPaymentFailure('FAILURE_REASON_NO_ROUTE')).to.deep.equal({
        code: 'no_route',
        label: 'Graph cannot reach dest, or all paths failed',
    })
    T.expect(toOperatorPaymentFailure('FAILURE_REASON_INSUFFICIENT_BALANCE')).to.deep.equal({
        code: 'insufficient_liquidity',
        label: 'Liquidity problem (channels or provider)',
    })
    T.expect(toOperatorPaymentFailure('FAILURE_REASON_TIMEOUT')).to.deep.equal({
        code: 'timeout',
        label: 'Routes exist but payment did not settle in time',
    })
    T.expect(isLndPaymentFailureReason('FAILURE_REASON_NO_ROUTE')).to.equal(true)
    T.expect(isLndPaymentFailureReason('PROVIDER_FAILED')).to.equal(false)
    T.d('Finished testOperatorReasonMapping')
}

const seedFailedPayments = async (T: StorageTestBase): Promise<Seed> => {
    const suffix = Date.now().toString()
    const app = await T.storage.applicationStorage.AddApplication(`failed-pay-${suffix}`, true)
    const user = app.owner
    const inWindow = new Date('2024-06-15T12:00:00Z')
    const outOfWindow = new Date('2023-01-01T00:00:00Z')

    const noRoute = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-fail-noroute-${suffix}`,
        paid_amount: 500,
        routing_fees: 0,
        service_fees: 5,
        paid_at_unix: -1,
        internal: false,
        failure_reason: 'FAILURE_REASON_NO_ROUTE',
        dest_pubkey: '02' + 'ab'.repeat(32),
    })
    const liquidity = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-fail-liq-${suffix}`,
        paid_amount: 700,
        routing_fees: 0,
        service_fees: 7,
        paid_at_unix: -1,
        internal: false,
        failure_reason: 'FAILURE_REASON_INSUFFICIENT_BALANCE',
        dest_pubkey: '03' + 'cd'.repeat(32),
    })
    const timeout = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-fail-timeout-${suffix}`,
        paid_amount: 300,
        routing_fees: 0,
        service_fees: 3,
        paid_at_unix: -1,
        internal: false,
        failure_reason: 'FAILURE_REASON_TIMEOUT',
        dest_pubkey: '02' + 'ef'.repeat(32),
    })
    const pending = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-pending-${suffix}`,
        paid_amount: 100,
        routing_fees: 0,
        service_fees: 1,
        paid_at_unix: 0,
        internal: false,
        failure_reason: '',
        dest_pubkey: '02' + '11'.repeat(32),
    })
    const success = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-success-${suffix}`,
        paid_amount: 200,
        routing_fees: 1,
        service_fees: 2,
        paid_at_unix: 1_700_000_000,
        internal: false,
        failure_reason: '',
        dest_pubkey: '02' + '22'.repeat(32),
    })
    await Promise.all([
        T.storage.dbs.Update<UserInvoicePayment>('UserInvoicePayment', noRoute.serial_id, { updated_at: inWindow, created_at: inWindow }),
        T.storage.dbs.Update<UserInvoicePayment>('UserInvoicePayment', liquidity.serial_id, { updated_at: inWindow, created_at: inWindow }),
        T.storage.dbs.Update<UserInvoicePayment>('UserInvoicePayment', timeout.serial_id, { updated_at: outOfWindow, created_at: outOfWindow }),
        T.storage.dbs.Update<UserInvoicePayment>('UserInvoicePayment', pending.serial_id, { updated_at: inWindow, created_at: inWindow }),
        T.storage.dbs.Update<UserInvoicePayment>('UserInvoicePayment', success.serial_id, { updated_at: inWindow, created_at: inWindow }),
    ])
    return { app, user, noRoute, liquidity, timeout, pending, success }
}

const metrics = (T: StorageTestBase) => new MetricsHandler(T.storage, null as never)

const testListExcludesSuccessAndPending = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testListExcludesSuccessAndPending')
    const res = await metrics(T).GetFailedOutgoingPayments({
        from_unix: Math.floor(new Date('2024-06-01T00:00:00Z').getTime() / 1000),
        to_unix: Math.floor(new Date('2024-07-01T00:00:00Z').getTime() / 1000),
        take: 50,
    })
    const invoices = res.payments.map(p => p.invoice)
    T.expect(invoices).to.include(seed.noRoute.invoice)
    T.expect(invoices).to.include(seed.liquidity.invoice)
    T.expect(invoices).to.not.include(seed.pending.invoice)
    T.expect(invoices).to.not.include(seed.success.invoice)
    T.expect(invoices).to.not.include(seed.timeout.invoice)

    const noRoute = res.payments.find(p => p.invoice === seed.noRoute.invoice)!
    T.expect(noRoute.user_id).to.equal(seed.user.user_id)
    T.expect(noRoute.amount_sats).to.equal(500)
    T.expect(noRoute.failure_reason).to.equal('FAILURE_REASON_NO_ROUTE')
    T.expect(noRoute.operator_reason).to.equal('Graph cannot reach dest, or all paths failed')
    T.expect(noRoute.dest_pubkey).to.equal(seed.noRoute.dest_pubkey)
    T.expect(noRoute.app_id).to.equal(seed.app.app_id)
    T.d('Finished testListExcludesSuccessAndPending')
}

const testListIsTimeBounded = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testListIsTimeBounded')
    const oldOnly = await metrics(T).GetFailedOutgoingPayments({
        from_unix: Math.floor(new Date('2022-12-01T00:00:00Z').getTime() / 1000),
        to_unix: Math.floor(new Date('2023-02-01T00:00:00Z').getTime() / 1000),
        take: 50,
    })
    const invoices = oldOnly.payments.map(p => p.invoice)
    T.expect(invoices).to.include(seed.timeout.invoice)
    T.expect(invoices).to.not.include(seed.noRoute.invoice)
    T.expect(invoices).to.not.include(seed.liquidity.invoice)
    T.d('Finished testListIsTimeBounded')
}

const testReasonCountsMatchWindow = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testReasonCountsMatchWindow')
    const res = await metrics(T).GetFailedOutgoingPayments({
        from_unix: Math.floor(new Date('2024-06-01T00:00:00Z').getTime() / 1000),
        to_unix: Math.floor(new Date('2024-07-01T00:00:00Z').getTime() / 1000),
        take: 50,
    })
    const byReason = Object.fromEntries(res.reason_counts.map(c => [c.failure_reason, c]))
    T.expect(byReason['FAILURE_REASON_NO_ROUTE']?.count).to.equal(1)
    T.expect(byReason['FAILURE_REASON_INSUFFICIENT_BALANCE']?.count).to.equal(1)
    T.expect(byReason['FAILURE_REASON_TIMEOUT']).to.equal(undefined)
    T.expect(byReason['FAILURE_REASON_NO_ROUTE']?.operator_reason).to.equal(
        'Graph cannot reach dest, or all paths failed'
    )
    T.expect(byReason['FAILURE_REASON_INSUFFICIENT_BALANCE']?.operator_reason).to.equal(
        'Liquidity problem (channels or provider)'
    )
    T.d('Finished testReasonCountsMatchWindow')
}

const testSerialCursorDoesNotDropRows = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testSerialCursorDoesNotDropRows')
    const range = {
        from_unix: Math.floor(new Date('2024-06-01T00:00:00Z').getTime() / 1000),
        to_unix: Math.floor(new Date('2024-07-01T00:00:00Z').getTime() / 1000),
    }
    const first = await metrics(T).GetFailedOutgoingPayments({ ...range, take: 1 })
    T.expect(first.payments).to.have.length(1)
    const second = await metrics(T).GetFailedOutgoingPayments({
        ...range,
        take: 1,
        from_serial_id: first.payments[0].serial_id,
    })
    T.expect(second.payments).to.have.length(1)
    T.expect(second.payments[0].serial_id).to.be.lessThan(first.payments[0].serial_id)
    T.expect(second.payments[0].invoice).to.not.equal(first.payments[0].invoice)
    const invoices = [first.payments[0].invoice, second.payments[0].invoice]
    T.expect(invoices).to.include(seed.noRoute.invoice)
    T.expect(invoices).to.include(seed.liquidity.invoice)
    T.expect(first.reason_counts).to.deep.equal(second.reason_counts)
    T.d('Finished testSerialCursorDoesNotDropRows')
}
