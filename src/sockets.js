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

  const onNewInvoice = (socket, subID) => {
    const { lightning } = LightningServices.services
    logger.warn('Subscribing to invoices socket...' + subID)
    const stream = lightning.subscribeInvoices({})
    stream.on('data', data => {
      logger.info('[SOCKET] New invoice data:', data)
      emitEncryptedEvent({ eventName: 'invoice:new', data, socket })
    })
    stream.on('end', () => {
      logger.info('New invoice stream ended, starting a new one...')
      // Prevents call stack overflow exceptions
      //process.nextTick(() => onNewInvoice(socket))
    })
    stream.on('error', err => {
      logger.error('New invoice stream error:' + subID, err)
    })
    stream.on('status', status => {
      logger.warn('New invoice stream status:' + subID, status)
      switch (status.code) {
        case 0: {
          logger.info('[event:invoice:new] stream ok')
          break
        }
        case 2: {
          logger.warn('[event:invoice:new] got UNKNOWN error status')
          break
        }
        case 12: {
          logger.warn(
            '[event:invoice:new] LND locked, new registration in 60 seconds'
          )
          process.nextTick(() =>
            setTimeout(() => onNewInvoice(socket, subID), 60000)
          )
          break
        }
        case 13: {
          //https://grpc.github.io/grpc/core/md_doc_statuscodes.html
          logger.error('[event:invoice:new] INTERNAL LND error')
          break
        }
        case 14: {
          logger.error(
            '[event:invoice:new] LND disconnected, sockets reconnecting in 30 seconds...'
          )
          process.nextTick(() =>
            setTimeout(() => onNewInvoice(socket, subID), 30000)
          )
          break
        }
      }
    })
    return () => {
      stream.cancel()
    }
  }

  const onNewTransaction = (socket, subID) => {
    const { lightning } = LightningServices.services
    const stream = lightning.subscribeTransactions({})
    logger.warn('Subscribing to transactions socket...' + subID)
    stream.on('data', data => {
      logger.info('[SOCKET] New transaction data:', data)
      emitEncryptedEvent({ eventName: 'transaction:new', data, socket })
    })
    stream.on('end', () => {
      logger.info('New transactions stream ended, starting a new one...')
      //process.nextTick(() => onNewTransaction(socket))
    })
    stream.on('error', err => {
      logger.error('New transactions stream error:' + subID, err)
    })
    stream.on('status', status => {
      logger.error('New transactions stream status:' + subID, status)
      switch (status.code) {
        case 0: {
          logger.info('[event:transaction:new] stream ok')
          break
        }
        case 2: {
          //Happens to fire when the grpc client lose access to macaroon file
          logger.warn('[event:transaction:new] got UNKNOWN error status')
          break
        }
        case 12: {
          logger.warn(
            '[event:transaction:new] LND locked, new registration in 60 seconds'
          )
          process.nextTick(() =>
            setTimeout(() => onNewTransaction(socket, subID), 60000)
          )
          break
        }
        case 13: {
          //https://grpc.github.io/grpc/core/md_doc_statuscodes.html
          logger.error('[event:transaction:new] INTERNAL LND error')
          break
        }
        case 14: {
          logger.error(
            '[event:transaction:new] LND disconnected, sockets reconnecting in 30 seconds...'
          )
          process.nextTick(() =>
            setTimeout(() => onNewTransaction(socket, subID), 30000)
          )
          break
        }
      }
    })
    return () => {
      stream.cancel()
    }
  }

  io.on('connection', socket => {
    logger.info(`io.onconnection`)

    logger.info('socket.handshake', socket.handshake)

    const isOneTimeUseSocket = !!socket.handshake.query.IS_GUN_AUTH
    const isLNDSocket = !!socket.handshake.query.IS_LND_SOCKET
    const isNotificationsSocket = !!socket.handshake.query
      .IS_NOTIFICATIONS_SOCKET
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
        const subID = Math.floor(Math.random() * 1000).toString()
        const isNotifications = isNotificationsSocket ? 'notifications' : ''
        logger.info('[LND] New LND Socket created:' + isNotifications + subID)
        const cancelInvoiceStream = onNewInvoice(socket, subID)
        const cancelTransactionStream = onNewTransaction(socket, subID)
        socket.on('disconnect', () => {
          logger.info('LND socket disconnected:' + isNotifications + subID)
          cancelInvoiceStream()
          cancelTransactionStream()
        })
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
