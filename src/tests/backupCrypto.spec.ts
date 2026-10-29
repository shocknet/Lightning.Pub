import crypto from 'crypto'
import ssh2 from 'ssh2'
const { utils } = ssh2
import { deriveBackupKeys, LATEST_DERIVATION_VERSION } from '../services/backup/derivation.js'
import { encryptPayload, decryptPayload } from '../services/backup/encryption.js'
import { concatUint8Arrays, encodeTLbV, parseTLbV } from '../services/helpers/tlv.js'
import {
    encryptTableRows, decryptTableRows,
    encodeBalanceRow, decodeBalanceRow, BalanceRow,
    encodeUserOfferRow, decodeUserOfferRow, UserOfferRow,
    encodeAppUserDeviceRow, decodeAppUserDeviceRow,
    encodeProductRow, decodeProductRow,
} from '../services/backup/segments.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const TEST_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

export default async (T: StorageTestBase) => {
    await testDeriveKeysStable(T)
    await testDeriveSshKeyStableAndParseable(T)
    await testDeriveKeysRejectUnknownVersion(T)
    await testEncryptDecryptPayload(T)
    await testEncryptDecryptRejectsWrongKey(T)
    await testEncryptDecryptTableRows(T)
    await testLargeBackupIntegersRoundTrip(T)
    await testNonHexIdsAndFractionalPriceRoundTrip(T)
    await testLargeTableDoesNotOverflow(T)
}

const testDeriveKeysStable = async (T: StorageTestBase) => {
    T.d('starting testDeriveKeysStable')
    const a = await deriveBackupKeys(TEST_PHRASE, LATEST_DERIVATION_VERSION)
    const b = await deriveBackupKeys(`  ${TEST_PHRASE.toUpperCase()}  `, LATEST_DERIVATION_VERSION)
    T.expect(a.encKey.equals(b.encKey)).to.equal(true)
    T.expect(a.sftpUser).to.equal(b.sftpUser)
    T.expect(a.sftpPass).to.equal(b.sftpPass)
    T.expect(a.encKey.length).to.equal(32)
    T.expect(a.sftpUser).to.have.length(64)
    T.expect(a.sftpPass).to.have.length(64)
    T.d('deriveBackupKeys is stable under normalize and yields 32-byte enc key')
}

const testDeriveSshKeyStableAndParseable = async (T: StorageTestBase) => {
    T.d('starting testDeriveSshKeyStableAndParseable')
    const a = await deriveBackupKeys(TEST_PHRASE, LATEST_DERIVATION_VERSION)
    const b = await deriveBackupKeys(`  ${TEST_PHRASE.toUpperCase()}  `, LATEST_DERIVATION_VERSION)
    T.expect(a.sftpPrivateKey).to.equal(b.sftpPrivateKey)
    T.expect(a.sftpPublicKey).to.equal(b.sftpPublicKey)
    T.expect(a.sftpPublicKey).to.match(/^ssh-ed25519 [A-Za-z0-9+/=]+ /)
    T.expect(a.sftpPrivateKey).to.include('BEGIN OPENSSH PRIVATE KEY')
    const parsed = utils.parseKey(a.sftpPrivateKey)
    T.expect(parsed instanceof Error).to.equal(false)
    if (parsed instanceof Error) throw parsed
    T.expect(parsed.type).to.equal('ssh-ed25519')
    const pubFromPriv = Buffer.from(parsed.getPublicSSH()).toString('base64')
    const pubLineB64 = a.sftpPublicKey.split(/\s+/)[1]
    T.expect(pubFromPriv).to.equal(pubLineB64)
    T.d('seed-derived OpenSSH ed25519 key is stable and matches the public line')
}

const testDeriveKeysRejectUnknownVersion = async (T: StorageTestBase) => {
    T.d('starting testDeriveKeysRejectUnknownVersion')
    let threw = false
    try {
        await deriveBackupKeys(TEST_PHRASE, 999)
    } catch {
        threw = true
    }
    T.expect(threw).to.equal(true)
    T.d('unknown derivation version is rejected')
}

const testEncryptDecryptPayload = async (T: StorageTestBase) => {
    T.d('starting testEncryptDecryptPayload')
    const keys = await deriveBackupKeys(TEST_PHRASE)
    const plaintext = Buffer.from('hello backup envelope', 'utf8')
    const enc = encryptPayload(plaintext, keys.encKey)
    T.expect(enc[0]).to.equal(0x01)
    const dec = decryptPayload(enc, keys.encKey)
    T.expect(dec.equals(plaintext)).to.equal(true)
    T.d('AES-GCM envelope roundtrips')
}

const testEncryptDecryptRejectsWrongKey = async (T: StorageTestBase) => {
    T.d('starting testEncryptDecryptRejectsWrongKey')
    const keys = await deriveBackupKeys(TEST_PHRASE)
    const enc = encryptPayload(Buffer.from('secret'), keys.encKey)
    const wrongKey = crypto.randomBytes(32)
    let threw = false
    try {
        decryptPayload(enc, wrongKey)
    } catch {
        threw = true
    }
    T.expect(threw).to.equal(true)
    T.d('wrong enc key fails decrypt')
}

const testEncryptDecryptTableRows = async (T: StorageTestBase) => {
    T.d('starting testEncryptDecryptTableRows')
    const keys = await deriveBackupKeys(TEST_PHRASE)
    const rows: BalanceRow[] = [
        { user_id: 'aa'.repeat(16), balance_sats: 100, locked: false },
        { user_id: 'bb'.repeat(16), balance_sats: 0, locked: true },
    ]
    const enc = encryptTableRows(rows.map(encodeBalanceRow), keys.encKey)
    const decoded = decryptTableRows(enc, keys.encKey).map(decodeBalanceRow)
    T.expect(decoded).to.deep.equal(rows)
    T.d('per-table encrypt/decrypt preserves balance rows')
}

const testLargeBackupIntegersRoundTrip = async (T: StorageTestBase) => {
    T.d('starting testLargeBackupIntegersRoundTrip')
    const keys = await deriveBackupKeys(TEST_PHRASE)
    const balance = 5_000_000_000
    const rows: BalanceRow[] = [{ user_id: 'aa'.repeat(16), balance_sats: balance, locked: false }]
    const enc = encryptTableRows(rows.map(encodeBalanceRow), keys.encKey)
    T.expect(decryptTableRows(enc, keys.encKey).map(decodeBalanceRow)).to.deep.equal(rows)
    T.d('balances above 2^32 round-trip')
}

const testNonHexIdsAndFractionalPriceRoundTrip = async (T: StorageTestBase) => {
    T.d('starting testNonHexIdsAndFractionalPriceRoundTrip')
    const keys = await deriveBackupKeys(TEST_PHRASE)
    const offer: UserOfferRow = {
        app_user_id: 'alice',
        offer_id: 'alice',
        management_pubkey: 'aa'.repeat(16),
        label: 'coffee',
        price_sats: 1.5,
        callback_url: '',
        bearer_token: '',
        rejectUnauthorized: true,
        blind: false,
        payer_data: null,
    }
    const device = {
        app_user_id: 'alice',
        device_id: crypto.randomUUID(),
        firebase_messaging_token: 'token',
    }
    const product = {
        product_id: crypto.randomUUID(),
        owner_user_id: 'alice',
        name: 'sticker',
        price_sats: 1.5,
    }
    T.expect(decodeUserOfferRow(encodeUserOfferRow(offer))).to.deep.equal(offer)
    T.expect(decodeAppUserDeviceRow(encodeAppUserDeviceRow(device))).to.deep.equal(device)
    T.expect(decodeProductRow(encodeProductRow(product))).to.deep.equal(product)
    const enc = encryptTableRows([encodeUserOfferRow(offer)], keys.encKey)
    T.expect(decryptTableRows(enc, keys.encKey).map(decodeUserOfferRow)).to.deep.equal([offer])
    T.d('non-hex IDs and fractional prices round-trip')
}

const testLargeTableDoesNotOverflow = async (T: StorageTestBase) => {
    T.d('starting testLargeTableDoesNotOverflow')
    const rows = Array.from({ length: 160_000 }, () => new Uint8Array([1]))
    const encoded = encodeTLbV({ 3: rows })
    const parsed = parseTLbV(encoded)
    T.expect(parsed[3].length).to.equal(160_000)
    T.expect(concatUint8Arrays(rows).length).to.equal(160_000)
    T.d('a 160k-row TLbV payload encodes without overflowing')
}
