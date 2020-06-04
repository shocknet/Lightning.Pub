const Common = require('shock-common')
const Logger = require('winston')

const Key = require('../key')

/**
 * @typedef {Common.Schema.Follow} Follow
 */

/**
 * @returns {Promise<Record<string, Common.Schema.Follow>>}
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