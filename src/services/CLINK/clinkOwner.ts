import { ApplicationUser } from "../storage/entity/ApplicationUser.js"

export const sameHexPub = (a?: string | null, b?: string | null): boolean => {
    if (!a || !b) {
        return false
    }
    return a.toLowerCase() === b.toLowerCase()
}

export const isAccountOwner = (appUser: ApplicationUser, requestorPub: string): boolean => {
    return sameHexPub(appUser.nostr_public_key, requestorPub)
}

export const denyStrangerLiveAuth = (appUser: ApplicationUser): boolean => {
    return !!appUser.owner_only_clink
}
