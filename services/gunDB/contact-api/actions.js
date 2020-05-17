/**
 * @format
 */
const uuidv1 = require('uuid/v1')
const logger = require('winston')
const { Constants, Schema } = require('shock-common')

const { ErrorCode } = Constants

const LightningServices = require('../../../utils/lightningServices')

const Getters = require('./getters')
const Key = require('./key')
const Utils = require('./utils')

/**
 * @typedef {import('./SimpleGUN').GUNNode} GUNNode
 * @typedef {import('./SimpleGUN').ISEA} ISEA
 * @typedef {import('./SimpleGUN').UserGUNNode} UserGUNNode
 * @typedef {import('shock-common').Schema.HandshakeRequest} HandshakeRequest
 * @typedef {import('shock-common').Schema.StoredRequest} StoredReq
 * @typedef {import('shock-common').Schema.Message} Message
 * @typedef {import('shock-common').Schema.Outgoing} Outgoing
 * @typedef {import('shock-common').Schema.PartialOutgoing} PartialOutgoing
 * @typedef {import('shock-common').Schema.Order} Order
 * @typedef {import('./SimpleGUN').Ack} Ack
 */

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

  const mySecret = require('../Mediator').getMySecret()
  const encryptedForMeRecipientPub = await SEA.encrypt(withPublicKey, mySecret)
  const ourSecret = await SEA.secret(
    await Utils.pubToEpub(withPublicKey),
    user._.sea
  )

  const maybeOutgoingID = await Utils.recipientToOutgoingID(withPublicKey)

  let outgoingFeedID = ''

  // if there was no stored outgoing, create an outgoing feed
  if (typeof maybeOutgoingID !== 'string') {
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

    /** @type {Message} */
    const initialMsg = {
      body: await SEA.encrypt(Constants.Misc.INITIAL_MSG, ourSecret),
      timestamp: Date.now()
    }

    await new Promise((res, rej) => {
      user
        .get(Key.OUTGOINGS)
        .get(newOutgoingFeedID)
        .get(Key.MESSAGES)
        .set(initialMsg, ack => {
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
    outgoingFeedID = maybeOutgoingID
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

    if (!Schema.isHandshakeRequest(hr)) {
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

  const mySecret = require('../Mediator').getMySecret()
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
 * @returns {Promise<void>}
 */
const generateHandshakeAddress = async () => {
  const gun = require('../Mediator').getGun()
  const user = require('../Mediator').getUser()

  const address = uuidv1()

  await new Promise((res, rej) => {
    user.get(Key.CURRENT_HANDSHAKE_ADDRESS).put(address, ack => {
      if (ack.err) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })

  await new Promise((res, rej) => {
    gun
      .get(Key.HANDSHAKE_NODES)
      .get(address)
      .put({ unused: 0 }, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })
}

/**
 *
 * @param {string} pub
 * @throws {Error}
 * @returns {Promise<void>}
 */
const cleanup = async pub => {
  const user = require('../Mediator').getUser()

  const outGoingID = await Utils.recipientToOutgoingID(pub)

  await new Promise((res, rej) => {
    user
      .get(Key.USER_TO_INCOMING)
      .get(pub)
      .put(null, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

  await new Promise((res, rej) => {
    user
      .get(Key.RECIPIENT_TO_OUTGOING)
      .get(pub)
      .put(null, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

  await new Promise((res, rej) => {
    user
      .get(Key.USER_TO_LAST_REQUEST_SENT)
      .get(pub)
      .put(null, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

  if (outGoingID) {
    await new Promise((res, rej) => {
      user
        .get(Key.OUTGOINGS)
        .get(outGoingID)
        .put(null, ack => {
          if (ack.err) {
            rej(new Error(ack.err))
          } else {
            res()
          }
        })
    })
  }
}

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

  await cleanup(recipientPublicKey)

  if (typeof recipientPublicKey !== 'string') {
    throw new TypeError(
      `recipientPublicKey is not string, got: ${typeof recipientPublicKey}`
    )
  }

  if (recipientPublicKey.length === 0) {
    throw new TypeError('recipientPublicKey is an string of length 0')
  }

  if (recipientPublicKey === user.is.pub) {
    throw new Error('Do not send a request to yourself')
  }

  logger.info('sendHR() -> before recipientEpub')

  /** @type {string} */
  const recipientEpub = await Utils.pubToEpub(recipientPublicKey)

  logger.info('sendHR() -> before mySecret')

  const mySecret = require('../Mediator').getMySecret()
  logger.info('sendHR() -> before ourSecret')
  const ourSecret = await SEA.secret(recipientEpub, user._.sea)

  // check if successful handshake is present

  logger.info('sendHR() -> before alreadyHandshaked')

  /** @type {boolean} */
  const alreadyHandshaked = await Utils.successfulHandshakeAlreadyExists(
    recipientPublicKey
  )

  if (alreadyHandshaked) {
    throw new Error(ErrorCode.ALREADY_HANDSHAKED)
  }

  logger.info('sendHR() -> before maybeLastRequestIDSentToUser')

  // check that we have already sent a request to this user, on his current
  // handshake node
  const maybeLastRequestIDSentToUser = await Utils.tryAndWait((_, user) =>
    user
      .get(Key.USER_TO_LAST_REQUEST_SENT)
      .get(recipientPublicKey)
      .then()
  )

  logger.info('sendHR() -> before currentHandshakeAddress')

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

    logger.info('sendHR() -> before alreadyContactedOnCurrHandshakeNode')

    const hrInHandshakeNode = await Utils.tryAndWait(
      gun =>
        new Promise(res => {
          gun
            .get(Key.HANDSHAKE_NODES)
            .get(currentHandshakeAddress)
            .get(lastRequestIDSentToUser)
            .once(data => {
              res(data)
            })
        }),
      // force retry on undefined in case the undefined was a false negative
      v => typeof v === 'undefined'
    )

    const alreadyContactedOnCurrHandshakeNode =
      typeof hrInHandshakeNode !== 'undefined'

    if (alreadyContactedOnCurrHandshakeNode) {
      throw new Error(ErrorCode.ALREADY_REQUESTED_HANDSHAKE)
    }
  }

  logger.info('sendHR() -> before __createOutgoingFeed')

  const outgoingFeedID = await __createOutgoingFeed(
    recipientPublicKey,
    user,
    SEA
  )

  logger.info('sendHR() -> before encryptedForUsOutgoingFeedID')

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

  const encryptedForMeRecipientPublicKey = await SEA.encrypt(
    recipientPublicKey,
    mySecret
  )

  logger.info('sendHR() -> before newHandshakeRequestID')
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

  // This needs to come before the write to sent requests. Because that write
  // triggers Jobs.onAcceptedRequests and it in turn reads from request-to-user

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
 * Returns the message id.
 * @param {string} recipientPublicKey
 * @param {string} body
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<string>} The message id.
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

  const outgoingID = await Utils.recipientToOutgoingID(recipientPublicKey)

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
    const msgNode = user
      .get(Key.OUTGOINGS)
      .get(outgoingID)
      .get(Key.MESSAGES)
      .set(newMessage, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res(msgNode._.get)
        }
      })
  })
}

/**
 * @param {string} recipientPub
 * @param {string} msgID
 * @param {UserGUNNode} user
 * @returns {Promise<void>}
 */
const deleteMessage = async (recipientPub, msgID, user) => {
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

  const outgoingID = await Utils.recipientToOutgoingID(recipientPub)

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

/**
 * Returns the preimage corresponding to the payment.
 * @param {string} to
 * @param {number} amount
 * @param {string} memo
 * @throws {Error} If no response in less than 20 seconds from the recipient, or
 * lightning cannot find a route for the payment.
 * @returns {Promise<string>} The payment's preimage.
 */
const sendPayment = async (to, amount, memo) => {
  try {
    const SEA = require('../Mediator').mySEA
    const getUser = () => require('../Mediator').getUser()
    const recipientEpub = await Utils.pubToEpub(to)
    const ourSecret = await SEA.secret(recipientEpub, getUser()._.sea)

    if (amount < 1) {
      throw new RangeError('Amount must be at least 1 sat.')
    }

    const currOrderAddress = await Getters.currentOrderAddress(to)

    logger.info('sendPayment() -> will now create order:')

    /** @type {Order} */
    const order = {
      amount: amount.toString(),
      from: getUser()._.sea.pub,
      memo: memo || 'no memo',
      timestamp: Date.now()
    }

    logger.info(JSON.stringify(order))

    /* eslint-disable require-atomic-updates */
    const [encMemo, encAmount] = await Promise.all([
      SEA.encrypt(order.memo, ourSecret),
      SEA.encrypt(order.amount, ourSecret)
    ])

    order.memo = encMemo
    order.amount = encAmount
    order.timestamp = Date.now() // most up to date timestamp
    logger.info(`sendPayment() -> encrypted order: ${JSON.stringify(order)}`)

    /* eslint-enable require-atomic-updates */

    logger.info(
      `sendPayment() -> will now place order into address: ${currOrderAddress} for PK: ${to}`
    )

    /** @type {string} */
    const orderID = await new Promise((res, rej) => {
      const ord = require('../Mediator')
        .getGun()
        .get(Key.ORDER_NODES)
        .get(currOrderAddress)
        .set(order, ack => {
          if (ack.err) {
            rej(
              new Error(
                `Error writing order to order node: ${currOrderAddress} for pub: ${to}: ${ack.err}`
              )
            )
          } else {
            res(ord._.get)
          }
        })
    })

    if (typeof orderID !== 'string') {
      const msg = `orderID returned by gun not an string, got: ${JSON.stringify(
        orderID
      )}`
      throw new Error(msg)
    }

    /** @type {ReturnType<typeof setTimeout>} */
    // eslint-disable-next-line init-declarations
    let timeoutID

    const onMethod = new Promise(res => {
      require('../Mediator')
        .getGun()
        .user(to)
        .get(Key.ORDER_TO_RESPONSE)
        .get(orderID)
        .on(inv => {
          if (typeof inv === 'string') {
            res(inv)
          }
        })
    })

    const freshGunMethod = Utils.tryAndWait(
      gun =>
        gun
          .user(to)
          .get(Key.ORDER_TO_RESPONSE)
          .get(orderID)
          .then(),
      v => typeof v === 'undefined'
    )

    /**
     * @type {import('shock-common').Schema.OrderResponse}
     */
    const encryptedOrderRes = await Promise.race([
      Promise.race([onMethod, freshGunMethod]).then(v => {
        clearTimeout(timeoutID)
        return v
      }),

      new Promise((_, rej) => {
        setTimeout(() => {
          rej(new Error(ErrorCode.ORDER_NOT_ANSWERED_IN_TIME))
        }, 20000)
      })
    ])

    if (!Schema.isOrderResponse(encryptedOrderRes)) {
      throw new Error(
        'received response not an OrderResponse, instead got: ' +
          JSON.stringify(encryptedOrderRes)
      )
    }

    /** @type {import('shock-common').Schema.OrderResponse} */
    const orderResponse = {
      response: await SEA.decrypt(encryptedOrderRes.response, ourSecret),
      type: encryptedOrderRes.type
    }

    logger.info('decoded orderResponse: ' + JSON.stringify(orderResponse))

    if (orderResponse.type === 'err') {
      throw new Error(orderResponse.response)
    }

    const {
      services: { lightning }
    } = LightningServices

    /**
     * @typedef {object} SendErr
     * @prop {string} details
     */

    /**
     * Partial
     * https://api.lightning.community/#grpc-response-sendresponse-2
     * @typedef {object} SendResponse
     * @prop {string|null} payment_error
     * @prop {any[]|null} payment_route
     * @prop {string} payment_preimage
     */

    logger.info('Will now send payment through lightning')

    const sendPaymentSyncArgs = {
      /** @type {string} */
      payment_request: orderResponse.response
    }

    /** @type {string} */
    const preimage = await new Promise((resolve, rej) => {
      lightning.sendPaymentSync(sendPaymentSyncArgs, (
        /** @type {SendErr=} */ err,
        /** @type {SendResponse} */ res
      ) => {
        if (err) {
          rej(new Error(err.details))
        } else if (res) {
          if (res.payment_error) {
            rej(
              new Error(
                `sendPaymentSync error response: ${JSON.stringify(res)}`
              )
            )
          } else if (!res.payment_route || !res.payment_preimage) {
            rej(
              new Error(
                `sendPaymentSync no payment route response or preimage: ${JSON.stringify(
                  res
                )}`
              )
            )
          } else {
            resolve(res.payment_preimage)
          }
        } else {
          rej(new Error('no error or response received from sendPaymentSync'))
        }
      })
    })

    if (Utils.successfulHandshakeAlreadyExists(to)) {
      await sendMessage(
        to,
        Schema.encodeSpontaneousPayment(amount, memo || 'no memo', preimage),
        require('../Mediator').getUser(),
        require('../Mediator').mySEA
      )
    }

    return preimage
  } catch (e) {
    logger.error('Error inside sendPayment()')
    logger.error(e)
    throw e
  }
}

/**
 * @param {UserGUNNode} user
 * @returns {Promise<void>}
 */
const generateOrderAddress = user =>
  new Promise((res, rej) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    const address = uuidv1()

    user.get(Key.CURRENT_ORDER_ADDRESS).put(address, ack => {
      if (ack.err) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })

/**
 * @param {string|null} bio
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if avatar is not an string or an empty string.
 * @returns {Promise<void>}
 */
const setBio = (bio, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof bio === 'string' && bio.length === 0) {
      throw new TypeError(
        "'bio' must be an string and have length greater than one or be null"
      )
    }

    if (typeof bio !== 'string' && bio !== null) {
      throw new TypeError(
        "'bio' must be an string and have length greater than one or be null"
      )
    }

    user.get(Key.BIO).put(bio, ack => {
      if (ack.err) {
        reject(new Error(ack.err))
      } else {
        resolve()
      }
    })
  })

/**
 * @param {string[]} mnemonicPhrase
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const saveSeedBackup = async (mnemonicPhrase, user, SEA) => {
  if (
    !Array.isArray(mnemonicPhrase) ||
    mnemonicPhrase.some(word => typeof word !== 'string') ||
    mnemonicPhrase.length === 0
  ) {
    throw new TypeError('expected mnemonicPhrase to be an string array')
  }

  const mySecret = require('../Mediator').getMySecret()
  const encryptedSeed = await SEA.encrypt(mnemonicPhrase.join(' '), mySecret)

  return new Promise((res, rej) => {
    user.get(Key.SEED_BACKUP).put(encryptedSeed, ack => {
      if (ack.err) {
        rej(ack.err)
      } else {
        res()
      }
    })
  })
}

/**
 * @param {string} pub
 * @returns {Promise<void>}
 */
const disconnect = async pub => {
  if (!(await Utils.successfulHandshakeAlreadyExists(pub))) {
    throw new Error('No handshake exists for this pub')
  }

  await cleanup(pub)

  await generateHandshakeAddress()
}

/**
 * @returns {Promise<void>}
 */
const setLastSeenApp = () =>
  new Promise((res, rej) => {
    require('../Mediator')
      .getUser()
      .get(Key.LAST_SEEN_APP)
      .put(Date.now(), ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

module.exports = {
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
  setDisplayName,
  sendPayment,
  generateOrderAddress,
  setBio,
  saveSeedBackup,
  disconnect,
  setLastSeenApp
}
