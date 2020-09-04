/**
 * @format
 */
const Crypto = require('crypto')
const logger = require('winston')

const lightningServices = require('./lightning-services')
/**
 * @typedef {import('./types').PaymentV2} PaymentV2
 * @typedef {import('./types').SendPaymentV2Request} SendPaymentV2Request
 * @typedef {import('./types').SendPaymentInvoiceParams} SendPaymentInvoiceParams
 * @typedef {import('./types').SendPaymentKeysendParams} SendPaymentKeysendParams
 */

//https://github.com/lightningnetwork/lnd/blob/master/record/experimental.go#L5:2
//might break in future updates
const KeySendType = 5482373484
//https://api.lightning.community/#featurebit
const TLV_ONION_REQ = 8

/**
 * @param {SendPaymentV2Request} sendPaymentRequest
 * @returns {boolean}
 */
const isValidSendPaymentRequest = sendPaymentRequest => {
  const {
    amt,
    dest,
    dest_custom_records,
    dest_features,
    final_cltv_delta,
    max_parts,
    no_inflight_updates,
    payment_hash,
    timeout_seconds,
    fee_limit_sat,
    payment_request
  } = sendPaymentRequest

  if (typeof amt !== 'undefined' && typeof amt !== 'string') {
    return false
  }

  if (typeof dest !== 'undefined' && !(dest instanceof Buffer)) {
    return false
  }

  if (
    typeof dest_custom_records !== 'undefined' &&
    typeof dest_custom_records !== 'object'
  ) {
    return false
  }

  if (
    typeof dest_custom_records !== 'undefined' &&
    dest_custom_records === null
  ) {
    return false
  }

  if (
    typeof dest_custom_records !== 'undefined' &&
    Object.keys(dest_custom_records).length === 0
  ) {
    return false
  }

  if (typeof dest_features !== 'undefined' && !Array.isArray(dest_features)) {
    return false
  }

  if (typeof dest_features !== 'undefined' && dest_features.length === 0) {
    return false
  }

  if (
    typeof final_cltv_delta !== 'undefined' &&
    typeof final_cltv_delta !== 'number'
  ) {
    return false
  }

  if (
    typeof payment_hash !== 'undefined' &&
    !(payment_hash instanceof Buffer)
  ) {
    return false
  }

  if (typeof max_parts !== 'undefined' && typeof max_parts !== 'number') {
    return false
  }

  if (
    typeof timeout_seconds !== 'undefined' &&
    typeof timeout_seconds !== 'number'
  ) {
    return false
  }

  if (
    typeof no_inflight_updates !== 'undefined' &&
    typeof no_inflight_updates !== 'boolean'
  ) {
    return false
  }

  if (
    typeof fee_limit_sat !== 'undefined' &&
    typeof fee_limit_sat !== 'number'
  ) {
    return false
  }

  if (
    typeof payment_request !== 'undefined' &&
    typeof payment_request !== 'string'
  ) {
    return false
  }

  return true
}

/**
 * @param {SendPaymentKeysendParams} sendPaymentKeysendParams
 * @returns {boolean}
 */
const isValidSendPaymentKeysendParams = sendPaymentKeysendParams => {
  const {
    amt,
    dest,
    feeLimit,
    finalCltvDelta,
    maxParts,
    timeoutSeconds
  } = sendPaymentKeysendParams

  if (typeof amt !== 'string') {
    return false
  }

  if (typeof dest !== 'string') {
    return false
  }

  if (typeof feeLimit !== 'number') {
    return false
  }

  if (
    typeof finalCltvDelta !== 'undefined' &&
    typeof finalCltvDelta !== 'number'
  ) {
    return false
  }

  if (typeof maxParts !== 'undefined' && typeof maxParts !== 'number') {
    return false
  }

  if (
    typeof timeoutSeconds !== 'undefined' &&
    typeof timeoutSeconds !== 'number'
  ) {
    return false
  }

  return true
}

/**
 * @param {SendPaymentInvoiceParams} sendPaymentInvoiceParams
 */
const isValidSendPaymentInvoiceParams = sendPaymentInvoiceParams => {
  const {
    amt,
    feeLimit,
    max_parts,
    payment_request,
    timeoutSeconds
  } = sendPaymentInvoiceParams

  // payment_request: string
  // timeoutSeconds?: number

  if (typeof amt !== 'undefined' && typeof amt !== 'string') {
    return false
  }

  if (typeof feeLimit !== 'number') {
    return false
  }

  if (typeof max_parts !== 'undefined' && typeof max_parts !== 'number') {
    return false
  }

  if (typeof payment_request !== 'string') {
    return false
  }

  if (
    typeof timeoutSeconds !== 'undefined' &&
    typeof timeoutSeconds !== 'number'
  ) {
    return false
  }

  return true
}

/**
 * aklssjdklasd
 * @param {SendPaymentV2Request} sendPaymentRequest
 * @returns {Promise<PaymentV2>}
 */
const sendPaymentV2 = sendPaymentRequest => {
  const {
    services: { router }
  } = lightningServices

  if (!isValidSendPaymentRequest(sendPaymentRequest)) {
    throw new TypeError(
      `Invalid SendPaymentRequest: ${JSON.stringify(sendPaymentRequest)}`
    )
  }

  /**
   * @type {SendPaymentV2Request}
   */
  const paymentRequest = {
    ...sendPaymentRequest,
    no_inflight_updates: true
  }

  return new Promise((res, rej) => {
    const stream = router.sendPaymentV2(paymentRequest)

    stream.on(
      'data',
      /**
       * @param {import("./types").PaymentV2} streamingPaymentV2
       */ streamingPaymentV2 => {
        if (streamingPaymentV2.failure_reason !== 'FAILURE_REASON_NONE') {
          rej(new Error(streamingPaymentV2.failure_reason))
        } else {
          res(streamingPaymentV2)
        }
      }
    )

    // @ts-expect-error
    stream.on('status', status => {
      logger.info('SendPaymentV2 Status:', status)
    })

    stream.on(
      'error',
      /**
       * @param {{ details: any; }} err
       */ err => {
        logger.error('SendPaymentV2 Error:', err)

        rej(new Error(err.details) || err)
      }
    )
  })
}

/**
 * @param {SendPaymentKeysendParams} params
 * @returns {Promise<PaymentV2>}
 */
const sendPaymentV2Keysend = params => {
  const {
    amt,
    dest,
    feeLimit,
    finalCltvDelta,
    maxParts,
    timeoutSeconds
  } = params

  if (!isValidSendPaymentKeysendParams(params)) {
    throw new TypeError(
      `Invalid SendPaymentKeysendParams: ${JSON.stringify(params)}`
    )
  }

  const preimage = Crypto.randomBytes(32)
  const r_hash = Crypto.createHash('sha256')
    .update(preimage)
    .digest()

  return sendPaymentV2({
    dest: Buffer.from(dest, 'hex'),
    amt,
    final_cltv_delta: finalCltvDelta,
    dest_features: [TLV_ONION_REQ],
    dest_custom_records: {
      [KeySendType]: preimage
    },
    payment_hash: r_hash,
    max_parts: maxParts,
    timeout_seconds: timeoutSeconds,
    fee_limit_sat: feeLimit
  })
}

/**
 * @param {SendPaymentInvoiceParams} params
 * @returns {Promise<PaymentV2>}
 */
const sendPaymentV2Invoice = params => {
  const {
    feeLimit,
    payment_request,
    amt,
    max_parts = 3,
    timeoutSeconds = 5
  } = params

  if (!isValidSendPaymentInvoiceParams(params)) {
    throw new TypeError(
      `Invalid SendPaymentInvoiceParams: ${JSON.stringify(params)}`
    )
  }

  return sendPaymentV2({
    amt,
    payment_request,
    fee_limit_sat: feeLimit,
    max_parts,
    timeout_seconds: timeoutSeconds
  })
}

module.exports = {
  sendPaymentV2Keysend,
  sendPaymentV2Invoice
}
