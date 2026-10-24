export const DEFAULT_PAGE_SIZE = 20
export const DEFAULT_LND_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 50
export const MAX_LIQUIDITY_PAGE_SIZE = 40

export const clampPageLimit = (value: number | undefined, defaultLimit: number, maxLimit: number): number =>
    Math.min(Math.max(value ?? defaultLimit, 1), maxLimit)

