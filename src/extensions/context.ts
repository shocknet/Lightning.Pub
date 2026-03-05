import {
  ExtensionContext,
  ExtensionDatabase,
  ExtensionInfo,
  ApplicationInfo,
  CreateInvoiceOptions,
  CreatedInvoice,
  PaymentReceivedData,
  NostrEvent,
  UnsignedNostrEvent,
  RpcMethodHandler,
  LnurlPayInfo
} from './types.js'

/**
 * Main Handler interface (from Lightning.Pub)
 * This is a minimal interface - the actual MainHandler has more methods
 */
export interface MainHandlerInterface {
  // Application management
  applicationManager: {
    getById(id: string): Promise<any>
    PayAppUserInvoice(appId: string, req: {
      amount: number
      invoice: string
      user_identifier: string
      debit_npub?: string
    }): Promise<{
      preimage: string
      amount_paid: number
      network_fee: number
      service_fee: number
    }>
  }

  // Payment operations
  paymentManager: {
    createInvoice(params: {
      applicationId: string
      amountSats: number
      memo?: string
      expiry?: number
      metadata?: Record<string, any>
    }): Promise<{
      id: string
      paymentRequest: string
      paymentHash: string
      expiry: number
    }>

    payInvoice(params: {
      applicationId: string
      paymentRequest: string
      maxFeeSats?: number
      userPubkey?: string
    }): Promise<{
      paymentHash: string
      feeSats: number
    }>

    /**
     * Get LNURL-pay info for a user by their Nostr pubkey
     * This enables Lightning Address (LUD-16) and zap (NIP-57) support
     */
    getLnurlPayInfoByPubkey(pubkeyHex: string, options?: {
      metadata?: string
      description?: string
    }): Promise<LnurlPayInfo>
  }

  // Nostr operations
  sendNostrEvent(event: any): Promise<string | null>
  sendEncryptedDM(applicationId: string, recipientPubkey: string, content: string): Promise<string>
}

/**
 * Callback registries for extension events
 */
interface CallbackRegistries {
  paymentReceived: Array<(payment: PaymentReceivedData) => Promise<void>>
  nostrEvent: Array<(event: NostrEvent, applicationId: string) => Promise<void>>
}

/**
 * Registered RPC method
 */
interface RegisteredMethod {
  extensionId: string
  handler: RpcMethodHandler
}

/**
 * Extension Context Implementation
 *
 * Provides the interface for extensions to interact with Lightning.Pub.
 * Each extension gets its own context instance.
 */
export class ExtensionContextImpl implements ExtensionContext {
  private callbacks: CallbackRegistries = {
    paymentReceived: [],
    nostrEvent: []
  }

  constructor(
    private extensionInfo: ExtensionInfo,
    private database: ExtensionDatabase,
    private mainHandler: MainHandlerInterface,
    private methodRegistry: Map<string, RegisteredMethod>
  ) {}

  /**
   * Get information about an application
   */
  async getApplication(applicationId: string): Promise<ApplicationInfo | null> {
    try {
      const app = await this.mainHandler.applicationManager.getById(applicationId)
      if (!app) return null

      return {
        id: app.id,
        name: app.name,
        nostr_public: app.nostr_public,
        balance_sats: app.balance || 0
      }
    } catch (e) {
      this.log('error', `Failed to get application ${applicationId}:`, e)
      return null
    }
  }

  /**
   * Create a Lightning invoice
   */
  async createInvoice(amountSats: number, options: CreateInvoiceOptions = {}): Promise<CreatedInvoice> {
    // Note: In practice, this needs an applicationId. Extensions typically
    // get this from the RPC request context. For now, we'll need to handle
    // this in the actual implementation.
    throw new Error('createInvoice requires applicationId from request context')
  }

  /**
   * Create invoice with explicit application ID
   * This is the internal method used by extensions
   */
  async createInvoiceForApp(
    applicationId: string,
    amountSats: number,
    options: CreateInvoiceOptions = {}
  ): Promise<CreatedInvoice> {
    const result = await this.mainHandler.paymentManager.createInvoice({
      applicationId,
      amountSats,
      memo: options.memo,
      expiry: options.expiry,
      metadata: {
        ...options.metadata,
        extension: this.extensionInfo.id
      }
    })

    return {
      id: result.id,
      paymentRequest: result.paymentRequest,
      paymentHash: result.paymentHash,
      expiry: result.expiry
    }
  }

  /**
   * Pay a Lightning invoice
   * If userPubkey is provided, pays from that user's balance instead of app.owner
   */
  async payInvoice(
    applicationId: string,
    paymentRequest: string,
    maxFeeSats?: number,
    userPubkey?: string
  ): Promise<{ paymentHash: string; feeSats: number }> {
    return this.mainHandler.paymentManager.payInvoice({
      applicationId,
      paymentRequest,
      maxFeeSats,
      userPubkey
    })
  }

  /**
   * Send an encrypted DM via Nostr
   */
  async sendEncryptedDM(
    applicationId: string,
    recipientPubkey: string,
    content: string
  ): Promise<string> {
    return this.mainHandler.sendEncryptedDM(applicationId, recipientPubkey, content)
  }

  /**
   * Publish a Nostr event
   */
  async publishNostrEvent(event: UnsignedNostrEvent): Promise<string | null> {
    return this.mainHandler.sendNostrEvent(event)
  }

  /**
   * Get LNURL-pay info for a user by pubkey
   * Enables Lightning Address and zap support
   */
  async getLnurlPayInfo(pubkeyHex: string, options?: {
    metadata?: string
    description?: string
  }): Promise<LnurlPayInfo> {
    return this.mainHandler.paymentManager.getLnurlPayInfoByPubkey(pubkeyHex, options)
  }

  /**
   * Subscribe to payment received callbacks
   */
  onPaymentReceived(callback: (payment: PaymentReceivedData) => Promise<void>): void {
    this.callbacks.paymentReceived.push(callback)
  }

  /**
   * Subscribe to incoming Nostr events
   */
  onNostrEvent(callback: (event: NostrEvent, applicationId: string) => Promise<void>): void {
    this.callbacks.nostrEvent.push(callback)
  }

  /**
   * Register an RPC method
   */
  registerMethod(name: string, handler: RpcMethodHandler): void {
    const fullName = name.startsWith(`${this.extensionInfo.id}.`)
      ? name
      : `${this.extensionInfo.id}.${name}`

    if (this.methodRegistry.has(fullName)) {
      throw new Error(`RPC method ${fullName} already registered`)
    }

    this.methodRegistry.set(fullName, {
      extensionId: this.extensionInfo.id,
      handler
    })

    this.log('debug', `Registered RPC method: ${fullName}`)
  }

  /**
   * Get the extension's database
   */
  getDatabase(): ExtensionDatabase {
    return this.database
  }

  /**
   * Log a message
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const prefix = `[Extension:${this.extensionInfo.id}]`
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...args)
        break
      case 'info':
        console.info(prefix, message, ...args)
        break
      case 'warn':
        console.warn(prefix, message, ...args)
        break
      case 'error':
        console.error(prefix, message, ...args)
        break
    }
  }

  // ===== Internal Methods (called by ExtensionLoader) =====

  /**
   * Dispatch payment received event to extension callbacks
   */
  async dispatchPaymentReceived(payment: PaymentReceivedData): Promise<void> {
    for (const callback of this.callbacks.paymentReceived) {
      try {
        await callback(payment)
      } catch (e) {
        this.log('error', 'Error in payment callback:', e)
      }
    }
  }

  /**
   * Dispatch Nostr event to extension callbacks
   */
  async dispatchNostrEvent(event: NostrEvent, applicationId: string): Promise<void> {
    for (const callback of this.callbacks.nostrEvent) {
      try {
        await callback(event, applicationId)
      } catch (e) {
        this.log('error', 'Error in Nostr event callback:', e)
      }
    }
  }

  /**
   * Get registered callbacks for external access
   */
  getCallbacks(): CallbackRegistries {
    return this.callbacks
  }
}

/**
 * Create an extension context
 */
export function createExtensionContext(
  extensionInfo: ExtensionInfo,
  database: ExtensionDatabase,
  mainHandler: MainHandlerInterface,
  methodRegistry: Map<string, RegisteredMethod>
): ExtensionContextImpl {
  return new ExtensionContextImpl(extensionInfo, database, mainHandler, methodRegistry)
}
