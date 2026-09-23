import { NofferData } from "@shocknet/clink-sdk"
import { ClinkError } from "./clinkTypes.js"

export type ClinkOfferResponse = { bolt11: string }

export const validateOfferReq = (req: unknown): NofferData => {
    if (req == null || typeof req !== "object" || Array.isArray(req)) {
        throw new NofferError({ code: 1, message: "invalid offer request" })
    }
    const offerReq = req as Record<string, unknown>
    if (typeof offerReq.offer !== "string" || offerReq.offer === "") {
        throw new NofferError({ code: 1, message: "missing offer" })
    }
    if (offerReq.amount_sats !== undefined && (typeof offerReq.amount_sats !== "number" || !Number.isFinite(offerReq.amount_sats))) {
        throw new NofferError({ code: 1, message: "invalid amount_sats" })
    }
    return offerReq as NofferData
}

type OfferErrorOpts = { maxSats?: number, error?: string, payer_data?: string[] }

export class NofferError extends ClinkError {
    opts: OfferErrorOpts | undefined
    constructor(args: { code: number, message?: string, opts?: OfferErrorOpts }) {
        const { code, message, opts } = args
        const m = message || codeToMessage(code)
        super(m, code)
        this.opts = opts
    }
    getPayload = () => {
        const payload: { code: number, error: string, res: string, range?: { min: number, max: number }, payer_data?: string[] } = {
            code: this.code,
            error: this.message,
            res: "GFY",
        }
        if (this.code === 5 && this.opts?.maxSats !== undefined) {
            payload.range = { min: 10, max: this.opts.maxSats }
        }
        if (this.opts?.payer_data?.length) {
            payload.payer_data = this.opts.payer_data
        }
        return payload
    }
}

const codeToMessage = (code: number) => {
    switch (code) {
        case 1: return 'Invalid Offer'
        case 2: return 'Temporary Failure'
        case 3: return 'Expired Offer'
        case 4: return 'Unsupported Feature'
        case 5: return 'Invalid Amount'
        default: return "unknown error code" + code
    }
}
