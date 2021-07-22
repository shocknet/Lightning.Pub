/**
 * @prettier
 */
const Crypto = require('crypto')
const { Buffer } = require('buffer')
const logger = require('../config/log')

const APIKeyPair = new Map()
const authorizedDevices = new Map()

const nonEncryptedEvents = [
  'ping',
  'disconnect',
  'IS_GUN_AUTH',
  'SET_LAST_SEEN_APP'
]

const Encryption = {
  /**
   * @param {string} event
   * @returns {boolean}
   */
  isNonEncrypted: event => nonEncryptedEvents.includes(event),
  /**
   * @param {{ deviceId: string , message: string }} arg0
   */
  encryptKey: ({ deviceId, message }) => {
    if (!authorizedDevices.has(deviceId)) {
      throw { field: 'deviceId', message: 'Unknown Device ID' }
    }

    const devicePublicKey = authorizedDevices.get(deviceId)
    const data = Buffer.from(message)
    const encryptedData = Crypto.publicEncrypt(
      {
        key: devicePublicKey,
        padding: Crypto.constants.RSA_PKCS1_PADDING
      },
      data
    )

    return encryptedData.toString('base64')
  },
  /**
   * @param {{ deviceId: string , message: string }} arg0
   */
  decryptKey: ({ deviceId, message }) => {
    if (!authorizedDevices.has(deviceId)) {
      throw { field: 'deviceId', message: 'Unknown Device ID' }
    }

    const data = Buffer.from(message, 'base64')
    const encryptedData = Crypto.privateDecrypt(
      {
        key: APIKeyPair.get(deviceId).privateKey,
        padding: Crypto.constants.RSA_PKCS1_PADDING
      },
      data
    )

    return encryptedData.toString()
  },
  /**
   * @param {{ deviceId: string , message: any , metadata?: any}} arg0
   */
  encryptMessage: ({ deviceId, message, metadata = {} }) => {
    const parsedMessage =
      typeof message === 'object' ? JSON.stringify(message) : message
    const data = Buffer.from(parsedMessage)
    const key = Crypto.randomBytes(32)
    const iv = Crypto.randomBytes(16)
    const encryptedKey = Encryption.encryptKey({
      deviceId,
      message: key.toString('hex')
    })
    const cipher = Crypto.createCipheriv('aes-256-cbc', key, iv)
    const encryptedCipher = cipher.update(data)
    const encryptedBuffer = Buffer.concat([
      Buffer.from(encryptedCipher),
      Buffer.from(cipher.final())
    ])
    const encryptedData = encryptedBuffer.toString('base64')
    const encryptedMessage = {
      encryptedData,
      encryptedKey,
      iv: iv.toString('hex'),
      metadata
    }

    return encryptedMessage
  },
  /**
   * @param {{ message: string , key: string , iv: string }} arg0
   */
  decryptMessage: ({ message, key, iv }) => {
    const data = Buffer.from(message, 'base64')
    const cipher = Crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    )
    const decryptedCipher = cipher.update(data)
    const decryptedBuffer = Buffer.concat([
      Buffer.from(decryptedCipher),
      Buffer.from(cipher.final())
    ])
    const decryptedData = decryptedBuffer.toString()

    return decryptedData.toString()
  },
  /**
   * @param {{ deviceId: string }} arg0
   */
  isAuthorizedDevice: ({ deviceId }) => {
    if (authorizedDevices.has(deviceId)) {
      return true
    }

    return false
  },
  /**
   * @param {{ deviceId: string , publicKey: string }} arg0
   */
  authorizeDevice: ({ deviceId, publicKey }) =>
    new Promise((resolve, reject) => {
      authorizedDevices.set(deviceId, publicKey)
      Crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 2048,
          privateKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
          },
          publicKeyEncoding: {
            type: 'pkcs1',
            format: 'pem'
          }
        },
        (err, publicKey, privateKey) => {
          if (err) {
            // @ts-ignore
            logger.error(err)
            reject(err)
            return
          }

          const exportedKey = {
            publicKey,
            privateKey
          }

          APIKeyPair.set(deviceId, exportedKey)
          resolve({
            success: true,
            APIPublicKey: exportedKey.publicKey
          })
        }
      )
    }),
  /**
   * @param {{ deviceId: string }} arg0
   */
  unAuthorizeDevice: ({ deviceId }) => {
    authorizedDevices.delete(deviceId)
  },
  generateRandomString: (length = 16) =>
    new Promise((resolve, reject) => {
      Crypto.randomBytes(length, (err, buffer) => {
        if (err) {
          reject(err)
          return
        }

        const token = buffer.toString('hex')
        resolve(token)
      })
    })
}

module.exports = Encryption
