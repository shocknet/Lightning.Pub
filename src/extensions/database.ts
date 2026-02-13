import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { ExtensionDatabase } from './types.js'

/**
 * Extension Database Implementation
 *
 * Provides isolated SQLite database access for each extension.
 * Uses better-sqlite3 for synchronous, high-performance access.
 */
export class ExtensionDatabaseImpl implements ExtensionDatabase {
  private db: Database.Database
  private extensionId: string

  constructor(extensionId: string, databaseDir: string) {
    this.extensionId = extensionId

    // Ensure database directory exists
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true })
    }

    // Create database file for this extension
    const dbPath = path.join(databaseDir, `${extensionId}.db`)
    this.db = new Database(dbPath)

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL')

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')

    // Create metadata table for tracking migrations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS _extension_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `)
  }

  /**
   * Execute a write query (INSERT, UPDATE, DELETE, CREATE, etc.)
   */
  async execute(sql: string, params: any[] = []): Promise<{ changes?: number; lastId?: number }> {
    try {
      const stmt = this.db.prepare(sql)
      const result = stmt.run(...params)

      return {
        changes: result.changes,
        lastId: result.lastInsertRowid as number
      }
    } catch (e) {
      console.error(`[Extension:${this.extensionId}] Database execute error:`, e)
      throw e
    }
  }

  /**
   * Execute a read query (SELECT)
   */
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const stmt = this.db.prepare(sql)
      return stmt.all(...params) as T[]
    } catch (e) {
      console.error(`[Extension:${this.extensionId}] Database query error:`, e)
      throw e
    }
  }

  /**
   * Execute multiple statements in a transaction
   */
  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const runTransaction = this.db.transaction(() => {
      // Note: better-sqlite3 transactions are synchronous
      // We wrap the async function but it executes synchronously
      return fn()
    })

    return runTransaction() as T
  }

  /**
   * Get a metadata value
   */
  async getMeta(key: string): Promise<string | null> {
    const rows = await this.query<{ value: string }>(
      'SELECT value FROM _extension_meta WHERE key = ?',
      [key]
    )
    return rows.length > 0 ? rows[0].value : null
  }

  /**
   * Set a metadata value
   */
  async setMeta(key: string, value: string): Promise<void> {
    await this.execute(
      `INSERT INTO _extension_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
  }

  /**
   * Get current migration version
   */
  async getMigrationVersion(): Promise<number> {
    const version = await this.getMeta('migration_version')
    return version ? parseInt(version, 10) : 0
  }

  /**
   * Set migration version
   */
  async setMigrationVersion(version: number): Promise<void> {
    await this.setMeta('migration_version', String(version))
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close()
  }

  /**
   * Get the underlying database for advanced operations
   * (Use with caution - bypasses isolation)
   */
  getUnderlyingDb(): Database.Database {
    return this.db
  }
}

/**
 * Create an extension database instance
 */
export function createExtensionDatabase(
  extensionId: string,
  databaseDir: string
): ExtensionDatabaseImpl {
  return new ExtensionDatabaseImpl(extensionId, databaseDir)
}
