import crypto from 'crypto'
import { getGrpcErrorCode, isPaymentNotInitiatedError } from '../services/lnd/trackPaymentError.js'
import { TestBase } from './testBase.js'

export const ignore = false
export const dev = false

export default async (T: TestBase) => {
    await testTrackPaymentV2UnknownHashReturnsNotFound(T)
    await testGetPaymentFromHashUnknownHashReturnsNull(T)
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
    T.expect(error).to.exist
    const code = getGrpcErrorCode(error)
    T.expect(code).to.equal('NOT_FOUND')
    T.expect(isPaymentNotInitiatedError(error)).to.equal(true)
}

const testGetPaymentFromHashUnknownHashReturnsNull = async (T: TestBase) => {
    T.d("starting testGetPaymentFromHashUnknownHashReturnsNull")
    const unknownHash = crypto.randomBytes(32).toString('hex')
    const payment = await T.main.lnd.GetPaymentFromHash(unknownHash)
    T.expect(payment).to.equal(null)
}
