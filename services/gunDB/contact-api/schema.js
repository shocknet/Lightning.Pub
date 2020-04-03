/**
 * @format
 */
const logger = require('winston')
const isFinite = require('lodash/isFinite')
const isNumber = require('lodash/isNumber')
const isNaN = require('lodash/isNaN')

/**
 * @typedef {object} HandshakeRequest
 * @prop {string} from Public key of the requestor.
 * @prop {string} response Encrypted string where, if the recipient accepts the
 * request, his outgoing feed id will be put. Before that the sender's outgoing
 * feed ID will be placed here, encrypted so only the recipient can access it.
 * @prop {number} timestamp Unix time.
 */

/**
 * @typedef {object} Message
 * @prop {string} body
 * @prop {number} timestamp
 */

/**
 * @typedef {object} ChatMessage
 * @prop {string} body
 * @prop {string} id
 * @prop {boolean} outgoing True if the message is an outgoing message,
 * otherwise it is an incoming message.
 * @prop {number} timestamp
 */

/**
 *
 * @param {any} item
 * @returns {item is ChatMessage}
 */
exports.isChatMessage = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {ChatMessage} */ (item)

  if (typeof obj.body !== 'string') {
    return false
  }

  if (typeof obj.id !== 'string') {
    return false
  }

  if (typeof obj.outgoing !== 'boolean') {
    return false
  }

  if (typeof obj.timestamp !== 'number') {
    return false
  }

  return true
}

/**
 * A simpler representation of a conversation between two users than the
 * outgoing/incoming feed paradigm. It combines both the outgoing and incoming
 * messages into one data structure plus metada about the chat.
 * @typedef {object} Chat
 * @prop {string} id Chats now have IDs because of disconnect.
 * RecipientPublicKey will no longer be unique.
 * @prop {string|null} recipientAvatar Base64 encoded image.
 * @prop {string} recipientPublicKey A way to uniquely identify each chat.
 * @prop {ChatMessage[]} messages Sorted from most recent to least recent.
 * @prop {string|null} recipientDisplayName
 * @prop {boolean} didDisconnect True if the recipient performed a disconnect.
 */

/**
 * @param {any} item
 * @returns {item is Chat}
 */
exports.isChat = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {Chat} */ (item)

  if (typeof obj.recipientAvatar !== 'string' && obj.recipientAvatar !== null) {
    return false
  }

  if (!Array.isArray(obj.messages)) {
    return false
  }

  if (typeof obj.recipientPublicKey !== 'string') {
    return false
  }

  if (obj.recipientPublicKey.length === 0) {
    return false
  }

  if (typeof obj.didDisconnect !== 'boolean') {
    return false
  }

  if (typeof obj.id !== 'string') {
    return false
  }

  return obj.messages.every(msg => exports.isChatMessage(msg))
}

/**
 * @typedef {object} Outgoing
 * @prop {Record<string, Message>} messages
 * @prop {string} with Public key for whom the outgoing messages are intended.
 */

/**
 * @typedef {object} PartialOutgoing
 * @prop {string} with (Encrypted) Public key for whom the outgoing messages are
 * intended.
 */

/**
 * @typedef {object} StoredRequest
 * @prop {string} sentReqID
 * @prop {string} recipientPub
 * @prop {string} handshakeAddress
 * @prop {number} timestamp
 */

/**
 * @param {any} item
 * @returns {item is StoredRequest}
 */
exports.isStoredRequest = item => {
  if (typeof item !== 'object') return false
  if (item === null) return false
  const obj = /** @type {StoredRequest} */ (item)
  if (typeof obj.recipientPub !== 'string') return false
  if (typeof obj.handshakeAddress !== 'string') return false
  if (typeof obj.handshakeAddress !== 'string') return false
  if (typeof obj.timestamp !== 'number') return false
  return true
}

/**
 * @typedef {object} SimpleSentRequest
 * @prop {string} id
 * @prop {string|null} recipientAvatar
 * @prop {boolean} recipientChangedRequestAddress True if the recipient changed
 * the request node address and therefore can't no longer accept the request.
 * @prop {string|null} recipientDisplayName
 * @prop {string} recipientPublicKey Fallback for when user has no display name.
 * @prop {number} timestamp
 */

/**
 * @param {any} item
 * @returns {item is SimpleSentRequest}
 */
exports.isSimpleSentRequest = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {SimpleSentRequest} */ (item)

  if (typeof obj.id !== 'string') {
    return false
  }

  if (typeof obj.recipientAvatar !== 'string' && obj.recipientAvatar !== null) {
    return false
  }

  if (typeof obj.recipientChangedRequestAddress !== 'boolean') {
    return false
  }

  if (
    typeof obj.recipientDisplayName !== 'string' &&
    obj.recipientDisplayName !== null
  ) {
    return false
  }

  if (typeof obj.recipientPublicKey !== 'string') {
    return false
  }

  if (typeof obj.timestamp !== 'number') {
    return false
  }

  return true
}

/**
 * @typedef {object} SimpleReceivedRequest
 * @prop {string} id
 * @prop {string|null} requestorAvatar
 * @prop {string|null} requestorDisplayName
 * @prop {string} requestorPK
 * @prop {number} timestamp
 */

/**
 * @param {any} item
 * @returns {item is SimpleReceivedRequest}
 */
exports.isSimpleReceivedRequest = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {SimpleReceivedRequest} */ (item)

  if (typeof obj.id !== 'string') {
    return false
  }

  if (typeof obj.requestorAvatar !== 'string' && obj.requestorAvatar !== null) {
    return false
  }

  if (
    typeof obj.requestorDisplayName !== 'string' &&
    obj.requestorDisplayName !== null
  ) {
    return false
  }

  if (typeof obj.requestorPK !== 'string') {
    return false
  }

  if (typeof obj.timestamp !== 'number') {
    return false
  }

  return true
}

/**
 * @param {any} item
 * @returns {item is HandshakeRequest}
 */
exports.isHandshakeRequest = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {HandshakeRequest} */ (item)

  if (typeof obj.from !== 'string') {
    return false
  }

  if (typeof obj.response !== 'string') {
    return false
  }

  if (typeof obj.timestamp !== 'number') {
    return false
  }

  return true
}

/**
 * @param {any} item
 * @returns {item is Message}
 */
exports.isMessage = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {Message} */ (item)

  return typeof obj.body === 'string' && typeof obj.timestamp === 'number'
}

/**
 * @param {any} item
 * @returns {item is PartialOutgoing}
 */
exports.isPartialOutgoing = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {PartialOutgoing} */ (item)

  return typeof obj.with === 'string'
}

/**
 * @param {any} item
 * @returns {item is Outgoing}
 */
exports.isOutgoing = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {Outgoing} */ (item)

  const messagesAreMessages = Object.values(obj.messages).every(msg =>
    exports.isMessage(msg)
  )

  return typeof obj.with === 'string' && messagesAreMessages
}

/**
 * @typedef {object} Order
 * @prop {string} from Public key of sender.
 * @prop {string} amount Encrypted
 * @prop {string} memo Encrypted
 * @prop {number} timestamp
 */

/**
 * @param {any} item
 * @returns {item is Order}
 */
exports.isOrder = item => {
  if (typeof item !== 'object') {
    return false
  }

  if (item === null) {
    return false
  }

  const obj = /** @type {Order} */ (item)

  if (typeof obj.amount !== 'string') {
    return false
  }

  if (typeof obj.from !== 'string') {
    return false
  }

  if (typeof obj.memo !== 'string') {
    return false
  }

  return typeof obj.timestamp === 'number'
}

/**
 * @typedef {object} OrderResponse
 * @prop {'err'|'invoice'} type
 * @prop {string} response
 */

/**
 * @param {*} o
 * @returns {o is OrderResponse}
 */
exports.isOrderResponse = o => {
  if (typeof o !== 'object') {
    return false
  }

  if (o === null) {
    return false
  }

  const obj = /** @type {OrderResponse} */ (o)

  if (typeof obj.response !== 'string') {
    return false
  }

  return obj.type === 'err' || obj.type === 'invoice'
}

/**
 * @typedef {import('./schema-types').EncSpontPayment} EncSpontPayment
 */

const ENC_SPONT_PAYMENT_PREFIX = '$$__SHOCKWALLET__SPONT__PAYMENT__'

/**
 * @param {string} s
 * @returns {s is EncSpontPayment}
 */
const isEncodedSpontPayment = s => s.indexOf(ENC_SPONT_PAYMENT_PREFIX) === 0

exports.isEncodedSpontPayment = isEncodedSpontPayment

/**
 * @typedef {object} SpontaneousPayment
 * @prop {number} amt
 * @prop {string} memo
 * @prop {string} preimage
 */

/**
 *
 * @param {EncSpontPayment} sp
 * @throws {Error} If decoding fails.
 * @returns {SpontaneousPayment}
 */
exports.decodeSpontPayment = sp => {
  try {
    const [preimage, amtStr, memo] = sp
      .slice(ENC_SPONT_PAYMENT_PREFIX.length)
      .split('__')

    if (typeof preimage !== 'string') {
      throw new TypeError('Could not parse preimage')
    }

    if (typeof amtStr !== 'string') {
      throw new TypeError('Could not parse amt')
    }

    if (typeof memo !== 'string') {
      throw new TypeError('Could not parse memo')
    }

    const amt = Number(amtStr)

    if (!isNumber(amt)) {
      throw new TypeError(`Could parse amount as a number, not a number?`)
    }

    if (isNaN(amt)) {
      throw new TypeError(`Could not amount as a number, got NaN.`)
    }

    if (!isFinite(amt)) {
      throw new TypeError(
        `Amount was correctly parsed, but got a non finite number.`
      )
    }

    return {
      amt,
      memo,
      preimage
    }
  } catch (err) {
    logger.debug(`Encoded spontaneous payment: ${sp}`)
    logger.error(err)
    throw err
  }
}

/**
 *
 * @param {number} amt
 * @param {string} memo
 * @param {string} preimage
 * @returns {EncSpontPayment}
 */
exports.encodeSpontaneousPayment = (amt, memo, preimage) => {
  if (amt <= 0) {
    throw new RangeError('Amt must be greater than zero')
  }

  if (memo.length < 1) {
    throw new TypeError('Memo must be populated')
  }

  if (preimage.length < 1) {
    throw new TypeError('preimage must be populated')
  }

  const enc = `${ENC_SPONT_PAYMENT_PREFIX}__${amt}__${memo}__${preimage}`

  if (isEncodedSpontPayment(enc)) {
    return enc
  }

  throw new Error('isEncodedSpontPayment(enc) false')
}
