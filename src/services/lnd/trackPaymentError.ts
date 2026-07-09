import { status } from '@grpc/grpc-js'

export type GrpcServiceError = {
    code: number
    message?: string
}

export const getGrpcErrorCode = (err: unknown): number | undefined => {
    if (!err || typeof err !== 'object' || !('code' in err)) {
        return undefined
    }
    const code = (err as GrpcServiceError).code
    return typeof code === 'number' ? code : undefined
}

export const isPaymentNotInitiatedError = (err: unknown): boolean => {
    const code = getGrpcErrorCode(err)
    if (code !== status.NOT_FOUND) {
        return false
    }
    if (!err || typeof err !== 'object' || !('message' in err)) {
        return false
    }
    const message = (err as GrpcServiceError).message
    return typeof message === 'string' && message.includes("payment isn't initiated")
}

export const isLndConnectivityError = (err: unknown): boolean => {
    const code = getGrpcErrorCode(err)
    if (code === undefined) {
        return true
    }
    return code === status.UNAVAILABLE || code === status.DEADLINE_EXCEEDED || code === status.CANCELLED
}
