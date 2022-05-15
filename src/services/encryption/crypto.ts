/**
 * @format
 */
import { Buffer } from 'buffer'
import { ChildProcess, fork } from 'child_process'
import { invoke } from './subprocess'
export type EncryptedMessage = {
  ciphertext: string
  iv: string
  mac: string
  ephemPublicKey: string
}

export type EncryptedMessageBuffer = {
  ciphertext: Buffer
  iv: Buffer
  mac: Buffer
  ephemPublicKey: Buffer
  metadata?: any
}
export type EncryptedMessageResponse = EncryptedMessage & { metadata?: any }


export const generateRandomString = async (childProcess: ChildProcess, length = 16): Promise<string> => {
  if (length % 2 !== 0 || length < 2) {
    throw new Error('Random string length must be an even number.')
  }

  const res = await invoke('generateRandomString', [length], childProcess)

  return res
}

export const convertUTF8ToBuffer = (value: string) => Buffer.from(value, 'utf-8')

export const convertBase64ToBuffer = (value: string) => Buffer.from(value, 'base64')

export const convertBufferToBase64 = (buffer: Buffer) => buffer.toString('base64')

export const processKey = (key: Buffer | string) => {
  if (Buffer.isBuffer(key)) {
    return key
  }
  const convertedKey = convertBase64ToBuffer(key)
  return convertedKey
}

export const convertToEncryptedMessageResponse = (encryptedMessage: EncryptedMessageBuffer | EncryptedMessageResponse): EncryptedMessageResponse => {
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
    return encryptedMessage
  }

  throw new Error('Unknown encrypted message format')
}

export const convertToEncryptedMessage = (encryptedMessage: EncryptedMessageBuffer | EncryptedMessageResponse): EncryptedMessageBuffer => {
  if (
    encryptedMessage.ciphertext instanceof Buffer &&
    encryptedMessage.iv instanceof Buffer &&
    encryptedMessage.mac instanceof Buffer &&
    encryptedMessage.ephemPublicKey instanceof Buffer
  ) {
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
  throw new Error('Unknown encrypted message format')
}
