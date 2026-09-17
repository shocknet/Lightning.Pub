import crypto from 'crypto'
import { User } from '../services/storage/entity/User.js'
import { UserReceivingAddress } from '../services/storage/entity/UserReceivingAddress.js'
import { UserInvoicePayment } from '../services/storage/entity/UserInvoicePayment.js'
import { UserReceivingInvoice } from '../services/storage/entity/UserReceivingInvoice.js'
import { UserTransactionPayment } from '../services/storage/entity/UserTransactionPayment.js'
import { AddressReceivingTransaction } from '../services/storage/entity/AddressReceivingTransaction.js'
import { RootOperation } from '../services/storage/entity/RootOperation.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

type SeedData = {
    userA: User
    userB: User
    addressA: UserReceivingAddress
    paymentA: UserInvoicePayment
    paymentB: UserInvoicePayment
    invoiceA: UserReceivingInvoice
    invoiceB: UserReceivingInvoice
    txPaymentA: UserTransactionPayment
    txPaymentB: UserTransactionPayment
    addressTxA: AddressReceivingTransaction
    addressTxB: AddressReceivingTransaction
    rootInvoicePayment: RootOperation
    rootInvoice: RootOperation
    rootChainPayment: RootOperation
    rootChain: RootOperation
}

const invoicesFrom = (payments: UserInvoicePayment[]) =>
    payments.map(p => p.invoice).sort()

const invoicesFromReceiving = (invoices: UserReceivingInvoice[]) =>
    invoices.map(i => i.invoice).sort()

const txHashesFrom = (txs: UserTransactionPayment[]) =>
    txs.map(t => t.tx_hash).sort()

export default async (T: StorageTestBase) => {
    const seed = await seedData(T)
    await testEmptyBatchLookups(T)
    await testGetPaymentOwners(T, seed)
    await testGetInvoiceOwners(T, seed)
    await testGetTxHashPaymentOwners(T, seed)
    await testGetAddressReceivingTransactionsByTxHashes(T, seed)
    await testGetRootOperationsByIdentifiers(T, seed)
}

const seedData = async (T: StorageTestBase): Promise<SeedData> => {
    const suffix = Date.now().toString()
    const userA = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `batch-asset-user-a-${suffix}`,
        balance_sats: 0,
        locked: false,
    })
    const userB = await T.storage.dbs.CreateAndSave<User>('User', {
        user_id: `batch-asset-user-b-${suffix}`,
        balance_sats: 0,
        locked: false,
    })
    const addressA = await T.storage.dbs.CreateAndSave<UserReceivingAddress>('UserReceivingAddress', {
        user: userA,
        address: `bcrt1batch${suffix}a`,
        callbackUrl: '',
    })
    const paymentA = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user: userA,
        invoice: `lnbc-payment-a-${suffix}`,
        paid_amount: 100,
        routing_fees: 1,
        service_fees: 2,
        paid_at_unix: 1_700_000_000,
    })
    const paymentB = await T.storage.dbs.CreateAndSave<UserInvoicePayment>('UserInvoicePayment', {
        user: userB,
        invoice: `lnbc-payment-b-${suffix}`,
        paid_amount: 200,
        routing_fees: 2,
        service_fees: 3,
        paid_at_unix: 1_700_000_100,
    })
    const invoiceA = await T.storage.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
        user: userA,
        invoice: `lnbc-invoice-a-${suffix}`,
        expires_at_unix: 1_800_000_000,
        paid_at_unix: 1_700_000_200,
        paid_amount: 300,
    })
    const invoiceB = await T.storage.dbs.CreateAndSave<UserReceivingInvoice>('UserReceivingInvoice', {
        user: userB,
        invoice: `lnbc-invoice-b-${suffix}`,
        expires_at_unix: 1_800_000_100,
        paid_at_unix: 1_700_000_300,
        paid_amount: 400,
    })
    const txHashA = crypto.randomBytes(32).toString('hex')
    const txHashB = crypto.randomBytes(32).toString('hex')
    const txPaymentA = await T.storage.dbs.CreateAndSave<UserTransactionPayment>('UserTransactionPayment', {
        user: userA,
        address: addressA.address,
        tx_hash: txHashA,
        output_index: 0,
        paid_amount: 500,
        chain_fees: 10,
        service_fees: 5,
        paid_at_unix: 1_700_000_400,
    })
    const txPaymentB = await T.storage.dbs.CreateAndSave<UserTransactionPayment>('UserTransactionPayment', {
        user: userB,
        address: `bcrt1batch${suffix}b`,
        tx_hash: txHashB,
        output_index: 1,
        paid_amount: 600,
        chain_fees: 11,
        service_fees: 6,
        paid_at_unix: 1_700_000_500,
    })
    const addressTxA = await T.storage.dbs.CreateAndSave<AddressReceivingTransaction>('AddressReceivingTransaction', {
        user_address: addressA,
        tx_hash: txHashA,
        output_index: 0,
        paid_amount: 700,
        service_fee: 7,
        paid_at_unix: 1_700_000_600,
    })
    const addressTxB = await T.storage.dbs.CreateAndSave<AddressReceivingTransaction>('AddressReceivingTransaction', {
        user_address: addressA,
        tx_hash: txHashB,
        output_index: 2,
        paid_amount: 800,
        service_fee: 8,
        paid_at_unix: 1_700_000_700,
    })
    const rootInvoicePayment = await T.storage.metricsStorage.AddRootOperation(
        'invoice_payment', paymentA.invoice, 900,
    )
    const rootInvoice = await T.storage.metricsStorage.AddRootOperation(
        'invoice', invoiceA.invoice, 1000,
    )
    const rootChainPayment = await T.storage.metricsStorage.AddRootOperation(
        'chain_payment', txHashA, 1100,
    )
    const rootChain = await T.storage.metricsStorage.AddRootOperation(
        'chain', `${addressA.address}:${txHashA}:0`, 1200,
    )
    return {
        userA,
        userB,
        addressA,
        paymentA,
        paymentB,
        invoiceA,
        invoiceB,
        txPaymentA,
        txPaymentB,
        addressTxA,
        addressTxB,
        rootInvoicePayment,
        rootInvoice,
        rootChainPayment,
        rootChain,
    }
}

const testEmptyBatchLookups = async (T: StorageTestBase) => {
    T.d('Starting testEmptyBatchLookups')
    const paymentStorage = T.storage.paymentStorage
    const metricsStorage = T.storage.metricsStorage

    T.expect(await paymentStorage.GetPaymentOwners([])).to.deep.equal([])
    T.expect(await paymentStorage.GetInvoiceOwners([])).to.deep.equal([])
    T.expect(await paymentStorage.GetTxHashPaymentOwners([])).to.deep.equal([])
    T.expect(await paymentStorage.GetAddressReceivingTransactionsByTxHashes([])).to.deep.equal([])
    T.expect(await metricsStorage.GetRootOperationsByIdentifiers('invoice_payment', [])).to.deep.equal([])
    T.expect(await metricsStorage.GetRootOperationsByIdentifiers('invoice', [])).to.deep.equal([])
    T.expect(await metricsStorage.GetRootOperationsByIdentifiers('chain_payment', [])).to.deep.equal([])
    T.expect(await metricsStorage.GetRootOperationsByIdentifiers('chain', [])).to.deep.equal([])

    T.d('Finished testEmptyBatchLookups')
}

const testGetPaymentOwners = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testGetPaymentOwners')
    const { paymentA, paymentB, userA, userB } = seed

    const found = await T.storage.paymentStorage.GetPaymentOwners([
        paymentA.invoice,
        paymentB.invoice,
        'lnbc-missing-invoice',
    ])
    T.expect(invoicesFrom(found)).to.deep.equal(invoicesFrom([paymentA, paymentB]))

    const byUser = new Map(found.map(p => [p.invoice, p.user.user_id]))
    T.expect(byUser.get(paymentA.invoice)).to.equal(userA.user_id)
    T.expect(byUser.get(paymentB.invoice)).to.equal(userB.user_id)

    const single = await T.storage.paymentStorage.GetPaymentOwners([paymentA.invoice])
    T.expect(single.length).to.equal(1)
    T.expect(single[0].invoice).to.equal(paymentA.invoice)

    T.d('Finished testGetPaymentOwners')
}

const testGetInvoiceOwners = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testGetInvoiceOwners')
    const { invoiceA, invoiceB, userA, userB } = seed

    const found = await T.storage.paymentStorage.GetInvoiceOwners([
        invoiceB.invoice,
        invoiceA.invoice,
        'lnbc-missing-invoice',
    ])
    T.expect(invoicesFromReceiving(found)).to.deep.equal(invoicesFromReceiving([invoiceA, invoiceB]))

    const byUser = new Map(found.map(i => [i.invoice, i.user.user_id]))
    T.expect(byUser.get(invoiceA.invoice)).to.equal(userA.user_id)
    T.expect(byUser.get(invoiceB.invoice)).to.equal(userB.user_id)

    T.d('Finished testGetInvoiceOwners')
}

const testGetTxHashPaymentOwners = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testGetTxHashPaymentOwners')
    const { txPaymentA, txPaymentB, userA, userB } = seed

    const found = await T.storage.paymentStorage.GetTxHashPaymentOwners([
        txPaymentB.tx_hash,
        txPaymentA.tx_hash,
        crypto.randomBytes(32).toString('hex'),
    ])
    T.expect(txHashesFrom(found)).to.deep.equal(txHashesFrom([txPaymentA, txPaymentB]))

    const byUser = new Map(found.map(t => [t.tx_hash, t.user.user_id]))
    T.expect(byUser.get(txPaymentA.tx_hash)).to.equal(userA.user_id)
    T.expect(byUser.get(txPaymentB.tx_hash)).to.equal(userB.user_id)

    T.d('Finished testGetTxHashPaymentOwners')
}

const testGetAddressReceivingTransactionsByTxHashes = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testGetAddressReceivingTransactionsByTxHashes')
    const { addressTxA, addressTxB, userA } = seed

    const found = await T.storage.paymentStorage.GetAddressReceivingTransactionsByTxHashes([
        addressTxB.tx_hash,
        addressTxA.tx_hash,
        crypto.randomBytes(32).toString('hex'),
    ])
    T.expect(found.length).to.equal(2)

    const byTxHash = new Map(found.map(t => [t.tx_hash, t]))
    T.expect(byTxHash.get(addressTxA.tx_hash)?.paid_amount).to.equal(addressTxA.paid_amount)
    T.expect(byTxHash.get(addressTxB.tx_hash)?.paid_amount).to.equal(addressTxB.paid_amount)
    T.expect(byTxHash.get(addressTxA.tx_hash)?.user_address.user.user_id).to.equal(userA.user_id)

    T.d('Finished testGetAddressReceivingTransactionsByTxHashes')
}

const testGetRootOperationsByIdentifiers = async (T: StorageTestBase, seed: SeedData) => {
    T.d('Starting testGetRootOperationsByIdentifiers')
    const {
        rootInvoicePayment,
        rootInvoice,
        rootChainPayment,
        rootChain,
        paymentA,
        invoiceA,
        txPaymentA,
        addressA,
    } = seed

    const invoicePayments = await T.storage.metricsStorage.GetRootOperationsByIdentifiers(
        'invoice_payment',
        [paymentA.invoice, 'missing-invoice-payment'],
    )
    T.expect(invoicePayments.length).to.equal(1)
    T.expect(invoicePayments[0].operation_identifier).to.equal(rootInvoicePayment.operation_identifier)
    T.expect(invoicePayments[0].operation_amount).to.equal(rootInvoicePayment.operation_amount)

    const invoices = await T.storage.metricsStorage.GetRootOperationsByIdentifiers(
        'invoice',
        [invoiceA.invoice],
    )
    T.expect(invoices.length).to.equal(1)
    T.expect(invoices[0].operation_identifier).to.equal(rootInvoice.operation_identifier)

    const chainPayments = await T.storage.metricsStorage.GetRootOperationsByIdentifiers(
        'chain_payment',
        [txPaymentA.tx_hash],
    )
    T.expect(chainPayments.length).to.equal(1)
    T.expect(chainPayments[0].operation_identifier).to.equal(rootChainPayment.operation_identifier)

    const chainOps = await T.storage.metricsStorage.GetRootOperationsByIdentifiers(
        'chain',
        [`${addressA.address}:${txPaymentA.tx_hash}:0`, 'addr:tx:99'],
    )
    T.expect(chainOps.length).to.equal(1)
    T.expect(chainOps[0].operation_identifier).to.equal(rootChain.operation_identifier)

    const wrongType = await T.storage.metricsStorage.GetRootOperationsByIdentifiers(
        'invoice',
        [paymentA.invoice],
    )
    T.expect(wrongType.length).to.equal(0)

    T.d('Finished testGetRootOperationsByIdentifiers')
}
