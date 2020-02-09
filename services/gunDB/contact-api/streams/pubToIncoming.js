/** @format */
const uuidv1 = require('uuid/v1')
const debounce = require('lodash/debounce')

const { USER_TO_INCOMING } = require('../key')
const { asyncForEach } = require('../utils')
/** @typedef {import('../SimpleGUN').OpenListenerData} OpenListenerData */

/**
 * @typedef {Record<string, string|null|undefined>} PubToIncoming
 */

/** @type {Set<() => void>} */
const listeners = new Set()

/** @type {PubToIncoming} */
let pubToIncoming = {}

const getPubToIncoming = () => pubToIncoming
/**
 * @param {PubToIncoming} pti
 * @returns {void}
 */
const setPubToIncoming = pti => {
  pubToIncoming = pti
  listeners.forEach(l => l())
}

let latestUpdate = uuidv1()

const onOpen = debounce(async uti => {
  const SEA = require('../../Mediator').mySEA
  const mySec = require('../../Mediator').getMySecret()
  const thisUpdate = uuidv1()
  latestUpdate = thisUpdate

  if (typeof uti !== 'object' || uti === null) {
    setPubToIncoming({})
    return
  }

  /** @type {PubToIncoming} */
  const newPubToIncoming = {}

  await asyncForEach(Object.entries(uti), async ([pub, encFeedID]) => {
    if (encFeedID === null) {
      newPubToIncoming[pub] = null
      return
    }

    if (typeof encFeedID === 'string') {
      newPubToIncoming[pub] = await SEA.decrypt(encFeedID, mySec)
    }
  })

  // avoid old data from overwriting new data if decrypting took longer to
  // process for the older open() call than for the newer open() call
  if (latestUpdate === thisUpdate) {
    setPubToIncoming(newPubToIncoming)
  }
}, 750)

let subbed = false

/**
 * @param {() => void} cb
 * @returns {() => void}
 */
const onPubToIncoming = cb => {
  if (!listeners.add(cb)) {
    throw new Error('Tried to subscribe twice')
  }

  cb()

  if (!subbed) {
    const user = require('../../Mediator').getUser()
    user.get(USER_TO_INCOMING).open(onOpen)
    subbed = true
  }

  return () => {
    if (!listeners.delete(cb)) {
      throw new Error('Tried to unsubscribe twice')
    }
  }
}

module.exports = {
  getPubToIncoming,
  setPubToIncoming,
  onPubToIncoming
}
