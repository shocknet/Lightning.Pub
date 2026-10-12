// BACKUP: Key derivation from backup phrase
// Each derivation version pins its own parameters, so they can be tightened
// in a new version without invalidating existing backups.

import crypto from 'crypto'
import argon2 from 'argon2'

// --- Derivation v1 ---
// A version fully determines all outputs, including the SFTP login, so a backup's version
// cannot be recorded anywhere readable before deriving it. Keep every version forever;
// once a second exists, restore must try them newest-first until a shard decrypts.

export type DerivedKeys = {
    encKey: Buffer   // 32 bytes — AES-256-GCM key for .enc dialtone files
    sftpUser: string // hex-encoded 32 bytes
    sftpPass: string // hex-encoded 32 bytes
}

type DerivationParams = {
    version: number
    normalize: (phrase: string) => string
    argon2Salt: Buffer
    argon2MemoryCost: number
    argon2TimeCost: number
    argon2Parallelism: number
    encLabel: string
    ftpLabel: string
}

const DERIVATION_VERSIONS: Record<number, DerivationParams> = {
    1: {
        version: 1,
        normalize: (phrase: string) => phrase.toLowerCase().trim().replace(/\s+/g, ' '),
        argon2Salt: Buffer.from('lightning-pub-backup/v1', 'utf-8'),
        argon2MemoryCost: 65536,  // 64 MiB
        argon2TimeCost: 3,
        argon2Parallelism: 1,
        encLabel: 'lightning-pub/enc/v1',
        ftpLabel: 'lightning-pub/ftp/v1',
    }
}

export const LATEST_DERIVATION_VERSION = 1

function getDerivationParams(version: number): DerivationParams {
    const params = DERIVATION_VERSIONS[version]
    if (!params) {
        throw new Error(`Unknown derivation version: ${version}`)
    }
    return params
}

async function deriveMaster(phrase: string, params: DerivationParams): Promise<Buffer> {
    const normalized = params.normalize(phrase)
    const hash = await argon2.hash(normalized, {
        type: argon2.argon2id,
        salt: params.argon2Salt,
        memoryCost: params.argon2MemoryCost,
        timeCost: params.argon2TimeCost,
        parallelism: params.argon2Parallelism,
        raw: true,
        hashLength: 32,
    })
    return hash
}

function hkdfExpand(master: Buffer, info: string, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        crypto.hkdf('sha256', master, Buffer.alloc(0), info, length, (err, derivedKey) => {
            if (err) return reject(err)
            resolve(Buffer.from(derivedKey))
        })
    })
}

// Derive enc_key and SFTP credentials from a backup phrase.
// This is the only entry point for key derivation — all consumers use this.
//
// Phrase validation (aezeed wordlist/checksum) is a UX gate only;
// derivation correctness does NOT depend on aezeed validity.
// Future code must NOT couple this function to any aezeed library.
export async function deriveBackupKeys(phrase: string, version: number = LATEST_DERIVATION_VERSION): Promise<DerivedKeys> {
    const params = getDerivationParams(version)
    const master = await deriveMaster(phrase, params)

    const encKey = await hkdfExpand(master, params.encLabel, 32)
    const ftpRaw = await hkdfExpand(master, params.ftpLabel, 64)

    return {
        encKey,
        sftpUser: ftpRaw.subarray(0, 32).toString('hex'),
        sftpPass: ftpRaw.subarray(32, 64).toString('hex'),
    }
}
