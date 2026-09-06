import fs from 'fs'
export const DEBUG = Symbol("DEBUG")
export const ERROR = Symbol("ERROR")
export const INFO = Symbol("INFO")
type LoggerParams = { appName?: string, userId?: string, component?: string }
export type PubLogger = (...message: (string | number | object | symbol)[]) => void
type Writer = (message: string) => void
const logsDir = process.env.LOGS_DIR || "logs"
const logLevel = process.env.LOG_LEVEL || "INFO"
try {
    fs.mkdirSync(logsDir)
} catch { }
if (logLevel !== "DEBUG" && logLevel !== "INFO" && logLevel !== "ERROR") {
    throw new Error("Invalid log level " + logLevel + " must be one of (DEBUG, INFO, ERROR)")
}
const z = (n: number) => n < 10 ? `0${n}` : `${n}`
const sanitizeFileName = (fileName: string): string => {
    return fileName.replace(/[/\\:*?"<>|]/g, '_')
}
const todayStamp = () => {
    const now = new Date()
    return `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`
}
const ensureDir = (dirPath: string) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
}
type CachedFile = { date: string, fd: number }
const filesByName = new Map<string, CachedFile>()
const writersByFileName = new Map<string, Writer>()
const ROOT_LOG = "ROOT.log"
export const MAX_CACHED_LOG_STREAMS = 128
const closeFile = (fileName: string, cached: CachedFile) => {
    try {
        fs.closeSync(cached.fd)
    } catch {
    }
    writersByFileName.delete(fileName)
}
const getFd = (fileName: string): number => {
    const date = todayStamp()
    const cached = filesByName.get(fileName)
    if (cached && cached.date === date) {
        filesByName.delete(fileName)
        filesByName.set(fileName, cached)
        return cached.fd
    }
    if (cached) {
        closeFile(fileName, cached)
        filesByName.delete(fileName)
    }
    return openFile(fileName, date)
}
const openFile = (fileName: string, date: string): number => {
    evictOldestIfFull()
    const logPath = `${logsDir}/${fileName}_${date}.log`
    ensureDir(logPath.substring(0, logPath.lastIndexOf('/')))
    const fd = fs.openSync(logPath, 'a')
    filesByName.set(fileName, { date, fd })
    return fd
}
const evictOldestIfFull = () => {
    if (filesByName.size < MAX_CACHED_LOG_STREAMS) {
        return
    }
    for (const [key, cached] of filesByName) {
        if (key === ROOT_LOG) {
            continue
        }
        closeFile(key, cached)
        filesByName.delete(key)
        return
    }
}
const openWriter = (fileName: string): Writer => {
    const cached = writersByFileName.get(fileName)
    if (cached) {
        return cached
    }
    getFd(fileName)
    const writer: Writer = (message) => {
        fs.writeSync(getFd(fileName), message + "\n")
    }
    writersByFileName.set(fileName, writer)
    return writer
}
export const cachedLogWriterCount = () => writersByFileName.size
const rootWriter = openWriter(ROOT_LOG)
const writersFor = (params: LoggerParams): Writer[] => {
    const writers: Writer[] = []
    if (params.appName) {
        writers.push(openWriter(`apps/${sanitizeFileName(params.appName)}`))
    }
    if (params.userId) {
        writers.push(openWriter(`users/${sanitizeFileName(params.userId)}`))
    }
    if (params.component) {
        writers.push(openWriter(`components/${sanitizeFileName(params.component)}`))
    }
    if (writers.length === 0) {
        writers.push(rootWriter)
    }
    return writers
}
if (!fs.existsSync(`${logsDir}/apps`)) {
    fs.mkdirSync(`${logsDir}/apps`, { recursive: true });
}
if (!fs.existsSync(`${logsDir}/users`)) {
    fs.mkdirSync(`${logsDir}/users`, { recursive: true });
}
if (!fs.existsSync(`${logsDir}/components`)) {
    fs.mkdirSync(`${logsDir}/components`, { recursive: true });
}
export const getLogger = (params: LoggerParams): PubLogger => {
    const writers = writersFor(params)

    return (...message) => {
        switch (message[0]) {
            case DEBUG:
                if (logLevel !== "DEBUG") {
                    return
                }
                message[0] = "DEBUG"
                break;
            case INFO:
                if (logLevel === "ERROR") {
                    return
                }
                message[0] = "INFO"
                break;
            case ERROR:
                message[0] = "ERROR"
                break;
            default:
            // treats logs without a level as ERROR level, without prefix so it can be found and fixed if needed
        }
        const now = new Date()
        const timestamp = `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())} ${z(now.getHours())}:${z(now.getMinutes())}:${z(now.getSeconds())}`
        const toLog = [timestamp]
        if (params.appName) {
            if (disabledApps.includes(params.appName)) {
                return
            }
            toLog.push(params.appName)
        }
        if (params.component) {
            if (disabledComponents.includes(params.component)) {
                return
            }
            toLog.push(params.component)
        }
        if (params.userId) {
            toLog.push(params.userId)
        }
        const parsed = message.map(m => typeof m === 'object' ? JSON.stringify(m, (_, v) => typeof v === 'bigint' ? v.toString() : v) : m)
        const final = `${toLog.join(" ")} >> ${parsed.join(" ")}`
        console.log(final)
        writers.forEach(w => w(final))
    }
}
let disabledApps: string[] = []
let disabledComponents: string[] = []
export const resetDisabledLoggers = () => {
    disabledApps = []
    disabledComponents = []
}
export const disableLoggers = (appNamesToDisable: string[], componentsToDisable: string[]) => {
    disabledApps.push(...appNamesToDisable)
    disabledComponents.push(...componentsToDisable)
}
const disableFromEnv = () => {
    const disabledApps = process.env.HIDE_LOGS
    if (disabledApps) {
        const loggers = disabledApps.split(" ")
        resetDisabledLoggers()
        disableLoggers(loggers, loggers)
    }
}
disableFromEnv()
