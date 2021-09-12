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
 * Maps a path to `map().on()` listeners
 * @type {Record<string, Set<GunT.Listener>|undefined>}
 */
const pathToMapListeners = {}

/** @type {Record<string, GunT.LoadListener>} */
const idToLoadListener = {}

/**
 * Path to pending puts. Oldest to newest
 * @type {Record<string, Smith.PendingPut[]?>}
 */
const pendingPuts = {}

/**
 * @param {Smith.GunMsg} msg
 */
const handleMsg = msg => {
  if (msg.type === 'load') {
    const { data, id, key } = msg

    const listener = idToLoadListener[id]

    if (listener) {
      listener(data, key)
      delete idToLoadListener[id]
    }
  }
  if (msg.type === 'on') {
    const { data, path } = msg

    // eslint-disable-next-line no-multi-assign
    const listeners =
      pathToListeners[path] || (pathToListeners[path] = new Set())

    for (const l of listeners) {
      l(data, path.split('>')[path.split('>').length - 1])
    }
  }
  if (msg.type === 'map.on') {
    const { data, key, path } = msg

    // eslint-disable-next-line no-multi-assign
    const listeners =
      pathToMapListeners[path] || (pathToMapListeners[path] = new Set())

    for (const l of listeners) {
      l(data, key)
    }
  }
  if (msg.type === 'put') {
    const { ack, id, path } = msg

    const pendingPutsForPath = pendingPuts[path] || (pendingPuts[path] = [])

    const pendingPut = pendingPutsForPath.find(pp => pp.id === id)
    const idx = pendingPutsForPath.findIndex(pp => pp.id === id)

    if (pendingPut) {
      pendingPutsForPath.splice(idx, 1)
      if (pendingPut.cb) {
        pendingPut.cb(ack)
      }
    } else {
      logger.error(
        `Could not find request for put message from gun subprocess. Data will be logged below.`
      )
      console.log({
        msg,
        pendingPut: pendingPut || 'No pending put found',
        allPendingPuts: pendingPuts
      })
    }
  }
}

/** @type {ReturnType<typeof fork>} */
// eslint-disable-next-line init-declarations
let currentGun

let lastAlias = ''
let lastPass = ''
/** @type {GunT.UserPair|null} */
let lastPair = null
/** @type {import('gun/types/options').IGunConstructorOptions} */
let lastOpts = {}

/**
 * @param {string} alias
 * @param {string} pass
 * @returns {Promise<GunT.UserPair>}
 */
const auth = (alias, pass) =>
  new Promise((res, rej) => {
    lastAlias = ''
    lastPass = ''
    lastPair = null
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
          lastPair = ack.sea
          processPendingPutsFromLastGun(currentGun)
          res(ack.sea)
        } else {
          rej(new Error('Auth: ack.sea undefined'))
        }
      }
    }
    currentGun.on('message', _cb)
    currentGun.send(msg)
  })

/**
 * Returns null if there's no cached credentials.
 * @returns {Promise<GunT.UserPair|null>}
 */
const autoAuth = () => {
  if (!lastAlias || !lastPass) {
    return Promise.resolve(null)
  }
  return auth(lastAlias, lastPass)
}

const processPendingPutsFromLastGun = async (forGun, pps = pendingPuts) => {
  // TODO
}

const forge = () => {
  if (currentGun) {
    currentGun.off('message', handleMsg)
    currentGun.kill()
  }
  const newGun = fork('utils/GunSmith/gun.js')
  currentGun = newGun

  // currentGun.on('', e => {
  //   console.log('event from subp')
  //   console.log(e)
  // })

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

  autoAuth()
}

/**
 * @param {string} path
 * @param {boolean=} afterMap
 * @returns {GunT.GUNNode}
 */
function createReplica(path, afterMap = false) {
  /** @type {(GunT.Listener|GunT.LoadListener)[]} */
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
    load(cb) {
      // Dumb implementation. We must move away from load() anyways.
      if (afterMap) {
        throw new Error('Cannot call load() after map() on a GunSmith node')
      }
      if (cb) {
        listenersForThisRef.push(cb)

        const id = uuid()

        idToLoadListener[id] = cb

        /** @type {Smith.SmithMsgLoad} */
        const msg = {
          id,
          path,
          type: 'load'
        }
        currentGun.send(msg)
      }
      return this
    },
    map() {
      if (afterMap) {
        throw new Error('Cannot call map() after map() on a GunSmith node')
      }
      return createReplica(path, true)
    },
    off() {
      for (const l of listenersForThisRef) {
        // eslint-disable-next-line no-multi-assign
        const listeners =
          pathToListeners[path] || (pathToListeners[path] = new Set())

        // eslint-disable-next-line no-multi-assign
        const mapListeners =
          pathToMapListeners[path] || (pathToMapListeners[path] = new Set())

        // @ts-expect-error
        listeners.delete(l)
        // @ts-expect-error
        mapListeners.delete(l)
      }
    },
    on(cb) {
      listenersForThisRef.push(cb)
      if (afterMap) {
        // eslint-disable-next-line no-multi-assign
        const listeners =
          pathToMapListeners[path] || (pathToMapListeners[path] = new Set())

        listeners.add(cb)

        /** @type {Smith.SmithMsgMapOn} */
        const msg = {
          path,
          type: 'map.on'
        }
        currentGun.send(msg)
      } else {
        // eslint-disable-next-line no-multi-assign
        const listeners =
          pathToListeners[path] || (pathToListeners[path] = new Set())

        listeners.add(cb)

        /** @type {Smith.SmithMsgOn} */
        const msg = {
          path,
          type: 'on'
        }
        currentGun.send(msg)
      }

      return this
    },
    once(cb, opts = { wait: 500 }) {
      // We could use this.on() but then we couldn't call .off()
      const tmp = createReplica(path, afterMap)
      if (afterMap) {
        throw new Error('Cannot call once() after map() on a GunSmith node')
      }
      /** @type {GunT.ListenerData} */
      let lastVal = null

      tmp.on(data => {
        lastVal = data
      })

      setTimeout(() => {
        if (cb) {
          cb(lastVal, path.split('>')[path.split('>').length - 1])
        }
        tmp.off()
      }, opts.wait)

      return this
    },
    put(data, cb) {
      const id = uuid()

      const pendingPutsForPath = pendingPuts[path] || (pendingPuts[path] = [])

      /** @type {Smith.PendingPut} */
      const pendingPut = {
        cb: cb || (() => {}),
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
      // @ts-expect-error
      const uuid = Gun.text.random()
      return this.put(
        {
          [uuid]: data
        },
        ack => {
          // eslint-disable-next-line no-unused-expressions
          cb && cb(ack)
        }
      )
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
    get _() {
      return {
        ...baseReplica._,
        // TODO
        sea: lastPair
      }
    },
    get is() {
      if (lastAlias && lastPair) {
        return {
          alias: lastAlias,
          pub: lastPair.pub
        }
      }
      return undefined
    },
    auth(alias, pass, cb) {
      auth(alias, pass)
        .then(pair => {
          cb({
            err: undefined,
            sea: pair
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
  forge()

  // We should ideally wait for a response but we'd break the constructor's
  // signature
  return createReplica('$root')
}

module.exports = Gun
