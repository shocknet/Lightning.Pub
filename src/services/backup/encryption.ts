// BACKUP: AES-256-GCM envelope encryption/decryption for .enc files
//
// Three independent version axes (see plan):
//   - Derivation profile version: determines how enc_key is derived
//   - Envelope version: determines file framing (this file)
//   - Payload version: determines row schema (inside the msgpack object)
//
// Restore dispatches by envelope version byte first, then by payload.v inside.

import crypto from 'crypto'
// import { pack, unpack } from 'msgpackr'

const ENVELOPE_V1 = 0x01
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

export type BackupPayload = {
    v: number
    data: Record<string, unknown>
}

// Encrypt a payload object into an .enc file buffer.
// Envelope v1: [version:1][iv:12][ciphertext:N][authTag:16]
export function encryptPayload(plaintext: Buffer, encKey: Buffer): Buffer {
    // const plaintext = pack(payload)
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv)
    const ct = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([Buffer.from([ENVELOPE_V1]), iv, ct, tag])
}

// Decrypt an .enc file buffer back into a payload object.
// Dispatches by envelope version byte. Throws on tampered/corrupted data.
export function decryptPayload(buf: Buffer, encKey: Buffer): Buffer {
    if (buf.length < 1 + IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Backup file too short to contain valid envelope')
    }

    const envelopeVersion = buf[0]
    if (envelopeVersion !== ENVELOPE_V1) {
        throw new Error(`Unknown envelope version: ${envelopeVersion}`)
    }

    return decryptV1(buf, encKey)
}

function decryptV1(buf: Buffer, encKey: Buffer): Buffer {
    const iv = buf.subarray(1, 1 + IV_LENGTH)
    const tag = buf.subarray(buf.length - AUTH_TAG_LENGTH)
    const ct = buf.subarray(1 + IV_LENGTH, buf.length - AUTH_TAG_LENGTH)

    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv)
    decipher.setAuthTag(tag)

    // GCM auth tag rejects any tampered or corrupted upload before DB writes
    return Buffer.concat([decipher.update(ct), decipher.final()])
}
