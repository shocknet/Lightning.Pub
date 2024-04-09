import fs from 'fs'
type LoggerParams = { appName?: string, userId?: string }
export type PubLogger = (...message: (string | number | object)[]) => void
type Writer = (message: string) => void
try {
    fs.mkdirSync("logs")
} catch { }
const z = (n: number) => n < 10 ? `0${n}` : `${n}`
const openWriter = (fileName: string): Writer => {
    const logStream = fs.createWriteStream(`logs/${fileName}`, { flags: 'a' });
    return (message) => {
        logStream.write(message + "\n")
    }
}
const rootWriter = openWriter("ROOT.log")
if (!fs.existsSync("logs/apps")) {
    fs.mkdirSync("logs/apps", { recursive: true });
}
if (!fs.existsSync("logs/users")) {
    fs.mkdirSync("logs/users", { recursive: true });
}
export const getLogger = (params: LoggerParams): PubLogger => {
    const writers: Writer[] = []
    if (params.appName) {
        writers.push(openWriter(`apps/${params.appName}.log`))
    }
    if (params.userId) {
        writers.push(openWriter(`users/${params.userId}.log`))
    }
    if (writers.length === 0) {
        writers.push(rootWriter)
    }

    return (...message) => {
        const now = new Date()
        const timestamp = `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())} ${z(now.getHours())}:${z(now.getMinutes())}:${z(now.getSeconds())}`
        const toLog = [timestamp]
        if (params.appName) {
            if (disabledApps.includes(params.appName)) {
                return
            }
            toLog.push(params.appName)
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
const disabledApps: string[] = []
export const disableLoggers = (appNamesToDisable: string[]) => {
    disabledApps.push(...appNamesToDisable)
}