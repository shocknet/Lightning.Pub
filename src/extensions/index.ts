/**
 * Lightning.Pub Extension System
 *
 * This module provides the extension infrastructure for Lightning.Pub.
 * Extensions can add functionality like marketplaces, subscriptions,
 * tipping, and more.
 *
 * Usage:
 *
 * ```typescript
 * import { createExtensionLoader, ExtensionLoaderConfig } from './extensions'
 *
 * const config: ExtensionLoaderConfig = {
 *   extensionsDir: './extensions',
 *   databaseDir: './data/extensions'
 * }
 *
 * const loader = createExtensionLoader(config, mainHandler)
 * await loader.loadAll()
 *
 * // Call extension methods
 * const result = await loader.callMethod(
 *   'marketplace.createStall',
 *   { name: 'My Shop', currency: 'sat', shipping_zones: [...] },
 *   applicationId
 * )
 * ```
 */

// Export types
export {
  Extension,
  ExtensionInfo,
  ExtensionContext,
  ExtensionDatabase,
  ExtensionModule,
  ExtensionConstructor,
  LoadedExtension,
  ExtensionLoaderConfig,
  ApplicationInfo,
  CreateInvoiceOptions,
  CreatedInvoice,
  PaymentReceivedData,
  NostrEvent,
  UnsignedNostrEvent,
  RpcMethodHandler
} from './types.js'

// Export loader
export { ExtensionLoader, createExtensionLoader } from './loader.js'

// Export database utilities
export { ExtensionDatabaseImpl, createExtensionDatabase } from './database.js'

// Export context utilities
export { ExtensionContextImpl, createExtensionContext, MainHandlerInterface } from './context.js'
