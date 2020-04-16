const Key = require('../key')
/**
 * @typedef {Record<string, number|undefined|null>} Timestamps
 * @typedef {(timestamps: Timestamps) => void} Listener
 */

/** @type {Timestamps} */
const pubToLastSeenApp = {}

const getPubToLastSeenApp = () => pubToLastSeenApp

/** @type {Set<Listener>} */
const listeners = new Set()

const notifyListeners = () => {
  listeners.forEach(l => l(pubToLastSeenApp))
}

/** @type {Set<string>} */
const pubsWithListeners = new Set()

/**
 * @param {Listener} cb
 * @param {string=} pub
 */
const on = (cb, pub) => {
  listeners.add(cb)
  cb(pubToLastSeenApp)
  if (pub && pubsWithListeners.add(pub)) {
    pubToLastSeenApp[pub] = null;
    notifyListeners()
    require('../../Mediator')
      .getGun()
      .user(pub)
      .get(Key.LAST_SEEN_APP)
      .on(timestamp => {
        pubToLastSeenApp[pub] = typeof timestamp === 'number' ? timestamp : undefined
        notifyListeners()
      })
  }
  return () => {
    listeners.delete(cb)
  }
}

module.exports = {
  getPubToLastSeenApp,
  on,
}