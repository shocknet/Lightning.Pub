/**
 * @format
 */
const ErrorCode = require('../errorCode')
const Key = require('../key')
const Schema = require('../schema')
const Utils = require('../utils')

/**
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 */

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

  const mySecret = require('../../Mediator').getMySecret()

  if (typeof mySecret !== 'string') {
    console.log("Jobs.onAcceptedRequests() -> typeof mySecret !== 'string'")
    return
  }

  user
    .get(Key.STORED_REQS)
    .map()
    .once(async (storedReq, id) => {
      try {
        if (!Schema.isStoredRequest(storedReq)) {
          throw new TypeError('Stored request not an StoredRequest')
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

        const recipientEpub = await Utils.pubToEpub(recipientPub)
        const ourSecret = await SEA.secret(recipientEpub, user._.sea)

        if (typeof ourSecret !== 'string') {
          throw new TypeError("typeof ourSecret !== 'string'")
        }

        await Utils.tryAndWait(
          (gun, user) =>
            new Promise((res, rej) => {
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

                  const feedIDExistsOnRecipientsOutgoings = await Utils.tryAndWait(
                    gun =>
                      new Promise(res => {
                        gun
                          .user(recipientPub)
                          .get(Key.OUTGOINGS)
                          .get(feedID)
                          .once(feed => {
                            res(typeof feed !== 'undefined')
                          })
                      })
                  )

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
        )
      } catch (err) {
        console.warn(`Jobs.onAcceptedRequests() -> ${err.message}`)
      }
    })
}

module.exports = onAcceptedRequests
