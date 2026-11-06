/**
 * Admin swaps must not share the application-user identifier space.
 * Callers can choose any app user id, including the historical "admin" string.
 */
export const ADMIN_SWAP_OWNER_ID = 'system:admin'
export const LEGACY_ADMIN_SWAP_OWNER_ID = 'admin'

export const isAdminSwapOwner = (appUserId: string): boolean =>
    appUserId === ADMIN_SWAP_OWNER_ID || appUserId === LEGACY_ADMIN_SWAP_OWNER_ID

export const swapOwnerIds = (appUserId: string): string[] =>
    appUserId === ADMIN_SWAP_OWNER_ID ? [ADMIN_SWAP_OWNER_ID, LEGACY_ADMIN_SWAP_OWNER_ID] : [appUserId]

export const isReservedAppUserIdentifier = (identifier: string): boolean => {
    const id = identifier.trim().toLowerCase()
    return id === LEGACY_ADMIN_SWAP_OWNER_ID || id === ADMIN_SWAP_OWNER_ID || id.startsWith('system:')
}

export const assertSwapActor = (appUserId: string) => {
    if (appUserId === ADMIN_SWAP_OWNER_ID) {
        return
    }
    if (!appUserId || isReservedAppUserIdentifier(appUserId)) {
        throw new Error('reserved user identifier')
    }
}
