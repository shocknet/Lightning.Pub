export class InvoiceAlreadyPaidError extends Error {
    constructor() {
        super("this invoice was already paid")
        this.name = "InvoiceAlreadyPaidError"
    }
}

export class InvoiceAlreadyFailedError extends Error {
    constructor() {
        super("this invoice was already paid and failed, try another invoice")
        this.name = "InvoiceAlreadyFailedError"
    }
}

export class InvoicePaymentInProgressError extends Error {
    constructor(message = "this invoice is already being paid") {
        super(message)
        this.name = "InvoicePaymentInProgressError"
    }
}

export class UserBannedError extends Error {
    constructor() {
        super("user is banned, cannot send payment")
        this.name = "UserBannedError"
    }
}

export class InsufficientBalanceError extends Error {
    constructor() {
        super("not enough balance to decrement")
        this.name = "InsufficientBalanceError"
    }
}
