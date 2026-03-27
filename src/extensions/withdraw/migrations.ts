/**
 * LNURL-withdraw Extension Database Migrations
 */

import { ExtensionDatabase } from '../types.js'

export interface Migration {
  version: number
  name: string
  up: (db: ExtensionDatabase) => Promise<void>
  down?: (db: ExtensionDatabase) => Promise<void>
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_withdraw_links_table',
    up: async (db: ExtensionDatabase) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS withdraw_links (
          id TEXT PRIMARY KEY,
          application_id TEXT NOT NULL,

          -- Display
          title TEXT NOT NULL,
          description TEXT,

          -- Amounts (sats)
          min_withdrawable INTEGER NOT NULL,
          max_withdrawable INTEGER NOT NULL,

          -- Usage limits
          uses INTEGER NOT NULL DEFAULT 1,
          used INTEGER NOT NULL DEFAULT 0,
          wait_time INTEGER NOT NULL DEFAULT 0,

          -- Security
          unique_hash TEXT NOT NULL UNIQUE,
          k1 TEXT NOT NULL,
          is_unique INTEGER NOT NULL DEFAULT 0,
          uses_csv TEXT NOT NULL DEFAULT '',

          -- Rate limiting
          open_time INTEGER NOT NULL DEFAULT 0,

          -- Webhooks
          webhook_url TEXT,
          webhook_headers TEXT,
          webhook_body TEXT,

          -- Timestamps
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `)

      // Index for looking up by unique_hash (LNURL)
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_withdraw_links_unique_hash
        ON withdraw_links(unique_hash)
      `)

      // Index for listing by application
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_withdraw_links_application
        ON withdraw_links(application_id, created_at DESC)
      `)
    }
  },
  {
    version: 2,
    name: 'create_withdrawals_table',
    up: async (db: ExtensionDatabase) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS withdrawals (
          id TEXT PRIMARY KEY,
          link_id TEXT NOT NULL,
          application_id TEXT NOT NULL,

          -- Payment details
          payment_hash TEXT NOT NULL,
          amount_sats INTEGER NOT NULL,
          fee_sats INTEGER NOT NULL DEFAULT 0,

          -- Recipient
          recipient_node TEXT,

          -- Webhook result
          webhook_success INTEGER,
          webhook_response TEXT,

          -- Timestamp
          created_at INTEGER NOT NULL,

          FOREIGN KEY (link_id) REFERENCES withdraw_links(id) ON DELETE CASCADE
        )
      `)

      // Index for listing withdrawals by link
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_withdrawals_link
        ON withdrawals(link_id, created_at DESC)
      `)

      // Index for looking up by payment hash
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_withdrawals_payment_hash
        ON withdrawals(payment_hash)
      `)
    }
  },
  {
    version: 3,
    name: 'create_hash_checks_table',
    up: async (db: ExtensionDatabase) => {
      // Temporary table to prevent double-spending during payment processing
      await db.execute(`
        CREATE TABLE IF NOT EXISTS hash_checks (
          hash TEXT PRIMARY KEY,
          k1 TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )
      `)
    }
  },
  {
    version: 4,
    name: 'add_creator_pubkey_column',
    up: async (db: ExtensionDatabase) => {
      // Store the Nostr pubkey of the user who created the withdraw link
      // so that when the LNURL callback fires, we debit the correct user's balance
      await db.execute(`
        ALTER TABLE withdraw_links ADD COLUMN creator_pubkey TEXT
      `)
    }
  }
]

/**
 * Run all pending migrations
 */
export async function runMigrations(db: ExtensionDatabase): Promise<void> {
  // Get current version
  const versionResult = await db.query<{ value: string }>(
    `SELECT value FROM _extension_meta WHERE key = 'migration_version'`
  ).catch(() => [])

  const currentVersion = versionResult.length > 0 ? parseInt(versionResult[0].value, 10) : 0

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`[Withdraw] Running migration ${migration.version}: ${migration.name}`)
      await migration.up(db)

      // Update version
      await db.execute(
        `INSERT INTO _extension_meta (key, value) VALUES ('migration_version', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [String(migration.version)]
      )
    }
  }
}
