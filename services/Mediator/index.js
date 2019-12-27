/**
 * @typedef {object} SimpleSocket
 */
const debounce = require('lodash/debounce')
const once = require('lodash/once')
const gunDB = require('../gunDB')
const auth = require('../auth/auth')
const lndEvents = require('../lnd/event-constants')
// TO DO: Move this constant to common repo
const IS_GUN_AUTH = 'IS_GUN_AUTH'

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


class Mediator {
  /**
   * @param {Readonly<SimpleSocket>} socket
   * @param {{registerInvoiceListener(listener: any): void; 
   *          unregisterInvoiceListener(listener: any): void;
   *          registerTransactionsListener(listener: any): void;
   *          unregisterTransactionsListener(listener: any): void;}} lnd
   */
  constructor(socket,lnd) {
    this.socket = socket
    this.lnd = lnd
    this.connected = true

    socket.on('disconnect', this.onDisconnect)

    socket.on(gunDB.Action.ACCEPT_REQUEST, this.acceptRequest)
    socket.on(gunDB.Action.BLACKLIST, this.blacklist)
    socket.on(gunDB.Action.GENERATE_NEW_HANDSHAKE_NODE, this.generateHandshakeNode)
    socket.on(gunDB.Action.SEND_HANDSHAKE_REQUEST, this.sendHandshakeRequest)
    socket.on(
      gunDB.Action.SEND_HANDSHAKE_REQUEST_WITH_INITIAL_MSG,
      this.sendHRWithInitialMsg
    )
    socket.on(gunDB.Action.SEND_MESSAGE, this.sendMessage)
    socket.on(gunDB.Action.SET_AVATAR, this.setAvatar)
    socket.on(gunDB.Action.SET_DISPLAY_NAME, this.setDisplayName)

    socket.on(gunDB.Event.ON_AVATAR, this.onAvatar)
    socket.on(gunDB.Event.ON_BLACKLIST, this.onBlacklist)
    socket.on(gunDB.Event.ON_CHATS, this.onChats)
    socket.on(gunDB.Event.ON_DISPLAY_NAME, this.onDisplayName)
    socket.on(gunDB.Event.ON_HANDSHAKE_ADDRESS, this.onHandshakeAddress)
    socket.on(gunDB.Event.ON_RECEIVED_REQUESTS, this.onReceivedRequests)
    socket.on(gunDB.Event.ON_SENT_REQUESTS, this.onSentRequests)

    socket.on(IS_GUN_AUTH, this.isGunAuth)

    socket.on(lndEvents.ON_INVOICE,this.onLndInvoice)
    socket.on(lndEvents.ON_TRANSACTION,this.onLndTransaction)
  }
  /**
   * @param {object} body
   */
  onLndTransaction = async body =>{
    console.log("got lnd transaction request")
    let {token} = JSON.parse(body)
    await throwOnInvalidToken(token)
    const listener = {
      dataReceived : transactionData =>{
        this.socket.emit(lndEvents.ON_TRANSACTION,transactionData)
      }
    }
    this.lnd.registerTransactionsListener(listener)
  }
  /**
   * @param {object} body
   */
  onLndInvoice = async body =>{
    let {token} = JSON.parse(body)
    await throwOnInvalidToken(token)
    //this.socket.emit(lndEvents.ON_INVOICE,{swaaag:"looool"})
    /**
     * @typedef {{memo:string,settle_date:number, settled:boolean}} LndInvoiceData
     * @typedef {{dataReceived(data:LndInvoiceData):void}} Listener
     */
    /**
     * @param {Listener} listener
     */
    const listener = {
      /**
       * @param {LndInvoiceData} lndInvoiceData
       */
      dataReceived : (lndInvoiceData)=>{
        this.socket.emit(lndEvents.ON_INVOICE,lndInvoiceData)
      }
    }
    this.lnd.registerInvoiceListener(listener)
  }

  isGunAuth = () => {
    try {
      const isGunAuth = gunDB.isAuthenticated()

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

      await gunDB.API.Actions.acceptRequest(
        requestID, 
        gunDB.getGun(), 
        gunDB.getUser(), 
        gunDB.getMySEA()
      )

      this.socket.emit(gunDB.Action.ACCEPT_REQUEST, {
        ok: true,
        msg: null,
        origBody: body
      })

      // refresh received requests
      gunDB.API.Events.onSimplerReceivedRequests(
        debounce(
          once(receivedRequests => {
            if (gunDB.Config.SHOW_LOG) {
              console.log('---received requests---')
              console.log(receivedRequests)
              console.log('-----------------------')
            }

            this.socket.emit(gunDB.Event.ON_RECEIVED_REQUESTS, {
              msg: receivedRequests,
              ok: true,
              origBody: body
            })
          }),
          300
        ),
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.ACCEPT_REQUEST, {
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

      await gunDB.API.Actions.blacklist(publicKey, gunDB.getUser())

      this.socket.emit(gunDB.Action.BLACKLIST, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.BLACKLIST, {
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

      await gunDB.API.Actions.generateHandshakeAddress(gunDB.getUser())

      this.socket.emit(gunDB.Action.GENERATE_NEW_HANDSHAKE_NODE, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.GENERATE_NEW_HANDSHAKE_NODE, {
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
      if (gunDB.Config.SHOW_LOG) {
        console.log('\n')
        console.log('------------------------------')
        console.log('will now try to send a handshake request')
        console.log('------------------------------')
        console.log('\n')
      }

      const { recipientPublicKey, token } = body

      await throwOnInvalidToken(token)

      await gunDB.API.Actions.sendHandshakeRequest(
        recipientPublicKey,
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )

      if (gunDB.Config.SHOW_LOG) {
        console.log('\n')
        console.log('------------------------------')
        console.log('handshake request successfuly sent')
        console.log('------------------------------')
        console.log('\n')
      }

      this.socket.emit(gunDB.Action.SEND_HANDSHAKE_REQUEST, {
        ok: true,
        msg: null,
        origBody: body
      })

      gunDB.API.Events.onSimplerSentRequests(
        debounce(
          once(srs => {
            this.socket.emit(gunDB.Event.ON_SENT_REQUESTS, {
              ok: true,
              msg: srs,
              origBody: body
            })
          }),
          350
        ),
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )
    } catch (err) {
      if (gunDB.Config.SHOW_LOG) {
        console.log('\n')
        console.log('------------------------------')
        console.log('handshake request send fail: ' + err.message)
        console.log('------------------------------')
        console.log('\n')
      }

      this.socket.emit(gunDB.Action.SEND_HANDSHAKE_REQUEST, {
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

      await gunDB.API.Actions.sendHRWithInitialMsg(
        initialMsg,
        recipientPublicKey,
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )

      this.socket.emit(gunDB.Action.SEND_HANDSHAKE_REQUEST_WITH_INITIAL_MSG, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.SEND_HANDSHAKE_REQUEST_WITH_INITIAL_MSG, {
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

      await gunDB.API.Actions.sendMessage(recipientPublicKey, body, gunDB.getUser(), gunDB.getMySEA())

      this.socket.emit(gunDB.Action.SEND_MESSAGE, {
        ok: true,
        msg: null,
        origBody: reqBody
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.SEND_MESSAGE, {
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

      await gunDB.API.Actions.setAvatar(avatar, gunDB.getUser())

      this.socket.emit(gunDB.Action.SET_AVATAR, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.SET_AVATAR, {
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

      await gunDB.API.Actions.setDisplayName(displayName, gunDB.getUser())

      this.socket.emit(gunDB.Action.SET_DISPLAY_NAME, {
        ok: true,
        msg: null,
        origBody: body
      })
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Action.SET_DISPLAY_NAME, {
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

      gunDB.API.Events.onAvatar(avatar => {
        if (gunDB.Config.SHOW_LOG) {
          console.log('---avatar---')
          console.log(avatar)
          console.log('-----------------------')
        }

        this.socket.emit(gunDB.Event.ON_AVATAR, {
          msg: avatar,
          ok: true,
          origBody: body
        })
      }, gunDB.getUser())
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_AVATAR, {
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

      gunDB.API.Events.onBlacklist(blacklist => {
        if (gunDB.Config.SHOW_LOG) {
          console.log('---blacklist---')
          console.log(blacklist)
          console.log('-----------------------')
        }

        this.socket.emit(gunDB.Event.ON_BLACKLIST, {
          msg: blacklist,
          ok: true,
          origBody: body
        })
      }, gunDB.getUser())
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_BLACKLIST, {
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

      await throwOnInvalidToken(token)

      gunDB.API.Events.onChats(
        chats => {
          if (gunDB.Config.SHOW_LOG) {
            console.log('---chats---')
            console.log(chats)
            console.log('-----------------------')
          }

          this.socket.emit(gunDB.Event.ON_CHATS, {
            msg: chats,
            ok: true,
            origBody: body
          })
        },
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_CHATS, {
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

      gunDB.API.Events.onDisplayName(displayName => {
        if (gunDB.Config.SHOW_LOG) {
          console.log('---displayName---')
          console.log(displayName)
          console.log('-----------------------')
        }

        this.socket.emit(gunDB.Event.ON_DISPLAY_NAME, {
          msg: displayName,
          ok: true,
          origBody: body
        })
      }, gunDB.getUser())
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_DISPLAY_NAME, {
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

      gunDB.API.Events.onCurrentHandshakeAddress(addr => {
        if (gunDB.Config.SHOW_LOG) {
          console.log('---addr---')
          console.log(addr)
          console.log('-----------------------')
        }

        this.socket.emit(gunDB.Event.ON_HANDSHAKE_ADDRESS, {
          ok: true,
          msg: addr,
          origBody: body
        })
      }, gunDB.getUser())
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_HANDSHAKE_ADDRESS, {
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

      gunDB.API.Events.onSimplerReceivedRequests(
        receivedRequests => {
          if (gunDB.Config.SHOW_LOG) {
            console.log('---receivedRequests---')
            console.log(receivedRequests)
            console.log('-----------------------')
          }

          this.socket.emit(gunDB.Event.ON_RECEIVED_REQUESTS, {
            msg: receivedRequests,
            ok: true,
            origBody: body
          })
        },
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_RECEIVED_REQUESTS, {
        msg: err.message,
        ok: false,
        origBody: body
      })
    }
  }

  /**
   * @param {Readonly<{ token: string }>} body
   */
  onSentRequests = async body => {
    try {
      const { token } = body

      await throwOnInvalidToken(token)

      await gunDB.API.Events.onSimplerSentRequests(
        sentRequests => {
          if (gunDB.Config.SHOW_LOG) {
            console.log('---sentRequests---')
            console.log(sentRequests)
            console.log('-----------------------')
          }

          this.socket.emit(gunDB.Event.ON_SENT_REQUESTS, {
            msg: sentRequests,
            ok: true,
            origBody: body
          })
        },
        gunDB.getGun(),
        gunDB.getUser(),
        gunDB.getMySEA()
      )
    } catch (err) {
      console.log(err)
      this.socket.emit(gunDB.Event.ON_SENT_REQUESTS, {
        msg: err.message,
        ok: false,
        origBody: body
      })
    }
  }
}

/**
 * @param {SimpleSocket} socket
 * @param {object} lnd
 * @throws {Error} If gun is not authenticated or is in the process of
 * authenticating. Use `isAuthenticating()` and `isAuthenticated()` to check for
 * this first.
 * @returns {Mediator}
 */
const createMediator = (socket,lnd) => {
  // if (isAuthenticating() || !isAuthenticated()) {
  //   throw new Error("Gun must be authenticated to create a Mediator");
  // }

  return new Mediator(socket,lnd)
}
module.exports = {createMediator}