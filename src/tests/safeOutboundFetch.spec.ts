import {
    isMetadataIPv4,
    isMetadataIPv6,
    validateCallbackUrlForEgress,
    assertCallbackUrlAllowed,
    SafeOutboundFetchError,
} from "../services/helpers/safeOutboundFetch.js"
import { TestBase } from "./testBase.js"

export const ignore = false
export const dev = false

export default async (T: TestBase) => {
    T.d("Starting safeOutboundFetch egress policy tests")

    T.expect(isMetadataIPv4("169.254.169.254")).to.equal(true)
    T.expect(isMetadataIPv4("169.254.170.2")).to.equal(true)
    T.expect(isMetadataIPv4("127.0.0.1")).to.equal(false)
    T.expect(isMetadataIPv4("10.0.0.1")).to.equal(false)
    T.expect(isMetadataIPv4("192.168.1.1")).to.equal(false)
    T.expect(isMetadataIPv4("8.8.8.8")).to.equal(false)

    T.expect(isMetadataIPv6("::ffff:169.254.169.254")).to.equal(true)
    T.expect(isMetadataIPv6("::1")).to.equal(false)

    const assertBlocked = (url: string) => {
        try {
            validateCallbackUrlForEgress(new URL(url))
            T.expect.fail(`expected blocked url: ${url}`)
        } catch (err) {
            T.expect(err).to.be.instanceOf(SafeOutboundFetchError)
        }
    }

    assertBlocked("http://169.254.169.254/latest/meta-data/")
    assertBlocked("http://metadata.google.internal/computeMetadata/v1/")
    assertBlocked("http://user:pass@example.com/callback")
    assertBlocked("file:///etc/passwd")

    validateCallbackUrlForEgress(new URL("http://127.0.0.1/callback"))
    validateCallbackUrlForEgress(new URL("http://localhost/callback"))
    validateCallbackUrlForEgress(new URL("http://192.168.1.10/webhook"))
    validateCallbackUrlForEgress(new URL("https://example.com/callback?invoice={invoice}"))
    assertCallbackUrlAllowed("http://127.0.0.1/callback?invoice={invoice}")

    T.d("Finished safeOutboundFetch egress policy tests")
}
