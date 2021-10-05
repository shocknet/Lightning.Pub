/**
 * @format
 */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const Gun = require('gun')
require('gun/nts')
require('gun/lib/load')

const logger = require('../../config/log')

let dead = false

/**
 * @param {any} msg
 */
const sendMsg = msg => {
  if (dead) {
    return
  }
  if (process.send) {
    process.send(msg)
  } else {
    logger.error(
      'Fatal error: Could not send a message from inside the gun process.'
    )
  }
}

logger.info('subprocess invoked')

process.on('uncaughtException', e => {
  logger.error('Uncaught exception inside Gun subprocess:')
  logger.error(e)
})

process.on('unhandledRejection', e => {
  logger.error('Unhandled rejection inside Gun subprocess:')
  logger.error(e)
})

/**
 * @type {GunT.GUNNode}
 */
// eslint-disable-next-line init-declarations
let gun

/**
 * @type {GunT.UserGUNNode}
 */
// eslint-disable-next-line init-declarations
let user

/**
 * @returns {Promise<void>}
 */
const waitForAuth = async () => {
  if (user.is && user.is.pub) {
    return Promise.resolve()
  }

  await new Promise(res => setTimeout(res, 1000))

  return waitForAuth()
}

/**
 * @param {Smith.SmithMsg} msg
 */
const handleMsg = async msg => {
  if (dead) {
    logger.error('Dead sub-process received msg: ', msg)
    return
  }
  // @ts-ignore
  if (msg === 'bye') {
    logger.info('KILLING')
    dead = true
  }
  if (Array.isArray(msg)) {
    msg.forEach(handleMsg)
    return
  }
  if (msg.type === 'init') {
    gun = /** @type {any} */ (new Gun(msg.opts))

    let currentPeers = ''
    setInterval(() => {
      const newPeers = JSON.stringify(
        Object.values(gun.back('opt').peers)
          .filter(p => p.wire && p.wire.readyState)
          .map(p => p.url)
      )
      if (newPeers !== currentPeers) {
        logger.info('Connected peers:', newPeers)
        currentPeers = newPeers
      }
    }, 2000)

    setInterval(() => {
      // Log regardless of change every 30 seconds
      logger.info('Connected peers:', currentPeers)
    }, 30000)
    user = gun.user()

    sendMsg({
      type: 'init'
    })
  }
  if (msg.type === 'auth') {
    const { alias, pass } = msg
    user.auth(alias, pass, ack => {
      /** @type {Smith.GunMsgAuth} */
      const msg = {
        ack: {
          err: ack.err,
          sea: ack.sea
        },
        type: 'auth'
      }
      sendMsg(msg)
    })
  }
  if (msg.type === 'create') {
    const { alias, pass } = msg
    user.create(alias, pass, ack => {
      /** @type {Smith.GunMsgCreate} */
      const msg = {
        ack: {
          err: ack.err,
          pub: ack.pub
        },
        pair: user._.sea,
        type: 'create'
      }
      sendMsg(msg)
    })
  }
  if (msg.type === 'load') {
    const [root, ...keys] = msg.path.split('>')

    /** @type {GunT.GUNNode} */
    let node =
      {
        $root: gun,
        $user: user
      }[root] || gun.user(root)

    for (const key of keys) {
      node = node.get(key)
    }
    node.load((data, key) => {
      /** @type {Smith.GunMsgLoad} */
      const res = {
        data,
        id: msg.id,
        key,
        type: 'load'
      }
      sendMsg(res)
    })
  }
  if (msg.type === 'on') {
    const [root, ...keys] = msg.path.split('>')

    /** @type {GunT.GUNNode} */
    let node =
      {
        $root: gun,
        $user: user
      }[root] || gun.user(root)

    for (const key of keys) {
      node = node.get(key)
    }
    node.on(data => {
      /** @type {Smith.GunMsgOn} */
      const res = {
        data,
        path: msg.path,
        type: 'on'
      }
      sendMsg(res)
    })
  }
  if (msg.type === 'map.on') {
    const [root, ...keys] = msg.path.split('>')

    /** @type {GunT.GUNNode} */
    let node =
      {
        $root: gun,
        $user: user
      }[root] || gun.user(root)

    for (const key of keys) {
      node = node.get(key)
    }
    node.map().on((data, key) => {
      /** @type {Smith.GunMsgMapOn} */
      const res = {
        data,
        key,
        path: msg.path,
        type: 'map.on'
      }
      sendMsg(res)
    })
  }
  if (msg.type === 'put') {
    const [root, ...keys] = msg.path.split('>')
    if (root === '$user') {
      await waitForAuth()
    }

    /** @type {GunT.GUNNode} */
    let node =
      {
        $root: gun,
        $user: user
      }[root] || gun.user(root)

    for (const key of keys) {
      node = node.get(key)
    }

    node.put(msg.data, ack => {
      /** @type {Smith.GunMsgPut} */
      const reply = {
        ack: {
          err: typeof ack.err === 'string' ? ack.err : undefined
        },
        id: msg.id,
        path: msg.path,
        type: 'put'
      }
      sendMsg(reply)
    })
  }
  if (msg.type === 'multiPut') {
    const [root, ...keys] = msg.path.split('>')

    /** @type {GunT.GUNNode} */
    let node =
      {
        $root: gun,
        $user: user
      }[root] || gun.user(root)

    for (const key of keys) {
      node = node.get(key)
    }
    node.put(msg.data, ack => {
      /** @type {Smith.GunMsgMultiPut} */
      const reply = {
        ack: {
          err: ack.err
        },
        ids: msg.ids,
        path: msg.path,
        type: 'multiPut'
      }
      sendMsg(reply)
    })
  }
}

process.on('message', handleMsg)
