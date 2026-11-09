/**
 * Admin swaps are tagged with ADMIN_SWAP_OWNER_ID in storage. That string is
 * injected only by admin RPCs (source: 'admin'). User RPCs must never treat a
 * matching application-user identifier as the admin actor — including existing
 * or restored accounts named "system:admin".
 */
export const ADMIN_SWAP_OWNER_ID = 'system:admin'
export const LEGACY_ADMIN_SWAP_OWNER_ID = 'admin'

export type SwapActorSource = 'user' | 'admin'
export const ADMIN_SWAP_ACTOR: SwapActorSource = 'admin'

export const isAdminSwapOwner = (appUserId: string): boolean =>
    appUserId === ADMIN_SWAP_OWNER_ID || appUserId === LEGACY_ADMIN_SWAP_OWNER_ID

export const swapOwnerIds = (appUserId: string): string[] =>
    appUserId === ADMIN_SWAP_OWNER_ID ? [ADMIN_SWAP_OWNER_ID, LEGACY_ADMIN_SWAP_OWNER_ID] : [appUserId]

export const isReservedAppUserIdentifier = (identifier: string): boolean => {
    const id = identifier.trim().toLowerCase()
    return id === LEGACY_ADMIN_SWAP_OWNER_ID || id === ADMIN_SWAP_OWNER_ID || id.startsWith('system:')
}

export const assertUserSwapActor = (appUserId: string) => {
    if (!appUserId || isReservedAppUserIdentifier(appUserId)) {
        throw new Error('reserved user identifier')
    }
}

export const assertAdminSwapActor = (appUserId: string) => {
    if (appUserId !== ADMIN_SWAP_OWNER_ID) {
        throw new Error('reserved user identifier')
    }
}

export const assertSwapActor = (appUserId: string, source: SwapActorSource = 'user') => {
    if (source === 'admin') {
        assertAdminSwapActor(appUserId)
        return
    }
    assertUserSwapActor(appUserId)
}
