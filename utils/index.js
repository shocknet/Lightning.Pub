/**
 * @format
 */

const { asyncFilter } = require('./helpers')

/**
 * @returns {string}
 */
const gunUUID = () => {
  // Copied from gun internals
  let s = ''
  let l = 24 // you are not going to make a 0 length random number, so no need to check type
  const c = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz'
  while (l > 0) {
    s += c.charAt(Math.floor(Math.random() * c.length))
    l--
  }
  return s
}

module.exports = {
  asyncFilter,
  gunUUID
}
