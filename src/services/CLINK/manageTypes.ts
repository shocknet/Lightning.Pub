import {
    NmanageFailure, NmanageRequest as SdkNmanageRequest, NmanageSuccess as SdkNmanageSuccess,
    NmanageCreateOffer as SdkNmanageCreateOffer, NmanageUpdateOffer as SdkNmanageUpdateOffer,
    OfferFields as SdkOfferFields, OfferData as SdkOfferData, validateNmanageRequest,
} from "@shocknet/clink-sdk"
import { ClinkError } from "./clinkTypes.js"

// Remove these callback overrides when Pub adopts the SDK release with optional callbacks.
export type OfferFields = Omit<SdkOfferFields, "callback_url"> & { callback_url?: string | null }
export type OfferData = Omit<SdkOfferData, "callback_url"> & { callback_url?: string | null }
export type NmanageCreateOffer = Omit<SdkNmanageCreateOffer, "offer"> & { offer: { fields: OfferFields } }
export type NmanageUpdateOffer = Omit<SdkNmanageUpdateOffer, "offer"> & { offer: { id: string, fields: OfferFields } }
export type NmanageRequest = Exclude<SdkNmanageRequest, { action: "create" | "update" }> | NmanageCreateOffer | NmanageUpdateOffer
export type NmanageSuccess = Omit<SdkNmanageSuccess, "details"> & { details?: OfferData | OfferData[] }

export type ClinkManageResponse = NmanageSuccess

export const validateManageReq = (req: unknown): NmanageRequest => {
    try {
        let validationInput = req
        if (req && typeof req === "object" && "action" in req && (req.action === "create" || req.action === "update") &&
            "offer" in req && req.offer && typeof req.offer === "object" && "fields" in req.offer &&
            req.offer.fields && typeof req.offer.fields === "object" && !Array.isArray(req.offer.fields)) {
            const fields = req.offer.fields as Record<string, unknown>
            if (fields.callback_url === undefined || fields.callback_url === null) {
                // The installed SDK still requires a string. Validate a copy, retaining omission/null in the real request.
                validationInput = { ...req, offer: { ...req.offer, fields: { ...fields, callback_url: "" } } }
            }
        }
        validateNmanageRequest(validationInput)
        return req as NmanageRequest
    } catch (e: any) {
        throw new NmanageError({ code: 6, message: e?.message || "Invalid Request" })
    }
}

type ManageErrorOpts = { field?: string, retry_after?: number }

export class NmanageError extends ClinkError {
    opts: ManageErrorOpts | undefined
    constructor(args: { code: number, message?: string, opts?: ManageErrorOpts }) {
        const { code, message, opts } = args
        super(message || codeToMessage(code), code)
        this.opts = opts
    }
    getPayload = (): NmanageFailure => {
        const payload: NmanageFailure = {
            res: "GFY",
            code: this.code,
            error: this.message,
        }
        if (this.opts?.field) {
            payload.field = this.opts.field
        }
        if (this.opts?.retry_after !== undefined) {
            payload.retry_after = this.opts.retry_after
        }
        return payload
    }
}

const codeToMessage = (code: number) => {
    switch (code) {
        case 1: return "Request Denied"
        case 2: return "Temporary Failure"
        case 3: return "Expired Request"
        case 4: return "Rate Limited"
        case 5: return "Invalid Field or Value"
        case 6: return "Invalid Request"
        default: return "unknown error code" + code
    }
}
