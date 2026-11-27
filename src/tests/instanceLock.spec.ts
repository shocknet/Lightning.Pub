import { spawn, type ChildProcess } from 'child_process'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { acquirePubInstanceLock, releasePubInstanceLock } from '../services/storage/instanceLock.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage'

const specDir = dirname(fileURLToPath(import.meta.url))
const holdScript = join(specDir, 'holdInstanceLock.js')

export default async (T: StorageTestBase) => {
    const root = mkdtempSync(join(tmpdir(), 'pub-instance-lock-'))
    try {
        await testMemoryDbIsSkipped(T)
        await testSecondProcessIsRejected(T, join(root, 'db.sqlite'))
        await testKillNineReleasesLock(T, join(root, 'killed.sqlite'))
        await testExactlyOneConcurrentOwner(T, join(root, 'race.sqlite'))
    } finally {
        releasePubInstanceLock()
        rmSync(root, { recursive: true, force: true })
    }
}

const testMemoryDbIsSkipped = async (T: StorageTestBase) => {
    T.d('Starting testMemoryDbIsSkipped')
    acquirePubInstanceLock(':memory:')
    acquirePubInstanceLock(':memory:')
    T.d('Finished testMemoryDbIsSkipped')
}

const testSecondProcessIsRejected = async (T: StorageTestBase, databaseFile: string) => {
    T.d('Starting testSecondProcessIsRejected')
    acquirePubInstanceLock(databaseFile)
    const child = spawnLockChild(databaseFile)
    try {
        const result = await waitForLockChild(child)
        T.expect(result).to.equal('busy')
    } finally {
        child.kill('SIGKILL')
        releasePubInstanceLock()
    }
    T.d('Finished testSecondProcessIsRejected')
}

const testKillNineReleasesLock = async (T: StorageTestBase, databaseFile: string) => {
    T.d('Starting testKillNineReleasesLock')
    const child = spawnLockChild(databaseFile)
    try {
        const result = await waitForLockChild(child)
        T.expect(result).to.equal('held')
        child.kill('SIGKILL')
        await waitForExit(child)
        acquirePubInstanceLock(databaseFile)
    } finally {
        child.kill('SIGKILL')
        releasePubInstanceLock()
    }
    T.d('Finished testKillNineReleasesLock')
}

const testExactlyOneConcurrentOwner = async (T: StorageTestBase, databaseFile: string) => {
    T.d('Starting testExactlyOneConcurrentOwner')
    const children = [spawnLockChild(databaseFile), spawnLockChild(databaseFile)]
    try {
        const results = await Promise.all(children.map(waitForLockChild))
        const held = results.filter(r => r === 'held')
        const busy = results.filter(r => r === 'busy')
        T.expect(held.length).to.equal(1)
        T.expect(busy.length).to.equal(1)
    } finally {
        for (const child of children) {
            child.kill('SIGKILL')
        }
        await Promise.all(children.map(waitForExit))
    }
    T.d('Finished testExactlyOneConcurrentOwner')
}

const spawnLockChild = (databaseFile: string) => {
    const child = spawn(process.execPath, [holdScript], {
        env: { ...process.env, PUB_LOCK_DB: databaseFile },
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stderr?.on('data', chunk => {
        process.stderr.write(chunk)
    })
    return child
}

const waitForLockChild = (child: ChildProcess) => new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error('lock child timed out'))
    }, 8000)
    let buf = ''
    const finish = (result: string) => {
        clearTimeout(timer)
        resolve(result)
    }
    child.stdout?.on('data', chunk => {
        buf += String(chunk)
        if (buf.includes('busy')) {
            finish('busy')
        } else if (buf.includes('held')) {
            finish('held')
        }
    })
    child.on('error', err => {
        clearTimeout(timer)
        reject(err)
    })
    child.on('exit', (code, signal) => {
        if (buf.includes('held') || buf.includes('busy')) {
            return
        }
        clearTimeout(timer)
        reject(new Error(`lock child exited (${code}, ${signal}) before reporting`))
    })
})

const waitForExit = (child: ChildProcess) => new Promise<void>(resolve => {
    if (child.exitCode !== null || child.signalCode) {
        resolve()
        return
    }
    child.once('exit', () => resolve())
})
