// BACKUP: Key derivation from backup phrase
// Uses versioned derivation profiles so parameters can be tightened
// in future versions without invalidating existing backups.

import crypto from 'crypto'
import argon2 from 'argon2'

// --- Derivation profile v1 ---
// A version number fully determines all parameters.
// Restore dispatches by version; old profiles are kept as named functions indefinitely.

export type DerivedKeys = {
    encKey: Buffer   // 32 bytes — AES-256-GCM key for .enc dialtone files
    sftpUser: string // hex-encoded 32 bytes
    sftpPass: string // hex-encoded 32 bytes
}

type DerivationProfile = {
    version: number
    normalize: (phrase: string) => string
    argon2Salt: Buffer
    argon2MemoryCost: number
    argon2TimeCost: number
    argon2Parallelism: number
    encLabel: string
    ftpLabel: string
}

const PROFILES: Record<number, DerivationProfile> = {
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

function getProfile(version: number): DerivationProfile {
    const profile = PROFILES[version]
    if (!profile) {
        throw new Error(`Unknown derivation profile version: ${version}`)
    }
    return profile
}

async function deriveMaster(phrase: string, profile: DerivationProfile): Promise<Buffer> {
    const normalized = profile.normalize(phrase)
    const hash = await argon2.hash(normalized, {
        type: argon2.argon2id,
        salt: profile.argon2Salt,
        memoryCost: profile.argon2MemoryCost,
        timeCost: profile.argon2TimeCost,
        parallelism: profile.argon2Parallelism,
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
    const profile = getProfile(version)
    const master = await deriveMaster(phrase, profile)

    const encKey = await hkdfExpand(master, profile.encLabel, 32)
    const ftpRaw = await hkdfExpand(master, profile.ftpLabel, 64)

    return {
        encKey,
        sftpUser: ftpRaw.subarray(0, 32).toString('hex'),
        sftpPass: ftpRaw.subarray(32, 64).toString('hex'),
    }
}
