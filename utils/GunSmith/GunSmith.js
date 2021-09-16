/**
 * @format
 */
/* eslint-disable no-use-before-define */
/* eslint-disable func-style */
// @ts-check
/// <reference path="Smith.ts" />
/// <reference path="GunT.ts" />
const RealGun = require('gun')
const uuid = require('uuid/v1')
const mapValues = require('lodash/mapValues')
const { fork } = require('child_process')

const logger = require('../../config/log')

const { mergePuts, isPopulated } = require('./misc')

const gunUUID = () => {
  const RG = /** @type {any} */ (RealGun)
  if (typeof RG.text === 'object' && typeof RG.text.random === 'function') {
    return RG.text.random()
  }
  // This probably won't happen
  throw new ReferenceError()
}

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
 * @type {Record<string, Smith.PendingPut[]>}
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
  if (msg.type === 'multiPut') {
    const { ack, ids, path } = msg

    const pendingPutsForPath = pendingPuts[path] || (pendingPuts[path] = [])

    const ackedPuts = pendingPutsForPath.filter(pp => ids.includes(pp.id))

    pendingPuts[path] = pendingPuts[path].filter(pp => !ids.includes(pp.id))

    ackedPuts.forEach(pp => {
      if (pp.cb) {
        pp.cb(ack)
      }
    })
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
let isAuthing = false

/**
 * @param {string} alias
 * @param {string} pass
 * @returns {Promise<GunT.UserPair>}
 */
const auth = (alias, pass) => {
  logger.info(`Authing with ${alias}`)
  if (isAuthing) {
    throw new Error(`Double auth?`)
  }
  isAuthing = true
  return new Promise((res, rej) => {
    lastAlias = ''
    lastPass = ''
    lastPair = null
    logger.info('Reset cached credentials in case auth fails')
    /** @type {Smith.SmithMsgAuth} */
    const msg = {
      alias,
      pass,
      type: 'auth'
    }

    /** @param {Smith.GunMsg} msg */
    const _cb = msg => {
      if (msg.type === 'auth') {
        logger.info(`Received ${msg.ack.sea ? 'ok' : 'bad'} auth reply.`)
        currentGun.off('message', _cb)

        isAuthing = false

        const { ack } = msg

        if (ack.err) {
          rej(new Error(ack.err))
        } else if (ack.sea) {
          lastAlias = alias
          lastPass = pass
          lastPair = ack.sea
          logger.info(
            'Auth successful, credentials cached, will now flush pending puts.'
          )
          flushPendingPuts()
          res(ack.sea)
        } else {
          rej(new Error('Auth: ack.sea undefined'))
        }
      }
    }
    currentGun.on('message', _cb)
    currentGun.send(msg)
    logger.info('Sent auth message.')
  })
}

const autoAuth = async () => {
  if (!lastAlias || !lastPass) {
    logger.info('No credentials cached, will not auto-auth')
    return
  }
  logger.info('Credentials cached, will auth.')
  await auth(lastAlias, lastPass)
}

const flushPendingPuts = () => {
  const ids = mapValues(pendingPuts, pendingPutsForPath =>
    pendingPutsForPath.map(pp => pp.id)
  )
  const writes = mapValues(pendingPuts, pendingPutsForPath =>
    pendingPutsForPath.map(pp => pp.data)
  )
  const finalWrites = mapValues(writes, writesForPath =>
    mergePuts(writesForPath)
  )
  const messages = Object.entries(ids).map(([path, ids]) => {
    /** @type {Smith.SmithMsgMultiPut} */
    const msg = {
      data: finalWrites[path],
      ids,
      path,
      type: 'multiPut'
    }
    return msg
  })
  currentGun.send(messages)
  logger.info(`Sent ${messages.length} pending puts.`)
}

let isForging = false

/** @returns {Promise<void>} */
const isReady = () =>
  new Promise(res => {
    if (isForging || isAuthing) {
      setTimeout(() => {
        isReady().then(res)
      }, 1000)
    } else {
      logger.info('isReady')
      res()
    }
  })

let procID = 0

const forge = () => {
  logger.info(`Forging Gun # ${++procID}`)
  if (isForging) {
    throw new Error('Double forge?')
  }

  isForging = true
  if (currentGun) {
    logger.info('Will reforge')
    currentGun.off('message', handleMsg)
    currentGun.disconnect()
    currentGun.kill()
    logger.info('Killed current gun')
  } else {
    logger.info('Will forge')
  }
  const newGun = fork('utils/GunSmith/gun.js')
  currentGun = newGun
  logger.info('Forged new gun')

  // currentGun.on('', e => {
  //   console.log('event from subprocess')
  //   console.log(e)
  // })

  currentGun.on('message', handleMsg)

  /** @type {Smith.SmithMsgInit} */
  const initMsg = {
    opts: lastOpts,
    type: 'init'
  }
  currentGun.send(initMsg)
  logger.info('Sent init msg')

  const lastGunListeners = Object.keys(pathToListeners).map(path => {
    /** @type {Smith.SmithMsgOn} */
    const msg = {
      path,
      type: 'on'
    }
    return msg
  })
  currentGun.send(lastGunListeners)

  const lastGunMapListeners = Object.keys(pathToMapListeners).map(path => {
    /** @type {Smith.SmithMsgMapOn} */
    const msg = {
      path,
      type: 'map.on'
    }
    return msg
  })
  currentGun.send(lastGunMapListeners)

  logger.info('Sent pending map.on listeners')

  logger.info('Finished reforging, will now auto-auth')

  autoAuth().then(() => {
    isForging = false
  })
}

/**
 * @param {string} path
 * @param {boolean=} afterMap
 * @returns {GunT.GUNNode & Smith.GunSmithNode}
 */
function createReplica(path, afterMap = false) {
  /** @type {(GunT.Listener|GunT.LoadListener)[]} */
  const listenersForThisRef = []

  return {
    _: {
      get get() {
        const keys = path.split('>')
        return keys[keys.length - 1]
      },
      opt: {
        // TODO
        peers: {}
      },
      put: {
        // TODO
      }
    },
    back() {
      throw new Error('Do not use back() on a GunSmith node.')
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
        tmp.off()
        const keys = path.split('>')
        // eslint-disable-next-line no-unused-expressions
        cb && cb(lastVal, keys[keys.length - 1])
      }, opts.wait)

      return this
    },
    put(data, cb) {
      logger.info('put()')
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
      isReady().then(() => {
        currentGun.send(msg)
      })
      return this
    },
    set(data, cb) {
      if (afterMap) {
        throw new Error('Cannot call set() after map() on a GunSmith node')
      }

      const id = gunUUID()
      this.put(
        {
          [id]: data
        },
        ack => {
          // eslint-disable-next-line no-unused-expressions
          cb && cb(ack)
        }
      )
      return this.get(id)
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
    },
    then() {
      return new Promise(res => {
        this.once(data => {
          res(data)
        })
      })
    },
    specialOn(cb) {
      let canaryPeep = false

      const checkCanary = () =>
        setTimeout(() => {
          if (!canaryPeep) {
            forge()
            isReady().then(checkCanary)
          }
        }, 5000)

      checkCanary()
      return this.on((data, key) => {
        canaryPeep = true
        cb(data, key)
      })
    },
    specialOnce(cb, _wait = 500) {
      this.once((data, key) => {
        if (isPopulated(data) || _wait === 4500) {
          cb(data, key)
        } else {
          forge()
          isReady().then(() => {
            this.specialOnce(cb, _wait * 3)
          })
        }
      })
      return this
    },
    specialThen() {
      return new Promise((res, rej) => {
        this.specialOnce(data => {
          if (isPopulated(data)) {
            res(data)
          } else {
            rej(new Error(`Could not fetch data at path ${path}`))
          }
        })
      })
    }
  }
}

let userReplicaCalled = false

/**
 * @returns {GunT.UserGUNNode & Smith.GunSmithNode}
 */
function createUserReplica() {
  if (userReplicaCalled) {
    throw new Error('Please only call gun.user() (without a pub) once.')
  }
  userReplicaCalled = true

  const baseReplica = createReplica('$user')

  /** @type {GunT.UserGUNNode & Smith.GunSmithNode} */
  const completeReplica = {
    ...baseReplica,
    get _() {
      return {
        ...baseReplica._,
        // TODO
        sea: lastPair || {
          epriv: '',
          epub: '',
          priv: '',
          pub: ''
        }
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
    create(alias, pass, cb) {
      lastAlias = ''
      lastPass = ''
      lastPair = null

      /** @type {Smith.SmithMsgCreate} */
      const msg = {
        alias,
        pass,
        type: 'create'
      }

      /** @param {Smith.GunMsg} msg */
      const _cb = msg => {
        if (msg.type === 'create') {
          currentGun.off('message', _cb)

          const { ack } = msg

          if (ack.err) {
            cb(ack)
          } else if (ack.pub) {
            lastAlias = alias
            lastPass = pass
            lastPair = msg.pair
            cb(ack)
          } else {
            throw (new Error('Auth: ack.pub undefined'))
          }
        }
      }
      currentGun.on('message', _cb)
      currentGun.send(msg)
    },
    leave() {
      lastAlias = ''
      lastPass = ''
      lastPair = null

      /** @type {Smith.SmithMsgLeave} */
      const msg = {
        type: 'leave'
      }
      currentGun.send(msg)
    }
  }

  return completeReplica
}

/**
 * @typedef {GunT.GUNNode & Smith.GunSmithNode & { reforge(): void }} RootNode
 */

/**
 * @param {import('gun/types/options').IGunConstructorOptions} opts
 * @returns {RootNode}
 */
const Gun = opts => {
  lastOpts = opts
  forge()

  // We should ideally wait for a response but we'd break the constructor's
  // signature
  return {
    ...createReplica('$root'),
    reforge() {
      forge()
    }
  }
}

module.exports = Gun
