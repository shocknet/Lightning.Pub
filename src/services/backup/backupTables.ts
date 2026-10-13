// BACKUP: One encrypted shard per exported table, published by an atomically replaced manifest.
// Shards are immutable: `<table>.v<generation>.enc`. Restore reads `manifest.json` and
// downloads exactly those files. `BACKUP_RESTORE_ORDER` is the dialtone import order
// (must match FK / overlay semantics).

import crypto from 'crypto'

export const BACKUP_TABLE_IDS = [
    'indexes',
    'user_balances',
    'tracked_providers',
    'applications',
    'application_users',
    'admin_settings',
    'app_user_devices',
    'user_offers',
    'products',
    'management_grants',
    'debit_accesses',
    'invite_tokens',
] as const

export type BackupTableId = (typeof BACKUP_TABLE_IDS)[number]

export const BACKUP_RESTORE_ORDER: readonly BackupTableId[] = BACKUP_TABLE_IDS

export const BACKUP_MANIFEST_FILENAME = 'manifest.json'

const TABLE_ID_SET = new Set<string>(BACKUP_TABLE_IDS)
const GENERATION_RE = /^[0-9a-z]+$/

export type BackupManifest = {
    generation: string
    tables: Partial<Record<BackupTableId, string>>
}

export function isBackupTableId(id: string): id is BackupTableId {
    return TABLE_ID_SET.has(id)
}

/** Shared batch token used in shard filenames. Unique even when two batches share a millisecond. */
export function newBackupGeneration(): string {
    return `${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`
}

export function backupTableVersionedFilename(id: BackupTableId, generation: string): string {
    if (!GENERATION_RE.test(generation)) {
        throw new Error(`invalid backup generation: ${generation}`)
    }
    return `${id}.v${generation}.enc`
}

export function parseShardFilename(name: string): { id: BackupTableId, generation: string } | null {
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
        return null
    }
    const match = /^([a-z_]+)\.v([0-9a-z]+)\.enc$/.exec(name)
    if (!match) return null
    const id = match[1]
    if (!isBackupTableId(id)) return null
    return { id, generation: match[2] }
}

export function serializeBackupManifest(manifest: BackupManifest): Buffer {
    const tables: Record<string, string> = {}
    for (const id of BACKUP_TABLE_IDS) {
        const name = manifest.tables[id]
        if (name) tables[id] = name
    }
    return Buffer.from(JSON.stringify({ generation: manifest.generation, tables }), 'utf8')
}

export function parseBackupManifest(raw: string | Buffer): BackupManifest {
    let parsed: unknown
    try {
        parsed = JSON.parse(typeof raw === 'string' ? raw : raw.toString('utf8'))
    } catch {
        throw new Error('backup manifest is not valid JSON')
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('backup manifest must be an object')
    }
    const obj = parsed as { generation?: unknown, tables?: unknown }
    if (typeof obj.generation !== 'string' || !GENERATION_RE.test(obj.generation)) {
        throw new Error('backup manifest generation is missing or invalid')
    }
    if (!obj.tables || typeof obj.tables !== 'object' || Array.isArray(obj.tables)) {
        throw new Error('backup manifest tables is missing or invalid')
    }
    const tables: Partial<Record<BackupTableId, string>> = {}
    for (const [key, value] of Object.entries(obj.tables as Record<string, unknown>)) {
        if (!isBackupTableId(key)) {
            throw new Error(`backup manifest has unknown table ${key}`)
        }
        if (typeof value !== 'string') {
            throw new Error(`backup manifest entry for ${key} is not a string`)
        }
        const parsedName = parseShardFilename(value)
        if (!parsedName || parsedName.id !== key) {
            throw new Error(`backup manifest entry for ${key} is not a valid shard filename`)
        }
        tables[key] = value
    }
    return { generation: obj.generation, tables }
}

export function manifestShardNames(manifest: BackupManifest): string[] {
    return BACKUP_TABLE_IDS.map(id => manifest.tables[id]).filter((name): name is string => !!name)
}
