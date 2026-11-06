import { createServer } from "node:http"
import { once } from "node:events"
import { OfferManager } from "../services/CLINK/offerManager.js"
import { NofferError, validateOfferReq } from "../services/CLINK/offerTypes.js"
import { PaymentSideEffects } from "../services/main/paymentSideEffects.js"
import Main from "../services/main/index.js"
import { newClinkRouter } from "../services/serverMethods/clinkRouter.js"
import { newClinkTransport } from "../services/serverMethods/clinkTransport.js"
import { StorageTestBase } from "./testBase.js"

export const ignore = false
export const dev = false
export const requires = "storage" as const

export default async (T: StorageTestBase) => {
    type InvoiceRequest = Parameters<OfferManager["applicationManager"]["AddAppUserInvoice"]>[1]
    const invoices: InvoiceRequest[] = []
    const manager = Object.assign(Object.create(OfferManager.prototype), {
        storage: T.storage,
        applicationManager: {
            AddAppUserInvoice: async (_appId: string, req: InvoiceRequest) => {
                invoices.push(req)
                return { invoice: "test-invoice" }
            },
        },
        logger: () => { },
    }) as OfferManager
    const create = (price_sats: number, payer_data = ["quantity", "order_id"]) =>
        T.storage.offerStorage.AddUserOffer("quantity-seller", { price_sats, payer_data, label: "quantity test" })
    const fixed = await create(1000)
    const spontaneous = await create(0)
    const pay = (offer: string, payer_data: unknown, amount_sats?: number, remote = 10_000) =>
        manager.HandleUserOffer(validateOfferReq({ offer, payer_data, amount_sats }), "app", remote)
    const fail = async (request: Promise<unknown>, code: number, expected?: string[]) => {
        const count = invoices.length
        let caught: unknown
        try {
            await request
        } catch (e) {
            caught = e
        }
        T.expect(caught).to.be.instanceOf(NofferError)
        const payload = (caught as NofferError).getPayload()
        T.expect(payload.code).to.equal(code)
        T.expect(payload.payer_data).to.deep.equal(expected)
        T.expect(payload).not.to.have.property("bolt11")
        T.expect(invoices.length).to.equal(count)
        if (code === 5) T.expect(payload.range?.min).to.equal(10)
    }

    await pay(fixed.offer_id, { quantity: 3, order_id: "fixed", extra: "ignored" }, 7)
    T.expect(invoices[0].invoice_req.amountSats).to.equal(3000)
    T.expect(invoices[0].payer_data?.data).to.deep.equal({ quantity: 3, order_id: "fixed" })
    await pay(spontaneous.offer_id, { quantity: 3, order_id: "spontaneous" }, 1000)
    T.expect(invoices[1].invoice_req.amountSats).to.equal(3000)
    await pay(spontaneous.offer_id, { quantity: 5, order_id: "minimum-total" }, 2, 10)
    T.expect(invoices[2].invoice_req.amountSats).to.equal(10)
    await pay(fixed.offer_id, { quantity: 1, order_id: "single" })
    T.expect(invoices[3].invoice_req.amountSats).to.equal(1000)
    T.d("fixed and spontaneous offers multiply resolved unit prices; amount limits apply to totals")

    const user = await T.storage.StartTransaction(tx => T.storage.userStorage.AddUser(0, tx))
    await T.storage.paymentStorage.AddUserInvoice(user, "stored-quantity-invoice", {
        expiry: 3600, offerId: fixed.offer_id, payerData: invoices[0].payer_data?.data,
    })
    const stored = await T.storage.paymentStorage.GetInvoiceOwner("stored-quantity-invoice")
    T.expect(stored?.payer_data).to.deep.equal({ quantity: 3, order_id: "fixed" })
    const listed = await manager.GetUserOfferInvoices({ app_id: "app", app_user_id: "quantity-seller", user_id: user.user_id }, {
        offer_id: fixed.offer_id, include_unpaid: true,
    })
    T.expect(listed.invoices[0].data).to.deep.equal({ quantity: "3", order_id: "fixed" })
    T.d("invoice storage retains numeric quantity while the existing seller RPC retains its string-map contract")

    for (const value of [undefined, null, [], "bad", 2, {}, { order_id: "missing" }]) {
        await fail(pay(fixed.offer_id, value), 6, fixed.payer_data!)
    }
    for (const quantity of [undefined, null, "3", 0, -1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1, true, {}, []]) {
        await fail(pay(fixed.offer_id, { quantity, order_id: "invalid" }), 6, fixed.payer_data!)
    }
    await fail(pay(fixed.offer_id, { quantity: 2, order_id: 123 }), 6, fixed.payer_data!)
    await fail(pay(fixed.offer_id, Object.assign(Object.create({ quantity: 2 }), { order_id: "inherited" })), 6, fixed.payer_data!)
    T.d("missing or invalid required payer fields return code 6 with the complete field list and no invoice")

    await fail(pay(fixed.offer_id, { quantity: 3, order_id: "too-large" }, undefined, 2999), 5)
    await fail(pay(spontaneous.offer_id, { quantity: 3, order_id: "too-large" }, 1000, 2999), 5)
    await fail(pay(fixed.offer_id, { quantity: Number.MAX_SAFE_INTEGER, order_id: "overflow" }, undefined, Number.MAX_SAFE_INTEGER), 5)
    await fail(pay(spontaneous.offer_id, { quantity: 2, order_id: "missing-price" }), 5)
    await fail(pay(spontaneous.offer_id, { quantity: 1, order_id: "zero-price" }, 0), 5)
    const tiny = await create(1)
    await pay(tiny.offer_id, { quantity: Number.MAX_SAFE_INTEGER, order_id: "safe-limit" }, undefined, Number.MAX_SAFE_INTEGER)
    T.expect(invoices[invoices.length - 1].invoice_req.amountSats).to.equal(Number.MAX_SAFE_INTEGER)
    T.d("out-of-range totals and unsafe multiplication return code 5, not a payer-data error")

    for (const price of [1000, 0]) {
        const offer = await create(price, ["order_id"])
        await pay(offer.offer_id, { quantity: 100, order_id: "unchanged" }, 1000)
        const invoice = invoices[invoices.length - 1]
        T.expect(invoice.invoice_req.amountSats).to.equal(1000)
        T.expect(invoice.payer_data?.data).to.deep.equal({ order_id: "unchanged" })
    }
    const plain = await create(1000, [])
    await pay(plain.offer_id, { quantity: 100 })
    T.expect(invoices[invoices.length - 1].invoice_req.amountSats).to.equal(1000)
    T.expect(invoices[invoices.length - 1].payer_data?.data).to.deep.equal({})
    T.d("unsolicited quantity neither changes prices nor reaches seller fulfillment data")

    const transport = newClinkTransport(newClinkRouter({ offerManager: manager } as Main))
    const send = async (content: string) => {
        const replies: Record<string, unknown>[] = []
        await transport({ id: "request", pub: "payer", appId: "app", content, kind: 21001, startAtNano: "0", startAtMs: Date.now() },
            event => { replies.push(JSON.parse(event.content)) })
        T.expect(replies).to.have.length(1)
        return replies[0]
    }
    for (const content of ["not-json", "null", "[]", "{}", JSON.stringify({ offer: fixed.offer_id, amount_sats: 1.5 })]) {
        const response = await send(content)
        T.expect(response.code).to.equal(1)
        T.expect(response).not.to.have.property("payer_data")
    }
    // Avoid liquidity/network dependencies while exercising the real router and offer handler.
    manager.getNofferInvoice = (req, appId) => manager.HandleUserOffer(req, appId, 10_000)
    const malformed = await send(JSON.stringify({ offer: fixed.offer_id, description: 123 }))
    T.expect(malformed.code).to.equal(1)
    T.expect(malformed).not.to.have.property("payer_data")
    const discovery = await send(JSON.stringify({ offer: fixed.offer_id }))
    T.expect(discovery.code).to.equal(6)
    T.expect(discovery.payer_data).to.deep.equal(["quantity", "order_id"])
    T.expect(discovery).not.to.have.property("bolt11")
    const retry = await send(JSON.stringify({ offer: fixed.offer_id, payer_data: { quantity: 3, order_id: "retry" } }))
    T.expect(retry.bolt11).to.equal("test-invoice")
    T.expect(invoices[invoices.length - 1].invoice_req.amountSats).to.equal(3000)
    T.d("offer transport distinguishes malformed requests from payer-data discovery and accepts a corrected retry")

    let callbackUrl = ""
    const server = createServer((req, res) => {
        callbackUrl = req.url || ""
        res.end("ok")
    })
    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    try {
        const address = server.address()
        if (!address || typeof address === "string") throw new Error("callback server did not bind")
        const sideEffects = Object.create(PaymentSideEffects.prototype) as PaymentSideEffects
        await sideEffects.triggerPaidCallback(() => { }, `http://127.0.0.1:${address.port}/fulfill{?quantity,order_id,amount}`, {
            invoice: "test-invoice", amount: 3000, payerData: invoices[invoices.length - 1].payer_data?.data,
        })
        const query = new URL(callbackUrl, "http://localhost").searchParams
        T.expect(query.get("quantity")).to.equal("3")
        T.expect(query.get("order_id")).to.equal("retry")
        T.expect(query.get("amount")).to.equal("3000")
        T.expect(query.get("ok")).to.equal("true")
    } finally {
        await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()))
    }
    T.d("seller callbacks expand accepted numeric quantity alongside the multiplied invoice total")
}
