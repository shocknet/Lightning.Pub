/** Whole satoshi counts. Fractions, NaN, infinities, and unsafe integers are refused. */
export const isNonNegativeSats = (amount: number): boolean =>
    Number.isSafeInteger(amount) && amount >= 0

export const isPositiveSats = (amount: number): boolean =>
    Number.isSafeInteger(amount) && amount > 0

export const isPositiveConfs = (confs: number): boolean =>
    Number.isSafeInteger(confs) && confs >= 1

export const isOptionalNonNegativeSats = (amount: number | undefined): boolean =>
    amount === undefined || isNonNegativeSats(amount)

export const isOptionalPositiveSats = (amount: number | undefined): boolean =>
    amount === undefined || isPositiveSats(amount)

export const isNonNegativeIndex = (index: number): boolean =>
    Number.isSafeInteger(index) && index >= 0

export const isTcpPort = (port: number): boolean =>
    Number.isSafeInteger(port) && port >= 1 && port <= 65535

export const isOptionalPositiveInteger = (value: number | undefined): boolean =>
    value === undefined || isPositiveSats(value)

export const assertIntegerSats = (amount: number, label: string): void => {
    if (!Number.isSafeInteger(amount)) {
        throw new Error(`${label} must be an integer number of sats`)
    }
}
