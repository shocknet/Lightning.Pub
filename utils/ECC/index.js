/** @format */
const ECCrypto = require('eccrypto')
const Storage = require('node-persist')
const FieldError = require('../fieldError')
const {
  convertBufferToBase64,
  processKey,
  convertToEncryptedMessageResponse,
  convertUTF8ToBuffer,
  convertToEncryptedMessage,
  convertBase64ToBuffer
} = require('./crypto')

const nodeKeyPairs = new Map()
const devicePublicKeys = new Map()

const isEncryptedMessage = message =>
  message &&
  message.ciphertext &&
  message.iv &&
  message.mac &&
  message.ephemPublicKey

const generateKeyPair = deviceId => {
  const privateKey = ECCrypto.generatePrivate()
  const publicKey = ECCrypto.getPublic(privateKey)
  const privateKeyBase64 = convertBufferToBase64(privateKey)
  const publicKeyBase64 = convertBufferToBase64(publicKey)

  nodeKeyPairs.set(deviceId, {
    privateKey,
    publicKey
  })

  return {
    privateKey,
    publicKey,
    privateKeyBase64,
    publicKeyBase64
  }
}

const isAuthorizedDevice = ({ deviceId }) => devicePublicKeys.has(deviceId)

const authorizeDevice = async ({ deviceId, publicKey }) => {
  const hostId = await Storage.get('encryption/hostId')
  devicePublicKeys.set(deviceId, convertBase64ToBuffer(publicKey))
  const keyPair = generateKeyPair(deviceId)

  return {
    success: true,
    APIPublicKey: keyPair.publicKeyBase64,
    hostId
  }
}

const encryptMessage = async ({ message = '', deviceId }) => {
  const publicKey = devicePublicKeys.get(deviceId)

  if (!publicKey) {
    throw new FieldError({
      field: 'deviceId',
      message: 'Unauthorized Device ID detected'
    })
  }

  const processedPublicKey = processKey(publicKey)
  const messageBuffer = convertUTF8ToBuffer(message)
  const encryptedMessage = await ECCrypto.encrypt(
    processedPublicKey,
    messageBuffer
  )
  const encryptedMessageResponse = {
    ciphertext: encryptedMessage.ciphertext,
    iv: encryptedMessage.iv,
    mac: encryptedMessage.mac,
    ephemPublicKey: encryptedMessage.ephemPublicKey
  }

  return convertToEncryptedMessageResponse(encryptedMessageResponse)
}

const decryptMessage = async ({ encryptedMessage, deviceId }) => {
  try {
    const keyPair = nodeKeyPairs.get(deviceId)

    if (!keyPair) {
      throw new FieldError({
        field: 'deviceId',
        message: 'Unauthorized Device ID detected'
      })
    }

    const processedPrivateKey = processKey(keyPair.privateKey)
    const processedPublicKey = processKey(keyPair.publicKey)
    const decryptedMessage = await ECCrypto.decrypt(
      processedPrivateKey,
      convertToEncryptedMessage(encryptedMessage)
    )
    const parsedMessage = decryptedMessage.toString('utf8')
    return parsedMessage
  } catch (err) {
    console.error(err)
    throw err
  }
}

module.exports = {
  isAuthorizedDevice,
  isEncryptedMessage,
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  authorizeDevice
}
