import { randomBytes } from 'crypto'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

export default async (T: StorageTestBase) => {
    await testExportKeepsPublishedSwapRecovery(T)
}

const testExportKeepsPublishedSwapRecovery = async (T: StorageTestBase) => {
    T.d('starting swap backup export keeps published recovery rows')
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
        refund_tx_hex: '020000000001refund',
    }))
    const invoiceLegacyRefundId = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        tx_id: '66'.repeat(32),
        lockup_tx_hex: '020000000001legacy',
        refund_tx_id: '77'.repeat(32),
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
        claim_published: true,
        lockup_tx_hex: '020000000003done',
    }))

    const invoiceRows = await T.storage.paymentStorage.ExportInvoiceSwaps()
    const invoiceIds = invoiceRows.map(s => s.swap_operation_id)
    T.expect(invoiceIds).to.not.include(invoiceQuote.swap_operation_id)
    T.expect(invoiceIds).to.include(invoicePending.swap_operation_id)
    T.expect(invoiceIds).to.include(invoiceFailed.swap_operation_id)
    T.expect(invoiceIds).to.include(invoiceDone.swap_operation_id)
    T.expect(invoiceIds).to.include(invoiceRefunded.swap_operation_id)
    T.expect(invoiceIds).to.include(invoiceLegacyRefundId.swap_operation_id)
    const exportedRefund = invoiceRows.find(s => s.swap_operation_id === invoiceRefunded.swap_operation_id)
    T.expect(exportedRefund?.ephemeral_private_key).to.equal(invoiceRefunded.ephemeral_private_key)
    T.expect(exportedRefund?.refund_tx_hex).to.equal('020000000001refund')
    const exportedLegacy = invoiceRows.find(s => s.swap_operation_id === invoiceLegacyRefundId.swap_operation_id)
    T.expect(exportedLegacy?.ephemeral_private_key).to.equal(invoiceLegacyRefundId.ephemeral_private_key)
    T.expect(exportedLegacy?.lockup_tx_hex).to.equal('020000000001legacy')

    const reverseRows = await T.storage.paymentStorage.ExportTransactionSwaps()
    const reverseIds = reverseRows.map(s => s.swap_operation_id)
    T.expect(reverseIds).to.include(reversePending.swap_operation_id)
    T.expect(reverseIds).to.include(reverseFailed.swap_operation_id)
    T.expect(reverseIds).to.not.include(reverseQuote.swap_operation_id)
    T.expect(reverseIds).to.include(reverseDone.swap_operation_id)
    const exportedClaim = reverseRows.find(s => s.swap_operation_id === reverseDone.swap_operation_id)
    T.expect(exportedClaim?.ephemeral_private_key).to.equal(reverseDone.ephemeral_private_key)
    T.expect(exportedClaim?.claim_tx_hex).to.equal('020000000002done')
    T.expect(exportedClaim?.claim_published).to.equal(true)
    T.expect(exportedClaim?.preimage).to.equal(reverseDone.preimage)

    T.d('swap backups keep funded submarine and started reverse recovery rows, including after publication')
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
