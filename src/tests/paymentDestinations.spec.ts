import { Application } from '../services/storage/entity/Application.js'
import { User } from '../services/storage/entity/User.js'
import { UserInvoicePayment } from '../services/storage/entity/UserInvoicePayment.js'
import MetricsHandler from '../services/metrics/index.js'
import { StorageTestBase } from './testBase.js'
import { destPubkeyFromBolt11 } from '../services/helpers/paymentFailureReason.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

/** BOLT11 with explicit `n` (payee) tag for dest backfill coverage. */
const BOLT11_WITH_PAYEE =
    'lnbc10n1pj48ugqpp54w46h2at4w46h2at4w46h2at4w46h2at4w46h2at4w46h2at4w4sdq0v3jhxapdw3jhxaqnp4qvdcf32k0vfxgsyet5ldt246q4jaw8scx3sysx0lnstlt6w4m5rc72x6m7sqprhr5nu3977q5yuj78g7jckdq7f59xl49c4p9pupm8tmz6ddhexanqsj4qywvxqmmff4wnjwyqlxjd7y7fnrf55y0ygcwf7sqts06ap'
const PAYEE_FROM_BOLT11 = destPubkeyFromBolt11(BOLT11_WITH_PAYEE)

const DEST_A = '02' + 'aa'.repeat(32)
const DEST_B = '03' + 'bb'.repeat(32)

type Seed = {
    app: Application
    user: User
}

export default async (T: StorageTestBase) => {
    T.expect(PAYEE_FROM_BOLT11).to.equal(
        '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
    )
    const seed = await seedPayments(T)
    await testGroupsByDestAndSortsByVolume(T, seed)
    await testExcludesInternalPendingFailedAndOutOfWindow(T, seed)
    await testBackfillsDestFromBolt11(T, seed)
    await testUnboundedRangeIncludesRows(T, seed)
}

const metrics = (T: StorageTestBase) => new MetricsHandler(T.storage, null as never)

const inWindowFrom = Math.floor(new Date('2024-06-01T00:00:00Z').getTime() / 1000)
const inWindowTo = Math.floor(new Date('2024-07-01T00:00:00Z').getTime() / 1000)
const paidInWindow = Math.floor(new Date('2024-06-15T12:00:00Z').getTime() / 1000)
const paidOutOfWindow = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000)

const seedPayments = async (T: StorageTestBase): Promise<Seed> => {
    const suffix = Date.now().toString()
    const app = await T.storage.applicationStorage.AddApplication(`pay-dest-${suffix}`, true)
    const user = app.owner

    // Dest A: 2 pays, 100 + 200 = 300 sats total
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-a1-${suffix}`,
        paid_amount: 100,
        routing_fees: 1,
        service_fees: 1,
        paid_at_unix: paidInWindow,
        internal: false,
        dest_pubkey: DEST_A,
    })
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-a2-${suffix}`,
        paid_amount: 200,
        routing_fees: 1,
        service_fees: 1,
        paid_at_unix: paidInWindow + 1,
        internal: false,
        dest_pubkey: DEST_A,
    })
    // Dest B: 1 pay, 1000 sats — should sort first by volume
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-b1-${suffix}`,
        paid_amount: 1000,
        routing_fees: 2,
        service_fees: 2,
        paid_at_unix: paidInWindow + 2,
        internal: false,
        dest_pubkey: DEST_B,
    })
    // Exclusions
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-internal-${suffix}`,
        paid_amount: 5000,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: paidInWindow,
        internal: true,
        dest_pubkey: DEST_A,
    })
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-pending-${suffix}`,
        paid_amount: 5000,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: 0,
        internal: false,
        dest_pubkey: DEST_A,
    })
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-failed-${suffix}`,
        paid_amount: 5000,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: -1,
        internal: false,
        dest_pubkey: DEST_A,
        failure_reason: 'FAILURE_REASON_NO_ROUTE',
    })
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: `lnbc-dest-old-${suffix}`,
        paid_amount: 9000,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: paidOutOfWindow,
        internal: false,
        dest_pubkey: DEST_B,
    })
    // Empty dest_pubkey — backfill from bolt11 payee
    await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: BOLT11_WITH_PAYEE,
        paid_amount: 50,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: paidInWindow + 3,
        internal: false,
        dest_pubkey: '',
    })

    return { app, user }
}

const testGroupsByDestAndSortsByVolume = async (T: StorageTestBase, _seed: Seed) => {
    T.d('Starting testGroupsByDestAndSortsByVolume')
    const res = await metrics(T).GetPaymentDestinations({
        from_unix: inWindowFrom,
        to_unix: inWindowTo,
    })
    const byPub = new Map(res.destinations.map(d => [d.pubkey, d]))
    T.expect(byPub.get(DEST_B)?.count).to.equal(1)
    T.expect(byPub.get(DEST_B)?.volume_sats).to.equal(1000)
    T.expect(byPub.get(DEST_A)?.count).to.equal(2)
    T.expect(byPub.get(DEST_A)?.volume_sats).to.equal(300)
    T.expect(res.destinations[0].pubkey).to.equal(DEST_B)
    T.expect(res.destinations[1].pubkey).to.equal(DEST_A)
    T.d('Finished testGroupsByDestAndSortsByVolume')
}

const testExcludesInternalPendingFailedAndOutOfWindow = async (T: StorageTestBase, _seed: Seed) => {
    T.d('Starting testExcludesInternalPendingFailedAndOutOfWindow')
    const res = await metrics(T).GetPaymentDestinations({
        from_unix: inWindowFrom,
        to_unix: inWindowTo,
    })
    const destA = res.destinations.find(d => d.pubkey === DEST_A)!
    const destB = res.destinations.find(d => d.pubkey === DEST_B)!
    // Internal/pending/failed would inflate A; old would inflate B
    T.expect(destA.volume_sats).to.equal(300)
    T.expect(destA.count).to.equal(2)
    T.expect(destB.volume_sats).to.equal(1000)
    T.expect(destB.count).to.equal(1)
    T.d('Finished testExcludesInternalPendingFailedAndOutOfWindow')
}

const testBackfillsDestFromBolt11 = async (T: StorageTestBase, _seed: Seed) => {
    T.d('Starting testBackfillsDestFromBolt11')
    const res = await metrics(T).GetPaymentDestinations({
        from_unix: inWindowFrom,
        to_unix: inWindowTo,
    })
    const backfilled = res.destinations.find(d => d.pubkey === PAYEE_FROM_BOLT11)
    T.expect(backfilled).to.not.equal(undefined)
    T.expect(backfilled!.count).to.equal(1)
    T.expect(backfilled!.volume_sats).to.equal(50)
    T.d('Finished testBackfillsDestFromBolt11')
}

const testUnboundedRangeIncludesRows = async (T: StorageTestBase, _seed: Seed) => {
    T.d('Starting testUnboundedRangeIncludesRows')
    const res = await metrics(T).GetPaymentDestinations({})
    const byPub = new Map(res.destinations.map(d => [d.pubkey, d]))
    // Unbounded includes the out-of-window DEST_B payment (9000) as well
    T.expect(byPub.get(DEST_B)?.count).to.equal(2)
    T.expect(byPub.get(DEST_B)?.volume_sats).to.equal(1000 + 9000)
    T.expect(byPub.get(DEST_A)?.volume_sats).to.equal(300)
    T.expect(byPub.has(PAYEE_FROM_BOLT11)).to.equal(true)
    T.d('Finished testUnboundedRangeIncludesRows')
}
