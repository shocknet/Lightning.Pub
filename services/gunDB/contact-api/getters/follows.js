/**
 * @format
 */
const Common = require('shock-common')
const Logger = require('winston')
const size = require('lodash/size')

const Utils = require('../utils')
const Key = require('../key')

/**
 * @typedef {Common.Schema.Follow} Follow
 */

/**
 * @throws {TypeError}
 * @returns {Promise<Record<string, Common.Schema.Follow>>}
 */
exports.currentFollows = async () => {
  /**
   * @type {Record<string, Common.Schema.Follow>}
   */
  const raw = await Utils.tryAndWait(
    // @ts-ignore
    (_, user) => new Promise(res => user.get(Key.FOLLOWS).load(res)),
    v => {
      if (typeof v !== 'object' || v === null) {
        return true
      }

      if (size(v) === 0) {
        return true
      }

      return false
    }
  )

  if (typeof raw !== 'object' || raw === null) {
    Logger.error(
      `Expected user.follows to be an object but instead got: ${JSON.stringify(
        raw
      )}`
    )
    throw new TypeError('Could not get follows, not an object')
  }

  const clean = {
    ...raw
  }

  for (const [key, followOrNull] of Object.entries(clean)) {
    if (!Common.Schema.isFollow(followOrNull)) {
      delete clean[key]
    }
  }

  return clean
}
