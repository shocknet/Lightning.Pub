import secp256k1ZkpModule from '@vulpemventures/secp256k1-zkp'
const zkpInit = (secp256k1ZkpModule as any).default || secp256k1ZkpModule
import { initEccLib, address } from 'bitcoinjs-lib'
import {
    Musig, SwapTreeSerializer, TaprootUtils, reverseSwapTree, swapTree, Scripts,
} from 'boltz-core'
import { createHash, randomBytes } from 'crypto'
import { ECPairFactory } from 'ecpair'
import * as ecc from 'tiny-secp256k1'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import {
    MAX_REVERSE_TIMEOUT_BLOCKS,
    MIN_CLAIM_SAT_PER_VBYTE,
    MIN_REVERSE_TIMEOUT_BLOCKS,
    REVERSE_CLAIM_MIN_REMAINING_BLOCKS,
    REVERSE_CLAIM_VBYTE_BUDGET,
    REVERSE_LOCKTIME_THRESHOLD,
    ReverseSwaps,
    calculateReverseQuoteAmounts,
    checkReverseClaimBudget,
    checkReverseClaimWindow,
    checkReverseTimeout,
    isReverseClaimExposed,
    resolveClaimFeeRate,
} from '../services/lnd/swaps/reverseSwaps.js'
import { getNetwork } from '../services/lnd/swaps/swapHelpers.js'
import { StorageTestBase, expectThrowsAsync } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const TIP = 920_000
const MOCK_URL = 'http://mock-boltz'
const FEES = { percentage: 0.5, minerFees: { claim: 150, lockup: 200 } }
const RECEIVE_SATS = 100_000
const AMOUNTS = calculateReverseQuoteAmounts(RECEIVE_SATS, FEES)

initEccLib(ecc)

export default async (T: StorageTestBase) => {
    await testTimeoutWindow(T)
    await testClaimWindow(T)
    await testClaimExposureMarker(T)
    await testClaimBudget(T)
    await testVerifyRejectsMismatchedHashAndUnverifiedTree(T)
    await testQuoteMethodRejectsAndDoesNotPersist(T)
    await testQuoteMethodPersistsVerifiedQuote(T)
    await testQuoteRejectsInsufficientMinerBudget(T)
    await testQuoteAcceptsBudgetBelowOneBlockRate(T)
    await testPayRejectsMismatchedHashBeforePaying(T)
    await testPayRejectsIfMinRelayExceedsBudget(T)
}

const BOLTZ_REVERSE_TIMEOUT_BLOCKS = 144

const testTimeoutWindow = async (T: StorageTestBase) => {
    T.d('starting reverse timeout window checks')

    const accept = (timeout: number, tip = TIP) => {
        const result = checkReverseTimeout(timeout, tip)
        T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    }
    const reject = (timeout: number, tip: number, error: string) => {
        const result = checkReverseTimeout(timeout, tip)
        T.expect(result.ok).to.equal(false)
        if (!result.ok) {
            T.expect(result.error).to.equal(error)
        }
    }

    accept(TIP + MIN_REVERSE_TIMEOUT_BLOCKS)
    accept(TIP + BOLTZ_REVERSE_TIMEOUT_BLOCKS)
    accept(TIP + BOLTZ_REVERSE_TIMEOUT_BLOCKS, TIP + 1)
    accept(TIP + 1_008)
    accept(TIP + MAX_REVERSE_TIMEOUT_BLOCKS)

    const localInvoice = AMOUNTS.invoiceAmount
    const boltzInvoice = Math.ceil((AMOUNTS.onchainAmount + FEES.minerFees.lockup) / (1 - FEES.percentage / 100))
    T.expect(localInvoice).to.equal(boltzInvoice)

    reject(0.5, TIP, 'invalid timeoutBlockHeight from swap service')
    reject(Number.NaN, TIP, 'invalid timeoutBlockHeight from swap service')
    reject(0, TIP, 'invalid timeoutBlockHeight from swap service')
    reject(REVERSE_LOCKTIME_THRESHOLD, TIP, 'invalid timeoutBlockHeight from swap service')
    reject(TIP, TIP, `swap quote expired at block ${TIP} (tip ${TIP})`)
    reject(TIP + MIN_REVERSE_TIMEOUT_BLOCKS - 1, TIP, `timeoutBlockHeight ${TIP + MIN_REVERSE_TIMEOUT_BLOCKS - 1} is sooner than ${MIN_REVERSE_TIMEOUT_BLOCKS} blocks from tip ${TIP}`)
    reject(TIP + BOLTZ_REVERSE_TIMEOUT_BLOCKS, TIP + 73, `timeoutBlockHeight ${TIP + BOLTZ_REVERSE_TIMEOUT_BLOCKS} is sooner than ${MIN_REVERSE_TIMEOUT_BLOCKS} blocks from tip ${TIP + 73}`)
    reject(TIP + MAX_REVERSE_TIMEOUT_BLOCKS + 1, TIP, `timeoutBlockHeight ${TIP + MAX_REVERSE_TIMEOUT_BLOCKS + 1} is later than ${MAX_REVERSE_TIMEOUT_BLOCKS} blocks from tip ${TIP}`)
    reject(TIP + 1_008, 0, 'untrusted chain tip')

    T.d('reverse timeout window rejects fractions, expired quotes, and far-future heights')
}

const testClaimWindow = async (T: StorageTestBase) => {
    T.d('starting reverse claim-time remaining window checks')

    const accept = (timeout: number, tip = TIP) => {
        const result = checkReverseClaimWindow(timeout, tip)
        T.expect(result.ok, !result.ok ? result.error : '').to.equal(true)
    }
    const reject = (timeout: number, tip: number, error: string) => {
        const result = checkReverseClaimWindow(timeout, tip)
        T.expect(result.ok).to.equal(false)
        if (!result.ok) {
            T.expect(result.error).to.equal(error)
        }
    }

    accept(TIP + REVERSE_CLAIM_MIN_REMAINING_BLOCKS)
    accept(TIP + MIN_REVERSE_TIMEOUT_BLOCKS)
    accept(TIP + 1_008)
    reject(TIP, TIP, `refund already valid at block ${TIP} (tip ${TIP})`)
    reject(TIP - 1, TIP, `refund already valid at block ${TIP - 1} (tip ${TIP})`)
    reject(TIP + REVERSE_CLAIM_MIN_REMAINING_BLOCKS - 1, TIP, `only ${REVERSE_CLAIM_MIN_REMAINING_BLOCKS - 1} blocks left to claim before refund at ${TIP + REVERSE_CLAIM_MIN_REMAINING_BLOCKS - 1} (tip ${TIP}, need ${REVERSE_CLAIM_MIN_REMAINING_BLOCKS})`)
    reject(TIP + 1_008, 0, 'untrusted chain tip')

    T.d('claim window allows a shorter remaining runway than quote-time and refuses refund-eligible tips')
}

const testClaimExposureMarker = async (T: StorageTestBase) => {
    T.d('starting reverse claim exposure is publication, not a stored signature')
    T.expect(isReverseClaimExposed({})).to.equal(false)
    T.expect(isReverseClaimExposed({ claim_tx_hex: '0200' })).to.equal(false)
    T.expect(isReverseClaimExposed({ claim_published: true })).to.equal(false)
    T.expect(isReverseClaimExposed({ claim_tx_hex: '', claim_published: true })).to.equal(false)
    T.expect(isReverseClaimExposed({ claim_tx_hex: '0200', claim_published: false })).to.equal(false)
    T.expect(isReverseClaimExposed({ claim_tx_hex: '0200', claim_published: true })).to.equal(true)
    T.d('only a successful publish marks a reverse-swap claim as already exposed')
}

const testClaimBudget = async (T: StorageTestBase) => {
    T.d('starting reverse claim fee budget checks')
    const floor = MIN_CLAIM_SAT_PER_VBYTE * REVERSE_CLAIM_VBYTE_BUDGET
    T.expect(checkReverseClaimBudget(floor, 1).ok).to.equal(true)
    T.expect(checkReverseClaimBudget(AMOUNTS.minerFee, 1).ok).to.equal(true)
    const zero = checkReverseClaimBudget(0, 1)
    T.expect(zero.ok).to.equal(false)
    if (!zero.ok) {
        T.expect(zero.error).to.equal(`swap miner fee budget 0 is below local claim floor ${floor}`)
    }
    const low = checkReverseClaimBudget(floor - 1, 1)
    T.expect(low.ok).to.equal(false)
    const invalidRate = checkReverseClaimBudget(AMOUNTS.minerFee, 0)
    T.expect(invalidRate.ok).to.equal(false)
    if (!invalidRate.ok) {
        T.expect(invalidRate.error).to.equal('invalid local claim fee rate 0')
    }

    const capped = resolveClaimFeeRate(50, 1, AMOUNTS.minerFee, REVERSE_CLAIM_VBYTE_BUDGET)
    T.expect(capped.ok, !capped.ok ? capped.error : '').to.equal(true)
    if (capped.ok) {
        T.expect(capped.satPerVbyte).to.equal(Math.floor(AMOUNTS.minerFee / REVERSE_CLAIM_VBYTE_BUDGET))
        T.expect(capped.satPerVbyte).to.equal(1)
    }
    const liveFits = resolveClaimFeeRate(1, 1, AMOUNTS.minerFee, REVERSE_CLAIM_VBYTE_BUDGET)
    T.expect(liveFits.ok, !liveFits.ok ? liveFits.error : '').to.equal(true)
    if (liveFits.ok) {
        T.expect(liveFits.satPerVbyte).to.equal(1)
    }
    const highRelay = resolveClaimFeeRate(50, 3, AMOUNTS.minerFee, REVERSE_CLAIM_VBYTE_BUDGET)
    T.expect(highRelay.ok).to.equal(false)
    T.d('quote-time miner fee budget is checked against min relay; live feerate is capped to that budget')
}

const testVerifyRejectsMismatchedHashAndUnverifiedTree = async (T: StorageTestBase) => {
    T.d('starting VerifyReverseQuote field checks')
    const swapper = new ReverseSwaps({ httpUrl: MOCK_URL, wsUrl: 'ws://mock', network: 'regtest' })
    const valid = await buildValidReverseQuote()

    const ok = await swapper.VerifyReverseQuote(verifyParams(valid))
    T.expect(ok.ok, !ok.ok ? ok.error : '').to.equal(true)

    const boltzTimeout = await buildValidReverseQuote(TIP + BOLTZ_REVERSE_TIMEOUT_BLOCKS)
    const afterTipMove = await swapper.VerifyReverseQuote(verifyParams(boltzTimeout, {
        currentHeight: TIP + 10,
    }))
    T.expect(afterTipMove.ok, !afterTipMove.ok ? afterTipMove.error : '').to.equal(true)

    const badHash = await swapper.VerifyReverseQuote(verifyParams(valid, {
        invoicePaymentHashHex: randomBytes(32).toString('hex'),
    }))
    T.expect(badHash.ok).to.equal(false)
    if (!badHash.ok) {
        T.expect(badHash.error).to.equal('invoice payment hash does not match preimage hash')
    }

    const submarineTree = swapTree(
        false,
        Buffer.from(valid.preimageHash, 'hex'),
        Buffer.from(valid.pubkey, 'hex'),
        Buffer.from(valid.created.refundPublicKey, 'hex'),
        valid.created.timeoutBlockHeight,
    )
    const badTree = await swapper.VerifyReverseQuote(verifyParams(valid, {
        created: { ...valid.created, swapTree: SwapTreeSerializer.serializeSwapTree(submarineTree) },
    }))
    T.expect(badTree.ok).to.equal(false)
    if (!badTree.ok) {
        T.expect(badTree.error).to.equal('swapTree does not match locally derived tree')
    }

    const badAddr = await swapper.VerifyReverseQuote(verifyParams(valid, {
        created: { ...valid.created, lockupAddress: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080' },
    }))
    T.expect(badAddr.ok).to.equal(false)
    if (!badAddr.ok) {
        T.expect(badAddr.error).to.match(/^address mismatch:/)
    }

    const badAmt = await swapper.VerifyReverseQuote(verifyParams(valid, {
        invoiceAmountSats: AMOUNTS.invoiceAmount + 1,
    }))
    T.expect(badAmt.ok).to.equal(false)
    if (!badAmt.ok) {
        T.expect(badAmt.error).to.equal(`invoice amount mismatch: got ${AMOUNTS.invoiceAmount + 1}, want ${AMOUNTS.invoiceAmount}`)
    }

    T.d('VerifyReverseQuote rejects mismatched hash, submarine tree, address, and amount')
}

const testQuoteMethodRejectsAndDoesNotPersist = async (T: StorageTestBase) => {
    T.d('starting GetTxSwapQuotes rejection / no-persist checks')
    const userId = `rev-swap-reject-${randomBytes(8).toString('hex')}`
    const valid = await buildValidReverseQuote()

    const mismatchedHash = await makeHarness(T, valid, {
        paymentHash: randomBytes(32).toString('hex'),
        numSatoshis: AMOUNTS.invoiceAmount,
    })
    await expectThrowsAsync(
        mismatchedHash.GetTxSwapQuotes(userId, RECEIVE_SATS, () => 0),
        'invoice payment hash does not match preimage hash',
    )

    const submarineTree = swapTree(
        false,
        Buffer.from(valid.preimageHash, 'hex'),
        Buffer.from(valid.pubkey, 'hex'),
        Buffer.from(valid.created.refundPublicKey, 'hex'),
        valid.created.timeoutBlockHeight,
    )
    const unverifiedTree = await makeHarness(T, {
        ...valid,
        created: { ...valid.created, swapTree: SwapTreeSerializer.serializeSwapTree(submarineTree) },
    })
    await expectThrowsAsync(
        unverifiedTree.GetTxSwapQuotes(userId, RECEIVE_SATS, () => 0),
        'swapTree does not match locally derived tree',
    )

    const unverifiedAddr = await makeHarness(T, {
        ...valid,
        created: { ...valid.created, lockupAddress: 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080' },
    })
    await expectThrowsAsync(unverifiedAddr.GetTxSwapQuotes(userId, RECEIVE_SATS, () => 0))
    const pending = await T.storage.paymentStorage.ListPendingTransactionSwaps(userId)
    T.expect(pending.length).to.equal(0)
    T.d('GetTxSwapQuotes rejected mismatched hash and unverified tree/address without persisting')
}

const testQuoteMethodPersistsVerifiedQuote = async (T: StorageTestBase) => {
    T.d('starting GetTxSwapQuotes persist of verified quote')
    const userId = `rev-swap-ok-${randomBytes(8).toString('hex')}`
    const valid = await buildValidReverseQuote()
    const swaps = await makeHarness(T, valid)
    const quotes = await swaps.GetTxSwapQuotes(userId, RECEIVE_SATS, () => 0)
    T.expect(quotes.length).to.equal(1)
    T.expect(quotes[0].invoice_amount_sats).to.equal(AMOUNTS.invoiceAmount)
    T.expect(quotes[0].swap_fee_sats).to.equal(AMOUNTS.swapFee)
    const pending = await T.storage.paymentStorage.ListPendingTransactionSwaps(userId)
    T.expect(pending.length).to.equal(1)
    T.expect(pending[0].preimage).to.equal(valid.preimage)
    T.expect(pending[0].lockup_address).to.equal(valid.created.lockupAddress)
    T.expect(pending[0].invoice_amount).to.equal(AMOUNTS.invoiceAmount)
    T.d('GetTxSwapQuotes persisted a fully verified reverse quote')
}

const testQuoteRejectsInsufficientMinerBudget = async (T: StorageTestBase) => {
    T.d('starting GetTxSwapQuotes rejection of a zero provider miner-fee budget')
    const userId = `rev-swap-fee-${randomBytes(8).toString('hex')}`
    const valid = await buildValidReverseQuote()
    const swaps = await makeHarness(T, valid)
    const swapper = swaps.revSwappers[MOCK_URL]
    let created = false
    swapper.GetFees = async () => ({ ok: true, fees: { percentage: 0.5, minerFees: { claim: 0, lockup: 0 } } })
    swapper.SwapTransaction = async () => {
        created = true
        return { ok: false as const, error: 'should not create a reverse swap' }
    }
    await expectThrowsAsync(
        swaps.GetTxSwapQuotes(userId, RECEIVE_SATS, () => 0),
        `swap miner fee budget 0 is below local claim floor ${MIN_CLAIM_SAT_PER_VBYTE * REVERSE_CLAIM_VBYTE_BUDGET}`,
    )
    T.expect(created).to.equal(false)
    const pending = await T.storage.paymentStorage.ListPendingTransactionSwaps(userId)
    T.expect(pending.length).to.equal(0)
    T.d('a zero-fee provider quote was rejected before creating or persisting a swap')
}

const testQuoteAcceptsBudgetBelowOneBlockRate = async (T: StorageTestBase) => {
    T.d('starting GetTxSwapQuotes acceptance when next-block is above the miner budget')
    const userId = `rev-swap-relay-${randomBytes(8).toString('hex')}`
    const valid = await buildValidReverseQuote()
    const swaps = await makeHarness(T, valid, { satPerVbyte: 50, minRelaySatPerVbyte: 1 })
    const quotes = await swaps.GetTxSwapQuotes(userId, RECEIVE_SATS, () => 0)
    T.expect(quotes.length).to.equal(1)
    T.expect(quotes[0].chain_fee_sats).to.equal(AMOUNTS.minerFee)
    const pending = await T.storage.paymentStorage.ListPendingTransactionSwaps(userId)
    T.expect(pending.length).to.equal(1)
    T.d('a high next-block estimate did not reject a quote that still covers min relay')
}

const testPayRejectsMismatchedHashBeforePaying = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap hash re-check')
    const userId = `rev-swap-pay-${randomBytes(8).toString('hex')}`
    const valid = await buildValidReverseQuote()
    const saved = await T.storage.paymentStorage.AddTransactionSwap({
        app_user_id: userId,
        swap_quote_id: valid.created.id,
        swap_tree: JSON.stringify(valid.created.swapTree),
        lockup_address: valid.created.lockupAddress,
        refund_public_key: valid.created.refundPublicKey,
        timeout_block_height: valid.created.timeoutBlockHeight,
        invoice: valid.created.invoice,
        invoice_amount: AMOUNTS.invoiceAmount,
        transaction_amount: AMOUNTS.onchainAmount,
        swap_fee_sats: AMOUNTS.swapFee,
        chain_fee_sats: AMOUNTS.minerFee,
        preimage: valid.preimage,
        ephemeral_private_key: valid.privKey,
        ephemeral_public_key: valid.pubkey,
        service_url: MOCK_URL,
    })
    const swaps = await makeHarness(T, valid, { paymentHash: randomBytes(32).toString('hex'), numSatoshis: AMOUNTS.invoiceAmount })
    let paid = false
    await expectThrowsAsync(
        swaps.PayAddrWithSwap(userId, saved.swap_operation_id, 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080', async () => {
            paid = true
        }),
        'swap quote failed verification before pay: invoice payment hash does not match preimage hash',
    )
    T.expect(paid).to.equal(false)
    T.d('PayAddrWithSwap refused a mismatched invoice hash before paying')
}

const testPayRejectsIfMinRelayExceedsBudget = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rejection when min relay no longer fits the quoted miner budget')
    const userId = `rev-swap-pay-relay-${randomBytes(8).toString('hex')}`
    const valid = await buildValidReverseQuote()
    const saved = await T.storage.paymentStorage.AddTransactionSwap({
        app_user_id: userId,
        swap_quote_id: valid.created.id,
        swap_tree: JSON.stringify(valid.created.swapTree),
        lockup_address: valid.created.lockupAddress,
        refund_public_key: valid.created.refundPublicKey,
        timeout_block_height: valid.created.timeoutBlockHeight,
        invoice: valid.created.invoice,
        invoice_amount: AMOUNTS.invoiceAmount,
        transaction_amount: AMOUNTS.onchainAmount,
        swap_fee_sats: AMOUNTS.swapFee,
        chain_fee_sats: AMOUNTS.minerFee,
        preimage: valid.preimage,
        ephemeral_private_key: valid.privKey,
        ephemeral_public_key: valid.pubkey,
        service_url: MOCK_URL,
    })
    const swaps = await makeHarness(T, valid, { satPerVbyte: 2, minRelaySatPerVbyte: 2 })
    let paid = false
    await expectThrowsAsync(
        swaps.PayAddrWithSwap(userId, saved.swap_operation_id, 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080', async () => {
            paid = true
        }),
        `swap miner fee budget ${AMOUNTS.minerFee} is below local claim floor ${2 * REVERSE_CLAIM_VBYTE_BUDGET}`,
    )
    T.expect(paid).to.equal(false)
    T.d('PayAddrWithSwap refused to pay when min relay outgrew the quoted miner budget')
}

type QuoteFixture = Awaited<ReturnType<typeof buildValidReverseQuote>>

const verifyParams = (valid: QuoteFixture, overrides: Record<string, unknown> = {}) => ({
    preimageHex: valid.preimage,
    claimPrivateKeyHex: valid.privKey,
    invoicePaymentHashHex: valid.preimageHash,
    invoiceAmountSats: AMOUNTS.invoiceAmount,
    expectedInvoiceAmountSats: AMOUNTS.invoiceAmount,
    expectedOnchainAmountSats: AMOUNTS.onchainAmount,
    currentHeight: TIP,
    created: valid.created,
    ...overrides,
})

const buildValidReverseQuote = async (timeout = TIP + 1_008) => {
    const preimage = randomBytes(32)
    const preimageHash = createHash('sha256').update(preimage).digest()
    const claimKeys = ECPairFactory(ecc).makeRandom()
    const refundKeys = ECPairFactory(ecc).makeRandom()
    if (!claimKeys.privateKey) {
        throw new Error('failed to generate claim key')
    }
    const tree = reverseSwapTree(
        false,
        preimageHash,
        Buffer.from(claimKeys.publicKey),
        Buffer.from(refundKeys.publicKey),
        timeout,
    )
    const musig = new Musig(await zkpInit(), claimKeys, randomBytes(32), [
        Buffer.from(refundKeys.publicKey),
        Buffer.from(claimKeys.publicKey),
    ])
    const tweakedKey = TaprootUtils.tweakMusig(musig, tree.tree)
    const lockupAddress = address.fromOutputScript(Scripts.p2trOutput(tweakedKey), getNetwork('regtest'))
    return {
        preimage: preimage.toString('hex'),
        preimageHash: preimageHash.toString('hex'),
        privKey: Buffer.from(claimKeys.privateKey).toString('hex'),
        pubkey: Buffer.from(claimKeys.publicKey).toString('hex'),
        created: {
            id: `swap-${randomBytes(8).toString('hex')}`,
            invoice: 'lnbc-test-invoice',
            lockupAddress,
            refundPublicKey: Buffer.from(refundKeys.publicKey).toString('hex'),
            swapTree: SwapTreeSerializer.serializeSwapTree(tree),
            timeoutBlockHeight: timeout,
            onchainAmount: AMOUNTS.onchainAmount,
        },
    }
}

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

const makeHarness = async (
    T: StorageTestBase,
    valid: QuoteFixture,
    decode?: { paymentHash?: string, numSatoshis?: number, satPerVbyte?: number, minRelaySatPerVbyte?: number },
) => {
    const swapper = new ReverseSwaps({ httpUrl: MOCK_URL, wsUrl: 'ws://mock', network: 'regtest' })
    swapper.GetFees = async () => ({ ok: true, fees: FEES })
    swapper.SwapTransaction = async (txAmount) => {
        T.expect(txAmount).to.equal(AMOUNTS.onchainAmount)
        return {
            ok: true as const,
            createdResponse: valid.created,
            preimage: valid.preimage,
            pubkey: valid.pubkey,
            privKey: valid.privKey,
        }
    }
    const swaps = new Swaps(mockSettings as any, T.storage)
    swaps.revSwappers[MOCK_URL] = swapper
    swaps.SetLnd({
        DecodeInvoice: async () => ({
            numSatoshis: decode?.numSatoshis ?? AMOUNTS.invoiceAmount,
            paymentHash: decode?.paymentHash ?? valid.preimageHash,
        }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: TIP }),
        EstimateSatPerVbyte: async () => ({
            satPerVbyte: decode?.satPerVbyte ?? 1,
            minRelaySatPerVbyte: decode?.minRelaySatPerVbyte ?? 1,
        }),
    } as any)
    return swaps
}
