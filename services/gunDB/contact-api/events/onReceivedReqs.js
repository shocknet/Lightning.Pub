/** @format */
const Key = require('../key')
const Schema = require('../schema')
const Streams = require('../streams')
/**
 * @typedef {import('../schema').HandshakeRequest} HandshakeRequest
 * @typedef {import('../schema').SimpleReceivedRequest} SimpleReceivedRequest
 */

/**
 * @typedef {(reqs: SimpleReceivedRequest[]) => void} Listener
 */

/** @type {Set<Listener>} */
const listeners = new Set()

/** @type {SimpleReceivedRequest[]} */
let currentReqs = []

/** @type {string|null} */
let currentAddress = null

/** @type {Record<string, HandshakeRequest>} */
let currentNode = {}

const react = () => {
  /** @type {SimpleReceivedRequest[]} */
  const finalReqs = []
  const pubToIncoming = Streams.getPubToIncoming()
  const pubToAvatar = Streams.getPubToAvatar()
  const pubToDn = Streams.getPubToDn()

  for (const [id, req] of Object.entries(currentNode)) {
    // HERE
    const notAccepted = typeof pubToIncoming[req.from] === 'undefined'

    if (notAccepted) {
      if (typeof pubToAvatar[req.from] === 'undefined') {
        // eslint-disable-next-line no-empty-function
        Streams.onAvatar(() => {}, req.from)()
      }
      if (typeof pubToDn[req.from] === 'undefined') {
        // eslint-disable-next-line no-empty-function
        Streams.onDisplayName(() => {}, req.from)()
      }

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

    Streams.onAvatar(react)
    Streams.onDisplayName(react)
    Streams.onIncoming(react)

    subbed = true
  }

  cb(currentReqs)

  return () => {
    listeners.delete(cb)
  }
}

module.exports = onReceivedReqs
