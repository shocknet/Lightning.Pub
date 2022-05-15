import Crypto from 'crypto'
import ECCrypto from 'eccrypto'
import { v1 as uuid } from 'uuid'
import { Buffer } from 'buffer'
import mapValues from 'lodash/mapValues'
import type { ChildProcess } from 'child_process'

//import logger from '../../config/log'
/*
logger.info('crypto subprocess invoked')

process.on('uncaughtException', e => {
  logger.error('Uncaught exception inside crypto subprocess:')
  logger.error(e)
})

process.on('unhandledRejection', e => {
  logger.error('Unhandled rejection inside crypto subprocess:')
  logger.error(e)
})
*/

type Method = 'generateRandomString' | 'convertUTF8ToBuffer'
  | 'convertBase64ToBuffer' | 'convertBufferToBase64' | 'generatePrivate'
  | 'getPublic' | 'encrypt' | 'decrypt'
type Msg = {
  args: any[]
  id: string
  method: Method
}

const processBufferAfterSerialization = (obj: any): any => {
  if (typeof obj === 'object' && obj !== null) {
    if (obj.type === 'Buffer') {
      return Buffer.from(obj.data)
    }
    return mapValues(obj, processBufferAfterSerialization)
  }
  return obj
}


const handleMsg = async (msg: Msg) => {
  if (typeof msg !== 'object' || msg === null) {
    throw new Error('Msg in crypto subprocess not an object')
  }

  const { id, method } = msg
  const args = msg.args.map(processBufferAfterSerialization)
  if (!process.send) {
    throw new Error("sub process was not spawned as child")
  }
  try {
    if (method === 'generateRandomString') {
      const [length] = args

      Crypto.randomBytes(length / 2, (err, buffer) => {
        if (!process.send) {
          throw new Error("sub process was not spawned as child")
        }
        if (err) {
          process.send({
            id,
            err: err.message
          })
          return
        }

        const token = buffer.toString('hex')
        process.send({
          id,
          payload: token
        })
      })
    }
    if (method === 'convertUTF8ToBuffer') {
      const [value] = args

      process.send({
        id,
        payload: Buffer.from(value, 'utf8')
      })
    }
    if (method === 'convertBase64ToBuffer') {
      const [value] = args

      process.send({
        id,
        payload: Buffer.from(value, 'base64')
      })
    }
    if (method === 'convertBufferToBase64') {
      const [buffer] = args

      process.send({
        id,
        payload: buffer.toString('base64')
      })
    }
    if (method === 'generatePrivate') {
      process.send({
        id,
        payload: ECCrypto.generatePrivate()
      })
    }
    if (method === 'getPublic') {
      const [privateKey] = args
      process.send({
        id,
        payload: ECCrypto.getPublic(privateKey)
      })
    }
    if (method === 'encrypt') {
      const [processedPublicKey, messageBuffer] = args
      process.send({
        id,
        payload: await ECCrypto.encrypt(processedPublicKey, messageBuffer)
      })
    }
    if (method === 'decrypt') {
      const [processedPrivateKey, encryptedMessage] = args
      process.send({
        id,
        payload: await ECCrypto.decrypt(processedPrivateKey, encryptedMessage)
      })
    }
  } catch (e) {
    process.send({
      err: e.message
    })
  }
}

process.on('message', handleMsg)

export const invoke = (method: Method, args: any[], cryptoSubprocess: ChildProcess): Promise<any> =>
  new Promise((res, rej) => {
    const id = uuid()
    const listener = (msg: any) => {
      if (msg.id === id) {
        cryptoSubprocess.off('message', listener)
        if (msg.err) {
          rej(new Error(msg.err))
        } else {
          res(processBufferAfterSerialization(msg.payload))
        }
      }
    }
    cryptoSubprocess.on('message', listener)
    cryptoSubprocess.send({
      args,
      id,
      method
    })
  })
