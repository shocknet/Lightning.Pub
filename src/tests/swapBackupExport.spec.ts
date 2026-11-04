import { randomBytes } from 'crypto'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

export default async (T: StorageTestBase) => {
    await testExportOmitsCompletedSwapHistory(T)
}

const testExportOmitsCompletedSwapHistory = async (T: StorageTestBase) => {
    T.d('starting swap backup export omits completed history')
    const userId = `swap-backup-${randomBytes(8).toString('hex')}`

    const invoiceQuote = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    const invoicePending = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        tx_id: 'ee'.repeat(32),
        lockup_tx_hex: '020000000001aabb',
        paid_at_unix: 1,
    }))
    const invoiceFailed = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        used: true,
        tx_id: '11'.repeat(32),
        lockup_tx_hex: '020000000001fail',
        failure_reason: 'timeout',
        completed_at_unix: 9,
    }))
    const invoiceDone = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        used: true,
        tx_id: '22'.repeat(32),
        lockup_tx_hex: '020000000001done',
        preimage: 'ff'.repeat(32),
        completed_at_unix: 9,
    }))
    const invoiceRefunded = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        tx_id: '33'.repeat(32),
        lockup_tx_hex: '020000000001ref',
        refund_tx_id: '44'.repeat(32),
    }))

    const reverseQuote = await T.storage.paymentStorage.AddTransactionSwap(transactionSwap(userId))
    const reversePending = await T.storage.paymentStorage.AddTransactionSwap(transactionSwap(userId, {
        paid_at_unix: 1,
        address_paid: 'bcrt1qdest',
        claim_tx_hex: '020000000002ccdd',
        lockup_tx_hex: '020000000003eeff',
    }))
    const reverseFailed = await T.storage.paymentStorage.AddTransactionSwap(transactionSwap(userId, {
        used: true,
        paid_at_unix: 1,
        address_paid: 'bcrt1qdest',
        failure_reason: 'claim failed',
        completed_at_unix: 9,
        claim_tx_hex: '020000000002fail',
    }))
    const reverseDone = await T.storage.paymentStorage.AddTransactionSwap(transactionSwap(userId, {
        used: true,
        paid_at_unix: 1,
        address_paid: 'bcrt1qdest',
        tx_id: '55'.repeat(32),
        completed_at_unix: 9,
        claim_tx_hex: '020000000002done',
        lockup_tx_hex: '020000000003done',
    }))

    const invoiceIds = (await T.storage.paymentStorage.ExportInvoiceSwaps()).map(s => s.swap_operation_id)
    T.expect(invoiceIds).to.not.include(invoiceQuote.swap_operation_id)
    T.expect(invoiceIds).to.include(invoicePending.swap_operation_id)
    T.expect(invoiceIds).to.include(invoiceFailed.swap_operation_id)
    T.expect(invoiceIds).to.include(invoiceDone.swap_operation_id)
    T.expect(invoiceIds).to.not.include(invoiceRefunded.swap_operation_id)

    const reverseIds = (await T.storage.paymentStorage.ExportTransactionSwaps()).map(s => s.swap_operation_id)
    T.expect(reverseIds).to.include(reversePending.swap_operation_id)
    T.expect(reverseIds).to.include(reverseFailed.swap_operation_id)
    T.expect(reverseIds).to.not.include(reverseQuote.swap_operation_id)
    T.expect(reverseIds).to.not.include(reverseDone.swap_operation_id)

    T.d('swap backups keep funded unrefunded submarine rows and drop quotes and refunded history')
}

const invoiceSwap = (userId: string, extra: Record<string, unknown> = {}) => ({
    app_user_id: userId,
    swap_quote_id: `sub-${randomBytes(8).toString('hex')}`,
    swap_tree: '{}',
    claim_public_key: 'aa'.repeat(33),
    payment_hash: 'bb'.repeat(32),
    timeout_block_height: 800_100,
    invoice: 'lnbc1-sub',
    invoice_amount: 1000,
    transaction_amount: 1100,
    swap_fee_sats: 80,
    chain_fee_sats: 20,
    sat_per_v_byte: 2,
    ephemeral_public_key: 'cc'.repeat(33),
    address: 'bcrt1qsubmarine',
    ephemeral_private_key: 'dd'.repeat(32),
    service_url: 'https://boltz.example',
    ...extra,
})

const transactionSwap = (userId: string, extra: Record<string, unknown> = {}) => ({
    app_user_id: userId,
    swap_quote_id: `rev-${randomBytes(8).toString('hex')}`,
    swap_tree: '{}',
    lockup_address: 'bcrt1qlockup',
    refund_public_key: '11'.repeat(33),
    timeout_block_height: 800_200,
    invoice: 'lnbc1-rev',
    invoice_amount: 1200,
    transaction_amount: 1000,
    swap_fee_sats: 50,
    chain_fee_sats: 15,
    preimage: '22'.repeat(32),
    ephemeral_public_key: '33'.repeat(33),
    ephemeral_private_key: '44'.repeat(32),
    service_url: 'https://boltz.example',
    ...extra,
})
