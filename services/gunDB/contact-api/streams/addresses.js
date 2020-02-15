/** @format */
const Key = require('../key')
/**
 * @typedef {Record<string, string|null|undefined>} Addresses
 */

/** @type {Addresses} */
const pubToAddress = {}

/** @type {Set<() => void>} */
const listeners = new Set()

listeners.add(() => {
  console.log(`pubToAddress: ${JSON.stringify(pubToAddress, null, 4)}`)
})

const notify = () => listeners.forEach(l => l())

/** @type {Set<string>} */
const subbedPublicKeys = new Set()

/**
 * @param {() => void} cb
 * @param {string=} pub
 */
const onAddresses = (cb, pub) => {
  listeners.add(cb)
  cb()
  if (pub && subbedPublicKeys.add(pub)) {
    require('../../Mediator')
      .getGun()
      .user(pub)
      .get(Key.CURRENT_HANDSHAKE_ADDRESS)
      .on(addr => {
        if (typeof addr === 'string' || addr === null) {
          pubToAddress[pub] = addr
        } else {
          pubToAddress[pub] = null
        }
        notify()
      })
  }
  return () => {
    listeners.delete(cb)
  }
}

const getAddresses = () => pubToAddress

module.exports = {
  onAddresses,
  getAddresses
}
