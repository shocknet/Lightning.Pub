import { OpenChannelRequest, Invoice } from "../../../proto/lnd/lightning";

export const AddInvoiceReq = (value: number, expiry = 60 * 60, privateHints = false, memo?: string, blind = false): Invoice => ({
    expiry: BigInt(expiry),
    memo: memo || "",
    private: blind ? false : privateHints,
    value: BigInt(value),

    fallbackAddr: "",
    cltvExpiry: 0n,
    descriptionHash: Buffer.alloc(0),
    features: {},
    isAmp: false,
    rPreimage: Buffer.alloc(0),
    routeHints: [],
    valueMsat: 0n,

    addIndex: 0n,
    ampInvoiceState: {},
    amtPaidMsat: 0n,
    amtPaidSat: 0n,
    creationDate: 0n,
    htlcs: [],
    isKeysend: false,
    paymentAddr: Buffer.alloc(0),
    paymentRequest: "",
    rHash: Buffer.alloc(0),
    settleDate: 0n,
    settleIndex: 0n,
    state: 0,
    isBlinded: blind,
    amtPaid: 0n,
    settled: false,
})