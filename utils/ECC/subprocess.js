/**
 * @format
 */
const Crypto = require('crypto')
const ECCrypto = require('eccrypto')
const uuid = require('uuid/v1')
const { Buffer } = require('buffer')

const logger = require('../../config/log')

logger.info('crypto subprocess invoked')

process.on('uncaughtException', e => {
  logger.error('Uncaught exception inside crypto subprocess:')
  logger.error(e)
})

process.on('unhandledRejection', e => {
  logger.error('Unhandled rejection inside crypto subprocess:')
  logger.error(e)
})

/**
 * @typedef {'generateRandomString' | 'convertUTF8ToBuffer'
 * | 'convertBase64ToBuffer' | 'convertBufferToBase64' | 'generatePrivate'
 * | 'getPublic' | 'encrypt' | 'decrypt'
 * } Method
 */

/**
 * @typedef {object} Msg
 * @prop {any[]} args
 * @prop {string} id
 * @prop {Method} method
 */

/**
 * @param {Msg} msg
 */
const handleMsg = async msg => {
  if (typeof msg !== 'object' || msg === null) {
    logger.error('Msg in crypto subprocess not an object')
  }

  const { args, id, method } = msg

  try {
    if (method === 'generateRandomString') {
      const [length] = args

      Crypto.randomBytes(length / 2, (err, buffer) => {
        if (err) {
          // @ts-expect-error
          process.send({
            id,
            err: err.message
          })
          return
        }

        const token = buffer.toString('hex')
        // @ts-expect-error
        process.send({
          id,
          payload: token
        })
      })
    }
    if (method === 'convertUTF8ToBuffer') {
      const [value] = args

      // @ts-expect-error
      process.send({
        id,
        payload: Buffer.from(value, 'utf8')
      })
    }
    if (method === 'convertBase64ToBuffer') {
      const [value] = args

      // @ts-expect-error
      process.send({
        id,
        payload: Buffer.from(value, 'base64')
      })
    }
    if (method === 'convertBufferToBase64') {
      const [buffer] = args

      // @ts-expect-error
      process.send({
        id,
        payload: buffer.toString('base64')
      })
    }
    if (method === 'generatePrivate') {
      // @ts-expect-error
      process.send({
        id,
        payload: ECCrypto.generatePrivate()
      })
    }
    if (method === 'getPublic') {
      const [privateKey] = args
      // @ts-expect-error
      process.send({
        id,
        payload: ECCrypto.getPublic(privateKey)
      })
    }
    if (method === 'encrypt') {
      const [processedPublicKey, messageBuffer] = args
      // @ts-expect-error
      process.send({
        id,
        payload: ECCrypto.encrypt(processedPublicKey, messageBuffer)
      })
    }
    if (method === 'decrypt') {
      const [processedPrivateKey, encryptedMessage] = args
      // @ts-expect-error
      process.send({
        id,
        payload: await ECCrypto.decrypt(processedPrivateKey, encryptedMessage)
      })
    }
  } catch (e) {
    // @ts-expect-error
    process.send({
      err: e.message
    })
  }
}

process.on('message', handleMsg)

/**
 * @param {Method} method
 * @param {any[]} args
 * @param {import('child_process').ChildProcess} cryptoSubprocess
 * @returns {Promise<any>}
 */
const invoke = (method, args, cryptoSubprocess) =>
  new Promise((res, rej) => {
    const id = uuid()
    /** @param {any} msg */
    const listener = msg => {
      if (msg.id === id) {
        cryptoSubprocess.off('message', listener)
        if (msg.err) {
          rej(new Error(msg.err))
        } else {
          res(msg.payload)
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

module.exports = {
  invoke
}
