/**
 * LNURL-withdraw Extension Types
 * Implements LUD-03 (LNURL-withdraw) for Lightning.Pub
 */

// Re-export base extension types
export {
  Extension,
  ExtensionInfo,
  ExtensionContext,
  ExtensionDatabase,
  ApplicationInfo,
  RpcMethodHandler
} from '../types.js'

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * A withdraw link that can be used to pull funds
 */
export interface WithdrawLink {
  id: string
  application_id: string

  // Display
  title: string
  description?: string

  // Amounts (in sats)
  min_withdrawable: number
  max_withdrawable: number

  // Usage limits
  uses: number              // Total allowed uses
  used: number              // Times used so far
  wait_time: number         // Seconds between uses

  // Security
  unique_hash: string       // For LNURL URL
  k1: string                // Challenge for callback
  is_unique: boolean           // Generate unique code per use
  uses_csv: string          // Comma-separated list of available use IDs

  // Rate limiting
  open_time: number         // Unix timestamp when next use is allowed

  // Creator identity (for Nostr RPC-created links)
  creator_pubkey?: string   // Nostr pubkey of the user who created this link

  // Webhook notifications
  webhook_url?: string
  webhook_headers?: string  // JSON string
  webhook_body?: string     // JSON string

  // Timestamps
  created_at: number
  updated_at: number
}

/**
 * Withdrawal record - tracks each successful withdrawal
 */
export interface Withdrawal {
  id: string
  link_id: string
  application_id: string

  // Payment details
  payment_hash: string
  amount_sats: number
  fee_sats: number

  // Recipient (if known)
  recipient_node?: string

  // Webhook result
  webhook_success?: boolean
  webhook_response?: string

  // Timestamp
  created_at: number
}

/**
 * Hash check - prevents double-spending during payment
 */
export interface HashCheck {
  hash: string
  k1: string
  created_at: number
}

// ============================================================================
// LNURL Protocol Types (LUD-03)
// ============================================================================

/**
 * LNURL-withdraw response (first call)
 * Returned when user scans the QR code
 */
export interface LnurlWithdrawResponse {
  tag: 'withdrawRequest'
  callback: string          // URL to call with invoice
  k1: string                // Challenge
  minWithdrawable: number   // Millisats
  maxWithdrawable: number   // Millisats
  defaultDescription: string
}

/**
 * LNURL error response
 */
export interface LnurlErrorResponse {
  status: 'ERROR'
  reason: string
}

/**
 * LNURL success response
 */
export interface LnurlSuccessResponse {
  status: 'OK'
}

// ============================================================================
// RPC Request/Response Types
// ============================================================================

/**
 * Create a new withdraw link
 */
export interface CreateWithdrawLinkRequest {
  title: string
  description?: string
  min_withdrawable: number  // sats
  max_withdrawable: number  // sats
  uses: number              // 1-250
  wait_time: number         // seconds between uses
  is_unique?: boolean       // generate unique code per use
  webhook_url?: string
  webhook_headers?: string  // JSON
  webhook_body?: string     // JSON
}

/**
 * Update an existing withdraw link
 */
export interface UpdateWithdrawLinkRequest {
  id: string
  title?: string
  description?: string
  min_withdrawable?: number
  max_withdrawable?: number
  uses?: number
  wait_time?: number
  is_unique?: boolean
  webhook_url?: string
  webhook_headers?: string
  webhook_body?: string
}

/**
 * Get withdraw link by ID
 */
export interface GetWithdrawLinkRequest {
  id: string
}

/**
 * List withdraw links
 */
export interface ListWithdrawLinksRequest {
  include_spent?: boolean   // Include fully used links
  limit?: number
  offset?: number
}

/**
 * Delete withdraw link
 */
export interface DeleteWithdrawLinkRequest {
  id: string
}

/**
 * Create quick vouchers (batch of single-use links)
 */
export interface CreateVouchersRequest {
  title: string
  amount: number            // sats per voucher
  count: number             // number of vouchers (1-100)
  description?: string
}

/**
 * Get withdraw link with LNURL
 */
export interface WithdrawLinkWithLnurl extends WithdrawLink {
  lnurl: string             // bech32 encoded LNURL
  lnurl_url: string         // raw callback URL
}

/**
 * List withdrawals for a link
 */
export interface ListWithdrawalsRequest {
  link_id?: string
  limit?: number
  offset?: number
}

/**
 * Withdraw link response with stats
 */
export interface WithdrawLinkResponse {
  link: WithdrawLinkWithLnurl
  total_withdrawn_sats: number
  withdrawals_count: number
}

/**
 * Vouchers response
 */
export interface VouchersResponse {
  vouchers: WithdrawLinkWithLnurl[]
  total_amount_sats: number
}

// ============================================================================
// HTTP Handler Types
// ============================================================================

/**
 * LNURL callback parameters
 */
export interface LnurlCallbackParams {
  k1: string                // Challenge from initial response
  pr: string                // Payment request (BOLT11 invoice)
  id_unique_hash?: string   // For unique links
}

/**
 * HTTP route handler
 */
export interface HttpRoute {
  method: 'GET' | 'POST'
  path: string
  handler: (req: HttpRequest) => Promise<HttpResponse>
}

export interface HttpRequest {
  params: Record<string, string>
  query: Record<string, string>
  body?: any
  headers: Record<string, string>
}

export interface HttpResponse {
  status: number
  body: any
  headers?: Record<string, string>
}
