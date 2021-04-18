/**
 * @format
 */
const Common = require('shock-common')
const logger = require('winston')
const { safeParseJSON } = require('../JSON')
const ECC = require('./index')

const nonEncryptedEvents = [
  'ping',
  'disconnect',
  'IS_GUN_AUTH',
  'SET_LAST_SEEN_APP',
  Common.Constants.ErrorCode.NOT_AUTH
]

/**
 * @typedef {import('../../services/gunDB/Mediator').SimpleSocket} SimpleSocket
 * @typedef {import('../../services/gunDB/Mediator').Emission} Emission
 * @typedef {import('../../services/gunDB/Mediator').EncryptedEmission} EncryptedEmission
 * @typedef {import('../../services/gunDB/Mediator').EncryptedEmissionLegacy} EncryptedEmissionLegacy
 * @typedef {import('../../services/gunDB/contact-api/SimpleGUN').ValidDataValue} ValidDataValue
 * @typedef {(data: any, callback: (error?: any, data?: any) => void) => void} SocketOnListener
 */

/**
 * @param {string} eventName
 */
const isNonEncrypted = eventName => nonEncryptedEvents.includes(eventName)

/**
 * @param {SimpleSocket} socket
 * @returns {(eventName: string, ...args: any[]) => Promise<void>}
 */
const encryptedEmit = socket => async (eventName, ...args) => {
  try {
    if (isNonEncrypted(eventName)) {
      return socket.emit(eventName, ...args)
    }

    const deviceId = socket.handshake.auth.encryptionId

    if (!deviceId) {
      throw {
        field: 'deviceId',
        message: 'Please specify a device ID'
      }
    }

    const authorized = ECC.isAuthorizedDevice({ deviceId })

    if (!authorized) {
      throw {
        field: 'deviceId',
        message: 'Please exchange keys with the API before using the socket'
      }
    }

    const encryptedArgs = await Promise.all(
      args.map(async data => {
        if (!data) {
          return data
        }

        const encryptedMessage = await ECC.encryptMessage({
          message: typeof data === 'object' ? JSON.stringify(data) : data,
          deviceId
        })

        return encryptedMessage
      })
    )

    return socket.emit(eventName, ...encryptedArgs)
  } catch (err) {
    logger.error(
      `[SOCKET] An error has occurred while encrypting an event (${eventName}):`,
      err
    )

    return socket.emit('encryption:error', err)
  }
}

/**
 * @param {SimpleSocket} socket
 * @returns {(eventName: string, callback: SocketOnListener) => void}
 */
const encryptedOn = socket => (eventName, callback) => {
  try {
    if (isNonEncrypted(eventName)) {
      socket.on(eventName, callback)
      return
    }

    const deviceId = socket.handshake.auth.encryptionId

    if (!deviceId) {
      throw {
        field: 'deviceId',
        message: 'Please specify a device ID'
      }
    }

    const authorized = ECC.isAuthorizedDevice({ deviceId })

    if (!authorized) {
      throw {
        field: 'deviceId',
        message: 'Please exchange keys with the API before using the socket'
      }
    }

    socket.on(eventName, async (data, response) => {
      if (isNonEncrypted(eventName)) {
        callback(data, response)
        return
      }

      if (data) {
        const decryptedMessage = await ECC.decryptMessage({
          deviceId,
          encryptedMessage: data
        })

        callback(safeParseJSON(decryptedMessage), response)
      }
    })
  } catch (err) {
    logger.error(
      `[SOCKET] An error has occurred while decrypting an event (${eventName}):`,
      err
    )

    socket.emit('encryption:error', err)
  }
}

/**
 * @param {SimpleSocket} socket
 * @param {(error?: any, data?: any) => void} callback
 * @returns {(...args: any[]) => Promise<void>}
 */
const encryptedCallback = (socket, callback) => async (...args) => {
  try {
    const deviceId = socket.handshake.auth.encryptionId

    if (!deviceId) {
      throw {
        field: 'deviceId',
        message: 'Please specify a device ID'
      }
    }

    const authorized = ECC.isAuthorizedDevice({ deviceId })

    if (!authorized) {
      throw {
        field: 'deviceId',
        message: 'Please exchange keys with the API before using the socket'
      }
    }

    const encryptedArgs = await Promise.all(
      args.map(async data => {
        if (!data) {
          return data
        }

        const encryptedMessage = await ECC.encryptMessage({
          message: typeof data === 'object' ? JSON.stringify(data) : data,
          deviceId
        })

        return encryptedMessage
      })
    )

    return callback(...encryptedArgs)
  } catch (err) {
    logger.error(
      `[SOCKET] An error has occurred while emitting an event response:`,
      err
    )

    return socket.emit('encryption:error', err)
  }
}

module.exports = {
  isNonEncrypted,
  encryptedOn,
  encryptedEmit,
  encryptedCallback
}
