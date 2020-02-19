/**
 * @prettier
 */
const Crypto = require('crypto')
const { Buffer } = require('buffer')
const APIKeyPair = new Map()
const authorizedDevices = new Map()

const nonEncryptedEvents = [
  'ping',
  'disconnect',
  'IS_GUN_AUTH',
  'SET_LAST_SEEN_APP'
]

const Encryption = {
  isNonEncrypted: event => nonEncryptedEvents.includes(event),
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
  encryptMessage: ({ deviceId, message }) => {
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
    return { encryptedData, encryptedKey, iv: iv.toString('hex') }
  },
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
  isAuthorizedDevice: ({ deviceId }) => {
    if (authorizedDevices.has(deviceId)) {
      return true
    }

    return false
  },
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
            console.error(err)
            reject(err)
            return err
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
  unAuthorizeDevice: ({ deviceId }) => {
    authorizedDevices.delete(deviceId)
  }
}

module.exports = Encryption
