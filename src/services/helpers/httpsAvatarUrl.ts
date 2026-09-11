export const MAX_AVATAR_URL_LEN = 2048

export const trimAvatarUrl = (url: string) => url.trim()

const parsedHttpsAvatar = (url: string): URL | undefined => {
    if (!url || url.length > MAX_AVATAR_URL_LEN || /\s/.test(url)) {
        return undefined
    }
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== "https:") {
            return undefined
        }
        if (parsed.username || parsed.password) {
            return undefined
        }
        if (!parsed.hostname) {
            return undefined
        }
        return parsed
    } catch {
        return undefined
    }
}

/** Empty is allowed (no avatar). Non-empty must be a https URL with a host and no credentials. */
export const isHttpsAvatarUrl = (url: string): boolean => {
    const trimmed = trimAvatarUrl(url)
    if (!trimmed) {
        return true
    }
    return !!parsedHttpsAvatar(trimmed)
}

export const assertAvatarUrl = (url: string) => {
    if (!isHttpsAvatarUrl(url)) {
        throw new Error("avatar URL must be https")
    }
}
