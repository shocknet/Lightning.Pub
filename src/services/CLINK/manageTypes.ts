import { NmanageFailure, NmanageRequest, NmanageSuccess, validateNmanageRequest } from "@shocknet/clink-sdk"
import { ClinkError } from "./clinkTypes.js"

export type ClinkManageResponse = NmanageSuccess

export const validateManageReq = (req: unknown): NmanageRequest => {
    try {
        return validateNmanageRequest(req)
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
