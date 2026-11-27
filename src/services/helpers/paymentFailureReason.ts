import { decode as decodeBolt11 } from 'light-bolt11-decoder'
import { PaymentFailureReason } from '../../../proto/lnd/lightning.js'

export type OperatorPaymentFailure = {
    code: string
    label: string
}

const OPERATOR_BY_REASON: Record<string, OperatorPaymentFailure> = {
    FAILURE_REASON_NO_ROUTE: {
        code: 'no_route',
        label: 'Graph cannot reach dest, or all paths failed',
    },
    FAILURE_REASON_INSUFFICIENT_BALANCE: {
        code: 'insufficient_liquidity',
        label: 'Liquidity problem (channels or provider)',
    },
    FAILURE_REASON_TIMEOUT: {
        code: 'timeout',
        label: 'Routes exist but payment did not settle in time',
    },
    FAILURE_REASON_ERROR: {
        code: 'error',
        label: 'Payment failed due to an internal Lightning error',
    },
    FAILURE_REASON_INCORRECT_PAYMENT_DETAILS: {
        code: 'incorrect_payment_details',
        label: 'Invoice details were incorrect or rejected',
    },
    FAILURE_REASON_CANCELED: {
        code: 'canceled',
        label: 'Payment was canceled before settling',
    },
    FAILURE_REASON_NONE: {
        code: 'unknown',
        label: 'Payment failed for an unknown reason',
    },
    PAYMENT_NOT_FOUND: {
        code: 'payment_not_found',
        label: 'No payment record found after the attempt',
    },
    PROVIDER_FAILED: {
        code: 'provider_failed',
        label: 'Liquidity provider reported payment failure',
    },
}

export const isLndPaymentFailureReason = (message: string | undefined | null): boolean =>
    typeof message === 'string' && message.startsWith('FAILURE_REASON_')

export const lndFailureReasonName = (reason: PaymentFailureReason | string | number | undefined | null): string => {
    if (typeof reason === 'string' && reason.startsWith('FAILURE_REASON_')) {
        return reason
    }
    if (reason === undefined || reason === null) {
        return 'FAILURE_REASON_ERROR'
    }
    const name = PaymentFailureReason[reason as PaymentFailureReason]
    return typeof name === 'string' ? name : 'FAILURE_REASON_ERROR'
}

export const destPubkeyFromBolt11 = (invoice: string): string => {
    try {
        const decoded = decodeBolt11(invoice)
        for (const section of decoded.sections) {
            if ((section as { name: string }).name === 'payee') {
                return (section as { value?: string }).value || ''
            }
        }
    } catch {
        return ''
    }
    return ''
}

export const toOperatorPaymentFailure = (failureReason: string | undefined | null): OperatorPaymentFailure => {
    const raw = (failureReason || '').trim()
    if (!raw) {
        return { code: 'unknown', label: 'Payment failed for an unknown reason' }
    }
    const mapped = OPERATOR_BY_REASON[raw]
    if (mapped) {
        return mapped
    }
    if (raw.startsWith('FAILURE_REASON_')) {
        return { code: 'unknown', label: 'Payment failed for an unknown reason' }
    }
    // Provider or other free-form reason string
    return { code: 'provider_failed', label: raw }
}
