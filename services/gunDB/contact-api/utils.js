/**
 * @format
 */
const ErrorCode = require('./errorCode')
const Key = require('./key')

/**
 * @typedef {import('./SimpleGUN').GUNNode} GUNNode
 * @typedef {import('./SimpleGUN').ISEA} ISEA
 * @typedef {import('./SimpleGUN').UserGUNNode} UserGUNNode
 */

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = ms => new Promise(res => setTimeout(res, ms))

/**
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<T>}
 */
const timeout10 = promise => {
  return Promise.race([
    promise,
    new Promise((_, rej) => {
      setTimeout(() => {
        rej(new Error(ErrorCode.TIMEOUT_ERR))
      }, 10000)
    })
  ])
}

/**
 * @template T
 * @param {(gun: GUNNode, user: UserGUNNode) => Promise<T>} promGen The function
 * receives the most recent gun and user instances.
 * @returns {Promise<T>}
 */
const tryAndWait = promGen =>
  timeout10(
    promGen(
      require('../../Mediator/index').getGun(),
      require('../../Mediator/index').getUser()
    )
  )

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
    console.log(err)
    throw new Error(`pubToEpub() -> ${err.message}`)
  }
}

/**
 * @param {string} reqID
 * @param {ISEA} SEA
 * @param {string} mySecret
 * @returns {Promise<string>}
 */
const reqToRecipientPub = async (reqID, SEA, mySecret) => {
  const maybeEncryptedForMeRecipientPub = await tryAndWait(async (_, user) => {
    const reqToUser = user.get(Key.REQUEST_TO_USER)
    const data = await reqToUser.get(reqID).then()

    if (typeof data !== 'string') {
      throw new TypeError("typeof maybeEncryptedForMeRecipientPub !== 'string'")
    }

    return data
  })

  const encryptedForMeRecipientPub = maybeEncryptedForMeRecipientPub

  const recipientPub = await SEA.decrypt(encryptedForMeRecipientPub, mySecret)

  if (typeof recipientPub !== 'string') {
    throw new TypeError("typeof recipientPub !== 'string'")
  }

  return recipientPub
}

/**
 * Should only be called with a recipient pub that has already been contacted.
 * @param {string} recipientPub
 * @returns {Promise<string>}
 */
const recipientPubToLastReqSentID = async recipientPub => {
  const lastReqSentID = await tryAndWait(async (_, user) => {
    const userToLastReqSent = user.get(Key.USER_TO_LAST_REQUEST_SENT)
    const data = await userToLastReqSent.get(recipientPub).then()

    if (typeof data !== 'string') {
      throw new TypeError("typeof latestReqSentID !== 'string'")
    }

    return data
  })

  return lastReqSentID
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

  return typeof maybeIncomingID === 'string'
}

/**
 * @param {string} recipientPub
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<string|null>}
 */
const recipientToOutgoingID = async (recipientPub, user, SEA) => {
  const mySecret = await SEA.secret(user._.sea.epub, user._.sea)

  if (typeof mySecret !== 'string') {
    throw new TypeError('could not get mySecret')
  }

  const maybeEncryptedOutgoingID = await tryAndWait((_, user) =>
    user
      .get(Key.RECIPIENT_TO_OUTGOING)
      .get(recipientPub)
      .then()
  )

  if (typeof maybeEncryptedOutgoingID === 'string') {
    const outgoingID = await SEA.decrypt(maybeEncryptedOutgoingID, mySecret)

    return outgoingID || null
  }

  return null
}

/**
 * @param {string} reqResponse
 * @param {string} recipientPub
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<boolean>}
 */
const reqWasAccepted = async (reqResponse, recipientPub, user, SEA) => {
  try {
    const recipientEpub = await pubToEpub(recipientPub)
    const ourSecret = await SEA.secret(recipientEpub, user._.sea)
    if (typeof ourSecret !== 'string') {
      throw new TypeError('typeof ourSecret !== "string"')
    }

    const decryptedResponse = await SEA.decrypt(reqResponse, ourSecret)

    if (typeof decryptedResponse !== 'string') {
      throw new TypeError('typeof decryptedResponse !== "string"')
    }

    const myFeedID = await recipientToOutgoingID(recipientPub, user, SEA)

    if (typeof myFeedID === 'string' && decryptedResponse === myFeedID) {
      return false
    }

    const recipientFeedID = decryptedResponse

    const maybeFeed = await tryAndWait(gun =>
      gun
        .user(recipientPub)
        .get(Key.OUTGOINGS)
        .get(recipientFeedID)
        .then()
    )

    const feedExistsOnRecipient =
      typeof maybeFeed === 'object' && maybeFeed !== null

    return feedExistsOnRecipient
  } catch (err) {
    throw new Error(`reqWasAccepted() -> ${err.message}`)
  }
}

/**
 *
 * @param {string} userPub
 * @returns {Promise<string|null>}
 */
const currHandshakeAddress = async userPub => {
  const maybeAddr = await tryAndWait(gun =>
    gun
      .user(userPub)
      .get(Key.CURRENT_HANDSHAKE_ADDRESS)
      .then()
  )

  return typeof maybeAddr === 'string' ? maybeAddr : null
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
 * @param {import('./SimpleGUN').ListenerData} listenerData
 * @returns {listenerData is import('./SimpleGUN').ListenerObj}
 */
const dataHasSoul = listenerData =>
  typeof listenerData === 'object' && listenerData !== null

/**
 * @param {string} pub
 * @returns {string}
 */
const defaultName = pub => 'anon' + pub.slice(0, 8)

module.exports = {
  asyncMap,
  asyncFilter,
  dataHasSoul,
  defaultName,
  delay,
  pubToEpub,
  reqToRecipientPub,
  recipientPubToLastReqSentID,
  successfulHandshakeAlreadyExists,
  recipientToOutgoingID,
  reqWasAccepted,
  currHandshakeAddress,
  tryAndWait
}
