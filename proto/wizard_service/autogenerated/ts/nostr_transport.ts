// This file was autogenerated from a .proto file, DO NOT EDIT!

import * as Types from './types.js'
export type Logger = { log: (v: any) => void, error: (v: any) => void }
type NostrResponse = (message: object) => void
export type NostrRequest = {
    rpcName?: string
    params?: Record<string, string>
    query?: Record<string, string>
    body?: any
    authIdentifier?: string
    requestId?: string
    appId?: string
}
export type NostrOptions = {
    logger?: Logger
    throwErrors?: true
    metricsCallback: (metrics: Types.RequestMetric[]) => void
}
const logErrorAndReturnResponse = (error: Error, response: string, res: NostrResponse, logger: Logger, metric: Types.RequestMetric, metricsCallback: (metrics: Types.RequestMetric[]) => void) => { 
    logger.error(error.message || error); metricsCallback([{ ...metric, error: response }]); res({ status: 'ERROR', reason: response })
}
export default (methods: Types.ServerMethods, opts: NostrOptions) => {
    const logger = opts.logger || { log: console.log, error: console.error }
    return async (req: NostrRequest, res: NostrResponse, startString: string, startMs: number) => {
        const startTime = BigInt(startString)
        const info: Types.RequestInfo = { rpcName: req.rpcName || 'unkown', batch: false, nostr: true, batchSize: 0 }
        const stats: Types.RequestStats = { startMs, start: startTime, parse: process.hrtime.bigint(), guard: 0n, validate: 0n, handle: 0n }
        let authCtx: Types.AuthContext = {}
        switch (req.rpcName) {
            default: logger.error('unknown rpc call name from nostr event:'+req.rpcName) 
        }
    }
}
