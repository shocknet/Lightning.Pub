/**
 * @format
 */
const logger = require('winston')

const ErrorCode = require('../errorCode')
const Key = require('../key')
const Schema = require('../schema')
const Utils = require('../utils')

/**
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 */

let procid = 0

/**
 * @throws {Error} NOT_AUTH
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {void}
 */
const onAcceptedRequests = (user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  procid++

  user
    .get(Key.STORED_REQS)
    .map()
    .once(async (storedReq, id) => {
      logger.info(
        `------------------------------------\nPROCID:${procid}\n---------------------------------------`
      )
      const mySecret = require('../../Mediator').getMySecret()
      try {
        if (!Schema.isStoredRequest(storedReq)) {
          throw new TypeError(
            'Stored request not an StoredRequest, instead got: ' +
              JSON.stringify(storedReq)
          )
        }
        const recipientPub = await SEA.decrypt(storedReq.recipientPub, mySecret)

        if (typeof recipientPub !== 'string') {
          throw new TypeError()
        }
        if (await Utils.successfulHandshakeAlreadyExists(recipientPub)) {
          return
        }
        const requestAddress = await SEA.decrypt(
          storedReq.handshakeAddress,
          mySecret
        )
        if (typeof requestAddress !== 'string') {
          throw new TypeError()
        }
        const sentReqID = await SEA.decrypt(storedReq.sentReqID, mySecret)
        if (typeof sentReqID !== 'string') {
          throw new TypeError()
        }

        const latestReqSentID = await Utils.recipientPubToLastReqSentID(
          recipientPub
        )

        const isStaleRequest = latestReqSentID !== sentReqID
        if (isStaleRequest) {
          return
        }

        const gun = require('../../Mediator').getGun()
        const user = require('../../Mediator').getUser()

        const recipientEpub = await Utils.pubToEpub(recipientPub)
        const ourSecret = await SEA.secret(recipientEpub, user._.sea)

        await new Promise((res, rej) => {
          gun
            .get(Key.HANDSHAKE_NODES)
            .get(requestAddress)
            .get(sentReqID)
            .on(async sentReq => {
              if (!Schema.isHandshakeRequest(sentReq)) {
                rej(
                  new Error(
                    'sent request found in handshake node not a handshake request'
                  )
                )
                return
              }

              // The response can be decrypted with the same secret regardless of who
              // wrote to it last (see HandshakeRequest definition).
              // This could be our feed ID for the recipient, or the recipient's feed
              // id if he accepted the request.
              const feedID = await SEA.decrypt(sentReq.response, ourSecret)

              if (typeof feedID !== 'string') {
                throw new TypeError("typeof feedID !== 'string'")
              }

              logger.info(`onAcceptedRequests -> decrypted feed ID: ${feedID}`)

              logger.info(
                'Will now try to access the other users outgoing feed'
              )

              const maybeFeedOnRecipientsOutgoings = await Utils.tryAndWait(
                gun =>
                  new Promise(res => {
                    gun
                      .user(recipientPub)
                      .get(Key.OUTGOINGS)
                      .get(feedID)
                      .once(feed => {
                        res(feed)
                      })
                  }),
                // retry on undefined, might be a false negative
                v => typeof v === 'undefined'
              )

              const feedIDExistsOnRecipientsOutgoings =
                typeof maybeFeedOnRecipientsOutgoings === 'object' &&
                maybeFeedOnRecipientsOutgoings !== null

              if (!feedIDExistsOnRecipientsOutgoings) {
                return
              }

              const encryptedForMeIncomingID = await SEA.encrypt(
                feedID,
                mySecret
              )

              await new Promise((res, rej) => {
                user
                  .get(Key.USER_TO_INCOMING)
                  .get(recipientPub)
                  .put(encryptedForMeIncomingID, ack => {
                    if (ack.err) {
                      rej(new Error(ack.err))
                    } else {
                      res()
                    }
                  })
              })

              await new Promise((res, rej) => {
                user
                  .get(Key.STORED_REQS)
                  .get(id)
                  .put(null, ack => {
                    if (ack.err) {
                      rej(new Error(ack.err))
                    } else {
                      res()
                    }
                  })
              })

              // ensure this listeners gets called at least once
              res()
            })
        })
      } catch (err) {
        logger.warn(`Jobs.onAcceptedRequests() -> ${err.message}`)
        logger.error(err)
      }
    })
}

module.exports = onAcceptedRequests
