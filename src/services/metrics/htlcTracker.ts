import Storage from '../storage/index.js'
import { ForwardEvent, HtlcEvent, HtlcEvent_EventType } from "../../../proto/lnd/router.js";
import { getLogger } from "../helpers/logger.js";
type EventInfo = {
    eventType: HtlcEvent_EventType
    outgoingHtlcId: number
    incomingHtlcId: number
    outgoingChannelId: number
    incomingChannelId: number
}
export default class HtlcTracker {
    storage: Storage
    pendingSendHtlcs: Map<number, number> = new Map()
    pendingReceiveHtlcs: Map<number, number> = new Map()
    pendingForwardHtlcs: Map<number, number> = new Map()
    constructor(storage: Storage) {
        this.storage = storage
    }
    log = getLogger({ appName: 'htlcTracker' })
    onHtlcEvent = async (htlc: HtlcEvent) => {
        const htlcEvent = htlc.event
        if (htlcEvent.oneofKind === 'subscribedEvent') {
            this.log("htlc subscribed")
            return
        }
        const outgoingHtlcId = Number(htlc.outgoingHtlcId)
        const incomingHtlcId = Number(htlc.incomingHtlcId)
        const outgoingChannelId = Number(htlc.outgoingChannelId)
        const incomingChannelId = Number(htlc.incomingChannelId)
        const info: EventInfo = { eventType: htlc.eventType, outgoingChannelId, incomingChannelId, outgoingHtlcId, incomingHtlcId }
        switch (htlcEvent.oneofKind) {
            case 'forwardEvent':
                return this.handleForward(htlcEvent.forwardEvent, info)
            case 'forwardFailEvent':
                return this.handleFailure({ ...info, failureReason: 'forwardFailEvent' })
            case 'linkFailEvent':
                return this.handleFailure({ ...info, failureReason: htlcEvent.linkFailEvent.failureString || 'linkFailEvent' })
            case 'finalHtlcEvent':
                if (!htlcEvent.finalHtlcEvent.settled) {
                    return this.handleFailure({ ...info, failureReason: 'finalHtlcEvent' })
                } else {
                    return this.handleSuccess(info)
                }
            case 'settleEvent':
                return this.handleSuccess(info)
            default:
                this.log("unknown htlc event type")
        }
    }

    handleForward = (fwe: ForwardEvent, { eventType, outgoingHtlcId, incomingHtlcId }: EventInfo) => {
        this.log("new forward event, currently tracked htlcs: (s,r,f)", this.pendingSendHtlcs.size, this.pendingReceiveHtlcs.size, this.pendingForwardHtlcs.size)
        const { info } = fwe
        const incomingAmtMsat = info ? Number(info.incomingAmtMsat) : 0
        const outgoingAmtMsat = info ? Number(info.outgoingAmtMsat) : 0
        if (eventType === HtlcEvent_EventType.SEND) {
            this.pendingSendHtlcs.set(outgoingHtlcId, outgoingAmtMsat - incomingAmtMsat)
        } else if (eventType === HtlcEvent_EventType.RECEIVE) {
            this.pendingReceiveHtlcs.set(incomingHtlcId, incomingAmtMsat - outgoingAmtMsat)
        } else if (eventType === HtlcEvent_EventType.FORWARD) {
            this.pendingForwardHtlcs.set(outgoingHtlcId, outgoingAmtMsat - incomingAmtMsat)
        } else {
            this.log("unknown htlc event type for forward event")
        }
    }

    handleFailure = ({ eventType, outgoingHtlcId, incomingHtlcId, incomingChannelId, outgoingChannelId, failureReason }: EventInfo & { failureReason: string }) => {
        if (eventType === HtlcEvent_EventType.SEND && this.deleteMapEntry(outgoingHtlcId, this.pendingSendHtlcs) !== null) {
            return this.incrementSendFailures(outgoingChannelId, failureReason)
        }
        if (eventType === HtlcEvent_EventType.RECEIVE && this.deleteMapEntry(incomingHtlcId, this.pendingReceiveHtlcs) !== null) {
            return this.incrementReceiveFailures(incomingChannelId, failureReason)
        }
        if (eventType === HtlcEvent_EventType.FORWARD) {
            const amt = this.deleteMapEntry(outgoingHtlcId, this.pendingForwardHtlcs)
            if (amt !== null) {
                return this.incrementForwardFailures(incomingChannelId, outgoingChannelId, amt, failureReason)
            }
        }
        if (eventType === HtlcEvent_EventType.UNKNOWN) {
            const fwdAmt = this.deleteMapEntry(outgoingHtlcId, this.pendingForwardHtlcs)
            if (fwdAmt !== null) {
                return this.incrementForwardFailures(incomingChannelId, outgoingChannelId, fwdAmt, failureReason)
            }
            if (this.deleteMapEntry(outgoingHtlcId, this.pendingSendHtlcs) !== null) {
                return this.incrementSendFailures(outgoingChannelId, failureReason)
            }
            if (this.deleteMapEntry(incomingHtlcId, this.pendingReceiveHtlcs) !== null) {
                return this.incrementReceiveFailures(incomingChannelId, failureReason)
            }
        }
        this.log("unknown htlc event type for failure event")
    }

    handleSuccess = ({ eventType, outgoingHtlcId, incomingHtlcId }: EventInfo) => {
        if (eventType === HtlcEvent_EventType.SEND) {
            this.deleteMapEntry(outgoingHtlcId, this.pendingSendHtlcs)
        } else if (eventType === HtlcEvent_EventType.RECEIVE) {
            this.deleteMapEntry(incomingHtlcId, this.pendingReceiveHtlcs)
        } else if (eventType === HtlcEvent_EventType.FORWARD) {
            this.deleteMapEntry(outgoingHtlcId, this.pendingForwardHtlcs)
        } else if (eventType === HtlcEvent_EventType.UNKNOWN) {
            if (this.deleteMapEntry(outgoingHtlcId, this.pendingSendHtlcs) !== null) return
            if (this.deleteMapEntry(incomingHtlcId, this.pendingReceiveHtlcs) !== null) return
            if (this.deleteMapEntry(outgoingHtlcId, this.pendingForwardHtlcs) !== null) return
        } else {
            this.log("unknown htlc event type for success event")
        }
    }

    deleteMapEntry = (key: number, map: Map<number, number>) => {
        if (!map.has(key)) {
            return null
        }
        const v = map.get(key)
        map.delete(key)
        return v || null
    }

    incrementSendFailures = async (outgoingChannelId: number, reason: string) => {
        await this.storage.metricsStorage.updateHtlcErrors(getToday(), d => {
            d.send_failures++
            d.failed_destinations[outgoingChannelId] = (d.failed_destinations[outgoingChannelId] || 0) + 1
            d.errors[reason] = (d.errors[reason] || 0) + 1
            return d
        })
    }
    incrementReceiveFailures = async (incomingChannelId: number, reason: string) => {
        await this.storage.metricsStorage.updateHtlcErrors(getToday(), d => {
            d.receive_failures++
            d.failed_sources[incomingChannelId] = (d.failed_sources[incomingChannelId] || 0) + 1
            d.errors[reason] = (d.errors[reason] || 0) + 1
            return d
        })
    }
    incrementForwardFailures = async (incomingChannelId: number, outgoingChannelId: number, amt: number, reason: string) => {
        await this.storage.metricsStorage.updateHtlcErrors(getToday(), d => {
            d.forward_failures++
            d.forward_failures_amt += amt
            d.failed_sources[incomingChannelId] = (d.failed_sources[incomingChannelId] || 0) + 1
            d.failed_destinations[outgoingChannelId] = (d.failed_destinations[outgoingChannelId] || 0) + 1
            d.errors[reason] = (d.errors[reason] || 0) + 1
            return d
        })
    }
}

const getToday = () => {
    const now = new Date()
    return `${now.getFullYear()}-${z(now.getMonth() + 1)}-${z(now.getDate())}`

}
const z = (n: number) => n < 10 ? `0${n}` : `${n}`