import { UnsignedEvent } from "nostr-tools"
import { NofferData } from "@shocknet/clink-sdk"
import { ERROR, getLogger } from "../helpers/logger.js"
import { CLINK_OFFER_KIND } from "../CLINK/clinkConstants.js"
import { NostrEvent } from "../nostr/nostrPool.js"
import {   ClinkMethods } from "./clinkMethods.js"
import { ClinkError, encodeClinkResponse, toClinkCtx, ClinkSend } from "../CLINK/clinkTypes.js"



const unknownError = () => ({
    code: 2,
    error: "Temporary Failure",
})

export const newClinkTransport =  (methods: ClinkMethods) => {
    const log = getLogger({ component: "clinkTransport" })

    return async (event: NostrEvent, send: ClinkSend): Promise<void> => {
        switch (event.kind) {
            case CLINK_OFFER_KIND: {
                try {
                    if (!methods.Offer) {
                        throw new Error("method: Offer is not implemented")
                    } 
                    const body = await methods.Offer({ ctx: toClinkCtx(event), req:event.content })
                    send(encodeClinkResponse(CLINK_OFFER_KIND, body, event))
                    return
                } catch (e: any) {
                    log(ERROR, "error in clink transport", e.message || e)
                    if (e instanceof ClinkError) {
                        send(encodeClinkResponse(CLINK_OFFER_KIND, e.getPayload(), event))
                    } else {
                        send(encodeClinkResponse(CLINK_OFFER_KIND, unknownError(), event))
                    }
                    return
                } 
            }
            default:
                log(ERROR, `unsupported clink kind: ${event.kind}`)
        }
    }
}
