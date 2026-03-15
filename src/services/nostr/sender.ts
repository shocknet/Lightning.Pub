import { NostrSend, SendData, SendInitiator } from "./nostrPool.js"
import { ERROR, getLogger } from "../helpers/logger.js"
export class NostrSender {
    private _nostrSend: NostrSend = async () => { throw new Error('nostr send not initialized yet') }
    private isReady: boolean = false
    private onReadyCallbacks: (() => void)[] = []
    private pendingSends: { initiator: SendInitiator, data: SendData, relays?: string[] | undefined }[] = []
    private log = getLogger({ component: "nostrSender" })

    AttachNostrSend(nostrSend: NostrSend) {
        this._nostrSend = nostrSend
        this.isReady = true
        this.onReadyCallbacks.forEach(cb => cb())
        this.onReadyCallbacks = []
        // Process pending sends with proper error handling
        this.pendingSends.forEach(send => {
            this._nostrSend(send.initiator, send.data, send.relays).catch(e => {
                this.log(ERROR, "failed to send pending event", e.message || e)
            })
        })
        this.pendingSends = []
    }
    OnReady(callback: () => void) {
        if (this.isReady) {
            callback()
        } else {
            this.onReadyCallbacks.push(callback)
        }
    }
    Send(initiator: SendInitiator, data: SendData, relays?: string[] | undefined): void {
        if (!this.isReady) {
            this.log("tried to send before nostr was ready, caching request")
            this.pendingSends.push({ initiator, data, relays })
            return
        }
        // Fire and forget but log errors
        this._nostrSend(initiator, data, relays).catch(e => {
            this.log(ERROR, "failed to send event", e.message || e)
        })
    }
    IsReady() {
        return this.isReady
    }
}