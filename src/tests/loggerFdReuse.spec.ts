import fs from 'fs'
import { cachedLogWriterCount, getLogger, MAX_CACHED_LOG_STREAMS } from '../services/helpers/logger.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    testSameFileDoesNotLeakFds(T)
    await testUserIdStillGetsALogFile(T)
    testDistinctFilesStayBounded(T)
}

const logsDir = process.env.LOGS_DIR || "logs"
const z = (n: number) => n < 10 ? `0${n}` : `${n}`
const todayStamp = () => {
    const now = new Date()
    return `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`
}
const countFds = (): number => fs.readdirSync(`/proc/${process.pid}/fd`).length

const testSameFileDoesNotLeakFds = (T: StorageTestBase) => {
    T.d("starting testSameFileDoesNotLeakFds")
    const appName = `fd-reuse-${Date.now()}`
    const before = countFds()
    for (let i = 0; i < 500; i++) {
        getLogger({ appName })
    }
    const leaked = countFds() - before
    T.expect(leaked).to.be.lessThan(5)
    T.d(`500 getLogger calls leaked ${leaked} FDs`)
}

const waitForLine = async (path: string, needle: string) => {
    for (let i = 0; i < 50; i++) {
        if (fs.existsSync(path) && fs.readFileSync(path, "utf8").includes(needle)) {
            return
        }
        await new Promise(resolve => setTimeout(resolve, 20))
    }
    throw new Error(`log file missing line: ${path}`)
}

const testUserIdStillGetsALogFile = async (T: StorageTestBase) => {
    T.d("starting testUserIdStillGetsALogFile")
    const userId = `logger-user-${Date.now()}`
    const marker = `user-log-${userId}`
    getLogger({ userId, component: "balanceUpdates" })(marker)
    const date = todayStamp()
    const userLog = `${logsDir}/users/${userId}_${date}.log`
    const componentLog = `${logsDir}/components/balanceUpdates_${date}.log`
    await waitForLine(userLog, marker)
    await waitForLine(componentLog, marker)
    T.d("user and component log files both received the line")
}

const testDistinctFilesStayBounded = (T: StorageTestBase) => {
    T.d("starting testDistinctFilesStayBounded")
    const run = Date.now()
    const total = MAX_CACHED_LOG_STREAMS + 92
    const ids = Array.from({ length: total }, (_, i) => `logger-flush-${run}-${i}`)
    const before = countFds()
    let peak = before
    ids.forEach(id => {
        getLogger({ userId: id })(`marker-${id}`)
        peak = Math.max(peak, countFds())
    })
    T.expect(peak - before).to.be.lessThan(MAX_CACHED_LOG_STREAMS + 5)
    T.expect(cachedLogWriterCount()).to.be.at.most(MAX_CACHED_LOG_STREAMS)
    const date = todayStamp()
    const missing = ids.filter(id => {
        const path = `${logsDir}/users/${id}_${date}.log`
        return !fs.existsSync(path) || !fs.readFileSync(path, "utf8").includes(`marker-${id}`)
    })
    T.expect(missing.length).to.equal(0)
    T.d(`wrote ${total} user logs, missing ${missing.length}, peak leaked ${peak - before} FDs`)
}
