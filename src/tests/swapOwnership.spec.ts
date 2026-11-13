import { randomBytes } from 'crypto'
import { Transaction } from 'bitcoinjs-lib'
import { Swaps } from '../services/lnd/swaps/swaps.js'
import { ReverseSwaps } from '../services/lnd/swaps/reverseSwaps.js'
import { Application } from '../services/storage/entity/Application.js'
import { ApplicationUser } from '../services/storage/entity/ApplicationUser.js'
import {
    ADMIN_SWAP_ACTOR,
    ADMIN_SWAP_OWNER_ID,
    assertAdminSwapActor,
    assertSwapActor,
    assertUserSwapActor,
    isReservedAppUserIdentifier,
} from '../services/lnd/swaps/swapOwnership.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const MOCK_URL = 'http://mock-boltz'
const DEST = 'bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080'
const OTHER_DEST = 'bcrt1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qzf4j5y'

export default async (T: StorageTestBase) => {
    testReservedIdentifierHelper(T)
    testUserPathRejectsAdminSentinel(T)
    await testCannotCreateReservedAppUser(T)
    await testReservedIdentifierCannotQuoteOrPaySwaps(T)
    await testExistingSystemAdminCannotUseUserSwapApis(T)
    await testRestorePreservesReservedIdentifiers(T)
    await testAdminOwnerSeesLegacyAdminRows(T)
    await testAdminCanReserveLegacyAndNamespacedRows(T)
    await testDestinationIsAtomicallyReserved(T)
    await testCompetingDestinationIsRejected(T)
    await testPaymentFailureAbortsClaimWatch(T)
}

const testReservedIdentifierHelper = (T: StorageTestBase) => {
    T.d('starting reserved identifier matching')
    T.expect(isReservedAppUserIdentifier('admin')).to.equal(true)
    T.expect(isReservedAppUserIdentifier('ADMIN')).to.equal(true)
    T.expect(isReservedAppUserIdentifier('system:admin')).to.equal(true)
    T.expect(isReservedAppUserIdentifier('system:other')).to.equal(true)
    T.expect(isReservedAppUserIdentifier('alice')).to.equal(false)
    T.d('admin and system: prefixes are reserved')
}

const testUserPathRejectsAdminSentinel = (T: StorageTestBase) => {
    T.d('starting user swap actor rejects the admin sentinel')
    T.expect(() => assertUserSwapActor('system:admin')).to.throw('reserved user identifier')
    T.expect(() => assertSwapActor('system:admin')).to.throw('reserved user identifier')
    T.expect(() => assertSwapActor('system:admin', 'user')).to.throw('reserved user identifier')
    T.expect(() => assertAdminSwapActor('system:admin')).to.not.throw()
    T.expect(() => assertSwapActor('system:admin', 'admin')).to.not.throw()
    T.expect(() => assertAdminSwapActor('alice')).to.throw('reserved user identifier')
    T.expect(() => assertUserSwapActor('alice')).to.not.throw()
    T.d('admin actor is a separate source, not a user identifier')
}

const testCannotCreateReservedAppUser = async (T: StorageTestBase) => {
    T.d('starting application users cannot take the admin swap owner id')
    const app = await T.storage.applicationStorage.AddApplication(`own-${randomBytes(4).toString('hex')}`, true)
    for (const identifier of ['admin', 'ADMIN', 'system:admin', 'system:other']) {
        let threw = false
        try {
            await T.storage.applicationStorage.AddApplicationUser(app, identifier, 0)
        } catch (err: any) {
            threw = true
            T.expect(err.message).to.equal('reserved user identifier')
        }
        T.expect(threw, identifier).to.equal(true)
    }
    T.d('caller-supplied admin identifiers are rejected')
}

const testReservedIdentifierCannotQuoteOrPaySwaps = async (T: StorageTestBase) => {
    T.d('starting reserved identifiers cannot use the user swap APIs')
    const swaps = makeSwaps(T).swaps
    let quoteThrew = false
    try {
        await swaps.GetTxSwapQuotes('admin', 10_000, () => 0)
    } catch (err: any) {
        quoteThrew = true
        T.expect(err.message).to.equal('reserved user identifier')
    }
    T.expect(quoteThrew).to.equal(true)

    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap('admin', {
        timeout_block_height: 920_000 + 1_008,
    }))
    let payThrew = false
    try {
        await swaps.PayAddrWithSwap('admin', saved.swap_operation_id, DEST, async () => { })
    } catch (err: any) {
        payThrew = true
        T.expect(err.message).to.equal('reserved user identifier')
    }
    T.expect(payThrew).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)

    let systemAdminQuoteThrew = false
    try {
        await swaps.GetTxSwapQuotes(ADMIN_SWAP_OWNER_ID, 10_000, () => 0)
    } catch (err: any) {
        systemAdminQuoteThrew = true
        T.expect(err.message).to.equal('reserved user identifier')
    }
    T.expect(systemAdminQuoteThrew).to.equal(true)

    const listed = await swaps.ListTxSwaps(ADMIN_SWAP_OWNER_ID, [], () => undefined, () => 0, ADMIN_SWAP_ACTOR)
    T.expect(Array.isArray(listed.swaps)).to.equal(true)
    T.d('a linked user named admin or system:admin cannot use the user swap path')
}

const insertExistingAppUser = async (T: StorageTestBase, app: Application, identifier: string) => {
    const user = await T.storage.dbs.Tx(tx => T.storage.userStorage.AddUser(0, tx))
    return T.storage.dbs.CreateAndSave<ApplicationUser>('ApplicationUser', {
        user,
        application: app,
        identifier,
        topic_id: randomBytes(32).toString('hex'),
    })
}

const deleteAppUserByIdentifier = async (T: StorageTestBase, identifier: string) => {
    const existing = await T.storage.dbs.FindOne<ApplicationUser>('ApplicationUser', { where: { identifier } })
    if (!existing) {
        return
    }
    await T.storage.dbs.Delete<ApplicationUser>('ApplicationUser', existing.serial_id)
}

const testExistingSystemAdminCannotUseUserSwapApis = async (T: StorageTestBase) => {
    T.d('starting existing system:admin application user is blocked from user swaps')
    const app = await T.storage.applicationStorage.AddApplication(`exist-${randomBytes(4).toString('hex')}`, true)
    await insertExistingAppUser(T, app, ADMIN_SWAP_OWNER_ID)
    const { user, created } = await T.storage.applicationStorage.GetOrCreateApplicationUser(app, ADMIN_SWAP_OWNER_ID, 0)
    T.expect(created).to.equal(false)
    T.expect(user.identifier).to.equal(ADMIN_SWAP_OWNER_ID)

    const swaps = makeSwaps(T).swaps
    let quoteThrew = false
    try {
        await swaps.GetTxSwapQuotes(user.identifier, 10_000, () => 0)
    } catch (err: any) {
        quoteThrew = true
        T.expect(err.message).to.equal('reserved user identifier')
    }
    T.expect(quoteThrew).to.equal(true)

    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(ADMIN_SWAP_OWNER_ID, {
        timeout_block_height: 920_000 + 1_008,
    }))
    let payThrew = false
    try {
        await swaps.PayAddrWithSwap(user.identifier, saved.swap_operation_id, DEST, async () => { })
    } catch (err: any) {
        payThrew = true
        T.expect(err.message).to.equal('reserved user identifier')
    }
    T.expect(payThrew).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    await deleteAppUserByIdentifier(T, ADMIN_SWAP_OWNER_ID)
    T.d('an existing system:admin user still cannot cross the admin swap boundary')
}

const testRestorePreservesReservedIdentifiers = async (T: StorageTestBase) => {
    T.d('starting restore preserves historical reserved application-user identifiers')
    await deleteAppUserByIdentifier(T, ADMIN_SWAP_OWNER_ID)
    const app = await T.storage.applicationStorage.AddApplication(`restore-${randomBytes(4).toString('hex')}`, true)
    const reservedUser = await T.storage.dbs.Tx(tx => T.storage.userStorage.AddUser(0, tx))
    const okUser = await T.storage.dbs.Tx(tx => T.storage.userStorage.AddUser(0, tx))
    const okIdentifier = `restored-${randomBytes(8).toString('hex')}`
    const restored = await T.storage.dbs.Tx(tx => T.storage.applicationStorage.RestoreApplicationUsers([
        {
            user_id: reservedUser.user_id,
            app_id: app.app_id,
            identifier: ADMIN_SWAP_OWNER_ID,
            callback_url: '',
            topic_id: randomBytes(32).toString('hex'),
            nostr_public_key: null,
            owner_only_clink: false,
        },
        {
            user_id: okUser.user_id,
            app_id: app.app_id,
            identifier: okIdentifier,
            callback_url: '',
            topic_id: randomBytes(32).toString('hex'),
            nostr_public_key: null,
            owner_only_clink: false,
        },
    ], tx))
    T.expect(restored).to.equal(2)
    const reserved = await T.storage.applicationStorage.GetApplicationUserIfExists(app, ADMIN_SWAP_OWNER_ID)
    T.expect(reserved?.identifier).to.equal(ADMIN_SWAP_OWNER_ID)
    const ok = await T.storage.applicationStorage.GetApplicationUserIfExists(app, okIdentifier)
    T.expect(ok?.identifier).to.equal(okIdentifier)

    const swaps = makeSwaps(T).swaps
    let quoteThrew = false
    try {
        await swaps.GetTxSwapQuotes(ADMIN_SWAP_OWNER_ID, 10_000, () => 0)
    } catch (err: any) {
        quoteThrew = true
        T.expect(err.message).to.equal('reserved user identifier')
    }
    T.expect(quoteThrew).to.equal(true)
    await deleteAppUserByIdentifier(T, ADMIN_SWAP_OWNER_ID)
    T.d('restore kept system:admin and a normal application user; swap access stays denied')
}

const testAdminOwnerSeesLegacyAdminRows = async (T: StorageTestBase) => {
    T.d('starting admin owner namespace still finds legacy admin rows')
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap('admin', {
        timeout_block_height: 920_000 + 1_008,
    }))
    const found = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, ADMIN_SWAP_OWNER_ID)
    T.expect(found?.swap_operation_id).to.equal(saved.swap_operation_id)
    const pending = await T.storage.paymentStorage.ListPendingTransactionSwaps(ADMIN_SWAP_OWNER_ID)
    T.expect(pending.some(s => s.swap_operation_id === saved.swap_operation_id)).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('system:admin lookups include historical admin-owned swaps')
}

const testAdminCanReserveLegacyAndNamespacedRows = async (T: StorageTestBase) => {
    T.d('starting admin destination reserve matches legacy and namespaced owner rows')
    const legacy = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap('admin'))
    const namespaced = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(ADMIN_SWAP_OWNER_ID))
    T.expect(await T.storage.paymentStorage.StartTransactionSwap(legacy.swap_operation_id, DEST, ADMIN_SWAP_OWNER_ID)).to.equal(1)
    T.expect(await T.storage.paymentStorage.StartTransactionSwap(namespaced.swap_operation_id, DEST, ADMIN_SWAP_OWNER_ID)).to.equal(1)
    const legacyRow = await T.storage.paymentStorage.GetTransactionSwap(legacy.swap_operation_id, ADMIN_SWAP_OWNER_ID)
    const namespacedRow = await T.storage.paymentStorage.GetTransactionSwap(namespaced.swap_operation_id, ADMIN_SWAP_OWNER_ID)
    T.expect(legacyRow?.address_paid).to.equal(DEST)
    T.expect(namespacedRow?.address_paid).to.equal(DEST)
    T.expect(await T.storage.paymentStorage.StartTransactionSwap(legacy.swap_operation_id, OTHER_DEST, ADMIN_SWAP_OWNER_ID)).to.equal(0)
    await T.storage.paymentStorage.DeleteTransactionSwap(legacy.swap_operation_id)
    await T.storage.paymentStorage.DeleteTransactionSwap(namespaced.swap_operation_id)

    const invoice = await T.storage.paymentStorage.AddInvoiceSwap({
        app_user_id: 'admin',
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
    })
    const foundInvoice = await T.storage.paymentStorage.GetInvoiceSwap(invoice.swap_operation_id, ADMIN_SWAP_OWNER_ID)
    T.expect(foundInvoice?.swap_operation_id).to.equal(invoice.swap_operation_id)
    await T.storage.paymentStorage.DeleteInvoiceSwap(invoice.swap_operation_id)
    T.d('admin In() updates reserved both historical and new owner rows without letting a second dest win')
}

const testDestinationIsAtomicallyReserved = async (T: StorageTestBase) => {
    T.d('starting reverse swap destination reserve is exclusive')
    const userId = `rev-res-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId))
    const first = await T.storage.paymentStorage.StartTransactionSwap(saved.swap_operation_id, DEST, userId)
    const second = await T.storage.paymentStorage.StartTransactionSwap(saved.swap_operation_id, OTHER_DEST, userId)
    T.expect(first).to.equal(1)
    T.expect(second).to.equal(0)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.address_paid).to.equal(DEST)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('a second destination cannot overwrite a reserved reverse swap')
}

const testCompetingDestinationIsRejected = async (T: StorageTestBase) => {
    T.d('starting PayAddrWithSwap rejects a competing destination after reserve')
    const userId = `rev-comp-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    swapper.SubscribeToTransactionSwap = async (_data, done) => {
        done({ ok: true, txId: Transaction.fromHex(dummyTxHex()).getId() })
    }
    await T.storage.paymentStorage.StartTransactionSwap(saved.swap_operation_id, DEST, userId)
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, OTHER_DEST, async () => {
            throw new Error('should not pay')
        })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('swap already started with a different destination')
    }
    T.expect(threw).to.equal(true)
    const row = await T.storage.paymentStorage.GetTransactionSwap(saved.swap_operation_id, userId)
    T.expect(row?.address_paid).to.equal(DEST)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('in-flight destination stayed bound to the reserved address')
}

const testPaymentFailureAbortsClaimWatch = async (T: StorageTestBase) => {
    T.d('starting rejected payment cancels the reverse-swap claim subscription')
    const userId = `rev-abort-${randomBytes(8).toString('hex')}`
    const saved = await T.storage.paymentStorage.AddTransactionSwap(requiredSwap(userId, {
        timeout_block_height: 920_000 + 1_008,
    }))
    const { swaps, swapper } = makeSwaps(T)
    swapper.VerifyReverseQuote = async () => ({ ok: true as const })
    let aborted = false
    swapper.SubscribeToTransactionSwap = async (_data, done, chain) => {
        const onAbort = () => {
            aborted = true
            done({ ok: false, error: 'aborted' })
        }
        if (chain.abortSignal?.aborted) {
            onAbort()
            return
        }
        chain.abortSignal?.addEventListener('abort', onAbort)
    }
    let threw = false
    try {
        await swaps.PayAddrWithSwap(userId, saved.swap_operation_id, DEST, async () => {
            await new Promise(resolve => setTimeout(resolve, 20))
            throw new Error('insufficient balance')
        })
    } catch (err: any) {
        threw = true
        T.expect(err.message).to.equal('insufficient balance')
    }
    T.expect(threw).to.equal(true)
    T.expect(aborted).to.equal(true)
    await T.storage.paymentStorage.DeleteTransactionSwap(saved.swap_operation_id)
    T.d('payment authorization failure aborted the claim watch')
}

const dummyTxHex = () => {
    const tx = new Transaction()
    tx.version = 2
    tx.addInput(Buffer.alloc(32), 0)
    tx.addOutput(Buffer.from('6aaa', 'hex'), 0)
    return tx.toHex()
}

const requiredSwap = (userId: string, extra: Record<string, unknown> = {}) => ({
    app_user_id: userId,
    swap_quote_id: `swap-${randomBytes(8).toString('hex')}`,
    swap_tree: '{}',
    lockup_address: 'bcrt1qlockup',
    refund_public_key: '11'.repeat(33),
    timeout_block_height: 10,
    invoice: 'lnbc1-rev',
    invoice_amount: 1200,
    transaction_amount: 1000,
    swap_fee_sats: 50,
    chain_fee_sats: 200,
    preimage: '22'.repeat(32),
    ephemeral_public_key: '33'.repeat(33),
    ephemeral_private_key: '44'.repeat(32),
    service_url: MOCK_URL,
    ...extra,
})

const makeSwaps = (T: StorageTestBase) => {
    const swapper = new ReverseSwaps({ httpUrl: MOCK_URL, wsUrl: 'ws://127.0.0.1:1', network: 'regtest' })
    const swaps = new Swaps({
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
    } as any, T.storage)
    swaps.revSwappers[MOCK_URL] = swapper
    swaps.SetLnd({
        DecodeInvoice: async () => ({ numSatoshis: 1200, paymentHash: '22'.repeat(32) }),
        GetInfo: async () => ({ syncedToChain: true, blockHeight: 5 }),
        BroadcastTransaction: async (txHex: string) => ({ txId: Transaction.fromHex(txHex).getId() }),
        WaitForScriptConfirmations: async () => ({ txHex: dummyTxHex(), blockHeight: 6 }),
        EstimateSatPerVbyte: async () => ({ satPerVbyte: 1, minRelaySatPerVbyte: 1 }),
    } as any)
    return { swaps, swapper }
}
