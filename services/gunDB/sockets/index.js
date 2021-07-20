/**
 * @format
 */

const logger = require('winston')
const Common = require('shock-common')
const uuidv4 = require('uuid/v4')

const { getGun, getUser, isAuthenticated } = require('../Mediator')
const { deepDecryptIfNeeded } = require('../rpc')
const Subscriptions = require('./subscriptions')
const GunActions = require('../../gunDB/contact-api/actions')
const {
  encryptedEmit,
  encryptedOn,
  encryptedCallback
} = require('../../../utils/ECC/socket')

const ALLOWED_GUN_METHODS = [
  'map',
  'map.on',
  'on',
  'once',
  'load',
  'then',
  'open'
]

/**
 * @typedef {import('../contact-api/SimpleGUN').ValidDataValue} ValidDataValue
 */

/**
 * @typedef {(data: ValidDataValue, key?: string, _msg?: any, event?: any) => (void | Promise<void>)} GunListener
 * @typedef {{ reconnect: boolean, token: string }} SubscriptionOptions
 */

/**
 * @param {string} root
 */
const getNode = root => {
  if (root === '$gun') {
    return getGun()
  }

  if (root === '$user') {
    return getUser()
  }

  return getGun().user(root)
}

/**
 * @param {import("../contact-api/SimpleGUN").GUNNode} node
 * @param {string} path
 */
const getGunQuery = (node, path) => {
  const bits = path.split('>')
  const query = bits.reduce((gunQuery, bit) => gunQuery.get(bit), node)
  return query
}

/**
 * Executes a GunDB query call using the specified method
 * @param {any} query
 * @param {string} method
 * @param {GunListener} listener
 */
const executeGunQuery = (query, method, listener) => {
  if (!ALLOWED_GUN_METHODS.includes(method)) {
    throw {
      field: 'method',
      message: `Invalid GunDB method specified (${method}). `
    }
  }

  if (method === 'on') {
    return query.on(listener)
  }

  if (method === 'open') {
    return query.open(listener)
  }

  if (method === 'map.on') {
    return query.map().on(listener)
  }

  if (method === 'map.once') {
    return query.map().once(listener)
  }
}

/**
 * @param {Object} queryData
 * @param {(eventName: string, ...args: any[]) => Promise<void>} queryData.emit
 * @param {string} queryData.publicKeyForDecryption
 * @param {string} queryData.subscriptionId
 * @param {string} queryData.deviceId
 * @param {string=} queryData.epubForDecryption
 * @param {string=} queryData.epubField If the epub is included in the received
 * data itself. Handshake requests for example, have an epub field.
 * @returns {GunListener}
 */
const queryListenerCallback = ({
  emit,
  publicKeyForDecryption,
  subscriptionId,
  deviceId,
  epubForDecryption,
  epubField
}) => async (data, key, _msg, event) => {
  try {
    const subscription = Subscriptions.get({
      deviceId,
      subscriptionId
    })
    if (subscription && !subscription.unsubscribe && event) {
      Subscriptions.attachUnsubscribe({
        deviceId,
        subscriptionId,
        unsubscribe: () => event.off()
      })
    }
    const eventName = `query:data`
    if (publicKeyForDecryption?.length > 15 || epubForDecryption || epubField) {
      const decData = await deepDecryptIfNeeded(
        data,
        publicKeyForDecryption,
        (() => {
          if (epubField) {
            if (Common.isObj(data)) {
              const epub = data[epubField]
              if (Common.isPopulatedString(epub)) {
                return epub
              }

              logger.error(
                `Got epubField in a rifle query, but the resulting value obtained is not an string -> `,
                {
                  data,
                  epub
                }
              )
            } else {
              logger.warn(
                `Got epubField in a rifle query for a non-object data -> `,
                {
                  epubField,
                  data
                }
              )
            }
          }
          return epubForDecryption
        })()
      )
      emit(eventName, { subscriptionId, response: { data: decData, key } })
      return
    }

    emit(eventName, { subscriptionId, response: { data, key } })
  } catch (err) {
    logger.error(`Error for gun rpc socket: ${err.message}`)
  }
}

/** @param {import('socket.io').Socket} socket */
const startSocket = socket => {
  try {
    const emit = encryptedEmit(socket)
    const on = encryptedOn(socket)
    const { encryptionId } = socket.handshake.auth

    if (!isAuthenticated()) {
      logger.warn('GunDB is not yet authenticated')
      socket.emit(Common.Constants.ErrorCode.NOT_AUTH)
    }

    if (isAuthenticated()) {
      socket.onAny(() => {
        GunActions.setLastSeenApp().catch(e =>
          console.log('error setting last seen app', e)
        )
      })
    }

    on('subscribe:query', (query, response) => {
      const { $shock, publicKey, epubForDecryption, epubField } = query
      const subscriptionId = uuidv4()
      try {
        if (!isAuthenticated()) {
          socket.emit(Common.Constants.ErrorCode.NOT_AUTH)
          return
        }

        const [root, path, method] = $shock.split('::')
        const socketCallback = encryptedCallback(socket, response)

        if (!ALLOWED_GUN_METHODS.includes(method)) {
          socketCallback(
            `Invalid method for gun rpc call: ${method}, query: ${$shock}`
          )
          return
        }

        Subscriptions.add({
          deviceId: encryptionId,
          subscriptionId
        })

        const queryCallback = queryListenerCallback({
          emit,
          publicKeyForDecryption: publicKey,
          subscriptionId,
          deviceId: encryptionId,
          epubForDecryption,
          epubField
        })

        socketCallback(null, {
          subscriptionId
        })

        const node = getNode(root)
        const query = getGunQuery(node, path)

        executeGunQuery(query, method, queryCallback)
      } catch (error) {
        emit(`query:error`, { subscriptionId, response: { data: error } })
      }
    })

    on('unsubscribe', ({ subscriptionId }, response) => {
      const callback = encryptedCallback(socket, response)
      Subscriptions.remove({ deviceId: encryptionId, subscriptionId })
      callback(null, {
        message: 'Unsubscribed successfully!',
        success: true
      })
    })

    socket.on('disconnect', () => {
      Subscriptions.removeDevice({ deviceId: encryptionId })
    })
  } catch (err) {
    logger.error('GUNRPC: ' + err.message)
  }
}

module.exports = startSocket
