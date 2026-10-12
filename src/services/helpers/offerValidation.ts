export const DEFAULT_OFFER_LABEL = "Default CLINK Offer"
export const DEFAULT_OFFER_WEBHOOK_ONLY = "the default offer only accepts a webhook change"
export const DEFAULT_OFFER_NO_DELETE = "the default offer cannot be deleted"

export const assertValidOfferPriceSats = (priceSats: number): void => {
    if (priceSats < 0) {
        throw new Error("price_sats cannot be negative")
    }
}

export const isDefaultUserOffer = (appUserId: string, offerId: string): boolean =>
    appUserId === offerId

type DefaultOfferEdit = {
    label: string
    price_sats?: number | null
    payer_data?: string[] | null
    blind?: boolean
}

export const defaultOfferWebhookRejection = (req: DefaultOfferEdit): string | undefined => {
    const payerData = req.payer_data || []
    const keepsAddress =
        req.label === DEFAULT_OFFER_LABEL &&
        !req.price_sats &&
        payerData.length === 0 &&
        !req.blind
    if (keepsAddress) {
        return undefined
    }
    return DEFAULT_OFFER_WEBHOOK_ONLY
}
