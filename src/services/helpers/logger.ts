import fs from 'fs'
export const DEBUG = Symbol("DEBUG")
export const ERROR = Symbol("ERROR")
export const WARN = Symbol("WARN")
type LoggerParams = { appName?: string, userId?: string, component?: string }
export type PubLogger = (...message: (string | number | object | symbol)[]) => void
type Writer = (message: string) => void
const logsDir = process.env.LOGS_DIR || "logs"
const logLevel = process.env.LOG_LEVEL || "DEBUG"
try {
    fs.mkdirSync(logsDir)
} catch { }
if (logLevel !== "DEBUG" && logLevel !== "WARN" && logLevel !== "ERROR") {
    throw new Error("Invalid log level " + logLevel + " must be one of (DEBUG, WARN, ERROR)")
}
const z = (n: number) => n < 10 ? `0${n}` : `${n}`
// Sanitize filename to remove invalid characters for filesystem
const sanitizeFileName = (fileName: string): string => {
    // Replace invalid filename characters with underscores
    // Invalid on most filesystems: / \ : * ? " < > |
    return fileName.replace(/[/\\:*?"<>|]/g, '_')
}
const openWriter = (fileName: string): Writer => {
    const now = new Date()
    const date = `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`
    // const sanitizedFileName = sanitizeFileName(fileName)
    const logPath = `${logsDir}/${fileName}_${date}.log`
    // Ensure parent directory exists
    const dirPath = logPath.substring(0, logPath.lastIndexOf('/'))
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
    }
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    return (message) => {
        logStream.write(message + "\n")
    }
}
const rootWriter = openWriter("ROOT.log")
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

    return (...message) => {
        switch (message[0]) {
            case DEBUG:
                if (logLevel !== "DEBUG") {
                    return
                }
                message[0] = "DEBUG"
                break;
            case WARN:
                if (logLevel === "ERROR") {
                    return
                }
                message[0] = "WARN"
                break;
            case ERROR:
                message[0] = "ERROR"
                break;
            default:
                if (logLevel !== "DEBUG") {
                    return
                }
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
