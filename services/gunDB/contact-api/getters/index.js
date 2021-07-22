/**
 * @format
 */
const Common = require('shock-common')

const Key = require('../key')
const Utils = require('../utils')

const User = require('./user')
const { size } = require('lodash')

/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
exports.currentOrderAddress = async pub => {
  const currAddr = await Utils.tryAndWait(gun =>
    gun
      .user(pub)
      .get(Key.CURRENT_ORDER_ADDRESS)
      .then()
  )

  if (typeof currAddr !== 'string') {
    throw new TypeError('Expected user.currentOrderAddress to be an string')
  }

  return currAddr
}

/**
 * @returns {Promise<any>}
 */
//@returns {Promise<Common.SchemaTypes.User>}
const getMyUser = async () => {
  const oldProfile = await Utils.tryAndWait(
    (_, user) => new Promise(res => user.get(Key.PROFILE).load(res)),
    v => {
      if (typeof v !== 'object') {
        return true
      }

      if (v === null) {
        return true
      }

      // load sometimes returns an empty set on the first try
      return size(v) === 0
    }
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
  //@ts-ignore
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
/**
 * @param {string} publicKey
 */
const getUserInfo = async publicKey => {
  const userInfo = await Utils.tryAndWait(
    gun =>
      new Promise(res =>
        gun
          .user(publicKey)
          .get(Key.PROFILE)
          .load(res)
      ),
    v => {
      if (typeof v !== 'object') {
        return true
      }

      if (v === null) {
        return true
      }

      // load sometimes returns an empty set on the first try
      return size(v) === 0
    }
  )
  return {
    publicKey,
    avatar: userInfo.avatar,
    displayName: userInfo.displayName
  }
}

module.exports.getMyUser = getMyUser
module.exports.getUserInfo = getUserInfo

module.exports.getAnUser = User.getAnUser
