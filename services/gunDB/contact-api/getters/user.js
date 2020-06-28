/**
 * @format
 */
const Common = require('shock-common')

const Key = require('../key')
const Utils = require('../utils')

/**
 * @param {string} publicKey
 * @returns {Promise<Common.SchemaTypes.User>}
 */
const getAnUser = async publicKey => {
  const oldProfile = await Utils.tryAndWait(
    g => {
      const user = g.get(`~${publicKey}`)

      return new Promise(res => user.get(Key.PROFILE).load(res))
    },
    v => typeof v !== 'object'
  )

  const bio = await Utils.tryAndWait(
    g =>
      g
        .get(`~${publicKey}`)
        .get(Key.BIO)
        .then(),
    v => typeof v !== 'string'
  )

  const lastSeenApp = await Utils.tryAndWait(
    g =>
      g
        .get(`~${publicKey}`)
        .get(Key.LAST_SEEN_APP)
        .then(),
    v => typeof v !== 'number'
  )

  const lastSeenNode = await Utils.tryAndWait(
    (_, user) => user.get(Key.LAST_SEEN_NODE).then(),
    v => typeof v !== 'number'
  )

  /** @type {Common.SchemaTypes.User} */
  const u = {
    avatar: oldProfile.avatar,
    // @ts-ignore
    bio,
    displayName: oldProfile.displayName,
    // @ts-ignore
    lastSeenApp,
    // @ts-ignore
    lastSeenNode,
    // @ts-ignore
    publicKey
  }

  return u
}

module.exports.getAnUser = getAnUser

/**
 * @returns {Promise<Common.SchemaTypes.User>}
 */
const getMyUser = async () => {
  const oldProfile = await Utils.tryAndWait(
    (_, user) => new Promise(res => user.get(Key.PROFILE).load(res)),
    v => typeof v !== 'object'
  )

  const bio = await Utils.tryAndWait(
    (_, user) => user.get(Key.BIO).then(),
    v => typeof v !== 'string'
  )

  const lastSeenApp = await Utils.tryAndWait(
    (_, user) => user.get(Key.LAST_SEEN_APP).then(),
    v => typeof v !== 'number'
  )

  const lastSeenNode = await Utils.tryAndWait(
    (_, user) => user.get(Key.LAST_SEEN_NODE).then(),
    v => typeof v !== 'number'
  )

  const publicKey = await Utils.tryAndWait(
    (_, user) => Promise.resolve(user.is && user.is.pub),
    v => typeof v !== 'string'
  )

  /** @type {Common.SchemaTypes.User} */
  const u = {
    avatar: oldProfile.avatar,
    // @ts-ignore
    bio,
    displayName: oldProfile.displayName,
    // @ts-ignore
    lastSeenApp,
    // @ts-ignore
    lastSeenNode,
    // @ts-ignore
    publicKey
  }

  return u
}

module.exports.getMyUser = getMyUser
