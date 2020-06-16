/**
 * @format
 */
const Common = require('shock-common')
const Logger = require('winston')

const Key = require('./key')
const Utils = require('./utils')

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
  const incomingID = await require('../Mediator')
    .getUser()
    .get(Key.USER_TO_INCOMING)
    .get(pub)
    .then()

  if (typeof incomingID === 'string') return incomingID

  return null
}

/**
 * @param {string} publicKey
 * @returns {Promise<Common.Schema.User>}
 */
const getUser = async publicKey => {
  /**
   * @type {Common.Schema.User}
   */
  const user = {
    avatar: null,
    bio: null,
    displayName: null,
    lastSeenApp: 0,
    lastSeenNode: 0,
    publicKey
  }

  /**
   * @type {unknown}
   */
  const profile = await Utils.tryAndWait(
    gun =>
      new Promise(res => {
        const userNode = gun.get(`~${publicKey}`)

        userNode.load(data => res(data))
      }),
    v => typeof v === 'object' && v !== null
  )

  if (
    typeof profile === 'object' &&
    profile !== null &&
    Common.Schema.isUser({
      ...profile,
      publicKey
    })
  ) {
    Object.assign(user, profile)
    Logger.error(
      `Invalid profile found for publicKey: ${publicKey}, found: ${JSON.stringify(
        profile
      )}`
    )
  }

  return user
}

exports.getUser = getUser

exports.getMyUser = () => {
  const user = require('../Mediator').getUser()
  const publicKey = user.is && user.is.pub

  if (typeof publicKey !== 'string') {
    throw new Error('NOT_AUTH')
  }

  return getUser(publicKey)
}
