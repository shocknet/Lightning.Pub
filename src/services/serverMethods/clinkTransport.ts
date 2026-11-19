import { getLogger, ERROR, PubLogger } from "../helpers/logger.js"
import { NostrEvent } from "../nostr/nostrPool.js"
import { ClinkRouter } from "./clinkRouter.js"
import { ClinkError, encodeClinkResponse, toClinkCtx, ClinkSend } from "../CLINK/clinkTypes.js"
import { CLINK_OFFER_KIND } from "../CLINK/clinkConstants.js"

const unknownError = () => {
    return {
        res: "GFY",
        code: 2,
        error: "Temporary Failure",
    }
}

const tryParse = (log: PubLogger, data: string, kind: number) => {
    try {
        return JSON.parse(data)
    } catch (e: any) {
        log("invalid clink request body", e.message || e)
        throw new ClinkError("Invalid Request: malformed request", kind === CLINK_OFFER_KIND ? 1 : 6)
    }
}

export const newClinkTransport = (clinkHandler: ClinkRouter) => {
    const log = getLogger({ component: "clinkTransport" })

    return async (event: NostrEvent, send: ClinkSend): Promise<void> => {
        try {
            const req = tryParse(log, event.content, event.kind)
            const body = await clinkHandler(toClinkCtx(event), event.kind, req)
            if (body == null) {
                return
            }
            send(encodeClinkResponse(event.kind, body, event))
            return
        } catch (e: any) {
            log(ERROR, "error in clink transport", e.message || e)
            if (e instanceof ClinkError) {
                send(encodeClinkResponse(event.kind, e.getPayload(), event))
            } else {
                send(encodeClinkResponse(event.kind, unknownError(), event))
            }
            return
        }
    }
}
