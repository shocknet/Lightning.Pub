import crypto from 'crypto'
import { deriveBackupKeys, LATEST_DERIVATION_VERSION } from '../services/backup/derivation.js'
import { encryptPayload, decryptPayload } from '../services/backup/encryption.js'
import { encryptTableRows, decryptTableRows, encodeBalanceRow, decodeBalanceRow, BalanceRow } from '../services/backup/segments.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

const TEST_PHRASE = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

export default async (T: StorageTestBase) => {
    await testDeriveKeysStable(T)
    await testDeriveKeysRejectUnknownVersion(T)
    await testEncryptDecryptPayload(T)
    await testEncryptDecryptRejectsWrongKey(T)
    await testEncryptDecryptTableRows(T)
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
