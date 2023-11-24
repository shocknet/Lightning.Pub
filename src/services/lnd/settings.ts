export type LndSettings = {
    lndAddr: string
    lndCertPath: string
    lndMacaroonPath: string
    feeRateLimit: number
    feeFixedLimit: number
    mockLnd: boolean
}
type TxOutput = {
    hash: string
    index: number
}

export type AddressPaidCb = (txOutput: TxOutput, address: string, amount: number, internal: boolean) => void
export type InvoicePaidCb = (paymentRequest: string, amount: number, internal: boolean) => void
export type NewBlockCb = (height: number) => void

export type NodeInfo = {
    alias: string
    syncedToChain: boolean
    syncedToGraph: boolean
    blockHeight: number
    blockHash: string
}
export type Invoice = {
    payRequest: string
}
export type DecodedInvoice = {
    numSatoshis: number
}
export type PaidInvoice = {
    feeSat: number
    valueSat: number
    paymentPreimage: string
}