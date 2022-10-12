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

/**
 * @param {any} data
 * @returns {any}
 */
const removeBuiltInGunProps = data => {
  if (typeof data === 'object' && data !== null) {
    const o = { ...data }
    delete o._
    delete o['#']
    return o
  }

  console.log(data)
  throw new TypeError(
    'Non object passed to removeBuiltInGunProps: ' + JSON.stringify(data)
  )
}

/**
 * @param {GunT.ListenerData} data
 */
const isPopulated = data => {
  if (data === null || typeof data === 'undefined') {
    return false
  }
  if (typeof data === 'object') {
    return Object.keys(removeBuiltInGunProps(data)).length > 0
  }
  return true
}

module.exports = {
  mergePuts,
  removeBuiltInGunProps,
  isPopulated
}
