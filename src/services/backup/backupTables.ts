// BACKUP: One encrypted .enc file per exported table (see backupManager / restoreManager).
// A publish stages `*.enc.tmp` then renames; restore picks the newest complete generation.
// `BACKUP_RESTORE_ORDER` is the dialtone import order (must match FK / overlay semantics).

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

export function backupTableFilename(id: BackupTableId): string {
    return `${id}.enc`
}

/** Staging name for a generation that is not yet promoted over the committed `.enc` file. */
export function backupTableStagingFilename(id: BackupTableId): string {
    return `${backupTableFilename(id)}.tmp`
}

export type ShardCopy = {
    generation: number
    data: Buffer
}

/**
 * Pick the newest generation that has every restore shard. Staging (`.tmp`) and committed
 * (`.enc`) copies of the same generation are interchangeable. Truncated or foreign copies
 * should already have been dropped by the caller (decrypt failed).
 */
export function selectConsistentSnapshot(copies: Map<BackupTableId, ShardCopy[]>): Map<BackupTableId, Buffer> {
    const gens = new Set<number>()
    for (const id of BACKUP_RESTORE_ORDER) {
        for (const copy of copies.get(id) ?? []) {
            gens.add(copy.generation)
        }
    }
    const complete = [...gens].filter(g =>
        BACKUP_RESTORE_ORDER.every(id => (copies.get(id) ?? []).some(c => c.generation === g)),
    )
    if (complete.length === 0) {
        const missing = BACKUP_RESTORE_ORDER.filter(id => (copies.get(id) ?? []).length === 0)
        throw new Error(missing.length > 0
            ? `incomplete backup snapshot (missing ${missing.join(', ')})`
            : 'incomplete backup snapshot (no generation has every shard)')
    }
    const best = Math.max(...complete)
    const buffers = new Map<BackupTableId, Buffer>()
    for (const id of BACKUP_RESTORE_ORDER) {
        const copy = (copies.get(id) ?? []).find(c => c.generation === best)
        if (!copy) {
            throw new Error(`incomplete backup snapshot (missing ${id})`)
        }
        buffers.set(id, copy.data)
    }
    return buffers
}
