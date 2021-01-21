const Crypto = require('crypto')
const logger = require('winston')
const Common = require('shock-common')
const getGunUser = () => require('../gunDB/Mediator').getUser()
const isAuthenticated = () => require('../gunDB/Mediator').isAuthenticated()
const Key = require('../gunDB/contact-api/key')
const lndV2 = require('../../utils/lightningServices/v2')
/**
 * @typedef {import('../gunDB/contact-api/SimpleGUN').ISEA} ISEA
 * @typedef { 'spontaneousPayment' | 'tip' | 'torrentSeed' | 'contentReveal' | 'other'|'invoice'|'payment'|'chainTx' } OrderType
 * 
 * This represents a settled order only, unsettled orders have no coordinate
 * @typedef {object} CoordinateOrder //everything is optional for different types
 * @prop {string=} fromLndPub can be unknown when inbound
 * @prop {string=} toLndPub always known
 * @prop {string=} fromGunPub can be optional, if the payment/invoice is not related to an order
 * @prop {string=} toGunPub can be optional, if the payment/invoice is not related to an order
 * @prop {string=} fromBtcPub
 * @prop {string=} toBtcPub
 * @prop {boolean} inbound
 * NOTE: type specific checks are not made before creating the order node, filters must be done before rendering or processing
 * 
 * @prop {string=} ownerGunPub Reserved for buddy system:
 * can be undefined, '', 'me', or node owner pub key to represent node owner, 
 * otherwise it represents a buddy  
 * 
 * @prop {number} coordinateIndex can be payment_index, or add_index depending on if it's a payment  or an invoice
 * @prop {string} coordinateHash can be payment_hash, or r_hash depending on if it's a payment  or an invoice,
 * if it's a r_hash, must be hex encoded
 * 
 * @prop {OrderType} type
 * @prop {number} amount
 * @prop {string=} description
 * @prop {string=} invoiceMemo
 * @prop {string=} metadata JSON encoded string to store extra data for special use cases
 * @prop {number=} timestamp timestamp will be added at processing time if empty
 * 
 */

/**
 * @param {CoordinateOrder} order 
 */
const checkOrderInfo = order => {
  const {
    fromLndPub,
    toLndPub,
    fromGunPub,
    toGunPub,
    fromBtcPub,
    toBtcPub,
    inbound,
    type,
    amount,
    description,
    coordinateIndex,
    coordinateHash,
    metadata,
    invoiceMemo
  } = order

  if (fromLndPub && (typeof fromLndPub !== 'string' || fromLndPub === '')) {
    return 'invalid "fromLndPub" field provided to order coordinate'
  }
  if (toLndPub && (typeof toLndPub !== 'string' || toLndPub === '')) {
    return 'invalid or no "toLndPub" field provided to order coordinate'
  }
  if (fromGunPub && (typeof fromGunPub !== 'string' || fromGunPub === '')) {
    return 'invalid "fromGunPub" field provided to order coordinate'
  }
  if (toGunPub && (typeof toGunPub !== 'string' || toGunPub === '')) {
    return 'invalid "toGunPub" field provided to order coordinate'
  }
  if (fromBtcPub && (typeof fromBtcPub !== 'string' || fromBtcPub === '')) {
    return 'invalid "fromBtcPub" field provided to order coordinate'
  }
  if (toBtcPub && (typeof toBtcPub !== 'string' || toBtcPub === '')) {
    return 'invalid "toBtcPub" field provided to order coordinate'
  }
  if (typeof inbound !== 'boolean') {
    return 'invalid or no "inbound" field provided to order coordinate'
  }
  //@ts-expect-error 
  if (typeof type !== 'string' || type === '') {
    return 'invalid or no "type" field provided to order coordinate'
  }
  if (typeof amount !== 'number') {
    return 'invalid or no "amount" field provided to order coordinate'
  }

  if (typeof coordinateIndex !== 'number') {
    return 'invalid or no "coordinateIndex" field provided to order coordinate'
  }
  if (typeof coordinateHash !== 'string' || coordinateHash === '') {
    return 'invalid or no "coordinateHash" field provided to order coordinate'
  }

  if (description && (typeof description !== 'string' || description === '')) {
    return 'invalid "description" field provided to order coordinate'
  }
  if (invoiceMemo && (typeof invoiceMemo !== 'string' || invoiceMemo === '')) {
    return 'invalid "invoiceMemo" field provided to order coordinate'
  }
  if (metadata && (typeof metadata !== 'string' || metadata === '')) {
    return 'invalid "metadata" field provided to order coordinate'
  }
  return null
}

/**
   * 
   * @param {CoordinateOrder} orderInfo 
   * @param {string} coordinateSHA256 
   */
const dateIndexCreateCb = (orderInfo, coordinateSHA256) => {
  //if (this.memIndex) { need bind to use this here 
  //update date memIndex
  //}
  const date = new Date(orderInfo.timestamp || 0)
  //use UTC for consistency?
  const year = date.getUTCFullYear().toString()
  const month = date.getUTCMonth().toString()

  getGunUser()
    .get(Key.DATE_COORDINATE_INDEX)
    .get(year)
    .get(month)
    .set(coordinateSHA256)
}

/**
 * if not provided, assume current month and year
 * @param {number|null} year 
 * @param {number|null} month 
 */
const getMonthCoordinates = async (year = null, month = null) => {
  const now = Date.now()
  //@ts-expect-error
  const stringYear = year !== null ? year.toString() : now.getUTCFullYear().toString()
  //@ts-expect-error
  const stringMonth = month !== null ? month.toString() : now.getUTCMonth().toString()

  const data = await new Promise(res => {
    getGunUser()
      .get(Key.DATE_COORDINATE_INDEX)
      .get(stringYear)
      .get(stringMonth)
      .load(res)
  })
  const coordinatesArray = Object
    .values(data)
    .filter(coordinateSHA256 => typeof coordinateSHA256 === 'string')

  return coordinatesArray
}

/**
 * 
 * @param {string|undefined} address 
 * @param {CoordinateOrder} orderInfo 
 */
const AddTmpChainOrder = async (address, orderInfo) => {
  if (!address) {
    throw new Error("invalid address passed to AddTmpChainOrder")
  }
  if (!orderInfo.toBtcPub) {
    throw new Error("invalid toBtcPub passed to AddTmpChainOrder")
  }
  const checkErr = checkOrderInfo(orderInfo)
  if (checkErr) {
    throw new Error(checkErr)
  }

  /**
   * @type {CoordinateOrder}
   */
  const filteredOrder = {
    fromLndPub: orderInfo.fromLndPub,
    toLndPub: orderInfo.toLndPub,
    fromGunPub: orderInfo.fromGunPub,
    toGunPub: orderInfo.toGunPub,
    inbound: orderInfo.inbound,
    ownerGunPub: orderInfo.ownerGunPub,
    coordinateIndex: orderInfo.coordinateIndex,
    coordinateHash: orderInfo.coordinateHash,
    type: orderInfo.type,
    amount: orderInfo.amount,
    description: orderInfo.description,
    metadata: orderInfo.metadata,

    timestamp: orderInfo.timestamp || Date.now(),
  }
  const orderString = JSON.stringify(filteredOrder)
  const mySecret = require('../gunDB/Mediator').getMySecret()
  const SEA = require('../gunDB/Mediator').mySEA
  const encryptedOrderString = await SEA.encrypt(orderString, mySecret)

  const addressSHA256 = Crypto.createHash('SHA256')
    .update(address)
    .digest('hex')

  await new Promise((res, rej) => {
    getGunUser()
      .get(Key.TMP_CHAIN_COORDINATE)
      .get(addressSHA256)
      .put(encryptedOrderString, ack => {
        if (ack.err && typeof ack.err !== 'number') {
          rej(
            new Error(
              `Error saving tmp chain coordinate order to user-graph: ${ack}`
            )
          )
        } else {
          res(null)
        }
      })
  })
}

/**
 * 
 * @param {string} address 
 * @returns {Promise<false|CoordinateOrder>}
 */
const isTmpChainOrder = async (address) => {
  if (typeof address !== 'string' || address === '') {
    return false
  }
  const addressSHA256 = Crypto.createHash('SHA256')
    .update(address)
    .digest('hex')

  const maybeData = await getGunUser()
    .get(Key.TMP_CHAIN_COORDINATE)
    .get(addressSHA256)
    .then()

  if (typeof maybeData !== 'string' || maybeData === '') {
    return false
  }
  const mySecret = require('../gunDB/Mediator').getMySecret()
  const SEA = require('../gunDB/Mediator').mySEA
  const decryptedString = await SEA.decrypt(maybeData, mySecret)
  if (typeof decryptedString !== 'string' || decryptedString === '') {
    return false
  }

  const tmpOrder = JSON.parse(decryptedString)
  const checkErr = checkOrderInfo(tmpOrder)
  if (checkErr) {
    return false
  }

  return tmpOrder

}

/**
 * @param {string} address 
 */
const clearTmpChainOrder = async (address) => {
  if (typeof address !== 'string' || address === '') {
    return
  }
  const addressSHA256 = Crypto.createHash('SHA256')
    .update(address)
    .digest('hex')

  await new Promise((res, rej) => {
    getGunUser()
      .get(Key.TMP_CHAIN_COORDINATE)
      .get(addressSHA256)
      .put(null, ack => {
        if (ack.err && typeof ack.err !== 'number') {
          rej(
            new Error(
              `Error nulling tmp chain coordinate order to user-graph: ${ack}`
            )
          )
        } else {
          res(null)
        }
      })
  })
}

/**
 * @param {Common.Schema.ChainTransaction} tx 
 * @param {CoordinateOrder|false| undefined} order 
 */
const handleUnconfirmedTx = (tx, order) => {
  const { tx_hash } = tx
  const amountInt = parseInt(tx.amount, 10)
  if (order) {
    /*if an order already exists, update the order data
    if an unconfirmed transaction has a tmp order already
    it means the address was generated by shockAPI, or the tx was sent by shockAPI*/
    const orderUpdate = order
    orderUpdate.amount = Math.abs(amountInt)
    orderUpdate.inbound = amountInt > 0
    /*tmp coordinate does not have a coordinate hash until the transaction is created, 
    before it will contain 'unknown' */
    orderUpdate.coordinateHash = tx_hash
    /*update the order data, 
    provides a notification when the TX enters the mempool */
    AddTmpChainOrder(orderUpdate.toBtcPub, orderUpdate)
  } else {
    /*if an order does not exist, create the tmp order,
    and use tx_hash as key.
    this means the address was NOT generated by shockAPI, or the tx was NOT sent by shockAPI */
    AddTmpChainOrder(tx_hash, {
      type: 'chainTx',
      amount: Math.abs(amountInt),
      coordinateHash: tx_hash,
      coordinateIndex: 0, //coordinate index is 0 until the tx is confirmed and the block is known
      inbound: amountInt > 0,
      toBtcPub: 'unknown'
    })
  }

}

class SchemaManager {
  constructor(opts = { memIndex: false }) {//config flag?
    this.memIndex = opts.memIndex
    this.orderCreateIndexCallbacks.push(dateIndexCreateCb) //create more Cbs and put them here for more indexes callbacks
  }

  dateIndexName = 'dateIndex'

  memIndex = false //save the index data in memory for faster access

  // MEM INDEX, will be used only if memIndex === true
  memDateIndex = {} //not implemented yet

  memGunPubIndex = {} //not implemented yet

  memLndPubIndex = {} //not implemented yet

  memTypeIndex = {} //not implemented yet
  //

  /**
   * @type {((order : CoordinateOrder,coordinateSHA256 : string)=>void)[]}
   */
  orderCreateIndexCallbacks = []

  /**
   * @param {CoordinateOrder} orderInfo
   */
  async AddOrder(orderInfo) {
    const checkErr = checkOrderInfo(orderInfo)
    if (checkErr) {
      throw new Error(checkErr)
    }

    /**
     * @type {CoordinateOrder}
     */
    const filteredOrder = {
      fromLndPub: orderInfo.fromLndPub,
      toLndPub: orderInfo.toLndPub,
      fromGunPub: orderInfo.fromGunPub,
      toGunPub: orderInfo.toGunPub,
      inbound: orderInfo.inbound,
      ownerGunPub: orderInfo.ownerGunPub,
      coordinateIndex: orderInfo.coordinateIndex,
      coordinateHash: orderInfo.coordinateHash,
      type: orderInfo.type,
      amount: orderInfo.amount,
      description: orderInfo.description,
      metadata: orderInfo.metadata,

      timestamp: orderInfo.timestamp || Date.now(),
    }
    const orderString = JSON.stringify(filteredOrder)
    const mySecret = require('../gunDB/Mediator').getMySecret()
    const SEA = require('../gunDB/Mediator').mySEA
    const encryptedOrderString = await SEA.encrypt(orderString, mySecret)
    const coordinatePub = filteredOrder.inbound ? filteredOrder.toLndPub : filteredOrder.fromLndPub
    const coordinate = `${coordinatePub}__${filteredOrder.coordinateIndex}__${filteredOrder.coordinateHash}`
    const coordinateSHA256 = Crypto.createHash('SHA256')
      .update(coordinate)
      .digest('hex')
    await new Promise((res, rej) => {
      getGunUser()
        .get(Key.COORDINATES)
        .get(coordinateSHA256)
        .put(encryptedOrderString, ack => {
          if (ack.err && typeof ack.err !== 'number') {
            console.log(ack)
            rej(
              new Error(
                `Error saving coordinate order to user-graph: ${ack}`
              )
            )
          } else {
            res(null)
          }
        })
    })

    //update all indexes with 
    this.orderCreateIndexCallbacks.forEach(cb => cb(filteredOrder, coordinateSHA256))
  }



  /**
   * if not provided, assume current month and year
   * @param {number|null} year 
   * @param {number|null} month 
   * @returns {Promise<CoordinateOrder[]>} from newer to older
   */
  async getMonthOrders(year = null, month = null) {
    const now = new Date()
    const intYear = year !== null ? year : now.getUTCFullYear()
    const intMonth = month !== null ? month : now.getUTCMonth()

    let coordinates = null
    if (this.memIndex) {
      //get coordinates from this.memDateIndex
    } else {
      coordinates = await getMonthCoordinates(intYear, intMonth)
    }
    /**
     * @type {CoordinateOrder[]}
     */
    const orders = []
    if (!coordinates) {
      return orders
    }
    await Common.Utils.asyncForEach(coordinates, async coordinateSHA256 => {
      const encryptedOrderString = await getGunUser()
        .get(Key.COORDINATES)
        .get(coordinateSHA256)
        .then()
      if (typeof encryptedOrderString !== 'string') {
        return
      }
      const mySecret = require('../gunDB/Mediator').getMySecret()
      const SEA = require('../gunDB/Mediator').mySEA
      const decryptedString = await SEA.decrypt(encryptedOrderString, mySecret)

      /**
       * @type {CoordinateOrder}
       */
      const orderJSON = JSON.parse(decryptedString)
      orders.push(orderJSON)
    })
    //@ts-expect-error
    const orderedOrders = orders.sort((a, b) => b.timestamp - a.timestamp)
    return orderedOrders
  }

  /**
   * @typedef {Common.Schema.InvoiceWhenListed & {r_hash:Buffer,payment_addr:string}} Invoice
   */
  /**
   * @type {Record<string,(invoice:Invoice) =>void>}
   */
  _listeningInvoices = {}

  /**
   * 
   * @param {Buffer} r_hash 
   * @param {(invoice:Invoice) =>void} done
   */
  addListenInvoice(r_hash, done) {
    const hashString = r_hash.toString("hex")
    this._listeningInvoices[hashString] = done
  }

  /**
   * 
   * @param {Common.Schema.InvoiceWhenListed & {r_hash:Buffer,payment_addr:string}} data 
   */
  invoiceStreamDataCb(data) {
    if (!data.settled) {
      //invoice not paid yet
      return
    }
    const hashString = data.r_hash.toString('hex')
    const amt = parseInt(data.amt_paid_sat, 10)
    if (this._listeningInvoices[hashString]) {
      const done = this._listeningInvoices[hashString]
      delete this._listeningInvoices[hashString]
      done(data)
    } else {
      this.AddOrder({
        type: 'invoice',
        coordinateHash: hashString,
        coordinateIndex: parseInt(data.add_index, 10),
        inbound: true,
        amount: amt,
        toLndPub: data.payment_addr,
        invoiceMemo: data.memo
      })
    }
  }







  /**
   * @type {Record<string,boolean>} 
   * lnd fires a confirmed transaction event TWICE, let's make sure it is only managed ONCE
   */
  _confirmedTransactions = {}

  /**
   * @param {Common.Schema.ChainTransaction} data 
   */
  async transactionStreamDataCb(data) {
    const { num_confirmations } = data
    const responses = await Promise.all(data.dest_addresses.map(isTmpChainOrder))
    const hasOrder = responses.find(res => res !== false)

    if (num_confirmations === 0) {
      handleUnconfirmedTx(data, hasOrder)
    } else {
      this.handleConfirmedTx(data, hasOrder)
    }
  }



  /**
   * 
   * @param {Common.Schema.ChainTransaction} tx 
   * @param {CoordinateOrder|false| undefined} order 
   */
  handleConfirmedTx(tx, order) {
    const { tx_hash } = tx
    if (this._confirmedTransactions[tx_hash]) {
      //this tx confirmation was already handled
      return
    }
    if (!order) {
      /*confirmed transaction MUST have a tmp order, 
      if not, means something gone wrong */
      logger.error('found a confirmed transaction that does not have a tmp order!!')
      return
    }
    if (!order.toBtcPub) {
      /*confirmed transaction tmp order MUST have a non null toBtcPub */
      logger.error('found a confirmed transaction that does not have toBtcPub in the order!!')
      return
    }
    const finalOrder = order
    finalOrder.coordinateIndex = tx.block_height
    this.AddOrder(finalOrder)
    if (order.toBtcPub === 'unknown') {
      clearTmpChainOrder(tx_hash)
    } else {
      clearTmpChainOrder(order.toBtcPub)
    }
    this._confirmedTransactions[tx_hash] = true
  }
}

const Manager = new SchemaManager()
/*invoice stream, 
this is the only place where it's needed, 
everything is a coordinate now*/
let InvoiceShouldRetry = true
setInterval(() => {
  if (!InvoiceShouldRetry) {
    return
  }
  if (!isAuthenticated()) {
    return
  }
  InvoiceShouldRetry = false

  lndV2.subscribeInvoices(
    invoice => {
      if (!isAuthenticated) {
        logger.error("got an invoice while not authenticated, will ignore it and cancel the stream")
        return true
      }
      Manager.invoiceStreamDataCb(invoice)
      return false
    },
    error => {
      logger.error(`Error in invoices sub, will retry in two second, reason: ${error.reason}`)
      InvoiceShouldRetry = true
    }
  )

}, 2000)

/*transactions stream, 
this is the only place where it's needed, 
everything is a coordinate now*/
let TransactionShouldRetry = true
setInterval(() => {
  if (!TransactionShouldRetry) {
    return
  }
  if (!isAuthenticated()) {
    return
  }
  TransactionShouldRetry = false

  lndV2.subscribeTransactions(
    transaction => {
      if (!isAuthenticated) {
        logger.error("got a transaction while not authenticated, will ignore it and cancel the stream")
        return true
      }
      Manager.transactionStreamDataCb(transaction)
      return false
    },
    error => {
      logger.error(`Error in transaction sub, will retry in two second, reason: ${error.reason}`)
      TransactionShouldRetry = true
    }
  )

}, 2000)

module.exports = Manager