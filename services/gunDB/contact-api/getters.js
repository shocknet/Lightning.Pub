const Key = require('./key')
const Utils = require('./utils')

/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
exports.currentOrderAddress = async (pub) => {
  const currAddr = await Utils.tryAndWait((gun) => gun.user(pub).get(Key.CURRENT_ORDER_ADDRESS).then())

  if (typeof currAddr !== 'string') {
    throw new TypeError('Expected user.currentOrderAddress to be an string')
  }

  return currAddr
}

/**
 * @param {string} pub
 * @returns {Promise<string|null>}
 */
exports.userToIncomingID = async (pub) => {
  const incomingID = await require('../Mediator').getUser().get(Key.USER_TO_INCOMING).get(pub).then()

  if (typeof incomingID === 'string') return incomingID

  return null

}