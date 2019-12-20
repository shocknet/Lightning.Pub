// gunDB/index.js

const Action = require('../gunDB/action-constants.js')
const API = require('../gunDB/contact-api/index')
const Config = require('../gunDB/config')
const Event = require('../gunDB/event-constants')



/* .. etc */



/**
 * @format
 */
const Gun = require('gun')


/** @type {import('../gunDB/contact-api/SimpleGUN').ISEA} */
// @ts-ignore
const SEAx = require('gun/sea')

/** @type {import('../gunDB/contact-api/SimpleGUN').ISEA} */
const mySEA = {}

const $$__SHOCKWALLET__MSG__ = '$$__SHOCKWALLET__MSG__'
const $$__SHOCKWALLET__ENCRYPTED__ = '$$_SHOCKWALLET__ENCRYPTED__'



mySEA.encrypt = (msg, secret) => {
  if (typeof msg !== 'string') {
    throw new TypeError('mySEA.encrypt() -> expected msg to be an string')
  }

  if (msg.length === 0) {
    throw new TypeError(
      'mySEA.encrypt() -> expected msg to be a populated string'
    )
  }

  // Avoid this: https://github.com/amark/gun/issues/804 and any other issues
  const sanitizedMsg = $$__SHOCKWALLET__MSG__ + msg

  return SEAx.encrypt(sanitizedMsg, secret).then(encMsg => {
    return $$__SHOCKWALLET__ENCRYPTED__ + encMsg
  })
}

mySEA.decrypt = (encMsg, secret) => {
  if (typeof encMsg !== 'string') {
    throw new TypeError('mySEA.encrypt() -> expected encMsg to be an string')
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

    return decodedMsg.slice($$__SHOCKWALLET__MSG__.length)
  })
}

mySEA.secret = (recipientOrSenderEpub, recipientOrSenderSEA) => {
  if (recipientOrSenderEpub === recipientOrSenderSEA.pub) {
    throw new Error('Do not use pub for mysecret')
  }
  return SEAx.secret(recipientOrSenderEpub, recipientOrSenderSEA).then(sec => {
    if (typeof sec !== 'string') {
      throw new TypeError('Could not generate secret')
    }

    return sec
  })
}





/**
 * @typedef {import('../gunDB/contact-api/SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../gunDB/contact-api/SimpleGUN').UserGUNNode} UserGUNNode
 */

// TO DO: move to common repo
/**
 * @typedef {object} Emission
 * @prop {boolean} ok
 * @prop {any} msg
 * @prop {Record<string, any>} origBody
 */

// TO DO: move to common repo
/**
 * @typedef {object} SimpleSocket
 * @prop {(eventName: string, data: Emission) => void} emit
 * @prop {(eventName: string, handler: (data: any) => void) => void} on
 */

/* eslint-disable init-declarations */

/** @type {GUNNode} */
// @ts-ignore
let gun

/** @type {UserGUNNode} */
let user

/* eslint-enable init-declarations */

let _currentAlias = ''
let _currentPass = ''

let _isAuthenticating = false
let _isRegistering = false

const isAuthenticated = () => typeof user.is === 'object' && user.is !== null
const isAuthenticating = () => _isAuthenticating
const isRegistering = () => _isRegistering

/**
 * Returns a promise containing the public key of the newly created user.
 * @param {string} alias
 * @param {string} pass
 * @returns {Promise<string>}
 */
const authenticate = async (alias, pass) => {
  if (isAuthenticated()) {
    // move this to a subscription; implement off() ? todo
    API.Jobs.onAcceptedRequests(user, mySEA)
    return user._.sea.pub
  }

  if (isAuthenticating()) {
    throw new Error(
      'Cannot authenticate while another authentication attempt is going on'
    )
  }

  _isAuthenticating = true

  const ack = await new Promise(res => {
    user.auth(alias, pass, _ack => {
      res(_ack)
    })
  })

  _isAuthenticating = false

  if (typeof ack.err === 'string') {
    throw new Error(ack.err)
  } else if (typeof ack.sea === 'object') {
    API.Jobs.onAcceptedRequests(user, mySEA)

    const mySec = await mySEA.secret(user._.sea.epub, user._.sea)
    if (typeof mySec !== 'string') {
      throw new TypeError('mySec not an string')
    }

    _currentAlias = user.is ? user.is.alias : ''
    _currentPass = await mySEA.encrypt(pass, mySec)

    await new Promise(res => setTimeout(res, 5000))

    return ack.sea.pub
  } else {
    throw new Error('Unknown error.')
  }
}

const instantiateGun = async () => {
  let mySecret = ''

  if (user && user.is) {
    mySecret = /** @type {string} */ (await mySEA.secret(
      user._.sea.epub,
      user._.sea
    ))
  }
  if (typeof mySecret !== 'string') {
    throw new TypeError("typeof mySec !== 'string'")
  }

  const _gun = new Gun({
    axe: false,
    peers: Config.PEERS
  })

  // please typescript
  const __gun = /** @type {unknown} */ (_gun)

  gun = /** @type {GUNNode} */ (__gun)

  // eslint-disable-next-line require-atomic-updates
  user = gun.user()

  if (_currentAlias && _currentPass) {
    const pass = await mySEA.decrypt(_currentPass, mySecret)

    if (typeof pass !== 'string') {
      throw new Error('could not decrypt stored in memory current pass')
    }

    user.leave()

    await authenticate(_currentAlias, pass)
  }
}

instantiateGun()






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

  _isRegistering = true

  /** @type {import('../gunDB/contact-api/SimpleGUN').CreateAck} */
  const ack = await new Promise(res =>
    user.create(alias, pass, ack => res(ack))
  )

  _isRegistering = false

  const mySecret = await mySEA.secret(user._.sea.epub, user._.sea)
  if (typeof mySecret !== 'string') {
    throw new Error('Could not generate secret for user.')
  }

  if (typeof ack.err === 'string') {
    throw new Error(ack.err)
  } else if (typeof ack.pub === 'string') {
    _currentAlias = alias
    _currentPass = await mySEA.encrypt(pass, mySecret)
  } else {
    throw new Error('unknown error')
  }

  // restart instances so write to user graph work, there's an issue with gun
  // (at least on node) where after initial user creation, writes to user graph
  // don't work
  await instantiateGun()

  user.leave()

  return authenticate(alias, pass).then(async pub => {
    await API.Actions.setDisplayName('anon' + pub.slice(0, 8), user)
    await API.Actions.generateHandshakeAddress(user)
    return pub
  })
}



const getGun = () => {
  return gun
}

const getUser = () => {
  return user
}
const getMySEA = () =>{
  return mySEA;
}

module.exports = {
  Action,
  API,
  Config,
  Event,
  authenticate,
  isAuthenticated,
  isAuthenticating,
  isRegistering,
  register,
  instantiateGun,
  getGun,
  getUser,
  getMySEA
}