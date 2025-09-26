import { ChildProcess, fork } from 'child_process'
import { EnvCanBeInteger, EnvMustBeNonEmptyString } from "../helpers/envParser.js"
import { NostrSettings, NostrEvent, ChildProcessRequest, ChildProcessResponse, SendData, SendInitiator } from "./handler.js"
import { Utils } from '../helpers/utilsWrapper.js'
import {getLogger, ERROR} from '../helpers/logger.js'
type EventCallback = (event: NostrEvent) => void





export default class NostrSubprocess {
    settings: NostrSettings
    childProcess: ChildProcess
    utils: Utils
    awaitingPongs: (() => void)[] = []
    log = getLogger({})
    constructor(settings: NostrSettings, utils: Utils, eventCallback: EventCallback) {
        this.utils = utils
        this.childProcess = fork("./build/src/services/nostr/handler")
        this.childProcess.on("error", (error) => {
            this.log(ERROR, "nostr subprocess error", error)
            throw error
        })
        
        this.childProcess.on("exit", (code) => {
            this.log(ERROR, "nostr subprocess exited with code", `nostr subprocess exited with code ${code}`)
        })

        this.childProcess.on("message", (message: ChildProcessResponse) => {
            switch (message.type) {
                case 'ready':
                    this.sendToChildProcess({ type: 'settings', settings: settings })
                    break;
                case 'event':
                    eventCallback(message.event)
                    break
                case 'processMetrics':
                    this.utils.tlvStorageFactory.ProcessMetrics(message.metrics, 'nostr')
                    break
                case 'pong':
                    this.awaitingPongs.forEach(resolve => resolve())
                    this.awaitingPongs = []
                    break
                default:
                    console.error("unknown nostr event response", message)
                    break;
            }
        })
    }
    sendToChildProcess(message: ChildProcessRequest) {
        this.childProcess.send(message)
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
        this.childProcess.kill()
    }
}
