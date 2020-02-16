/** @format */
const debounce = require('lodash/debounce')

const Key = require('../key')
const Schema = require('../schema')
const Streams = require('../streams')

/**
 * @typedef {Readonly<Schema.SimpleReceivedRequest>} SimpleReceivedRequest
 * @typedef {(reqs: ReadonlyArray<SimpleReceivedRequest>) => void} Listener
 */

/** @type {Set<Listener>} */
const listeners = new Set()

/** @type {string|null} */
let currentAddress = null

/** @type {Record<string, SimpleReceivedRequest>} */
let currReceivedReqsMap = {}

/**
 * Unprocessed requests in current handshake node.
 * @type {Record<string, Schema.HandshakeRequest>}
 */
let currAddressData = {}

/** @returns {SimpleReceivedRequest[]} */
const getReceivedReqs = () => Object.values(currReceivedReqsMap)
/** @param {Record<string, SimpleReceivedRequest>} reqs */
const setReceivedReqsMap = reqs => {
  currReceivedReqsMap = reqs
  listeners.forEach(l => l(getReceivedReqs()))
}

listeners.add(() => {
  console.log(
    `new received reqs: ${JSON.stringify(getReceivedReqs(), null, 4)}`
  )
})

const react = debounce(() => {
  /** @type {Record<string, SimpleReceivedRequest>} */
  const newReceivedReqsMap = {}

  const pubToFeed = Streams.getPubToFeed()
  const pubToAvatar = Streams.getPubToAvatar()
  const pubToDn = Streams.getPubToDn()

  for (const [id, req] of Object.entries(currAddressData)) {
    const inContact = Array.isArray(pubToFeed[req.from])

    if (typeof pubToAvatar[req.from] === 'undefined') {
      // eslint-disable-next-line no-empty-function
      Streams.onAvatar(() => {}, req.from)()
    }
    if (typeof pubToDn[req.from] === 'undefined') {
      // eslint-disable-next-line no-empty-function
      Streams.onDisplayName(() => {}, req.from)()
    }

    if (!inContact) {
      newReceivedReqsMap[req.from] = {
        id,
        requestorAvatar: pubToAvatar[req.from] || null,
        requestorDisplayName: pubToDn[req.from] || null,
        requestorPK: req.from,
        timestamp: req.timestamp
      }
    }
  }

  setReceivedReqsMap(newReceivedReqsMap)
}, 750)

/**
 * @param {string} addr
 * @returns {(data: import('../SimpleGUN').OpenListenerData) => void}
 */
const listenerForAddr = addr => data => {
  // did invalidate
  if (addr !== currentAddress) {
    return
  }

  if (typeof data !== 'object' || data === null) {
    currAddressData = {}
  } else {
    for (const [id, req] of Object.entries(data)) {
      // no need to update them just write them once
      if (Schema.isHandshakeRequest(req) && !currAddressData[id]) {
        currAddressData[id] = req
      }
    }
  }

  console.log('data for address: ' + addr)
  console.log(JSON.stringify(data, null, 4))

  react()
}

let subbed = false

/**
 * @param {Listener} cb
 * @returns {() => void}
 */
const onReceivedReqs = cb => {
  listeners.add(cb)
  cb(getReceivedReqs())

  if (!subbed) {
    require('./index').onCurrentHandshakeAddress(addr => {
      if (currentAddress === addr) {
        return
      }

      currentAddress = addr
      currAddressData = {}
      setReceivedReqsMap({})

      if (typeof addr === 'string') {
        require('../../Mediator')
          .getGun()
          .get(Key.HANDSHAKE_NODES)
          .get(addr)
          .open(listenerForAddr(addr))
      }
    }, require('../../Mediator').getUser())

    Streams.onAvatar(react)
    Streams.onDisplayName(react)
    Streams.onPubToFeed(react)

    subbed = true
  }

  return () => {
    listeners.delete(cb)
  }
}

module.exports = {
  getReceivedReqs,
  onReceivedReqs
}
