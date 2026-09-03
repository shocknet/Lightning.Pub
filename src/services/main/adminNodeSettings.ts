export const ADMIN_NODE_NAME_ENV = "DEFAULT_APP_NAME"
export const ADMIN_AUTOMATION_ENV = "DISABLE_LIQUIDITY_PROVIDER"
export const ADMIN_BACKUPS_ENV = "PUSH_BACKUPS_TO_NOSTR"
export const MAX_NODE_NAME_LEN = 64

export const isEnvLocked = (key: string) => !!process.env[key]

/** User-facing "use automation" is the inverse of DISABLE_LIQUIDITY_PROVIDER. Default (no env): on. */
export const automationEnabled = (disableLiquidityProvider: boolean) => !disableLiquidityProvider

export const disableLiquidityFromAutomation = (automate: boolean) => !automate

export const defaultAppCandidates = (defaultAppName: string) => ["wallet", "wallet-test", defaultAppName]

export const pickDefaultApp = <T extends { name: string }>(apps: T[], defaultAppName: string): T | undefined =>
    apps.find(app => defaultAppCandidates(defaultAppName).includes(app.name))

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
