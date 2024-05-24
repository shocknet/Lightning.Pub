import fetch from "node-fetch"

export class LSP {
    serviceUrl: string
    constructor(serviceUrl: string) {
        this.serviceUrl = serviceUrl
    }

    getInfo = async () => {
        const res = await fetch(`${this.serviceUrl}/getinfo`)
        const json = await res.json() as { options: {}, uris: string[] }
    }

    createOrder = async (req: { public_key: string }) => {
        const res = await fetch(`${this.serviceUrl}/create_order`, {
            method: "POST",
            body: JSON.stringify(req),
            headers: { "Content-Type": "application/json" }
        })
        const json = await res.json() as {}
        return json
    }

    getOrder = async (orderId: string) => {
        const res = await fetch(`${this.serviceUrl}/get_order&order_id=${orderId}`)
        const json = await res.json() as {}
        return json
    }
}