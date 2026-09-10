import { NofferData } from "@shocknet/clink-sdk"
import Main from "../main/index.js"
import { ERROR, getLogger } from "../helpers/logger.js"
import { NofferError, ClinkOfferResponse, validateOfferReq } from "../CLINK/offerTypes.js"
import { ClinkCtx, ClinkError } from "../CLINK/clinkTypes.js"
 


export type ClinkMethods = {
    Offer: (args: { ctx: ClinkCtx, req: string }) => Promise<ClinkOfferResponse>
}

const log = getLogger({ component: "clinkMethods" })


const tryParse = <T>(data: string) => {
    try {
        return JSON.parse(data) as T
    } catch (e: any) {
        log("invalid clink request body", e.message || e)
        throw new ClinkError("invalid request body", 1)
    }
}

export default (mainHandler: Main): ClinkMethods => {
    return {
        Offer: async ({ ctx, req }) => {
            const data = tryParse<NofferData>(req)
            validateOfferReq(data)
            return mainHandler.offerManager.HandleClinkOffer(ctx, data)
        },
    }
}
