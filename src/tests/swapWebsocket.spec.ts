import { ERROR } from '../services/helpers/logger.js'
import {
    SWAP_WS_PATH,
    SwapWsSocket,
    connectSwapUpdates,
} from '../services/lnd/swaps/swapWebsocket.js'
import { StorageTestBase } from './testBase.js'

export const ignore = false
export const dev = false
export const requires = 'storage' as const

export default async (T: StorageTestBase) => {
    await testReconnectsAfterClose(T)
    await testCloseStopsReconnect(T)
    await testAbortStopsReconnect(T)
    await testAlreadyAbortedDoesNotConnect(T)
}

class FakeSwapSocket implements SwapWsSocket {
    readonly sent: string[] = []
    pings = 0
    private handlers: {
        open?: () => void
        close?: () => void
        error?: (err: Error) => void
        message?: (data: unknown) => void
        pong?: () => void
    } = {}
    on(event: 'open' | 'close' | 'error' | 'message' | 'pong', cb: (...args: any[]) => void) {
        this.handlers[event] = cb as any
    }
    send(data: string) {
        this.sent.push(data)
    }
    ping() {
        this.pings++
    }
    close() {
        this.handlers.close?.()
    }
    emitOpen() {
        this.handlers.open?.()
    }
    emitClose() {
        this.handlers.close?.()
    }
    emitMessage(data: unknown) {
        this.handlers.message?.(data)
    }
}

const waitMs = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
const waitUntil = async (ok: () => boolean, ms = 500) => {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
        if (ok()) {
            return
        }
        await waitMs(10)
    }
    throw new Error('timed out waiting for condition')
}

const silentLog = () => { }

const testReconnectsAfterClose = async (T: StorageTestBase) => {
    T.d('starting swap websocket reconnects and resubscribes after close')
    const sockets: FakeSwapSocket[] = []
    const messages: unknown[] = []
    const session = connectSwapUpdates({
        wsUrl: 'ws://swap',
        swapId: 'swap-1',
        log: silentLog,
        retryMs: 20,
        retryMaxMs: 20,
        pingMs: 60_000,
        connect: (url) => {
            T.expect(url).to.equal(`ws://swap${SWAP_WS_PATH}`)
            const socket = new FakeSwapSocket()
            sockets.push(socket)
            return socket
        },
        onMessage: (raw) => { messages.push(raw) },
    })
    T.expect(sockets.length).to.equal(1)
    sockets[0].emitOpen()
    T.expect(JSON.parse(sockets[0].sent[0])).to.deep.equal({
        op: 'subscribe',
        channel: 'swap.update',
        args: ['swap-1'],
    })
    sockets[0].emitMessage('first')
    sockets[0].emitClose()
    await waitUntil(() => sockets.length === 2)
    sockets[1].emitOpen()
    T.expect(JSON.parse(sockets[1].sent[0]).args).to.deep.equal(['swap-1'])
    sockets[1].emitMessage('second')
    T.expect(messages).to.deep.equal(['first', 'second'])
    session.close()
    await waitMs(40)
    T.expect(sockets.length).to.equal(2)
    T.d('a dropped socket was replaced and the swap id was subscribed again')
}

const testCloseStopsReconnect = async (T: StorageTestBase) => {
    T.d('starting swap websocket close does not open another socket')
    const sockets: FakeSwapSocket[] = []
    const session = connectSwapUpdates({
        wsUrl: 'ws://swap',
        swapId: 'swap-2',
        log: silentLog,
        retryMs: 20,
        pingMs: 60_000,
        connect: () => {
            const socket = new FakeSwapSocket()
            sockets.push(socket)
            return socket
        },
        onMessage: () => { },
    })
    sockets[0].emitOpen()
    session.close()
    sockets[0].emitClose()
    await waitMs(40)
    T.expect(sockets.length).to.equal(1)
    T.d('session close stopped reconnect after the socket dropped')
}

const testAbortStopsReconnect = async (T: StorageTestBase) => {
    T.d('starting swap websocket abort stops reconnect')
    const abort = new AbortController()
    const sockets: FakeSwapSocket[] = []
    connectSwapUpdates({
        wsUrl: 'ws://swap',
        swapId: 'swap-3',
        log: silentLog,
        abort: abort.signal,
        retryMs: 20,
        pingMs: 60_000,
        connect: () => {
            const socket = new FakeSwapSocket()
            sockets.push(socket)
            return socket
        },
        onMessage: () => { },
    })
    sockets[0].emitClose()
    abort.abort()
    await waitMs(40)
    T.expect(sockets.length).to.equal(1)
    T.d('abort cancelled a pending reconnect')
}

const testAlreadyAbortedDoesNotConnect = async (T: StorageTestBase) => {
    T.d('starting an already-aborted swap websocket does not connect')
    const abort = new AbortController()
    abort.abort()
    let connects = 0
    connectSwapUpdates({
        wsUrl: 'ws://swap',
        swapId: 'swap-4',
        log: (...message) => {
            if (message[0] === ERROR) {
                throw new Error('aborted session logged an error')
            }
        },
        abort: abort.signal,
        connect: () => {
            connects++
            return new FakeSwapSocket()
        },
        onMessage: () => { },
    })
    T.expect(connects).to.equal(0)
    T.d('an aborted signal skipped the first connect')
}
