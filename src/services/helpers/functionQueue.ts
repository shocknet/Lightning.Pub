import { PubLogger, getLogger } from "../helpers/logger.js"

type Item<T> = { res: (v: T) => void, rej: (message: string) => void }
export default class FunctionQueue<T> {
    log: PubLogger
    queue: Item<T>[] = []
    running: boolean = false
    f: () => Promise<T>
    constructor(name: string, f: () => Promise<T>) {
        this.log = getLogger({ appName: name })
        this.f = f
    }

    Run = (item: Item<T>) => {
        this.queue.push(item)
        if (!this.running) {
            this.execF()
        }
    }

    execF = async () => {
        this.running = true
        try {
            const res = await this.f()
            this.queue.forEach(q => q.res(res))
        } catch (err) {
            this.queue.forEach(q => q.rej((err as any).message))
        }
        this.queue = []
        this.running = false
    }
}


