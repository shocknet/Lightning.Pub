export const ADMIN_NODE_NAME_ENV = "DEFAULT_APP_NAME"
export const ADMIN_AUTOMATION_ENV = "DISABLE_LIQUIDITY_PROVIDER"
export const ADMIN_BACKUPS_ENV = "PUSH_BACKUPS_TO_NOSTR"
export const ADMIN_LSP_THRESHOLD_ENV = "LSP_CHANNEL_THRESHOLD"
export const MAX_NODE_NAME_LEN = 64
export const DEFAULT_LSP_CHANNEL_THRESHOLD = 1_000_000
export const MAX_LSP_CHANNEL_THRESHOLD = 100_000_000_000

export const isEnvLocked = (key: string) => !!process.env[key]

/** User-facing "use automation" is the inverse of DISABLE_LIQUIDITY_PROVIDER. Default (no env): on. */
export const automationEnabled = (disableLiquidityProvider: boolean) => !disableLiquidityProvider

export const disableLiquidityFromAutomation = (automate: boolean) => !automate

/** 0 skips auto LSP channel buys in shouldOpenChannel. */
export const lspAutoBuyEnabled = (threshold: number) => threshold > 0

export const persistLspThreshold = (autoBuy: boolean, threshold: number) => {
    if (!autoBuy) return 0
    return threshold > 0 ? threshold : DEFAULT_LSP_CHANNEL_THRESHOLD
}

export const isValidLspThreshold = (threshold: number) =>
    Number.isSafeInteger(threshold) && threshold >= 0 && threshold <= MAX_LSP_CHANNEL_THRESHOLD

export const assertLspThreshold = (threshold: number) => {
    if (!isValidLspThreshold(threshold)) {
        throw new Error("LSP channel threshold must be 0 or a sat amount")
    }
}

export const defaultAppCandidates = (defaultAppName: string) => {
    const fallbacks = ["wallet", "wallet-test"].filter(name => name !== defaultAppName)
    return [defaultAppName, ...fallbacks]
}

export const pickDefaultApp = <T extends { name: string }>(apps: T[], defaultAppName: string): T | undefined => {
    for (const name of defaultAppCandidates(defaultAppName)) {
        const match = apps.find(app => app.name === name)
        if (match) return match
    }
}

export { assertAvatarUrl, isHttpsAvatarUrl, trimAvatarUrl } from "../helpers/httpsAvatarUrl.js"

export const trimNodeName = (name: string) => name.trim()

export const isValidNodeName = (name: string) => {
    const trimmed = trimNodeName(name)
    return trimmed.length > 0 && trimmed.length <= MAX_NODE_NAME_LEN
}

export const assertNodeName = (name: string) => {
    if (!isValidNodeName(name)) {
        throw new Error("node name must be 1-64 characters")
    }
}
