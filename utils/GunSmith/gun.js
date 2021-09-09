/**
 * @format
 */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const Gun = require('gun')
// @ts-ignore
require('gun/nts')

const Config = require('./config')

// @ts-ignore
Gun.log = () => {}

/**
 * This var is just to please typescript's casting rules.
 */
const _gun = /** @type {any} */ (new Gun({
  axe: false,
  multicast: false,
  peers: Config.PEERS
}))

/**
 * @type {GunT.GUNNode}
 */
const gun = _gun

const user = gun.user()

/** @type {Set<string>} */
const pendingOnces = new Set()

/**
 * @returns {Promise<void>}
 */
const waitForAuth = async () => {
  if (user.is?.pub) {
    return Promise.resolve()
  }

  await new Promise(res => setTimeout(res, 1000))

  return waitForAuth()
}

/**
 * @param {Smith.SmithMsg} msg
 */
const handleMsg = msg => {
  if (Array.isArray(msg)) {
    msg.forEach(handleMsg)
    return
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
    node.on((data, key) => {
      /** @type {Smith.GunMsgOn} */
      const res = {
        data,
        key,
        path: msg.path,
        type: 'on'
      }
      // @ts-expect-error
      process.send(res)
    })
  }
  if (msg.type === 'once') {
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
    node.once((data, key) => {
      /** @type {Smith.GunMsgOnce} */
      const res = {
        data,
        id: msg.id,
        key,
        type: 'once'
      }
      // @ts-expect-error
      process.send(res)
    })
  }
  if (msg.type === 'put') {
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
    node.on((data, key) => {
      /** @type {Smith.GunMsgOn} */
      const res = {
        data,
        key,
        path: msg.path,
        type: 'on'
      }
      // @ts-expect-error
      process.send(res)
    })
  }
}

process.on('message', handleMsg)
