import { OpenChannelRequest } from "../../../proto/lnd/lightning";
import { SendPaymentRequest } from "../../../proto/lnd/router";

export const PayInvoiceReq = (invoice: string, amount: number, feeLimit: number): SendPaymentRequest => ({
    amt: amount,
    feeLimitSat: feeLimit,
    noInflightUpdates: true,
    paymentRequest: invoice,
    maxParts: 3,
    timeoutSeconds: 50,

    allowSelfPayment: false,
    amp: false,
    amtMsat: 0,
    cltvLimit: 0,
    dest: Buffer.alloc(0),
    destCustomRecords: {},
    destFeatures: [],
    feeLimitMsat: 0,
    finalCltvDelta: 0,
    lastHopPubkey: Buffer.alloc(0),
    maxShardSizeMsat: 0,
    outgoingChanIds: [],
    paymentAddr: Buffer.alloc(0),
    paymentHash: Buffer.alloc(0),
    routeHints: [],
    timePref: 0,

    outgoingChanId: ""
})