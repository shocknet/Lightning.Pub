import { Event } from "nostr-tools"

export const toNip01Event = (event: Event): Event => ({
    id: event.id,
    pubkey: event.pubkey,
    created_at: event.created_at,
    kind: event.kind,
    tags: event.tags,
    content: event.content,
    sig: event.sig,
})
