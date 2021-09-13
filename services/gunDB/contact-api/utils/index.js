/**
 * @format
 */
/* eslint-disable init-declarations */
const logger = require('../../../../config/log')
const { Constants, Utils: CommonUtils } = require('shock-common')

const Key = require('../key')
/// <reference path="../../../../utils/GunSmith/GunT.ts" />

/**
 * @typedef {GunT.GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {GunT.UserGUNNode} UserGUNNode
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(res => setTimeout(res, ms))

/**
 * @returns {Promise<string>}
 */
const mySecret = () => Promise.resolve(require('../../Mediator').getMySecret())

/**
 * Just a pointer.
 */
const TIMEOUT_PTR = {}

/**
 * @param {number} ms Milliseconds
 * @returns {<T>(promise: Promise<T>) => Promise<T>}
 */
const timeout = ms => async promise => {
  /** @type {NodeJS.Timeout} */
  // @ts-ignore
  let timeoutID

  const result = await Promise.race([
    promise.then(v => {
      clearTimeout(timeoutID)
      return v
    }),

    CommonUtils.makePromise(res => {
      timeoutID = setTimeout(() => {
        clearTimeout(timeoutID)
        res(TIMEOUT_PTR)
      }, ms)
    })
  ])

  if (result === TIMEOUT_PTR) {
    throw new Error(Constants.TIMEOUT_ERR)
  }

  return result
}

/**
 * Time outs at 10 seconds.
 */
const timeout10 = timeout(10)

/**
 * Time outs at 5 seconds.
 */
const timeout5 = timeout(5)

/**
 * Time outs at 2 seconds.
 */
const timeout2 = timeout(2)

/**
 * @template T
 * @param {(gun: GUNNode, user: UserGUNNode) => Promise<T>} promGen The function
 * receives the most recent gun and user instances.
 * @param {((resolvedValue: unknown) => boolean)=} shouldRetry
 * @returns {Promise<T>}
 */
const tryAndWait = async (promGen, shouldRetry = () => false) => {
  /* eslint-disable init-declarations */

  // If hang stop at 10, wait 3, retry, if hang stop at 5, reinstate, warm for
  // 5, retry, stop at 10, err

  /** @type {T} */
  let resolvedValue

  try {
    resolvedValue = await timeout2(
      promGen(
        require('../../Mediator/index').getGun(),
        require('../../Mediator/index').getUser()
      )
    )

    if (!shouldRetry(resolvedValue)) {
      return resolvedValue
    }
  } catch (e) {
    if (e.message !== Constants.ErrorCode.TIMEOUT_ERR) {
      throw e
    }
  }

  await delay(200)

  try {
    resolvedValue = await timeout5(
      promGen(
        require('../../Mediator/index').getGun(),
        require('../../Mediator/index').getUser()
      )
    )

    if (!shouldRetry(resolvedValue)) {
      return resolvedValue
    }
  } catch (e) {
    if (e.message !== Constants.ErrorCode.TIMEOUT_ERR) {
      throw e
    }
  }

  await delay(3000)

  try {
    resolvedValue = await timeout5(
      promGen(
        require('../../Mediator/index').getGun(),
        require('../../Mediator/index').getUser()
      )
    )

    if (!shouldRetry(resolvedValue)) {
      return resolvedValue
    }
  } catch (e) {
    if (e.message !== Constants.ErrorCode.TIMEOUT_ERR) {
      throw e
    }
  }

  return timeout10(
    promGen(
      require('../../Mediator/index').getGun(),
      require('../../Mediator/index').getUser()
    )
  )

  /* eslint-enable init-declarations */
}

/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
const pubToEpub = async pub => {
  try {
    const TIMEOUT_PTR = {}

    const epubOrTimeout = await Promise.race([
      CommonUtils.makePromise(res => {
        require('../../Mediator/index')
          .getGun()
          .user(pub)
          .get('epub')
          .on(data => {
            if (typeof data === 'string') {
              res(data)
            }
          })
      }),
      CommonUtils.makePromise(res => {
        setTimeout(() => {
          res(TIMEOUT_PTR)
        }, 10000)
      })
    ])

    if (epubOrTimeout === TIMEOUT_PTR) {
      throw new Error(`Timeout inside pubToEpub()`)
    }

    return epubOrTimeout
  } catch (err) {
    logger.error(
      `Error inside pubToEpub for pub ${pub.slice(0, 8)}...${pub.slice(-8)}:`
    )
    logger.error(err)
    throw err
  }
}

/**
 * @param {import('../SimpleGUN').ListenerData} listenerData
 * @returns {listenerData is import('../SimpleGUN').ListenerObj}
 */
const dataHasSoul = listenerData =>
  typeof listenerData === 'object' && listenerData !== null

/**
 * @param {string} pub
 * @returns {Promise<boolean>}
 */
const isNodeOnline = async pub => {
  const SET_LAST_SEEN_APP_INTERVAL = 15000

  /**
   * @param {any} lastSeen
   * @returns {boolean}
   */
  const isAppOnline = lastSeen =>
    typeof lastSeen === 'number' &&
    Date.now() - lastSeen < SET_LAST_SEEN_APP_INTERVAL * 2

  const userNode = require('../../Mediator')
    .getGun()
    .user(pub)

  const isOnlineApp = isAppOnline(await userNode.get(Key.LAST_SEEN_APP).then())
  const lastSeenNode = await userNode.get(Key.LAST_SEEN_NODE).then()

  return (
    isOnlineApp ||
    (typeof lastSeenNode === 'number' &&
      Date.now() - lastSeenNode < Constants.Misc.LAST_SEEN_NODE_INTERVAL * 2)
  )
}

module.exports = {
  dataHasSoul,
  delay,
  pubToEpub,
  tryAndWait,
  mySecret,
  promisifyGunNode: require('./promisifygun'),
  timeout5,
  timeout2,
  isNodeOnline
}
