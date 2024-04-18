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
        getLogger({ appName: 'debugHtlcs' })(htlc)
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
                return this.handleFailure(info)
            case 'linkFailEvent':
                return this.handleFailure(info)
            case 'finalHtlcEvent':
                if (!htlcEvent.finalHtlcEvent.settled) {
                    return this.handleFailure(info)
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

    handleFailure = ({ eventType, outgoingHtlcId, incomingHtlcId, incomingChannelId, outgoingChannelId }: EventInfo) => {
        if (eventType === HtlcEvent_EventType.SEND && this.deleteMapEntry(outgoingHtlcId, this.pendingSendHtlcs) !== null) {
            return this.incrementSendFailures(outgoingChannelId)
        }
        if (eventType === HtlcEvent_EventType.RECEIVE && this.deleteMapEntry(incomingHtlcId, this.pendingReceiveHtlcs) !== null) {
            return this.incrementReceiveFailures(incomingChannelId)
        }
        if (eventType === HtlcEvent_EventType.FORWARD) {
            const amt = this.deleteMapEntry(outgoingHtlcId, this.pendingForwardHtlcs)
            if (amt !== null) {
                return this.incrementForwardFailures(incomingChannelId, outgoingChannelId, amt)
            }
        }
        if (eventType === HtlcEvent_EventType.UNKNOWN) {
            const fwdAmt = this.deleteMapEntry(outgoingHtlcId, this.pendingForwardHtlcs)
            if (fwdAmt !== null) {
                return this.incrementForwardFailures(incomingChannelId, outgoingChannelId, fwdAmt)
            }
            if (this.deleteMapEntry(outgoingHtlcId, this.pendingSendHtlcs) !== null) {
                return this.incrementSendFailures(outgoingChannelId)
            }
            if (this.deleteMapEntry(incomingHtlcId, this.pendingReceiveHtlcs) !== null) {
                return this.incrementReceiveFailures(incomingChannelId)
            }
        }
        this.log("unknown htlc event type for failure event", eventType)
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
            this.log("unknown htlc event type for success event", eventType)
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

    incrementSendFailures = async (outgoingChannelId: number) => {
        await this.storage.metricsStorage.IncrementChannelRouting(outgoingChannelId.toString(), { send_errors: 1 })
    }
    incrementReceiveFailures = async (incomingChannelId: number) => {
        await this.storage.metricsStorage.IncrementChannelRouting(incomingChannelId.toString(), { receive_errors: 1 })
    }
    incrementForwardFailures = async (incomingChannelId: number, outgoingChannelId: number, amt: number) => {
        await this.storage.metricsStorage.IncrementChannelRouting(incomingChannelId.toString(), { forward_errors_as_input: 1, missed_forward_fee_as_input: amt })
        await this.storage.metricsStorage.IncrementChannelRouting(outgoingChannelId.toString(), { forward_errors_as_output: 1, missed_forward_fee_as_output: amt })
    }
}

