/**
 * @format
 */
// @ts-check
const logger = require('../../../../config/log')
const isFinite = require('lodash/isFinite')
const isNumber = require('lodash/isNumber')
const isNaN = require('lodash/isNaN')
const Common = require('shock-common')
const {
  Constants: { ErrorCode },
  Schema
} = Common
const SchemaManager = require('../../../schema')
const LightningServices = require('../../../../utils/lightningServices')
const Key = require('../key')
const Utils = require('../utils')
const { selfContentToken, enrollContentTokens } = require('../../../seed')
/// <reference path="../../../utils/GunSmith/Smith.ts" />
const TipForwarder = require('../../../tipsCallback')

const getUser = () => require('../../Mediator').getUser()

/**
 * @type {Set<string>}
 */
const ordersProcessed = new Set()

/**
 * @typedef {Smith.GunSmithNode} GUNNode
 * @typedef {GunT.ListenerData} ListenerData
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {Smith.UserSmithNode} UserGUNNode
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
        orderID,
        `order address: ${addr} invalidated (current address: ${currentOrderAddr})`
      )
      return
    }

    // Was recycled
    if (order === null) {
      return
    }

    if (!Schema.isOrder(order)) {
      logger.info(
        orderID,
        `Expected an order instead got: ${JSON.stringify(order)}`
      )
      return
    }

    // Gun might callback several times for the same order, avoid dupe
    // processing.
    if (ordersProcessed.has(orderID)) {
      return
    }

    //const listenerStartTime = performance.now()

    ordersProcessed.add(orderID)

    if (Date.now() - order.timestamp > 66000) {
      logger.info('Not processing old order', orderID)
      return
    }

    logger.info('processing order ', orderID)

    const alreadyAnswered = await getUser()
      .get(Key.ORDER_TO_RESPONSE)
      .get(orderID)
      .then()

    if (alreadyAnswered) {
      logger.info(orderID, 'alreadyAnswered')
      return
    }

    logger.info(orderID, ' was not answered, will now answer')

    const senderEpub = await Utils.pubToEpub(order.from)
    const secret = await SEA.secret(senderEpub, getUser()._.sea)

    const [decryptedAmount, memo] = await Promise.all([
      SEA.decrypt(order.amount, secret),
      SEA.decrypt(order.memo, secret)
    ])

    const amount = Number(decryptedAmount)

    if (!isNumber(amount)) {
      throw new TypeError(
        `${orderID} Could not parse decrypted amount as a number, not a number?, decryptedAmount: ${decryptedAmount}`
      )
    }

    if (isNaN(amount)) {
      throw new TypeError(
        `${orderID} Could not parse decrypted amount as a number, got NaN, decryptedAmount: ${decryptedAmount}`
      )
    }

    if (!isFinite(amount)) {
      throw new TypeError(
        `${orderID} Amount was correctly decrypted, but got a non finite number, decryptedAmount: ${decryptedAmount}`
      )
    }
    const mySecret = require('../../Mediator').getMySecret()
    /**
     * @type {string|null}
     */
    let serviceOrderType = null //if the order refers to a service, we take the info from the service before sending the invoice
    /**
     * @type {{ seedUrl: string, seedToken: string }|null}
     */
    let serviceOrderContentSeedInfo = null //in case the service is of type 'torrentSeed' this is {seedUrl,seedToken}, can be omitted, in that case, it will be taken from env
    if (order.targetType === 'service') {
      logger.info(orderID, 'General Service')
      const { ackInfo: serviceID } = order
      logger.info(orderID, 'ACK INFO')
      logger.info(orderID, serviceID)
      if (!Common.isPopulatedString(serviceID)) {
        throw new TypeError(`${orderID} no serviceID provided to orderAck`)
      }
      const selectedService = await getUser()
        .get(Key.OFFERED_SERVICES)
        .get(serviceID)
        .then()

      logger.info(orderID, selectedService)
      if (!Common.isObj(selectedService)) {
        throw new TypeError(
          `${orderID} invalid serviceID provided to orderAck or service is not an object`
        )
      }

      const {
        serviceType,
        servicePrice,
        serviceSeedUrl: encSeedUrl, //=
        serviceSeedToken: encSeedToken //=
      } = /** @type {Record<string, any>} */ (selectedService)
      if (Number(amount) !== Number(servicePrice)) {
        throw new TypeError(
          `${orderID} service price mismatch ${amount} : ${servicePrice}`
        )
      }
      if (serviceType === 'torrentSeed') {
        if (encSeedUrl && encSeedToken) {
          const seedUrl = await SEA.decrypt(encSeedUrl, mySecret)
          const seedToken = await SEA.decrypt(encSeedToken, mySecret)
          serviceOrderContentSeedInfo = { seedUrl, seedToken }
        }
      }

      serviceOrderType = serviceType
    }

    const invoiceReq = {
      expiry: 36000,
      memo,
      value: amount,
      private: true
    }

    const invoice = await _addInvoice(invoiceReq)

    logger.info(
      `${orderID} onOrders() -> Successfully created the invoice, will now encrypt it`
    )

    const encInvoice = await SEA.encrypt(invoice.payment_request, secret)

    logger.info(
      `${orderID} onOrders() -> Will now place the encrypted invoice in order to response usergraph: ${addr}`
    )

    const ackNode = Utils.gunID()

    /** @type {import('shock-common').Schema.OrderResponse} */
    const orderResponse = {
      response: encInvoice,
      type: 'invoice',
      ackNode
    }

    await /** @type {Promise<void>} */ (new Promise((res, rej) => {
      getUser()
        .get(Key.ORDER_TO_RESPONSE)
        .get(orderID)
        // @ts-expect-error
        .put(orderResponse, ack => {
          if (
            ack.err &&
            typeof ack.err !== 'number' &&
            typeof ack.err !== 'object'
          ) {
            rej(
              new Error(
                `${orderID} Error saving encrypted invoice to order to response usergraph: ${ack}`
              )
            )
          } else {
            res()
          }
        })
    }))

    //logger.info(`[PERF] Added invoice to GunDB in ${invoicePutEndTime}ms`)
    /**
     *
     * @param {Common.Schema.InvoiceWhenListed & {r_hash:Buffer,payment_addr:Buffer}} paidInvoice
     */
    const invoicePaidCb = async paidInvoice => {
      logger.info(orderID, 'INVOICE  PAID')
      // Recycle
      require('../../Mediator')
        .getGun()
        .get('orderNodes')
        .get(addr)
        .get(orderID)
        .put(null)

      let breakError = null
      let orderMetadata //eslint-disable-line init-declarations
      const hashString = paidInvoice.r_hash.toString('hex')
      const {
        amt_paid_sat: amt,
        add_index: addIndex,
        payment_addr
      } = paidInvoice
      const paymentAddr = payment_addr.toString('hex')
      const orderType = serviceOrderType || order.targetType
      const { ackInfo } = order //a string representing what has been requested
      switch (orderType) {
        case 'tip': {
          const postID = ackInfo
          if (!Common.isPopulatedString(postID)) {
            breakError = orderID + ' invalid ackInfo provided for postID'
            break //create the coordinate, but stop because of the invalid id
          }
          getUser()
            .get(Key.POSTS_NEW)
            .get(postID)
            .get('tipsSet')
            .set(amt) // each item in the set is a tip

          TipForwarder.notifySocketIfAny(
            postID,
            order.from,
            paidInvoice.memo || 'TIPPED YOU',
            amt + ' sats'
          )
          const ackData = { tippedPost: postID }
          const toSend = JSON.stringify(ackData)
          const encrypted = await SEA.encrypt(toSend, secret)
          const ordResponse = {
            type: 'orderAck',
            response: encrypted
          }
          await new Promise((res, rej) => {
            getUser()
              .get(Key.ORDER_TO_RESPONSE)
              .get(ackNode)
              .put(ordResponse, ack => {
                if (
                  ack.err &&
                  typeof ack.err !== 'number' &&
                  typeof ack.err !== 'object'
                ) {
                  rej(
                    new Error(
                      `${orderID} Error saving encrypted orderAck to order to response usergraph: ${ack}`
                    )
                  )
                } else {
                  res(null)
                }
              })
          })
          orderMetadata = JSON.stringify(ackData)
          break
        }
        case 'spontaneousPayment': {
          //no action required
          break
        }
        case 'contentReveal': {
          logger.info(orderID, 'CONTENT REVEAL')
          //assuming digital product that only requires to be unlocked
          const postID = ackInfo
          logger.info(orderID, 'ACK INFO')
          logger.info(ackInfo)
          if (!Common.isPopulatedString(postID)) {
            breakError = 'invalid ackInfo provided for postID'
            break //create the coordinate, but stop because of the invalid id
          }
          logger.info(orderID, 'IS STRING')
          const selectedPost = /** @type {Record<string, any>} */ (await getUser()
            .get(Key.POSTS_NEW)
            .get(postID)
            .then())
          const selectedPostContent = /** @type {Record<string, any>} */ (await getUser()
            .get(Key.POSTS_NEW)
            .get(postID)
            .get(Key.CONTENT_ITEMS)
            .then())

          logger.info(orderID, 'LOAD ok')
          logger.info(selectedPost)
          if (
            !selectedPost ||
            !selectedPost.status ||
            selectedPost.status !== 'publish'
          ) {
            breakError = 'ackInfo provided does not correspond to a valid post'
            break //create the coordinate, but stop because of the invalid post
          }
          logger.info(orderID, 'IS POST')
          /**
           * @type {Record<string,string>} <contentID,decryptedRef>
           */
          const contentsToSend = {}
          logger.info(orderID, 'SECRET OK')
          let privateFound = false
          await Common.Utils.asyncForEach(
            Object.entries(selectedPostContent),
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
              privateFound = true
              const decrypted = await SEA.decrypt(item.magnetURI, mySecret)
              contentsToSend[contentID] = decrypted
            }
          )
          if (!privateFound) {
            breakError =
              'post provided from ackInfo does not contain private content'
            break //no private content in this post
          }
          const ackData = { unlockedContents: contentsToSend, ackInfo }
          const toSend = JSON.stringify(ackData)
          const encrypted = await SEA.encrypt(toSend, secret)
          const ordResponse = {
            type: 'orderAck',
            response: encrypted
          }
          logger.info(orderID, 'RES READY')

          await new Promise((res, rej) => {
            getUser()
              .get(Key.ORDER_TO_RESPONSE)
              .get(ackNode)
              .put(ordResponse, ack => {
                if (
                  ack.err &&
                  typeof ack.err !== 'number' &&
                  typeof ack.err !== 'object'
                ) {
                  rej(
                    new Error(
                      `Error saving encrypted orderAck to order to response usergraph: ${ack}`
                    )
                  )
                } else {
                  res(null)
                }
              })
          })
          logger.info(orderID, 'RES SENT CONTENT')
          orderMetadata = JSON.stringify(ackData)
          break
        }
        case 'torrentSeed': {
          logger.info(orderID, 'TORRENT')
          const numberOfTokens = Number(ackInfo) || 1
          const seedInfo = selfContentToken()
          if (!seedInfo && !serviceOrderContentSeedInfo) {
            breakError = 'torrentSeed service not available'
            break //service not available
          }
          const seedInfoReady = serviceOrderContentSeedInfo || seedInfo
          if (!seedInfoReady) {
            breakError = 'torrentSeed service not available'
            break //service not available
          }
          const { seedUrl } = seedInfoReady
          const tokens = await enrollContentTokens(
            numberOfTokens,
            seedInfoReady
          )
          logger.info(orderID, 'RES SEED OK')
          const ackData = { seedUrl, tokens, ackInfo }
          const toSend = JSON.stringify(ackData)
          const encrypted = await SEA.encrypt(toSend, secret)
          const serviceResponse = {
            type: 'orderAck',
            response: encrypted
          }
          logger.info(orderID, 'RES SEED SENT')
          await new Promise((res, rej) => {
            getUser()
              .get(Key.ORDER_TO_RESPONSE)
              .get(ackNode)
              .put(serviceResponse, ack => {
                if (
                  ack.err &&
                  typeof ack.err !== 'number' &&
                  typeof ack.err !== 'object'
                ) {
                  rej(
                    new Error(
                      `Error saving encrypted orderAck to order to response usergraph: ${ack}`
                    )
                  )
                } else {
                  res(null)
                }
              })
          })
          logger.info(orderID, 'RES SENT SEED')
          orderMetadata = JSON.stringify(ackData)
          break
        }
        case 'other': //not implemented yet but save them as a coordinate anyways
          break
        default:
          breakError = 'invalid service type provided'
          return //exit because not implemented
      }
      const metadata = breakError ? JSON.stringify(breakError) : orderMetadata
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
        invoiceMemo: memo,

        metadata
      })
      if (breakError) {
        throw new Error(breakError)
      }
    }
    logger.info(orderID, 'Waiting for invoice to be paid for order ' + orderID)
    new Promise(res => SchemaManager.addListenInvoice(invoice.r_hash, res))
      .then(invoicePaidCb)
      .catch(err => {
        logger.error(
          orderID,
          `error inside onOrders, orderAddr: ${addr}, orderID: ${orderID}, order: ${JSON.stringify(
            order
          )}`
        )
        logger.error(orderID, err)
        logger.info(orderID, err)

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
            if (
              ack.err &&
              typeof ack.err !== 'number' &&
              typeof ack.err !== 'object'
            ) {
              logger.error(
                orderID,
                `Error saving encrypted invoice to order to response usergraph: ${ack}`
              )
            }
          })
      })
  } catch (/** @type {any} */ err) {
    logger.error(
      orderID,
      `error inside onOrders, orderAddr: ${addr}, orderID: ${orderID}, order: ${JSON.stringify(
        order
      )}`
    )
    logger.error(orderID, err)
    logger.info(orderID, err)

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
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          logger.error(
            orderID,
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

      if (currentOrderAddr === addr) {
        // Already subscribed
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
