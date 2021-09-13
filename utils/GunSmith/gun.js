/**
 * @format
 */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const Gun = require('gun')
require('gun/nts')
require('gun/lib/load')

// @ts-ignore
Gun.log = () => {}

/**
 * @param {any} msg
 */
const sendMsg = msg => {
  if (process.send) {
    process.send(msg)
  } else {
    console.log(
      'Fatal error: Could not send a message from inside the gun process.'
    )
  }
}

console.log('subprocess invoked')

process.on('uncaughtException', e => {
  console.log('Uncaught exception inside Gun subprocess:')
  console.log(e)
})

process.on('unhandledRejection', e => {
  console.log('Unhandled rejection inside Gun subprocess:')
  console.log(e)
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
const handleMsg = msg => {
  if (Array.isArray(msg)) {
    msg.forEach(handleMsg)
    return
  }
  if (msg.type === 'init') {
    gun = /** @type {any} */ (new Gun(msg.opts))
    setInterval(() => {
      // @ts-expect-error
      console.log(Object.keys(gun.back('opt').peers))
    }, 2000)
    user = gun.user()
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
  if (msg.type === 'load') {
    const { id, path } = msg
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
        id,
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
        ack,
        id: msg.id,
        path: msg.path,
        type: 'put'
      }
      sendMsg(reply)
    })
  }
}

process.on('message', handleMsg)
