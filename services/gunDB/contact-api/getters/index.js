/**
 * @format
 */
const Common = require('shock-common')
const Logger = require('winston')
/**
 * @typedef {import('shock-common').Schema.Follow} Follow
 */

const Key = require('../key')
const Utils = require('../utils')

/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
exports.currentOrderAddress = async pub => {
  const currAddr = await Utils.tryAndWait(gun =>
    gun
      .user(pub)
      .get(Key.CURRENT_ORDER_ADDRESS)
      .then()
  )

  if (typeof currAddr !== 'string') {
    throw new TypeError('Expected user.currentOrderAddress to be an string')
  }

  return currAddr
}

/**
 * @param {string} pub
 * @returns {Promise<string|null>}
 */
exports.userToIncomingID = async pub => {
  const incomingID = await require('../../Mediator')
    .getUser()
    .get(Key.USER_TO_INCOMING)
    .get(pub)
    .then()

  if (typeof incomingID === 'string') return incomingID

  return null
}

/**
 * @returns {Promise<Record<string, Follow>>}
 */
exports.currentFollows = () => {
  const user = require('../../Mediator').getUser()

  return new Promise(res => {
    user.get(Key.FOLLOWS).load(data => {
      if (typeof data !== 'object' || data === null) {
        Logger.warn(
          `GunDb -> getters -> currentFollows() -> Current follows data as fetched from gun is not an object but ${typeof data}. This can happen if Gun lost its cache and it's still retrieving data from the network.`
        )
        res({})
        return
      }

      const rejected = Object.entries(data).filter(
        ([_, follow]) => !Common.Schema.isFollow(follow)
      )

      rejected.forEach(([key, item]) => {
        // expected when unfollowed
        if (item !== null) {
          Logger.warn(
            `GunDb -> getters -> currentFollows() -> Item not conforming to schema found inside follows data. Key: ${key}, item: ${JSON.stringify(
              item
            )}.`
          )
        }
      })

      const passed = Object.entries(data).filter(([_, follow]) =>
        Common.Schema.isFollow(follow)
      )

      const p = /** @type {unknown} */ (passed)

      res(/** @type {Record<string, Follow>} */ (p))
    })
  })
}
