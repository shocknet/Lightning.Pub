import ws from 'ws'
import { ERROR, PubLogger } from '../../helpers/logger.js'

export const SWAP_WS_PATH = '/v2/ws'
export const SWAP_WS_PING_MS = 30 * 1000
export const SWAP_WS_RETRY_MS = 1000
export const SWAP_WS_RETRY_MAX_MS = 30 * 1000

export type SwapWsSocket = {
    on(event: 'open', cb: () => void): void
    on(event: 'close', cb: () => void): void
    on(event: 'error', cb: (err: Error) => void): void
    on(event: 'message', cb: (data: unknown) => void): void
    on(event: 'pong', cb: () => void): void
    send(data: string): void
    ping(): void
    close(): void
}

export type SwapWsConnect = (url: string) => SwapWsSocket

export const defaultSwapWsConnect: SwapWsConnect = (url) => new ws(url)

export const swapWsPayloadText = (raw: unknown) => {
    if (typeof raw === 'string') {
        return raw
    }
    if (Buffer.isBuffer(raw)) {
        return raw.toString('utf-8')
    }
    if (raw && typeof raw === 'object' && 'toString' in raw) {
        return (raw as { toString: (enc?: BufferEncoding) => string }).toString('utf-8')
    }
    return String(raw)
}

export type ConnectSwapUpdatesOpts = {
    wsUrl: string
    swapId: string
    log: PubLogger
    abort?: AbortSignal
    onMessage: (raw: unknown) => void | Promise<void>
    onOpen?: () => void | Promise<void>
    connect?: SwapWsConnect
    pingMs?: number
    retryMs?: number
    retryMaxMs?: number
}

/**
 * One live provider websocket for a swap, with resubscribe on drop.
 * Disconnect does not finish the swap; close()/abort stop reconnects.
 */
export const connectSwapUpdates = (opts: ConnectSwapUpdatesOpts): { close: () => void } => {
    const pingMs = opts.pingMs ?? SWAP_WS_PING_MS
    const retryMs = opts.retryMs ?? SWAP_WS_RETRY_MS
    const retryMaxMs = opts.retryMaxMs ?? SWAP_WS_RETRY_MAX_MS
    const connect = opts.connect ?? defaultSwapWsConnect
    const url = `${opts.wsUrl}${SWAP_WS_PATH}`
    const subReq = JSON.stringify({ op: 'subscribe', channel: 'swap.update', args: [opts.swapId] })

    let closed = false
    let socket: SwapWsSocket | undefined
    let ping: ReturnType<typeof setInterval> | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let delay = retryMs

    const stopPing = () => {
        if (ping !== undefined) {
            clearInterval(ping)
            ping = undefined
        }
    }
    const stopRetry = () => {
        if (retry !== undefined) {
            clearTimeout(retry)
            retry = undefined
        }
    }

    const close = () => {
        if (closed) {
            return
        }
        closed = true
        stopPing()
        stopRetry()
        opts.abort?.removeEventListener('abort', onAbort)
        socket?.close()
    }
    const onAbort = () => close()

    const attach = () => {
        if (closed) {
            return
        }
        stopRetry()
        const webSocket = connect(url)
        socket = webSocket
        webSocket.on('open', () => {
            if (closed || socket !== webSocket) {
                return
            }
            delay = retryMs
            try {
                webSocket.send(subReq)
            } catch (err: any) {
                opts.log(ERROR, 'Error subscribing to swap websocket', err?.message || err)
            }
            stopPing()
            ping = setInterval(() => {
                try {
                    webSocket.ping()
                } catch { }
            }, pingMs)
            ping.unref?.()
            void Promise.resolve(opts.onOpen?.()).catch((err: any) => {
                if (!closed) {
                    opts.log(ERROR, 'Error after swap websocket open', err?.message || err)
                }
            })
        })
        webSocket.on('pong', () => {
            opts.log('WebSocket swap pong received')
        })
        webSocket.on('error', (err) => {
            opts.log(ERROR, 'Error in WebSocket', err?.message || String(err))
        })
        webSocket.on('message', (raw) => {
            if (closed || socket !== webSocket) {
                return
            }
            void Promise.resolve(opts.onMessage(raw)).catch((err: any) => {
                opts.log(ERROR, 'Error handling swap websocket message', err?.message || err)
            })
        })
        webSocket.on('close', () => {
            if (socket === webSocket) {
                stopPing()
            }
            if (closed || socket !== webSocket) {
                return
            }
            opts.log('WebSocket closed; reconnecting to swap updates', { swapId: opts.swapId })
            retry = setTimeout(attach, delay)
            retry.unref?.()
            delay = Math.min(delay * 2, retryMaxMs)
        })
    }

    if (opts.abort?.aborted) {
        return { close: () => undefined }
    }
    opts.abort?.addEventListener('abort', onAbort)
    attach()
    return { close }
}
