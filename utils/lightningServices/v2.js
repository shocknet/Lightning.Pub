/**
 * @format
 */
const Crypto = require('crypto')
const logger = require('winston')
const Common = require('shock-common')
const Ramda = require('ramda')

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
 * @param {string} payReq
 * @returns {Promise<Common.Schema.InvoiceWhenDecoded>}
 */
const decodePayReq = payReq =>
  Common.Utils.makePromise((res, rej) => {
    lightningServices.lightning.decodePayReq(
      { pay_req: payReq },
      /**
       * @param {{ message: any; }} err
       * @param {any} paymentRequest
       */
      (err, paymentRequest) => {
        if (err) {
          rej(new Error(err.message))
        } else {
          res(paymentRequest)
        }
      }
    )
  })

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

  return Common.makePromise((res, rej) => {
    const stream = router.sendPaymentV2(sendPaymentRequest)

    stream.on(
      'data',
      /**
       * @param {import("./types").PaymentV2} streamingPaymentV2
       */ streamingPaymentV2 => {
        if (streamingPaymentV2.failure_reason !== 'FAILURE_REASON_NONE') {
          rej(new Error(streamingPaymentV2.failure_reason))
        } else if (streamingPaymentV2.status === 'FAILED') {
          rej(new Error(streamingPaymentV2.failure_reason))
        } else if (streamingPaymentV2.status === 'SUCCEEDED') {
          res(streamingPaymentV2)
        } else {
          logger.info(`sendPaymentV2 -> status: ${streamingPaymentV2.status}`)
        }
      }
    )

    // @ts-expect-error
    stream.on('status', status => {
      logger.info('SendPaymentV2 Status:', status)
      if (status === 'FAILED') {
        rej(new Error('Status == FAILED'))
      }
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

/**
 * @param {Common.APISchema.ListPaymentsRequest} req
 * @throws {TypeError}
 * @returns {Promise<Common.APISchema.ListPaymentsResponseParsed>}
 */
const listPayments = req => {
  return Common.Utils.makePromise((res, rej) => {
    lightningServices.lightning.listPayments(
      req,
      /**
       * @param {{ details: any; }} err
       * @param {unknown} lpres
       */ (err, lpres) => {
        if (err) {
          return rej(new Error(err.details || err))
        }

        if (!Common.APISchema.isListPaymentsResponse(lpres)) {
          return rej(new TypeError(`Response from LND not in expected format.`))
        }

        /** @type {Common.APISchema.ListPaymentsResponseParsed} */
        // @ts-expect-error
        const parsed = Ramda.evolve(
          {
            first_index_offset: x => Number(x),
            last_index_offset: x => Number(x),
            payments: x => x
          },
          lpres
        )

        if (Common.APISchema.isListPaymentsResponseParsed(parsed)) {
          return res(parsed)
        }

        return rej(new TypeError(`could not parse response from LND`))
      }
    )
  })
}

/**
 * @param {0|1} type
 * @returns {Promise<string>}
 */
const newAddress = (type = 0) => {
  const { lightning } = lightningServices.getServices()

  return Common.Utils.makePromise((res, rej) => {
    lightning.newAddress({ type }, (err, response) => {
      if (err) {
        rej(new Error(err.message))
      } else {
        res(response.address)
      }
    })
  })
}

/**
 * @param {number} minConfs
 * @param {number} maxConfs
 * @returns {Promise<Common.Utxo[]>}
 */
const listUnspent = (minConfs = 3, maxConfs = 6) =>
  Common.makePromise((res, rej) => {
    const { lightning } = lightningServices.getServices()

    lightning.listUnspent(
      {
        min_confs: minConfs,
        max_confs: maxConfs
      },
      (err, unspent) => {
        if (err) {
          rej(new Error(err.message))
        } else {
          res(unspent.utxos)
        }
      }
    )
  })

/**
 * @typedef {import('./types').ListChannelsReq} ListChannelsReq
 */

/**
 * @param {ListChannelsReq} req
 * @returns {Promise<Common.Channel[]>}
 */
const listChannels = req =>
  Common.makePromise((res, rej) => {
    const { lightning } = lightningServices.getServices()

    lightning.listChannels(req, (err, resp) => {
      if (err) {
        rej(new Error(err.message))
      } else {
        res(resp.channels)
      }
    })
  })

/**
 * https://api.lightning.community/#getchaninfo
 * @param {string} chanID
 * @returns {Promise<Common.ChannelEdge>}
 */
const getChanInfo = chanID =>
  Common.makePromise((res, rej) => {
    const { lightning } = lightningServices.getServices()

    lightning.getChanInfo(
      {
        chan_id: chanID
      },
      (err, resp) => {
        if (err) {
          rej(new Error(err.message))
        } else {
          // Needs cast because typescript refuses to assign Record<string, any>
          // to an actual object :shrugs
          res(/** @type {Common.ChannelEdge} */ (resp))
        }
      }
    )
  })

/**
 * https://api.lightning.community/#listpeers
 * @param {boolean=} latestError If true, only the last error that our peer sent
 * us will be returned with the peer's information, rather than the full set of
 * historic errors we have stored.
 * @returns {Promise<Common.Peer[]>}
 */
const listPeers = latestError =>
  Common.makePromise((res, rej) => {
    const { lightning } = lightningServices.getServices()

    lightning.listPeers(
      {
        latest_error: latestError
      },
      (err, resp) => {
        if (err) {
          rej(new Error(err.message))
        } else {
          res(resp.peers)
        }
      }
    )
  })

/**
 * @typedef {import('./types').PendingChannelsRes} PendingChannelsRes
 */

/**
 * @returns {Promise<PendingChannelsRes>}
 */
const pendingChannels = () =>
  Common.makePromise((res, rej) => {
    const { lightning } = lightningServices.getServices()

    lightning.pendingChannels({}, (err, resp) => {
      if (err) {
        rej(new Error(err.message))
      } else {
        // Needs cast because typescript refuses to assign Record<string, any>
        // to an actual object :shrugs
        res(/** @type {PendingChannelsRes} */ (resp))
      }
    })
  })

/**
 * @typedef {import('./types').AddInvoiceRes} AddInvoiceRes
 */
/**
 * https://api.lightning.community/#addinvoice
 * @param {number} value
 * @param {string=} memo
 * @param {boolean=} confidential Alias for `private`.
 * @param {number=} expiry
 * @returns {Promise<AddInvoiceRes>}
 */
const addInvoice = (value, memo = '', confidential = true, expiry = 180) =>
  Common.makePromise((res, rej) => {
    const { lightning } = lightningServices.getServices()

    lightning.addInvoice(
      {
        value,
        memo,
        private: confidential,
        expiry
      },
      (err, resp) => {
        if (err) {
          rej(new Error(err.message))
        } else {
          // Needs cast because typescript refuses to assign Record<string, any>
          // to an actual object :shrugs
          res(/** @type {AddInvoiceRes} */ (resp))
        }
      }
    )
  })

/**
 * @typedef {object} lndErr
 * @prop {string} reason
 * @prop {number} code
 *
 */
/**
 * @param {(invoice:Common.Schema.InvoiceWhenListed & {r_hash:Buffer,payment_addr:string}) => (boolean | undefined)} dataCb
 * @param {(error:lndErr) => void} errorCb
 */
const subscribeInvoices = (dataCb, errorCb) => {
  const { lightning } = lightningServices.getServices()
  const stream = lightning.subscribeInvoices({})
  stream.on('data', invoice => {
    const cancelStream = dataCb(invoice)
    if (cancelStream) {
      //@ts-expect-error
      stream.cancel()
    }
  })
  stream.on('error', error => {
    errorCb(error)
    try {
      //@ts-expect-error
      stream.cancel()
    } catch {
      logger.info(
        '[subscribeInvoices] tried to cancel an already canceled stream'
      )
    }
  })
}

/**
 * @param {(tx:Common.Schema.ChainTransaction) => (boolean | undefined)} dataCb
 * @param {(error:lndErr) => void} errorCb
 */
const subscribeTransactions = (dataCb, errorCb) => {
  const { lightning } = lightningServices.getServices()
  const stream = lightning.subscribeTransactions({})
  stream.on('data', transaction => {
    const cancelStream = dataCb(transaction)
    if (cancelStream) {
      //@ts-expect-error
      stream.cancel()
    }
  })
  stream.on('error', error => {
    errorCb(error)
    try {
      //@ts-expect-error
      stream.cancel()
    } catch {
      logger.info(
        '[subscribeTransactions] tried to cancel an already canceled stream'
      )
    }
  })
}

module.exports = {
  sendPaymentV2Keysend,
  sendPaymentV2Invoice,
  listPayments,
  decodePayReq,
  newAddress,
  listUnspent,
  listChannels,
  getChanInfo,
  listPeers,
  pendingChannels,
  addInvoice,
  subscribeInvoices,
  subscribeTransactions
}
