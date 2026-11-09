import { CLINK_DEBIT_KIND, CLINK_ENROLL_KIND, CLINK_MANAGE_KIND, CLINK_OFFER_KIND } from "../CLINK/clinkConstants.js"
import Main from "../main/index.js"
import { ClinkOfferResponse, validateOfferReq } from "../CLINK/offerTypes.js"
import { ClinkManageResponse, validateManageReq } from "../CLINK/manageTypes.js"
import { ClinkDebitResponse, validateDebitReq } from "../CLINK/debitTypes.js"
import { ClinkEnrollResponse, validateEnrollReq } from "../CLINK/enrollTypes.js"
import { ClinkCtx, ClinkError } from "../CLINK/clinkTypes.js"

export type ClinkRequest = {
    ctx: ClinkCtx,
    req: object
}
type ClinkResponses = ClinkOfferResponse | ClinkManageResponse | ClinkDebitResponse | ClinkEnrollResponse
export type ClinkRouter = (ctx: ClinkCtx, kind: number, req: object) => Promise<ClinkResponses | null>

export const newClinkRouter = (mainHandler: Main): ClinkRouter => {
    return (ctx: ClinkCtx, kind: number, req: object) => {
        switch (kind) {
            case CLINK_OFFER_KIND:
                const nofferData = validateOfferReq(req)
                return mainHandler.offerManager.HandleClinkOffer(ctx, nofferData)
            case CLINK_MANAGE_KIND:
                const nmanageReq = validateManageReq(req)
                return mainHandler.managementManager.HandleClinkManage(ctx, nmanageReq)
            case CLINK_DEBIT_KIND:
                const ndebitData = validateDebitReq(req)
                return mainHandler.debitManager.HandleClinkDebit(ctx, ndebitData)
            case CLINK_ENROLL_KIND:
                const enrollReq = validateEnrollReq(req)
                return mainHandler.enrollManager.HandleClinkEnroll(ctx, enrollReq)
            default:
                throw new ClinkError("Invalid Request: unsupported kind", 6)
        }
    }
}
