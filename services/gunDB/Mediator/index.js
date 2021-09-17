/**
 * @format
 */
const Common = require('shock-common')
const Gun = require('gun')
// @ts-ignore
require('gun/nts')
const logger = require('../../../config/log')
// @ts-ignore
Gun.log = () => {}
// @ts-ignore
require('gun/lib/open')
// @ts-ignore
require('gun/lib/load')
//@ts-ignore
const { encryptedEmit, encryptedOn } = require('../../../utils/ECC/socket')

/** @type {import('../contact-api/SimpleGUN').ISEA} */
// @ts-ignore
const SEAx = require('gun/sea')
// Re-enable in the future, when SEA errors inside user.auth/etc actually
// propagate up.
// SEAx.throw = true

/** @type {import('../contact-api/SimpleGUN').ISEA} */
const mySEA = {}

// Avoid this: https://github.com/amark/gun/issues/804 and any other issues
const $$__SHOCKWALLET__ENCRYPTED__ = '$$_SHOCKWALLET__ENCRYPTED__'
const $$__SHOCKWALLET__MSG__ = '$$__SHOCKWALLET__MSG__'
const $$__SHOCKWALLET__NUMBER__ = '$$__SHOCKWALLET__NUMBER__'
const $$__SHOCKWALLET__BOOLEAN__ = '$$__SHOCKWALLET__BOOLEAN__'

mySEA.encrypt = (msg, secret) => {
  if (typeof secret !== 'string') {
    throw new TypeError(
      `mySEA.encrypt() -> expected secret to be a an string, args: |msg| -- ${JSON.stringify(
        secret
      )}`
    )
  }

  if (secret.length < 1) {
    throw new TypeError(
      `mySEA.encrypt() -> expected secret to be a populated string`
    )
  }

  let strToEncode = ''

  if (typeof msg === 'string') {
    if (msg.length === 0) {
      throw new TypeError(
        'mySEA.encrypt() -> expected msg to be a populated string'
      )
    }

    strToEncode = $$__SHOCKWALLET__MSG__ + msg
  } else if (typeof msg === 'boolean') {
    strToEncode = $$__SHOCKWALLET__BOOLEAN__ + msg
  } else if (typeof msg === 'number') {
    strToEncode = $$__SHOCKWALLET__NUMBER__ + msg
  } else {
    throw new TypeError('mySea.encrypt() -> Not a valid msg type.')
  }

  return SEAx.encrypt(strToEncode, secret).then(encMsg => {
    return $$__SHOCKWALLET__ENCRYPTED__ + encMsg
  })
}

/**
 * @param {string} encMsg
 * @param {string} secret
 * @returns {Promise<any>}
 */
const decryptBase = (encMsg, secret) => {
  if (typeof encMsg !== 'string') {
    throw new TypeError(
      'mySEA.encrypt() -> expected encMsg to be an string instead got: ' +
        typeof encMsg
    )
  }

  if (encMsg.length === 0) {
    throw new TypeError(
      'mySEA.encrypt() -> expected encMsg to be a populated string'
    )
  }

  if (typeof secret !== 'string') {
    throw new TypeError('mySea.decrypt() -> expected secret to be an string')
  }

  if (secret.length === 0) {
    throw new TypeError(
      'mySea.decrypt() -> expected secret to be a populated string'
    )
  }

  if (encMsg.indexOf($$__SHOCKWALLET__ENCRYPTED__) !== 0) {
    throw new TypeError(
      'Trying to pass a non prefixed encrypted string to mySea.decrypt(): ' +
        encMsg
    )
  }

  return SEAx.decrypt(
    encMsg.slice($$__SHOCKWALLET__ENCRYPTED__.length),
    secret
  ).then(decodedMsg => {
    if (typeof decodedMsg !== 'string') {
      throw new TypeError('Could not decrypt')
    }

    if (decodedMsg.startsWith($$__SHOCKWALLET__MSG__)) {
      return decodedMsg.slice($$__SHOCKWALLET__MSG__.length)
    } else if (decodedMsg.startsWith($$__SHOCKWALLET__BOOLEAN__)) {
      const dec = decodedMsg.slice($$__SHOCKWALLET__BOOLEAN__.length)
      if (dec === 'true') {
        return true
      } else if (dec === 'false') {
        return false
      }
      throw new Error('Could not decrypt boolean value.')
    } else if (decodedMsg.startsWith($$__SHOCKWALLET__NUMBER__)) {
      return Number(decodedMsg.slice($$__SHOCKWALLET__NUMBER__.length))
    }

    throw new TypeError(
      `mySea.encrypt() -> Unexpected type of prefix found inside decrypted value, first 20 characters: ${decodedMsg.slice(
        0,
        20
      )}`
    )
  })
}

mySEA.decrypt = (encMsg, secret) => {
  return decryptBase(encMsg, secret)
}

mySEA.decryptNumber = (encMsg, secret) => {
  return decryptBase(encMsg, secret)
}

mySEA.decryptBoolean = (encMsg, secret) => {
  return decryptBase(encMsg, secret)
}

mySEA.secret = async (recipientOrSenderEpub, recipientOrSenderSEA) => {
  if (typeof recipientOrSenderEpub !== 'string') {
    throw new TypeError(
      'epub has to be an string, args:' +
        `${JSON.stringify(recipientOrSenderEpub)} -- ${JSON.stringify(
          recipientOrSenderSEA
        )}`
    )
  }
  if (recipientOrSenderEpub.length === 0) {
    throw new TypeError(
      'epub has to be populated string, args: ' +
        `${JSON.stringify(recipientOrSenderEpub)} -- ${JSON.stringify(
          recipientOrSenderSEA
        )}`
    )
  }
  if (typeof recipientOrSenderSEA !== 'object') {
    throw new TypeError(
      'sea has to be an object, args: ' +
        `${JSON.stringify(recipientOrSenderEpub)} -- ${JSON.stringify(
          recipientOrSenderSEA
        )}`
    )
  }

  if (recipientOrSenderSEA === null) {
    throw new TypeError(
      'sea has to be nont null, args: ' +
        `${JSON.stringify(recipientOrSenderEpub)} -- ${JSON.stringify(
          recipientOrSenderSEA
        )}`
    )
  }

  if (recipientOrSenderEpub === recipientOrSenderSEA.pub) {
    throw new Error(
      'Do not use pub for mysecret, args: ' +
        `${JSON.stringify(recipientOrSenderEpub)} -- ${JSON.stringify(
          recipientOrSenderSEA
        )}`
    )
  }

  const sec = await SEAx.secret(recipientOrSenderEpub, recipientOrSenderSEA)

  if (typeof sec !== 'string') {
    throw new TypeError(
      `Could not generate secret, args: ${JSON.stringify(
        recipientOrSenderEpub
      )} -- ${JSON.stringify(recipientOrSenderSEA)}`
    )
  }

  if (sec.length === 0) {
    throw new TypeError(
      `SEA.secret returned an empty string!, args: ${JSON.stringify(
        recipientOrSenderEpub
      )} -- ${JSON.stringify(recipientOrSenderSEA)}`
    )
  }

  return sec
}

const { Constants } = require('shock-common')

const API = require('../contact-api/index')

/**
 * @typedef {import('../contact-api/SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../contact-api/SimpleGUN').UserGUNNode} UserGUNNode
 * @typedef {import('../contact-api/SimpleGUN').ValidDataValue} ValidDataValue
 */

// TO DO: move to common repo
/**
 * @typedef {object} Emission
 * @prop {boolean} ok
 * @prop {any} msg
 * @prop {Record<string, any>} origBody
 */

/**
 * @typedef {object} EncryptedEmissionLegacy
 * @prop {string} encryptedData
 * @prop {string} encryptedKey
 * @prop {string} iv
 */

/**
 * @typedef {object} EncryptedEmission
 * @prop {string} ciphertext
 * @prop {string} mac
 * @prop {string} iv
 * @prop {string} ephemPublicKey
 */

// TO DO: move to common repo
/**
 * @typedef {object} SimpleSocket
 * @prop {(eventName: string, data?: Emission|EncryptedEmissionLegacy|EncryptedEmission|ValidDataValue) => void} emit
 * @prop {(eventName: string, handler: (data: any, callback: (err?: any, data?: any) => void) => void) => void} on
 * @prop {{ auth: { [key: string]: any } }} handshake
 */

/* eslint-disable init-declarations */

/** @type {GUNNode} */
// @ts-ignore
let gun

/** @type {UserGUNNode} */
let user

/* eslint-enable init-declarations */

/** @type {string|null} */
let _currentAlias = null
/** @type {string|null} */

/** @type {string|null} */
let mySec = null

/** @returns {string} */
const getMySecret = () => /** @type {string} */ (mySec)

let _isAuthenticating = false
let _isRegistering = false

const isAuthenticated = () => typeof user.is === 'object' && user.is !== null
const isAuthenticating = () => _isAuthenticating
const isRegistering = () => _isRegistering

const getGun = () => {
  return gun
}

const getUser = () => {
  if (!user.is) {
    logger.warn('called getUser() without being authed')
    throw new Error(Constants.ErrorCode.NOT_AUTH)
  }
  return user
}

/**
 * Returns a promise containing the public key of the newly created user.
 * @param {string} alias
 * @param {string} pass
 * @param {UserGUNNode=} __user
 * @returns {Promise<string>}
 */
const authenticate = async (alias, pass, __user) => {
  if (!Common.isPopulatedString(alias)) {
    throw new TypeError(
      `Expected alias to be a populated string, instead got: ${alias}`
    )
  }
  if (!Common.isPopulatedString(pass)) {
    throw new TypeError(
      `Expected pass to be a populated string, instead got: ${pass}`
    )
  }
  const _user = __user || user
  const isFreshGun = _user !== user
  if (isFreshGun) {
    const ack = await new Promise(res => {
      _user.auth(alias, pass, _ack => {
        res(_ack)
      })
    })

    if (typeof ack.err === 'string') {
      throw new Error(ack.err)
    } else if (typeof ack.sea === 'object') {
      // clock skew
      await new Promise(res => setTimeout(res, 2000))

      return ack.sea.pub
    } else {
      throw new Error('Unknown error.')
    }
  }

  if (isAuthenticated()) {
    if (alias !== _currentAlias) {
      throw new Error(
        `Tried to re-authenticate with an alias different to that of stored one, tried: ${alias} - stored: ${_currentAlias}, logoff first if need to change aliases.`
      )
    }

    // clock skew
    await new Promise(res => setTimeout(res, 2000))

    // move this to a subscription; implement off() ? todo
    API.Jobs.onOrders(_user, gun, mySEA)
    API.Jobs.lastSeenNode(_user)

    API.Events.onSeedBackup(() => {}, user, mySEA)

    return _user._.sea.pub
  }

  if (isAuthenticating()) {
    throw new Error(
      'Cannot authenticate while another authentication attempt is going on'
    )
  }

  _isAuthenticating = true

  const ack = await new Promise(res => {
    _user.auth(alias, pass, _ack => {
      res(_ack)
    })
  })

  _isAuthenticating = false

  if (typeof ack.err === 'string') {
    throw new Error(ack.err)
  } else if (typeof ack.sea === 'object') {
    mySec = await mySEA.secret(_user._.sea.epub, _user._.sea)

    _currentAlias = alias

    await new Promise(res => setTimeout(res, 5000))

    API.Jobs.onOrders(_user, gun, mySEA)
    API.Jobs.lastSeenNode(_user)

    API.Events.onSeedBackup(() => {}, user, mySEA)

    return ack.sea.pub
  } else {
    console.log(ack)
    logger.error(
      `Unknown error, wrong password? Ack looks like: ${JSON.stringify(ack)}`
    )
    throw new Error(`Didn't work, bad password?`)
  }
}

const logoff = () => {
  user.leave()
}

const instantiateGun = () => {
  const Config = require('../config')
  if (user) {
    user.leave()
  }
  // @ts-ignore
  user = null
  if (gun) {
    gun.off()
  }
  // @ts-ignore
  gun = null

  const _gun = /** @type {unknown} */ (new Gun({
    axe: false,
    multicast: false,
    peers: Config.PEERS
  }))

  gun = /** @type {GUNNode} */ (_gun)

  user = gun.user()
}

instantiateGun()

const freshGun = () => {
  return {
    gun,
    user
  }
}

/**
 * Creates an user for gun. Returns a promise containing the public key of the
 * newly created user.
 * @param {string} alias
 * @param {string} pass
 * @throws {Error} If gun is authenticated or is in the process of
 * authenticating. Use `isAuthenticating()` and `isAuthenticated()` to check for
 * this first. It can also throw if the alias is already registered on gun.
 * @returns {Promise<string>}
 */
const register = async (alias, pass) => {
  if (isRegistering()) {
    throw new Error('Already registering.')
  }

  if (isAuthenticating()) {
    throw new Error(
      'Cannot register while gun is being authenticated (reminder: there should only be one user created for each node).'
    )
  }

  if (isAuthenticated()) {
    throw new Error(
      'Cannot register if gun is already authenticated (reminder: there should only be one user created for each node).'
    )
  }

  /**
   * Peers provided to gun.
   */
  const peers = Object.values(gun._.opt.peers)

  const theresPeers = peers.length > 0
  const atLeastOneIsConnected = peers.some(
    p => p.wire && p.wire.readyState === 1
  )

  if (theresPeers && !atLeastOneIsConnected) {
    throw new Error(
      'No connected to any peers for checking of duplicate aliases'
    )
  }

  if (theresPeers && atLeastOneIsConnected) {
    // this import is done here to avoid circular dependency hell
    const { timeout5 } = require('../contact-api/utils')

    let userData = await timeout5(
      new Promise(res => {
        gun.get(`~@${alias}`).once(ud => res(ud))
      })
    )

    if (userData) {
      throw new Error(
        'The given alias has been used before, use an unique alias instead.'
      )
    }

    await new Promise(res => setTimeout(res, 300))

    userData = await timeout5(
      new Promise(res => {
        gun.get(`~@${alias}`).once(ud => res(ud), {
          // https://github.com/amark/gun/pull/971#issue-438630761
          wait: 1500
        })
      })
    )

    if (userData) {
      throw new Error(
        'The given alias has been used before, use an unique alias instead. (Caught at 2nd try)'
      )
    }
  }

  _isRegistering = true

  /** @type {import('../contact-api/SimpleGUN').CreateAck} */
  const ack = await new Promise(res =>
    user.create(alias, pass, ack => res(ack))
  )

  // An empty ack object seems to be caused by a duplicate alias sign up
  if ('{}' === JSON.stringify(ack)) {
    throw new Error(
      'The given alias has been used before, use an unique alias instead. (Empty ack)'
    )
  }

  _isRegistering = false

  if (typeof ack.err === 'string') {
    throw new Error(ack.err)
  } else if (typeof ack.pub === 'string' || typeof user._.sea === 'object') {
    // OK
  } else {
    throw new Error('unknown error, ack: ' + JSON.stringify(ack))
  }

  // restart instances so write to user graph work, there's an issue with gun
  // (at least on node) where after initial user creation, writes to user graph
  // don't work
  instantiateGun()

  return authenticate(alias, pass).then(async pub => {
    await API.Actions.setDisplayName('anon' + pub.slice(0, 8), user)
    await API.Actions.generateHandshakeAddress()
    await API.Actions.generateOrderAddress(user)
    await API.Actions.initWall()
    await API.Actions.setBio('A little bit about myself.', user)
    await API.Actions.setDefaultSeedProvider('', user)
    await API.Actions.setSeedServiceData('', user)
    await API.Actions.setCurrentStreamInfo('', user)
    return pub
  })
}

module.exports = {
  authenticate,
  logoff,
  isAuthenticated,
  isAuthenticating,
  isRegistering,
  register,
  getGun,
  getUser,
  mySEA,
  getMySecret,
  freshGun,
  $$__SHOCKWALLET__ENCRYPTED__
}
