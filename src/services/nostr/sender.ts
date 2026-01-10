import { NostrSend, SendData, SendInitiator } from "./nostrPool.js"
export class NostrSender {
    private _nostrSend: NostrSend = () => { throw new Error('nostr send not initialized yet') }
    private isReady: boolean = false
    private onReadyCallbacks: (() => void)[] = []
    AttachNostrSend(nostrSend: NostrSend) {
        this._nostrSend = nostrSend
        this.isReady = true
        this.onReadyCallbacks.forEach(cb => cb())
        this.onReadyCallbacks = []
    }
    OnReady(callback: () => void) {
        if (this.isReady) {
            callback()
        } else {
            this.onReadyCallbacks.push(callback)
        }
    }
    Send(initiator: SendInitiator, data: SendData, relays?: string[] | undefined) {
        if (!this._nostrSend) {
            throw new Error("No nostrSend attached")
        }
        this._nostrSend(initiator, data, relays)
    }
    IsReady() {
        return this.isReady
    }
}