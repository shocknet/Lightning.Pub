/** @format */
const Storage = require('node-persist')
const { fork } = require('child_process')

const FieldError = require('../fieldError')
const logger = require('../../config/log')
const {
  generateRandomString,
  convertBufferToBase64,
  processKey,
  convertToEncryptedMessageResponse,
  convertUTF8ToBuffer,
  convertToEncryptedMessage,
  convertBase64ToBuffer
} = require('./crypto')
const { invoke } = require('./subprocess')

const cryptoSubprocess = fork('utils/ECC/subprocess')

const nodeKeyPairs = new Map()
const devicePublicKeys = new Map()

/**
 * @typedef {object} EncryptedMessage
 * @prop {string} ciphertext
 * @prop {string} iv
 * @prop {string} mac
 * @prop {string} ephemPublicKey
 */

/**
 * Checks if the message supplied is encrypted or not
 * @param {EncryptedMessage} message
 */
const isEncryptedMessage = message =>
  message &&
  message.ciphertext &&
  message.iv &&
  message.mac &&
  message.ephemPublicKey

/**
 * @typedef {object} Pair
 * @prop {Buffer} privateKey
 * @prop {Buffer} publicKey
 * @prop {string} privateKeyBase64
 * @prop {string} publicKeyBase64
 */

/**
 * Generates a new encryption key pair that will be used
 * when communicating with the deviceId specified
 * @param {string} deviceId
 * @returns {Promise<Pair>}
 */
const generateKeyPair = async deviceId => {
  try {
    const existingKey = nodeKeyPairs.get(deviceId)

    if (existingKey) {
      logger.info('Device ID is already trusted')
      return {
        ...existingKey,
        publicKeyBase64: convertBufferToBase64(existingKey.publicKey),
        privateKeyBase64: convertBufferToBase64(existingKey.privateKey)
      }
    }

    const privateKey = await invoke('generatePrivate', [], cryptoSubprocess)
    const publicKey = await invoke('getPublic', [privateKey], cryptoSubprocess)
    const privateKeyBase64 = convertBufferToBase64(privateKey)
    const publicKeyBase64 = convertBufferToBase64(publicKey)

    if (!Buffer.isBuffer(privateKey) || !Buffer.isBuffer(publicKey)) {
      throw new Error('Invalid KeyPair Generated')
    }

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
  } catch (err) {
    logger.error(
      '[ENCRYPTION] An error has occurred while generating a new KeyPair',
      err
    )
    logger.error('Device ID:', deviceId)

    throw err
  }
}

/**
 * Checks if the specified device has a keypair generated
 * @param {{ deviceId: string }} arg0
 */
const isAuthorizedDevice = ({ deviceId }) => devicePublicKeys.has(deviceId)

/**
 * Generates a new keypair for the deviceId specified and
 * saves its publicKey locally
 * @param {{ deviceId: string, publicKey: string }} arg0
 */
const authorizeDevice = async ({ deviceId, publicKey }) => {
  const hostId = await Storage.get('encryption/hostId')
  devicePublicKeys.set(deviceId, convertBase64ToBuffer(publicKey))
  const keyPair = await generateKeyPair(deviceId)

  return {
    success: true,
    APIPublicKey: keyPair.publicKeyBase64,
    hostId
  }
}

/**
 * Encrypts the specified message using the specified deviceId's
 * public key
 * @param {{ deviceId: string, message: string | number | boolean }} arg0
 * @returns {Promise<import('./crypto').EncryptedMessageResponse>}
 */
const encryptMessage = async ({ message = '', deviceId }) => {
  const parsedMessage = message.toString()
  // decryptMessage checks for known devices while this one checks for
  // authorized ones instead, why?
  const publicKey = devicePublicKeys.get(deviceId)

  if (!publicKey) {
    throw new FieldError({
      field: 'deviceId',
      message: 'encryptMessage() -> Unauthorized Device ID detected'
    })
  }

  const processedPublicKey = processKey(publicKey)
  const messageBuffer = convertUTF8ToBuffer(parsedMessage)
  const encryptedMessage = await invoke(
    'encrypt',
    [processedPublicKey, messageBuffer],
    cryptoSubprocess
  )

  const encryptedMessageResponse = {
    ciphertext: encryptedMessage.ciphertext,
    iv: encryptedMessage.iv,
    mac: encryptedMessage.mac,
    ephemPublicKey: encryptedMessage.ephemPublicKey,
    metadata: {
      _deviceId: deviceId,
      _publicKey: publicKey
    }
  }

  return convertToEncryptedMessageResponse(encryptedMessageResponse)
}

/**
 * Decrypts the specified message using the API keypair
 * associated with the specified deviceId
 * @param {{ encryptedMessage: import('./crypto').EncryptedMessageResponse, deviceId: string }} arg0
 */
const decryptMessage = async ({ encryptedMessage, deviceId }) => {
  // encryptMessages checks for authorized devices while this one checks for
  // known ones, why?
  const keyPair = nodeKeyPairs.get(deviceId)
  try {
    if (!keyPair) {
      throw new FieldError({
        field: 'deviceId',
        message: 'decryptMessage() -> Unknown Device ID detected'
      })
    }

    const processedPrivateKey = processKey(keyPair.privateKey)
    const decryptedMessage = await invoke(
      'decrypt',
      [processedPrivateKey, convertToEncryptedMessage(encryptedMessage)],
      cryptoSubprocess
    )
    const parsedMessage = decryptedMessage.toString('utf8')

    return parsedMessage
  } catch (err) {
    logger.error(err)
    if (err.message?.toLowerCase() === 'bad mac') {
      logger.error(
        'Bad Mac!',
        err,
        convertToEncryptedMessage(encryptedMessage),
        !!keyPair
      )
    }
    throw err
  }
}

/**
 * @returns {Promise<Buffer>}
 */
const generatePrivate = () => invoke('generatePrivate', [], cryptoSubprocess)

/**
 * @param {Buffer} priv
 * @returns {Promise<Buffer>}
 */
const getPublic = priv => invoke('getPublic', [priv], cryptoSubprocess)

module.exports = {
  isAuthorizedDevice,
  isEncryptedMessage,
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  authorizeDevice,
  generateRandomString,
  nodeKeyPairs,
  devicePublicKeys,
  generatePrivate,
  getPublic,
  /**
   * Used for tests.
   */
  killECCCryptoSubprocess() {
    cryptoSubprocess.kill()
  }
}
