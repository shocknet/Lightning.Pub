export const getGrpcErrorCode = (err: unknown): string | undefined => {
    if (!err || typeof err !== 'object' || !('code' in err)) {
        return undefined
    }
    const code = err.code as string
    return code || undefined
}

export const isPaymentNotInitiatedError = (err: unknown): boolean => {
    const code = getGrpcErrorCode(err)
    if (code !== 'NOT_FOUND') {
        return false
    }
    if (!err || typeof err !== 'object' || !('message' in err)) {
        return false
    }
    const message = err.message as string
    return typeof message === 'string' && message.includes("payment isn't initiated")
} 
