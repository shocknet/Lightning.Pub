/** @format */
const { Schema, Utils: CommonUtils } = require('shock-common')

const Key = require('../key')
const Utils = require('../utils')

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
