import fs from 'fs'
import { parse, stringify } from 'csv'
import { getLogger } from '../helpers/logger.js'
//const eventLogPath = "logs/eventLogV3.csv"
type LoggedEventType = 'new_invoice' | 'new_address' | 'address_paid' | 'invoice_paid' | 'invoice_payment' | 'address_payment' | 'u2u_receiver' | 'u2u_sender' | 'balance_increment' | 'balance_decrement'
export type LoggedEvent = {
    timestampMs: number
    userId: string
    appUserId: string
    appId: string
    balance: number
    type: LoggedEventType
    data: string
    amount: number
}
type TimeEntry = {
    timestamp: number
    amount: number
    balance: number
    userId: string
}
const columns = ["timestampMs", "userId", "appUserId", "appId", "balance", "type", "data", "amount"]
type StringerWrite = (chunk: any, cb: (error: Error | null | undefined) => void) => boolean
export default class EventsLogManager {
    eventLogPath: string
    log = getLogger({ component: "EventsLogManager" })
    stringerWrite: StringerWrite
    constructor(eventLogPath: string) {
        this.eventLogPath = eventLogPath
        const exists = fs.existsSync(eventLogPath)
        if (!exists) {
            const stringer = stringify({ header: true, columns })
            stringer.pipe(fs.createWriteStream(eventLogPath, { flags: 'a' }))
            this.stringerWrite = (chunk, cb) => stringer.write(chunk, cb)
        } else {
            const stringer = stringify({})
            stringer.pipe(fs.createWriteStream(eventLogPath, { flags: 'a' }))
            this.stringerWrite = (chunk, cb) => stringer.write(chunk, cb)
        }
    }



    LogEvent = (e: Omit<LoggedEvent, 'timestampMs'>) => {
        this.log(e.type, "->", e.userId, "->", e.appId, "->", e.appUserId, "->", e.balance, "->", e.data, "->", e.amount)
        this.write([Date.now(), e.userId, e.appUserId, e.appId, e.balance, e.type, e.data, e.amount])
    }

    GetAllLogs = async (path?: string): Promise<LoggedEvent[]> => {
        const logs = await this.Read(path)
        this.log("found", logs.length, "event logs")
        return logs
    }

    Read = async (path?: string): Promise<LoggedEvent[]> => {
        const filePath = path ? path : this.eventLogPath
        const exists = fs.existsSync(filePath)
        if (!exists) {
            return []
        }
        return new Promise<LoggedEvent[]>((res, rej) => {
            const result: LoggedEvent[] = []
            fs.createReadStream(filePath)
                .pipe(parse({ delimiter: ",", from_line: 2 }))
                .on('data', data => { result.push(this.parseEvent(data)) })
                .on('error', err => { rej(err) })
                .on('end', () => { res(result) })
        })
    }

    parseEvent = (args: string[]): LoggedEvent => {
        const [timestampMs, userId, appUserId, appId, balance, type, data, amount] = args
        return { timestampMs: +timestampMs, userId, appUserId, appId, balance: +balance, type: type as LoggedEventType, data, amount: +amount }
    }

    write = async (args: (string | number)[]) => {
        return new Promise<void>((res, rej) => {
            this.stringerWrite(args, err => {
                if (err) {
                    rej(err)
                } else { res() }
            })
        })
    }

    ignoredKeys = ['fees', "bc1qkafgye62h2zhzlwtrga6jytz2p7af4lg8fwqt6", "6eb1d279f95377b8514aad3b79ff1cddbe9f5d3b95653b55719850df9df63821", "b11585413bfa7bf65a5f1263e3100e53b4c9afe6b5d8c94c6b85017dfcbf3d49"]
    createTimeSeries = (events: LoggedEvent[]) => {
        const dataAppIds: Record<string, string> = {}
        const order: { timestamp: number, data: string, type: 'inc' | 'dec' }[] = []
        const incrementEntries: Record<string, TimeEntry> = {}
        const decrementEntries: Record<string, TimeEntry> = {}
        events.forEach(e => {
            if (this.ignoredKeys.includes(e.data)) {
                return
            }
            if (e.type === 'balance_increment') {
                if (incrementEntries[e.data]) {
                    throw new Error("increment duplicate! " + e.data)
                }
                incrementEntries[e.data] = { timestamp: e.timestampMs, balance: e.balance, amount: e.amount, userId: e.userId }
                order.push({ timestamp: e.timestampMs, data: e.data, type: 'inc' })
            } else if (e.type === 'balance_decrement') {
                if (decrementEntries[e.data]) {
                    throw new Error("decrement duplicate! " + e.data)
                }
                decrementEntries[e.data] = { timestamp: e.timestampMs, balance: e.balance, amount: e.amount, userId: e.userId }
                order.push({ timestamp: e.timestampMs, data: e.data, type: 'dec' })
            } else if (e.appId) {
                dataAppIds[e.data] = e.appId
            }
        })
        const full = order.map(o => {
            const { type } = o
            if (type === 'inc') {
                const entry = incrementEntries[o.data]
                return { timestamp: entry.timestamp, amount: entry.amount, balance: entry.balance, userId: entry.userId, appId: dataAppIds[o.data], internal: !!decrementEntries[o.data] }
            } else {
                const entry = decrementEntries[o.data]
                return { timestamp: entry.timestamp, amount: -entry.amount, balance: entry.balance, userId: entry.userId, appId: dataAppIds[o.data], internal: !!incrementEntries[o.data] }
            }
        })
        full.sort((a, b) => a.timestamp - b.timestamp)
        fs.writeFileSync("timeSeries.json", JSON.stringify(full, null, 2))
    }
}