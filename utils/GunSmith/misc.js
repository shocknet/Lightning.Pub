/**
 * @format
 */
// @ts-check

// TODO: Check if merge() is equivalent to what gun does. But it should be.
const merge = require('lodash/merge')

/// <reference path="./GunT.ts" />

/**
 * @param {GunT.ValidDataValue[]} values
 * @returns {GunT.ValidDataValue}
 */
const mergePuts = values => {
  /**
   * @type {GunT.ValidDataValue}
   * @example
   * x.put({ a: 1 })
   * x.put('yo')
   * assertEquals(await x.then(), 'yo')
   * x.put({ b: 2 })
   * assertEquals(await x.then(), { a: 1 , b: 2 })
   */
  const lastObjectValue = {}

  /** @type {GunT.ValidDataValue} */
  let finalResult = {}

  for (const val of values) {
    if (typeof val === 'object' && val !== null) {
      finalResult = {}
      merge(lastObjectValue, val)
      merge(finalResult, lastObjectValue)
    } else {
      finalResult = val
    }
  }

  return finalResult
}

module.exports = {
  mergePuts
}
