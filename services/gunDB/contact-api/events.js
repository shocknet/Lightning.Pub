/**
 * @prettier
 */
const debounce = require('lodash/debounce')

const Actions = require('./actions')
const ErrorCode = require('./errorCode')
const Key = require('./key')
const Schema = require('./schema')
const Streams = require('./streams')
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
 * @param {(userToIncoming: Record<string, string>) => void} cb
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
  const userToIncoming = {}

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new TypeError("__onUserToIncoming() -> typeof mySecret !== 'string'")
  }

  user
    .get(Key.USER_TO_INCOMING)
    .map()
    .on(async (encryptedIncomingID, userPub) => {
      if (typeof encryptedIncomingID !== 'string') {
        if (encryptedIncomingID === null) {
          // on disconnect
          delete userToIncoming[userPub]
        } else {
          console.error(
            'got a non string non null value inside user to incoming'
          )
        }
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

      userToIncoming[userPub] = incomingID

      callb(userToIncoming)
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
 * @typedef {Record<string, Outgoing|null>} Outgoings
 * @typedef {(outgoings: Outgoings) => void} OutgoingsListener
 */

/**
 * @type {Outgoings}
 */
let currentOutgoings = {}

/**
 * @type {Outgoings}
 */
let encryptedOutgoings = {}

/** @type {Set<OutgoingsListener>} */
const outgoingsListeners = new Set()

const notifyOutgoingsListeners = () => {
  outgoingsListeners.forEach(l => l(currentOutgoings))
}

/** @type {UserGUNNode|null} */
let lastUserWithListener = null

const processOutgoings = async () => {
  const outs = encryptedOutgoings
  encryptedOutgoings = {}
  const mySecret = await Utils.mySecret()
  const SEA = require('../Mediator').mySEA
  const user = require('../Mediator').getUser()
  await Utils.asyncForEach(Object.entries(outs), async ([id, out]) => {
    if (out === null) {
      currentOutgoings[id] = null
      return
    }

    if (!Schema.isPartialOutgoing(out)) {
      // incomplete data
      return
    }

    if (typeof currentOutgoings[id] === 'undefined') {
      // We disable this rule because we are awaiting the result of the whole
      // for each AND each callback looks only at one single ID
      // eslint-disable-next-line require-atomic-updates
      currentOutgoings[id] = {
        messages: {},
        with: await SEA.decrypt(out.with, mySecret)
      }
    }

    const currentOut = currentOutgoings[id]
    if (currentOut === null) {
      return
    }

    // on each open() only "messages" should change, not "with"
    // also messages are non-nullable and non-editable

    const ourSecret = await SEA.secret(
      await Utils.pubToEpub(currentOut.with),
      user._.sea
    )

    await Utils.asyncForEach(
      Object.entries(out.messages),
      async ([msgID, msg]) => {
        if (!Schema.isMessage(msg)) {
          // incomplete data
          return
        }
        if (!currentOut.messages[msgID]) {
          let decryptedBody = ''
          if (msg.body === Actions.INITIAL_MSG) {
            decryptedBody = Actions.INITIAL_MSG
          } else {
            decryptedBody = await SEA.decrypt(msg.body, ourSecret)
          }
          // each callback only looks at one particular msgID
          // eslint-disable-next-line require-atomic-updates
          currentOut.messages[msgID] = {
            body: decryptedBody,
            timestamp: msg.timestamp
          }
        }
      }
    )
  })
  notifyOutgoingsListeners()
}

/**
 * @param {OutgoingsListener} cb
 * @returns {() => void}
 */
const onOutgoing = cb => {
  outgoingsListeners.add(cb)
  cb(currentOutgoings)

  const currentUser = require('../Mediator').getUser()

  if (lastUserWithListener !== currentUser) {
    // in case user changed gun alias
    currentOutgoings = {}
    encryptedOutgoings = {}
    lastUserWithListener = currentUser

    currentUser.get(Key.OUTGOINGS).open(data => {
      // deactivate this listener when user changes
      if (lastUserWithListener !== require('../Mediator').getUser()) {
        return
      }
      // @ts-ignore Let's skip schema checks for perf reasons
      encryptedOutgoings = data
      processOutgoings()
    })
  }

  return () => {
    outgoingsListeners.delete(cb)
  }
}
////////////////////////////////////////////////////////////////////////////////
/** @type {Outgoings} */
let outgoings = {}

/** @type {Streams.Avatars} */
let pubToAvatar = {}

/** @type {Streams.DisplayNames} */
let pubToDn = {}

/** @type {Streams.Incomings} */
let pubToIncoming = {}
/**
 * @typedef {(chats: Chat[]) => void} ChatsListener
 */

/** @type {Chat[]} */
let currentChats = []

/** @type {Set<ChatsListener>} */
const chatsListeners = new Set()

const notifyChatsListeners = () => {
  chatsListeners.forEach(l => l(currentChats))
}

const processChats = () => {
  const existingOutgoings = /** @type {[string, Outgoing][]} */ (Object.entries(
    outgoings
  ).filter(([_, o]) => o !== null))

  /** @type {Chat[]} */
  const chats = []

  for (const [outID, out] of existingOutgoings) {
    /** @type {ChatMessage[]} */
    let msgs = Object.entries(out.messages).map(([mid, m]) => ({
      id: mid,
      outgoing: true,
      body: m.body,
      timestamp: m.timestamp
    }))

    const incoming = pubToIncoming[out.with]

    if (Array.isArray(incoming)) {
      msgs = [...msgs, ...incoming]
    }

    /** @type {Chat} */
    const chat = {
      recipientPublicKey: out.with,
      didDisconnect: incoming === null,
      id: out.with + outID,
      messages: msgs,
      recipientAvatar: pubToAvatar[out.with] || null,
      recipientDisplayName: pubToDn[out.with] || null
    }

    chats.push(chat)

    // eslint-disable-next-line no-empty-function
    Streams.onAvatar(() => {}, out.with)
    // eslint-disable-next-line no-empty-function
    Streams.onDisplayName(() => {}, out.with)
  }

  currentChats = chats.filter(c => c.messages.length > 0)
  notifyChatsListeners()
}

/**
 * Massages all of the more primitive data structures into a more manageable
 * 'Chat' paradigm.
 * @param {ChatsListener} cb
 * @returns {() => void}
 */
const onChats = cb => {
  chatsListeners.add(cb)
  cb(currentChats)

  onOutgoing(outs => {
    outgoings = outs
    processChats()
  })

  Streams.onAvatar(pta => {
    pubToAvatar = pta
    processChats()
  })
  Streams.onDisplayName(ptd => {
    pubToDn = ptd
    processChats()
  })
  Streams.onIncoming(pti => {
    pubToIncoming = pti
    processChats()
  })

  return () => {
    chatsListeners.delete(cb)
  }
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
      .on((incomingID, userPK) => {
        const disconnected = incomingID === null
        if (disconnected) {
          requestorsAlreadyAccepted.delete(userPK)
        } else {
          requestorsAlreadyAccepted.add(userPK)
        }

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

/** @type {string|null} */
let currentBio = null

/**
 * @param {(bio: string|null) => void} cb
 * @param {UserGUNNode} user Pass only for testing purposes.
 * @throws {Error} If user hasn't been auth.
 * @returns {void}
 */
const onBio = (cb, user) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)
  // Initial value if avvatar is undefined in gun
  callb(currentBio)

  user.get(Key.BIO).on(bio => {
    if (typeof bio === 'string' || bio === null) {
      currentBio = bio
      callb(bio)
    }
  })
}

/** @type {string|null} */
let currentSeedBackup = null

/**
 * @param {(seedBackup: string|null) => void} cb
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @throws {Error} If user hasn't been auth.
 * @returns {Promise<void>}
 */
const onSeedBackup = async (cb, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)
  callb(currentSeedBackup)

  user.get(Key.SEED_BACKUP).on(async seedBackup => {
    if (typeof seedBackup === 'string') {
      currentSeedBackup = await SEA.decrypt(seedBackup, mySecret)
      callb(currentSeedBackup)
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
  onSimplerSentRequests,
  onBio,
  onSeedBackup
}
