import dns from "node:dns"
import http from "node:http"
import https from "node:https"
import { isIP } from "node:net"
import fetch, { RequestInit, Response } from "node-fetch"

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_MAX_REDIRECTS = 3
const URI_TEMPLATE_PLACEHOLDER = "placeholder"

export type SafeOutboundFetchOptions = {
    method?: string
    headers?: Record<string, string>
    rejectUnauthorized?: boolean
    timeoutMs?: number
    maxRedirects?: number
}

export type SafeOutboundFetchResult = {
    status: number
    ok: boolean
}

export class SafeOutboundFetchError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "SafeOutboundFetchError"
    }
}

const blockedHostnames = new Set([
    "metadata.google.internal",
    "metadata.goog",
])

export const isMetadataIPv4 = (ip: string): boolean => {
    const parts = ip.split(".").map(Number)
    if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) {
        return false
    }
    const [a, b, c, d] = parts
    if (a === 169 && b === 254 && c === 169 && d === 254) return true
    if (a === 169 && b === 254 && c === 170 && d === 2) return true
    return false
}

export const isMetadataIPv6 = (ip: string): boolean => {
    const normalized = ip.toLowerCase()
    if (normalized.startsWith("::ffff:")) {
        const mapped = normalized.slice("::ffff:".length)
        if (mapped.includes(".")) {
            return isMetadataIPv4(mapped)
        }
    }
    return false
}

export const isMetadataIp = (ip: string): boolean => {
    const version = isIP(ip)
    if (version === 4) return isMetadataIPv4(ip)
    if (version === 6) return isMetadataIPv6(ip)
    return false
}

export const validateCallbackUrlForEgress = (url: URL): void => {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new SafeOutboundFetchError("callback url protocol must be http or https")
    }
    if (url.username || url.password) {
        throw new SafeOutboundFetchError("callback url must not include credentials")
    }
    const host = url.hostname.toLowerCase()
    if (blockedHostnames.has(host)) {
        throw new SafeOutboundFetchError("callback url hostname is not allowed")
    }
    const ipVersion = isIP(host)
    if (ipVersion === 4 && isMetadataIPv4(host)) {
        throw new SafeOutboundFetchError("callback url resolves to a blocked address")
    }
    if (ipVersion === 6 && isMetadataIPv6(host)) {
        throw new SafeOutboundFetchError("callback url resolves to a blocked address")
    }
}

export const assertCallbackUrlAllowed = (url: string): void => {
    if (!url) {
        return
    }
    const forParse = url.replace(/\{[^}]+\}/g, URI_TEMPLATE_PLACEHOLDER)
    let parsed: URL
    try {
        parsed = new URL(forParse)
    } catch {
        throw new SafeOutboundFetchError("callback url is invalid")
    }
    validateCallbackUrlForEgress(parsed)
}

const safeLookup = (
    hostname: string,
    options: dns.LookupOptions,
    callback: (...args: unknown[]) => void,
) => {
    const returnAll = (options as dns.LookupAllOptions).all === true
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) {
            if (returnAll) {
                callback(err, [])
            } else {
                callback(err, "", 4)
            }
            return
        }
        const records = (addresses as dns.LookupAddress[]).filter(
            record => !isMetadataIp(record.address)
        )
        if (records.length === 0) {
            const blocked = new SafeOutboundFetchError("callback url resolves to a blocked address")
            if (returnAll) {
                callback(blocked, [])
            } else {
                callback(blocked, "", 4)
            }
            return
        }
        if (returnAll) {
            callback(null, records)
            return
        }
        const first = records[0]
        callback(null, first.address, first.family)
    })
}

const createAgent = (protocol: string, rejectUnauthorized: boolean): http.Agent | https.Agent => {
    if (protocol === "https:") {
        return new https.Agent({ rejectUnauthorized, lookup: safeLookup as typeof dns.lookup })
    }
    return new http.Agent({ lookup: safeLookup as typeof dns.lookup })
}

const drainResponseBody = (response: Response): void => {
    response.body?.resume()
}

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
        return await fetch(url, { ...init, signal: controller.signal as RequestInit["signal"] })
    } catch (err: any) {
        if (err?.name === "AbortError") {
            throw new SafeOutboundFetchError(`callback request timed out after ${timeoutMs}ms`)
        }
        throw err
    } finally {
        clearTimeout(timeout)
    }
}

export const safeOutboundFetch = async (
    url: string,
    options: SafeOutboundFetchOptions = {}
): Promise<SafeOutboundFetchResult> => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS
    const rejectUnauthorized = options.rejectUnauthorized ?? true
    let currentUrl = url
    let redirectCount = 0

    while (true) {
        let parsedUrl: URL
        try {
            parsedUrl = new URL(currentUrl)
        } catch {
            throw new SafeOutboundFetchError("callback url is invalid")
        }
        validateCallbackUrlForEgress(parsedUrl)

        const response = await fetchWithTimeout(currentUrl, {
            method: options.method ?? "GET",
            headers: options.headers,
            agent: createAgent(parsedUrl.protocol, rejectUnauthorized),
            redirect: "manual",
        }, timeoutMs)

        if (REDIRECT_STATUSES.has(response.status)) {
            const location = response.headers.get("location")
            drainResponseBody(response)
            if (!location) {
                throw new SafeOutboundFetchError("callback redirect response missing location header")
            }
            redirectCount++
            if (redirectCount > maxRedirects) {
                throw new SafeOutboundFetchError(`callback exceeded max redirects (${maxRedirects})`)
            }
            currentUrl = new URL(location, currentUrl).toString()
            continue
        }

        drainResponseBody(response)
        return { status: response.status, ok: response.ok }
    }
}
