import path from 'path'
import fs from 'fs'
import {
  Extension,
  ExtensionInfo,
  ExtensionModule,
  LoadedExtension,
  ExtensionLoaderConfig,
  RpcMethodHandler,
  PaymentReceivedData,
  NostrEvent
} from './types.js'
import { ExtensionDatabaseImpl, createExtensionDatabase } from './database.js'
import { ExtensionContextImpl, createExtensionContext, MainHandlerInterface } from './context.js'

/**
 * Registered RPC method entry
 */
interface RegisteredMethod {
  extensionId: string
  handler: RpcMethodHandler
}

/**
 * Extension Loader
 *
 * Discovers, loads, and manages Lightning.Pub extensions.
 * Provides lifecycle management and event dispatching.
 */
export class ExtensionLoader {
  private config: ExtensionLoaderConfig
  private mainHandler: MainHandlerInterface
  private extensions: Map<string, LoadedExtension> = new Map()
  private contexts: Map<string, ExtensionContextImpl> = new Map()
  private methodRegistry: Map<string, RegisteredMethod> = new Map()
  private initialized = false

  constructor(config: ExtensionLoaderConfig, mainHandler: MainHandlerInterface) {
    this.config = config
    this.mainHandler = mainHandler
  }

  /**
   * Discover and load all extensions
   */
  async loadAll(): Promise<void> {
    if (this.initialized) {
      throw new Error('Extension loader already initialized')
    }

    console.log('[Extensions] Loading extensions from:', this.config.extensionsDir)

    // Ensure directories exist
    if (!fs.existsSync(this.config.extensionsDir)) {
      console.log('[Extensions] Extensions directory does not exist, creating...')
      fs.mkdirSync(this.config.extensionsDir, { recursive: true })
      this.initialized = true
      return
    }

    if (!fs.existsSync(this.config.databaseDir)) {
      fs.mkdirSync(this.config.databaseDir, { recursive: true })
    }

    // Discover extensions
    const extensionDirs = await this.discoverExtensions()
    console.log(`[Extensions] Found ${extensionDirs.length} extension(s)`)

    // Load extensions in dependency order
    const loadOrder = await this.resolveDependencies(extensionDirs)

    for (const extDir of loadOrder) {
      try {
        await this.loadExtension(extDir)
      } catch (e) {
        console.error(`[Extensions] Failed to load extension from ${extDir}:`, e)
      }
    }

    this.initialized = true
    console.log(`[Extensions] Loaded ${this.extensions.size} extension(s)`)
  }

  /**
   * Discover extension directories
   */
  private async discoverExtensions(): Promise<string[]> {
    const entries = fs.readdirSync(this.config.extensionsDir, { withFileTypes: true })
    const extensionDirs: string[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const extDir = path.join(this.config.extensionsDir, entry.name)
      const indexPath = path.join(extDir, 'index.ts')
      const indexJsPath = path.join(extDir, 'index.js')

      // Check for index file
      if (fs.existsSync(indexPath) || fs.existsSync(indexJsPath)) {
        // Check enabled/disabled lists
        if (this.config.disabledExtensions?.includes(entry.name)) {
          console.log(`[Extensions] Skipping disabled extension: ${entry.name}`)
          continue
        }

        if (this.config.enabledExtensions &&
            !this.config.enabledExtensions.includes(entry.name)) {
          console.log(`[Extensions] Skipping non-enabled extension: ${entry.name}`)
          continue
        }

        extensionDirs.push(extDir)
      }
    }

    return extensionDirs
  }

  /**
   * Resolve extension dependencies and return load order
   */
  private async resolveDependencies(extensionDirs: string[]): Promise<string[]> {
    // For now, simple alphabetical order
    // TODO: Implement proper dependency resolution with topological sort
    return extensionDirs.sort()
  }

  /**
   * Load a single extension
   */
  private async loadExtension(extensionDir: string): Promise<void> {
    const dirName = path.basename(extensionDir)
    console.log(`[Extensions] Loading extension: ${dirName}`)

    // Determine index file path
    let indexPath = path.join(extensionDir, 'index.js')
    if (!fs.existsSync(indexPath)) {
      indexPath = path.join(extensionDir, 'index.ts')
    }

    // Dynamic import
    const moduleUrl = `file://${indexPath}`
    const module = await import(moduleUrl) as ExtensionModule

    if (!module.default) {
      throw new Error(`Extension ${dirName} has no default export`)
    }

    // Instantiate extension
    const ExtensionClass = module.default
    const instance = new ExtensionClass() as Extension

    if (!instance.info) {
      throw new Error(`Extension ${dirName} has no info property`)
    }

    const info = instance.info

    // Validate extension ID matches directory name
    if (info.id !== dirName) {
      console.warn(
        `[Extensions] Extension ID '${info.id}' doesn't match directory '${dirName}'`
      )
    }

    // Check for duplicate
    if (this.extensions.has(info.id)) {
      throw new Error(`Extension ${info.id} already loaded`)
    }

    // Create isolated database
    const database = createExtensionDatabase(info.id, this.config.databaseDir)

    // Create context
    const context = createExtensionContext(
      info,
      database,
      this.mainHandler,
      this.methodRegistry
    )

    // Track as loading
    const loaded: LoadedExtension = {
      info,
      instance,
      database,
      status: 'loading',
      loadedAt: Date.now()
    }
    this.extensions.set(info.id, loaded)
    this.contexts.set(info.id, context)

    try {
      // Initialize extension
      await instance.initialize(context, database)

      loaded.status = 'ready'
      console.log(`[Extensions] Extension ${info.id} v${info.version} loaded successfully`)
    } catch (e) {
      loaded.status = 'error'
      loaded.error = e as Error
      console.error(`[Extensions] Extension ${info.id} initialization failed:`, e)
      throw e
    }
  }

  /**
   * Unload a specific extension
   */
  async unloadExtension(extensionId: string): Promise<void> {
    const loaded = this.extensions.get(extensionId)
    if (!loaded) {
      throw new Error(`Extension ${extensionId} not found`)
    }

    console.log(`[Extensions] Unloading extension: ${extensionId}`)

    try {
      // Call shutdown if available
      if (loaded.instance.shutdown) {
        await loaded.instance.shutdown()
      }

      loaded.status = 'stopped'
    } catch (e) {
      console.error(`[Extensions] Error during ${extensionId} shutdown:`, e)
    }

    // Close database
    if (loaded.database instanceof ExtensionDatabaseImpl) {
      loaded.database.close()
    }

    // Remove registered methods
    for (const [name, method] of this.methodRegistry.entries()) {
      if (method.extensionId === extensionId) {
        this.methodRegistry.delete(name)
      }
    }

    // Remove from maps
    this.extensions.delete(extensionId)
    this.contexts.delete(extensionId)
  }

  /**
   * Shutdown all extensions
   */
  async shutdown(): Promise<void> {
    console.log('[Extensions] Shutting down all extensions...')

    for (const extensionId of this.extensions.keys()) {
      try {
        await this.unloadExtension(extensionId)
      } catch (e) {
        console.error(`[Extensions] Error unloading ${extensionId}:`, e)
      }
    }

    console.log('[Extensions] All extensions shut down')
  }

  /**
   * Get a loaded extension
   */
  getExtension(extensionId: string): LoadedExtension | undefined {
    return this.extensions.get(extensionId)
  }

  /**
   * Get all loaded extensions
   */
  getAllExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values())
  }

  /**
   * Check if an extension is loaded and ready
   */
  isReady(extensionId: string): boolean {
    const ext = this.extensions.get(extensionId)
    return ext?.status === 'ready'
  }

  /**
   * Get all registered RPC methods
   */
  getRegisteredMethods(): Map<string, RegisteredMethod> {
    return this.methodRegistry
  }

  /**
   * Call an extension RPC method
   */
  async callMethod(
    methodName: string,
    request: any,
    applicationId: string,
    userPubkey?: string
  ): Promise<any> {
    const method = this.methodRegistry.get(methodName)
    if (!method) {
      throw new Error(`Unknown method: ${methodName}`)
    }

    const ext = this.extensions.get(method.extensionId)
    if (!ext || ext.status !== 'ready') {
      throw new Error(`Extension ${method.extensionId} not ready`)
    }

    return method.handler(request, applicationId, userPubkey)
  }

  /**
   * Check if a method exists
   */
  hasMethod(methodName: string): boolean {
    return this.methodRegistry.has(methodName)
  }

  /**
   * Dispatch payment received event to all extensions
   */
  async dispatchPaymentReceived(payment: PaymentReceivedData): Promise<void> {
    for (const context of this.contexts.values()) {
      try {
        await context.dispatchPaymentReceived(payment)
      } catch (e) {
        console.error('[Extensions] Error dispatching payment:', e)
      }
    }
  }

  /**
   * Dispatch Nostr event to all extensions
   */
  async dispatchNostrEvent(event: NostrEvent, applicationId: string): Promise<void> {
    for (const context of this.contexts.values()) {
      try {
        await context.dispatchNostrEvent(event, applicationId)
      } catch (e) {
        console.error('[Extensions] Error dispatching Nostr event:', e)
      }
    }
  }

  /**
   * Run health checks on all extensions
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()

    for (const [id, ext] of this.extensions.entries()) {
      if (ext.status !== 'ready') {
        results.set(id, false)
        continue
      }

      try {
        if (ext.instance.healthCheck) {
          results.set(id, await ext.instance.healthCheck())
        } else {
          results.set(id, true)
        }
      } catch (e) {
        results.set(id, false)
      }
    }

    return results
  }

  /**
   * Get extension status summary
   */
  getStatus(): {
    total: number
    ready: number
    error: number
    extensions: Array<{ id: string; name: string; version: string; status: string }>
  } {
    const extensions = this.getAllExtensions().map(ext => ({
      id: ext.info.id,
      name: ext.info.name,
      version: ext.info.version,
      status: ext.status
    }))

    return {
      total: extensions.length,
      ready: extensions.filter(e => e.status === 'ready').length,
      error: extensions.filter(e => e.status === 'error').length,
      extensions
    }
  }
}

/**
 * Create an extension loader instance
 */
export function createExtensionLoader(
  config: ExtensionLoaderConfig,
  mainHandler: MainHandlerInterface
): ExtensionLoader {
  return new ExtensionLoader(config, mainHandler)
}
