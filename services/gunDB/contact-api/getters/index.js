/**
 * @format
 */
const Common = require('shock-common')

const Key = require('../key')
const Utils = require('../utils')

const Wall = require('./wall')
const Feed = require('./feed')
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
 * @param {string} pub
 * @returns {Promise<string|null>}
 */
exports.userToIncomingID = async pub => {
  const incomingID = await require('../../Mediator')
    .getUser()
    .get(Key.USER_TO_INCOMING)
    .get(pub)
    .then()

  if (typeof incomingID === 'string') return incomingID

  return null
}

/**
 * @returns {Promise<Common.SchemaTypes.User>}
 */
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
module.exports.Follows = require('./follows')

module.exports.getWallPage = Wall.getWallPage
module.exports.getWallTotalPages = Wall.getWallTotalPages

module.exports.getFeedPage = Feed.getFeedPage
module.exports.getAnUser = User.getAnUser
