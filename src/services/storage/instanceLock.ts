import { createRequire } from 'module'
import { chmodSync, existsSync, readFileSync, rmSync, statSync } from 'fs'
import { join } from 'path'

const SqliteDatabase = createRequire(import.meta.url)('better-sqlite3') as {
    new (path: string, options?: { timeout?: number }): {
        pragma: (sql: string) => unknown
        exec: (sql: string) => unknown
        close: () => void
    }
}

type LockDatabase = InstanceType<typeof SqliteDatabase>

const isMemoryDb = (databaseFile: string) => databaseFile === ':memory:' || databaseFile.startsWith('file::memory:')

const lockPathFor = (databaseFile: string) => `${databaseFile}.instance.lock`

const pidIsAlive = (pid: number) => {
    try {
        process.kill(pid, 0)
        return true
    } catch {
        return false
    }
}

const readLegacyLockPid = (lockDir: string) => {
    try {
        return Number.parseInt(readFileSync(join(lockDir, 'pid'), 'utf8').trim(), 10)
    } catch {
        return NaN
    }
}

const isSqliteBusy = (e: unknown) => {
    const code = (e as { code?: string }).code
    return code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED'
}

const alreadyRunning = (databaseFile: string) =>
    new Error(`Pub already running against ${databaseFile}`)

let lockDb: LockDatabase | null = null
let exitHookRegistered = false

const registerExitHook = () => {
    if (exitHookRegistered) {
        return
    }
    exitHookRegistered = true
    process.once('exit', () => releasePubInstanceLock())
}

const removeLegacyMkdirLock = (databaseFile: string, lockPath: string) => {
    if (!existsSync(lockPath) || !statSync(lockPath).isDirectory()) {
        return
    }
    const existing = readLegacyLockPid(lockPath)
    if (Number.isInteger(existing) && pidIsAlive(existing)) {
        throw alreadyRunning(databaseFile)
    }
    rmSync(lockPath, { recursive: true, force: true })
}

const openExclusiveLock = (lockPath: string) => {
    const db = new SqliteDatabase(lockPath, { timeout: 0 })
    try {
        chmodSync(lockPath, 0o600)
        db.pragma('journal_mode = DELETE')
        db.pragma('busy_timeout = 0')
        db.exec('BEGIN EXCLUSIVE')
        return db
    } catch (e) {
        db.close()
        throw e
    }
}

export const releasePubInstanceLock = () => {
    if (!lockDb) {
        return
    }
    try {
        lockDb.close()
    } finally {
        lockDb = null
    }
}

export const acquirePubInstanceLock = (databaseFile: string) => {
    if (isMemoryDb(databaseFile)) {
        return
    }
    if (lockDb) {
        throw alreadyRunning(databaseFile)
    }
    const lockPath = lockPathFor(databaseFile)
    removeLegacyMkdirLock(databaseFile, lockPath)
    try {
        lockDb = openExclusiveLock(lockPath)
    } catch (e) {
        if (isSqliteBusy(e)) {
            throw alreadyRunning(databaseFile)
        }
        throw e
    }
    registerExitHook()
}
