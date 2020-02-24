/**
 * @format
 */
const Gun = require('gun')
// @ts-ignore
Gun.log = () => {}
// @ts-ignore
require('gun/lib/open')
const debounce = require('lodash/debounce')
const Encryption = require('../../../utils/encryptionStore')
const logger = require('winston')

/** @type {import('../contact-api/SimpleGUN').ISEA} */
// @ts-ignore
const SEAx = require('gun/sea')

/** @type {import('../contact-api/SimpleGUN').ISEA} */
const mySEA = {}

const $$__SHOCKWALLET__MSG__ = '$$__SHOCKWALLET__MSG__'
const $$__SHOCKWALLET__ENCRYPTED__ = '$$_SHOCKWALLET__ENCRYPTED__'

// TO DO: Move this constant to common repo
const IS_GUN_AUTH = 'IS_GUN_AUTH'

mySEA.encrypt = (msg, secret) => {
  if (typeof msg !== 'string') {
    throw new TypeError(
      'mySEA.encrypt() -> expected msg to be an string instead got: ' +
        typeof msg
    )
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

    return decodedMsg.slice($$__SHOCKWALLET__MSG__.length)
  })
}

mySEA.secret = (recipientOrSenderEpub, recipientOrSenderSEA) => {
  if (typeof recipientOrSenderEpub !== 'string') {
    throw new TypeError('epub has to be an string')
  }
  if (typeof recipientOrSenderSEA !== 'object') {
    throw new TypeError('sea has to be an object')
  }
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

const auth = require('../../auth/auth')

const Action = require('../action-constants.js')
const API = require('../contact-api/index')
const Config = require('../config')
const Event = require('../event-constants')
// const { nonEncryptedRoutes } = require('../../../utils/protectedRoutes')

/**
 * @typedef {import('../contact-api/SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../contact-api/SimpleGUN').UserGUNNode} UserGUNNode
 */

// TO DO: move to common repo
/**
 * @typedef {object} Emission
 * @prop {boolean} ok
 * @prop {any} msg
 * @prop {Record<string, any>} origBody
 */

/**
 * @typedef {object} EncryptedEmission
 * @prop {string} encryptedData
 * @prop {string} encryptedKey
 * @prop {string} iv
 */

// TO DO: move to common repo
/**
 * @typedef {object} SimpleSocket
 * @prop {(eventName: string, data: Emission|EncryptedEmission) => void} emit
 * @prop {(eventName: string, handler: (data: any) => void) => void} on
 * @prop {{ query: { 'x-shockwallet-device-id': string }}} handshake
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

let mySec = ''

/** @returns {string} */
const getMySecret = () => mySec

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
    const currAlias = user.is && user.is.alias
    if (alias !== currAlias) {
      throw new Error(
        `Tried to re-authenticate with an alias different to that of stored one, tried: ${alias} - stored: ${currAlias}, logoff first if need to change aliases.`
      )
    }
    // move this to a subscription; implement off() ? todo
    API.Jobs.onAcceptedRequests(user, mySEA)
    API.Jobs.onOrders(user, gun, mySEA)
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
    mySec = await mySEA.secret(user._.sea.epub, user._.sea)

    _currentAlias = user.is ? user.is.alias : ''
    _currentPass = await mySEA.encrypt(pass, mySec)

    await new Promise(res => setTimeout(res, 5000))

    API.Jobs.onAcceptedRequests(user, mySEA)
    API.Jobs.onOrders(user, gun, mySEA)

    return ack.sea.pub
  } else {
    throw new Error('Unknown error.')
  }
}

const logoff = () => {
  user.leave()
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
 * @param {string} token
 * @returns {Promise<boolean>}
 */
const isValidToken = async token => {
  const validation = await auth.validateToken(token)

  if (typeof validation !== 'object') {
    return false
  }

  if (validation === null) {
    return false
  }

  if (typeof validation.valid !== 'boolean') {
    return false
  }

  return validation.valid
}

/**
 * @param {string} token
 * @throws {Error} If the token is invalid
 * @returns {Promise<void>}
 */
const throwOnInvalidToken = async token => {
  const isValid = await isValidToken(token)

  if (!isValid) {
    throw new Error('Token expired.')
  }
}

const getGun = () => {
  return gun
}

const getUser = () => {
  return user
}

class Mediator {
  /**
   * @param {Readonly<SimpleSocket>} socket
   */
  constructor(socket) {
    this.socket = this.encryptSocketInstance(socket)

    this.connected = true

    this.socket.on('disconnect', this.onDisconnect)

    this.socket.on(Action.ACCEPT_REQUEST, this.acceptRequest)
    this.socket.on(Action.BLACKLIST, this.blacklist)
    this.socket.on(
      Action.GENERATE_NEW_HANDSHAKE_NODE,
      this.generateHandshakeNode
    )
    this.socket.on(Action.SEND_HANDSHAKE_REQUEST, this.sendHandshakeRequest)
    this.socket.on(
      Action.SEND_HANDSHAKE_REQUEST_WITH_INITIAL_MSG,
      this.sendHRWithInitialMsg
    )
    this.socket.on(Action.SEND_MESSAGE, this.sendMessage)
    this.socket.on(Action.SET_AVATAR, this.setAvatar)
    this.socket.on(Action.SET_DISPLAY_NAME, this.setDisplayName)
    this.socket.on(Action.SEND_PAYMENT, this.sendPayment)
    this.socket.on(Action.SET_BIO, this.setBio)
    this.socket.on(Action.DISCONNECT, this.disconnect)

    this.socket.on(Event.ON_AVATAR, this.onAvatar)
    this.socket.on(Event.ON_BLACKLIST, this.onBlacklist)
    this.socket.on(Event.ON_CHATS, this.onChats)
    this.socket.on(Event.ON_DISPLAY_NAME, this.onDisplayName)
    this.socket.on(Event.ON_HANDSHAKE_ADDRESS, this.onHandshakeAddress)
    this.socket.on(Event.ON_RECEIVED_REQUESTS, this.onReceivedRequests)
    this.socket.on(Event.ON_SENT_REQUESTS, this.onSentRequests)
    this.socket.on(Event.ON_BIO, this.onBio)
    this.socket.on(Event.ON_SEED_BACKUP, this.onSeedBackup)

    this.socket.on(IS_GUN_AUTH, this.isGunAuth)

    this.socket.on('SET_LAST_SEEN_APP', async body => {
      try {
        await throwOnInvalidToken(body.token)
        await new Promise((res, rej) => {
          getUser()
            .get('lastSeenApp')
            .put(Date.now(), ack => {
              if (ack.err) {
                rej(new Error(ack.err))
              } else {
                res()
              }
            })
        })
        this.socket.emit('SET_LAST_SEEN_APP', {
          ok: true,
          msg: null,
          origBody: body
        })
      } catch (e) {
        this.socket.emit('SET_LAST_SEEN_APP', {
          ok: false,
          msg: e.message,
          origBody: body
        })
      }
    })
  }

  /** @param {SimpleSocket} socket */
  encryptSocketInstance = socket => {
    return {
      /**
       * @type {SimpleSocket['on']}
       */
      on: (eventName, cb) => {
        const deviceId = socket.handshake.query['x-shockwallet-device-id']
        socket.on(eventName, _data => {
          try {
            if (Encryption.isNonEncrypted(eventName)) {
              return cb(_data)
            }

            if (!_data) {
              return cb(_data)
            }

            let data = _data

            if (!deviceId) {
              const error = {
                field: 'deviceId',
                message: 'Please specify a device ID'
              }
              console.error(error)
              return false
            }

            if (!Encryption.isAuthorizedDevice({ deviceId })) {
              const error = {
                field: 'deviceId',
                message: 'Please specify a device ID'
              }
              console.error('Unknown Device', error)
              return false
            }
            if (typeof data === 'string') {
              data = JSON.parse(data)
            }
            const decryptedKey = Encryption.decryptKey({
              deviceId,
              message: data.encryptedKey
            })
            const decryptedMessage = Encryption.decryptMessage({
              message: data.encryptedData,
              key: decryptedKey,
              iv: data.iv
            })
            const decryptedData = JSON.parse(decryptedMessage)
            return cb(decryptedData)
          } catch (err) {
            console.error(err)
            return false
          }
        })
      },
      /** @type {SimpleSocket['emit']} */
      emit: (eventName, data) => {
        try {
          if (Encryption.isNonEncrypted(eventName)) {
            socket.emit(eventName, data)
            return
          }

          const deviceId = socket.handshake.query['x-shockwallet-device-id']
          const authorized = Encryption.isAuthorizedDevice({ deviceId })
          const encryptedMessage = authorized
            ? Encryption.encryptMessage({
                message: data,
                deviceId
              })
            : data

          socket.emit(eventName, encryptedMessage)
        } catch (err) {
          logger.error(err.message)
          console.error(err)
        }
      }
    }
  }

  isGunAuth = () => {
    try {
      const isGunAuth = isAuthenticated()

      this.socket.emit(IS_GUN_AUTH, {
        ok: true,
        msg: {
          isGunAuth
        },
        origBody: {}
      })
    } catch (err) {
      this.socket.emit(IS_GUN_AUTH, {
        ok: false,
        msg: err.message,
        origBody: {}
      })
    }
  }

  /**
   * @param {Readonly<{ requestID: string , token: string }>} body
   */
  acceptRequest = async body => {
    try {
      const { requestID, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.acceptRequest(requestID, gun, user, mySEA)

      this.socket.emit(Action.ACCEPT_REQUEST, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.ACCEPT_REQUEST, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ publicKey: string , token: string }>} body
   */
  blacklist = async body => {
    try {
      const { publicKey, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.blacklist(publicKey, user)

      this.socket.emit(Action.BLACKLIST, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.BLACKLIST, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  onDisconnect = () => {
    this.connected = false
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  generateHandshakeNode = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      await API.Actions.generateHandshakeAddress()

      this.socket.emit(Action.GENERATE_NEW_HANDSHAKE_NODE, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.GENERATE_NEW_HANDSHAKE_NODE, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ recipientPublicKey: string , token: string }>} body
   */
  sendHandshakeRequest = async body => {
    try {
      if (Config.SHOW_LOG) {
        console.log('\n')
        console.log('------------------------------')
        console.log('will now try to send a handshake request')
        console.log('------------------------------')
        console.log('\n')
      }

      const { recipientPublicKey, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.sendHandshakeRequest(
        recipientPublicKey,
        gun,
        user,
        mySEA
      )

      if (Config.SHOW_LOG) {
        console.log('\n')
        console.log('------------------------------')
        console.log('handshake request successfuly sent')
        console.log('------------------------------')
        console.log('\n')
      }

      this.socket.emit(Action.SEND_HANDSHAKE_REQUEST, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      if (Config.SHOW_LOG) {
        console.log('\n')
        console.log('------------------------------')
        console.log('handshake request send fail: ' + err.message)
        console.log('------------------------------')
        console.log('\n')
      }

      this.socket.emit(Action.SEND_HANDSHAKE_REQUEST, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ initialMsg: string , recipientPublicKey: string , token: string }>} body
   */
  sendHRWithInitialMsg = async body => {
    try {
      const { initialMsg, recipientPublicKey, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.sendHRWithInitialMsg(
        initialMsg,
        recipientPublicKey,
        gun,
        user,
        mySEA
      )

      this.socket.emit(Action.SEND_HANDSHAKE_REQUEST_WITH_INITIAL_MSG, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.SEND_HANDSHAKE_REQUEST_WITH_INITIAL_MSG, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ body: string , recipientPublicKey: string , token: string }>} reqBody
   */
  sendMessage = async reqBody => {
    try {
      const { body, recipientPublicKey, token } = reqBody

      await throwOnInvalidToken(token)

      await API.Actions.sendMessage(recipientPublicKey, body, user, mySEA)

      this.socket.emit(Action.SEND_MESSAGE, {
        ok: true,
        msg: null,
        origBody: reqBody
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.SEND_MESSAGE, {
        ok: false,
        msg: err.message,
        origBody: reqBody
      })
    }
  }

  /**
   * @param {Readonly<{ uuid: string, recipientPub: string, amount: number, memo: string, token: string }>} reqBody
   */
  sendPayment = async reqBody => {
    try {
      const { recipientPub, amount, memo, token } = reqBody

      await throwOnInvalidToken(token)

      await API.Actions.sendPayment(
        recipientPub,
        amount,
        memo,
        gun,
        user,
        mySEA
      )

      this.socket.emit(Action.SEND_PAYMENT, {
        ok: true,
        msg: null,
        origBody: reqBody
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.SEND_PAYMENT, {
        ok: false,
        msg: err.message,
        origBody: reqBody
      })
    }
  }

  /**
   * @param {Readonly<{ avatar: string|null , token: string }>} body
   */
  setAvatar = async body => {
    try {
      const { avatar, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.setAvatar(avatar, user)

      this.socket.emit(Action.SET_AVATAR, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.SET_AVATAR, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ displayName: string , token: string }>} body
   */
  setDisplayName = async body => {
    try {
      const { displayName, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.setDisplayName(displayName, user)

      this.socket.emit(Action.SET_DISPLAY_NAME, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.SET_DISPLAY_NAME, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  //////////////////////////////////////////////////////////////////////////////

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onAvatar = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      API.Events.onAvatar(avatar => {
        if (Config.SHOW_LOG) {
          console.log('---avatar---')
          console.log(avatar)
          console.log('-----------------------')
        }

        this.socket.emit(Event.ON_AVATAR, {
          msg: avatar,
          ok: true,
          origBody: body
        })
      }, user)
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_AVATAR, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onBlacklist = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      API.Events.onBlacklist(blacklist => {
        if (Config.SHOW_LOG) {
          console.log('---blacklist---')
          console.log(blacklist)
          console.log('-----------------------')
        }

        this.socket.emit(Event.ON_BLACKLIST, {
          msg: blacklist,
          ok: true,
          origBody: body
        })
      }, user)
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_BLACKLIST, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onChats = async body => {
    try {
      const { token } = body

      // console.log('ON_CHATS', body)

      await throwOnInvalidToken(token)

      API.Events.onChats(chats => {
        if (Config.SHOW_LOG) {
          console.log('---chats---')
          console.log(chats)
          console.log('-----------------------')
        }

        this.socket.emit(Event.ON_CHATS, {
          msg: chats,
          ok: true,
          origBody: body
        })
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_CHATS, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onDisplayName = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      API.Events.onDisplayName(displayName => {
        if (Config.SHOW_LOG) {
          console.log('---displayName---')
          console.log(displayName)
          console.log('-----------------------')
        }

        this.socket.emit(Event.ON_DISPLAY_NAME, {
          msg: displayName,
          ok: true,
          origBody: body
        })
      }, user)
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_DISPLAY_NAME, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onHandshakeAddress = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      API.Events.onCurrentHandshakeAddress(addr => {
        if (Config.SHOW_LOG) {
          console.log('---addr---')
          console.log(addr)
          console.log('-----------------------')
        }

        this.socket.emit(Event.ON_HANDSHAKE_ADDRESS, {
          ok: true,
          msg: addr,
          origBody: body
        })
      }, user)
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_HANDSHAKE_ADDRESS, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onReceivedRequests = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      API.Events.onSimplerReceivedRequests(receivedRequests => {
        if (Config.SHOW_LOG) {
          // console.log('---receivedRequests---')
          // console.log(receivedRequests)
          // console.log('-----------------------')
        }

        this.socket.emit(Event.ON_RECEIVED_REQUESTS, {
          msg: receivedRequests,
          ok: true,
          origBody: body
        })
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_RECEIVED_REQUESTS, {
        msg: err.message,
        ok: false,
        origBody: body
      })
    }
  }

  onSentRequestsSubbed = false

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onSentRequests = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      if (!this.onSentRequestsSubbed) {
        this.onSentRequestsSubbed = true

        API.Events.onSimplerSentRequests(
          debounce(sentRequests => {
            // console.log(
            //   `new Reqss in mediator: ${JSON.stringify(sentRequests)}`
            // )
            this.socket.emit(Event.ON_SENT_REQUESTS, {
              msg: sentRequests,
              ok: true,
              origBody: body
            })
          }, 1000)
        )
      }
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_SENT_REQUESTS, {
        msg: err.message,
        ok: false,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onBio = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      API.Events.onBio(bio => {
        this.socket.emit(Event.ON_BIO, {
          msg: bio,
          ok: true,
          origBody: body
        })
      }, user)
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_BIO, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ bio: string|null , token: string }>} body
   */
  setBio = async body => {
    try {
      const { bio, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.setBio(bio, user)

      this.socket.emit(Action.SET_BIO, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(Action.SET_BIO, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onSeedBackup = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      await API.Events.onSeedBackup(
        seedBackup => {
          this.socket.emit(Event.ON_SEED_BACKUP, {
            ok: true,
            msg: seedBackup,
            origBody: body
          })
        },
        user,
        mySEA
      )
    } catch (err) {
      console.log(err)
      this.socket.emit(Event.ON_SEED_BACKUP, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
  }

  /** @param {Readonly<{ pub: string, token: string }>} body */
  disconnect = async body => {
    try {
      const { pub, token } = body

      await throwOnInvalidToken(token)

      await API.Actions.disconnect(pub)

      this.socket.emit(Action.DISCONNECT, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      this.socket.emit(Action.DISCONNECT, {
        ok: false,
        msg: err.message,
        origBody: body
      })
    }
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

  _isRegistering = true

  /** @type {import('../contact-api/SimpleGUN').CreateAck} */
  const ack = await new Promise(res =>
    user.create(alias, pass, ack => res(ack))
  )

  _isRegistering = false

  if (typeof ack.err === 'string') {
    throw new Error(ack.err)
  } else if (typeof ack.pub === 'string') {
    const mySecret = await mySEA.secret(user._.sea.epub, user._.sea)
    _currentAlias = alias
    _currentPass = await mySEA.encrypt(pass, mySecret)
  } else {
    throw new Error('unknown error, ack: ' + JSON.stringify(ack))
  }

  // restart instances so write to user graph work, there's an issue with gun
  // (at least on node) where after initial user creation, writes to user graph
  // don't work
  await instantiateGun()

  user.leave()

  return authenticate(alias, pass).then(async pub => {
    await API.Actions.setDisplayName('anon' + pub.slice(0, 8), user)
    await API.Actions.generateHandshakeAddress()
    await API.Actions.generateOrderAddress(user)
    return pub
  })
}

/**
 * @param {SimpleSocket} socket
 * @throws {Error} If gun is not authenticated or is in the process of
 * authenticating. Use `isAuthenticating()` and `isAuthenticated()` to check for
 * this first.
 * @returns {Mediator}
 */
const createMediator = socket => {
  // if (isAuthenticating() || !isAuthenticated()) {
  //   throw new Error("Gun must be authenticated to create a Mediator");
  // }

  return new Mediator(socket)
}

module.exports = {
  authenticate,
  logoff,
  createMediator,
  isAuthenticated,
  isAuthenticating,
  isRegistering,
  register,
  instantiateGun,
  getGun,
  getUser,
  mySEA,
  getMySecret
}
