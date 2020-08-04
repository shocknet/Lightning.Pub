/**
 * @format
 */

/**
 * @template T
 * @typedef {(value: T) => Promise<boolean>} AsyncFilterCallback
 */

/**
 * @template T
 * @param {T[]} arr
 * @param {AsyncFilterCallback<T>} cb
 * @returns {Promise<T[]>}
 */
const asyncFilter = async (arr, cb) => {
  const results = await Promise.all(arr.map(item => cb(item)))

  return arr.filter((_, i) => results[i])
}

module.exports = {
  asyncFilter
}
