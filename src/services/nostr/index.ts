import { ChildProcess, fork } from 'child_process'
import { NostrSettings, NostrEvent, SendData, SendInitiator } from "./nostrPool.js"
import { ChildProcessRequest, ChildProcessResponse } from "./handler.js"
import { Utils } from '../helpers/utilsWrapper.js'
import { getLogger, ERROR } from '../helpers/logger.js'
type EventCallback = (event: NostrEvent) => void
type BeaconCallback = (beacon: { content: string, pub: string }) => void

export default class NostrSubprocess {
    childProcess: ChildProcess
    utils: Utils
    awaitingPongs: (() => void)[] = []
    log = getLogger({})
    latestRestart = 0
    private settings: NostrSettings
    private eventCallback: EventCallback
    private beaconCallback: BeaconCallback
    private isShuttingDown = false

    constructor(settings: NostrSettings, utils: Utils, eventCallback: EventCallback, beaconCallback: BeaconCallback) {
        this.utils = utils
        this.settings = settings
        this.eventCallback = eventCallback
        this.beaconCallback = beaconCallback
        this.startSubProcess()
    }

    private cleanupProcess() {
        if (this.childProcess) {
            this.childProcess.removeAllListeners()
            if (!this.childProcess.killed) {
                this.childProcess.kill('SIGTERM')
            }
        }
    }

    private startSubProcess() {
        this.cleanupProcess()

        this.childProcess = fork("./build/src/services/nostr/handler")

        this.childProcess.on("error", (error) => {
            this.log(ERROR, "nostr subprocess error", error)
        })

        this.childProcess.on("exit", (code, signal) => {
            if (this.isShuttingDown) {
                this.log("nostr subprocess stopped")
                return
            }

            if (code === 0) {
                this.log("nostr subprocess exited cleanly")
                return
            }

            this.log(ERROR, `nostr subprocess exited with code ${code} and signal ${signal}`)

            const now = Date.now()
            if (now - this.latestRestart < 5000) {
                this.log(ERROR, "nostr subprocess exited too quickly, not restarting")
                throw new Error("nostr subprocess crashed repeatedly")
            }

            this.log("restarting nostr subprocess...")
            this.latestRestart = now
            setTimeout(() => this.startSubProcess(), 100)
        })

        this.childProcess.on("message", (message: ChildProcessResponse) => {
            switch (message.type) {
                case 'ready':
                    this.sendToChildProcess({ type: 'settings', settings: this.settings })
                    break;
                case 'event':
                    this.eventCallback(message.event)
                    break
                case 'processMetrics':
                    this.utils.tlvStorageFactory.ProcessMetrics(message.metrics, 'nostr')
                    break
                case 'pong':
                    this.awaitingPongs.forEach(resolve => resolve())
                    this.awaitingPongs = []
                    break
                case 'beacon':
                    this.beaconCallback({ content: message.content, pub: message.pub })
                    break
                default:
                    console.error("unknown nostr event response", message)
                    break;
            }
        })
    }

    sendToChildProcess(message: ChildProcessRequest) {
        if (this.childProcess && !this.childProcess.killed) {
            this.childProcess.send(message)
        }
    }

    Reset(settings: NostrSettings) {
        this.settings = settings
        this.sendToChildProcess({ type: 'settings', settings })
    }

    Ping() {
        this.sendToChildProcess({ type: 'ping' })
        return new Promise<void>((resolve) => {
            this.awaitingPongs.push(resolve)
        })
    }

    Send(initiator: SendInitiator, data: SendData, relays?: string[]) {
        this.sendToChildProcess({ type: 'send', data, initiator, relays })
    }

    Stop() {
        this.isShuttingDown = true
        this.cleanupProcess()
    }
}
