/**
 * @format
 */
// @ts-check

const logger = require('winston')
const Common = require('shock-common')
const mapValues = require('lodash/mapValues')

const auth = require('../services/auth/auth')
const LightningServices = require('../utils/lightningServices')
const { isAuthenticated } = require('../services/gunDB/Mediator')
const initGunDBSocket = require('../services/gunDB/sockets')
const GunEvents = require('../services/gunDB/contact-api/events')
const { encryptedEmit, encryptedOn } = require('../utils/ECC/socket')
const TipsForwarder = require('../services/tipsCallback')
/**
 * @typedef {import('../services/gunDB/Mediator').SimpleSocket} SimpleSocket
 * @typedef {import('../services/gunDB/contact-api/SimpleGUN').ValidDataValue} ValidDataValue
 */

module.exports = (
  /** @type {import('socket.io').Server} */
  io
) => {
  io.on('connection', socket => {
    const isLNDSocket = !!socket.handshake.auth.IS_LND_SOCKET
    const isNotificationsSocket = !!socket.handshake.auth
      .IS_NOTIFICATIONS_SOCKET

    if (!isLNDSocket) {
      /** printing out the client who joined */
      logger.info('New socket client connected (id=' + socket.id + ').')
    }

    if (isLNDSocket) {
      const subID = Math.floor(Math.random() * 1000).toString()
      const isNotifications = isNotificationsSocket ? 'notifications' : ''
      logger.info('[LND] New LND Socket created:' + isNotifications + subID)
    }
  })

  io.of('lndstreaming').on('connect', socket => {
    // TODO: unsubscription

    /**
     * Streaming stuff in LND uses these events: data, status, end, error.
     */

    try {
      if (!isAuthenticated()) {
        socket.emit(Common.Constants.ErrorCode.NOT_AUTH)
        return
      }

      const on = encryptedOn(socket)
      const emit = encryptedEmit(socket)

      const { services } = LightningServices

      const { service, method, args: unParsed } = socket.handshake.auth

      const args = JSON.parse(unParsed)

      const call = services[service][method](args)

      call.on('data', _data => {
        // socket.io serializes buffers differently from express
        const data = (() => {
          if (!Common.Schema.isObj(_data)) {
            return _data
          }

          return mapValues(_data, (item, key) => {
            if (!(item instanceof Buffer)) {
              return item
            }

            return item.toJSON()
          })
        })()

        emit('data', data)
      })

      call.on('status', status => {
        emit('status', status)
      })

      call.on('end', () => {
        emit('end')
      })

      call.on('error', err => {
        // 'error' is a reserved event name we can't use it
        emit('$error', err)
      })

      // Possibly allow streaming writes such as sendPaymentV2
      on('write', args => {
        call.write(args)
      })
    } catch (err) {
      logger.error('LNDRPC: ' + err.message)
    }
  })

  /**
   * @param {string} token
   * @returns {Promise<boolean>}
   */
  const isValidToken = async token => {
    const validation = await auth.validateToken(token)

    if (typeof validation !== 'object') {
      return false
    }

    if (validation === null) {
      return false
    }

    if (typeof validation.valid !== 'boolean') {
      return false
    }

    return validation.valid
  }

  /** @type {null|NodeJS.Timeout} */
  let pingIntervalID = null

  io.of('shockping').on(
    'connect',
    // TODO: make this sync
    async socket => {
      try {
        logger.info('Received connect request for shockping socket')
        if (!isAuthenticated()) {
          logger.info(
            'not authenticated in gun for shockping socket, will send NOT_AUTH'
          )
          socket.emit(Common.Constants.ErrorCode.NOT_AUTH)

          return
        }

        logger.info('now checking token')
        const { token } = socket.handshake.auth
        const isAuth = await isValidToken(token)

        if (!isAuth) {
          logger.warn('invalid token for socket ping')
          socket.emit(Common.Constants.ErrorCode.NOT_AUTH)
          return
        }

        if (pingIntervalID !== null) {
          logger.error(
            'Tried to set ping socket twice, this might be due to an app restart and the old socket not being recycled by socket.io in time, will disable the older ping interval, which means the old socket wont work and will ping this new socket instead'
          )
          clearInterval(pingIntervalID)
          pingIntervalID = null
        }

        pingIntervalID = setInterval(() => {
          socket.emit('shockping')
        }, 3000)

        socket.on('disconnect', () => {
          logger.warn('ping socket disconnected')
          if (pingIntervalID !== null) {
            clearInterval(pingIntervalID)
            pingIntervalID = null
          }
        })
      } catch (err) {
        logger.error('Error inside shockping connect: ' + err.message)
        socket.emit('$error', err.message)
      }
    }
  )

  // TODO: do this through rpc

  const emptyUnsub = () => {}

  let chatsUnsub = emptyUnsub

  io.of('chats').on('connect', async socket => {
    const on = encryptedOn(socket)
    const emit = encryptedEmit(socket)

    try {
      if (!isAuthenticated()) {
        logger.info(
          'not authenticated in gun for chats socket, will send NOT_AUTH'
        )
        emit(Common.Constants.ErrorCode.NOT_AUTH)

        return
      }

      logger.info('now checking token for chats socket')
      const { token } = socket.handshake.auth
      const isAuth = await isValidToken(token)

      if (!isAuth) {
        logger.warn('invalid token for chats socket')
        emit(Common.Constants.ErrorCode.NOT_AUTH)
        return
      }

      if (chatsUnsub !== emptyUnsub) {
        logger.error(
          'Tried to set chats socket twice, this might be due to an app restart and the old socket not being recycled by socket.io in time, will disable the older subscription, which means the old socket wont work and data will be sent to this new socket instead'
        )
        chatsUnsub()
        chatsUnsub = emptyUnsub
      }

      /**
       * @param {Common.Schema.Chat[]} chats
       */
      const onChats = chats => {
        const processed = chats.map(
          ({
            didDisconnect,
            id,
            lastSeenApp,
            messages,
            recipientPublicKey
          }) => {
            /** @type {Common.Schema.Chat} */
            const stripped = {
              didDisconnect,
              id,
              lastSeenApp,
              messages,
              recipientAvatar: null,
              recipientDisplayName: null,
              recipientPublicKey
            }

            return stripped
          }
        )

        emit('$shock', processed)
      }

      chatsUnsub = GunEvents.onChats(onChats)

      on('disconnect', () => {
        chatsUnsub()
        chatsUnsub = emptyUnsub
      })
    } catch (e) {
      logger.error('Error inside chats socket connect: ' + e.message)
      emit('$error', e.message)
    }
  })

  let sentReqsUnsub = emptyUnsub

  io.of('sentReqs').on('connect', async socket => {
    const on = encryptedOn(socket)
    const emit = encryptedEmit(socket)

    try {
      if (!isAuthenticated()) {
        logger.info(
          'not authenticated in gun for sentReqs socket, will send NOT_AUTH'
        )
        emit(Common.Constants.ErrorCode.NOT_AUTH)

        return
      }

      logger.info('now checking token for sentReqs socket')
      const { token } = socket.handshake.auth
      const isAuth = await isValidToken(token)

      if (!isAuth) {
        logger.warn('invalid token for sentReqs socket')
        emit(Common.Constants.ErrorCode.NOT_AUTH)
        return
      }

      if (sentReqsUnsub !== emptyUnsub) {
        logger.error(
          'Tried to set sentReqs socket twice, this might be due to an app restart and the old socket not being recycled by io in time, will disable the older subscription, which means the old socket wont work and data will be sent to this new socket instead'
        )
        sentReqsUnsub()
        sentReqsUnsub = emptyUnsub
      }

      /**
       * @param {Common.Schema.SimpleSentRequest[]} sentReqs
       */
      const onSentReqs = sentReqs => {
        const processed = sentReqs.map(
          ({
            id,
            recipientChangedRequestAddress,
            recipientPublicKey,
            timestamp
          }) => {
            /**
             * @type {Common.Schema.SimpleSentRequest}
             */
            const stripped = {
              id,
              recipientAvatar: null,
              recipientChangedRequestAddress,
              recipientDisplayName: null,
              recipientPublicKey,
              timestamp
            }

            return stripped
          }
        )
        emit('$shock', processed)
      }

      sentReqsUnsub = GunEvents.onSimplerSentRequests(onSentReqs)

      on('disconnect', () => {
        sentReqsUnsub()
        sentReqsUnsub = emptyUnsub
      })
    } catch (e) {
      logger.error('Error inside sentReqs socket connect: ' + e.message)
      emit('$error', e.message)
    }
  })

  let receivedReqsUnsub = emptyUnsub

  io.of('receivedReqs').on('connect', async socket => {
    const on = encryptedOn(socket)
    const emit = encryptedEmit(socket)
    try {
      if (!isAuthenticated()) {
        logger.info(
          'not authenticated in gun for receivedReqs socket, will send NOT_AUTH'
        )
        emit(Common.Constants.ErrorCode.NOT_AUTH)

        return
      }

      logger.info('now checking token for receivedReqs socket')
      const { token } = socket.handshake.auth
      const isAuth = await isValidToken(token)

      if (!isAuth) {
        logger.warn('invalid token for receivedReqs socket')
        emit(Common.Constants.ErrorCode.NOT_AUTH)
        return
      }

      if (receivedReqsUnsub !== emptyUnsub) {
        logger.error(
          'Tried to set receivedReqs socket twice, this might be due to an app restart and the old socket not being recycled by socket.io in time, will disable the older subscription, which means the old socket wont work and data will be sent to this new socket instead'
        )
        receivedReqsUnsub()
        receivedReqsUnsub = emptyUnsub
      }

      /**
       * @param {ReadonlyArray<Common.SimpleReceivedRequest>} receivedReqs
       */
      const onReceivedReqs = receivedReqs => {
        const processed = receivedReqs.map(({ id, requestorPK, timestamp }) => {
          /** @type {Common.Schema.SimpleReceivedRequest} */
          const stripped = {
            id,
            requestorAvatar: null,
            requestorDisplayName: null,
            requestorPK,
            timestamp
          }

          return stripped
        })

        emit('$shock', processed)
      }

      receivedReqsUnsub = GunEvents.onSimplerReceivedRequests(onReceivedReqs)

      on('disconnect', () => {
        receivedReqsUnsub()
        receivedReqsUnsub = emptyUnsub
      })
    } catch (e) {
      logger.error('Error inside receivedReqs socket connect: ' + e.message)
      emit('$error', e.message)
    }
  })
  io.of('streams').on('connect', socket => {
    console.log('a user connected')
    socket.on('postID', postID => {
      TipsForwarder.addSocket(postID, socket)
    })
  })

  return io
}
