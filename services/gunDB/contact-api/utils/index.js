/**
 * @format
 */
/* eslint-disable init-declarations */
const logger = require('winston')

const ErrorCode = require('../errorCode')
const Key = require('../key')

/**
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
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
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
const timeout10 = promise => {
  /** @type {NodeJS.Timeout} */
  // @ts-ignore
  let timeoutID
  return Promise.race([
    promise.then(v => {
      clearTimeout(timeoutID)
      return v
    }),

    new Promise((_, rej) => {
      timeoutID = setTimeout(() => {
        rej(new Error(ErrorCode.TIMEOUT_ERR))
      }, 10000)
    })
  ])
}

/**
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
const timeout5 = promise => {
  /** @type {NodeJS.Timeout} */
  // @ts-ignore
  let timeoutID
  return Promise.race([
    promise.then(v => {
      clearTimeout(timeoutID)
      return v
    }),

    new Promise((_, rej) => {
      timeoutID = setTimeout(() => {
        rej(new Error(ErrorCode.TIMEOUT_ERR))
      }, 5000)
    })
  ])
}

/**
 * @template T
 * @param {(gun: GUNNode, user: UserGUNNode) => Promise<T>} promGen The function
 * receives the most recent gun and user instances.
 * @param {((resolvedValue: unknown) => boolean)=} shouldRetry
 * @returns {Promise<T>}
 */
const tryAndWait = async (promGen, shouldRetry = () => false) => {
  /* eslint-disable no-empty */
  /* eslint-disable init-declarations */

  // If hang stop at 10, wait 3, retry, if hang stop at 5, reinstate, warm for
  // 5, retry, stop at 10, err

  /** @type {T} */
  let resolvedValue

  try {
    resolvedValue = await timeout10(
      promGen(
        require('../../Mediator/index').getGun(),
        require('../../Mediator/index').getUser()
      )
    )

    if (shouldRetry(resolvedValue)) {
      logger.info(
        'force retrying' +
          ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
      )
    } else {
      return resolvedValue
    }
  } catch (e) {
    logger.error(e)
    if (e.message === 'NOT_AUTH') {
      throw e
    }
  }

  logger.info(
    `\n retrying \n` +
      ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
  )

  await delay(3000)

  try {
    resolvedValue = await timeout5(
      promGen(
        require('../../Mediator/index').getGun(),
        require('../../Mediator/index').getUser()
      )
    )

    if (shouldRetry(resolvedValue)) {
      logger.info(
        'force retrying' +
          ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
      )
    } else {
      return resolvedValue
    }
  } catch (e) {
    logger.error(e)
    if (e.message === 'NOT_AUTH') {
      throw e
    }
  }

  logger.info(
    `\n recreating a fresh gun and retrying one last time \n` +
      ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
  )

  const { gun, user } = await require('../../Mediator/index').freshGun()

  return timeout10(promGen(gun, user))
  /* eslint-enable no-empty */
  /* eslint-enable init-declarations */
}

/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
const pubToEpub = async pub => {
  try {
    const epub = await tryAndWait(async gun => {
      const _epub = await gun
        .user(pub)
        .get('epub')
        .then()

      if (typeof _epub !== 'string') {
        throw new TypeError(
          `Expected gun.user(pub).get(epub) to be an string. Instead got: ${typeof _epub}`
        )
      }

      return _epub
    })

    return epub
  } catch (err) {
    logger.error(err)
    throw new Error(`pubToEpub() -> ${err.message}`)
  }
}

/**
 * Should only be called with a recipient pub that has already been contacted.
 * If returns null, a disconnect happened.
 * @param {string} recipientPub
 * @returns {Promise<string|null>}
 */
const recipientPubToLastReqSentID = async recipientPub => {
  const maybeLastReqSentID = await tryAndWait(
    (_, user) => {
      const userToLastReqSent = user.get(Key.USER_TO_LAST_REQUEST_SENT)
      return userToLastReqSent.get(recipientPub).then()
    },
    // retry on undefined, in case it is a false negative
    v => typeof v === 'undefined'
  )

  if (typeof maybeLastReqSentID !== 'string') {
    return null
  }

  return maybeLastReqSentID
}

/**
 * @param {string} recipientPub
 * @returns {Promise<boolean>}
 */
const successfulHandshakeAlreadyExists = async recipientPub => {
  const maybeIncomingID = await tryAndWait((_, user) => {
    const userToIncoming = user.get(Key.USER_TO_INCOMING)

    return userToIncoming.get(recipientPub).then()
  })

  const maybeOutgoingID = await tryAndWait((_, user) => {
    const recipientToOutgoing = user.get(Key.RECIPIENT_TO_OUTGOING)

    return recipientToOutgoing.get(recipientPub).then()
  })

  return (
    typeof maybeIncomingID === 'string' && typeof maybeOutgoingID === 'string'
  )
}

/**
 * @param {string} recipientPub
 * @returns {Promise<string|null>}
 */
const recipientToOutgoingID = async recipientPub => {
  const maybeEncryptedOutgoingID = await tryAndWait(
    (_, user) =>
      user
        .get(Key.RECIPIENT_TO_OUTGOING)
        .get(recipientPub)
        .then(),
    // force retry in case undefined is a false negative
    v => typeof v === 'undefined'
  )

  if (typeof maybeEncryptedOutgoingID === 'string') {
    const outgoingID = await require('../../Mediator/index').mySEA.decrypt(
      maybeEncryptedOutgoingID,
      await mySecret()
    )

    return outgoingID || null
  }

  return null
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(item: T) => void} cb
 * @returns {Promise<void>}
 */
const asyncForEach = async (arr, cb) => {
  const promises = arr.map(item => cb(item))

  await Promise.all(promises)
}

/**
 * @template T
 * @template U
 * @param {T[]} arr
 * @param {(item: T) => Promise<U>} cb
 * @returns {Promise<U[]>}
 */
const asyncMap = (arr, cb) => {
  if (arr.length === 0) {
    return Promise.resolve([])
  }

  const promises = arr.map(item => cb(item))

  return Promise.all(promises)
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(item: T) => Promise<boolean>} cb
 * @returns {Promise<T[]>}
 */
const asyncFilter = async (arr, cb) => {
  if (arr.length === 0) {
    return []
  }

  /** @type {Promise<boolean>[]} */
  const promises = arr.map(item => cb(item))

  /** @type {boolean[]} */
  const results = await Promise.all(promises)

  return arr.filter((_, idx) => results[idx])
}

/**
 * @param {import('../SimpleGUN').ListenerData} listenerData
 * @returns {listenerData is import('../SimpleGUN').ListenerObj}
 */
const dataHasSoul = listenerData =>
  typeof listenerData === 'object' && listenerData !== null

/**
 * @param {string} pub
 * @returns {string}
 */
const defaultName = pub => 'anon' + pub.slice(0, 8)

const LAST_SEEN_NODE_INTERVAL = 10000

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
      Date.now() - lastSeenNode < LAST_SEEN_NODE_INTERVAL * 2)
  )
}

module.exports = {
  asyncMap,
  asyncFilter,
  dataHasSoul,
  defaultName,
  delay,
  pubToEpub,
  recipientPubToLastReqSentID,
  successfulHandshakeAlreadyExists,
  recipientToOutgoingID,
  tryAndWait,
  mySecret,
  promisifyGunNode: require('./promisifygun'),
  asyncForEach,
  timeout5,
  LAST_SEEN_NODE_INTERVAL,
  isNodeOnline
}
