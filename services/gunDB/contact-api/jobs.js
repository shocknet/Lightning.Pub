/**
 * @prettier
 * Taks are subscriptions to events that perform actions (write to GUN) on
 * response to certain ways events can happen. These tasks need to be fired up
 * at app launch otherwise certain features won't work as intended. Tasks should
 * ideally be idempotent, that is, if they were to be fired up after a certain
 * amount of time after app launch, everything should work as intended. For this
 * to work, special care has to be put into how these respond to events. These
 * tasks could be hardcoded inside events but then they wouldn't be easily
 * auto-testable. These tasks accept factories that are homonymous to the events
 * on the same
 */
const ErrorCode = require('./errorCode')
const Key = require('./key')
const Schema = require('./schema')
const Utils = require('./utils')

/**
 * @typedef {import('./SimpleGUN').GUNNode} GUNNode
 * @typedef {import('./SimpleGUN').ISEA} ISEA
 * @typedef {import('./SimpleGUN').UserGUNNode} UserGUNNode
 */

/**
 * @throws {Error} NOT_AUTH
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const onAcceptedRequests = async (user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)

  if (typeof mySecret !== 'string') {
    console.log("Jobs.onAcceptedRequests() -> typeof mySecret !== 'string'")
    return
  }

  user
    .get(Key.STORED_REQS)
    .map()
    .once(async storedReq => {
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

                  user
                    .get(Key.USER_TO_INCOMING)
                    .get(recipientPub)
                    .put(encryptedForMeIncomingID)

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

module.exports = {
  onAcceptedRequests
}
