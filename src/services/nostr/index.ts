import { ChildProcess, fork } from 'child_process'
import { EnvMustBeNonEmptyString } from "../helpers/envParser.js"
import { NostrSettings, NostrEvent, ChildProcessRequest, ChildProcessResponse, SendData, SendInitiator } from "./handler.js"
import { Utils } from '../helpers/utilsWrapper.js'
type EventCallback = (event: NostrEvent) => void

const getEnvOrDefault = (name: string, defaultValue: string): string => {
    return process.env[name] || defaultValue;
}

export const LoadNosrtSettingsFromEnv = (test = false) => {
    const relaysEnv = getEnvOrDefault("NOSTR_RELAYS", "wss://relay.lightning.pub");
    return {
        relays: relaysEnv.split(' ')
    }
}

export default class NostrSubprocess {
    settings: NostrSettings
    childProcess: ChildProcess
    utils: Utils
    constructor(settings: NostrSettings, utils: Utils, eventCallback: EventCallback) {
        this.utils = utils
        this.childProcess = fork("./build/src/services/nostr/handler")
        this.childProcess.on("error", console.error)
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
                default:
                    console.error("unknown nostr event response", message)
                    break;
            }
        })
    }
    sendToChildProcess(message: ChildProcessRequest) {
        this.childProcess.send(message)
    }

    Send(initiator: SendInitiator, data: SendData, relays?: string[]) {
        this.sendToChildProcess({ type: 'send', data, initiator, relays })
    }
    Stop() {
        this.childProcess.kill()
    }
}
