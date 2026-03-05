/**
 * LNURL Encoding Utilities
 *
 * LNURL is a bech32-encoded URL with hrp "lnurl"
 * See: https://github.com/lnurl/luds
 */

import { bech32 } from 'bech32'
import crypto from 'crypto'

/**
 * Encode a URL as LNURL (bech32)
 */
export function encodeLnurl(url: string): string {
  const words = bech32.toWords(Buffer.from(url, 'utf8'))
  return bech32.encode('lnurl', words, 2000)  // 2000 char limit for URLs
}

/**
 * Decode an LNURL to a URL
 */
export function decodeLnurl(lnurl: string): string {
  const { prefix, words } = bech32.decode(lnurl, 2000)
  if (prefix !== 'lnurl') {
    throw new Error('Invalid LNURL prefix')
  }
  return Buffer.from(bech32.fromWords(words)).toString('utf8')
}

/**
 * Generate a URL-safe random ID
 */
export function generateId(length: number = 22): string {
  const bytes = crypto.randomBytes(Math.ceil(length * 3 / 4))
  return bytes.toString('base64url').slice(0, length)
}

/**
 * Generate a k1 challenge (32 bytes hex)
 */
export function generateK1(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a unique hash for a link
 */
export function generateUniqueHash(): string {
  return generateId(32)
}

/**
 * Generate a unique hash for a specific use of a link
 * This creates a deterministic hash based on link ID, unique_hash, and use number
 */
export function generateUseHash(linkId: string, uniqueHash: string, useNumber: string): string {
  const data = `${linkId}${uniqueHash}${useNumber}`
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 32)
}

/**
 * Verify a use hash matches one of the available uses
 */
export function verifyUseHash(
  linkId: string,
  uniqueHash: string,
  usesCsv: string,
  providedHash: string
): string | null {
  const uses = usesCsv.split(',').filter(u => u.trim() !== '')

  for (const useNumber of uses) {
    const expectedHash = generateUseHash(linkId, uniqueHash, useNumber.trim())
    if (expectedHash === providedHash) {
      return useNumber.trim()
    }
  }

  return null
}

/**
 * Build the LNURL callback URL for a withdraw link
 */
export function buildLnurlUrl(baseUrl: string, uniqueHash: string): string {
  // Remove trailing slash from baseUrl
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/api/v1/lnurl/${uniqueHash}`
}

/**
 * Build the LNURL callback URL for a unique withdraw link
 */
export function buildUniqueLnurlUrl(
  baseUrl: string,
  uniqueHash: string,
  useHash: string
): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/api/v1/lnurl/${uniqueHash}/${useHash}`
}

/**
 * Build the callback URL for the second step (where user sends invoice)
 */
export function buildCallbackUrl(baseUrl: string, uniqueHash: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return `${base}/api/v1/lnurl/cb/${uniqueHash}`
}

/**
 * Sats to millisats
 */
export function satsToMsats(sats: number): number {
  return sats * 1000
}

/**
 * Millisats to sats
 */
export function msatsToSats(msats: number): number {
  return Math.floor(msats / 1000)
}

/**
 * Validate a BOLT11 invoice (basic check)
 */
export function isValidBolt11(invoice: string): boolean {
  const lower = invoice.toLowerCase()
  return lower.startsWith('lnbc') || lower.startsWith('lntb') || lower.startsWith('lnbcrt')
}
