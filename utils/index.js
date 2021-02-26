/**
 * @format
 */
const Gun = require('gun')

const { asyncFilter } = require('./helpers')

/**
 * @returns {string}
 */
const gunUUID = () => {
  // @ts-expect-error Not typed
  const uuid = Gun.Text.random()

  return uuid
}

module.exports = {
  asyncFilter,
  gunUUID
}
