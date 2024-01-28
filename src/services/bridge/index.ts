import CreateBridgeHttpClient, { BridgeHttpClient } from "./http.js"
type InvoiceCB = (result: { success: false } | { success: true, invoice: string, amount: number }) => void
export type PaymentReceiver = { receiver: 'application' } | { receiver: 'user', rootToken: string }

export default class Handler {
	constructor() {
		if (!process.env.BRIDGE_HTTP_URL) {
			throw new Error("no PUB_HTTP_URL env was provided");
		}
		if (!process.env.PUB_SECRET) {
			throw new Error("no PUB_HTTP_TOKEN env was provided");
		}
		this.bridgeHttp = CreateBridgeHttpClient(process.env.BRIDGE_HTTP_URL, process.env.PUB_SECRET)
	}
	bridgeHttp: BridgeHttpClient;

	async AddMapping(userId: string) {
		const res = await this.bridgeHttp.PubNewmapping({ user_id: userId })
		if (res.status === 'ERROR') {
			throw new Error(res.reason)
		}
		return res;
	}
}