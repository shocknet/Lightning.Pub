/** @format */
const uuidv1 = require('uuid/v1')
const logger = require('winston')
const debounce = require('lodash/debounce')

const Schema = require('../schema')
const Key = require('../key')
const Utils = require('../utils')
/**
 * @typedef {import('../schema').ChatMessage} Message
 * @typedef {import('../SimpleGUN').OpenListenerData} OpenListenerData
 */

const PubToIncoming = require('./pubToIncoming')

/**
 * @typedef {Record<string, Message[]|null|undefined|'disconnected'>} Feeds
 * @typedef {(feeds: Feeds) => void} FeedsListener
 */

/** @type {Set<FeedsListener>} */
const feedsListeners = new Set()

/**
 * @type {Feeds}
 */
let pubToFeed = {}

const getPubToFeed = () => pubToFeed

feedsListeners.add(() => {
  logger.info(`new pubToFeed: ${JSON.stringify(getPubToFeed())}`)
})

/** @param {Feeds} ptf */
const setPubToFeed = ptf => {
  pubToFeed = ptf
  feedsListeners.forEach(l => {
    l(pubToFeed)
  })
}

/**
 * If at one point we subscribed to a feed, record it here. Keeps track of it
 * for unsubbing.
 *
 * Since we can't really unsub in GUN, what we do is that each listener created
 * checks the last incoming feed, if it was created for other feed that is not
 * the latest, it becomes inactive.
 * @type {Record<string, string|undefined|null>}
 */
const pubToLastIncoming = {}

/**
 * Any pub-feed pair listener will write its update id here when fired up. Avoid
 * race conditions between different listeners and between different invocations
 * of the same listener.
 * @type {Record<string, string>}
 */
const pubToLastUpdate = {}

/**
 * Performs a sub to a pub feed pair that will only emit if it is the last
 * subbed feed for that pub, according to `pubToLastIncoming`. This listener is
 * not in charge of writing to the cache.
 * @param {[ string , string ]} param0
 * @returns {(data: OpenListenerData) => void}
 */
const onOpenForPubFeedPair = ([pub, feed]) =>
  debounce(async data => {
    try {
      // did invalidate
      if (pubToLastIncoming[pub] !== feed) {
        return
      }

      if (
        // did disconnect
        data === null ||
        // interpret as disconnect
        typeof data !== 'object'
      ) {
        // invalidate this listener. If a reconnection happens it will be for a
        // different pub-feed pair.
        pubToLastIncoming[pub] = null
        setImmediate(() => {
          logger.info(
            `onOpenForPubFeedPair -> didDisconnect -> pub: ${pub} - feed: ${feed}`
          )
        })
        // signal disconnect to listeners listeners should rely on pubToFeed for
        // disconnect status instead of pub-to-incoming. Only the latter will
        // detect remote disconnection
        setPubToFeed({
          ...getPubToFeed(),
          [pub]: /** @type {'disconnected'} */ ('disconnected')
        })
        return
      }

      const incoming = /** @type {Schema.Outgoing} */ (data)

      // incomplete data, let's not assume anything
      if (
        typeof incoming.with !== 'string' ||
        typeof incoming.messages !== 'object'
      ) {
        return
      }

      /** @type {Schema.ChatMessage[]} */
      const newMsgs = Object.entries(incoming.messages)
        // filter out messages with incomplete data
        .filter(([_, msg]) => Schema.isMessage(msg))
        .map(([id, msg]) => {
          /** @type {Schema.ChatMessage} */
          const m = {
            // we'll decrypt later
            body: msg.body,
            id,
            outgoing: false,
            timestamp: msg.timestamp
          }

          return m
        })

      if (newMsgs.length === 0) {
        setPubToFeed({
          ...getPubToFeed(),
          [pub]: []
        })
        return
      }

      const thisUpdate = uuidv1()
      pubToLastUpdate[pub] = thisUpdate

      const user = require('../../Mediator').getUser()
      if (!user.is) {
        logger.warn('pubToFeed -> onOpenForPubFeedPair() -> user is not auth')
      }
      const SEA = require('../../Mediator').mySEA

      const ourSecret = await SEA.secret(await Utils.pubToEpub(pub), user._.sea)

      const decryptedMsgs = await Utils.asyncMap(newMsgs, async m => {
        /** @type {Schema.ChatMessage} */
        const decryptedMsg = {
          ...m,
          body: await SEA.decrypt(m.body, ourSecret)
        }

        return decryptedMsg
      })

      // this listener got invalidated while we were awaiting the async operations
      // above.
      if (pubToLastUpdate[pub] !== thisUpdate) {
        return
      }

      setPubToFeed({
        ...getPubToFeed(),
        [pub]: decryptedMsgs
      })
    } catch (err) {
      logger.warn(`error inside pub to pk-feed pair: ${pub} -- ${feed}`)
      logger.error(err)
    }
  }, 750)

const react = () => {
  const pubToIncoming = PubToIncoming.getPubToIncoming()

  const gun = require('../../Mediator').getGun()

  /** @type {Feeds} */
  const newPubToFeed = {}

  for (const [pub, inc] of Object.entries(pubToIncoming)) {
    /**
     * empty string -> null
     * @type {string|null}
     */
    const newIncoming = inc || null

    if (
      // if disconnected, the same incoming feed will try to overwrite the
      // nulled out pubToLastIncoming[pub] entry. Making the listener for that
      // pub feed pair fire up again, etc. Now. When the user disconnects from
      // this side of things. He will overwrite the pub to incoming with null.
      // Let's allow that.
      newIncoming === pubToLastIncoming[pub] &&
      !(pubToFeed[pub] === 'disconnected' && newIncoming === null)
    ) {
      // eslint-disable-next-line no-continue
      continue
    }

    // will invalidate stale listeners (a listener for an outdated incoming feed
    // id)
    pubToLastIncoming[pub] = newIncoming
    // Invalidate pending writes from stale listener(s) for the old incoming
    // address.
    pubToLastUpdate[pub] = uuidv1()
    newPubToFeed[pub] = newIncoming ? [] : null

    // sub to this incoming feed
    if (typeof newIncoming === 'string') {
      // perform sub to pub-incoming_feed pair
      // leave all of the sideffects from this for the next tick
      setImmediate(() => {
        gun
          .user(pub)
          .get(Key.OUTGOINGS)
          .get(newIncoming)
          .open(onOpenForPubFeedPair([pub, newIncoming]))
      })
    }
  }

  if (Object.keys(newPubToFeed).length > 0) {
    setPubToFeed({
      ...getPubToFeed(),
      ...newPubToFeed
    })
  }
}

let subbed = false

/**
 * Array.isArray(pubToFeed[pub]) means a Handshake is in place, look for
 * incoming  messages here.
 * pubToIncoming[pub] === null means a disconnection took place.
 * typeof pubToIncoming[pub] === 'undefined' means none of the above.
 * @param {FeedsListener} cb
 * @returns {() => void}
 */
const onPubToFeed = cb => {
  feedsListeners.add(cb)
  cb(getPubToFeed())

  if (!subbed) {
    PubToIncoming.onPubToIncoming(react)
    subbed = true
  }

  return () => {
    feedsListeners.delete(cb)
  }
}

module.exports = {
  getPubToFeed,
  setPubToFeed,
  onPubToFeed
}
