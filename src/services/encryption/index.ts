import { fork } from 'child_process'
import storage from '../storage'
import type { EncryptedMessageResponse, EncryptedMessage } from './crypto'
//const logger = require('../../config/log')
import {
  generateRandomString as genString,
  convertBufferToBase64,
  processKey,
  convertToEncryptedMessageResponse,
  convertUTF8ToBuffer,
  convertToEncryptedMessage,
  convertBase64ToBuffer
} from './crypto'
import { invoke } from './subprocess'

const cryptoSubprocess = fork('src/services/encryption/subprocess')
export const generateRandomString = (length?: number) => genString(cryptoSubprocess, length)
//const nodeKeyPairs = new Map()
//const devicePublicKeys = new Map()


export type Pair = {
  privateKey: Buffer
  publicKey: Buffer
  privateKeyBase64: string
  publicKeyBase64: string
}

export const isEncryptedMessage = (message: EncryptedMessage) =>
  message &&
  message.ciphertext &&
  message.iv &&
  message.mac &&
  message.ephemPublicKey

export const generateKeyPair = async (deviceId: string): Promise<Pair> => {
  try {
    const existingKey = await storage.getDeviceKeyPair(deviceId)

    if (existingKey) {
      //logger.info('Device ID is already trusted')
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

    storage.setDeviceKeyPair(deviceId, {
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
    //logger.error(
    //  '[ENCRYPTION] An error has occurred while generating a new KeyPair',
    //  err
    //)
    //logger.error('Device ID:', deviceId)

    throw err
  }
}

export const isAuthorizedDevice = ({ deviceId }: { deviceId: string }) => devicePublicKeys.has(deviceId)

export const authorizeDevice = async ({ deviceId, publicKey }: { deviceId: string, publicKey: string }) => {
  const hostId = await Storage.get('encryption/hostId')
  devicePublicKeys.set(deviceId, convertBase64ToBuffer(publicKey))
  const keyPair = await generateKeyPair(deviceId)

  return {
    success: true,
    APIPublicKey: keyPair.publicKeyBase64,
    hostId
  }
}

export const encryptMessage = async ({ message = '', deviceId }: { deviceId: string, message: string | number | boolean }): Promise<EncryptedMessageResponse> => {
  const parsedMessage = message.toString()
  // decryptMessage checks for known devices while this one checks for
  // authorized ones instead, why?
  const publicKey = devicePublicKeys.get(deviceId)

  if (!publicKey) {
    throw new Error('encryptMessage() -> Unauthorized Device ID detected')
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

export const decryptMessage = async ({ encryptedMessage, deviceId }: { encryptedMessage: EncryptedMessageResponse, deviceId: string }) => {
  // encryptMessages checks for authorized devices while this one checks for
  // known ones, why?
  const keyPair = nodeKeyPairs.get(deviceId)
  try {
    if (!keyPair) {
      throw new Error('decryptMessage() -> Unknown Device ID detected')
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
    //logger.error(err)
    //if (err.message?.toLowerCase() === 'bad mac') {
    //  logger.error(
    //    'Bad Mac!',
    //    err,
    //    convertToEncryptedMessage(encryptedMessage),
    //    !!keyPair
    //  )
    //}
    throw err
  }
}

export const generatePrivate = (): Promise<Buffer> => invoke('generatePrivate', [], cryptoSubprocess)

export const getPublic = (priv: Buffer): Promise<Buffer> => invoke('getPublic', [priv], cryptoSubprocess)

module.exports = {

  killECCCryptoSubprocess() {
    cryptoSubprocess.kill()
  }
}
