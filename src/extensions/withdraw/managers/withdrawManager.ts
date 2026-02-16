/**
 * Withdraw Link Manager
 *
 * Handles CRUD operations for withdraw links and processes withdrawals
 */

import {
  ExtensionContext,
  ExtensionDatabase,
  WithdrawLink,
  Withdrawal,
  CreateWithdrawLinkRequest,
  UpdateWithdrawLinkRequest,
  WithdrawLinkWithLnurl,
  LnurlWithdrawResponse,
  LnurlErrorResponse,
  LnurlSuccessResponse,
  LnurlCallbackParams
} from '../types.js'
import {
  generateId,
  generateK1,
  generateUniqueHash,
  generateUseHash,
  verifyUseHash,
  encodeLnurl,
  buildLnurlUrl,
  buildUniqueLnurlUrl,
  buildCallbackUrl,
  satsToMsats
} from '../utils/lnurl.js'

/**
 * Database row types
 */
interface WithdrawLinkRow {
  id: string
  application_id: string
  title: string
  description: string | null
  min_withdrawable: number
  max_withdrawable: number
  uses: number
  used: number
  wait_time: number
  unique_hash: string
  k1: string
  is_unique: number
  uses_csv: string
  open_time: number
  creator_pubkey: string | null
  webhook_url: string | null
  webhook_headers: string | null
  webhook_body: string | null
  created_at: number
  updated_at: number
}

interface WithdrawalRow {
  id: string
  link_id: string
  application_id: string
  payment_hash: string
  amount_sats: number
  fee_sats: number
  recipient_node: string | null
  webhook_success: number | null
  webhook_response: string | null
  created_at: number
}

/**
 * Convert row to WithdrawLink
 */
function rowToLink(row: WithdrawLinkRow): WithdrawLink {
  return {
    id: row.id,
    application_id: row.application_id,
    title: row.title,
    description: row.description || undefined,
    min_withdrawable: row.min_withdrawable,
    max_withdrawable: row.max_withdrawable,
    uses: row.uses,
    used: row.used,
    wait_time: row.wait_time,
    unique_hash: row.unique_hash,
    k1: row.k1,
    is_unique: row.is_unique === 1,
    uses_csv: row.uses_csv,
    open_time: row.open_time,
    creator_pubkey: row.creator_pubkey || undefined,
    webhook_url: row.webhook_url || undefined,
    webhook_headers: row.webhook_headers || undefined,
    webhook_body: row.webhook_body || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

/**
 * Convert row to Withdrawal
 */
function rowToWithdrawal(row: WithdrawalRow): Withdrawal {
  return {
    id: row.id,
    link_id: row.link_id,
    application_id: row.application_id,
    payment_hash: row.payment_hash,
    amount_sats: row.amount_sats,
    fee_sats: row.fee_sats,
    recipient_node: row.recipient_node || undefined,
    webhook_success: row.webhook_success === null ? undefined : row.webhook_success === 1,
    webhook_response: row.webhook_response || undefined,
    created_at: row.created_at
  }
}

/**
 * WithdrawManager - Handles withdraw link operations
 */
export class WithdrawManager {
  private baseUrl: string = ''

  constructor(
    private db: ExtensionDatabase,
    private ctx: ExtensionContext
  ) {}

  /**
   * Set the base URL for LNURL generation
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, '')
  }

  /**
   * Add LNURL to a withdraw link
   */
  private addLnurl(link: WithdrawLink): WithdrawLinkWithLnurl {
    const lnurlUrl = buildLnurlUrl(this.baseUrl, link.unique_hash)
    return {
      ...link,
      lnurl: encodeLnurl(lnurlUrl),
      lnurl_url: lnurlUrl
    }
  }

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  /**
   * Create a new withdraw link
   */
  async create(applicationId: string, req: CreateWithdrawLinkRequest, creatorPubkey?: string): Promise<WithdrawLinkWithLnurl> {
    // Validation
    if (req.uses < 1 || req.uses > 250) {
      throw new Error('Uses must be between 1 and 250')
    }
    if (req.min_withdrawable < 1) {
      throw new Error('Min withdrawable must be at least 1 sat')
    }
    if (req.max_withdrawable < req.min_withdrawable) {
      throw new Error('Max withdrawable must be >= min withdrawable')
    }
    if (req.wait_time < 0) {
      throw new Error('Wait time cannot be negative')
    }

    // Validate webhook JSON if provided
    if (req.webhook_headers) {
      try {
        JSON.parse(req.webhook_headers)
      } catch {
        throw new Error('webhook_headers must be valid JSON')
      }
    }
    if (req.webhook_body) {
      try {
        JSON.parse(req.webhook_body)
      } catch {
        throw new Error('webhook_body must be valid JSON')
      }
    }

    const now = Math.floor(Date.now() / 1000)
    const id = generateId()
    const usesCsv = Array.from({ length: req.uses }, (_, i) => String(i)).join(',')

    const link: WithdrawLink = {
      id,
      application_id: applicationId,
      title: req.title.trim(),
      description: req.description?.trim(),
      min_withdrawable: req.min_withdrawable,
      max_withdrawable: req.max_withdrawable,
      uses: req.uses,
      used: 0,
      wait_time: req.wait_time,
      unique_hash: generateUniqueHash(),
      k1: generateK1(),
      is_unique: req.is_unique || false,
      uses_csv: usesCsv,
      open_time: now,
      creator_pubkey: creatorPubkey,
      webhook_url: req.webhook_url,
      webhook_headers: req.webhook_headers,
      webhook_body: req.webhook_body,
      created_at: now,
      updated_at: now
    }

    await this.db.execute(
      `INSERT INTO withdraw_links (
        id, application_id, title, description,
        min_withdrawable, max_withdrawable, uses, used, wait_time,
        unique_hash, k1, is_unique, uses_csv, open_time,
        creator_pubkey,
        webhook_url, webhook_headers, webhook_body,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        link.id, link.application_id, link.title, link.description || null,
        link.min_withdrawable, link.max_withdrawable, link.uses, link.used, link.wait_time,
        link.unique_hash, link.k1, link.is_unique ? 1 : 0, link.uses_csv, link.open_time,
        link.creator_pubkey || null,
        link.webhook_url || null, link.webhook_headers || null, link.webhook_body || null,
        link.created_at, link.updated_at
      ]
    )

    return this.addLnurl(link)
  }

  /**
   * Create multiple vouchers (single-use withdraw links)
   */
  async createVouchers(
    applicationId: string,
    title: string,
    amount: number,
    count: number,
    description?: string
  ): Promise<WithdrawLinkWithLnurl[]> {
    if (count < 1 || count > 100) {
      throw new Error('Count must be between 1 and 100')
    }
    if (amount < 1) {
      throw new Error('Amount must be at least 1 sat')
    }

    const vouchers: WithdrawLinkWithLnurl[] = []

    for (let i = 0; i < count; i++) {
      const voucher = await this.create(applicationId, {
        title: `${title} #${i + 1}`,
        description,
        min_withdrawable: amount,
        max_withdrawable: amount,
        uses: 1,
        wait_time: 0,
        is_unique: false
      })
      vouchers.push(voucher)
    }

    return vouchers
  }

  /**
   * Get a withdraw link by ID
   */
  async get(id: string, applicationId: string): Promise<WithdrawLinkWithLnurl | null> {
    const rows = await this.db.query<WithdrawLinkRow>(
      'SELECT * FROM withdraw_links WHERE id = ? AND application_id = ?',
      [id, applicationId]
    )

    if (rows.length === 0) return null
    return this.addLnurl(rowToLink(rows[0]))
  }

  /**
   * Get a withdraw link by unique hash (for LNURL)
   */
  async getByHash(uniqueHash: string): Promise<WithdrawLink | null> {
    const rows = await this.db.query<WithdrawLinkRow>(
      'SELECT * FROM withdraw_links WHERE unique_hash = ?',
      [uniqueHash]
    )

    if (rows.length === 0) return null
    return rowToLink(rows[0])
  }

  /**
   * List withdraw links for an application
   */
  async list(
    applicationId: string,
    includeSpent: boolean = false,
    limit?: number,
    offset?: number
  ): Promise<WithdrawLinkWithLnurl[]> {
    let sql = 'SELECT * FROM withdraw_links WHERE application_id = ?'
    const params: any[] = [applicationId]

    if (!includeSpent) {
      sql += ' AND used < uses'
    }

    sql += ' ORDER BY created_at DESC'

    if (limit) {
      sql += ' LIMIT ?'
      params.push(limit)
      if (offset) {
        sql += ' OFFSET ?'
        params.push(offset)
      }
    }

    const rows = await this.db.query<WithdrawLinkRow>(sql, params)
    return rows.map(row => this.addLnurl(rowToLink(row)))
  }

  /**
   * Update a withdraw link
   */
  async update(
    id: string,
    applicationId: string,
    req: UpdateWithdrawLinkRequest
  ): Promise<WithdrawLinkWithLnurl | null> {
    const existing = await this.get(id, applicationId)
    if (!existing) return null

    // Validation
    if (req.uses !== undefined) {
      if (req.uses < 1 || req.uses > 250) {
        throw new Error('Uses must be between 1 and 250')
      }
      if (req.uses < existing.used) {
        throw new Error('Cannot reduce uses below current used count')
      }
    }

    const minWith = req.min_withdrawable ?? existing.min_withdrawable
    const maxWith = req.max_withdrawable ?? existing.max_withdrawable

    if (minWith < 1) {
      throw new Error('Min withdrawable must be at least 1 sat')
    }
    if (maxWith < minWith) {
      throw new Error('Max withdrawable must be >= min withdrawable')
    }

    // Handle uses change
    let usesCsv = existing.uses_csv
    const newUses = req.uses ?? existing.uses
    if (newUses !== existing.uses) {
      const currentUses = usesCsv.split(',').filter(u => u !== '')
      if (newUses > existing.uses) {
        // Add more uses
        const lastNum = currentUses.length > 0 ? parseInt(currentUses[currentUses.length - 1], 10) : -1
        for (let i = lastNum + 1; currentUses.length < (newUses - existing.used); i++) {
          currentUses.push(String(i))
        }
      } else {
        // Remove uses (keep first N)
        usesCsv = currentUses.slice(0, newUses - existing.used).join(',')
      }
      usesCsv = currentUses.join(',')
    }

    const now = Math.floor(Date.now() / 1000)

    await this.db.execute(
      `UPDATE withdraw_links SET
        title = ?, description = ?,
        min_withdrawable = ?, max_withdrawable = ?,
        uses = ?, wait_time = ?, is_unique = ?, uses_csv = ?,
        webhook_url = ?, webhook_headers = ?, webhook_body = ?,
        updated_at = ?
      WHERE id = ? AND application_id = ?`,
      [
        req.title ?? existing.title,
        req.description ?? existing.description ?? null,
        minWith, maxWith,
        newUses,
        req.wait_time ?? existing.wait_time,
        (req.is_unique ?? existing.is_unique) ? 1 : 0,
        usesCsv,
        req.webhook_url ?? existing.webhook_url ?? null,
        req.webhook_headers ?? existing.webhook_headers ?? null,
        req.webhook_body ?? existing.webhook_body ?? null,
        now,
        id, applicationId
      ]
    )

    return this.get(id, applicationId)
  }

  /**
   * Delete a withdraw link
   */
  async delete(id: string, applicationId: string): Promise<boolean> {
    const result = await this.db.execute(
      'DELETE FROM withdraw_links WHERE id = ? AND application_id = ?',
      [id, applicationId]
    )
    return (result.changes || 0) > 0
  }

  // =========================================================================
  // LNURL Protocol Handlers
  // =========================================================================

  /**
   * Handle initial LNURL request (user scans QR)
   * Returns withdraw parameters
   */
  async handleLnurlRequest(
    uniqueHash: string,
    idUniqueHash?: string
  ): Promise<LnurlWithdrawResponse | LnurlErrorResponse> {
    const link = await this.getByHash(uniqueHash)

    if (!link) {
      return { status: 'ERROR', reason: 'Withdraw link does not exist.' }
    }

    if (link.used >= link.uses) {
      return { status: 'ERROR', reason: 'Withdraw link is spent.' }
    }

    // For unique links, require id_unique_hash
    if (link.is_unique && !idUniqueHash) {
      return { status: 'ERROR', reason: 'This link requires a unique hash.' }
    }

    // Verify unique hash if provided
    if (idUniqueHash) {
      const useNumber = verifyUseHash(link.id, link.unique_hash, link.uses_csv, idUniqueHash)
      if (!useNumber) {
        return { status: 'ERROR', reason: 'Invalid unique hash.' }
      }
    }

    const callbackUrl = buildCallbackUrl(this.baseUrl, link.unique_hash)

    return {
      tag: 'withdrawRequest',
      callback: idUniqueHash ? `${callbackUrl}?id_unique_hash=${idUniqueHash}` : callbackUrl,
      k1: link.k1,
      minWithdrawable: satsToMsats(link.min_withdrawable),
      maxWithdrawable: satsToMsats(link.max_withdrawable),
      defaultDescription: link.title
    }
  }

  /**
   * Handle LNURL callback (user submits invoice)
   * Pays the invoice and records the withdrawal
   */
  async handleLnurlCallback(
    uniqueHash: string,
    params: LnurlCallbackParams
  ): Promise<LnurlSuccessResponse | LnurlErrorResponse> {
    const link = await this.getByHash(uniqueHash)

    if (!link) {
      return { status: 'ERROR', reason: 'Withdraw link not found.' }
    }

    if (link.used >= link.uses) {
      return { status: 'ERROR', reason: 'Withdraw link is spent.' }
    }

    if (link.k1 !== params.k1) {
      return { status: 'ERROR', reason: 'Invalid k1.' }
    }

    // Check wait time
    const now = Math.floor(Date.now() / 1000)
    if (now < link.open_time) {
      const waitSecs = link.open_time - now
      return { status: 'ERROR', reason: `Please wait ${waitSecs} seconds.` }
    }

    // For unique links, verify and consume the use hash
    if (params.id_unique_hash) {
      const useNumber = verifyUseHash(link.id, link.unique_hash, link.uses_csv, params.id_unique_hash)
      if (!useNumber) {
        return { status: 'ERROR', reason: 'Invalid unique hash.' }
      }
    } else if (link.is_unique) {
      return { status: 'ERROR', reason: 'Unique hash required.' }
    }

    // Prevent double-spending with hash check
    try {
      await this.createHashCheck(params.id_unique_hash || uniqueHash, params.k1)
    } catch {
      return { status: 'ERROR', reason: 'Withdrawal already in progress.' }
    }

    try {
      // Pay the invoice from the creator's balance (if created via Nostr RPC)
      const payment = await this.ctx.payInvoice(
        link.application_id,
        params.pr,
        link.max_withdrawable,
        link.creator_pubkey
      )

      // Record the withdrawal
      await this.recordWithdrawal(link, payment.paymentHash, link.max_withdrawable, payment.feeSats)

      // Increment usage
      await this.incrementUsage(link, params.id_unique_hash)

      // Clean up hash check
      await this.deleteHashCheck(params.id_unique_hash || uniqueHash)

      // Dispatch webhook if configured
      if (link.webhook_url) {
        this.dispatchWebhook(link, payment.paymentHash, params.pr).catch(err => {
          console.error('[Withdraw] Webhook error:', err)
        })
      }

      return { status: 'OK' }
    } catch (err: any) {
      // Clean up hash check on failure
      await this.deleteHashCheck(params.id_unique_hash || uniqueHash)
      return { status: 'ERROR', reason: `Payment failed: ${err.message}` }
    }
  }

  // =========================================================================
  // Helper Methods
  // =========================================================================

  /**
   * Increment link usage and update open_time
   */
  private async incrementUsage(link: WithdrawLink, idUniqueHash?: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    let usesCsv = link.uses_csv

    // Remove used hash from uses_csv if unique
    if (idUniqueHash) {
      const uses = usesCsv.split(',').filter(u => {
        const hash = generateUseHash(link.id, link.unique_hash, u.trim())
        return hash !== idUniqueHash
      })
      usesCsv = uses.join(',')
    }

    await this.db.execute(
      `UPDATE withdraw_links SET
        used = used + 1,
        open_time = ?,
        uses_csv = ?,
        updated_at = ?
      WHERE id = ?`,
      [now + link.wait_time, usesCsv, now, link.id]
    )
  }

  /**
   * Record a successful withdrawal
   */
  private async recordWithdrawal(
    link: WithdrawLink,
    paymentHash: string,
    amountSats: number,
    feeSats: number
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000)

    await this.db.execute(
      `INSERT INTO withdrawals (
        id, link_id, application_id,
        payment_hash, amount_sats, fee_sats,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generateId(),
        link.id,
        link.application_id,
        paymentHash,
        amountSats,
        feeSats,
        now
      ]
    )
  }

  /**
   * Create hash check to prevent double-spending
   */
  private async createHashCheck(hash: string, k1: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    await this.db.execute(
      'INSERT INTO hash_checks (hash, k1, created_at) VALUES (?, ?, ?)',
      [hash, k1, now]
    )
  }

  /**
   * Delete hash check after completion
   */
  private async deleteHashCheck(hash: string): Promise<void> {
    await this.db.execute('DELETE FROM hash_checks WHERE hash = ?', [hash])
  }

  /**
   * List withdrawals
   */
  async listWithdrawals(
    applicationId: string,
    linkId?: string,
    limit?: number,
    offset?: number
  ): Promise<Withdrawal[]> {
    let sql = 'SELECT * FROM withdrawals WHERE application_id = ?'
    const params: any[] = [applicationId]

    if (linkId) {
      sql += ' AND link_id = ?'
      params.push(linkId)
    }

    sql += ' ORDER BY created_at DESC'

    if (limit) {
      sql += ' LIMIT ?'
      params.push(limit)
      if (offset) {
        sql += ' OFFSET ?'
        params.push(offset)
      }
    }

    const rows = await this.db.query<WithdrawalRow>(sql, params)
    return rows.map(rowToWithdrawal)
  }

  /**
   * Get withdrawal stats for a link
   */
  async getWithdrawalStats(linkId: string): Promise<{ total_sats: number; count: number }> {
    const result = await this.db.query<{ total: number; count: number }>(
      `SELECT COALESCE(SUM(amount_sats), 0) as total, COUNT(*) as count
       FROM withdrawals WHERE link_id = ?`,
      [linkId]
    )
    return {
      total_sats: result[0]?.total || 0,
      count: result[0]?.count || 0
    }
  }

  /**
   * Dispatch webhook notification
   */
  private async dispatchWebhook(
    link: WithdrawLink,
    paymentHash: string,
    paymentRequest: string
  ): Promise<void> {
    if (!link.webhook_url) return

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (link.webhook_headers) {
        Object.assign(headers, JSON.parse(link.webhook_headers))
      }

      const body = {
        payment_hash: paymentHash,
        payment_request: paymentRequest,
        lnurlw: link.id,
        body: link.webhook_body ? JSON.parse(link.webhook_body) : {}
      }

      const response = await fetch(link.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      // Update withdrawal record with webhook result
      await this.db.execute(
        `UPDATE withdrawals SET
          webhook_success = ?,
          webhook_response = ?
        WHERE payment_hash = ?`,
        [response.ok ? 1 : 0, await response.text(), paymentHash]
      )
    } catch (err: any) {
      await this.db.execute(
        `UPDATE withdrawals SET
          webhook_success = 0,
          webhook_response = ?
        WHERE payment_hash = ?`,
        [err.message, paymentHash]
      )
    }
  }
}
