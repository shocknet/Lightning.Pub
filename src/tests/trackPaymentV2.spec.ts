import crypto from 'crypto'
import { status } from '@grpc/grpc-js'
import { getGrpcErrorCode, isPaymentNotInitiatedError } from '../services/lnd/trackPaymentError.js'
import { TestBase } from './testBase.js'

export const ignore = false
export const dev = false

export default async (T: TestBase) => {
    await testTrackPaymentV2UnknownHashReturnsNotFound(T)
}

const testTrackPaymentV2UnknownHashReturnsNotFound = async (T: TestBase) => {
    T.d("starting testTrackPaymentV2UnknownHashReturnsNotFound")
    const unknownHash = crypto.randomBytes(32).toString('hex')

    let error: unknown
    try {
        await T.main.lnd.trackPaymentV2(unknownHash)
    } catch (err) {
        error = err
    }
    console.log(error)
    T.expect(error).to.exist
    const code = getGrpcErrorCode(error)
    T.expect(code).to.equal(status.NOT_FOUND)
    T.expect(isPaymentNotInitiatedError(error)).to.equal(true)
}
