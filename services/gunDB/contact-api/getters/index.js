/**
 * @format
 */

const Key = require('../key')

/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
exports.currentOrderAddress = async pub => {
  const currAddr = await require('../../Mediator')
    .getGun()
    .user(pub)
    .get(Key.CURRENT_ORDER_ADDRESS)
    .specialThen()

  if (typeof currAddr !== 'string') {
    throw new TypeError('Expected user.currentOrderAddress to be an string')
  }

  return currAddr
}
