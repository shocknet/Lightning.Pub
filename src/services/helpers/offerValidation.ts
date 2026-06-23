export const assertValidOfferPriceSats = (priceSats: number): void => {
    if (priceSats < 0) {
        throw new Error("price_sats cannot be negative")
    }
}
