/**
 * @format
 */
const ErrorCode = require('../errorCode')
const Key = require('../key')
const Schema = require('../schema')
const Utils = require('../utils')

/**
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ListenerData} ListenerData
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 */

let currentOrderAddr = ''

/**
 * @param {string} addr
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {(order: ListenerData, orderID: string) => void}
 */
const listenerForAddr = (addr, user, SEA) => async (order, orderID) => {
  if (addr !== currentOrderAddr) {
    return
  }

  if (!Schema.isOrder(order)) {
    throw new Error(`Expected an order instead got: ${JSON.stringify(order)}`)
  }

  const senderEpub = await Utils.pubToEpub(order.from)
  const secret = await SEA.secret(senderEpub, user._.sea)

  const amount = Number(await SEA.decrypt(order.amount, secret))
  const memo = await SEA.decrypt(order.memo, secret)

  // create invoice here..

  const invoice = `INVOICE_${amount}_${memo}`

  const encInvoice = await SEA.encrypt(invoice, secret)

  user
    .get(Key.ORDER_TO_RESPONSE)
    .get(orderID)
    .put(encInvoice, ack => {
      if (ack.err) {
        console.error(`error saving order response: ${ack.err}`)
      }
    })
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
    throw new Error(ErrorCode.NOT_AUTH)
  }

  user.get(Key.CURRENT_ORDER_ADDRESS).on(addr => {
    if (typeof addr !== 'string') {
      throw new TypeError('Expected current order address to be an string')
    }

    currentOrderAddr = addr

    gun
      .get(Key.ORDER_NODES)
      .get(addr)
      .map()
      .on(listenerForAddr(currentOrderAddr, user, SEA))
  })
}

module.exports = onOrders
