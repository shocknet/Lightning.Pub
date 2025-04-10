import { getLogger } from "../../helpers/logger.js"
export type ProcessMetrics = {
    memory_rss_kb?: number
    memory_buffer_kb?: number
    memory_heap_total_kb?: number
    memory_heap_used_kb?: number
    memory_external_kb?: number
    cpu_user_ms?: number
    cpu_system_ms?: number
}
export class ProcessMetricsCollector {
    reportLog = getLogger({ component: 'ProcessMetricsCollector' })
    prevValues: Record<string, number> = {}
    interval: NodeJS.Timeout
    cpuUsage: { user: number, system: number }
    constructor(cb: (metrics: ProcessMetrics) => void) {
        this.cpuUsage = process.cpuUsage()
        this.interval = setInterval(() => {
            const mem = process.memoryUsage()
            const diff = process.cpuUsage(this.cpuUsage)
            this.cpuUsage = process.cpuUsage()
            const metrics: ProcessMetrics = {
                memory_rss_kb: this.AddValue('memory_rss_kb', Math.ceil(mem.rss / 1000 || 0), true),
                memory_buffer_kb: this.AddValue('memory_buffer_kb', Math.ceil(mem.arrayBuffers / 1000 || 0), true),
                memory_heap_total_kb: this.AddValue('memory_heap_total_kb', Math.ceil(mem.heapTotal / 1000 || 0), true),
                memory_heap_used_kb: this.AddValue('memory_heap_used_kb', Math.ceil(mem.heapUsed / 1000 || 0), true),
                memory_external_kb: this.AddValue('memory_external_kb', Math.ceil(mem.external / 1000 || 0), true),
                cpu_user_ms: this.AddValue('cpu_user_ms', Math.ceil(diff.user / 1000), true),
                cpu_system_ms: this.AddValue('cpu_system_ms', Math.ceil(diff.system / 1000), true),
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
