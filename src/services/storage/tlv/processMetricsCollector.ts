import { getLogger } from "../../helpers/logger.js"
export type ProcessMetrics = {
    memory_rss_kb?: number
    memory_buffer_kb?: number
    memory_heap_total_kb?: number
    memory_heap_used_kb?: number
    memory_external_kb?: number
}
export class ProcessMetricsCollector {
    reportLog = getLogger({ component: 'ProcessMetricsCollector' })
    prevValues: Record<string, number> = {}
    interval: NodeJS.Timeout
    constructor(cb: (metrics: ProcessMetrics) => void) {
        this.interval = setInterval(() => {
            const mem = process.memoryUsage()
            const metrics: ProcessMetrics = {
                memory_rss_kb: this.AddValue('memory_rss_kb', Math.ceil(mem.rss / 1000 || 0), true),
                memory_buffer_kb: this.AddValue('memory_buffer_kb', Math.ceil(mem.arrayBuffers / 1000 || 0), true),
                memory_heap_total_kb: this.AddValue('memory_heap_total_kb', Math.ceil(mem.heapTotal / 1000 || 0), true),
                memory_heap_used_kb: this.AddValue('memory_heap_used_kb', Math.ceil(mem.heapUsed / 1000 || 0), true),
                memory_external_kb: this.AddValue('memory_external_kb', Math.ceil(mem.external / 1000 || 0), true),
            }

            cb(metrics)
        }, 60 * 1000)
    }

    Stop() {
        clearInterval(this.interval)
    }

    AddValue = (key: string, v: number, updateOnly = false): number | undefined => {
        if (updateOnly && this.prevValues[key] === v) {
            return
        }
        this.prevValues[key] = v
        return v
    }
}
