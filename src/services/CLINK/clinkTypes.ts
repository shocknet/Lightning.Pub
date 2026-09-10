import {  UnsignedEvent } from "nostr-tools"
import { NostrEvent } from "../nostr/nostrPool.js"

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

export class ClinkError extends Error {
    code: number
    constructor(message: string, code:number) {
        super(message)
        this.code = code
    }

    getPayload = () => {
        return {code:this.code, error:this.message}
    }
}

export type ClinkSend = (event: UnsignedEvent) => void


export type ClinkCtx = { pub: string, appId: string, eventId: string }

export const toClinkCtx = (event: NostrEvent): ClinkCtx => ({
    pub: event.pub,
    appId: event.appId,
    eventId: event.id,
})

export const encodeClinkResponse = (kind: number, body: unknown, event: NostrEvent): UnsignedEvent => ({
    content: JSON.stringify(body),
    created_at: Math.floor(Date.now() / 1000),
    kind,
    pubkey: "",
    tags: clinkResponseTags(event.pub, event.id),
})