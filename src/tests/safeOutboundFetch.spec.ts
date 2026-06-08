import { isBlockedIPv4, isBlockedIPv6, validateCallbackUrlForEgress, SafeOutboundFetchError } from "../services/helpers/safeOutboundFetch.js"
import { TestBase } from "./testBase.js"

export const ignore = false
export const dev = false

export default async (T: TestBase) => {
    T.d("Starting safeOutboundFetch egress policy tests")

    T.expect(isBlockedIPv4("127.0.0.1")).to.equal(true)
    T.expect(isBlockedIPv4("10.0.0.1")).to.equal(true)
    T.expect(isBlockedIPv4("172.16.0.1")).to.equal(true)
    T.expect(isBlockedIPv4("192.168.1.1")).to.equal(true)
    T.expect(isBlockedIPv4("169.254.169.254")).to.equal(true)
    T.expect(isBlockedIPv4("8.8.8.8")).to.equal(false)

    T.expect(isBlockedIPv6("::1")).to.equal(true)
    T.expect(isBlockedIPv6("fe80::1")).to.equal(true)
    T.expect(isBlockedIPv6("fc00::1")).to.equal(true)
    T.expect(isBlockedIPv6("::ffff:127.0.0.1")).to.equal(true)

    const assertBlocked = (url: string) => {
        try {
            validateCallbackUrlForEgress(new URL(url))
            T.expect.fail(`expected blocked url: ${url}`)
        } catch (err) {
            T.expect(err).to.be.instanceOf(SafeOutboundFetchError)
        }
    }

    assertBlocked("http://127.0.0.1/callback")
    assertBlocked("http://localhost/callback")
    assertBlocked("http://169.254.169.254/latest/meta-data/")
    assertBlocked("http://user:pass@example.com/callback")
    assertBlocked("file:///etc/passwd")

    validateCallbackUrlForEgress(new URL("https://example.com/callback?invoice={invoice}"))

    T.d("Finished safeOutboundFetch egress policy tests")
}
