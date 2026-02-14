/**
 * MainHandler Adapter for Extension System
 *
 * Wraps the Lightning.Pub mainHandler to provide the MainHandlerInterface
 * required by the extension system.
 */

import { MainHandlerInterface } from './context.js'
import { LnurlPayInfo } from './types.js'
import type Main from '../services/main/index.js'

/**
 * Create an adapter that wraps mainHandler for extension use
 */
export function createMainHandlerAdapter(mainHandler: Main): MainHandlerInterface {
  return {
    applicationManager: {
      async getById(id: string) {
        // The applicationManager stores apps internally
        // We need to access it through the storage layer
        try {
          const app = await mainHandler.storage.applicationStorage.GetApplication(id)
          if (!app) return null

          return {
            id: app.app_id,
            name: app.name,
            nostr_public: app.nostr_public_key || '',
            balance: app.owner?.balance_sats || 0
          }
        } catch (e) {
          // GetApplication throws if not found
          return null
        }
      }
    },

    paymentManager: {
      async createInvoice(params: {
        applicationId: string
        amountSats: number
        memo?: string
        expiry?: number
        metadata?: Record<string, any>
      }) {
        // Get the app to find the user ID
        const app = await mainHandler.storage.applicationStorage.GetApplication(params.applicationId)
        if (!app) {
          throw new Error(`Application not found: ${params.applicationId}`)
        }

        // Create invoice using the app owner's user ID
        const result = await mainHandler.paymentManager.NewInvoice(
          app.owner.user_id,
          {
            amountSats: params.amountSats,
            memo: params.memo || ''
          },
          {
            expiry: params.expiry || 3600
          }
        )

        return {
          id: result.invoice.split(':')[0] || result.invoice, // Extract ID if present
          paymentRequest: result.invoice,
          paymentHash: '', // Not directly available from NewInvoice response
          expiry: Date.now() + (params.expiry || 3600) * 1000
        }
      },

      async payInvoice(params: {
        applicationId: string
        paymentRequest: string
        maxFeeSats?: number
      }) {
        // Get the app to find the user ID and app reference
        const app = await mainHandler.storage.applicationStorage.GetApplication(params.applicationId)
        if (!app) {
          throw new Error(`Application not found: ${params.applicationId}`)
        }

        // Pay invoice from the app's balance
        const result = await mainHandler.paymentManager.PayInvoice(
          app.owner.user_id,
          {
            invoice: params.paymentRequest,
            amount: 0 // Use invoice amount
          },
          app, // linkedApplication
          {}
        )

        return {
          paymentHash: result.preimage || '', // preimage serves as proof of payment
          feeSats: result.network_fee || 0
        }
      },

      async getLnurlPayInfoByPubkey(pubkeyHex: string, options?: {
        metadata?: string
        description?: string
      }): Promise<LnurlPayInfo> {
        // This would need implementation based on how Lightning.Pub handles LNURL-pay
        // For now, throw not implemented
        throw new Error('getLnurlPayInfoByPubkey not yet implemented')
      }
    },

    async sendNostrEvent(event: any): Promise<string | null> {
      // The mainHandler doesn't directly expose nostrSend
      // This would need to be implemented through the nostrMiddleware
      // For now, return null (not implemented)
      console.warn('[MainHandlerAdapter] sendNostrEvent not fully implemented')
      return null
    },

    async sendEncryptedDM(
      applicationId: string,
      recipientPubkey: string,
      content: string
    ): Promise<string> {
      // This would need implementation using NIP-44 encryption
      // For now, throw not implemented
      throw new Error('sendEncryptedDM not yet implemented')
    }
  }
}
