import { OpenChannelRequest } from "../../../proto/lnd/lightning";
import { SendPaymentRequest } from "../../../proto/lnd/router";

export const PayInvoiceReq = (invoice: string, amount: number, feeLimit: number): SendPaymentRequest => ({
    amt: BigInt(amount),
    feeLimitSat: BigInt(feeLimit),
    noInflightUpdates: false,
    paymentRequest: invoice,
    maxParts: 3,
    timeoutSeconds: 50,

    allowSelfPayment: false,
    amp: false,
    amtMsat: 0n,
    cltvLimit: 0,
    dest: Buffer.alloc(0),
    destCustomRecords: {},
    destFeatures: [],
    feeLimitMsat: 0n,
    finalCltvDelta: 0,
    lastHopPubkey: Buffer.alloc(0),
    maxShardSizeMsat: 0n,
    outgoingChanIds: [],
    paymentAddr: Buffer.alloc(0),
    paymentHash: Buffer.alloc(0),
    routeHints: [],
    timePref: 0,
    outgoingChanId: '0'
})