import { Application } from '../services/storage/entity/Application.js'
import { User } from '../services/storage/entity/User.js'
import { UserInvoicePayment } from '../services/storage/entity/UserInvoicePayment.js'
import MetricsHandler from '../services/metrics/index.js'
import { StorageTestBase } from './testBase.js'
import { destPubkeyFromBolt11 } from '../services/helpers/paymentFailureReason.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

/** BOLT11 with explicit `n` (payee) tag. */
const BOLT11_WITH_PAYEE =
    'lnbc10n1pj48ugqpp54w46h2at4w46h2at4w46h2at4w46h2at4w46h2at4w46h2at4w4sdq0v3jhxapdw3jhxaqnp4qvdcf32k0vfxgsyet5ldt246q4jaw8scx3sysx0lnstlt6w4m5rc72x6m7sqprhr5nu3977q5yuj78g7jckdq7f59xl49c4p9pupm8tmz6ddhexanqsj4qywvxqmmff4wnjwyqlxjd7y7fnrf55y0ygcwf7sqts06ap'
/** Real invoice with no `n` tag — dest must be recovered from the signature. */
const BOLT11_WITHOUT_PAYEE =
    'lnbc20u1p3y0x3hpp5743k2g0fsqqxj7n8qzuhns5gmkk4djeejk3wkp64ppevgekvc0jsdqcve5kzar2v9nr5gpqd4hkuetesp5ez2g297jduwc20t6lmqlsg3man0vf2jfd8ar9fh8fhn2g8yttfkqxqy9gcqcqzys9qrsgqrzjqtx3k77yrrav9hye7zar2rtqlfkytl094dsp0ms5majzth6gt7ca6uhdkxl983uywgqqqqlgqqqvx5qqjqrzjqd98kxkpyw0l9tyy8r8q57k7zpy9zjmh6sez752wj6gcumqnj3yxzhdsmg6qq56utgqqqqqqqqqqqeqqjq7jd56882gtxhrjm03c93aacyfy306m4fq0tskf83c0nmet8zc2lxyyg3saz8x6vwcp26xnrlagf9semau3qm2glysp7sv95693fphvsp54l567'
const PAYEE_FROM_N_TAG = destPubkeyFromBolt11(BOLT11_WITH_PAYEE)
const PAYEE_FROM_SIGNATURE = destPubkeyFromBolt11(BOLT11_WITHOUT_PAYEE)

const DEST_A = '02' + 'aa'.repeat(32)
const DEST_B = '03' + 'bb'.repeat(32)

type Seed = {
    app: Application
    user: User
    unsignedDest: UserInvoicePayment
}

export default async (T: StorageTestBase) => {
    T.expect(PAYEE_FROM_N_TAG).to.equal(
        '031b84c5567b126440995d3ed5aaba0565d71e1834604819ff9c17f5e9d5dd078f',
    )
    T.expect(PAYEE_FROM_SIGNATURE).to.equal(
        '02b03872191e5c1f1d23fd13602a2b7a982153897250bf2fabd4e8132727bcfa6f',
    )
    T.expect(destPubkeyFromBolt11('lnbc-not-an-invoice')).to.equal('')
    const seed = await seedPayments(T)
    await testGroupsByDestAndSortsByVolume(T, seed)
    await testExcludesInternalPendingFailedAndOutOfWindow(T, seed)
    await testQueryTimeDestFromSignature(T, seed)
    await testUnboundedRangeIncludesRows(T, seed)
    await testPersistsDestPubkeyFromInvoice(T, seed)
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
    // Empty dest_pubkey — dest recovered from bolt11 signature (no `n` tag)
    const unsignedDest = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user,
        linkedApplication: app,
        invoice: BOLT11_WITHOUT_PAYEE,
        paid_amount: 50,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: paidInWindow + 3,
        internal: false,
        dest_pubkey: '',
    })

    return { app, user, unsignedDest }
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

const testQueryTimeDestFromSignature = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testQueryTimeDestFromSignature')
    T.expect(seed.unsignedDest.dest_pubkey).to.equal('')
    const res = await metrics(T).GetPaymentDestinations({
        from_unix: inWindowFrom,
        to_unix: inWindowTo,
    })
    const recovered = res.destinations.find(d => d.pubkey === PAYEE_FROM_SIGNATURE)
    T.expect(recovered).to.not.equal(undefined)
    T.expect(recovered!.count).to.equal(1)
    T.expect(recovered!.volume_sats).to.equal(50)
    T.d('Finished testQueryTimeDestFromSignature')
}

const testUnboundedRangeIncludesRows = async (T: StorageTestBase, _seed: Seed) => {
    T.d('Starting testUnboundedRangeIncludesRows')
    const res = await metrics(T).GetPaymentDestinations({})
    const byPub = new Map(res.destinations.map(d => [d.pubkey, d]))
    // Unbounded includes the out-of-window DEST_B payment (9000) as well
    T.expect(byPub.get(DEST_B)?.count).to.equal(2)
    T.expect(byPub.get(DEST_B)?.volume_sats).to.equal(1000 + 9000)
    T.expect(byPub.get(DEST_A)?.volume_sats).to.equal(300)
    T.expect(byPub.has(PAYEE_FROM_SIGNATURE)).to.equal(true)
    T.d('Finished testUnboundedRangeIncludesRows')
}

const testPersistsDestPubkeyFromInvoice = async (T: StorageTestBase, seed: Seed) => {
    T.d('Starting testPersistsDestPubkeyFromInvoice')
    const historicalDate = new Date('2024-06-15T12:00:00Z')
    const historicalFailed = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user: seed.user,
        linkedApplication: seed.app,
        invoice: BOLT11_WITH_PAYEE,
        paid_amount: 75,
        routing_fees: 0,
        service_fees: 0,
        paid_at_unix: -1,
        internal: false,
        failure_reason: 'FAILURE_REASON_NO_ROUTE',
        dest_pubkey: '',
    })
    await T.storage.dbs.Update<UserInvoicePayment>('UserInvoicePayment', historicalFailed.serial_id, {
        updated_at: historicalDate,
        created_at: historicalDate,
    })

    const before = await T.storage.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', {
        where: { serial_id: seed.unsignedDest.serial_id },
    })
    T.expect(before?.dest_pubkey).to.equal('')
    const updated = await T.storage.paymentStorage.BackfillEmptyDestPubkeys()
    T.expect(updated).to.be.greaterThan(0)
    const after = await T.storage.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', {
        where: { serial_id: seed.unsignedDest.serial_id },
    })
    T.expect(after?.dest_pubkey).to.equal(PAYEE_FROM_SIGNATURE)

    const failedAfter = await T.storage.dbs.FindOne<UserInvoicePayment>('UserInvoicePayment', {
        where: { serial_id: historicalFailed.serial_id },
    })
    T.expect(failedAfter?.dest_pubkey).to.equal(PAYEE_FROM_N_TAG)
    T.expect(new Date(failedAfter!.updated_at).getTime()).to.equal(historicalDate.getTime())
    T.d('Finished testPersistsDestPubkeyFromInvoice')
}
