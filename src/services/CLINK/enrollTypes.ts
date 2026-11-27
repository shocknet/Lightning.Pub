import { ClinkError } from "./clinkTypes.js"

export type EnrollOk = { res: "ok", noffer: string, ndebit: string, nmanage: string }
export type EnrollGfy = {
    res: "GFY"
    code: number
    error: string
    required_difficulty?: number
    retry_after?: number
    delta?: { max_delta_ms: number, actual_delta_ms: number }
}
export type ClinkEnrollResponse = EnrollOk

export type EnrollErrorOpts = {
    required_difficulty?: number
    retry_after?: number
    delta?: { max_delta_ms: number, actual_delta_ms: number }
}

export class EnrollError extends ClinkError {
    opts: EnrollErrorOpts | undefined
    constructor(args: { code: number, message?: string, opts?: EnrollErrorOpts }) {
        const { code, message, opts } = args
        super(message || enrollErrors[code] || enrollErrors[6], code)
        this.opts = opts
    }
    getPayload = (): EnrollGfy => {
        const payload: EnrollGfy = {
            res: "GFY",
            code: this.code,
            error: this.message,
        }
        if (this.opts?.required_difficulty !== undefined) {
            payload.required_difficulty = this.opts.required_difficulty
        }
        if (this.opts?.retry_after !== undefined) {
            payload.retry_after = this.opts.retry_after
        }
        if (this.opts?.delta) {
            payload.delta = this.opts.delta
        }
        return payload
    }
}

export const validateEnrollReq = (req: unknown): object => {
    if (req === null || typeof req !== "object" || Array.isArray(req)) {
        throw new EnrollError({ code: 6 })
    }
    return req
}

const enrollErrors: Record<number, string> = {
    1: "Denied / not allowed",
    2: "Temporary Failure / Service unavailable",
    3: "Expired Request",
    4: "Rate limited",
    5: "Insufficient proof of work",
    6: "Invalid Request",
}
