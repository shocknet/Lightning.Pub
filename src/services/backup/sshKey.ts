// BACKUP: Deterministic OpenSSH ed25519 keypair from a 32-byte seed.
//
// Used for managed-cloud SFTP: the private key never leaves the node; only the
// public OpenSSH one-liner is sent at provision. Encoding is fixed so the same
// seed always yields the same PEM after restore (ssh2 rejects PKCS8).

import crypto from 'crypto'

const ED25519_PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex')
const SSH_ED25519 = Buffer.from('ssh-ed25519')
/** Fixed comment so OpenSSH private-key PEM bytes stay stable across restores. */
const OPENSSH_COMMENT = 'lightning-pub-backup'
/** Fixed checkint (duplicated in the private section) for deterministic PEM. */
const OPENSSH_CHECKINT = 0x01020304

export type OpensshEd25519Keypair = {
    /** OpenSSH PEM (`-----BEGIN OPENSSH PRIVATE KEY-----`). */
    privateKey: string
    /** Single line `ssh-ed25519 AAAA… comment`. */
    publicKey: string
}

function sshString(buf: Buffer): Buffer {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(buf.length)
    return Buffer.concat([len, buf])
}

function sshUint32(n: number): Buffer {
    const buf = Buffer.alloc(4)
    buf.writeUInt32BE(n >>> 0)
    return buf
}

/** Raw 32-byte ed25519 public key for this private seed (via PKCS8). */
export function ed25519PublicFromSeed(seed: Buffer): Buffer {
    if (seed.length !== 32) {
        throw new Error(`ed25519 seed must be 32 bytes, got ${seed.length}`)
    }
    const pkcs8 = Buffer.concat([ED25519_PKCS8_PREFIX, seed])
    const privateKey = crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
    const spki = crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'der' }) as Buffer
    // SPKI: AlgorithmIdentifier + BIT STRING (0x03 0x21 0x00 || 32-byte pub)
    return spki.subarray(spki.length - 32)
}

function opensshPublicBlob(rawPub: Buffer): Buffer {
    return Buffer.concat([sshString(SSH_ED25519), sshString(rawPub)])
}

function padPrivateSection(body: Buffer): Buffer {
    // Unencrypted OpenSSH keys use an 8-byte block; pad with 1,2,3,…
    const rem = body.length % 8
    if (rem === 0) return body
    const pad = Buffer.alloc(8 - rem)
    for (let i = 0; i < pad.length; i++) pad[i] = i + 1
    return Buffer.concat([body, pad])
}

/**
 * Build a deterministic OpenSSH ed25519 keypair from a 32-byte seed.
 * The seed is the OpenSSH private scalar (first 32 bytes of the 64-byte private blob).
 */
export function opensshEd25519FromSeed(seed: Buffer): OpensshEd25519Keypair {
    const rawPub = ed25519PublicFromSeed(seed)
    const pubBlob = opensshPublicBlob(rawPub)
    const publicKey = `ssh-ed25519 ${pubBlob.toString('base64')} ${OPENSSH_COMMENT}`

    const check = sshUint32(OPENSSH_CHECKINT)
    const privateSection = padPrivateSection(Buffer.concat([
        check,
        check,
        sshString(SSH_ED25519),
        sshString(rawPub),
        sshString(Buffer.concat([seed, rawPub])),
        sshString(Buffer.from(OPENSSH_COMMENT, 'utf8')),
    ]))

    const body = Buffer.concat([
        Buffer.from('openssh-key-v1\0', 'utf8'),
        sshString(Buffer.from('none', 'utf8')),
        sshString(Buffer.from('none', 'utf8')),
        sshString(Buffer.alloc(0)),
        sshUint32(1),
        sshString(pubBlob),
        sshString(privateSection),
    ])
    const b64 = body.toString('base64')
    const wrapped = (b64.match(/.{1,70}/g) || [b64]).join('\n')
    const privateKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`
    return { privateKey, publicKey }
}
