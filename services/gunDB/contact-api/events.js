/**
 * @prettier
 */
const debounce = require('lodash/debounce')

const Actions = require('./actions')
const ErrorCode = require('./errorCode')
const Key = require('./key')
const Schema = require('./schema')
const Utils = require('./utils')
const Config = require('../config')
/**
 * @typedef {import('./SimpleGUN').UserGUNNode} UserGUNNode
 * @typedef {import('./SimpleGUN').GUNNode} GUNNode
 * @typedef {import('./SimpleGUN').ISEA} ISEA
 * @typedef {import('./SimpleGUN').ListenerData} ListenerData
 * @typedef {import('./schema').HandshakeRequest} HandshakeRequest
 * @typedef {import('./schema').Message} Message
 * @typedef {import('./schema').Outgoing} Outgoing
 * @typedef {import('./schema').PartialOutgoing} PartialOutgoing
 * @typedef {import('./schema').Chat} Chat
 * @typedef {import('./schema').ChatMessage} ChatMessage
 * @typedef {import('./schema').SimpleSentRequest} SimpleSentRequest
 * @typedef {import('./schema').SimpleReceivedRequest} SimpleReceivedRequest
 */

const DEBOUNCE_WAIT_TIME = 500

/**
 * @param {string} outgoingKey
 * @param {(message: Message, key: string) => void} cb
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const __onOutgoingMessage = async (outgoingKey, cb, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError("typeof mySecret !== 'string'")
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)
  /** @type {string} */
  const encryptedForMeRecipientPublicKey = await Utils.tryAndWait(
    (_, user) =>
      new Promise((res, rej) => {
        user
          .get(Key.OUTGOINGS)
          .get(outgoingKey)
          .get('with')
          .once(erpk => {
            if (typeof erpk !== 'string') {
              rej(
                new TypeError("Expected outgoing.get('with') to be an string.")
              )
            } else if (erpk.length === 0) {
              rej(
                new TypeError(
                  "Expected outgoing.get('with') to be a populated."
                )
              )
            } else {
              res(erpk)
            }
          })
      })
  )

  const recipientPublicKey = await SEA.decrypt(
    encryptedForMeRecipientPublicKey,
    mySecret
  )

  if (typeof recipientPublicKey !== 'string') {
    throw new TypeError(
      "__onOutgoingMessage() -> typeof recipientPublicKey !== 'string'"
    )
  }

  /** @type {string} */
  const recipientEpub = await Utils.pubToEpub(recipientPublicKey)

  const ourSecret = await SEA.secret(recipientEpub, user._.sea)

  if (typeof ourSecret !== 'string') {
    throw new TypeError(
      "__onOutgoingMessage() -> typeof ourSecret !== 'string'"
    )
  }

  user
    .get(Key.OUTGOINGS)
    .get(outgoingKey)
    .get(Key.MESSAGES)
    .map()
    .on(async (msg, key) => {
      if (!Schema.isMessage(msg)) {
        console.warn('non message received: ' + JSON.stringify(msg))
        return
      }

      let { body } = msg

      if (body !== Actions.INITIAL_MSG) {
        const decrypted = await SEA.decrypt(body, ourSecret)

        if (typeof decrypted !== 'string') {
          console.log("__onOutgoingMessage() -> typeof decrypted !== 'string'")
        } else {
          body = decrypted
        }
      }

      callb(
        {
          body,
          timestamp: msg.timestamp
        },
        key
      )
    })
}

/**
 * Maps a sent request ID to the public key of the user it was sent to.
 * @param {(requestToUser: Record<string, string>) => void} cb
 * @param {UserGUNNode} user Pass only for testing purposes.
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const __onSentRequestToUser = async (cb, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  /** @type {Record<string, string>} */
  const requestToUser = {}
  callb(requestToUser)

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError(
      "__onSentRequestToUser() -> typeof mySecret !== 'string'"
    )
  }

  user
    .get(Key.REQUEST_TO_USER)
    .map()
    .on(async (encryptedUserPub, requestID) => {
      if (typeof encryptedUserPub !== 'string') {
        console.error('got a non string value')
        return
      }
      if (encryptedUserPub.length === 0) {
        console.error('got an empty string value')
        return
      }

      const userPub = await SEA.decrypt(encryptedUserPub, mySecret)
      if (typeof userPub !== 'string') {
        console.log(`__onSentRequestToUser() -> typeof userPub !== 'string'`)
        return
      }

      requestToUser[requestID] = userPub
      callb(requestToUser)
    })
}

/**
 * @param {(userToOutgoing: Record<string, string>) => void} cb
 * @param {UserGUNNode} user Pass only for testing purposes.
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const __onUserToIncoming = async (cb, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  /** @type {Record<string, string>} */
  const userToOutgoing = {}

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError("__onUserToIncoming() -> typeof mySecret !== 'string'")
  }

  user
    .get(Key.USER_TO_INCOMING)
    .map()
    .on(async (encryptedIncomingID, userPub) => {
      if (typeof encryptedIncomingID !== 'string') {
        console.error('got a non string value')
        return
      }

      if (encryptedIncomingID.length === 0) {
        console.error('got an empty string value')
        return
      }

      const incomingID = await SEA.decrypt(encryptedIncomingID, mySecret)

      if (typeof incomingID === 'undefined') {
        console.warn('could not decrypt incomingID inside __onUserToIncoming')
        return
      }

      userToOutgoing[userPub] = incomingID

      callb(userToOutgoing)
    })
}

/**
 * @param {(avatar: string|null) => void} cb
 * @param {UserGUNNode} user Pass only for testing purposes.
 * @throws {Error} If user hasn't been auth.
 * @returns {void}
 */
const onAvatar = (cb, user) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)
  // Initial value if avvatar is undefined in gun
  callb(null)

  user
    .get(Key.PROFILE)
    .get(Key.AVATAR)
    .on(avatar => {
      if (typeof avatar === 'string' || avatar === null) {
        callb(avatar)
      }
    })
}

/**
 * @param {(blacklist: string[]) => void} cb
 * @param {UserGUNNode} user
 * @returns {void}
 */
const onBlacklist = (cb, user) => {
  /** @type {string[]} */
  const blacklist = []

  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  // Initial value if no items are in blacklist in gun
  callb(blacklist)

  user
    .get(Key.BLACKLIST)
    .map()
    .on(publicKey => {
      if (typeof publicKey === 'string' && publicKey.length > 0) {
        blacklist.push(publicKey)
        callb(blacklist)
      } else {
        console.warn('Invalid public key received for blacklist')
      }
    })
}

/**
 * @param {(currentHandshakeAddress: string|null) => void} cb
 * @param {UserGUNNode} user
 * @returns {void}
 */
const onCurrentHandshakeAddress = (cb, user) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  // If undefined, callback below wont be called. Let's supply null as the
  // initial value.
  callb(null)

  user.get(Key.CURRENT_HANDSHAKE_ADDRESS).on(addr => {
    if (typeof addr !== 'string') {
      console.error('expected handshake address to be an string')

      callb(null)

      return
    }

    callb(addr)
  })
}

/**
 * @param {(displayName: string|null) => void} cb
 * @param {UserGUNNode} user Pass only for testing purposes.
 * @throws {Error} If user hasn't been auth.
 * @returns {void}
 */
const onDisplayName = (cb, user) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  // Initial value if display name is undefined in gun
  callb(null)

  user
    .get(Key.PROFILE)
    .get(Key.DISPLAY_NAME)
    .on(displayName => {
      if (typeof displayName === 'string' || displayName === null) {
        callb(displayName)
      }
    })
}

/**
 * @param {(messages: Record<string, Message>) => void} cb
 * @param {string} userPK Public key of the user from whom the incoming
 * messages will be obtained.
 * @param {string} incomingFeedID ID of the outgoing feed from which the
 * incoming messages will be obtained.
 * @param {GUNNode} gun (Pass only for testing purposes)
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {void}
 */
const onIncomingMessages = (cb, userPK, incomingFeedID, gun, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  const otherUser = gun.user(userPK)

  /**
   * @type {Record<string, Message>}
   */
  const messages = {}

  callb(messages)

  otherUser
    .get(Key.OUTGOINGS)
    .get(incomingFeedID)
    .get(Key.MESSAGES)
    .map()
    .on(async (data, key) => {
      if (!Schema.isMessage(data)) {
        console.warn('non-message received')
        return
      }

      /** @type {string} */
      const recipientEpub = await Utils.pubToEpub(userPK)

      const secret = await SEA.secret(recipientEpub, user._.sea)

      let { body } = data

      if (body !== Actions.INITIAL_MSG) {
        const decrypted = await SEA.decrypt(body, secret)

        if (typeof decrypted !== 'string') {
          console.log("onIncommingMessages() -> typeof decrypted !== 'string'")
          return
        }

        body = decrypted
      }

      messages[key] = {
        body,
        timestamp: data.timestamp
      }

      callb(messages)
    })
}

/**
 *
 * @param {(outgoings: Record<string, Outgoing>) => void} cb
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @param {typeof __onOutgoingMessage} onOutgoingMessage
 */
const onOutgoing = async (
  cb,
  user,
  SEA,
  onOutgoingMessage = __onOutgoingMessage
) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError("onOutgoing() -> typeof mySecret !== 'string'")
  }

  /**
   * @type {Record<string, Outgoing>}
   */
  const outgoings = {}

  callb(outgoings)

  /**
   * @type {string[]}
   */
  const outgoingsWithMessageListeners = []

  user
    .get(Key.OUTGOINGS)
    .map()
    .on(async (data, key) => {
      if (!Schema.isPartialOutgoing(data)) {
        console.warn('not partial outgoing')
        console.warn(JSON.stringify(data))
        return
      }

      const decryptedRecipientPublicKey = await SEA.decrypt(data.with, mySecret)

      if (typeof decryptedRecipientPublicKey !== 'string') {
        console.log(
          "onOutgoing() -> typeof decryptedRecipientPublicKey !== 'string'"
        )
        return
      }

      outgoings[key] = {
        messages: outgoings[key] ? outgoings[key].messages : {},
        with: decryptedRecipientPublicKey
      }

      if (!outgoingsWithMessageListeners.includes(key)) {
        outgoingsWithMessageListeners.push(key)

        onOutgoingMessage(
          key,
          (msg, msgKey) => {
            outgoings[key].messages = {
              ...outgoings[key].messages,
              [msgKey]: msg
            }

            callb(outgoings)
          },
          user,
          SEA
        )
      }

      callb(outgoings)
    })
}

/**
 * Massages all of the more primitive data structures into a more manageable
 * 'Chat' paradigm.
 * @param {(chats: Chat[]) => void} cb
 * @param {GUNNode} gun
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {void}
 */
const onChats = (cb, gun, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  /**
   * @type {Record<string, Chat>}
   */
  const recipientPKToChat = {}

  /**
   * Keep track of the users for which we already set up avatar listeners.
   * @type {string[]}
   */
  const usersWithAvatarListeners = []

  /**
   * Keep track of the users for which we already set up display name listeners.
   * @type {string[]}
   */
  const usersWithDisplayNameListeners = []

  /**
   * Keep track of the user for which we already set up incoming feed listeners.
   * @type {string[]}
   */
  const usersWithIncomingListeners = []

  const _callCB = () => {
    // Only provide chats that have incoming listeners which would be contacts
    // that were actually accepted / are going on
    // Only provide chats that have received at least 1 message from gun
    const chats = Object.values(recipientPKToChat)
      .filter(chat =>
        usersWithIncomingListeners.includes(chat.recipientPublicKey)
      )
      .filter(chat => Schema.isChat(chat))
      .filter(chat => chat.messages.length > 0)

    // in case someone else elsewhere forgets about sorting
    chats.forEach(chat => {
      chat.messages = chat.messages
        .slice(0)
        .sort((msgA, msgB) => msgA.timestamp - msgB.timestamp)
    })

    cb(chats)
  }

  // chats seem to require a bit more of debounce time
  const callCB = debounce(_callCB, DEBOUNCE_WAIT_TIME + 200)

  callCB()

  onOutgoing(
    outgoings => {
      for (const outgoing of Object.values(outgoings)) {
        const recipientPK = outgoing.with

        if (!recipientPKToChat[recipientPK]) {
          recipientPKToChat[recipientPK] = {
            messages: [],
            recipientAvatar: '',
            recipientDisplayName: Utils.defaultName(recipientPK),
            recipientPublicKey: recipientPK
          }
        }

        const { messages } = recipientPKToChat[recipientPK]

        for (const [msgK, msg] of Object.entries(outgoing.messages)) {
          if (!messages.find(_msg => _msg.id === msgK)) {
            messages.push({
              body: msg.body,
              id: msgK,
              outgoing: true,
              timestamp: msg.timestamp
            })
          }
        }
      }

      callCB()
    },
    user,
    SEA
  )

  __onUserToIncoming(
    uti => {
      for (const [recipientPK, incomingFeedID] of Object.entries(uti)) {
        if (!recipientPKToChat[recipientPK]) {
          recipientPKToChat[recipientPK] = {
            messages: [],
            recipientAvatar: '',
            recipientDisplayName: Utils.defaultName(recipientPK),
            recipientPublicKey: recipientPK
          }
        }

        const chat = recipientPKToChat[recipientPK]

        if (!usersWithIncomingListeners.includes(recipientPK)) {
          usersWithIncomingListeners.push(recipientPK)

          onIncomingMessages(
            msgs => {
              for (const [msgK, msg] of Object.entries(msgs)) {
                const { messages } = chat

                if (!messages.find(_msg => _msg.id === msgK)) {
                  messages.push({
                    body: msg.body,
                    id: msgK,
                    outgoing: false,
                    timestamp: msg.timestamp
                  })
                }
              }

              callCB()
            },
            recipientPK,
            incomingFeedID,
            gun,
            user,
            SEA
          )
        }

        if (!usersWithAvatarListeners.includes(recipientPK)) {
          usersWithAvatarListeners.push(recipientPK)

          gun
            .user(recipientPK)
            .get(Key.PROFILE)
            .get(Key.AVATAR)
            .on(avatar => {
              if (typeof avatar === 'string') {
                chat.recipientAvatar = avatar
                callCB()
              }
            })
        }

        if (!usersWithDisplayNameListeners.includes(recipientPK)) {
          usersWithDisplayNameListeners.push(recipientPK)

          gun
            .user(recipientPK)
            .get(Key.PROFILE)
            .get(Key.DISPLAY_NAME)
            .on(displayName => {
              if (typeof displayName === 'string') {
                chat.recipientDisplayName = displayName
                callCB()
              }
            })
        }
      }
    },
    user,
    SEA
  )
}

/**
 *
 * @param {(simpleReceivedRequests: SimpleReceivedRequest[]) => void} cb
 * @param {GUNNode} gun
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {void}
 */
const onSimplerReceivedRequests = (cb, gun, user, SEA) => {
  try {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    /** @type {Record<string, HandshakeRequest>} */
    const idToRequest = {}

    /** @type {string[]} */
    const requestorsWithAvatarListeners = []

    /** @type {string[]} */
    const requestorsWithDisplayNameListeners = []

    /**
     * @type {Partial<Record<string, string|null>>}
     */
    const requestorToAvatar = {}

    /**
     * @type {Partial<Record<string, string|null>>}
     */
    const requestorToDisplayName = {}

    /** @type {Set<string>} */
    const requestorsAlreadyAccepted = new Set()

    /**
     * We cannot call gun.off(), so keep track of the current handshake addres.
     * And only run the listeners for the handshake nodes if they are for the
     * current handshake address node.
     */
    let currentHandshakeAddress = ''

    ////////////////////////////////////////////////////////////////////////////

    const _callCB = async () => {
      try {
        const requestEntries = Object.entries(idToRequest)

        if (Config.SHOW_LOG) {
          console.log('requestorsAlreadyAccepted')
          console.log(requestorsAlreadyAccepted)
          console.log('/requestorsAlreadyAccepted')
        }

        if (Config.SHOW_LOG) {
          console.log('raw requests:')
          console.log(idToRequest)
          console.log('/raw requests')
        }

        // avoid race conditions due to gun's reactive nature.
        const onlyInCurrentHandshakeNode = await Utils.asyncFilter(
          requestEntries,
          async ([id]) => {
            try {
              const HNAddr = await Utils.tryAndWait(async (_, user) => {
                const data = await user
                  .get(Key.CURRENT_HANDSHAKE_ADDRESS)
                  .then()

                if (typeof data !== 'string') {
                  throw new Error('handshake address not an string')
                }

                return data
              })

              const maybeHreq = await Utils.tryAndWait(gun =>
                gun
                  .get(Key.HANDSHAKE_NODES)
                  .get(HNAddr)
                  .get(id)
                  .then()
              )

              return Schema.isHandshakeRequest(maybeHreq)
            } catch (err) {
              console.log(`error for request ID: ${id}`)
              throw err
            }
          }
        )

        if (Config.SHOW_LOG) {
          console.log('onlyInCurrentHandshakeNode')
          console.log(onlyInCurrentHandshakeNode)
          console.log('/onlyInCurrentHandshakeNode')
        }

        // USER-TO-INCOMING (which indicates acceptance of this request) write
        // might not be in there by the time we are looking at these requests.
        // Let's account for this.
        const notAccepted = await Utils.asyncFilter(
          onlyInCurrentHandshakeNode,
          async ([reqID, req]) => {
            try {
              if (requestorsAlreadyAccepted.has(req.from)) {
                return false
              }

              const requestorEpub = await Utils.pubToEpub(req.from)

              const ourSecret = await SEA.secret(requestorEpub, user._.sea)
              if (typeof ourSecret !== 'string') {
                throw new TypeError('typeof ourSecret !== "string"')
              }

              const decryptedResponse = await SEA.decrypt(
                req.response,
                ourSecret
              )

              if (typeof decryptedResponse !== 'string') {
                throw new TypeError('typeof decryptedResponse !== "string"')
              }

              const outfeedID = decryptedResponse

              if (Config.SHOW_LOG) {
                console.log('\n')
                console.log('--------outfeedID----------')
                console.log(outfeedID)
                console.log('------------------')
                console.log('\n')
              }

              const maybeOutfeed = await Utils.tryAndWait(gun =>
                gun
                  .user(req.from)
                  .get(Key.OUTGOINGS)
                  .get(outfeedID)
                  .then()
              )

              if (Config.SHOW_LOG) {
                console.log('\n')
                console.log('--------maybeOutfeed----------')
                console.log(maybeOutfeed)
                console.log('------------------')
                console.log('\n')
              }

              const wasAccepted = Schema.isHandshakeRequest(maybeOutfeed)

              return !wasAccepted
            } catch (err) {
              console.log(`error for request ID: ${reqID}`)
              throw err
            }
          }
        )

        if (Config.SHOW_LOG) {
          console.log('notAccepted')
          console.log(notAccepted)
          console.log('/notAccepted')
        }

        const simpleReceivedReqs = notAccepted.map(([reqID, req]) => {
          try {
            const { from: requestorPub } = req

            /** @type {SimpleReceivedRequest} */
            const simpleReceivedReq = {
              id: reqID,
              requestorAvatar: requestorToAvatar[requestorPub] || null,
              requestorDisplayName:
                requestorToDisplayName[requestorPub] ||
                Utils.defaultName(requestorPub),
              requestorPK: requestorPub,
              response: req.response,
              timestamp: req.timestamp
            }

            return simpleReceivedReq
          } catch (err) {
            console.log(`error for request ID: ${reqID}`)
            throw err
          }
        })

        cb(simpleReceivedReqs)
      } catch (err) {
        console.error(err)
      }
    }

    const callCB = debounce(_callCB, DEBOUNCE_WAIT_TIME)
    callCB()

    user
      .get(Key.USER_TO_INCOMING)
      .map()
      .on((_, userPK) => {
        requestorsAlreadyAccepted.add(userPK)

        callCB()
      })

    ////////////////////////////////////////////////////////////////////////////
    /**
     * @param {string} addr
     * @returns {(req: ListenerData, reqID: string) => void}
     */
    const listenerForAddr = addr => (req, reqID) => {
      try {
        if (addr !== currentHandshakeAddress) {
          console.log(
            'onSimplerReceivedRequests() -> listenerForAddr() -> stale handshake address, quitting'
          )
          return
        }

        if (!Schema.isHandshakeRequest(req)) {
          console.log(
            'onSimplerReceivedRequests() -> listenerForAddr() -> bad handshake request, quitting'
          )
          console.log(req)
          return
        }

        idToRequest[reqID] = req
        callCB()

        if (!requestorsWithAvatarListeners.includes(req.from)) {
          requestorsWithAvatarListeners.push(req.from)

          gun
            .user(req.from)
            .get(Key.PROFILE)
            .get(Key.AVATAR)
            .on(avatar => {
              if (typeof avatar === 'string' || avatar === null) {
                // || handles empty strings
                requestorToAvatar[req.from] = avatar || null

                callCB()
              }
            })
        }

        if (!requestorsWithDisplayNameListeners.includes(req.from)) {
          requestorsWithDisplayNameListeners.push(req.from)

          gun
            .user(req.from)
            .get(Key.PROFILE)
            .get(Key.DISPLAY_NAME)
            .on(displayName => {
              if (typeof displayName === 'string' || displayName === null) {
                // || handles empty strings
                requestorToDisplayName[req.from] = displayName || null

                callCB()
              }
            })
        }
      } catch (err) {
        console.log('onSimplerReceivedRequests() -> listenerForAddr() ->')
        console.log(err)
      }

      callCB()
    }
    ////////////////////////////////////////////////////////////////////////////
    user.get(Key.CURRENT_HANDSHAKE_ADDRESS).on(addr => {
      if (typeof addr !== 'string') {
        throw new TypeError('current handshake address not an string')
      }

      console.log(
        `onSimplerReceivedRequests() -> setting current address to ${addr}`
      )
      currentHandshakeAddress = addr

      gun
        .get(Key.HANDSHAKE_NODES)
        .get(addr)
        .map()
        .on(listenerForAddr(addr))

      callCB()
    })
  } catch (err) {
    console.log(`onSimplerReceivedRequests() -> ${err.message}`)
  }
}

/**
 * @param {(sentRequests: SimpleSentRequest[]) => void} cb
 * @param {GUNNode} gun
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const onSimplerSentRequests = async (cb, gun, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }
  /**
   * @type {Record<string, Schema.StoredRequest>}
   */
  const storedReqs = {}
  /**
   * @type {Partial<Record<string, string|null>>}
   */
  const recipientToAvatar = {}
  /**
   * @type {Partial<Record<string, string|null>>}
   */
  const recipientToDisplayName = {}
  /**
   * @type {Partial<Record<string, string|null>>}
   */
  const recipientToCurrentHandshakeAddress = {}
  /**
   * @type {Record<string, SimpleSentRequest>}
   */
  const simpleSentRequests = {}
  /**
   * Keep track of recipients that already have listeners for their avatars.
   * @type {string[]}
   */
  const recipientsWithAvatarListener = []
  /**
   * Keep track of recipients that already have listeners for their display
   * name.
   * @type {string[]}
   */
  const recipientsWithDisplayNameListener = []
  /**
   * Keep track of recipients that already have listeners for their current
   * handshake node.
   * @type {string[]}
   */
  const recipientsWithCurrentHandshakeAddressListener = []

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)

  if (typeof mySecret !== 'string') {
    throw new TypeError("typeof mySecret !== 'string'")
  }

  const callCB = debounce(async () => {
    try {
      console.log('\n')
      console.log('------simplerSentRequests: rawRequests ------')
      console.log(storedReqs)
      console.log('\n')

      const entries = Object.entries(storedReqs)

      /** @type {Promise<null|SimpleSentRequest>[]} */
      const promises = entries.map(([, storedReq]) =>
        (async () => {
          const recipientPub = await SEA.decrypt(
            storedReq.recipientPub,
            mySecret
          )
          if (typeof recipientPub !== 'string') {
            throw new TypeError()
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

          /** @type {Schema.HandshakeRequest} */
          const sentReq = await Utils.tryAndWait(async gun => {
            const data = await gun
              .get(Key.HANDSHAKE_NODES)
              .get(requestAddress)
              .get(sentReqID)
              .then()

            if (Schema.isHandshakeRequest(data)) {
              return data
            }

            throw new TypeError('sent req not a handshake request')
          })

          const latestReqIDForRecipient = await Utils.recipientPubToLastReqSentID(
            recipientPub
          )

          if (
            await Utils.reqWasAccepted(
              sentReq.response,
              recipientPub,
              user,
              SEA
            )
          ) {
            return null
          }

          if (
            !recipientsWithCurrentHandshakeAddressListener.includes(
              recipientPub
            )
          ) {
            recipientsWithCurrentHandshakeAddressListener.push(recipientPub)

            gun
              .user(recipientPub)
              .get(Key.CURRENT_HANDSHAKE_ADDRESS)
              .on(addr => {
                if (typeof addr !== 'string') {
                  console.log(
                    "onSimplerSentRequests() -> typeof addr !== 'string'"
                  )

                  return
                }

                recipientToCurrentHandshakeAddress[recipientPub] = addr

                callCB()
              })
          }

          if (!recipientsWithAvatarListener.includes(recipientPub)) {
            recipientsWithAvatarListener.push(recipientPub)

            gun
              .user(recipientPub)
              .get(Key.PROFILE)
              .get(Key.AVATAR)
              .on(avatar => {
                if (typeof avatar === 'string' || avatar === null) {
                  recipientToAvatar[recipientPub] = avatar
                  callCB()
                }
              })
          }

          if (!recipientsWithDisplayNameListener.includes(recipientPub)) {
            recipientsWithDisplayNameListener.push(recipientPub)

            gun
              .user(recipientPub)
              .get(Key.PROFILE)
              .get(Key.DISPLAY_NAME)
              .on(displayName => {
                if (typeof displayName === 'string' || displayName === null) {
                  recipientToDisplayName[recipientPub] = displayName
                  callCB()
                }
              })
          }

          const isStaleRequest = latestReqIDForRecipient !== sentReqID

          if (isStaleRequest) {
            return null
          }

          /**
           * @type {SimpleSentRequest}
           */
          const res = {
            id: sentReqID,
            recipientAvatar: recipientToAvatar[recipientPub] || null,
            recipientChangedRequestAddress: false,
            recipientDisplayName:
              recipientToDisplayName[recipientPub] ||
              Utils.defaultName(recipientPub),
            recipientPublicKey: recipientPub,
            timestamp: sentReq.timestamp
          }

          return res
        })()
      )

      const reqsOrNulls = await Promise.all(promises)

      console.log('\n')
      console.log('------simplerSentRequests: reqsOrNulls ------')
      console.log(reqsOrNulls)
      console.log('\n')

      /** @type {SimpleSentRequest[]} */
      // @ts-ignore
      const reqs = reqsOrNulls.filter(item => item !== null)

      for (const req of reqs) {
        simpleSentRequests[req.id] = req
      }
    } catch (err) {
      console.log(`onSimplerSentRequests() -> callCB() -> ${err.message}`)
    } finally {
      cb(Object.values(simpleSentRequests))
    }
  }, DEBOUNCE_WAIT_TIME)

  callCB()

  // force a refresh when a request is accepted
  user.get(Key.USER_TO_INCOMING).on(() => {
    callCB()
  })

  user
    .get(Key.STORED_REQS)
    .map()
    .on((sentRequest, sentRequestID) => {
      try {
        if (!Schema.isStoredRequest(sentRequest)) {
          console.log('\n')
          console.log(
            '------simplerSentRequests: !Schema.isHandshakeRequest(sentRequest) ------'
          )
          console.log(sentRequest)
          console.log('\n')

          return
        }

        storedReqs[sentRequestID] = sentRequest

        callCB()
      } catch (err) {
        console.log(
          `onSimplerSentRequests() -> sentRequestID: ${sentRequestID} -> ${err.message}`
        )
      }
    })
}

module.exports = {
  __onSentRequestToUser,
  __onUserToIncoming,
  onAvatar,
  onBlacklist,
  onCurrentHandshakeAddress,
  onDisplayName,
  onIncomingMessages,
  onOutgoing,
  onChats,
  onSimplerReceivedRequests,
  onSimplerSentRequests
}
