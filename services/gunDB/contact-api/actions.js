/**
 * @format
 */
const uuidv1 = require('uuid/v1')
const ErrorCode = require('./errorCode')
const Key = require('./key')
const Utils = require('./utils')
const { isHandshakeRequest } = require('./schema')
/**
 * @typedef {import('./SimpleGUN').GUNNode} GUNNode
 * @typedef {import('./SimpleGUN').ISEA} ISEA
 * @typedef {import('./SimpleGUN').UserGUNNode} UserGUNNode
 * @typedef {import('./schema').HandshakeRequest} HandshakeRequest
 * @typedef {import('./schema').StoredRequest} StoredReq
 * @typedef {import('./schema').Message} Message
 * @typedef {import('./schema').Outgoing} Outgoing
 * @typedef {import('./schema').PartialOutgoing} PartialOutgoing
 */

/**
 * An special message signaling the acceptance.
 */
const INITIAL_MSG = '$$__SHOCKWALLET__INITIAL__MESSAGE'

/**
 * @returns {Message}
 */
const __createInitialMessage = () => ({
  body: INITIAL_MSG,
  timestamp: Date.now()
})

/**
 * Create a an outgoing feed. The feed will have an initial special acceptance
 * message. Returns a promise that resolves to the id of the newly-created
 * outgoing feed.
 *
 * If an outgoing feed is already created for the recipient, then returns the id
 * of that one.
 * @param {string} withPublicKey Public key of the intended recipient of the
 * outgoing feed that will be created.
 * @throws {Error} If the outgoing feed cannot be created or if the initial
 * message for it also cannot be created. These errors aren't coded as they are
 * not meant to be caught outside of this module.
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<string>}
 */
const __createOutgoingFeed = async (withPublicKey, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError(
      "__createOutgoingFeed() -> typeof mySecret !== 'string'"
    )
  }
  const encryptedForMeRecipientPub = await SEA.encrypt(withPublicKey, mySecret)

  const maybeEncryptedForMeOutgoingFeedID = await Utils.tryAndWait(
    (_, user) =>
      new Promise(res => {
        user
          .get(Key.RECIPIENT_TO_OUTGOING)
          .get(withPublicKey)
          .once(data => {
            res(data)
          })
      })
  )

  let outgoingFeedID = ''

  // if there was no stored outgoing, create an outgoing feed
  if (typeof maybeEncryptedForMeOutgoingFeedID !== 'string') {
    /** @type {PartialOutgoing} */
    const newPartialOutgoingFeed = {
      with: encryptedForMeRecipientPub
    }

    /** @type {string} */
    const newOutgoingFeedID = await new Promise((res, rej) => {
      const _outFeedNode = user
        .get(Key.OUTGOINGS)
        .set(newPartialOutgoingFeed, ack => {
          if (ack.err) {
            rej(new Error(ack.err))
          } else {
            res(_outFeedNode._.get)
          }
        })
    })

    if (typeof newOutgoingFeedID !== 'string') {
      throw new TypeError('typeof newOutgoingFeedID !== "string"')
    }

    await new Promise((res, rej) => {
      user
        .get(Key.OUTGOINGS)
        .get(newOutgoingFeedID)
        .get(Key.MESSAGES)
        .set(__createInitialMessage(), ack => {
          if (ack.err) {
            rej(new Error(ack.err))
          } else {
            res()
          }
        })
    })

    const encryptedForMeNewOutgoingFeedID = await SEA.encrypt(
      newOutgoingFeedID,
      mySecret
    )

    if (typeof encryptedForMeNewOutgoingFeedID === 'undefined') {
      throw new TypeError(
        "typeof encryptedForMeNewOutgoingFeedID === 'undefined'"
      )
    }

    await new Promise((res, rej) => {
      user
        .get(Key.RECIPIENT_TO_OUTGOING)
        .get(withPublicKey)
        .put(encryptedForMeNewOutgoingFeedID, ack => {
          if (ack.err) {
            rej(Error(ack.err))
          } else {
            res()
          }
        })
    })

    outgoingFeedID = newOutgoingFeedID
  }

  // otherwise decrypt stored outgoing
  else {
    const decryptedOID = await SEA.decrypt(
      maybeEncryptedForMeOutgoingFeedID,
      mySecret
    )

    if (typeof decryptedOID !== 'string') {
      throw new TypeError(
        "__createOutgoingFeed() -> typeof decryptedOID !== 'string'"
      )
    }

    outgoingFeedID = decryptedOID
  }

  if (typeof outgoingFeedID === 'undefined') {
    throw new TypeError(
      '__createOutgoingFeed() -> typeof outgoingFeedID === "undefined"'
    )
  }

  if (typeof outgoingFeedID !== 'string') {
    throw new TypeError(
      '__createOutgoingFeed() -> expected outgoingFeedID to be an string'
    )
  }

  if (outgoingFeedID.length === 0) {
    throw new TypeError(
      '__createOutgoingFeed() -> expected outgoingFeedID to be a populated string.'
    )
  }

  return outgoingFeedID
}

/**
 * Given a request's ID, that should be found on the user's current handshake
 * node, accept the request by creating an outgoing feed intended for the
 * requestor, then encrypting and putting the id of this newly created outgoing
 * feed on the response prop of the request.
 * @param {string} requestID The id for the request to accept.
 * @param {GUNNode} gun
 * @param {UserGUNNode} user Pass only for testing purposes.
 * @param {ISEA} SEA
 * @param {typeof __createOutgoingFeed} outgoingFeedCreator Pass only
 * for testing. purposes.
 * @throws {Error} Throws if trying to accept an invalid request, or an error on
 * gun's part.
 * @returns {Promise<void>}
 */
const acceptRequest = async (
  requestID,
  gun,
  user,
  SEA,
  outgoingFeedCreator = __createOutgoingFeed
) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const handshakeAddress = await Utils.tryAndWait(async (_, user) => {
    const addr = await user.get(Key.CURRENT_HANDSHAKE_ADDRESS).then()

    if (typeof addr !== 'string') {
      throw new TypeError("typeof addr !== 'string'")
    }

    return addr
  })

  const {
    response: encryptedForUsIncomingID,
    from: senderPublicKey
  } = await Utils.tryAndWait(async gun => {
    const hr = await gun
      .get(Key.HANDSHAKE_NODES)
      .get(handshakeAddress)
      .get(requestID)
      .then()

    if (!isHandshakeRequest(hr)) {
      throw new Error(ErrorCode.TRIED_TO_ACCEPT_AN_INVALID_REQUEST)
    }

    return hr
  })

  /** @type {string} */
  const requestorEpub = await Utils.pubToEpub(senderPublicKey)

  const ourSecret = await SEA.secret(requestorEpub, user._.sea)
  if (typeof ourSecret !== 'string') {
    throw new TypeError("typeof ourSecret !== 'string'")
  }

  const incomingID = await SEA.decrypt(encryptedForUsIncomingID, ourSecret)
  if (typeof incomingID !== 'string') {
    throw new TypeError("typeof incomingID !== 'string'")
  }

  const newlyCreatedOutgoingFeedID = await outgoingFeedCreator(
    senderPublicKey,
    user,
    SEA
  )

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError("acceptRequest() -> typeof mySecret !== 'string'")
  }
  const encryptedForMeIncomingID = await SEA.encrypt(incomingID, mySecret)

  await new Promise((res, rej) => {
    user
      .get(Key.USER_TO_INCOMING)
      .get(senderPublicKey)
      .put(encryptedForMeIncomingID, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

  ////////////////////////////////////////////////////////////////////////////
  // NOTE: perform non-reversable actions before destructive actions
  // In case any of the non-reversable actions reject.
  // In this case, writing to the response is the non-revesarble op.
  ////////////////////////////////////////////////////////////////////////////

  const encryptedForUsOutgoingID = await SEA.encrypt(
    newlyCreatedOutgoingFeedID,
    ourSecret
  )

  await new Promise((res, rej) => {
    gun
      .get(Key.HANDSHAKE_NODES)
      .get(handshakeAddress)
      .get(requestID)
      .put(
        {
          response: encryptedForUsOutgoingID
        },
        ack => {
          if (ack.err) {
            rej(new Error(ack.err))
          } else {
            res()
          }
        }
      )
  })
}

/**
 * @param {string} user
 * @param {string} pass
 * @param {UserGUNNode} userNode
 */
const authenticate = (user, pass, userNode) =>
  new Promise((resolve, reject) => {
    if (typeof user !== 'string') {
      throw new TypeError('expected user to be of type string')
    }

    if (typeof pass !== 'string') {
      throw new TypeError('expected pass to be of type string')
    }

    if (user.length === 0) {
      throw new TypeError('expected user to have length greater than zero')
    }

    if (pass.length === 0) {
      throw new TypeError('expected pass to have length greater than zero')
    }

    if (typeof userNode.is === 'undefined') {
      throw new Error(ErrorCode.ALREADY_AUTH)
    }

    userNode.auth(user, pass, ack => {
      if (ack.err) {
        reject(new Error(ack.err))
      } else if (!userNode.is) {
        reject(new Error('authentication failed'))
      } else {
        resolve()
      }
    })
  })

/**
 * @param {string} publicKey
 * @param {UserGUNNode} user Pass only for testing.
 * @throws {Error} If there's an error saving to the blacklist.
 * @returns {Promise<void>}
 */
const blacklist = (publicKey, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    user.get(Key.BLACKLIST).set(publicKey, ack => {
      if (ack.err) {
        reject(new Error(ack.err))
      } else {
        resolve()
      }
    })
  })

/**
 * @param {UserGUNNode} user
 * @returns {Promise<void>}
 */
const generateHandshakeAddress = user =>
  new Promise((res, rej) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    const address = uuidv1()

    user.get(Key.CURRENT_HANDSHAKE_ADDRESS).put(address, ack => {
      if (ack.err) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })

/**
 * @param {string} recipientPublicKey
 * @param {GUNNode} gun
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @throws {Error|TypeError}
 * @returns {Promise<void>}
 */
const sendHandshakeRequest = async (recipientPublicKey, gun, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  if (typeof recipientPublicKey !== 'string') {
    throw new TypeError(
      `recipientPublicKey is not string, got: ${typeof recipientPublicKey}`
    )
  }

  if (recipientPublicKey.length === 0) {
    throw new TypeError('recipientPublicKey is an string of length 0')
  }

  console.log('sendHR() -> before recipientEpub')

  /** @type {string} */
  const recipientEpub = await Utils.pubToEpub(recipientPublicKey)

  console.log('sendHR() -> before mySecret')

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  console.log('sendHR() -> before ourSecret')
  const ourSecret = await SEA.secret(recipientEpub, user._.sea)

  // check if successful handshake is present

  console.log('sendHR() -> before alreadyHandshaked')

  /** @type {boolean} */
  const alreadyHandshaked = await Utils.successfulHandshakeAlreadyExists(
    recipientPublicKey
  )

  if (alreadyHandshaked) {
    throw new Error(ErrorCode.ALREADY_HANDSHAKED)
  }

  console.log('sendHR() -> before maybeLastRequestIDSentToUser')

  // check that we have already sent a request to this user, on his current
  // handshake node
  const maybeLastRequestIDSentToUser = await Utils.tryAndWait((_, user) =>
    user
      .get(Key.USER_TO_LAST_REQUEST_SENT)
      .get(recipientPublicKey)
      .then()
  )

  console.log('sendHR() -> before currentHandshakeAddress')

  const currentHandshakeAddress = await Utils.tryAndWait(gun =>
    gun
      .user(recipientPublicKey)
      .get(Key.CURRENT_HANDSHAKE_ADDRESS)
      .then()
  )

  if (typeof currentHandshakeAddress !== 'string') {
    throw new TypeError(
      'expected current handshake address found on recipients user node to be an string'
    )
  }

  if (typeof maybeLastRequestIDSentToUser === 'string') {
    if (maybeLastRequestIDSentToUser.length < 5) {
      throw new TypeError(
        'sendHandshakeRequest() -> maybeLastRequestIDSentToUser.length < 5'
      )
    }

    const lastRequestIDSentToUser = maybeLastRequestIDSentToUser

    console.log('sendHR() -> before alreadyContactedOnCurrHandshakeNode')
    /** @type {boolean} */
    const alreadyContactedOnCurrHandshakeNode = await Utils.tryAndWait(
      gun =>
        new Promise(res => {
          gun
            .get(Key.HANDSHAKE_NODES)
            .get(currentHandshakeAddress)
            .get(lastRequestIDSentToUser)
            .once(data => {
              res(typeof data !== 'undefined')
            })
        })
    )

    if (alreadyContactedOnCurrHandshakeNode) {
      throw new Error(ErrorCode.ALREADY_REQUESTED_HANDSHAKE)
    }
  }

  console.log('sendHR() -> before __createOutgoingFeed')

  const outgoingFeedID = await __createOutgoingFeed(
    recipientPublicKey,
    user,
    SEA
  )

  console.log('sendHR() -> before encryptedForUsOutgoingFeedID')

  const encryptedForUsOutgoingFeedID = await SEA.encrypt(
    outgoingFeedID,
    ourSecret
  )

  const timestamp = Date.now()

  /** @type {HandshakeRequest} */
  const handshakeRequestData = {
    from: user.is.pub,
    response: encryptedForUsOutgoingFeedID,
    timestamp
  }

  console.log('sendHR() -> before newHandshakeRequestID')
  /** @type {string} */
  const newHandshakeRequestID = await new Promise((res, rej) => {
    const hr = gun
      .get(Key.HANDSHAKE_NODES)
      .get(currentHandshakeAddress)
      .set(handshakeRequestData, ack => {
        if (ack.err) {
          rej(new Error(`Error trying to create request: ${ack.err}`))
        } else {
          res(hr._.get)
        }
      })
  })

  await new Promise((res, rej) => {
    user
      .get(Key.USER_TO_LAST_REQUEST_SENT)
      .get(recipientPublicKey)
      .put(newHandshakeRequestID, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

  // save request id to REQUEST_TO_USER

  const encryptedForMeRecipientPublicKey = await SEA.encrypt(
    recipientPublicKey,
    mySecret
  )

  // This needs to come before the write to sent requests. Because that write
  // triggers Jobs.onAcceptedRequests and it in turn reads from request-to-user
  // This also triggers Events.onSimplerSentRequests
  await new Promise((res, rej) => {
    user
      .get(Key.REQUEST_TO_USER)
      .get(newHandshakeRequestID)
      .put(encryptedForMeRecipientPublicKey, ack => {
        if (ack.err) {
          rej(
            new Error(
              `Error saving recipient public key to request to user: ${ack.err}`
            )
          )
        } else {
          res()
        }
      })
  })

  /**
   * @type {StoredReq}
   */
  const storedReq = {
    sentReqID: await SEA.encrypt(newHandshakeRequestID, mySecret),
    recipientPub: encryptedForMeRecipientPublicKey,
    handshakeAddress: await SEA.encrypt(currentHandshakeAddress, mySecret),
    timestamp
  }

  await new Promise((res, rej) => {
    user.get(Key.STORED_REQS).set(storedReq, ack => {
      if (ack.err) {
        rej(
          new Error(
            `Error saving newly created request to sent requests: ${ack.err}`
          )
        )
      } else {
        res()
      }
    })
  })
}

/**
 * @param {string} recipientPublicKey
 * @param {string} body
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const sendMessage = async (recipientPublicKey, body, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  if (typeof recipientPublicKey !== 'string') {
    throw new TypeError(
      `expected recipientPublicKey to be an string, but instead got: ${typeof recipientPublicKey}`
    )
  }

  if (recipientPublicKey.length === 0) {
    throw new TypeError(
      'expected recipientPublicKey to be an string of length greater than zero'
    )
  }

  if (typeof body !== 'string') {
    throw new TypeError(
      `expected message to be an string, instead got: ${typeof body}`
    )
  }

  if (body.length === 0) {
    throw new TypeError(
      'expected message to be an string of length greater than zero'
    )
  }

  const outgoingID = await Utils.recipientToOutgoingID(
    recipientPublicKey,
    user,
    SEA
  )

  if (outgoingID === null) {
    throw new Error(
      `Could not fetch an outgoing id for user: ${recipientPublicKey}`
    )
  }

  const recipientEpub = await Utils.pubToEpub(recipientPublicKey)
  const ourSecret = await SEA.secret(recipientEpub, user._.sea)
  if (typeof ourSecret !== 'string') {
    throw new TypeError("sendMessage() -> typeof ourSecret !== 'string'")
  }
  const encryptedBody = await SEA.encrypt(body, ourSecret)

  const newMessage = {
    body: encryptedBody,
    timestamp: Date.now()
  }

  return new Promise((res, rej) => {
    user
      .get(Key.OUTGOINGS)
      .get(outgoingID)
      .get(Key.MESSAGES)
      .set(newMessage, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })
}

/**
 * @param {string} recipientPub
 * @param {string} msgID
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const deleteMessage = async (recipientPub, msgID, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  if (typeof recipientPub !== 'string') {
    throw new TypeError(
      `expected recipientPublicKey to be an string, but instead got: ${typeof recipientPub}`
    )
  }

  if (recipientPub.length === 0) {
    throw new TypeError(
      'expected recipientPublicKey to be an string of length greater than zero'
    )
  }

  if (typeof msgID !== 'string') {
    throw new TypeError(
      `expected msgID to be an string, instead got: ${typeof msgID}`
    )
  }

  if (msgID.length === 0) {
    throw new TypeError(
      'expected msgID to be an string of length greater than zero'
    )
  }

  const outgoingID = await Utils.recipientToOutgoingID(recipientPub, user, SEA)

  if (outgoingID === null) {
    throw new Error(`Could not fetch an outgoing id for user: ${recipientPub}`)
  }

  return new Promise((res, rej) => {
    user
      .get(Key.OUTGOINGS)
      .get(outgoingID)
      .get(Key.MESSAGES)
      .get(msgID)
      .put(null, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })
}

/**
 * @param {string|null} avatar
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if avatar is not an string or an empty string.
 * @returns {Promise<void>}
 */
const setAvatar = (avatar, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof avatar === 'string' && avatar.length === 0) {
      throw new TypeError(
        "'avatar' must be an string and have length greater than one or be null"
      )
    }

    if (typeof avatar !== 'string' && avatar !== null) {
      throw new TypeError(
        "'avatar' must be an string and have length greater than one or be null"
      )
    }

    user
      .get(Key.PROFILE)
      .get(Key.AVATAR)
      .put(avatar, ack => {
        if (ack.err) {
          reject(new Error(ack.err))
        } else {
          resolve()
        }
      })
  })

/**
 * @param {string} displayName
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if displayName is not an string or an empty
 * string.
 * @returns {Promise<void>}
 */
const setDisplayName = (displayName, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof displayName !== 'string') {
      throw new TypeError()
    }

    if (displayName.length === 0) {
      throw new TypeError()
    }

    user
      .get(Key.PROFILE)
      .get(Key.DISPLAY_NAME)
      .put(displayName, ack => {
        if (ack.err) {
          reject(new Error(ack.err))
        } else {
          resolve()
        }
      })
  })

/**
 * @param {string} initialMsg
 * @param {string} recipientPublicKey
 * @param {GUNNode} gun
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @throws {Error|TypeError}
 * @returns {Promise<void>}
 */
const sendHRWithInitialMsg = async (
  initialMsg,
  recipientPublicKey,
  gun,
  user,
  SEA
) => {
  /** @type {boolean} */
  const alreadyHandshaked = await Utils.tryAndWait(
    (_, user) =>
      new Promise((res, rej) => {
        user
          .get(Key.USER_TO_INCOMING)
          .get(recipientPublicKey)
          .once(inc => {
            if (typeof inc !== 'string') {
              res(false)
            } else if (inc.length === 0) {
              rej(
                new Error(
                  `sendHRWithInitialMsg()-> obtained encryptedIncomingId from user-to-incoming an string but of length 0`
                )
              )
            } else {
              res(true)
            }
          })
      })
  )

  if (!alreadyHandshaked) {
    await sendHandshakeRequest(recipientPublicKey, gun, user, SEA)
  }

  await sendMessage(recipientPublicKey, initialMsg, user, SEA)
}

module.exports = {
  INITIAL_MSG,
  __createOutgoingFeed,
  acceptRequest,
  authenticate,
  blacklist,
  generateHandshakeAddress,
  sendHandshakeRequest,
  deleteMessage,
  sendMessage,
  sendHRWithInitialMsg,
  setAvatar,
  setDisplayName
}
