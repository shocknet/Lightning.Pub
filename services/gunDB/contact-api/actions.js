/**
 * @format
 */
const uuidv1 = require('uuid/v1')
const logger = require('../../../config/log')
const Common = require('shock-common')
const { Constants, Schema } = Common

const { ErrorCode } = Constants

const {
  sendPaymentV2Invoice,
  decodePayReq
} = require('../../../utils/lightningServices/v2')

/**
 * @typedef {import('../../../utils/lightningServices/types').PaymentV2} PaymentV2
 */

const Getters = require('./getters')
const Key = require('./key')
const Utils = require('./utils')
const SchemaManager = require('../../schema')
const LNDHealthMananger = require('../../../utils/lightningServices/errors')
const { enrollContentTokens, selfContentToken } = require('../../seed')

/// <reference path="../../../utils/GunSmith/Smith.ts" />

/**
 * @typedef {import('./SimpleGUN').ISEA} ISEA
 * @typedef {Smith.UserSmithNode} UserGUNNode
 */

/**
 * @param {string} user
 * @param {string} pass
 * @param {UserGUNNode} userNode
 */
const authenticate = (user, pass, userNode) =>
  /** @type {Promise<void>} */ (new Promise((resolve, reject) => {
    if (typeof user !== 'string') {
      throw new TypeError('expected user to be of type string')
    }

    if (typeof pass !== 'string') {
      throw new TypeError('expected pass to be of type string')
    }

    if (user.length === 0) {
      throw new TypeError('expected user to have length greater than zero')
    }

    if (pass.length === 0) {
      throw new TypeError('expected pass to have length greater than zero')
    }

    if (typeof userNode.is === 'undefined') {
      throw new Error(ErrorCode.ALREADY_AUTH)
    }

    userNode.auth(user, pass, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        reject(new Error(ack.err))
      } else if (!userNode.is) {
        reject(new Error('authentication failed'))
      } else {
        resolve()
      }
    })
  }))

/**
 * @param {string} publicKey
 * @param {UserGUNNode} user Pass only for testing.
 * @throws {Error} If there's an error saving to the blacklist.
 * @returns {Promise<void>}
 */
const blacklist = (publicKey, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    user.get(Key.BLACKLIST).set(publicKey, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        reject(new Error(ack.err))
      } else {
        resolve()
      }
    })
  })

/**
 * @returns {Promise<void>}
 */
const generateHandshakeAddress = async () => {
  const gun = require('../Mediator').getGun()
  const user = require('../Mediator').getUser()

  const address = uuidv1()

  await /** @type {Promise<void>} */ (new Promise((res, rej) => {
    user.get(Key.CURRENT_HANDSHAKE_ADDRESS).put(address, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  }))
  //why await if you dont need the response?
  await /** @type {Promise<void>} */ (new Promise((res, rej) => {
    gun
      .get(Key.HANDSHAKE_NODES)
      .get(address)
      .put({ unused: 0 }, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  }))
}

/**
 * @param {string|null} avatar
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if avatar is not an string or an empty string.
 * @returns {Promise<void>}
 */
const setAvatar = (avatar, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof avatar === 'string' && avatar.length === 0) {
      throw new TypeError(
        "'avatar' must be an string and have length greater than one or be null"
      )
    }

    if (typeof avatar !== 'string' && avatar !== null) {
      throw new TypeError(
        "'avatar' must be an string and have length greater than one or be null"
      )
    }

    user
      .get(Key.PROFILE_BINARY)
      .get(Key.AVATAR)
      .put(avatar, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          reject(new Error(ack.err))
        } else {
          resolve()
        }
      })
  })

/**
 * @param {string} displayName
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if displayName is not an string or an empty
 * string.
 * @returns {Promise<void>}
 */
const setDisplayName = (displayName, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof displayName !== 'string') {
      throw new TypeError()
    }

    if (displayName.length === 0) {
      throw new TypeError()
    }

    user
      .get(Key.PROFILE)
      .get(Key.DISPLAY_NAME)
      .put(displayName, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          reject(new Error(ack.err))
        } else {
          resolve()
        }
      })
  })

/**
 * @param {string} encryptedSeedProvider
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if displayName is not an string or an empty
 * string.
 * @returns {Promise<void>}
 */
const setDefaultSeedProvider = (encryptedSeedProvider, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof encryptedSeedProvider !== 'string') {
      throw new TypeError()
    }
    user
      .get('preferencesSeedServiceProvider')
      .put(encryptedSeedProvider, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          reject(new Error(ack.err))
        } else {
          resolve()
        }
      })
  })
/**
 * @param {string} encryptedSeedServiceData
 * @param {UserGUNNode} user
 * @throws {TypeError}
 * @returns {Promise<void>}
 */
const setSeedServiceData = (encryptedSeedServiceData, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof encryptedSeedServiceData !== 'string') {
      throw new TypeError()
    }
    user
      .get('preferencesSeedServiceData')
      .put(encryptedSeedServiceData, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          reject(new Error(ack.err))
        } else {
          resolve()
        }
      })
  })
/**
 * @param {string} encryptedCurrentStreamInfo
 * @param {UserGUNNode} user
 * @throws {TypeError}
 * @returns {Promise<void>}
 */
const setCurrentStreamInfo = (encryptedCurrentStreamInfo, user) =>
  new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof encryptedCurrentStreamInfo !== 'string') {
      throw new TypeError()
    }
    user.get('currentStreamInfo').put(encryptedCurrentStreamInfo, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        reject(new Error(ack.err))
      } else {
        resolve()
      }
    })
  })

/**
 * @typedef {object} SpontPaymentOptions
 * @prop {Common.Schema.OrderTargetType} type
 * @prop {string=} ackInfo
 */
/**
 * @typedef {object} OrderRes
 * @prop {PaymentV2|null} payment
 * @prop {object=} orderAck
 */
/**
 * Returns the preimage corresponding to the payment.
 * @param {string} to
 * @param {number} amount
 * @param {string} memo
 * @param {number} feeLimit
 * @param {SpontPaymentOptions} opts
 * @throws {Error} If no response in less than 20 seconds from the recipient, or
 * lightning cannot find a route for the payment.
 * @returns {Promise<OrderRes>} The payment's preimage.
 */
const sendSpontaneousPayment = async (
  to,
  amount,
  memo,
  feeLimit,
  opts = { type: 'spontaneousPayment' }
) => {
  try {
    const SEA = require('../Mediator').mySEA
    const getUser = () => require('../Mediator').getUser()
    const myPub = getUser()._.sea.pub
    if (
      to === myPub &&
      opts.type === 'torrentSeed' &&
      opts.ackInfo &&
      !isNaN(parseInt(opts.ackInfo, 10))
    ) {
      //user requested a seed to themselves
      const numberOfTokens = Number(opts.ackInfo) || 1
      const seedInfo = selfContentToken()
      if (!seedInfo) {
        throw new Error('torrentSeed service not available')
      }
      const { seedUrl } = seedInfo
      logger.info('SEED URL OK')
      const tokens = await enrollContentTokens(numberOfTokens, seedInfo)
      logger.info('RES SEED OK')
      const ackData = JSON.stringify({ seedUrl, tokens })
      return {
        payment: null,
        orderAck: { response: ackData, type: 'orderAck' }
      }
    }
    const recipientEpub = await Utils.pubToEpub(to)
    const ourSecret = await SEA.secret(recipientEpub, getUser()._.sea)

    if (amount < 1) {
      throw new RangeError('Amount must be at least 1 sat.')
    }

    const currOrderAddress = await Getters.currentOrderAddress(to)

    logger.info('sendPayment() -> will now create order:')

    /** @type {import('shock-common').Schema.Order} */
    const order = {
      amount: amount.toString(),
      from: getUser()._.sea.pub,
      memo: memo || 'no memo',
      timestamp: Date.now(),
      targetType: opts.type,
      ackInfo: opts.ackInfo
    }

    logger.info(JSON.stringify(order))

    /* eslint-disable require-atomic-updates */
    const [encMemo, encAmount] = await Promise.all([
      SEA.encrypt(order.memo, ourSecret),
      SEA.encrypt(order.amount, ourSecret)
    ])

    order.memo = encMemo
    order.amount = encAmount
    order.timestamp = Date.now() // most up to date timestamp
    logger.info(`sendPayment() -> encrypted order: ${JSON.stringify(order)}`)

    /* eslint-enable require-atomic-updates */

    logger.info(
      `sendPayment() -> will now place order into address: ${currOrderAddress} for PK: ${to}`
    )

    /** @type {string} */
    const orderID = await new Promise((res, rej) => {
      const ord = require('../Mediator')
        .getGun()
        .get(Key.ORDER_NODES)
        .get(currOrderAddress)
        //@ts-ignore
        .set(order, ack => {
          if (
            ack.err &&
            typeof ack.err !== 'number' &&
            typeof ack.err !== 'object'
          ) {
            rej(
              new Error(
                `Error writing order to order node: ${currOrderAddress} for pub: ${to}: ${ack.err}`
              )
            )
          } else {
            setTimeout(() => res(ord._.get), 0)
          }
        })
    })

    if (typeof orderID !== 'string') {
      const msg = `orderID returned by gun not an string, got: ${JSON.stringify(
        orderID
      )}`
      throw new Error(msg)
    }
    logger.info('ORDER ID')
    logger.info(orderID)
    /** @type {import('shock-common').Schema.OrderResponse} */
    const encryptedOrderRes = await Common.makePromise((res, rej) => {
      setTimeout(() => {
        rej(new Error('Timeout of 30s passed when awaiting order response.'))
      }, 30000)

      require('../Mediator')
        .getGun()
        .user(to)
        .get(Key.ORDER_TO_RESPONSE)
        .get(orderID)
        .on(orderResponse => {
          logger.info(orderResponse)
          if (Schema.isOrderResponse(orderResponse)) {
            res(orderResponse)
          }
        })
    })

    if (!Schema.isOrderResponse(encryptedOrderRes)) {
      const e = TypeError(
        `Expected OrderResponse got: ${typeof encryptedOrderRes}`
      )
      logger.error(e)
      throw e
    }

    /** @type {import('shock-common').Schema.OrderResponse &{ackNode:string}} */
    const orderResponse = {
      response: await SEA.decrypt(encryptedOrderRes.response, ourSecret),
      type: encryptedOrderRes.type,
      //@ts-expect-error
      ackNode: encryptedOrderRes.ackNode
    }

    logger.info('decoded orderResponse: ' + JSON.stringify(orderResponse))

    if (orderResponse.type === 'err') {
      throw new Error(orderResponse.response)
    }

    logger.info('Will now check for invoice amount mismatch')

    const encodedInvoice = orderResponse.response

    const { num_satoshis: decodedAmt } = await decodePayReq(encodedInvoice)

    if (decodedAmt.toString() !== amount.toString()) {
      throw new Error(
        `Invoice amount mismatch got: ${decodedAmt.toString()} expected: ${amount.toString()}`
      )
    }

    // double check
    if (Number(decodedAmt) !== Number(amount)) {
      throw new Error(
        `Invoice amount mismatch got:${Number(decodedAmt)} expected:${Number(
          amount
        )}`
      )
    }

    logger.info('Will now send payment through lightning')

    const payment = await sendPaymentV2Invoice({
      feeLimit,
      payment_request: orderResponse.response
    })
    const myLndPub = LNDHealthMananger.lndPub
    if (
      (opts.type !== 'contentReveal' &&
        opts.type !== 'torrentSeed' &&
        opts.type !== 'service' &&
        opts.type !== 'product') ||
      !orderResponse.ackNode
    ) {
      SchemaManager.AddOrder({
        type: opts.type,
        amount: parseInt(payment.value_sat, 10),
        coordinateHash: payment.payment_hash,
        coordinateIndex: parseInt(payment.payment_index, 10),
        fromLndPub: myLndPub || undefined,
        inbound: false,
        fromGunPub: getUser()._.sea.pub,
        toGunPub: to,
        invoiceMemo: memo
      })
      return { payment }
    }
    logger.info('ACK NODE')
    logger.info(orderResponse.ackNode)
    /** @type {import('shock-common').Schema.OrderResponse} */
    const encryptedOrderAckRes = await Common.makePromise((res, rej) => {
      setTimeout(() => {
        rej(
          new Error(
            "Timeout of 30s exceeded when waiting for order response's ack."
          )
        )
      }, 30000)

      require('../Mediator')
        .getGun()
        .user(to)
        .get(Key.ORDER_TO_RESPONSE)
        .get(orderResponse.ackNode)
        .on(orderResponse => {
          logger.info(orderResponse)
          logger.info(Schema.isOrderResponse(orderResponse))

          //@ts-expect-error
          if (orderResponse && orderResponse.type === 'orderAck') {
            //@ts-expect-error
            res(orderResponse)
          }
        })
    })

    if (!encryptedOrderAckRes || !encryptedOrderAckRes.type) {
      const e = TypeError(
        `Expected encryptedOrderAckRes got: ${typeof encryptedOrderAckRes}`
      )
      logger.error(e)
      throw e
    }

    const decryptedResponse = await SEA.decrypt(
      encryptedOrderAckRes.response,
      ourSecret
    )
    logger.info(`decryptedResponse: `, decryptedResponse)
    const parsedResponse = JSON.parse(decryptedResponse)
    logger.info(`parsedResponse: `, parsedResponse)

    /** @type {import('shock-common').Schema.OrderResponse} */
    const orderAck = {
      response: parsedResponse,
      type: encryptedOrderAckRes.type
    }

    logger.info('decoded encryptedOrderAck: ' + JSON.stringify(orderAck))

    if (orderAck.type === 'err') {
      throw new Error(orderAck.response)
    }

    if (orderAck.type !== 'orderAck') {
      throw new Error(`expected orderAck response, got: ${orderAck.type}`)
    }
    SchemaManager.AddOrder({
      type: opts.type,
      amount: parseInt(payment.value_sat, 10),
      coordinateHash: payment.payment_hash,
      coordinateIndex: parseInt(payment.payment_index, 10),
      fromLndPub: myLndPub || undefined,
      inbound: false,
      fromGunPub: getUser()._.sea.pub,
      toGunPub: to,
      invoiceMemo: memo,
      metadata: JSON.stringify(orderAck)
    })
    return { payment, orderAck }
  } catch (e) {
    logger.info(e)
    logger.error('Error inside sendPayment()')
    logger.error(e)
    throw e
  }
}

/**
 * Returns the preimage corresponding to the payment.
 * @param {string} to
 * @param {number} amount
 * @param {string} memo
 * @param {number} feeLimit
 * @throws {Error} If no response in less than 20 seconds from the recipient, or
 * lightning cannot find a route for the payment.
 * @returns {Promise<string>} The payment's preimage.
 */
const sendPayment = async (to, amount, memo, feeLimit) => {
  const res = await sendSpontaneousPayment(to, amount, memo, feeLimit)
  if (!res.payment) {
    throw new Error('invalid payment params') //only if it's a torrentSeed request to self
  }
  return res.payment.payment_preimage
}

/**
 * @param {UserGUNNode} user
 * @returns {Promise<void>}
 */
const generateOrderAddress = user =>
  new Promise((res, rej) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    const address = uuidv1()

    user.get(Key.CURRENT_ORDER_ADDRESS).put(address, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })

/**
 * @param {string|null} bio
 * @param {UserGUNNode} user
 * @throws {TypeError} Rejects if avatar is not an string or an empty string.
 * @returns {Promise<void>}
 */
const setBio = (bio, user) =>
  /** @type {Promise<void>} */ (new Promise((resolve, reject) => {
    if (!user.is) {
      throw new Error(ErrorCode.NOT_AUTH)
    }

    if (typeof bio === 'string' && bio.length === 0) {
      throw new TypeError(
        "'bio' must be an string and have length greater than one or be null"
      )
    }

    if (typeof bio !== 'string' && bio !== null) {
      throw new TypeError(
        "'bio' must be an string and have length greater than one or be null"
      )
    }

    user.get(Key.BIO).put(bio, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        reject(new Error(ack.err))
      } else {
        resolve()
      }
    })
  })).then(
    () =>
      new Promise((resolve, reject) => {
        user
          .get(Key.PROFILE)
          .get(Key.BIO)
          .put(bio, ack => {
            if (
              ack.err &&
              typeof ack.err !== 'number' &&
              typeof ack.err !== 'object'
            ) {
              reject(new Error(ack.err))
            } else {
              resolve()
            }
          })
      })
  )

/**
 * @param {string[]} mnemonicPhrase
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const saveSeedBackup = async (mnemonicPhrase, user, SEA) => {
  if (
    !Array.isArray(mnemonicPhrase) ||
    mnemonicPhrase.some(word => typeof word !== 'string') ||
    mnemonicPhrase.length === 0
  ) {
    throw new TypeError('expected mnemonicPhrase to be an string array')
  }

  const mySecret = require('../Mediator').getMySecret()
  const encryptedSeed = await SEA.encrypt(mnemonicPhrase.join(' '), mySecret)

  return new Promise((res, rej) => {
    user.get(Key.SEED_BACKUP).put(encryptedSeed, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })
}

/**
 * @param {string} backups
 * @param {UserGUNNode} user
 * @param {ISEA} SEA
 * @returns {Promise<void>}
 */
const saveChannelsBackup = async (backups, user, SEA) => {
  if (backups === '') {
    throw new TypeError('cant save an empty channel backup')
  }
  const mySecret = require('../Mediator').getMySecret()
  const encryptBackups = await SEA.encrypt(backups, mySecret)
  return new Promise((res, rej) => {
    user.get(Key.CHANNELS_BACKUP).put(encryptBackups, ack => {
      if (
        ack.err &&
        typeof ack.err !== 'number' &&
        typeof ack.err !== 'object'
      ) {
        rej(new Error(ack.err))
      } else {
        res()
      }
    })
  })
}

/**
 * @returns {Promise<void>}
 */
const setLastSeenApp = () => {
  const user = require('../Mediator').getUser()

  return user
    .get(Key.PROFILE)
    .get(Key.LAST_SEEN_APP)
    .pPut(Date.now())
}

/**
 * @param {string[]} tags
 * @param {string} title
 * @param {Common.Schema.ContentItem[]} content
 * @returns {Promise<[string, Common.Schema.RawPost]>}
 */
const createPostNew = async (tags, title, content) => {
  const SEA = require('../Mediator').mySEA
  /** @type {Common.Schema.RawPost} */
  const newPost = {
    date: Date.now(),
    status: 'publish',
    tags: tags.join('-'),
    title,
    contentItems: {}
  }

  const mySecret = require('../Mediator').getMySecret()

  await Common.Utils.asyncForEach(content, async c => {
    const uuid = Utils.gunID()
    newPost.contentItems[uuid] = c
    if (
      (c.type === 'image/embedded' || c.type === 'video/embedded') &&
      c.isPrivate
    ) {
      const encryptedMagnet = await SEA.encrypt(c.magnetURI, mySecret)
      newPost.contentItems[uuid] = { ...c, magnetURI: encryptedMagnet }
    } else {
      newPost.contentItems[uuid] = c
    }
  })

  /** @type {string} */
  const postID = await Common.makePromise((res, rej) => {
    const _n = require('../Mediator')
      .getUser()
      .get(Key.POSTS_NEW)
      .set(
        // @ts-expect-error
        newPost,
        ack => {
          if (
            ack.err &&
            typeof ack.err !== 'number' &&
            typeof ack.err !== 'object'
          ) {
            rej(new Error(ack.err))
          } else {
            res(_n._.get)
          }
        }
      )
  })

  return [postID, newPost]
}

/**
 * @param {string} postId
 * @param {string} page
 * @returns {Promise<void>}
 */
const deletePost = async (postId, page) => {
  await /** @type {Promise<void>} */ (new Promise((res, rej) => {
    require('../Mediator')
      .getUser()
      .get(Key.WALL)
      .get(Key.PAGES)
      .get(page)
      .get(Key.POSTS)
      .get(postId)
      .put(null, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  }))
}

/**
 * @param {string} publicKey
 * @param {boolean} isPrivate Will overwrite previous private status.
 * @returns {Promise<void>}
 */
const follow = async (publicKey, isPrivate) => {
  /** @type {import('shock-common').Schema.Follow} */
  const newFollow = {
    private: isPrivate,
    status: 'ok',
    user: publicKey
  }
  //why await if you dont need the response?
  await /** @type {Promise<void>} */ (new Promise((res, rej) => {
    require('../Mediator')
      .getUser()
      .get(Key.FOLLOWS)
      .get(publicKey)
      // @ts-ignore
      .put(newFollow, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  }))
}

/**
 * @param {string} publicKey
 * @returns {Promise<void>}
 */
const unfollow = publicKey =>
  new Promise((res, rej) => {
    require('../Mediator')
      .getUser()
      .get(Key.FOLLOWS)
      .get(publicKey)
      .put(null, ack => {
        if (
          ack.err &&
          typeof ack.err !== 'number' &&
          typeof ack.err !== 'object'
        ) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
  })

/**
 * @throws {Error}
 * @returns {Promise<void>}
 */
const initWall = async () => {
  const user = require('../Mediator').getUser()

  const promises = []

  promises.push(
    /** @type {Promise<void>} */ (new Promise((res, rej) => {
      user
        .get(Key.WALL)
        .get(Key.NUM_OF_PAGES)
        .put(0, ack => {
          if (
            ack.err &&
            typeof ack.err !== 'number' &&
            typeof ack.err !== 'object'
          ) {
            rej(new Error(ack.err))
          } else {
            res()
          }
        })
    }))
  )

  promises.push(
    /** @type {Promise<void>} */ (new Promise((res, rej) => {
      user
        .get(Key.WALL)
        .get(Key.PAGES)
        .get('0')
        .get(Key.POSTS)
        .put(
          {
            unused: null
          },
          ack => {
            if (
              ack.err &&
              typeof ack.err !== 'number' &&
              typeof ack.err !== 'object'
            ) {
              rej(new Error(ack.err))
            } else {
              res()
            }
          }
        )
    }))
  )

  promises.push(
    /** @type {Promise<void>} */ (new Promise((res, rej) => {
      user
        .get(Key.WALL)
        .get(Key.PAGES)
        .get('0')
        .get(Key.COUNT)
        .put(0, ack => {
          if (
            ack.err &&
            typeof ack.err !== 'number' &&
            typeof ack.err !== 'object'
          ) {
            rej(new Error(ack.err))
          } else {
            res()
          }
        })
    }))
  )

  await Promise.all(promises)
}

module.exports = {
  authenticate,
  blacklist,
  generateHandshakeAddress,
  setAvatar,
  setDisplayName,
  sendPayment,
  generateOrderAddress,
  setBio,
  saveSeedBackup,
  saveChannelsBackup,
  setLastSeenApp,
  deletePost,
  follow,
  unfollow,
  initWall,
  sendSpontaneousPayment,
  createPostNew,
  setDefaultSeedProvider,
  setSeedServiceData,
  setCurrentStreamInfo
}
