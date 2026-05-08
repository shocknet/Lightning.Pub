// BACKUP: One encrypted .enc file per exported table (see backupManager / restoreManager).
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
