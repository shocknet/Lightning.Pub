/**
 * @format
 */
/* eslint-disable no-use-before-define */
/* eslint-disable func-style */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const uuid = require('uuid').v1
const { fork } = require('child_process')

const logger = require('../../config/log')

/**
 * Maps a path to `on()` listeners
 * @type {Record<string, Set<GunT.Listener>|undefined>}
 */
const pathToListeners = {}

/**
 * Path to pending puts. Oldest to newest
 * @type {Record<string, Smith.PendingPut[]?>}
 */
const pendingPuts = {}

/**
 * @param {Smith.GunMsg} msg
 */
const handleMsg = msg => {
  if (msg.type === 'on') {
    const { data, path } = msg

    // eslint-disable-next-line no-multi-assign
    const listeners = (pathToListeners[path] =
      pathToListeners[path] || new Set())

    for (const l of listeners) {
      l(data, path.split('>')[path.split('>').length - 1])
    }
  }
  if (msg.type === 'put') {
    const { ack, id, path } = msg

    const pendingPutsForPath = pendingPuts[path] || (pendingPuts[path] = [])

    const pendingPut = pendingPutsForPath.find(pp => pp.id === id)
    const idx = pendingPutsForPath.findIndex(pp => pp.id === id)

    if (pendingPut) {
      if (pendingPut.cb) {
        pendingPut.cb(ack)
      }
      pendingPutsForPath.splice(idx, 1)
    } else {
      logger.error(
        `Could not find request for put message from gun subprocess. Data will be logged below.`
      )
      logger.info({ msg, pendingPut })
    }
  }
}

let currentGun = fork('./gun')

let lastAlias = ''
let lastPass = ''
/** @type {import('gun/types/options').IGunConstructorOptions} */
let lastOpts = {}

/**
 * @param {string} alias
 * @param {string} pass
 * @returns {Promise<string>}
 */
const auth = (alias, pass) =>
  new Promise((res, rej) => {
    /** @type {Smith.SmithMsgAuth} */
    const msg = {
      alias,
      pass,
      type: 'auth'
    }
    /** @param {Smith.GunMsg} msg */
    const _cb = msg => {
      if (msg.type === 'auth') {
        currentGun.off('message', _cb)

        const { ack } = msg

        if (ack.err) {
          rej(new Error(ack.err))
        } else if (ack.sea) {
          lastAlias = alias
          lastPass = pass
          res(ack.sea.pub)
        } else {
          rej(new Error('Auth: ack.sea undefined'))
        }
      }
    }
    currentGun.on('message', _cb)
    currentGun.send(msg)
  })

/**
 * @returns {Promise<string>}
 */
const autoAuth = () => {
  if (!lastAlias || !lastPass) {
    return Promise.resolve('')
  }
  return auth(lastAlias, lastPass)
}

const processPendingPutsFromLastGun = async (forGun, pps = pendingPuts) => {
  // TODO
}

const forge = () => {
  currentGun.off('message', handleMsg)
  currentGun.kill()
  const newGun = fork('./gun')
  currentGun = newGun

  /** @type {Smith.SmithMsgInit} */
  const initMsg = {
    opts: lastOpts,
    type: 'init'
  }
  currentGun.send(initMsg)

  currentGun.on('message', handleMsg)

  const lastGunListeners = Object.keys(pathToListeners).map(path => {
    /** @type {Smith.SmithMsgOn} */
    const msg = {
      path,
      type: 'on'
    }
    return msg
  })
  currentGun.send(lastGunListeners)

  autoAuth().then(() => {
    processPendingPutsFromLastGun(newGun)
  })
}

/**
 * @param {string} path
 * @param {boolean=} afterMap
 * @returns {GunT.GUNNode}
 */
function createReplica(path, afterMap = false) {
  /** @type {GunT.Listener[]} */
  const listenersForThisRef = []

  return {
    _: {
      get: '',
      opt: {
        // TODO
        peers: {}
      },
      put: {
        // TODO
      }
    },
    get(key) {
      if (afterMap) {
        throw new Error(
          'Cannot call get() after map() on a GunSmith node, you should only call on() after map()'
        )
      }
      return createReplica(path + '>' + key)
    },
    map() {
      if (afterMap) {
        throw new Error('Cannot call map() after map() on a GunSmith node')
      }
      return createReplica(path, true)
    },
    off() {
      if (afterMap) {
        throw new Error('Cannot call off() after map() on a GunSmith node')
      }
      for (const l of listenersForThisRef) {
        // eslint-disable-next-line no-multi-assign
        const listeners = (pathToListeners[path] =
          pathToListeners[path] || new Set())

        listeners.delete(l)
      }
    },
    on(cb) {
      listenersForThisRef.push(cb)

      // eslint-disable-next-line no-multi-assign
      const listeners = (pathToListeners[path] =
        pathToListeners[path] || new Set())

      listeners.add(cb)

      /** @type {Smith.SmithMsgOn} */
      const msg = {
        path,
        type: 'on'
      }
      currentGun.send(msg)

      return this
    },
    once(cb, opts = { wait: 200 }) {
      const tmp = createReplica(path, afterMap)
      if (afterMap) {
        // TODO
      } else {
        /** @type {GunT.ListenerData} */
        let lastVal = null

        tmp.on(data => {
          lastVal = data
        })

        setTimeout(() => {
          if (cb) {
            cb(lastVal, path.split('>')[path.split('>').length - 1])
          }
        }, opts.wait)
      }
      return this
    },
    put(data, cb) {
      const id = uuid()

      const pendingPutsForPath = pendingPuts[path] || (pendingPuts[path] = [])

      /** @type {Smith.PendingPut} */
      const pendingPut = {
        cb(ack) {
          const idx = pendingPutsForPath.indexOf(this)
          if (idx > -1) {
            pendingPutsForPath.splice(idx, 1)
          } else {
            logger.warn(`???`)
          }
          // eslint-disable-next-line no-unused-expressions
          cb && cb(ack)
        },
        data,
        id
      }

      pendingPutsForPath.push(pendingPut)

      /** @type {Smith.SmithMsgPut} */
      const msg = {
        data,
        id,
        path,
        type: 'put'
      }

      currentGun.send(msg)
      return this
    },
    set(data, cb) {
      if (afterMap) {
        throw new Error('Cannot call set() after map() on a GunSmith node')
      }
      return this
    },
    then() {
      if (afterMap) {
        throw new Error('Cannot call then() after map() on a GunSmith node')
      }
      return Promise.resolve(null)
    },
    user(pub) {
      if (path !== '$root') {
        throw new ReferenceError(
          `Do not call user() on a non-root GunSmith node`
        )
      }
      if (!pub) {
        return createUserReplica()
      }
      const replica = createReplica(pub)
      // I don't know why Typescript insists on returning a UserGUNNode so here we go:
      return {
        ...replica,
        /** @returns {GunT.UserSoul} */
        get _() {
          throw new ReferenceError(
            `Do not access _ on another user's graph (${pub.slice(
              0,
              8
            )}...${pub.slice(-8)})`
          )
        },
        auth() {
          throw new Error(
            "Do not call auth() on another user's graph (gun.user(otherUserPub))"
          )
        },
        create() {
          throw new Error(
            "Do not call create() on another user's graph (gun.user(otherUserPub))"
          )
        },
        leave() {
          throw new Error(
            "Do not call leave() on another user's graph (gun.user(otherUserPub))"
          )
        }
      }
    }
  }
}

let userReplicaCalled = false

/**
 * @returns {GunT.UserGUNNode}
 */
function createUserReplica() {
  if (userReplicaCalled) {
    throw new Error('Please only call gun.user() (without a pub) once.')
  }
  userReplicaCalled = true

  const baseReplica = createReplica('$user')

  /** @type {GunT.UserGUNNode} */
  const completeReplica = {
    ...baseReplica,
    _: {
      ...baseReplica._,
      // TODO
      sea: {
        epriv: '',
        epub: '',
        priv: '',
        pub: ''
      }
    },
    auth(alias, pass, cb) {
      auth(alias, pass)
        .then(pub => {
          cb({
            err: undefined,
            sea: {
              pub
            }
          })
        })
        .catch(e => {
          cb({
            err: e.message,
            sea: undefined
          })
        })
    },
    create() {},
    leave() {}
  }

  return completeReplica
}

/**
 * @param {import('gun/types/options').IGunConstructorOptions} opts
 */
const Gun = opts => {
  lastOpts = opts

  /** @type {Smith.SmithMsgInit} */
  const msg = {
    opts,
    type: 'init'
  }
  currentGun.send(msg)
  // We should ideally wait for a response but we'd break the constructor's
  // signature
  return createReplica('$root')
}

module.exports = Gun
