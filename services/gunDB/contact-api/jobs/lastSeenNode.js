/**
 * @format
 */

const logger = require('../../../../config/log')

const {
  Constants: {
    ErrorCode,
    Misc: { LAST_SEEN_NODE_INTERVAL }
  }
} = require('shock-common')
const Key = require('../key')

/**
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('../SimpleGUN').ListenerData} ListenerData
 * @typedef {import('../SimpleGUN').ISEA} ISEA
 * @typedef {import('../SimpleGUN').UserGUNNode} UserGUNNode
 */

/**
 * @param {UserGUNNode} user
 * @throws {Error} NOT_AUTH
 * @returns {void}
 */
const lastSeenNode = user => {
  if (!user.is) {
    logger.warn('onOrders() -> tried to sub without authing')
    throw new Error(ErrorCode.NOT_AUTH)
  }
  let gotLatestUserAck = true
  let gotLatestProfileAck = true

  setInterval(() => {
    if (!user.is) {
      return
    }
    if (!gotLatestUserAck) {
      logger.error(`lastSeenNode user job: didnt get latest ack`)
      return
    }
    gotLatestUserAck = false
    user.get(Key.LAST_SEEN_NODE).put(Date.now(), ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        logger.error(`Error inside lastSeenNode user job: ${ack.err}`)
      }
      gotLatestUserAck = true
    })
  }, LAST_SEEN_NODE_INTERVAL)
  setInterval(() => {
    if (!user.is) {
      return
    }
    if (!gotLatestProfileAck) {
      logger.error(`lastSeenNode profile job: didnt get latest ack`)
      return
    }
    gotLatestProfileAck = false
    user
      .get(Key.PROFILE)
      .get(Key.LAST_SEEN_NODE)
      .put(Date.now(), ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          logger.error(`Error inside lastSeenNode profile job: ${ack.err}`)
        }
        gotLatestProfileAck = true
      })
  }, LAST_SEEN_NODE_INTERVAL)
}

module.exports = lastSeenNode
