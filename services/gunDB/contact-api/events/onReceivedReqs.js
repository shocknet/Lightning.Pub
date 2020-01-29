/** @format */
const Key = require('../key')
const Schema = require('../schema')
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
 * @typedef {(chats: SimpleReceivedRequest[]) => void} Listener
 */

const listeners = new Set()

/** @type {Streams.Avatars} */
let pubToAvatar = {}

/** @type {Streams.DisplayNames} */
let pubToDn = {}

/** @type {Streams.Incomings} */
let pubToIncoming = {}

/** @type {SimpleReceivedRequest[]} */
let currentReqs = []

/** @type {string|null} */
let currentAddress = null

/** @type {Record<string, HandshakeRequest>} */
let currentNode = {}

const react = () => {
  /** @type {SimpleReceivedRequest[]} */
  const finalReqs = []

  for (const [id, req] of Object.entries(currentNode)) {
    const notAccepted = typeof pubToIncoming[req.from] === 'undefined'

    if (notAccepted) {
      finalReqs.push({
        id,
        requestorAvatar: pubToAvatar[req.from] || null,
        requestorDisplayName: pubToDn[req.from] || null,
        requestorPK: req.from,
        response: req.response,
        timestamp: req.timestamp
      })
    }
  }

  currentReqs = finalReqs

  listeners.forEach(l => l(currentReqs))
}

/**
 *
 * @param {string} addr
 * @returns {(data: import('../SimpleGUN').OpenListenerData) => void}
 */
const listenerForAddr = addr => data => {
  if (addr !== currentAddress) {
    return
  }

  if (typeof data === 'object' && data !== null) {
    for (const [id, req] of Object.entries(data)) {
      if (!Schema.isHandshakeRequest(req)) {
        return
      }

      currentNode[id] = req
    }

    react()
  }
}

let subbed = false

/**
 * Massages all of the more primitive data structures into a more manageable
 * 'Chat' paradigm.
 * @param {Listener} cb
 * @returns {() => void}
 */
const onReceivedReqs = cb => {
  listeners.add(cb)

  if (!subbed) {
    require('./index').onCurrentHandshakeAddress(addr => {
      if (currentAddress !== addr) {
        currentAddress = addr
        currentNode = {}

        if (typeof addr === 'string') {
          require('../../Mediator')
            .getGun()
            .get(Key.HANDSHAKE_NODES)
            .get(addr)
            .open(listenerForAddr(addr))
        }

        react()
      }
    }, require('../../Mediator').getUser())

    Streams.onAvatar(pta => {
      pubToAvatar = pta
      react()
    })
    Streams.onDisplayName(ptd => {
      pubToDn = ptd
      react()
    })
    Streams.onIncoming(pti => {
      pubToIncoming = pti
      react()
    })

    subbed = true
  }

  cb(currentReqs)

  return () => {
    listeners.delete(cb)
  }
}

module.exports = onReceivedReqs
