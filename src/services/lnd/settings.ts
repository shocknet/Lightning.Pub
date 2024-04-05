import { HtlcEvent } from "../../../proto/lnd/router"
export type NodeSettings = {
    lndAddr: string
    lndCertPath: string
    lndMacaroonPath: string
}
export type LndSettings = {
    mainNode: NodeSettings
    feeRateLimit: number
    feeFixedLimit: number
    mockLnd: boolean

    otherNode?: NodeSettings
    thirdNode?: NodeSettings
}
type TxOutput = {
    hash: string
    index: number
}
export type BalanceInfo = {
    confirmedBalance: number;
    unconfirmedBalance: number;
    totalBalance: number;
    channelsBalance: {
        channelId: string;
        localBalanceSats: number;
        remoteBalanceSats: number;
        htlcs: { incoming: boolean, amount: number }[]
    }[];
}

export type AddressPaidCb = (txOutput: TxOutput, address: string, amount: number, internal: boolean) => void
export type InvoicePaidCb = (paymentRequest: string, amount: number, internal: boolean) => void
export type NewBlockCb = (height: number) => void
export type HtlcCb = (event: HtlcEvent) => void

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
    paymentHash: string
}
export type PaidInvoice = {
    feeSat: number
    valueSat: number
    paymentPreimage: string
}