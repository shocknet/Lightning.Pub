import { StorageTestBase } from "./testBase.js"
import {
    NOSTRCHECK_UPLOAD_URL,
    assertAvatarUpload,
    avatarEmptyError,
    avatarHostError,
    avatarLinkError,
    avatarSizeError,
    avatarTypeError,
    uploadAvatarToNostrcheck,
} from "../services/wizard/avatarUpload.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])

export default async (T: StorageTestBase) => {
    T.d("rejects a file that is not an image")
    T.expect(() => assertAvatarUpload("text/plain", 4)).to.throw(avatarTypeError)

    T.d("rejects an empty image")
    T.expect(() => assertAvatarUpload("image/png", 0)).to.throw(avatarEmptyError)

    T.d("rejects an image over 8 MB")
    T.expect(() => assertAvatarUpload("image/png", 8 * 1024 * 1024 + 1)).to.throw(avatarSizeError)

    T.d("returns the https link from nostrcheck")
    let seenUrl = ""
    let seenAuth = ""
    const url = await uploadAvatarToNostrcheck(png, "image/png; charset=binary", async (target, init) => {
        seenUrl = target
        seenAuth = String((init.headers as Record<string, string>).Authorization || "")
        return new Response(JSON.stringify({ url: "https://cdn.nostrcheck.me/abc.png" }), { status: 200 })
    })
    T.expect(seenUrl).to.equal(NOSTRCHECK_UPLOAD_URL)
    T.expect(seenAuth.startsWith("Nostr ")).to.equal(true)
    T.expect(url).to.equal("https://cdn.nostrcheck.me/abc.png")

    T.d("rejects a host that does not return an https link")
    try {
        await uploadAvatarToNostrcheck(png, "image/png", async () => {
            return new Response(JSON.stringify({ url: "http://cdn.nostrcheck.me/abc.png" }), { status: 200 })
        })
        T.expect(false).to.equal(true)
    } catch (err) {
        T.expect((err as Error).message).to.equal(avatarLinkError)
    }

    T.d("rejects a failed upload")
    try {
        await uploadAvatarToNostrcheck(png, "image/png", async () => new Response("no", { status: 403 }))
        T.expect(false).to.equal(true)
    } catch (err) {
        T.expect((err as Error).message).to.equal(avatarHostError)
    }
}
