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
        const timestamp = `${now.getFullYear()}-${z(now.getMonth())}-${z(now.getDate())} ${z(now.getHours())}:${z(now.getMinutes())}:${z(now.getSeconds())}`
        const toLog = [timestamp]
        if (params.appName) {
            toLog.push(params.appName)
        }
        if (params.userId) {
            toLog.push(params.userId)
        }
        const parsed = message.map(m => typeof m === 'object' ? JSON.stringify(m) : m)
        const final = `${toLog.join(" ")} >> ${parsed.join(" ")}`
        console.log(final)
        writers.forEach(w => w(final))
    }
}
