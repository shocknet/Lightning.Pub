/** @format */
const { INITIAL_MSG } = require('../actions')
const Key = require('../key')
const Schema = require('../schema')
const Utils = require('../utils')
/**
 * @typedef {Record<string, string|null|undefined>} Avatars
 * @typedef {(avatars: Avatars) => void} AvatarListener
 */

/** @type {Avatars} */
const pubToAvatar = {}

const getPubToAvatar = () => pubToAvatar

/** @type {Set<AvatarListener>} */
const avatarListeners = new Set()

const notifyAvatarListeners = () => {
  avatarListeners.forEach(l => l(pubToAvatar))
}

/** @type {Set<string>} */
const pubsWithAvatarListeners = new Set()

/**
 * @param {AvatarListener} cb
 * @param {string=} pub
 */
const onAvatar = (cb, pub) => {
  avatarListeners.add(cb)
  cb(pubToAvatar)
  if (pub && pubsWithAvatarListeners.add(pub)) {
    require('../../Mediator')
      .getGun()
      .user(pub)
      .get(Key.PROFILE)
      .get(Key.AVATAR)
      .on(av => {
        if (typeof av === 'string' || av === null) {
          pubToAvatar[pub] = av || null
        } else {
          pubToAvatar[pub] = null
        }
        notifyAvatarListeners()
      })
  }
  return () => {
    avatarListeners.delete(cb)
  }
}

/**
 * @typedef {Record<string, string|null|undefined>} DisplayNames
 * @typedef {(avatars: Avatars) => void} DisplayNameListener
 */

/** @type {DisplayNames} */
const pubToDisplayName = {}

const getPubToDn = () => pubToDisplayName

/** @type {Set<DisplayNameListener>} */
const displayNameListeners = new Set()

const notifyDisplayNameListeners = () => {
  displayNameListeners.forEach(l => l(pubToDisplayName))
}

/** @type {Set<string>} */
const pubsWithDisplayNameListeners = new Set()

/**
 * @param {DisplayNameListener} cb
 * @param {string=} pub
 */
const onDisplayName = (cb, pub) => {
  displayNameListeners.add(cb)
  cb(pubToDisplayName)
  if (pub && pubsWithDisplayNameListeners.add(pub)) {
    require('../../Mediator')
      .getGun()
      .user(pub)
      .get(Key.PROFILE)
      .get(Key.DISPLAY_NAME)
      .on(dn => {
        if (typeof dn === 'string' || dn === null) {
          pubToDisplayName[pub] = dn || null
        } else {
          pubToDisplayName[pub] = null
        }
        notifyDisplayNameListeners()
      })
  }
  return () => {
    displayNameListeners.delete(cb)
  }
}

/**
 * @typedef {import('../schema').ChatMessage[]} Message
 * @typedef {Record<string, Message|null>} Incomings
 * @typedef {(incomings: Incomings) => void} IncomingsListener
 */

/**
 * @type {Incomings}
 */
const pubToIncoming = {}

const getPubToIncoming = () => pubToIncoming

/** @type {Set<IncomingsListener>} */
const incomingsListeners = new Set()

const notifyIncomingsListeners = () => {
  incomingsListeners.forEach(l => l(pubToIncoming))
}

/** @type {Set<string>} */
const pubFeedPairsWithIncomingListeners = new Set()

let subbed = false

/**
 * @param {IncomingsListener} cb
 */
const onIncoming = cb => {
  incomingsListeners.add(cb)

  const user = require('../../Mediator').getUser()
  const SEA = require('../../Mediator').mySEA

  if (!subbed) {
    user.get(Key.USER_TO_INCOMING).open(uti => {
      if (typeof uti !== 'object' || uti === null) {
        return
      }

      Object.entries(uti).forEach(async ([pub, encFeed]) => {
        if (typeof encFeed !== 'string') {
          return
        }
        const ourSecret = await SEA.secret(
          await Utils.pubToEpub(pub),
          user._.sea
        )
        const mySecret = await Utils.mySecret()

        const feed = await SEA.decrypt(encFeed, mySecret)

        if (pubFeedPairsWithIncomingListeners.add(pub + '--' + feed)) {
          require('../../Mediator')
            .getGun()
            .user(pub)
            .get(Key.OUTGOINGS)
            .get(feed)
            .open(async data => {
              if (data === null) {
                pubToIncoming[pub] = null
                return
              }

              if (typeof data !== 'object') {
                return
              }

              if (typeof data.with !== 'string') {
                return
              }

              if (typeof data.messages !== 'object') {
                return
              }

              if (data.messages === null) {
                return
              }

              const msgs = /** @type {[string, Schema.Message][]} */ (Object.entries(
                data.messages
              ).filter(([_, msg]) => Schema.isMessage(msg)))

              // eslint-disable-next-line require-atomic-updates
              pubToIncoming[pub] = await Utils.asyncMap(
                msgs,
                async ([msgid, msg]) => {
                  let decryptedBody = ''

                  if (msg.body === INITIAL_MSG) {
                    decryptedBody = INITIAL_MSG
                  } else {
                    decryptedBody = await SEA.decrypt(msg.body, ourSecret)
                  }

                  /** @type {Schema.ChatMessage} */
                  const finalMsg = {
                    body: decryptedBody,
                    id: msgid,
                    outgoing: false,
                    timestamp: msg.timestamp
                  }

                  return finalMsg
                }
              )

              notifyIncomingsListeners()
            })
        }
      })
    })

    subbed = true
  }

  return () => {
    incomingsListeners.delete(cb)
  }
}

/**
 * @typedef {import('../schema').StoredRequest} StoredRequest
 * @typedef {(reqs: StoredRequest[]) => void} StoredRequestsListener
 */

/** @type {Set<StoredRequestsListener>} */
const storedRequestsListeners = new Set()

/**
 * @type {StoredRequest[]}
 */
let encryptedStoredReqs = []

/**
 * @type {StoredRequest[]}
 */
let currentStoredReqs = []

const getStoredReqs = () => currentStoredReqs

const processStoredReqs = async () => {
  const ereqs = encryptedStoredReqs
  encryptedStoredReqs = []
  const mySecret = await Utils.mySecret()
  const SEA = require('../../Mediator').mySEA
  const finalReqs = await Utils.asyncMap(ereqs, async er => {
    /** @type {StoredRequest} */
    const r = {
      handshakeAddress: await SEA.decrypt(er.handshakeAddress, mySecret),
      recipientPub: await SEA.decrypt(er.recipientPub, mySecret),
      sentReqID: await SEA.decrypt(er.sentReqID, mySecret),
      timestamp: er.timestamp
    }

    return r
  })
  currentStoredReqs = finalReqs
  storedRequestsListeners.forEach(l => l(currentStoredReqs))
}

let storedReqsSubbed = false

/**
 * @param {StoredRequestsListener} cb
 */
const onStoredReqs = cb => {
  storedRequestsListeners.add(cb)

  if (!storedReqsSubbed) {
    require('../../Mediator')
      .getUser()
      .get(Key.STORED_REQS)
      .open(d => {
        if (typeof d === 'object' && d !== null) {
          encryptedStoredReqs = /** @type {StoredRequest[]} */ (Object.values(
            d
          ).filter(i => Schema.isStoredRequest(i)))
        }

        processStoredReqs()
      })

    storedReqsSubbed = true
  }

  cb(currentStoredReqs)

  return () => {
    storedRequestsListeners.delete(cb)
  }
}

module.exports = {
  onAvatar,
  getPubToAvatar,
  onDisplayName,
  getPubToDn,
  onIncoming,
  getPubToIncoming,
  onStoredReqs,
  getStoredReqs,
  onAddresses: require('./addresses').onAddresses,
  getAddresses: require('./addresses').getAddresses,
  onLastSentReqIDs: require('./lastSentReqID').onLastSentReqIDs,
  getSentReqIDs: require('./lastSentReqID').getSentReqIDs
}
