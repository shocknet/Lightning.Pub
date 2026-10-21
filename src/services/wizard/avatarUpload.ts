import { createHash } from "node:crypto"
import https from "node:https"
import { finalizeEvent, generateSecretKey } from "nostr-tools"

export const NOSTRCHECK_UPLOAD_URL = "https://cdn.nostrcheck.me/upload"
export const MAX_AVATAR_BYTES = 8 * 1024 * 1024
const UPLOAD_TIMEOUT_MS = 90_000

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"])

export const avatarTypeError = "Choose a PNG, JPEG, WebP, or GIF"
export const avatarSizeError = "Image must be 8 MB or smaller"
export const avatarEmptyError = "That file is empty"
export const avatarHostError = "The image host rejected the upload"
export const avatarLinkError = "The image host did not return a link"
export const avatarSlowError = "The image host took too long. Try again."

export const normalizeAvatarType = (contentType: string): string => {
    return contentType.split(";")[0].trim().toLowerCase()
}

export const assertAvatarUpload = (contentType: string, byteLength: number): string => {
    const type = normalizeAvatarType(contentType)
    if (!ALLOWED_TYPES.has(type)) throw new Error(avatarTypeError)
    if (byteLength <= 0) throw new Error(avatarEmptyError)
    if (byteLength > MAX_AVATAR_BYTES) throw new Error(avatarSizeError)
    return type
}

const sha256Hex = (bytes: Buffer): string => {
    return createHash("sha256").update(bytes).digest("hex")
}

const blossomAuthHeader = (uploadUrl: string, hash: string, secretKey: Uint8Array): string => {
    const expiresAt = Math.floor(Date.now() / 1000) + 5 * 60
    const event = finalizeEvent({
        kind: 24242,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
            ["t", "upload"],
            ["expiration", String(expiresAt)],
            ["server", new URL(uploadUrl).hostname.toLowerCase()],
            ["x", hash],
        ],
        content: "Upload Blob",
    }, secretKey)
    return `Nostr ${Buffer.from(JSON.stringify(event)).toString("base64url")}`
}

const readUploadUrl = (data: unknown): string => {
    const row = Array.isArray(data) ? data[0] : data
    const url = row && typeof row === "object" ? (row as { url?: unknown }).url : undefined
    if (typeof url !== "string" || !url.trim().startsWith("https://")) {
        throw new Error(avatarLinkError)
    }
    return url.trim()
}

export type AvatarPut = (url: string, init: RequestInit) => Promise<Response>

const http1 = new https.Agent({ keepAlive: false })

const putOverHttp1: AvatarPut = (url, init) => {
    const target = new URL(url)
    const body = Buffer.from(init.body as Uint8Array)
    const headers = {
        ...(init.headers as Record<string, string>),
        "Content-Length": String(body.length),
    }
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: target.hostname,
            path: `${target.pathname}${target.search}`,
            method: "PUT",
            agent: http1,
            headers,
            timeout: UPLOAD_TIMEOUT_MS,
            ALPNProtocols: ["http/1.1"],
        } as https.RequestOptions, (res) => {
            const chunks: Buffer[] = []
            res.on("data", (chunk) => chunks.push(chunk))
            res.on("end", () => {
                resolve(new Response(Buffer.concat(chunks), { status: res.statusCode || 500 }))
            })
        })
        req.on("timeout", () => req.destroy(new Error(avatarSlowError)))
        req.on("error", reject)
        req.end(body)
    })
}

export const uploadAvatarToNostrcheck = async (
    bytes: Buffer,
    contentType: string,
    put: AvatarPut = putOverHttp1,
    secretKey: Uint8Array = generateSecretKey(),
): Promise<string> => {
    const type = assertAvatarUpload(contentType, bytes.length)
    const hash = sha256Hex(bytes)
    const response = await put(NOSTRCHECK_UPLOAD_URL, {
        method: "PUT",
        headers: {
            "Content-Type": type,
            "X-SHA-256": hash,
            Authorization: blossomAuthHeader(NOSTRCHECK_UPLOAD_URL, hash, secretKey),
        },
        body: new Uint8Array(bytes),
        redirect: "manual",
    })
    if (!response.ok) throw new Error(avatarHostError)
    return readUploadUrl(await response.json())
}
