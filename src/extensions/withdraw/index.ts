/**
 * LNURL-withdraw Extension for Lightning.Pub
 *
 * Implements LUD-03 (LNURL-withdraw) for creating withdraw links
 * that allow anyone to pull funds from a Lightning wallet.
 *
 * Use cases:
 * - Quick vouchers (batch single-use codes)
 * - Faucets
 * - Gift cards / prepaid cards
 * - Tips / donations
 */

import {
  Extension,
  ExtensionInfo,
  ExtensionContext,
  ExtensionDatabase,
  CreateWithdrawLinkRequest,
  UpdateWithdrawLinkRequest,
  HttpRoute,
  HttpRequest,
  HttpResponse
} from './types.js'
import { runMigrations } from './migrations.js'
import { WithdrawManager } from './managers/withdrawManager.js'

/**
 * LNURL-withdraw Extension
 */
export default class WithdrawExtension implements Extension {
  readonly info: ExtensionInfo = {
    id: 'withdraw',
    name: 'LNURL Withdraw',
    version: '1.0.0',
    description: 'Create withdraw links for vouchers, faucets, and gifts (LUD-03)',
    author: 'Lightning.Pub',
    minPubVersion: '1.0.0'
  }

  private manager!: WithdrawManager
  private baseUrl: string = ''

  /**
   * Initialize the extension
   */
  async initialize(ctx: ExtensionContext, db: ExtensionDatabase): Promise<void> {
    // Run migrations
    await runMigrations(db)

    // Initialize manager
    this.manager = new WithdrawManager(db, ctx)

    // Register RPC methods
    this.registerRpcMethods(ctx)

    // Register HTTP routes for LNURL protocol
    this.registerHttpRoutes(ctx)

    ctx.log('info', 'Extension initialized')
  }

  /**
   * Shutdown the extension
   */
  async shutdown(): Promise<void> {
    // Cleanup if needed
  }

  /**
   * Set the base URL for LNURL generation
   * This should be called by the main application after loading
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url
    this.manager.setBaseUrl(url)
  }

  /**
   * Get HTTP routes for this extension
   * These need to be mounted by the main HTTP server
   */
  getHttpRoutes(): HttpRoute[] {
    return [
      // Create withdraw link (HTTP API for ATM/external integrations)
      {
        method: 'POST',
        path: '/api/v1/withdraw/create',
        handler: this.handleCreateWithdrawLink.bind(this)
      },
      // LNURL callback (user submits invoice) - MUST be before :unique_hash routes
      {
        method: 'GET',
        path: '/api/v1/lnurl/cb/:unique_hash',
        handler: this.handleLnurlCallback.bind(this)
      },
      // Initial LNURL request (unique link with use hash)
      {
        method: 'GET',
        path: '/api/v1/lnurl/:unique_hash/:id_unique_hash',
        handler: this.handleLnurlUniqueRequest.bind(this)
      },
      // Initial LNURL request (simple link) - MUST be last (catches all)
      {
        method: 'GET',
        path: '/api/v1/lnurl/:unique_hash',
        handler: this.handleLnurlRequest.bind(this)
      }
    ]
  }

  /**
   * Register RPC methods with the extension context
   */
  private registerRpcMethods(ctx: ExtensionContext): void {
    // Create withdraw link
    ctx.registerMethod('withdraw.createLink', async (req, appId) => {
      const link = await this.manager.create(appId, req as CreateWithdrawLinkRequest)
      const stats = await this.manager.getWithdrawalStats(link.id)
      return {
        link,
        total_withdrawn_sats: stats.total_sats,
        withdrawals_count: stats.count
      }
    })

    // Create quick vouchers
    ctx.registerMethod('withdraw.createVouchers', async (req, appId) => {
      const vouchers = await this.manager.createVouchers(
        appId,
        req.title,
        req.amount,
        req.count,
        req.description
      )
      return {
        vouchers,
        total_amount_sats: req.amount * req.count
      }
    })

    // Get withdraw link
    ctx.registerMethod('withdraw.getLink', async (req, appId) => {
      const link = await this.manager.get(req.id, appId)
      if (!link) throw new Error('Withdraw link not found')
      const stats = await this.manager.getWithdrawalStats(link.id)
      return {
        link,
        total_withdrawn_sats: stats.total_sats,
        withdrawals_count: stats.count
      }
    })

    // List withdraw links
    ctx.registerMethod('withdraw.listLinks', async (req, appId) => {
      const links = await this.manager.list(
        appId,
        req.include_spent || false,
        req.limit,
        req.offset
      )
      return { links }
    })

    // Update withdraw link
    ctx.registerMethod('withdraw.updateLink', async (req, appId) => {
      const link = await this.manager.update(req.id, appId, req as UpdateWithdrawLinkRequest)
      if (!link) throw new Error('Withdraw link not found')
      const stats = await this.manager.getWithdrawalStats(link.id)
      return {
        link,
        total_withdrawn_sats: stats.total_sats,
        withdrawals_count: stats.count
      }
    })

    // Delete withdraw link
    ctx.registerMethod('withdraw.deleteLink', async (req, appId) => {
      const success = await this.manager.delete(req.id, appId)
      if (!success) throw new Error('Withdraw link not found')
      return { success }
    })

    // List withdrawals
    ctx.registerMethod('withdraw.listWithdrawals', async (req, appId) => {
      const withdrawals = await this.manager.listWithdrawals(
        appId,
        req.link_id,
        req.limit,
        req.offset
      )
      return { withdrawals }
    })

    // Get withdrawal stats
    ctx.registerMethod('withdraw.getStats', async (req, appId) => {
      // Get all links to calculate total stats
      const links = await this.manager.list(appId, true)

      let totalLinks = links.length
      let activeLinks = 0
      let spentLinks = 0
      let totalWithdrawn = 0
      let totalWithdrawals = 0

      for (const link of links) {
        if (link.used >= link.uses) {
          spentLinks++
        } else {
          activeLinks++
        }
        const stats = await this.manager.getWithdrawalStats(link.id)
        totalWithdrawn += stats.total_sats
        totalWithdrawals += stats.count
      }

      return {
        total_links: totalLinks,
        active_links: activeLinks,
        spent_links: spentLinks,
        total_withdrawn_sats: totalWithdrawn,
        total_withdrawals: totalWithdrawals
      }
    })
  }

  /**
   * Register HTTP routes (called by extension context)
   */
  private registerHttpRoutes(ctx: ExtensionContext): void {
    // HTTP routes are exposed via getHttpRoutes()
    // The main application is responsible for mounting them
    ctx.log('debug', 'HTTP routes registered for LNURL protocol')
  }

  // =========================================================================
  // HTTP Route Handlers
  // =========================================================================

  /**
   * Handle create withdraw link request (HTTP API)
   * POST /api/v1/withdraw/create
   *
   * Body: {
   *   title: string
   *   min_withdrawable: number (sats)
   *   max_withdrawable: number (sats)
   *   uses?: number (defaults to 1)
   *   wait_time?: number (seconds between uses, defaults to 0)
   * }
   *
   * Auth: Bearer token in Authorization header (app_<app_id>)
   *
   * Returns: {
   *   link: { lnurl, unique_hash, id, ... }
   * }
   */
  private async handleCreateWithdrawLink(req: HttpRequest): Promise<HttpResponse> {
    try {
      const { title, min_withdrawable, max_withdrawable, uses, wait_time } = req.body

      // Extract app_id from Authorization header (Bearer app_<app_id>)
      const authHeader = req.headers?.authorization || req.headers?.Authorization || ''
      let app_id = 'default'
      if (authHeader.startsWith('Bearer app_')) {
        app_id = authHeader.replace('Bearer app_', '')
      }

      if (!title || !min_withdrawable) {
        return {
          status: 400,
          body: { status: 'ERROR', reason: 'Missing required fields: title, min_withdrawable' },
          headers: { 'Content-Type': 'application/json' }
        }
      }

      const link = await this.manager.create(app_id, {
        title,
        min_withdrawable,
        max_withdrawable: max_withdrawable || min_withdrawable,
        uses: uses || 1,
        wait_time: wait_time || 0,
        is_unique: false // Simple single-use links for ATM
      })

      // Return in format expected by ATM client
      return {
        status: 200,
        body: {
          status: 'OK',
          link: {
            lnurl: link.lnurl,
            unique_hash: link.unique_hash,
            id: link.id,
            title: link.title,
            min_withdrawable: link.min_withdrawable,
            max_withdrawable: link.max_withdrawable,
            uses: link.uses,
            used: link.used
          }
        },
        headers: { 'Content-Type': 'application/json' }
      }
    } catch (error: any) {
      return {
        status: 500,
        body: { status: 'ERROR', reason: error.message },
        headers: { 'Content-Type': 'application/json' }
      }
    }
  }

  /**
   * Handle initial LNURL request (simple link)
   * GET /api/v1/lnurl/:unique_hash
   */
  private async handleLnurlRequest(req: HttpRequest): Promise<HttpResponse> {
    const { unique_hash } = req.params

    const result = await this.manager.handleLnurlRequest(unique_hash)

    return {
      status: 200,
      body: result,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  /**
   * Handle initial LNURL request (unique link)
   * GET /api/v1/lnurl/:unique_hash/:id_unique_hash
   */
  private async handleLnurlUniqueRequest(req: HttpRequest): Promise<HttpResponse> {
    const { unique_hash, id_unique_hash } = req.params

    const result = await this.manager.handleLnurlRequest(unique_hash, id_unique_hash)

    return {
      status: 200,
      body: result,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }

  /**
   * Handle LNURL callback (user submits invoice)
   * GET /api/v1/lnurl/cb/:unique_hash?k1=...&pr=...&id_unique_hash=...
   */
  private async handleLnurlCallback(req: HttpRequest): Promise<HttpResponse> {
    const { unique_hash } = req.params
    const { k1, pr, id_unique_hash } = req.query

    if (!k1 || !pr) {
      return {
        status: 200,
        body: { status: 'ERROR', reason: 'Missing k1 or pr parameter' },
        headers: { 'Content-Type': 'application/json' }
      }
    }

    const result = await this.manager.handleLnurlCallback(unique_hash, {
      k1,
      pr,
      id_unique_hash
    })

    return {
      status: 200,
      body: result,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  }
}

// Export types for external use
export * from './types.js'
export { WithdrawManager } from './managers/withdrawManager.js'
