/** @format */
const Streams = require('../streams')
/**
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').ListenerData} ListenerData
 * @typedef {import('../schema').HandshakeRequest} HandshakeRequest
 * @typedef {import('../schema').Message} Message
 * @typedef {import('../schema').Outgoing} Outgoing
 * @typedef {import('../schema').PartialOutgoing} PartialOutgoing
 * @typedef {import('../schema').Chat} Chat
 * @typedef {import('../schema').ChatMessage} ChatMessage
 * @typedef {import('../schema').SimpleSentRequest} SimpleSentRequest
 * @typedef {import('../schema').SimpleReceivedRequest} SimpleReceivedRequest
 */

/**
 * @typedef {(chats: SimpleSentRequest[]) => void} Listener
 */

/** @type {Set<Listener>} */
const listeners = new Set()

/** @type {SimpleSentRequest[]} */
let currentReqs = []

const getCurrentSentReqs = () => currentReqs

const react = () => {
  /** @type {SimpleSentRequest[]} */
  const finalSentReqs = []

  const pubToHAddr = Streams.getAddresses()
  const storedReqs = Streams.getStoredReqs()
  const pubToLastSentReqID = Streams.getSentReqIDs()
  const pubToIncoming = Streams.getPubToIncoming()
  const pubToAvatar = Streams.getPubToAvatar()
  const pubToDN = Streams.getPubToDn()

  console.log(
    `pubToLastSentREqID: ${JSON.stringify(pubToLastSentReqID, null, 4)}`
  )

  for (const storedReq of storedReqs) {
    const { handshakeAddress, recipientPub, sentReqID, timestamp } = storedReq
    const currAddress = pubToHAddr[recipientPub]

    const lastReqID = pubToLastSentReqID[recipientPub]
    const isStale = typeof lastReqID !== 'undefined' && lastReqID !== sentReqID
    const isConnected = typeof pubToIncoming[recipientPub] !== 'undefined'

    if (isStale || isConnected) {
      // eslint-disable-next-line no-continue
      continue
    }

    if (typeof currAddress === 'undefined') {
      // eslint-disable-next-line no-empty-function
      Streams.onAddresses(() => {}, recipientPub)()
    }

    if (typeof pubToAvatar[recipientPub] === 'undefined') {
      // eslint-disable-next-line no-empty-function
      Streams.onAvatar(() => {}, recipientPub)()
    }
    if (typeof pubToDN[recipientPub] === 'undefined') {
      // eslint-disable-next-line no-empty-function
      Streams.onDisplayName(() => {}, recipientPub)()
    }

    finalSentReqs.push({
      id: sentReqID,
      recipientAvatar: pubToAvatar[recipientPub] || null,
      recipientChangedRequestAddress:
        typeof currAddress !== 'undefined' && handshakeAddress !== currAddress,
      recipientDisplayName: pubToDN[recipientPub] || null,
      recipientPublicKey: recipientPub,
      timestamp
    })
  }
  currentReqs = finalSentReqs

  listeners.forEach(l => l(currentReqs))
}

let subbed = false

/**
 * Massages all of the more primitive data structures into a more manageable
 * 'Chat' paradigm.
 * @param {Listener} cb
 * @returns {() => void}
 */
const onSentReqs = cb => {
  listeners.add(cb)

  if (!subbed) {
    Streams.onAddresses(react)
    Streams.onStoredReqs(react)
    Streams.onLastSentReqIDs(react)
    Streams.onIncoming(react)
    Streams.onAvatar(react)
    Streams.onDisplayName(react)

    subbed = true
  }

  cb(currentReqs)

  return () => {
    listeners.delete(cb)
  }
}

module.exports = {
  onSentReqs,
  getCurrentSentReqs
}
