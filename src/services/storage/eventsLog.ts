import fs from 'fs'
import { parse, stringify } from 'csv'
import { getLogger } from '../helpers/logger'
const eventLogPath = "logs/eventLog.csv"
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
const columns = ["timestampMs", "userId", "appUserId", "appId", "balance", "type", "data", "amount"]
type StringerWrite = (chunk: any, cb: (error: Error | null | undefined) => void) => boolean
export default class EventsLogManager {
    log = getLogger({ appName: "EventsLogManager" })
    stringerWrite: StringerWrite
    constructor() {
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

    GetAllLogs = async (): Promise<LoggedEvent[]> => {
        const logs = await this.Read()
        this.log("found", logs.length, "event logs")
        return logs
    }

    Read = async (): Promise<LoggedEvent[]> => {
        const exists = fs.existsSync(eventLogPath)
        if (!exists) {
            return []
        }
        return new Promise<LoggedEvent[]>((res, rej) => {
            const result: LoggedEvent[] = []
            fs.createReadStream(eventLogPath)
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
}