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
type CachedStream = { date: string, stream: fs.WriteStream }
const streamsByFileName = new Map<string, CachedStream>()
const writersByFileName = new Map<string, Writer>()
const getStream = (fileName: string): fs.WriteStream => {
    const date = todayStamp()
    const cached = streamsByFileName.get(fileName)
    if (cached && cached.date === date) {
        return cached.stream
    }
    if (cached) {
        cached.stream.end()
    }
    const logPath = `${logsDir}/${fileName}_${date}.log`
    ensureDir(logPath.substring(0, logPath.lastIndexOf('/')))
    const stream = fs.createWriteStream(logPath, { flags: 'a' })
    streamsByFileName.set(fileName, { date, stream })
    return stream
}
const openWriter = (fileName: string): Writer => {
    const cached = writersByFileName.get(fileName)
    if (cached) {
        return cached
    }
    const writer: Writer = (message) => {
        getStream(fileName).write(message + "\n")
    }
    writersByFileName.set(fileName, writer)
    return writer
}
const rootWriter = openWriter("ROOT.log")
export const getLogger = (params: LoggerParams): PubLogger => {
    const writers: Writer[] = []
    if (params.appName) {
        writers.push(openWriter(`apps/${sanitizeFileName(params.appName)}`))
    }
    if (params.component) {
        writers.push(openWriter(`components/${sanitizeFileName(params.component)}`))
    }
    if (writers.length === 0) {
        writers.push(rootWriter)
    }

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
