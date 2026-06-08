import dns from "node:dns"
import http from "node:http"
import https from "node:https"
import { isIP } from "node:net"
import fetch, { RequestInit, Response } from "node-fetch"

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const DEFAULT_TIMEOUT_MS = 5_000
const DEFAULT_MAX_REDIRECTS = 3

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

export const isBlockedIPv4 = (ip: string): boolean => {
    const parts = ip.split(".").map(Number)
    if (parts.length !== 4 || parts.some(p => Number.isNaN(p) || p < 0 || p > 255)) {
        return true
    }
    const [a, b, c] = parts
    if (a === 127) return true
    if (a === 10) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 0) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    if (a === 192 && b === 0 && (c === 0 || c === 2)) return true
    if (a === 198 && (b === 18 || b === 19)) return true
    if (a >= 224) return true
    return false
}

export const isBlockedIPv6 = (ip: string): boolean => {
    const normalized = ip.toLowerCase()
    if (normalized === "::1") return true
    if (normalized.startsWith("fe80:")) return true
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true
    if (normalized.startsWith("::ffff:")) {
        const mapped = normalized.slice("::ffff:".length)
        if (mapped.includes(".")) {
            return isBlockedIPv4(mapped)
        }
    }
    return false
}

export const isBlockedIp = (ip: string): boolean => {
    const version = isIP(ip)
    if (version === 4) return isBlockedIPv4(ip)
    if (version === 6) return isBlockedIPv6(ip)
    return true
}

const blockedHostnames = new Set([
    "localhost",
    "metadata.google.internal",
    "metadata.goog",
])

export const validateCallbackUrlForEgress = (url: URL): void => {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new SafeOutboundFetchError("callback url protocol must be http or https")
    }
    if (url.username || url.password) {
        throw new SafeOutboundFetchError("callback url must not include credentials")
    }
    const host = url.hostname.toLowerCase()
    if (blockedHostnames.has(host) || host.endsWith(".localhost")) {
        throw new SafeOutboundFetchError("callback url hostname is not allowed")
    }
    const ipVersion = isIP(host)
    if (ipVersion === 4 && isBlockedIPv4(host)) {
        throw new SafeOutboundFetchError("callback url resolves to a blocked address")
    }
    if (ipVersion === 6 && isBlockedIPv6(host)) {
        throw new SafeOutboundFetchError("callback url resolves to a blocked address")
    }
}

const assertResolvableToPublicHost = async (hostname: string): Promise<void> => {
    if (isIP(hostname)) {
        return
    }
    let records: dns.LookupAddress[]
    try {
        records = await dns.promises.lookup(hostname, { all: true })
    } catch {
        throw new SafeOutboundFetchError("callback url hostname could not be resolved")
    }
    if (!records.length) {
        throw new SafeOutboundFetchError("callback url hostname could not be resolved")
    }
    for (const record of records) {
        if (isBlockedIp(record.address)) {
            throw new SafeOutboundFetchError("callback url resolves to a blocked address")
        }
    }
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string, family: number) => void

const safeLookup = (hostname: string, options: dns.LookupOneOptions, callback: LookupCallback) => {
    dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
        if (err) {
            callback(err, "", 4)
            return
        }
        const records = addresses as dns.LookupAddress[]
        for (const record of records) {
            if (isBlockedIp(record.address)) {
                callback(new SafeOutboundFetchError("callback url resolves to a blocked address"), "", 4)
                return
            }
        }
        const first = records[0]
        callback(null, first.address, first.family)
    })
}

const createAgent = (protocol: string, rejectUnauthorized: boolean): http.Agent | https.Agent => {
    if (protocol === "https:") {
        return new https.Agent({ rejectUnauthorized, lookup: safeLookup })
    }
    return new http.Agent({ lookup: safeLookup })
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
        await assertResolvableToPublicHost(parsedUrl.hostname)

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
