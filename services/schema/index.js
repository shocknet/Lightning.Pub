const Crypto = require('crypto')
const { Utils: CommonUtils } = require('shock-common')
const getGunUser = () => require('../gunDB/Mediator').getUser()
const Key = require('../gunDB/contact-api/key')
/**
 * @typedef {import('../gunDB/contact-api/SimpleGUN').ISEA} ISEA
 * @typedef { 'spontaneousPayment' | 'tip' | 'service' | 'product' | 'other'|'invoice'|'payment'|'chainTx' } OrderType
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
    await CommonUtils.asyncForEach(coordinates, async coordinateSHA256 => {
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
   * 
   * @param {string} address 
   * @param {CoordinateOrder} orderInfo 
   */
  //eslint-disable-next-line class-methods-use-this
  async AddTmpChainOrder(address, orderInfo) {
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
   * @returns {Promise<boolean|CoordinateOrder>}
   */
  //eslint-disable-next-line class-methods-use-this
  async isTmpChainOrder(address) {
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
}

const Manager = new SchemaManager()

module.exports = Manager