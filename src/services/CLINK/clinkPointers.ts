import { ndebitEncode, nmanageEncode, nofferEncode, OfferPriceType } from "@shocknet/clink-sdk"

export type DefaultClinkPointers = {
    noffer: string
    ndebit: string
    nmanage: string
}

export const encodeDefaultClinkPointers = (servicePubkey: string, relay: string, pointer: string): DefaultClinkPointers => {
    return {
        noffer: nofferEncode({
            pubkey: servicePubkey,
            relay,
            offer: pointer,
            priceType: OfferPriceType.Spontaneous,
        }),
        ndebit: ndebitEncode({
            pubkey: servicePubkey,
            relay,
            pointer,
        }),
        nmanage: nmanageEncode({
            pubkey: servicePubkey,
            relay,
            pointer,
        }),
    }
}
