/** @format */
const { Schema, Utils: CommonUtils } = require('shock-common')

const Key = require('../key')
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
 * @typedef {import('shock-common').Schema.StoredRequest} StoredRequest
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
  const finalReqs = await CommonUtils.asyncMap(ereqs, async er => {
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
          //@ts-ignore
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

  onPubToIncoming: require('./pubToIncoming').onPubToIncoming,
  getPubToIncoming: require('./pubToIncoming').getPubToIncoming,
  setPubToIncoming: require('./pubToIncoming').setPubToIncoming,

  onPubToFeed: require('./pubToFeed').onPubToFeed,
  getPubToFeed: require('./pubToFeed').getPubToFeed,

  onStoredReqs,
  getStoredReqs,
  onAddresses: require('./addresses').onAddresses,
  getAddresses: require('./addresses').getAddresses,
  onLastSentReqIDs: require('./lastSentReqID').onLastSentReqIDs,
  getSentReqIDs: require('./lastSentReqID').getSentReqIDs,
  PubToIncoming: require('./pubToIncoming'),

  getPubToLastSeenApp: require('./pubToLastSeenApp').getPubToLastSeenApp,
  onPubToLastSeenApp: require('./pubToLastSeenApp').on
}
