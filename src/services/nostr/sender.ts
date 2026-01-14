import { NostrSend, SendData, SendInitiator } from "./nostrPool.js"
import { getLogger } from "../helpers/logger.js"
export class NostrSender {
    private _nostrSend: NostrSend = () => { throw new Error('nostr send not initialized yet') }
    private isReady: boolean = false
    private onReadyCallbacks: (() => void)[] = []
    private pendingSends: { initiator: SendInitiator, data: SendData, relays?: string[] | undefined }[] = []
    private log = getLogger({ component: "nostrSender" })

    AttachNostrSend(nostrSend: NostrSend) {
        this._nostrSend = nostrSend
        this.isReady = true
        this.onReadyCallbacks.forEach(cb => cb())
        this.onReadyCallbacks = []
        this.pendingSends.forEach(send => this._nostrSend(send.initiator, send.data, send.relays))
        this.pendingSends = []
    }
    OnReady(callback: () => void) {
        if (this.isReady) {
            callback()
        } else {
            this.onReadyCallbacks.push(callback)
        }
    }
    Send(initiator: SendInitiator, data: SendData, relays?: string[] | undefined) {
        if (!this.isReady) {
            this.log("tried to send before nostr was ready, caching request")
            this.pendingSends.push({ initiator, data, relays })
            return
        }
        this._nostrSend(initiator, data, relays)
    }
    IsReady() {
        return this.isReady
    }
}