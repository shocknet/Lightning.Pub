// BACKUP: One-time sign-up with the managed backup service (PubFTPService).
//
// The service only accepts SFTP logins for accounts created through a hashcash-style
// proof of work: sha256(`${challenge}:${nonce}`) must start with `difficultyBits` zero bits.

import crypto from 'crypto'
import { CLOUD_SFTP_HOST } from './sftpClient.js'

const CLOUD_API_URL = `https://${CLOUD_SFTP_HOST}`
const REQUEST_TIMEOUT_MS = 15_000
// Refuse absurd difficulty so a misbehaving server cannot burn the node's CPU.
// 22 bits averages ~28 s on a slow single core (~150k hashes/s, e.g. Pi-class hardware).
export const MAX_ACCEPTED_POW_BITS = 22
// Hash attempts between yields, so solving never blocks payments on the event loop.
const HASHES_PER_YIELD = 5_000

type PowChallenge = { challengeId: string, challenge: string, difficultyBits: number }

/** Creates the cloud account for these phrase-derived credentials; an existing account counts as success. */
export async function provisionCloudAccount(username: string, password: string): Promise<void> {
    const challenge = await fetchChallenge()
    const nonce = await solvePow(challenge.challenge, challenge.difficultyBits)
    const res = await fetch(`${CLOUD_API_URL}/v1/provision`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password, challengeId: challenge.challengeId, nonce }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (res.status === 201 || res.status === 409) return
    throw new Error(`cloud backup sign-up failed: HTTP ${res.status} ${await errorCode(res)}`)
}

async function fetchChallenge(): Promise<PowChallenge> {
    const res = await fetch(`${CLOUD_API_URL}/v1/pow/challenge`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
    if (!res.ok) {
        throw new Error(`cloud backup challenge failed: HTTP ${res.status} ${await errorCode(res)}`)
    }
    const body = await res.json() as Partial<PowChallenge>
    if (typeof body.challengeId !== 'string' || typeof body.challenge !== 'string' || typeof body.difficultyBits !== 'number') {
        throw new Error('cloud backup challenge response is malformed')
    }
    assertPowDifficulty(body.difficultyBits)
    return body as PowChallenge
}

async function errorCode(res: Response): Promise<string> {
    try {
        const body = await res.json() as { error?: string }
        return body.error ?? ''
    } catch {
        return ''
    }
}

/** Difficulty must be an integer in 0..MAX_ACCEPTED_POW_BITS. NaN, fractions, and negatives are refused. */
export function assertPowDifficulty(bits: number): void {
    if (!Number.isInteger(bits) || bits < 0 || bits > MAX_ACCEPTED_POW_BITS) {
        throw new Error(`cloud backup challenge difficulty ${bits} is not an integer in 0..${MAX_ACCEPTED_POW_BITS}`)
    }
}

export async function solvePow(challenge: string, difficultyBits: number): Promise<string> {
    assertPowDifficulty(difficultyBits)
    for (let n = 0; ; n++) {
        const nonce = n.toString(16)
        if (hasLeadingZeroBits(`${challenge}:${nonce}`, difficultyBits)) return nonce
        if (n % HASHES_PER_YIELD === 0) await new Promise(resolve => setImmediate(resolve))
    }
}

export function hasLeadingZeroBits(payload: string, bits: number): boolean {
    if (!Number.isInteger(bits) || bits < 0) return false
    const hash = crypto.createHash('sha256').update(payload, 'utf8').digest()
    const fullBytes = Math.floor(bits / 8)
    for (let i = 0; i < fullBytes; i++) {
        if (hash[i] !== 0) return false
    }
    const remaining = bits % 8
    return remaining === 0 || (hash[fullBytes] >> (8 - remaining)) === 0
}
