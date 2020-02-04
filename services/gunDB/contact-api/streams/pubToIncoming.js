/** @format */
const { INITIAL_MSG } = require('../actions')
const Schema = require('../schema')
const Key = require('../key')
const Utils = require('../utils')

/**
 * @typedef {import('../schema').ChatMessage} Message
 * @typedef {Record<string, Message[]|null|undefined>} Incomings
 * @typedef {(incomings: Incomings) => void} IncomingsListener
 */

/**
 * @type {Incomings}
 */
const currentPubToIncoming = {}

const getPubToIncoming = () => currentPubToIncoming

/** @type {Set<IncomingsListener>} */
const incomingsListeners = new Set()

const notifyIncomingsListeners = () => {
  incomingsListeners.forEach(l => l(currentPubToIncoming))
}

/** @type {Set<string>} */
const pubFeedPairsWithIncomingListeners = new Set()

let subbed = false

/**
 * @param {IncomingsListener} cb
 */
const onIncoming = cb => {
  incomingsListeners.add(cb)

  const user = require('../../Mediator').getUser()
  const SEA = require('../../Mediator').mySEA

  if (!subbed) {
    user.get(Key.USER_TO_INCOMING).open(uti => {
      if (typeof uti !== 'object' || uti === null) {
        return
      }

      Object.entries(uti).forEach(async ([pub, encFeed]) => {
        if (typeof encFeed !== 'string') {
          return
        }
        const ourSecret = await SEA.secret(
          await Utils.pubToEpub(pub),
          user._.sea
        )
        const mySecret = await Utils.mySecret()

        const feed = await SEA.decrypt(encFeed, mySecret)

        if (pubFeedPairsWithIncomingListeners.add(pub + '--' + feed)) {
          require('../../Mediator')
            .getGun()
            .user(pub)
            .get(Key.OUTGOINGS)
            .get(feed)
            .open(async data => {
              if (data === null) {
                currentPubToIncoming[pub] = null
                return
              }

              if (typeof data !== 'object') {
                return
              }

              if (typeof data.with !== 'string') {
                return
              }

              if (typeof data.messages !== 'object') {
                return
              }

              if (data.messages === null) {
                return
              }

              if (!Array.isArray(currentPubToIncoming[pub])) {
                currentPubToIncoming[pub] = [
                  {
                    body: INITIAL_MSG,
                    // hack one year
                    timestamp: Date.now() - 31556952,
                    id: Math.random().toString(),
                    outgoing: false
                  }
                ]
              }

              const msgs = /** @type {[string, Schema.Message][]} */ (Object.entries(
                data.messages
              ).filter(([_, msg]) => Schema.isMessage(msg)))

              // eslint-disable-next-line require-atomic-updates
              currentPubToIncoming[pub] = await Utils.asyncMap(
                msgs,
                async ([msgid, msg]) => {
                  let decryptedBody = ''

                  if (msg.body === INITIAL_MSG) {
                    decryptedBody = INITIAL_MSG
                  } else {
                    decryptedBody = await SEA.decrypt(msg.body, ourSecret)
                  }

                  /** @type {Schema.ChatMessage} */
                  const finalMsg = {
                    body: decryptedBody,
                    id: msgid,
                    outgoing: false,
                    timestamp: msg.timestamp
                  }

                  return finalMsg
                }
              )

              notifyIncomingsListeners()
            })
        }
      })
    })

    subbed = true
  }

  cb(getPubToIncoming())

  return () => {
    incomingsListeners.delete(cb)
  }
}

module.exports = {
  onIncoming,
  getPubToIncoming
}
