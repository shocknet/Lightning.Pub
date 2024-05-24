import { ChildProcess, fork } from 'child_process'
import { EnvMustBeNonEmptyString } from "../helpers/envParser.js"
import { NostrSettings, NostrEvent, ChildProcessRequest, ChildProcessResponse, SendData, SendInitiator } from "./handler.js"
type EventCallback = (event: NostrEvent) => void
export const LoadNosrtSettingsFromEnv = (test = false) => {
    return {
        relays: EnvMustBeNonEmptyString("NOSTR_RELAYS").split(' ')
    }
}
export default class NostrSubprocess {
    settings: NostrSettings
    childProcess: ChildProcess
    constructor(settings: NostrSettings, eventCallback: EventCallback) {
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