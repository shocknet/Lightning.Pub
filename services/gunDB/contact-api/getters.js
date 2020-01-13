const Key = require('./key')
/**
 * @param {string} pub
 * @param {import('./SimpleGUN').GUNNode} gun
 * @returns {Promise<string>}
 */
exports.currentOrderAddress = async (pub, gun) => {
  const currAddr = await gun.user(pub).get(Key.CURRENT_ORDER_ADDRESS).then()

  if (typeof currAddr !== 'string') {
    throw new TypeError('Expected user.currentOrderAddress to be an string')
  }

  return currAddr
}