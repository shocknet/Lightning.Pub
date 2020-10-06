/**
 * @format
 */
// @ts-check
const { makePromise, Constants } = require('shock-common')
/**
 * @typedef {import('./contact-api/SimpleGUN').ValidDataValue} ValidDataValue
 */

const { getGun, getUser } = require('./Mediator')

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

  await makePromise((res, rej) => {
    node.put(value, ack => {
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

  const id = await makePromise((res, rej) => {
    const subNode = node.set(value, ack => {
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
  set
}
