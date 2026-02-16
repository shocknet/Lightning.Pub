/**
 * Extension System Core Types
 *
 * These types define the contract between Lightning.Pub and extensions.
 */

/**
 * Extension metadata
 */
export interface ExtensionInfo {
  id: string                    // Unique identifier (lowercase, no spaces)
  name: string                  // Display name
  version: string               // Semver version
  description: string           // Short description
  author: string                // Author name or organization
  minPubVersion?: string        // Minimum Lightning.Pub version required
  dependencies?: string[]       // Other extension IDs this depends on
}

/**
 * Extension database interface
 * Provides isolated database access for each extension
 */
export interface ExtensionDatabase {
  /**
   * Execute a write query (INSERT, UPDATE, DELETE, CREATE, etc.)
   */
  execute(sql: string, params?: any[]): Promise<{ changes?: number; lastId?: number }>

  /**
   * Execute a read query (SELECT)
   */
  query<T = any>(sql: string, params?: any[]): Promise<T[]>

  /**
   * Execute multiple statements in a transaction
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>
}

/**
 * Application info provided to extensions
 */
export interface ApplicationInfo {
  id: string
  name: string
  nostr_public: string          // Application's Nostr pubkey (hex)
  balance_sats: number
}

/**
 * Invoice creation options
 */
export interface CreateInvoiceOptions {
  memo?: string
  expiry?: number               // Seconds until expiry
  metadata?: Record<string, any>  // Custom metadata for callbacks
}

/**
 * Created invoice result
 */
export interface CreatedInvoice {
  id: string                    // Internal invoice ID
  paymentRequest: string        // BOLT11 invoice string
  paymentHash: string           // Payment hash (hex)
  expiry: number                // Expiry timestamp
}

/**
 * Payment received callback data
 */
export interface PaymentReceivedData {
  invoiceId: string
  paymentHash: string
  amountSats: number
  metadata?: Record<string, any>
}

/**
 * LNURL-pay info response (LUD-06/LUD-16)
 * Used for Lightning Address and zap support
 */
export interface LnurlPayInfo {
  tag: 'payRequest'
  callback: string                // URL to call with amount
  minSendable: number             // Minimum msats
  maxSendable: number             // Maximum msats
  metadata: string                // JSON-encoded metadata array
  allowsNostr?: boolean           // Whether zaps are supported
  nostrPubkey?: string            // Pubkey for zap receipts (hex)
}

/**
 * Nostr event structure (minimal)
 */
export interface NostrEvent {
  id: string
  pubkey: string
  created_at: number
  kind: number
  tags: string[][]
  content: string
  sig?: string
}

/**
 * Unsigned Nostr event for publishing
 */
export interface UnsignedNostrEvent {
  kind: number
  pubkey: string
  created_at: number
  tags: string[][]
  content: string
}

/**
 * RPC method handler function
 */
export type RpcMethodHandler = (
  request: any,
  applicationId: string,
  userPubkey?: string
) => Promise<any>

/**
 * Extension context - interface provided to extensions for interacting with Lightning.Pub
 */
export interface ExtensionContext {
  /**
   * Get information about an application
   */
  getApplication(applicationId: string): Promise<ApplicationInfo | null>

  /**
   * Create a Lightning invoice
   */
  createInvoice(amountSats: number, options?: CreateInvoiceOptions): Promise<CreatedInvoice>

  /**
   * Pay a Lightning invoice (requires sufficient balance)
   * If userPubkey is provided, pays from that user's balance instead of app.owner
   */
  payInvoice(applicationId: string, paymentRequest: string, maxFeeSats?: number, userPubkey?: string): Promise<{
    paymentHash: string
    feeSats: number
  }>

  /**
   * Send an encrypted DM via Nostr (NIP-44)
   */
  sendEncryptedDM(applicationId: string, recipientPubkey: string, content: string): Promise<string>

  /**
   * Publish a Nostr event (signed by application's key)
   */
  publishNostrEvent(event: UnsignedNostrEvent): Promise<string | null>

  /**
   * Get LNURL-pay info for a user (by pubkey)
   * Used to enable Lightning Address support (LUD-16) and zaps (NIP-57)
   */
  getLnurlPayInfo(pubkeyHex: string, options?: {
    metadata?: string              // Custom metadata JSON
    description?: string           // Human-readable description
  }): Promise<LnurlPayInfo>

  /**
   * Subscribe to payment received callbacks
   */
  onPaymentReceived(callback: (payment: PaymentReceivedData) => Promise<void>): void

  /**
   * Subscribe to incoming Nostr events for the application
   */
  onNostrEvent(callback: (event: NostrEvent, applicationId: string) => Promise<void>): void

  /**
   * Register an RPC method
   */
  registerMethod(name: string, handler: RpcMethodHandler): void

  /**
   * Get the extension's isolated database
   */
  getDatabase(): ExtensionDatabase

  /**
   * Log a message (prefixed with extension ID)
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void
}

/**
 * Extension interface - what extensions must implement
 */
export interface Extension {
  /**
   * Extension metadata
   */
  readonly info: ExtensionInfo

  /**
   * Initialize the extension
   * Called once when the extension is loaded
   */
  initialize(ctx: ExtensionContext, db: ExtensionDatabase): Promise<void>

  /**
   * Shutdown the extension
   * Called when Lightning.Pub is shutting down
   */
  shutdown?(): Promise<void>

  /**
   * Health check
   * Return true if extension is healthy
   */
  healthCheck?(): Promise<boolean>
}

/**
 * Extension constructor type
 */
export type ExtensionConstructor = new () => Extension

/**
 * Extension module default export
 */
export interface ExtensionModule {
  default: ExtensionConstructor
}

/**
 * Loaded extension state
 */
export interface LoadedExtension {
  info: ExtensionInfo
  instance: Extension
  database: ExtensionDatabase
  status: 'loading' | 'ready' | 'error' | 'stopped'
  error?: Error
  loadedAt: number
}

/**
 * Extension loader configuration
 */
export interface ExtensionLoaderConfig {
  extensionsDir: string         // Directory containing extensions
  databaseDir: string           // Directory for extension databases
  enabledExtensions?: string[]  // If set, only load these extensions
  disabledExtensions?: string[] // Extensions to skip
}
