// BACKUP: Module exports
//
// New module added for backup/restore functionality.
// See plan: backup_restore_research_d5ba1117.plan.md

export { deriveBackupKeys, LATEST_DERIVATION_VERSION } from './derivation.js'
export { encryptPayload, decryptPayload } from './encryption.js'
export type { BackupPayload } from './encryption.js'
export { collectBalancesSegment, collectIdentitySegment, isDatabaseClean, DIALTONE_TABLES } from './segments.js'
export { sftpUpload, sftpDownload, sftpCheckBackupExists, cloudSftpConfig } from './sftpClient.js'
export type { SftpConfig } from './sftpClient.js'
export { restoreFromSource } from './restoreManager.js'
export type { RestoreOptions, RestoreResult, RestoreSource } from './restoreManager.js'
export { BackupManager } from './backupManager.js'
export type { BackupConfig } from './backupManager.js'
