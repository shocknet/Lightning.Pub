/**
 * @format
 */
// @ts-check
const { makePromise, Constants, Schema } = require('shock-common')
const mapValues = require('lodash/mapValues')
const Bluebird = require('bluebird')

const { pubToEpub } = require('../contact-api/utils')
const {
  getGun,
  getUser,
  mySEA: SEA,
  getMySecret,
  $$__SHOCKWALLET__ENCRYPTED__
} = require('../Mediator')
/**
 * @typedef {import('../contact-api/SimpleGUN').ValidDataValue} ValidDataValue
 */

/**
 * @param {ValidDataValue} value
 * @param {string} publicKey
 * @returns {Promise<ValidDataValue>}
 */
const deepDecryptIfNeeded = async (value, publicKey) => {
  if (Schema.isObj(value)) {
    return Bluebird.props(
      mapValues(value, o => deepDecryptIfNeeded(o, publicKey))
    )
  }

  if (
    typeof value === 'string' &&
    value.indexOf($$__SHOCKWALLET__ENCRYPTED__) === 0
  ) {
    const user = getUser()
    if (!user.is) {
      throw new Error(Constants.ErrorCode.NOT_AUTH)
    }

    let sec = ''
    if (user.is.pub === publicKey) {
      sec = getMySecret()
    } else {
      sec = await SEA.secret(await pubToEpub(publicKey), user._.sea)
    }

    const decrypted = SEA.decrypt(value, sec)

    return decrypted
  }

  return value
}

/**
 * @param {ValidDataValue} value
 * @returns {Promise<ValidDataValue>}
 */
const deepEncryptIfNeeded = async value => {
  const u = getUser()

  if (!u.is) {
    throw new Error(Constants.ErrorCode.NOT_AUTH)
  }

  if (!Schema.isObj(value)) {
    return value
  }

  const pk = /** @type {string|undefined} */ (value.$$__ENCRYPT__FOR)

  if (!pk) {
    return Bluebird.props(mapValues(value, deepEncryptIfNeeded))
  }

  const actualValue = /** @type {string} */ (value.value)

  let encryptedValue = ''

  if (pk === u.is.pub) {
    encryptedValue = await SEA.encrypt(actualValue, getMySecret())
  } else {
    const sec = await SEA.secret(await pubToEpub(pk), u._.sea)

    encryptedValue = await SEA.encrypt(actualValue, sec)
  }

  return encryptedValue
}

/**
 * @param {string} rawPath
 * @param {ValidDataValue} value
 * @returns {Promise<void>}
 */
const put = async (rawPath, value) => {
  const [root, ...path] = rawPath.split('.')

  const node = (() => {
    // eslint-disable-next-line init-declarations
    let _node

    if (root === '$gun') {
      _node = getGun()
    } else if (root === '$user') {
      const u = getUser()

      if (!u.is) {
        throw new Error(Constants.ErrorCode.NOT_AUTH)
      }

      _node = u
    } else {
      throw new TypeError(
        `Unknown kind of root, expected $gun or $user but got: ${root}`
      )
    }

    for (const bit of path) {
      _node = _node.get(bit)
    }

    return _node
  })()

  const encryptedIfNeededValue = await deepEncryptIfNeeded(value)

  await makePromise((res, rej) => {
    node.put(encryptedIfNeededValue, ack => {
      if (ack.err && typeof ack.err !== 'number') {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })
}

/**
 * @param {string} rawPath
 * @param {ValidDataValue} value
 * @returns {Promise<string>}
 */
const set = async (rawPath, value) => {
  const [root, ...path] = rawPath.split('.')

  const node = (() => {
    // eslint-disable-next-line init-declarations
    let _node

    if (root === '$gun') {
      _node = getGun()
    } else if (root === '$user') {
      const u = getUser()

      if (!u.is) {
        throw new Error(Constants.ErrorCode.NOT_AUTH)
      }

      _node = u
    } else {
      throw new TypeError(
        `Unknown kind of root, expected $gun or $user but got: ${root}`
      )
    }

    for (const bit of path) {
      _node = _node.get(bit)
    }

    return _node
  })()

  const encryptedIfNeededValue = await deepEncryptIfNeeded(value)

  const id = await makePromise((res, rej) => {
    const subNode = node.set(encryptedIfNeededValue, ack => {
      if (ack.err && typeof ack.err !== 'number') {
        rej(new Error(ack.err))
      } else {
        res(subNode._.get)
      }
    })
  })

  return id
}

module.exports = {
  put,
  set,
  deepDecryptIfNeeded,
  deepEncryptIfNeeded
}
