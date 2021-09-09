/**
 * @format
 */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const { fork } = require('child_process')

const Config = require('./config')

/**
 * Maps a path to `on()` listeners
 * @type {Record<string, WeakSet<GunT.Listener>>}
 */
const pathToListeners = {
  'x>x>x>': new WeakSet()
}

/**
 * @param {Smith.GunMsg} msg
 */
const handleMsg = msg => {}

let currentGun = fork('./gun')

const forge = () => {
  currentGun.kill()
  currentGun = fork('./gun')

  currentGun.on('message', handleMsg)

  const msgs = Object.keys(pathToListeners).map(path => {
    /** @type {Smith.SmithMsgOn} */
    const msg = {
      path,
      type: 'on'
    }
    return msg
  })

  currentGun.send(msgs)
}

/**
 * @param {string} path
 * @param {boolean=} afterMap
 * @returns {GunT.GUNNode}
 */
const createReplica = (path, afterMap = false) => {
  /** @type {GunT.Listener[]} */
  const listenersForThisRef = []

  return {
    _: {
      get: '',
      opt: {
        peers: {}
      },
      put: {}
    },
    get(key) {
      return createReplica(path + '>' + key)
    },
    map() {
      return createReplica(path, true)
    },
    off() {
      for (const l of listenersForThisRef) {
        pathToListeners[path].delete(l)
      }
    },
    on(cb) {
      listenersForThisRef.push(cb)
      /** @type {Smith.SmithMsgOn} */
      const msg = {
        path,
        type: 'on'
      }
      currentGun.send(msg)
      return this
    },
    once(cb, opts) {
      return this
    },
    put(data, cb) {
      return this
    },
    set(data, cb) {
      return this
    },
    then() {
      return Promise.resolve(null)
    },
    user(pub) {
      if (path !== '$root') {
        throw new ReferenceError(
          `Do not call user() on a non-root GunSmith node`
        )
      }
      if (!pub) {
        throw new Error(
          'Do not use `user()` (without providing a pub) on a GunSmith node, use getUser()'
        )
      }
      const replica = createReplica(pub)
      return {
        ...replica,
        _: {
          ...replica._,
          sea: {
            epriv: 'Do not use ._.sea on a GunSmith node, use getUser()',
            epub: 'Do not use ._.sea on a GunSmith node, use getUser()',
            priv: 'Do not use ._.sea on a GunSmith node, use getUser()',
            pub: 'Do not use ._.sea on a GunSmith node, use getUser()'
          }
        },
        auth() {
          throw new Error(
            'Do not call auth() on a GunSmith node, use getUser()'
          )
        },
        create() {
          throw new Error(
            'Do not call create() on a GunSmith node, use getUser()'
          )
        },
        leave() {
          throw new Error(
            'Do not call leave() on a GunSmith node, use getUser()'
          )
        }
      }
    }
  }
}

/**
 * @returns {GunT.GUNNode}
 */
const getGun = () => createReplica('$root')

/**
 * @returns {GunT.UserGUNNode}
 */
const getUser = createReplica('$user')

module.exports = {
  getGun,
  getUser
}
