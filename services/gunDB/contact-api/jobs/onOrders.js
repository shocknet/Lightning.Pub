/**
 * @format
 */
// @ts-check
const logger = require('winston')
const isFinite = require('lodash/isFinite')
const isNumber = require('lodash/isNumber')
const isNaN = require('lodash/isNaN')
const Common = require('shock-common')
const {
  Constants: { ErrorCode },
  Schema
} = Common
const { assertNever } = require('assert-never')

const LightningServices = require('../../../../utils/lightningServices')
const {
  addInvoice,
  myLNDPub
} = require('../../../../utils/lightningServices/v2')
const { writeCoordinate } = require('../../../coordinates')
const Key = require('../key')
const Utils = require('../utils')

const getUser = () => require('../../Mediator').getUser()

/**
 * @type {Set<string>}
 */
const ordersProcessed = new Set()

/**
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ListenerData} ListenerData
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 */

/**
 * @typedef {object} InvoiceRequest
 * @prop {number} expiry
 * @prop {string} memo
 * @prop {number} value
 * @prop {boolean} private
 */

/**
 * @typedef {object} InvoiceResponse
 * @prop {string} payment_request
 * @prop {Buffer} r_hash
 */

/**
 * @typedef {object} TipPaymentStatus
 * @prop {string} hash
 * @prop {import('shock-common').Schema.InvoiceState} state
 * @prop {string} targetType
 * @prop {(string)=} postID
 */

let currentOrderAddr = ''

/**
 * @param {string} addr
 * @param {ISEA} SEA
 * @returns {(order: ListenerData, orderID: string) => void}
 */
const listenerForAddr = (addr, SEA) => async (order, orderID) => {
  try {
    if (addr !== currentOrderAddr) {
      logger.info(
        `order address: ${addr} invalidated (current address: ${currentOrderAddr})`
      )
      return
    }

    if (!Schema.isOrder(order)) {
      logger.info(`Expected an order instead got: ${JSON.stringify(order)}`)
      return
    }

    if (ordersProcessed.has(orderID)) {
      logger.warn(
        `skipping already processed order: ${orderID}, this means orders are being processed twice!`
      )
      return
    }

    ordersProcessed.add(orderID)

    logger.info(
      `onOrders() -> processing order: ${orderID} -- ${JSON.stringify(
        order
      )} -- addr: ${addr}`
    )

    const alreadyAnswered = await getUser()
      .get(Key.ORDER_TO_RESPONSE)
      .get(orderID)
      .then()

    if (alreadyAnswered) {
      logger.info('this order is already answered, quitting')
      return
    }

    const senderEpub = await Utils.pubToEpub(order.from)
    const secret = await SEA.secret(senderEpub, getUser()._.sea)

    const [decryptedAmount, memo] = await Promise.all([
      SEA.decrypt(order.amount, secret),
      SEA.decrypt(order.memo, secret)
    ])

    const amount = Number(decryptedAmount)

    if (!isNumber(amount)) {
      throw new TypeError(
        `Could not parse decrypted amount as a number, not a number?, decryptedAmount: ${decryptedAmount}`
      )
    }

    if (isNaN(amount)) {
      throw new TypeError(
        `Could not parse decrypted amount as a number, got NaN, decryptedAmount: ${decryptedAmount}`
      )
    }

    if (!isFinite(amount)) {
      throw new TypeError(
        `Amount was correctly decrypted, but got a non finite number, decryptedAmount: ${decryptedAmount}`
      )
    }

    const invoiceReq = {
      expiry: 36000,
      memo,
      value: amount,
      private: true
    }

    logger.info(
      `onOrders() -> Will now create an invoice : ${JSON.stringify(invoiceReq)}`
    )

    const invoice = await addInvoice(
      invoiceReq.value,
      invoiceReq.memo,
      true,
      invoiceReq.expiry
    )

    logger.info(
      'onOrders() -> Successfully created the invoice, will now encrypt it'
    )

    const encInvoice = await SEA.encrypt(invoice.payment_request, secret)

    logger.info(
      `onOrders() -> Will now place the encrypted invoice in order to response usergraph: ${addr}`
    )

    /** @type {import('shock-common').Schema.OrderResponse} */
    const orderResponse = {
      response: encInvoice,
      type: 'invoice'
    }

    await /** @type {Promise<void>} */ (new Promise((res, rej) => {
      getUser()
        .get(Key.ORDER_TO_RESPONSE)
        .get(orderID)
        // @ts-expect-error
        .put(orderResponse, ack => {
          if (ack.err && typeof ack.err !== 'number') {
            rej(
              new Error(
                `Error saving encrypted invoice to order to response usergraph: ${ack}`
              )
            )
          } else {
            res()
          }
        })
    }))

    // invoices should be settled right away so we can rely on this single
    // subscription instead of life-long all invoices subscription
    if (order.targetType === 'tip') {
      const { ackInfo } = order
      if (!Common.isPopulatedString(ackInfo)) {
        throw new TypeError(`ackInfo(postID) not a a populated string`)
      }
    }

    // A post tip order lifecycle is short enough that we can do it like this.
    const stream = LightningServices.invoices.subscribeSingleInvoice({
      r_hash: invoice.r_hash
    })

    /** @type {Common.Coordinate} */
    const coord = {
      amount,
      id: invoice.r_hash.toString(),
      inbound: true,
      timestamp: Date.now(),
      type: 'invoice',
      invoiceMemo: memo,
      fromGunPub: order.from,
      toGunPub: getUser()._.sea.pub,
      toLndPub: await myLNDPub()
    }

    if (order.targetType === 'tip') {
      coord.type = 'tip'
    } else {
      coord.type = 'spontaneousPayment'
    }

    /**
     * @param {Common.InvoiceWhenListed} invoice
     */
    const onData = invoice => {
      if (invoice.settled) {
        writeCoordinate(invoice.r_hash.toString(), coord)

        if (order.targetType === 'tip') {
          getUser()
            .get('postToTipCount')
            // CAST: Checked above.
            .get(/** @type {string} */ (order.ackInfo))
            .set(null) // each item in the set is a tip
        } else if (order.targetType === 'contentReveal') {
          // TODO
        } else if (order.targetType === 'spontaneousPayment') {
          // no action required
        } else if (order.targetType === 'torrentSeed') {
          // TODO
        } else if (order.targetType === 'other') {
          // TODO
        } else {
          assertNever(order.targetType)
        }

        stream.off()
      }
    }

    stream.on('data', onData)

    stream.on('status', (/** @type {any} */ status) => {
      logger.info(`Post tip, post: ${order.ackInfo}, invoice status:`, status)
    })
    stream.on('end', () => {
      logger.warn(`Post tip, post: ${order.ackInfo}, invoice stream ended`)
    })
    stream.on('error', (/** @type {any} */ e) => {
      logger.warn(`Post tip, post: ${order.ackInfo}, error:`, e)
    })
  } catch (err) {
    logger.error(
      `error inside onOrders, orderAddr: ${addr}, orderID: ${orderID}, order: ${JSON.stringify(
        order
      )}`
    )
    logger.error(err)

    /** @type {import('shock-common').Schema.OrderResponse} */
    const orderResponse = {
      response: err.message,
      type: 'err'
    }

    getUser()
      .get(Key.ORDER_TO_RESPONSE)
      .get(orderID)
      // @ts-expect-error
      .put(orderResponse, ack => {
        if (ack.err && typeof ack.err !== 'number') {
          logger.error(
            `Error saving encrypted invoice to order to response usergraph: ${ack}`
          )
        }
      })
  }
}

/**
 * @param {UserGUNNode} user
 * @param {GUNNode} gun
 * @param {ISEA} SEA
 * @throws {Error} NOT_AUTH
 * @returns {void}
 */
const onOrders = (user, gun, SEA) => {
  if (!user.is) {
    logger.warn('onOrders() -> tried to sub without authing')
    throw new Error(ErrorCode.NOT_AUTH)
  }

  user.get(Key.CURRENT_ORDER_ADDRESS).on(addr => {
    try {
      if (typeof addr !== 'string') {
        logger.error('Expected current order address to be an string')
        return
      }

      currentOrderAddr = addr
      logger.info(`listening to address: ${addr}`)

      gun
        .get(Key.ORDER_NODES)
        .get(addr)
        .map()
        .on(listenerForAddr(currentOrderAddr, SEA))
    } catch (e) {
      logger.error(`Could not subscribe to order node: ${addr}, error:`)
      logger.error(e)
    }
  })
}

module.exports = onOrders
