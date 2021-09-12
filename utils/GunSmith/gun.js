/**
 * @format
 */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const Gun = require('gun')
// @ts-ignore
require('gun/nts')

// @ts-ignore
Gun.log = () => {}

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
  if (msg.type === 'init') {
    gun = /** @type {any} */ (new Gun(msg.opts))
  }
  if (msg.type === 'auth') {
    const { alias, pass } = msg
    user.auth(alias, pass, ack => {
      /** @type {Smith.GunMsgAuth} */
      const msg = {
        ack,
        type: 'auth'
      }
      // @ts-expect-error
      process.send(msg)
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
    node.on((data, key) => {
      /** @type {Smith.GunMsgOn} */
      const res = {
        data,
        path: msg.path,
        type: 'on'
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
  }
}

process.on('message', handleMsg)
