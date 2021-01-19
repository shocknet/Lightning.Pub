/**
 * @format
 */
// @ts-check
const { performance } = require('perf_hooks')
const logger = require('winston')
const isFinite = require('lodash/isFinite')
const isNumber = require('lodash/isNumber')
const isNaN = require('lodash/isNaN')
const Common = require('shock-common')
const crypto = require('crypto')
// @ts-expect-error TODO fix this
const fetch = require('node-fetch')
const {
  Constants: { ErrorCode },
  Schema
} = Common
const SchemaManager = require('../../../schema')
const LightningServices = require('../../../../utils/lightningServices')

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
 * @param {InvoiceRequest} invoiceReq
 * @returns {Promise<InvoiceResponse>}
 */
const _addInvoice = invoiceReq =>
  new Promise((resolve, rej) => {
    const {
      services: { lightning }
    } = LightningServices

    lightning.addInvoice(invoiceReq, (
      /** @type {any} */ error,
      /** @type {InvoiceResponse} */ response
    ) => {
      if (error) {
        rej(error)
      } else {
        resolve(response)
      }
    })
  })

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

    //const listenerStartTime = performance.now()

    ordersProcessed.add(orderID)

    logger.info(
      `onOrders() -> processing order: ${orderID} -- ${JSON.stringify(
        order
      )} -- addr: ${addr}`
    )

    const orderAnswerStartTime = performance.now()

    const alreadyAnswered = await getUser()
      .get(Key.ORDER_TO_RESPONSE)
      .get(orderID)
      .then()

    if (alreadyAnswered) {
      logger.info('this order is already answered, quitting')
      return
    }

    const orderAnswerEndTime = performance.now() - orderAnswerStartTime

    logger.info(`[PERF] Order Already Answered: ${orderAnswerEndTime}ms`)

    const decryptStartTime = performance.now()

    const senderEpub = await Utils.pubToEpub(order.from)
    const secret = await SEA.secret(senderEpub, getUser()._.sea)

    const [decryptedAmount, memo] = await Promise.all([
      SEA.decrypt(order.amount, secret),
      SEA.decrypt(order.memo, secret)
    ])

    const decryptEndTime = performance.now() - decryptStartTime

    logger.info(`[PERF] Decrypt invoice info: ${decryptEndTime}ms`)

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

    const invoiceStartTime = performance.now()

    const invoice = await _addInvoice(invoiceReq)

    const invoiceEndTime = performance.now() - invoiceStartTime

    logger.info(`[PERF] LND Invoice created in ${invoiceEndTime}ms`)

    logger.info(
      'onOrders() -> Successfully created the invoice, will now encrypt it'
    )

    const invoiceEncryptStartTime = performance.now()

    const encInvoice = await SEA.encrypt(invoice.payment_request, secret)

    const invoiceEncryptEndTime = performance.now() - invoiceEncryptStartTime

    logger.info(`[PERF] Invoice encrypted in ${invoiceEncryptEndTime}ms`)

    logger.info(
      `onOrders() -> Will now place the encrypted invoice in order to response usergraph: ${addr}`
    )

    /** @type {import('shock-common').Schema.OrderResponse} */
    const orderResponse = {
      response: encInvoice,
      type: 'invoice'
    }

    const invoicePutStartTime = performance.now()

    await new Promise((res, rej) => {
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
    })

    const invoicePutEndTime = performance.now() - invoicePutStartTime

    logger.info(`[PERF] Added invoice to GunDB in ${invoicePutEndTime}ms`)

    /**
     *
     * @type {Common.Schema.InvoiceWhenListed & {r_hash:Buffer,payment_addr:string}}
     */
    const paidInvoice = await new Promise(res => {
      SchemaManager.addListenInvoice(invoice.r_hash, res)
    })
    const hashString = paidInvoice.r_hash.toString('hex')
    const {
      amt_paid_sat: amt,
      add_index: addIndex,
      payment_addr: paymentAddr
    } = paidInvoice
    const orderType = order.targetType
    const { ackInfo } = order //a string representing what has been requested
    switch (orderType) {
      case 'tip': {
        const postID = ackInfo
        if (!Common.isPopulatedString(postID)) {
          break //create the coordinate, but stop because of the invalid id
        }
        getUser()
          .get('postToTipCount')
          .get(postID)
          .set(null) // each item in the set is a tip
        break
      }
      case 'spontaneousPayment': {
        //no action required
        break
      }
      case 'contentReveal': {
        //assuming digital product that only requires to be unlocked
        const postID = ackInfo
        if (!Common.isPopulatedString(postID)) {
          break //create the coordinate, but stop because of the invalid id
        }
        const selectedPost = await new Promise(res => {
          getUser()
            .get(Key.POSTS_NEW)
            .get(postID)
            .load(res)
        })
        if (!Common.Schema.isPost(selectedPost)) {
          break //create the coordinate, but stop because of the invalid post
        }
        /**
         * @type {Record<string,string>} <contentID,decryptedRef>
         */
        const contentsToSend = {}
        const mySecret = require('../../Mediator').getMySecret()
        await Common.Utils.asyncForEach(
          Object.entries(selectedPost.contentItems),
          async ([contentID, item]) => {
            if (
              item.type !== 'image/embedded' &&
              item.type !== 'video/embedded'
            ) {
              return //only visual content can  be private
            }
            if (!item.isPrivate) {
              return
            }
            const decrypted = await SEA.decrypt(item.magnetURI, mySecret)
            contentsToSend[contentID] = decrypted
          }
        )
        const ackData = { unlockedContents: contentsToSend }
        const toSend = JSON.stringify(ackData)
        const encrypted = await SEA.encrypt(toSend, secret)
        const ordResponse = {
          type: 'orderAck',
          content: encrypted
        }
        await new Promise((res, rej) => {
          getUser()
            .get(Key.ORDER_TO_RESPONSE)
            .get(orderID)
            .put(ordResponse, ack => {
              if (ack.err && typeof ack.err !== 'number') {
                rej(
                  new Error(
                    `Error saving encrypted orderAck to order to response usergraph: ${ack}`
                  )
                )
              } else {
                res()
              }
            })
        })
        break
      }
      case 'torrentSeed': {
        const seedUrl = process.env.TORRENT_SEED_URL
        const seedToken = process.env.TORRENT_SEED_TOKEN
        if (!seedUrl || !seedToken) {
          break //service not available
        }
        const token = crypto.randomBytes(32).toString('hex')
        const reqData = {
          seed_token: seedToken,
          wallet_token: token
        }
        const res = await fetch(`${seedUrl}/api/enroll_token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reqData)
        })
        if (res.ok) {
          break //request didnt work, save coordinate anyway
        }

        const ackData = { seedUrl, token }
        const toSend = JSON.stringify(ackData)
        const encrypted = await SEA.encrypt(toSend, secret)
        const serviceResponse = {
          type: 'orderAck',
          content: encrypted
        }
        await new Promise((res, rej) => {
          getUser()
            .get(Key.ORDER_TO_RESPONSE)
            .get(orderID)
            .put(serviceResponse, ack => {
              if (ack.err && typeof ack.err !== 'number') {
                rej(
                  new Error(
                    `Error saving encrypted orderAck to order to response usergraph: ${ack}`
                  )
                )
              } else {
                res()
              }
            })
        })
        break
      }
      case 'other': //not implemented yet but save them as a coordinate anyways
        break
      default:
        return //exit because not implemented
    }
    const myGunPub = getUser()._.sea.pub
    SchemaManager.AddOrder({
      type: orderType,
      coordinateHash: hashString,
      coordinateIndex: parseInt(addIndex, 10),
      inbound: true,
      amount: parseInt(amt, 10),

      toLndPub: paymentAddr,
      fromGunPub: order.from,
      toGunPub: myGunPub,
      invoiceMemo: memo
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
