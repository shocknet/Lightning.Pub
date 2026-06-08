import { runSanityCheck, safelySetUserBalance, TestBase } from "./testBase.js"

export const ignore = false
export const dev = true

const DEFAULT_PORT = 38473
const POLL_INTERVAL_MS = 200
const POLL_TIMEOUT_MS = 10000

type RecordedHit = {
    method: string
    url: string
}

const getCallbackTestPort = (): number => Number(process.env.CALLBACK_TEST_PORT || DEFAULT_PORT)

const getCallbackTestBase = (hostname: string): string => {
    const port = getCallbackTestPort()
    return `http://${hostname}:${port}`
}

const assertCallbackServerReachable = async (T: TestBase) => {
    const base = getCallbackTestBase("127.0.0.1")
    try {
        const res = await fetch(`${base}/__test__/health`)
        T.expect(res.ok).to.equal(true)
    } catch {
        throw new Error("callback dummy server is not reachable — start callbackDummyServer first")
    }
}

const resetCallbackHits = async (hostname: string) => {
    const base = getCallbackTestBase(hostname)
    const res = await fetch(`${base}/__test__/reset`, { method: "POST" })
    if (!res.ok) {
        throw new Error(`failed to reset callback hits: ${res.status}`)
    }
}

const getCallbackHits = async (hostname: string): Promise<RecordedHit[]> => {
    const base = getCallbackTestBase(hostname)
    const res = await fetch(`${base}/__test__/hits`)
    if (!res.ok) {
        throw new Error(`failed to fetch callback hits: ${res.status}`)
    }
    return res.json() as Promise<RecordedHit[]>
}

const waitForCallbackHit = async (T: TestBase, hostname: string, invoice: string, amountSats: number): Promise<RecordedHit> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS
    while (Date.now() < deadline) {
        const hits = await getCallbackHits(hostname)
        const match = hits.find(h =>
            h.method === "GET"
            && h.url.includes(invoice)
            && h.url.includes(`amount=${amountSats}`)
            && h.url.includes("ok=true")
        )
        if (match) {
            return match
        }
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    }
    const hits = await getCallbackHits(hostname)
    throw new Error(`callback not received within ${POLL_TIMEOUT_MS}ms for hostname ${hostname}; hits: ${JSON.stringify(hits)}`)
}

const testCallbackOnPayment = async (T: TestBase, hostname: string, amountSats: number) => {
    T.d(`starting callback test for hostname ${hostname}`)
    await resetCallbackHits(hostname)

    const callbackUrl = `${getCallbackTestBase(hostname)}/callback?invoice={invoice}&amount={amount}`
    const invoiceRes = await T.main.applicationManager.AddAppUserInvoice(T.app.appId, {
        receiver_identifier: T.user2.appUserIdentifier,
        payer_identifier: T.user1.appUserIdentifier,
        http_callback_url: callbackUrl,
        invoice_req: { amountSats, memo: `callback test ${hostname}` },
    })
    T.expect(invoiceRes.invoice).to.startWith("lnbcrt")
    T.d(`generated ${amountSats} sats invoice with callback on ${hostname}`)

    const application = await T.main.storage.applicationStorage.GetApplication(T.app.appId)
    const pay = await T.main.paymentManager.PayInvoice(T.user1.userId, { invoice: invoiceRes.invoice, amount: 0 }, application)
    T.expect(pay.amount_paid).to.equal(amountSats)
    T.d(`paid invoice internally from user1`)

    const hit = await waitForCallbackHit(T, hostname, invoiceRes.invoice, amountSats)
    T.d(`callback received: ${hit.url}`)

    const hits = await getCallbackHits(hostname)
    T.expect(hits).to.have.length(1)
}

export default async (T: TestBase) => {
    await assertCallbackServerReachable(T)
    await safelySetUserBalance(T, T.user1, 4000)
    await testCallbackOnPayment(T, "127.0.0.1", 1000)
    await testCallbackOnPayment(T, "localhost", 1000)
    await runSanityCheck(T)
}
