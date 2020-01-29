/** @format */
const { INITIAL_MSG } = require('./actions')
const Key = require('./key')
const Schema = require('./schema')
const Utils = require('./utils')
/**
 * @typedef {Record<string, string|null|undefined>} Avatars
 * @typedef {(avatars: Avatars) => void} AvatarListener
 */

/** @type {Avatars} */
const pubToAvatar = {}

/** @type {Set<AvatarListener>} */
const avatarListeners = new Set()

const notifyAvatarListeners = () => {
  avatarListeners.forEach(l => l(pubToAvatar))
}

/** @type {Set<string>} */
const pubsWithAvatarListeners = new Set()

/**
 * @param {AvatarListener} cb
 * @param {string=} pub
 */
const onAvatar = (cb, pub) => {
  avatarListeners.add(cb)
  cb(pubToAvatar)
  if (pub && pubsWithAvatarListeners.add(pub)) {
    require('../Mediator')
      .getGun()
      .user(pub)
      .get(Key.PROFILE)
      .get(Key.AVATAR)
      .on(av => {
        if (typeof av === 'string' || av === null) {
          pubToAvatar[pub] = av || null
        } else {
          pubToAvatar[pub] = null
        }
        notifyAvatarListeners()
      })
  }
  return () => {
    avatarListeners.delete(cb)
  }
}

/**
 * @typedef {Record<string, string|null|undefined>} DisplayNames
 * @typedef {(avatars: Avatars) => void} DisplayNameListener
 */

/** @type {DisplayNames} */
const pubToDisplayName = {}

/** @type {Set<DisplayNameListener>} */
const displayNameListeners = new Set()

const notifyDisplayNameListeners = () => {
  displayNameListeners.forEach(l => l(pubToDisplayName))
}

/** @type {Set<string>} */
const pubsWithDisplayNameListeners = new Set()

/**
 * @param {DisplayNameListener} cb
 * @param {string=} pub
 */
const onDisplayName = (cb, pub) => {
  displayNameListeners.add(cb)
  cb(pubToDisplayName)
  if (pub && pubsWithDisplayNameListeners.add(pub)) {
    require('../Mediator')
      .getGun()
      .user(pub)
      .get(Key.PROFILE)
      .get(Key.DISPLAY_NAME)
      .on(dn => {
        if (typeof dn === 'string' || dn === null) {
          pubToDisplayName[pub] = dn || null
        } else {
          pubToDisplayName
        }
        notifyDisplayNameListeners()
      })
  }
  return () => {
    displayNameListeners.delete(cb)
  }
}

/**
 * @typedef {import('./schema').ChatMessage[]} Message
 * @typedef {Record<string, Message|null>} Incomings
 * @typedef {(incomings: Incomings) => void} IncomingsListener
 */

/**
 * @type {Incomings}
 */
const pubToIncoming = {}

/** @type {Set<IncomingsListener>} */
const incomingsListeners = new Set()

const notifyIncomingsListeners = () => {
  incomingsListeners.forEach(l => l(pubToIncoming))
}

/** @type {Set<string>} */
const pubFeedPairsWithIncomingListeners = new Set()

/**
 * @param {IncomingsListener} cb
 */
const onIncoming = cb => {
  incomingsListeners.add(cb)

  const user = require('../Mediator').getUser()
  const SEA = require('../Mediator').mySEA

  user.get(Key.USER_TO_INCOMING).open(uti => {
    if (typeof uti !== 'object' || uti === null) {
      return
    }

    Object.entries(uti).forEach(async ([pub, feed]) => {
      if (typeof feed !== 'string') {
        return
      }

      if (pubFeedPairsWithIncomingListeners.add(pub + '--' + feed)) {
        const ourSecret = await SEA.secret(
          await Utils.pubToEpub(pub),
          user._.sea
        )

        require('../Mediator')
          .getGun()
          .user(pub)
          .get(Key.OUTGOINGS)
          .get(feed)
          .open(async data => {
            if (data === null) {
              pubToIncoming[pub] = null
              return
            }

            if (!Schema.isOutgoing(data)) {
              return
            }

            // eslint-disable-next-line require-atomic-updates
            pubToIncoming[pub] = await Utils.asyncMap(
              Object.entries(data.messages),
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

  return () => {
    incomingsListeners.delete(cb)
  }
}

module.exports = {
  onAvatar,
  onDisplayName,
  onIncoming
}
