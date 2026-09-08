import { CLINK_VERSION } from "./clinkConstants.js"

export const clinkResponseTags = (toPub: string, requestEventId: string): string[][] => {
    return [
        ["p", toPub],
        ["e", requestEventId],
        ["clink_version", CLINK_VERSION],
    ]
}

export const clinkVersionFromTags = (tags: string[][] | undefined): string | undefined => {
    const tag = tags?.find(t => t[0] === "clink_version" && t[1])
    return tag?.[1]
}
