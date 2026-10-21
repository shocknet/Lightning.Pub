import express, { Application, Request, Response } from "express"
import {
    MAX_AVATAR_BYTES,
    avatarSizeError,
    uploadAvatarToNostrcheck,
} from "./avatarUpload.js"

const isTooLarge = (err: unknown): boolean => {
    if (!err || typeof err !== "object") return false
    const row = err as { type?: string, status?: number }
    return row.type === "entity.too.large" || row.status === 413
}

const readBody = (req: Request, res: Response, next: (err?: unknown) => void) => {
    express.raw({ type: () => true, limit: MAX_AVATAR_BYTES })(req, res, (err) => {
        if (!err) {
            next()
            return
        }
        const reason = isTooLarge(err) ? avatarSizeError : "Could not read that file"
        res.status(400).json({ status: "ERROR", reason })
    })
}

const uploadError = (err: unknown): string => {
    return err instanceof Error ? err.message : "Upload failed"
}

export const registerAvatarUploadRoute = (app: Application, loadNodeKey: () => Promise<Uint8Array>) => {
    const sendUpload = async (req: Request, res: Response) => {
        try {
            const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
            const secretKey = await loadNodeKey()
            const url = await uploadAvatarToNostrcheck(body, String(req.headers["content-type"] || ""), undefined, secretKey)
            res.json({ status: "OK", url })
        } catch (err) {
            res.status(400).json({ status: "ERROR", reason: uploadError(err) })
        }
    }
    app.post("/wizard/avatar_upload", readBody, sendUpload)
}
