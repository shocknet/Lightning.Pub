/** @prettier */
// app/sockets.js

const logger = require('winston')
const Encryption = require('../utils/encryptionStore')
const LightningServices = require('../utils/lightningServices')

module.exports = (
  /** @type {import('socket.io').Server} */
  io
) => {
  const Mediator = require('../services/gunDB/Mediator/index.js')

  // This should be used for encrypting and emitting your data
  const emitEncryptedEvent = ({ eventName, data, socket }) => {
    try {
      if (Encryption.isNonEncrypted(eventName)) {
        return socket.emit(eventName, data)
      }

      const deviceId = socket.handshake.query['x-shockwallet-device-id']
      const authorized = Encryption.isAuthorizedDevice({ deviceId })

      if (!deviceId) {
        throw {
          field: 'deviceId',
          message: 'Please specify a device ID'
        }
      }

      if (!authorized) {
        throw {
          field: 'deviceId',
          message: 'Please exchange keys with the API before using the socket'
        }
      }

      const encryptedMessage = Encryption.encryptMessage({
        message: data,
        deviceId
      })

      return socket.emit(eventName, encryptedMessage)
    } catch (err) {
      logger.error(
        `[SOCKET] An error has occurred while encrypting an event (${eventName}):`,
        err
      )

      return socket.emit('encryption:error', err)
    }
  }

  const parseJSON = data => {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data)
      }

      return data
    } catch (err) {
      return data
    }
  }

  const decryptEvent = ({ eventName, data, socket }) => {
    try {
      const deviceId = socket.handshake.query['x-shockwallet-device-id']
      if (Encryption.isNonEncrypted(eventName)) {
        return data
      }

      if (!data) {
        return data
      }

      const parsedData = parseJSON(data)

      if (!deviceId) {
        throw {
          field: 'deviceId',
          message: 'Please specify a device ID'
        }
      }

      if (!Encryption.isAuthorizedDevice({ deviceId })) {
        throw {
          field: 'deviceId',
          message: 'Please exchange keys with the API before using the socket'
        }
      }

      const decryptedKey = Encryption.decryptKey({
        deviceId,
        message: parsedData.encryptedKey
      })
      const decryptedMessage = Encryption.decryptMessage({
        message: parsedData.encryptedData,
        key: decryptedKey,
        iv: parsedData.iv
      })
      const decryptedData = JSON.parse(decryptedMessage)
      return decryptedData
    } catch (err) {
      logger.error(
        `[SOCKET] An error has occurred while decrypting an event (${eventName}):`,
        err
      )

      return socket.emit('encryption:error', err)
    }
  }

  const onNewInvoice = socket => {
    const { lightning } = LightningServices.services
    logger.warn('Subscribing to invoices socket...')
    const stream = lightning.subscribeInvoices({})
    stream.on('data', data => {
      logger.info('[SOCKET] New invoice data:', data)
      emitEncryptedEvent({ eventName: 'invoice:new', data, socket })
    })
    stream.on('end', () => {
      logger.info('New invoice stream ended, starting a new one...')
      onNewInvoice(socket)
    })
    stream.on('error', err => {
      logger.error('New invoice stream error:', err)
    })
    stream.on('status', status => {
      logger.warn('New invoice stream status:', status)
      if (status.code === 14) {
        onNewInvoice(socket)
      }
    })
  }

  const onNewTransaction = socket => {
    const { lightning } = LightningServices.services
    const stream = lightning.subscribeTransactions({})
    logger.warn('Subscribing to transactions socket...')
    stream.on('data', data => {
      logger.info('[SOCKET] New transaction data:', data)
      emitEncryptedEvent({ eventName: 'transaction:new', data, socket })
    })
    stream.on('end', () => {
      logger.info('New invoice stream ended, starting a new one...')
      onNewTransaction(socket)
    })
    stream.on('error', err => {
      logger.error('New invoice stream error:', err)
    })
    stream.on('status', status => {
      logger.error('New invoice stream status:', status)
      if (status.code === 14) {
        onNewTransaction(socket)
      }
    })
  }

  io.on('connection', socket => {
    logger.info(`io.onconnection`)

    logger.info('socket.handshake', socket.handshake)

    const isOneTimeUseSocket = !!socket.handshake.query.IS_GUN_AUTH
    const isLNDSocket = !!socket.handshake.query.IS_LND_SOCKET
    if (!isLNDSocket) {
      /** printing out the client who joined */
      logger.info('New socket client connected (id=' + socket.id + ').')
    }

    if (isOneTimeUseSocket) {
      logger.info('New socket is one time use')
      socket.on('IS_GUN_AUTH', () => {
        try {
          const isGunAuth = Mediator.isAuthenticated()
          socket.emit('IS_GUN_AUTH', {
            ok: true,
            msg: {
              isGunAuth
            },
            origBody: {}
          })
          socket.disconnect()
        } catch (err) {
          socket.emit('IS_GUN_AUTH', {
            ok: false,
            msg: err.message,
            origBody: {}
          })
          socket.disconnect()
        }
      })
    } else {
      if (isLNDSocket) {
        logger.info('[LND] New LND Socket created')
        onNewInvoice(socket)
        onNewTransaction(socket)
        return
      }
      logger.info('New socket is NOT one time use')
      // this is where we create the websocket connection
      // with the GunDB service.
      Mediator.createMediator(socket)

      /** listening if client has disconnected */
      socket.on('disconnect', () => {
        logger.info('client disconnected (id=' + socket.id + ').')
      })
    }
  })

  return io
}
