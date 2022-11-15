import { OpenChannelRequest, Invoice } from "../../../proto/lnd/lightning";

export const AddInvoiceReq = (value: number, memo = "", privateHints = false, expiry = 60 * 60): Invoice => ({
    expiry: expiry,
    memo: memo,
    private: privateHints,
    value: value,

    fallbackAddr: "",
    cltvExpiry: 0,
    descriptionHash: Buffer.alloc(0),
    features: {},
    isAmp: false,
    rPreimage: Buffer.alloc(0),
    routeHints: [],
    valueMsat: 0,

    addIndex: 0,
    ampInvoiceState: {},
    amtPaidMsat: 0,
    amtPaidSat: 0,
    creationDate: 0,
    htlcs: [],
    isKeysend: false,
    paymentAddr: Buffer.alloc(0),
    paymentRequest: "",
    rHash: Buffer.alloc(0),
    settleDate: 0,
    settleIndex: 0,
    state: 0,

    amtPaid: 0,
    settled: false,
})