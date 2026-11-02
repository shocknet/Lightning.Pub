import {
    MAX_SUBMARINE_TIMEOUT_BLOCKS,
    MIN_SUBMARINE_TIMEOUT_BLOCKS,
    SUBMARINE_LOCKTIME_THRESHOLD,
    checkSubmarineTimeout,
} from "../services/lnd/swaps/submarineSwaps.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

const TIP = 920_000

export default async (T: StorageTestBase) => {
    T.d("starting submarine timeout window checks")

    const accept = (timeout: number, tip = TIP) => {
        const result = checkSubmarineTimeout(timeout, tip)
        T.expect(result.ok, !result.ok ? result.error : "").to.equal(true)
    }
    const reject = (timeout: number, tip: number, error: string) => {
        const result = checkSubmarineTimeout(timeout, tip)
        T.expect(result.ok).to.equal(false)
        if (!result.ok) {
            T.expect(result.error).to.equal(error)
        }
    }

    accept(TIP + MIN_SUBMARINE_TIMEOUT_BLOCKS)
    accept(TIP + 1_008)
    accept(TIP + MAX_SUBMARINE_TIMEOUT_BLOCKS)

    reject(0.5, TIP, "invalid timeoutBlockHeight from swap service")
    reject(1.9, TIP, "invalid timeoutBlockHeight from swap service")
    reject(TIP + 144.5, TIP, "invalid timeoutBlockHeight from swap service")
    reject(Number.NaN, TIP, "invalid timeoutBlockHeight from swap service")
    reject(Number.POSITIVE_INFINITY, TIP, "invalid timeoutBlockHeight from swap service")
    reject(0, TIP, "invalid timeoutBlockHeight from swap service")
    reject(-1, TIP, "invalid timeoutBlockHeight from swap service")
    reject(SUBMARINE_LOCKTIME_THRESHOLD, TIP, "invalid timeoutBlockHeight from swap service")

    reject(499_999_999, TIP, `timeoutBlockHeight 499999999 is later than ${MAX_SUBMARINE_TIMEOUT_BLOCKS} blocks from tip ${TIP}`)
    reject(TIP + MAX_SUBMARINE_TIMEOUT_BLOCKS + 1, TIP, `timeoutBlockHeight ${TIP + MAX_SUBMARINE_TIMEOUT_BLOCKS + 1} is later than ${MAX_SUBMARINE_TIMEOUT_BLOCKS} blocks from tip ${TIP}`)

    reject(TIP, TIP, `swap quote expired at block ${TIP} (tip ${TIP})`)
    reject(TIP - 1, TIP, `swap quote expired at block ${TIP - 1} (tip ${TIP})`)
    reject(1, TIP, `swap quote expired at block 1 (tip ${TIP})`)
    reject(TIP + MIN_SUBMARINE_TIMEOUT_BLOCKS - 1, TIP, `timeoutBlockHeight ${TIP + MIN_SUBMARINE_TIMEOUT_BLOCKS - 1} is sooner than ${MIN_SUBMARINE_TIMEOUT_BLOCKS} blocks from tip ${TIP}`)

    reject(TIP + 1_008, 0, "untrusted chain tip")
    reject(TIP + 1_008, 0.5, "untrusted chain tip")
    reject(TIP + 1_008, SUBMARINE_LOCKTIME_THRESHOLD, "untrusted chain tip")

    T.d("submarine timeout window rejects fractions, expired quotes, and far-future heights")
}
