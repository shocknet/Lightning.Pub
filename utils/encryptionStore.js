/**
 * @prettier
 */
const Crypto = require('crypto')
const { Buffer } = require('buffer')
const APIKeyPair = new Map()
const authorizedDevices = new Map()

module.exports = {
  encrypt: ({ deviceId, message }) => {
    if (!authorizedDevices.has(deviceId)) {
      throw { field: 'deviceId', message: 'Unknown Device ID' }
    }

    const devicePublicKey = authorizedDevices.get(deviceId)
    const data = Buffer.from(message)
    const encryptedData = Crypto.publicEncrypt(devicePublicKey, data)
    return encryptedData.toString('base64')
  },
  decrypt: ({ deviceId, message }) => {
    if (!authorizedDevices.has(deviceId)) {
      throw { field: 'deviceId', message: 'Unknown Device ID' }
    }

    const data = Buffer.from(message, 'base64')
    const encryptedData = Crypto.privateDecrypt(APIKeyPair.private, data)
    return encryptedData.toString('base64')
  },
  authorizeDevice: ({ deviceId, publicKey }) =>
    new Promise((resolve, reject) => {
      if (authorizedDevices.has(deviceId)) {
        const error = { success: false, message: 'Device already exists' }
        reject(error)
        return error
      }

      authorizedDevices.set(deviceId, publicKey)

      Crypto.generateKeyPair(
        'rsa',
        {
          modulusLength: 4096
        },
        (err, publicKey, privateKey) => {
          if (err) {
            reject({ field: 'APIKeyPair', errorMessage: err })
            return err
          }

          APIKeyPair.set(deviceId, {
            publicKey,
            privateKey
          })
          resolve({ success: true })
        }
      )
    }),
  unAuthorizeDevice: ({ deviceId }) => {
    authorizedDevices.delete(deviceId)
  }
}
