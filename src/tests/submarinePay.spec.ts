import { Transaction } from 'bitcoinjs-lib'
import { randomBytes } from 'crypto'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { ADMIN_SWAP_ACTOR, ADMIN_SWAP_OWNER_ID } from '../services/lnd/swaps/swapOwnership.js'
import { checkSubmarineTimeout, MIN_SUBMARINE_TIMEOUT_BLOCKS, SubmarineSwaps } from '../services/lnd/swaps/submarineSwaps.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const MOCK_URL = 'http://mock-boltz'
const LOCKUP_A = dummyTxHex('aa')
const LOCKUP_B = dummyTxHex('bb')
const TX_A = Transaction.fromHex(LOCKUP_A).getId()
const TX_B = Transaction.fromHex(LOCKUP_B).getId()

export default async (T: StorageTestBase) => {
    await testFundingPersistRejectsReplacement(T)
    await testFundingPersistIsIdempotentForSameTx(T)
    await testConcurrentPayIsRejectedWhileInFlight(T)
    await testRetryAfterPersistErrorRepublishesStoredLockup(T)
    await testRetryAfterPersistDoesNotRequireNewFundingWindow(T)
    await testNewFundingStillRequiresTimeoutWindow(T)
    await testDelayedSecondPayDoesNotReplaceStoredFunding(T)
    await testVerifyFailureReleasesGuard(T)
    await testSiblingPersistIsRejectedAfterFirstFunding(T)
    await testSiblingPayIsRejectedAfterFirstFunding(T)
    await testConcurrentSiblingPayIsRejectedWhileFirstInFlight(T)
    await testSiblingPayAllowedAfterVerifyFailureReleasesReservation(T)
    await testPendingListHidesUnfundedSibling(T)
    await testEnsureRootOperationIsIdempotent(T)
    await testUserPayDoesNotRecordRootOp(T)
    await testAdminFreshPayRecordsRootOp(T)
    await testAdminRetryAfterPersistRecordsRootOpOnce(T)
    await testAdminResumeRecordsRootOpOnce(T)
}

function dummyTxHex(tag: string) {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(Buffer.alloc(32), 0)
    tx.addOutput(Buffer.from('6a' + tag.padEnd(2, '0'), 'hex'), 0)
    return tx.toHex()
}

const invoiceSwap = (userId: string, extra: Record<string, unknown> = {}) => ({
    app_user_id: userId,
    swap_quote_id: `quote-${randomBytes(8).toString('hex')}`,
    swap_tree: '{}',
    claim_public_key: 'aa'.repeat(33),
    payment_hash: 'bb'.repeat(32),
    timeout_block_height: 920_000 + 144,
    invoice: 'lnbcrt-test',
    invoice_amount: 100_000,
    transaction_amount: 101_000,
    swap_fee_sats: 1_000,
    chain_fee_sats: 200,
    sat_per_v_byte: 2,
    ephemeral_public_key: 'cc'.repeat(33),
    address: 'bcrt1qlockup',
    ephemeral_private_key: 'dd'.repeat(32),
    service_url: MOCK_URL,
    ...extra,
})

const mockSettings = {
    getSettings: () => ({
        lndSettings: { network: 'regtest' as const },
        swapsSettings: {
            enableSwaps: true,
            boltzHttpUrl: '',
            boltzWebSocketUrl: '',
            boltsHttpUrlAlt: '',
            boltsWebSocketUrlAlt: '',
        },
    }),
}

const deleteOtherUnfinished = async (T: StorageTestBase, keepId: string) => {
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== keepId) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
}

const makeSwaps = (T: StorageTestBase) => {
    const swapper = new SubmarineSwaps({ httpUrl: MOCK_URL, wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps(mockSettings as any, T.storage)
    swaps.subSwappers[MOCK_URL] = swapper
    const broadcasts: string[] = []
    swaps.SetLnd({
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => {
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
    } as any)
    swapper.VerifySubmarineQuote = async () => ({ ok: true as const })
    swapper.SubscribeToInvoiceSwap = (_data, _done, waitingTx) => {
        void Promise.resolve().then(() => waitingTx())
        return () => { }
    }
    return { swaps, swapper, broadcasts }
}

const testFundingPersistRejectsReplacement = async (T: StorageTestBase) => {
    T.d('starting invoice swap funding persist rejects a second transaction')
    const userId = `sub-rep-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    const first = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_A, 200, LOCKUP_A)
    const second = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_B, 250, LOCKUP_B)
    T.expect(first).to.equal(1)
    T.expect(second).to.equal(0)
    const row = await T.storage.paymentStorage.GetInvoiceSwap(saved.swap_operation_id, userId)
    T.expect(row?.tx_id).to.equal(TX_A)
    T.expect(row?.lockup_tx_hex).to.equal(LOCKUP_A)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('a second lockup cannot overwrite a persisted funding transaction')
}

const testFundingPersistIsIdempotentForSameTx = async (T: StorageTestBase) => {
    T.d('starting invoice swap funding persist is idempotent for the same tx')
    const userId = `sub-idemp-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    const first = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_A, 200, LOCKUP_A)
    const again = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_A, 200, LOCKUP_A)
    T.expect(first).to.equal(1)
    T.expect(again).to.equal(1)
    const row = await T.storage.paymentStorage.GetInvoiceSwap(saved.swap_operation_id, userId)
    T.expect(row?.tx_id).to.equal(TX_A)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('retrying persist of the same lockup is accepted')
}

const testConcurrentPayIsRejectedWhileInFlight = async (T: StorageTestBase) => {
    T.d('starting concurrent invoice swap pay is rejected while the first is in flight')
    const userId = `sub-conc-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    let releaseVerify!: () => void
    const holdVerify = new Promise<void>(resolve => { releaseVerify = resolve })
    let verifyStarted!: () => void
    const firstVerify = new Promise<void>(resolve => { verifyStarted = resolve })
    let verifyCalls = 0
    swapper.VerifySubmarineQuote = async () => {
        verifyCalls++
        if (verifyCalls === 1) {
            verifyStarted()
            await holdVerify
        }
        return { ok: true as const }
    }
    const pay = () => swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => ({ txId: TX_A }))
    const first = pay()
    await firstVerify
    let secondError = ''
    try {
        await pay()
    } catch (err: any) {
        secondError = err.message || String(err)
    }
    T.expect(secondError).to.equal('swap already in progress')
    releaseVerify()
    T.expect(await first).to.equal(TX_A)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('the in-memory guard is acquired before quote verification')
}

const testRetryAfterPersistErrorRepublishesStoredLockup = async (T: StorageTestBase) => {
    T.d('starting invoice swap pay retries the stored lockup after a publication error')
    const userId = `sub-retry-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    let payCalls = 0
    const payAddress = async () => {
        payCalls++
        const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_A, 200, LOCKUP_A)
        T.expect(persisted).to.equal(1)
        throw new Error('backup dest down')
    }
    let firstError = ''
    try {
        await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, payAddress)
    } catch (err: any) {
        firstError = err.message || String(err)
    }
    T.expect(firstError).to.equal('backup dest down')
    T.expect(payCalls).to.equal(1)
    T.expect(broadcasts).to.deep.equal([])

    const retried = await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
        payCalls++
        await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_B, 250, LOCKUP_B)
        return { txId: TX_B }
    })
    T.expect(retried).to.equal(TX_A)
    T.expect(payCalls).to.equal(1)
    T.expect(broadcasts).to.deep.equal([LOCKUP_A])
    const row = await T.storage.paymentStorage.GetInvoiceSwap(saved.swap_operation_id, userId)
    T.expect(row?.tx_id).to.equal(TX_A)
    T.expect(row?.lockup_tx_hex).to.equal(LOCKUP_A)
    T.expect(!!await T.storage.metricsStorage.GetRootOperation('chain_payment', TX_A)).to.equal(false)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('a later pay republished A and did not construct B')
}

const admissionVerify = () => async (params: {
    created: { timeoutBlockHeight: number }
    currentHeight: number
}) => {
    const timeout = checkSubmarineTimeout(params.created.timeoutBlockHeight, params.currentHeight)
    if (!timeout.ok) {
        return timeout
    }
    return { ok: true as const }
}

const testRetryAfterPersistDoesNotRequireNewFundingWindow = async (T: StorageTestBase) => {
    T.d('starting invoice swap pay retries a persisted lockup after the new-funding window elapses')
    const tipHeight = 920_000
    const userId = `sub-retry-win-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        timeout_block_height: tipHeight + MIN_SUBMARINE_TIMEOUT_BLOCKS,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    const tip = { height: tipHeight }
    const broadcastsFromRetry: string[] = []
    swaps.SetLnd({
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tip.height }),
        BroadcastTransaction: async (txHex: string) => {
            broadcastsFromRetry.push(txHex)
            broadcasts.push(txHex)
            return { txId: Transaction.fromHex(txHex).getId() }
        },
    } as any)
    let verifyCalls = 0
    const admit = admissionVerify()
    swapper.VerifySubmarineQuote = async (params) => {
        verifyCalls++
        return admit(params)
    }
    let payCalls = 0
    let firstError = ''
    try {
        await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
            payCalls++
            const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_A, 200, LOCKUP_A)
            T.expect(persisted).to.equal(1)
            throw new Error('backup dest down')
        })
    } catch (err: any) {
        firstError = err.message || String(err)
    }
    T.expect(firstError).to.equal('backup dest down')
    T.expect(payCalls).to.equal(1)
    T.expect(verifyCalls).to.equal(2)
    T.expect(broadcastsFromRetry).to.deep.equal([])

    tip.height = tipHeight + 1
    const stillAdmits = checkSubmarineTimeout(tipHeight + MIN_SUBMARINE_TIMEOUT_BLOCKS, tip.height)
    T.expect(stillAdmits.ok).to.equal(false)

    const retried = await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
        payCalls++
        await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_B, 250, LOCKUP_B)
        return { txId: TX_B }
    })
    T.expect(retried).to.equal(TX_A)
    T.expect(payCalls).to.equal(1)
    T.expect(verifyCalls).to.equal(2)
    T.expect(broadcastsFromRetry).to.deep.equal([LOCKUP_A])
    const row = await T.storage.paymentStorage.GetInvoiceSwap(saved.swap_operation_id, userId)
    T.expect(row?.tx_id).to.equal(TX_A)
    T.expect(row?.lockup_tx_hex).to.equal(LOCKUP_A)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('retry republished the persisted lockup after only 143 blocks remained')
}

const testNewFundingStillRequiresTimeoutWindow = async (T: StorageTestBase) => {
    T.d('starting a new invoice swap pay still requires the 144-block funding window')
    const tipHeight = 920_000
    const userId = `sub-admit-win-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        timeout_block_height: tipHeight + MIN_SUBMARINE_TIMEOUT_BLOCKS,
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    swaps.SetLnd({
        GetInfo: async () => ({ syncedToChain: true, blockHeight: tipHeight + 1 }),
        BroadcastTransaction: async (txHex: string) => ({ txId: Transaction.fromHex(txHex).getId() }),
    } as any)
    swapper.VerifySubmarineQuote = admissionVerify()
    let payCalls = 0
    let payError = ''
    try {
        await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
            payCalls++
            return { txId: TX_A }
        })
    } catch (err: any) {
        payError = err.message || String(err)
    }
    T.expect(payError).to.equal(
        `swap quote failed verification before pay: timeoutBlockHeight ${tipHeight + MIN_SUBMARINE_TIMEOUT_BLOCKS} is sooner than ${MIN_SUBMARINE_TIMEOUT_BLOCKS} blocks from tip ${tipHeight + 1}`,
    )
    T.expect(payCalls).to.equal(0)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('an unfunded quote still cannot pay inside the last 143 blocks')
}

const testDelayedSecondPayDoesNotReplaceStoredFunding = async (T: StorageTestBase) => {
    T.d('starting a delayed second invoice swap pay cannot replace persisted funding')
    const userId = `sub-delay-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    let releasePay!: (err?: Error) => void
    const holdPay = new Promise<void>((resolve, reject) => {
        releasePay = (err) => err ? reject(err) : resolve()
    })
    void holdPay.catch(() => { })
    let persisted!: () => void
    const firstPersist = new Promise<void>(resolve => { persisted = resolve })
    let payCalls = 0
    const first = swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
        payCalls++
        await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_A, 200, LOCKUP_A)
        persisted()
        await holdPay
        return { txId: TX_A }
    })
    await firstPersist
    let secondError = ''
    try {
        await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
            payCalls++
            await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_B, 250, LOCKUP_B)
            return { txId: TX_B }
        })
    } catch (err: any) {
        secondError = err.message || String(err)
    }
    T.expect(secondError).to.equal('swap already in progress')
    T.expect(payCalls).to.equal(1)
    releasePay(new Error('backup dest down'))
    let firstError = ''
    try {
        await first
    } catch (err: any) {
        firstError = err.message || String(err)
    }
    T.expect(firstError).to.equal('backup dest down')

    const retried = await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
        payCalls++
        await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, TX_B, 250, LOCKUP_B)
        return { txId: TX_B }
    })
    T.expect(retried).to.equal(TX_A)
    T.expect(payCalls).to.equal(1)
    T.expect(broadcasts).to.deep.equal([LOCKUP_A])
    const row = await T.storage.paymentStorage.GetInvoiceSwap(saved.swap_operation_id, userId)
    T.expect(row?.tx_id).to.equal(TX_A)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('the delayed request did not overwrite A; retry republished A')
}

const testVerifyFailureReleasesGuard = async (T: StorageTestBase) => {
    T.d('starting a quote verification failure releases the invoice swap guard')
    const userId = `sub-guard-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifySubmarineQuote = async () => ({ ok: false as const, error: 'bad quote' })
    let firstError = ''
    try {
        await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => ({ txId: TX_A }))
    } catch (err: any) {
        firstError = err.message || String(err)
    }
    T.expect(firstError).to.equal('swap quote failed verification before pay: bad quote')
    swapper.VerifySubmarineQuote = async () => ({ ok: true as const })
    const paid = await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => ({ txId: TX_A }))
    T.expect(paid).to.equal(TX_A)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('a later pay can proceed after a failed verification')
}

const siblingPair = async (T: StorageTestBase, userId: string) => {
    const paymentHash = randomBytes(32).toString('hex')
    const primary = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        payment_hash: paymentHash,
        address: 'bcrt1qprimary',
    }))
    const alternate = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        payment_hash: paymentHash,
        address: 'bcrt1qalternate',
    }))
    return { paymentHash, primary, alternate }
}

const clearPayGuards = (swaps: Swaps) => {
    for (const key of Object.keys(swaps.waitingSwaps)) {
        delete swaps.waitingSwaps[key]
    }
}

const testSiblingPersistIsRejectedAfterFirstFunding = async (T: StorageTestBase) => {
    T.d('starting sibling invoice swap persist is rejected after the first funding')
    const userId = `sub-sib-persist-${randomBytes(8).toString('hex')}`
    const { primary, alternate } = await siblingPair(T, userId)
    const first = await T.storage.paymentStorage.SetInvoiceSwapTxId(primary.swap_operation_id, TX_A, 200, LOCKUP_A)
    const second = await T.storage.paymentStorage.SetInvoiceSwapTxId(alternate.swap_operation_id, TX_B, 250, LOCKUP_B)
    T.expect(first).to.equal(1)
    T.expect(second).to.equal(0)
    const funded = await T.storage.paymentStorage.GetInvoiceSwap(primary.swap_operation_id, userId)
    const sibling = await T.storage.paymentStorage.GetInvoiceSwap(alternate.swap_operation_id, userId)
    T.expect(funded?.tx_id).to.equal(TX_A)
    T.expect(sibling?.tx_id).to.equal("")
    await T.storage.paymentStorage.DeleteInvoiceSwap(primary.swap_operation_id)
    await T.storage.paymentStorage.DeleteInvoiceSwap(alternate.swap_operation_id)
    T.d('funding one quote durably blocks persist of its sibling')
}

const testSiblingPayIsRejectedAfterFirstFunding = async (T: StorageTestBase) => {
    T.d('starting sibling invoice swap pay is rejected after the first funding')
    const userId = `sub-sib-pay-${randomBytes(8).toString('hex')}`
    const { primary, alternate } = await siblingPair(T, userId)
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== primary.swap_operation_id && swap.swap_operation_id !== alternate.swap_operation_id) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
    const { swaps } = makeSwaps(T)
    const paid = await swaps.PayInvoiceSwap(userId, primary.swap_operation_id, undefined, async () => {
        const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(primary.swap_operation_id, TX_A, 200, LOCKUP_A)
        T.expect(persisted).to.equal(1)
        return { txId: TX_A }
    })
    T.expect(paid).to.equal(TX_A)
    clearPayGuards(swaps)
    let siblingError = ''
    try {
        await swaps.PayInvoiceSwap(userId, alternate.swap_operation_id, undefined, async () => {
            await T.storage.paymentStorage.SetInvoiceSwapTxId(alternate.swap_operation_id, TX_B, 250, LOCKUP_B)
            return { txId: TX_B }
        })
    } catch (err: any) {
        siblingError = err.message || String(err)
    }
    T.expect(siblingError).to.equal('invoice already reserved by a sibling quote')
    const sibling = await T.storage.paymentStorage.GetInvoiceSwap(alternate.swap_operation_id, userId)
    T.expect(sibling?.tx_id).to.equal("")
    await T.storage.paymentStorage.DeleteInvoiceSwap(primary.swap_operation_id)
    await T.storage.paymentStorage.DeleteInvoiceSwap(alternate.swap_operation_id)
    T.d('a later pay of the sibling is rejected even after in-memory guards are cleared')
}

const testConcurrentSiblingPayIsRejectedWhileFirstInFlight = async (T: StorageTestBase) => {
    T.d('starting concurrent sibling invoice swap pay is rejected while the first is in flight')
    const userId = `sub-sib-conc-${randomBytes(8).toString('hex')}`
    const { primary, alternate } = await siblingPair(T, userId)
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== primary.swap_operation_id && swap.swap_operation_id !== alternate.swap_operation_id) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
    const { swaps, swapper } = makeSwaps(T)
    let releaseVerify!: () => void
    const holdVerify = new Promise<void>(resolve => { releaseVerify = resolve })
    let verifyStarted!: () => void
    const firstVerify = new Promise<void>(resolve => { verifyStarted = resolve })
    let verifyCalls = 0
    swapper.VerifySubmarineQuote = async () => {
        verifyCalls++
        if (verifyCalls === 1) {
            verifyStarted()
            await holdVerify
        }
        return { ok: true as const }
    }
    const first = swaps.PayInvoiceSwap(userId, primary.swap_operation_id, undefined, async () => {
        await T.storage.paymentStorage.SetInvoiceSwapTxId(primary.swap_operation_id, TX_A, 200, LOCKUP_A)
        return { txId: TX_A }
    })
    await firstVerify
    let secondError = ''
    try {
        await swaps.PayInvoiceSwap(userId, alternate.swap_operation_id, undefined, async () => {
            await T.storage.paymentStorage.SetInvoiceSwapTxId(alternate.swap_operation_id, TX_B, 250, LOCKUP_B)
            return { txId: TX_B }
        })
    } catch (err: any) {
        secondError = err.message || String(err)
    }
    T.expect(secondError).to.equal('swap already in progress')
    releaseVerify()
    T.expect(await first).to.equal(TX_A)
    const sibling = await T.storage.paymentStorage.GetInvoiceSwap(alternate.swap_operation_id, userId)
    T.expect(sibling?.tx_id).to.equal("")
    await T.storage.paymentStorage.DeleteInvoiceSwap(primary.swap_operation_id)
    await T.storage.paymentStorage.DeleteInvoiceSwap(alternate.swap_operation_id)
    T.d('the payment-hash guard is acquired before quote verification')
}

const testSiblingPayAllowedAfterVerifyFailureReleasesReservation = async (T: StorageTestBase) => {
    T.d('starting sibling invoice swap pay is allowed after a verify failure releases the reservation')
    const userId = `sub-sib-rel-${randomBytes(8).toString('hex')}`
    const { primary, alternate } = await siblingPair(T, userId)
    const leftover = await T.storage.paymentStorage.ListUnfinishedInvoiceSwaps()
    for (const swap of leftover) {
        if (swap.swap_operation_id !== primary.swap_operation_id && swap.swap_operation_id !== alternate.swap_operation_id) {
            await T.storage.paymentStorage.DeleteInvoiceSwap(swap.swap_operation_id)
        }
    }
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifySubmarineQuote = async () => ({ ok: false as const, error: 'bad quote' })
    let firstError = ''
    try {
        await swaps.PayInvoiceSwap(userId, primary.swap_operation_id, undefined, async () => ({ txId: TX_A }))
    } catch (err: any) {
        firstError = err.message || String(err)
    }
    T.expect(firstError).to.equal('swap quote failed verification before pay: bad quote')
    swapper.VerifySubmarineQuote = async () => ({ ok: true as const })
    const paid = await swaps.PayInvoiceSwap(userId, alternate.swap_operation_id, undefined, async () => {
        const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(alternate.swap_operation_id, TX_B, 250, LOCKUP_B)
        T.expect(persisted).to.equal(1)
        return { txId: TX_B }
    })
    T.expect(paid).to.equal(TX_B)
    const primaryRow = await T.storage.paymentStorage.GetInvoiceSwap(primary.swap_operation_id, userId)
    T.expect(primaryRow?.tx_id).to.equal("")
    await T.storage.paymentStorage.DeleteInvoiceSwap(primary.swap_operation_id)
    await T.storage.paymentStorage.DeleteInvoiceSwap(alternate.swap_operation_id)
    T.d('a sibling can be funded after the first quote fails verification')
}

const testPendingListHidesUnfundedSibling = async (T: StorageTestBase) => {
    T.d('starting pending invoice swaps hide an unfunded sibling after one quote is funded')
    const userId = `sub-sib-list-${randomBytes(8).toString('hex')}`
    const { primary, alternate } = await siblingPair(T, userId)
    const before = await T.storage.paymentStorage.ListPendingInvoiceSwaps(userId)
    T.expect(before.map(s => s.swap_operation_id).sort()).to.deep.equal(
        [primary.swap_operation_id, alternate.swap_operation_id].sort()
    )
    const first = await T.storage.paymentStorage.SetInvoiceSwapTxId(primary.swap_operation_id, TX_A, 200, LOCKUP_A)
    T.expect(first).to.equal(1)
    const after = await T.storage.paymentStorage.ListPendingInvoiceSwaps(userId)
    T.expect(after.map(s => s.swap_operation_id)).to.deep.equal([primary.swap_operation_id])
    await T.storage.paymentStorage.DeleteInvoiceSwap(primary.swap_operation_id)
    await T.storage.paymentStorage.DeleteInvoiceSwap(alternate.swap_operation_id)
    T.d('the unfunded sibling is not listed as a payable quote')
}

const expectOnePendingChainPayment = async (T: StorageTestBase, txId: string, amount: number) => {
    const ops = await T.storage.metricsStorage.GetRootOperationsByIdentifiers('chain_payment', [txId])
    T.expect(ops.length).to.equal(1)
    T.expect(ops[0].operation_amount).to.equal(amount)
    T.expect(ops[0].pending).to.equal(true)
}

const testEnsureRootOperationIsIdempotent = async (T: StorageTestBase) => {
    T.d('starting EnsureRootOperation does not duplicate a chain payment')
    const txId = randomBytes(32).toString('hex')
    const first = await T.storage.metricsStorage.EnsureRootOperation('chain_payment', txId, 12_345, true)
    const again = await T.storage.metricsStorage.EnsureRootOperation('chain_payment', txId, 99_999, true)
    T.expect(again.serial_id).to.equal(first.serial_id)
    T.expect(again.operation_amount).to.equal(12_345)
    await expectOnePendingChainPayment(T, txId, 12_345)
    T.d('a second ensure kept the original pending chain payment')
}

const testUserPayDoesNotRecordRootOp = async (T: StorageTestBase) => {
    T.d('starting a user invoice swap pay does not record a chain_payment root op')
    const userId = `sub-user-root-${randomBytes(8).toString('hex')}`
    const lockup = dummyTxHex('11')
    const txId = Transaction.fromHex(lockup).getId()
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(userId, {
        payment_hash: randomBytes(32).toString('hex'),
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps } = makeSwaps(T)
    const paid = await swaps.PayInvoiceSwap(userId, saved.swap_operation_id, undefined, async () => {
        const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, txId, 200, lockup)
        T.expect(persisted).to.equal(1)
        return { txId }
    })
    T.expect(paid).to.equal(txId)
    T.expect(!!await T.storage.metricsStorage.GetRootOperation('chain_payment', txId)).to.equal(false)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('user lockup publication left watchdog root ops untouched')
}

const testAdminFreshPayRecordsRootOp = async (T: StorageTestBase) => {
    T.d('starting an admin invoice swap pay records a pending chain_payment root op')
    const lockup = dummyTxHex('22')
    const txId = Transaction.fromHex(lockup).getId()
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(ADMIN_SWAP_OWNER_ID, {
        payment_hash: randomBytes(32).toString('hex'),
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps } = makeSwaps(T)
    const paid = await swaps.PayInvoiceSwap(ADMIN_SWAP_OWNER_ID, saved.swap_operation_id, undefined, async () => {
        const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, txId, 250, lockup)
        T.expect(persisted).to.equal(1)
        return { txId }
    }, ADMIN_SWAP_ACTOR)
    T.expect(paid).to.equal(txId)
    await expectOnePendingChainPayment(T, txId, saved.transaction_amount + 250)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('fresh admin publication wrote one pending chain_payment')
}

const testAdminRetryAfterPersistRecordsRootOpOnce = async (T: StorageTestBase) => {
    T.d('starting an admin invoice swap retry records the root op after republish')
    const lockupA = dummyTxHex('33')
    const lockupB = dummyTxHex('44')
    const txA = Transaction.fromHex(lockupA).getId()
    const txB = Transaction.fromHex(lockupB).getId()
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(ADMIN_SWAP_OWNER_ID, {
        payment_hash: randomBytes(32).toString('hex'),
    }))
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, broadcasts } = makeSwaps(T)
    let payCalls = 0
    let firstError = ''
    try {
        await swaps.PayInvoiceSwap(ADMIN_SWAP_OWNER_ID, saved.swap_operation_id, undefined, async () => {
            payCalls++
            const persisted = await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, txA, 200, lockupA)
            T.expect(persisted).to.equal(1)
            throw new Error('backup dest down')
        }, ADMIN_SWAP_ACTOR)
    } catch (err: any) {
        firstError = err.message || String(err)
    }
    T.expect(firstError).to.equal('backup dest down')
    T.expect(payCalls).to.equal(1)
    T.expect(!!await T.storage.metricsStorage.GetRootOperation('chain_payment', txA)).to.equal(false)

    const retried = await swaps.PayInvoiceSwap(ADMIN_SWAP_OWNER_ID, saved.swap_operation_id, undefined, async () => {
        payCalls++
        await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, txB, 250, lockupB)
        return { txId: txB }
    }, ADMIN_SWAP_ACTOR)
    T.expect(retried).to.equal(txA)
    T.expect(payCalls).to.equal(1)
    T.expect(broadcasts).to.deep.equal([lockupA])
    await expectOnePendingChainPayment(T, txA, saved.transaction_amount + 200)
    T.expect(!!await T.storage.metricsStorage.GetRootOperation('chain_payment', txB)).to.equal(false)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('retry republished the persisted lockup and wrote one chain_payment')
}

const testAdminResumeRecordsRootOpOnce = async (T: StorageTestBase) => {
    T.d('starting resume of an admin invoice swap records the lockup root op once')
    const lockup = dummyTxHex('55')
    const txId = Transaction.fromHex(lockup).getId()
    const saved = await T.storage.paymentStorage.AddInvoiceSwap(invoiceSwap(ADMIN_SWAP_OWNER_ID, {
        payment_hash: randomBytes(32).toString('hex'),
    }))
    T.expect(await T.storage.paymentStorage.SetInvoiceSwapTxId(saved.swap_operation_id, txId, 200, lockup)).to.equal(1)
    await deleteOtherUnfinished(T, saved.swap_operation_id)
    const { swaps, swapper, broadcasts } = makeSwaps(T)
    let waitingTxDone: Promise<void> = Promise.resolve()
    swapper.SubscribeToInvoiceSwap = (_data, _done, waitingTx) => {
        waitingTxDone = Promise.resolve().then(() => waitingTx())
        return () => { }
    }
    await swaps.ResumeInvoiceSwaps()
    await waitingTxDone
    T.expect(broadcasts).to.deep.equal([lockup])
    await expectOnePendingChainPayment(T, txId, saved.transaction_amount + 200)

    await swaps.ResumeInvoiceSwaps()
    await waitingTxDone
    T.expect(broadcasts).to.deep.equal([lockup, lockup])
    await expectOnePendingChainPayment(T, txId, saved.transaction_amount + 200)
    await T.storage.paymentStorage.DeleteInvoiceSwap(saved.swap_operation_id)
    T.d('resume republished the admin lockup and did not duplicate the root op')
}
