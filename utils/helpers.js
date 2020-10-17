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

const wait = (seconds = 0) =>
  new Promise(resolve => {
    /** @type {NodeJS.Timeout} */
    const timer = setTimeout(() => resolve(timer), seconds * 1000)
  })

module.exports = {
  asyncFilter,
  wait
}
