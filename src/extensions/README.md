# Lightning.Pub Extension System

A modular extension system that allows third-party functionality to be added to Lightning.Pub without modifying core code.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Creating an Extension](#creating-an-extension)
- [Extension Lifecycle](#extension-lifecycle)
- [ExtensionContext API](#extensioncontext-api)
- [Database Isolation](#database-isolation)
- [RPC Methods](#rpc-methods)
- [HTTP Routes](#http-routes)
- [Event Handling](#event-handling)
- [Configuration](#configuration)
- [Examples](#examples)

---

## Overview

The extension system provides:

- **Modularity**: Extensions are self-contained modules with their own code and data
- **Isolation**: Each extension gets its own SQLite database
- **Integration**: Extensions can register RPC methods, handle events, and interact with Lightning.Pub's payment and Nostr systems
- **Lifecycle Management**: Automatic discovery, loading, and graceful shutdown

### Built-in Extensions

| Extension | Description |
|-----------|-------------|
| `marketplace` | NIP-15 Nostr marketplace for selling products via Lightning |
| `withdraw` | LNURL-withdraw (LUD-03) for vouchers, faucets, and gifts |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Lightning.Pub                             │
├─────────────────────────────────────────────────────────────────┤
│                      Extension Loader                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Extension A │  │ Extension B │  │ Extension C │   ...        │
│  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │              │
│  │  │Context│  │  │  │Context│  │  │  │Context│  │              │
│  │  └───────┘  │  │  └───────┘  │  │  └───────┘  │              │
│  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │              │
│  │  │  DB   │  │  │  │  DB   │  │  │  │  DB   │  │              │
│  │  └───────┘  │  │  └───────┘  │  │  └───────┘  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│  Payment Manager  │  Nostr Transport  │  Application Manager    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Description |
|-----------|------|-------------|
| `ExtensionLoader` | `loader.ts` | Discovers, loads, and manages extensions |
| `ExtensionContext` | `context.ts` | Bridge between extensions and Lightning.Pub |
| `ExtensionDatabase` | `database.ts` | Isolated SQLite database per extension |

---

## Creating an Extension

### Directory Structure

```
src/extensions/
└── my-extension/
    ├── index.ts           # Main entry point (required)
    ├── types.ts           # TypeScript interfaces
    ├── migrations.ts      # Database migrations
    └── managers/          # Business logic
        └── myManager.ts
```

### Minimal Extension

```typescript
// src/extensions/my-extension/index.ts

import { Extension, ExtensionInfo, ExtensionContext, ExtensionDatabase } from '../types.js'

export default class MyExtension implements Extension {
  readonly info: ExtensionInfo = {
    id: 'my-extension',        // Must match directory name
    name: 'My Extension',
    version: '1.0.0',
    description: 'Does something useful',
    author: 'Your Name',
    minPubVersion: '1.0.0'     // Minimum Lightning.Pub version
  }

  async initialize(ctx: ExtensionContext, db: ExtensionDatabase): Promise<void> {
    // Run migrations
    await db.execute(`
      CREATE TABLE IF NOT EXISTS my_table (
        id TEXT PRIMARY KEY,
        data TEXT
      )
    `)

    // Register RPC methods
    ctx.registerMethod('my-extension.doSomething', async (req, appId) => {
      return { result: 'done' }
    })

    ctx.log('info', 'Extension initialized')
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
  }
}
```

### Extension Interface

```typescript
interface Extension {
  // Required: Extension metadata
  readonly info: ExtensionInfo

  // Required: Called once when extension is loaded
  initialize(ctx: ExtensionContext, db: ExtensionDatabase): Promise<void>

  // Optional: Called when Lightning.Pub shuts down
  shutdown?(): Promise<void>

  // Optional: Health check for monitoring
  healthCheck?(): Promise<boolean>
}

interface ExtensionInfo {
  id: string              // Unique identifier (lowercase, no spaces)
  name: string            // Display name
  version: string         // Semver version
  description: string     // Short description
  author: string          // Author name
  minPubVersion?: string  // Minimum Lightning.Pub version
  dependencies?: string[] // Other extension IDs required
}
```

---

## Extension Lifecycle

```
┌──────────────┐
│   Discover   │  Scan extensions directory for index.ts files
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Load      │  Import module, instantiate class
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Initialize  │  Create database, call initialize()
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    Ready     │  Extension is active, handling requests
└──────┬───────┘
       │
       ▼ (on shutdown)
┌──────────────┐
│   Shutdown   │  Call shutdown(), close database
└──────────────┘
```

### States

| State | Description |
|-------|-------------|
| `loading` | Extension is being loaded |
| `ready` | Extension is active and healthy |
| `error` | Initialization failed |
| `stopped` | Extension has been shut down |

---

## ExtensionContext API

The `ExtensionContext` is passed to your extension during initialization. It provides access to Lightning.Pub functionality.

### Application Management

```typescript
// Get information about an application
const app = await ctx.getApplication(applicationId)
// Returns: { id, name, nostr_public, balance_sats } | null
```

### Payment Operations

```typescript
// Create a Lightning invoice
const invoice = await ctx.createInvoice(amountSats, {
  memo: 'Payment for service',
  expiry: 3600,  // seconds
  metadata: { order_id: '123' }  // Returned in payment callback
})
// Returns: { id, paymentRequest, paymentHash, expiry }

// Pay a Lightning invoice
const result = await ctx.payInvoice(applicationId, bolt11Invoice, maxFeeSats)
// Returns: { paymentHash, feeSats }
```

### Nostr Operations

```typescript
// Send encrypted DM (NIP-44)
const eventId = await ctx.sendEncryptedDM(applicationId, recipientPubkey, content)

// Publish a Nostr event (signed by application's key)
const eventId = await ctx.publishNostrEvent({
  kind: 30017,
  pubkey: appPubkey,
  created_at: Math.floor(Date.now() / 1000),
  tags: [['d', 'identifier']],
  content: JSON.stringify(data)
})
```

### RPC Method Registration

```typescript
// Register a method that can be called via RPC
ctx.registerMethod('my-extension.methodName', async (request, applicationId, userPubkey?) => {
  // request: The RPC request payload
  // applicationId: The calling application's ID
  // userPubkey: The user's Nostr pubkey (if authenticated)

  return { result: 'success' }
})
```

### Event Subscriptions

```typescript
// Subscribe to payment received events
ctx.onPaymentReceived(async (payment) => {
  // payment: { invoiceId, paymentHash, amountSats, metadata }

  if (payment.metadata?.extension === 'my-extension') {
    // Handle payment for this extension
  }
})

// Subscribe to incoming Nostr events
ctx.onNostrEvent(async (event, applicationId) => {
  // event: { id, pubkey, kind, tags, content, created_at }
  // applicationId: The application this event is for

  if (event.kind === 4) {  // DM
    // Handle incoming message
  }
})
```

### Logging

```typescript
ctx.log('debug', 'Detailed debugging info')
ctx.log('info', 'Normal operation info')
ctx.log('warn', 'Warning message')
ctx.log('error', 'Error occurred', errorObject)
```

---

## Database Isolation

Each extension gets its own SQLite database file at:
```
{databaseDir}/{extension-id}.db
```

### Database Interface

```typescript
interface ExtensionDatabase {
  // Execute write queries (INSERT, UPDATE, DELETE, CREATE)
  execute(sql: string, params?: any[]): Promise<{ changes?: number; lastId?: number }>

  // Execute read queries (SELECT)
  query<T>(sql: string, params?: any[]): Promise<T[]>

  // Run multiple statements in a transaction
  transaction<T>(fn: () => Promise<T>): Promise<T>
}
```

### Migration Pattern

```typescript
// migrations.ts

export interface Migration {
  version: number
  name: string
  up: (db: ExtensionDatabase) => Promise<void>
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_initial_tables',
    up: async (db) => {
      await db.execute(`
        CREATE TABLE items (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)
    }
  },
  {
    version: 2,
    name: 'add_status_column',
    up: async (db) => {
      await db.execute(`ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'active'`)
    }
  }
]

// Run migrations in initialize()
export async function runMigrations(db: ExtensionDatabase): Promise<void> {
  const result = await db.query<{ value: string }>(
    `SELECT value FROM _extension_meta WHERE key = 'migration_version'`
  ).catch(() => [])

  const currentVersion = result.length > 0 ? parseInt(result[0].value, 10) : 0

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Running migration ${migration.version}: ${migration.name}`)
      await migration.up(db)
      await db.execute(
        `INSERT INTO _extension_meta (key, value) VALUES ('migration_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(migration.version)]
      )
    }
  }
}
```

---

## RPC Methods

Extensions register RPC methods that can be called by clients.

### Naming Convention

Methods should be namespaced with the extension ID:
```
{extension-id}.{methodName}
```

Examples:
- `marketplace.createStall`
- `withdraw.createLink`

### Method Handler Signature

```typescript
type RpcMethodHandler = (
  request: any,           // The request payload
  applicationId: string,  // The calling application
  userPubkey?: string     // The authenticated user (if any)
) => Promise<any>
```

### Example

```typescript
ctx.registerMethod('my-extension.createItem', async (req, appId, userPubkey) => {
  // Validate request
  if (!req.name) {
    throw new Error('Name is required')
  }

  // Create item
  const item = await this.manager.create(appId, req)

  // Return response
  return { item }
})
```

---

## HTTP Routes

Some extensions need HTTP endpoints (e.g., LNURL protocol). Extensions can define routes that the main application mounts.

### Defining Routes

```typescript
interface HttpRoute {
  method: 'GET' | 'POST'
  path: string
  handler: (req: HttpRequest) => Promise<HttpResponse>
}

interface HttpRequest {
  params: Record<string, string>   // URL path params
  query: Record<string, string>    // Query string params
  body?: any                       // POST body
  headers: Record<string, string>
}

interface HttpResponse {
  status: number
  body: any
  headers?: Record<string, string>
}
```

### Example

```typescript
class MyExtension implements Extension {
  getHttpRoutes(): HttpRoute[] {
    return [
      {
        method: 'GET',
        path: '/api/v1/my-extension/:id',
        handler: async (req) => {
          const item = await this.getItem(req.params.id)
          return {
            status: 200,
            body: item,
            headers: { 'Content-Type': 'application/json' }
          }
        }
      }
    ]
  }
}
```

---

## Event Handling

### Payment Callbacks

When you create an invoice with metadata, you'll receive that metadata back in the payment callback:

```typescript
// Creating invoice with metadata
const invoice = await ctx.createInvoice(1000, {
  metadata: {
    extension: 'my-extension',
    order_id: 'order-123'
  }
})

// Handling payment
ctx.onPaymentReceived(async (payment) => {
  if (payment.metadata?.extension === 'my-extension') {
    const orderId = payment.metadata.order_id
    await this.handlePayment(orderId, payment)
  }
})
```

### Nostr Events

Subscribe to Nostr events for your application:

```typescript
ctx.onNostrEvent(async (event, applicationId) => {
  // Filter by event kind
  if (event.kind === 4) {  // Encrypted DM
    await this.handleDirectMessage(event, applicationId)
  }
})
```

---

## Configuration

### Loader Configuration

```typescript
interface ExtensionLoaderConfig {
  extensionsDir: string         // Directory containing extensions
  databaseDir: string           // Directory for extension databases
  enabledExtensions?: string[]  // Whitelist (if set, only these load)
  disabledExtensions?: string[] // Blacklist
}
```

### Usage

```typescript
import { createExtensionLoader } from './extensions'

const loader = createExtensionLoader({
  extensionsDir: './src/extensions',
  databaseDir: './data/extensions',
  disabledExtensions: ['experimental-ext']
}, mainHandler)

await loader.loadAll()

// Call extension methods
const result = await loader.callMethod(
  'marketplace.createStall',
  { name: 'My Shop', currency: 'sat', shipping_zones: [] },
  applicationId,
  userPubkey
)

// Dispatch events
loader.dispatchPaymentReceived(paymentData)
loader.dispatchNostrEvent(event, applicationId)

// Shutdown
await loader.shutdown()
```

---

## Examples

### Example: Simple Counter Extension

```typescript
// src/extensions/counter/index.ts

import { Extension, ExtensionInfo, ExtensionContext, ExtensionDatabase } from '../types.js'

export default class CounterExtension implements Extension {
  readonly info: ExtensionInfo = {
    id: 'counter',
    name: 'Simple Counter',
    version: '1.0.0',
    description: 'A simple counter for each application',
    author: 'Example'
  }

  private db!: ExtensionDatabase

  async initialize(ctx: ExtensionContext, db: ExtensionDatabase): Promise<void> {
    this.db = db

    await db.execute(`
      CREATE TABLE IF NOT EXISTS counters (
        application_id TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      )
    `)

    ctx.registerMethod('counter.increment', async (req, appId) => {
      await db.execute(
        `INSERT INTO counters (application_id, count) VALUES (?, 1)
         ON CONFLICT(application_id) DO UPDATE SET count = count + 1`,
        [appId]
      )
      const result = await db.query<{ count: number }>(
        'SELECT count FROM counters WHERE application_id = ?',
        [appId]
      )
      return { count: result[0]?.count || 0 }
    })

    ctx.registerMethod('counter.get', async (req, appId) => {
      const result = await db.query<{ count: number }>(
        'SELECT count FROM counters WHERE application_id = ?',
        [appId]
      )
      return { count: result[0]?.count || 0 }
    })

    ctx.registerMethod('counter.reset', async (req, appId) => {
      await db.execute(
        'UPDATE counters SET count = 0 WHERE application_id = ?',
        [appId]
      )
      return { count: 0 }
    })
  }
}
```

### Example: Payment-Triggered Extension

```typescript
// src/extensions/donations/index.ts

import { Extension, ExtensionContext, ExtensionDatabase } from '../types.js'

export default class DonationsExtension implements Extension {
  readonly info = {
    id: 'donations',
    name: 'Donations',
    version: '1.0.0',
    description: 'Accept donations with thank-you messages',
    author: 'Example'
  }

  private db!: ExtensionDatabase
  private ctx!: ExtensionContext

  async initialize(ctx: ExtensionContext, db: ExtensionDatabase): Promise<void> {
    this.db = db
    this.ctx = ctx

    await db.execute(`
      CREATE TABLE IF NOT EXISTS donations (
        id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        amount_sats INTEGER NOT NULL,
        donor_pubkey TEXT,
        message TEXT,
        created_at INTEGER NOT NULL
      )
    `)

    // Create donation invoice
    ctx.registerMethod('donations.createInvoice', async (req, appId) => {
      const invoice = await ctx.createInvoice(req.amount_sats, {
        memo: req.message || 'Donation',
        metadata: {
          extension: 'donations',
          donor_pubkey: req.donor_pubkey,
          message: req.message
        }
      })
      return { invoice: invoice.paymentRequest }
    })

    // Handle successful payments
    ctx.onPaymentReceived(async (payment) => {
      if (payment.metadata?.extension !== 'donations') return

      // Record donation
      await db.execute(
        `INSERT INTO donations (id, application_id, amount_sats, donor_pubkey, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          payment.paymentHash,
          payment.metadata.application_id,
          payment.amountSats,
          payment.metadata.donor_pubkey,
          payment.metadata.message,
          Math.floor(Date.now() / 1000)
        ]
      )

      // Send thank-you DM if donor has pubkey
      if (payment.metadata.donor_pubkey) {
        await ctx.sendEncryptedDM(
          payment.metadata.application_id,
          payment.metadata.donor_pubkey,
          `Thank you for your donation of ${payment.amountSats} sats!`
        )
      }
    })

    // List donations
    ctx.registerMethod('donations.list', async (req, appId) => {
      const donations = await db.query(
        `SELECT * FROM donations WHERE application_id = ? ORDER BY created_at DESC LIMIT ?`,
        [appId, req.limit || 50]
      )
      return { donations }
    })
  }
}
```

---

## Best Practices

1. **Namespace your methods**: Always prefix RPC methods with your extension ID
2. **Use migrations**: Never modify existing migration files; create new ones
3. **Handle errors gracefully**: Throw descriptive errors, don't return error objects
4. **Clean up in shutdown**: Close connections, cancel timers, etc.
5. **Log appropriately**: Use debug for verbose info, error for failures
6. **Validate inputs**: Check request parameters before processing
7. **Use transactions**: For multi-step database operations
8. **Document your API**: Include types and descriptions for RPC methods

---

## Troubleshooting

### Extension not loading

1. Check that directory name matches `info.id`
2. Verify `index.ts` has a default export
3. Check for TypeScript/import errors in logs

### Database errors

1. Check migration syntax
2. Verify column types match queries
3. Look for migration version conflicts

### RPC method not found

1. Verify method is registered in `initialize()`
2. Check method name includes extension prefix
3. Ensure extension status is `ready`

### Payment callbacks not firing

1. Verify `metadata.extension` matches your extension ID
2. Check that `onPaymentReceived` is registered in `initialize()`
3. Confirm invoice was created through the extension
