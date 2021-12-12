/**
 * @format
 */
const { Buffer } = require('buffer')
const Crypto = require('crypto')
const FieldError = require('../fieldError')

/**
 * @typedef {object} EncryptedMessageBuffer
 * @prop {Buffer} ciphertext
 * @prop {Buffer} iv
 * @prop {Buffer} mac
 * @prop {Buffer} ephemPublicKey
 * @prop {any?} metadata
 */

/**
 * @typedef {object} EncryptedMessageResponse
 * @prop {string} ciphertext
 * @prop {string} iv
 * @prop {string} mac
 * @prop {string} ephemPublicKey
 * @prop {any?} metadata
 */

const generateRandomString = (length = 16) =>
  new Promise((resolve, reject) => {
    // Gotta halve because randomBytes returns a sequence twice the size
    Crypto.randomBytes(length / 2, (err, buffer) => {
      if (err) {
        reject(err)
        return
      }

      const token = buffer.toString('hex')
      resolve(token)
    })
  })

/**
 * @param {string} value
 */
const convertUTF8ToBuffer = value => Buffer.from(value, 'utf-8')

/**
 * @param {string} value
 */
const convertBase64ToBuffer = value => Buffer.from(value, 'base64')

/**
 * @param {Buffer} buffer
 */
const convertBufferToBase64 = buffer => buffer.toString('base64')

/**
 * @param {Buffer | string} key
 */
const processKey = key => {
  if (Buffer.isBuffer(key)) {
    return key
  }
  const convertedKey = convertBase64ToBuffer(key)
  return convertedKey
}

/**
 * @param {EncryptedMessageBuffer | EncryptedMessageResponse} encryptedMessage
 * @returns {EncryptedMessageResponse}
 */
const convertToEncryptedMessageResponse = encryptedMessage => {
  if (
    Buffer.isBuffer(encryptedMessage.ciphertext) &&
    Buffer.isBuffer(encryptedMessage.iv) &&
    Buffer.isBuffer(encryptedMessage.mac) &&
    Buffer.isBuffer(encryptedMessage.ephemPublicKey)
  ) {
    return {
      ciphertext: convertBufferToBase64(encryptedMessage.ciphertext),
      iv: convertBufferToBase64(encryptedMessage.iv),
      mac: convertBufferToBase64(encryptedMessage.mac),
      ephemPublicKey: convertBufferToBase64(encryptedMessage.ephemPublicKey),
      metadata: encryptedMessage.metadata
    }
  }

  if (typeof encryptedMessage.ciphertext === 'string') {
    // @ts-ignore
    return encryptedMessage
  }

  throw new FieldError({
    field: 'encryptedMessage',
    message: 'Unknown encrypted message format'
  })
}

/**
 * @param {EncryptedMessageBuffer | EncryptedMessageResponse} encryptedMessage
 * @returns {EncryptedMessageBuffer}
 */
const convertToEncryptedMessage = encryptedMessage => {
  if (
    encryptedMessage.ciphertext instanceof Buffer &&
    encryptedMessage.iv instanceof Buffer &&
    encryptedMessage.mac instanceof Buffer &&
    encryptedMessage.ephemPublicKey instanceof Buffer
  ) {
    // @ts-ignore
    return encryptedMessage
  }
  if (
    typeof encryptedMessage.ciphertext === 'string' &&
    typeof encryptedMessage.iv === 'string' &&
    typeof encryptedMessage.mac === 'string' &&
    typeof encryptedMessage.ephemPublicKey === 'string'
  ) {
    return {
      ciphertext: convertBase64ToBuffer(encryptedMessage.ciphertext),
      iv: convertBase64ToBuffer(encryptedMessage.iv),
      mac: convertBase64ToBuffer(encryptedMessage.mac),
      ephemPublicKey: convertBase64ToBuffer(encryptedMessage.ephemPublicKey),
      metadata: encryptedMessage.metadata
    }
  }
  throw new FieldError({
    field: 'encryptedMessage',
    message: 'Unknown encrypted message format'
  })
}

module.exports = {
  generateRandomString,
  convertUTF8ToBuffer,
  convertBase64ToBuffer,
  convertBufferToBase64,
  convertToEncryptedMessage,
  convertToEncryptedMessageResponse,
  processKey
}
