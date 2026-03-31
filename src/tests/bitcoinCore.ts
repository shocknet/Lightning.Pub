import { BitcoinCoreSettings } from '../services/main/settings';

export class BitcoinCoreWrapper {
    private rpcUrl: string
    private authHeader: string
    addr: string

    constructor(settings: BitcoinCoreSettings) {
        this.rpcUrl = `http://127.0.0.1:${settings.port}`
        this.authHeader = `Basic ${Buffer.from(`${settings.user}:${settings.pass}`).toString('base64')}`
    }

    private async callRpc<T>(method: string, params: unknown[] = []): Promise<T> {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: this.authHeader,
            },
            body: JSON.stringify({
                jsonrpc: '1.0',
                id: 'bitcoin-core-wrapper',
                method,
                params,
            }),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`Bitcoin RPC HTTP ${response.status}: ${text}`)
        }

        const payload = await response.json() as { error: { message: string } | null; result: T }
        if (payload.error) {
            throw new Error(`Bitcoin RPC ${method} failed: ${payload.error.message}`)
        }

        return payload.result
    }

    InitAddress = async () => {
        this.addr = await this.callRpc<string>('getnewaddress')
    }

    Init = async () => {
        const wallet = await this.callRpc('createwallet', ['']);
        console.log({ wallet })
        await this.InitAddress()
        console.log({ addr: this.addr })
        await this.Mine(101)
        const info = await this.callRpc('getwalletinfo');
        console.log({ info })
    }

    Mine = async (blocks: number) => {
        await this.callRpc('generatetoaddress', [blocks, this.addr])
    }

    SendToAddress = async (address: string, amount: number) => {
        const tx = await this.callRpc<string>('sendtoaddress', [address, amount])
        console.log({ tx })
    }
}