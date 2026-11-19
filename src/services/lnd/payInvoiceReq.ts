import { OpenChannelRequest } from "../../../proto/lnd/lightning";
import { SendPaymentRequest } from "../../../proto/lnd/router";

export const DEFAULT_PAYMENT_TIMEOUT_SECONDS = 50

export const PayInvoiceReq = (invoice: string, amount: number, feeLimit: number, timeoutSeconds = DEFAULT_PAYMENT_TIMEOUT_SECONDS): SendPaymentRequest => ({
    amt: BigInt(amount),
    feeLimitSat: BigInt(feeLimit),
    noInflightUpdates: false,
    paymentRequest: invoice,
    maxParts: 3,
    timeoutSeconds,

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
    outgoingChanId: '0',
    cancelable: false,
    firstHopCustomRecords: {}
})