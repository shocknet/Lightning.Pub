/** @format */
const debounce = require('lodash/debounce')
const logger = require('winston')
const size = require('lodash/size')

const Streams = require('../streams')
/**
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').ListenerData} ListenerData
 * @typedef {import('shock-common').Schema.HandshakeRequest} HandshakeRequest
 * @typedef {import('shock-common').Schema.Message} Message
 * @typedef {import('shock-common').Schema.Outgoing} Outgoing
 * @typedef {import('shock-common').Schema.PartialOutgoing} PartialOutgoing
 * @typedef {import('shock-common').Schema.Chat} Chat
 * @typedef {import('shock-common').Schema.ChatMessage} ChatMessage
 * @typedef {import('shock-common').Schema.SimpleSentRequest} SimpleSentRequest
 * @typedef {import('shock-common').Schema.SimpleReceivedRequest} SimpleReceivedRequest
 */

/**
 * @typedef {(chats: SimpleSentRequest[]) => void} Listener
 */

/** @type {Set<Listener>} */
const listeners = new Set()

/** @type {SimpleSentRequest[]} */
let currentReqs = []

listeners.add(() => {
  logger.info(`new sent reqs length: ${size(currentReqs)}`)
})

const getCurrentSentReqs = () => currentReqs

// any time any of the streams we use notifies us that it changed, we fire up
// react()
const react = debounce(() => {
  /** @type {SimpleSentRequest[]} */
  const newReqs = []

  // reactive streams
  // maps a pk to its current handshake address
  const pubToHAddr = Streams.getAddresses()
  // a set or list containing copies of sent requests
  const storedReqs = Streams.getStoredReqs()
  // maps a pk to the last request sent to it (so old stored reqs are invalidated)
  const pubToLastSentReqID = Streams.getSentReqIDs()
  // maps a pk to a feed, messages if subbed and pk is pubbing, null /
  // 'disconnected' otherwise
  const pubToFeed = Streams.getPubToFeed()

  logger.info(`pubToLastSentREqID length: ${size(pubToLastSentReqID)}`)

  for (const storedReq of storedReqs) {
    const { handshakeAddress, recipientPub, sentReqID, timestamp } = storedReq
    const currAddress = pubToHAddr[recipientPub]

    const lastReqID = pubToLastSentReqID[recipientPub]
    // invalidate if this stored request is not the last one sent to this
    // particular pk
    const isStale = typeof lastReqID !== 'undefined' && lastReqID !== sentReqID
    // invalidate if we are in a pub/sub state to this pk (handshake in place)
    const isConnected = Array.isArray(pubToFeed[recipientPub])

    if (isStale || isConnected) {
      // eslint-disable-next-line no-continue
      continue
    }

    // no address for this pk? let's ask the corresponding stream to sub to
    // gun.user(pk).get('currentAddr')
    if (typeof currAddress === 'undefined') {
      // eslint-disable-next-line no-empty-function
      Streams.onAddresses(() => {}, recipientPub)()
    }

    newReqs.push({
      id: sentReqID,
      recipientAvatar: null,
      recipientChangedRequestAddress:
        // if we haven't received the other's user current handshake address,
        // let's assume he hasn't changed it and that this request is still
        // valid
        typeof currAddress !== 'undefined' && handshakeAddress !== currAddress,
      recipientDisplayName: null,
      recipientPublicKey: recipientPub,
      timestamp
    })
  }

  currentReqs = newReqs

  listeners.forEach(l => l(currentReqs))
}, 750)

let subbed = false

/**
 * Massages all of the more primitive data structures into a more manageable
 * 'Chat' paradigm.
 * @param {Listener} cb
 * @returns {() => void}
 */
const onSentReqs = cb => {
  listeners.add(cb)
  cb(currentReqs)

  if (!subbed) {
    Streams.onAddresses(react)
    Streams.onStoredReqs(react)
    Streams.onLastSentReqIDs(react)
    Streams.onPubToFeed(react)

    subbed = true
  }

  return () => {
    listeners.delete(cb)
  }
}

module.exports = {
  onSentReqs,
  getCurrentSentReqs
}
