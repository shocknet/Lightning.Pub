/**
 * @prettier
 */
'use strict'

const Axios = require('axios')
const Crypto = require('crypto')
const Storage = require('node-persist')
const logger = require('../config/log')
const httpsAgent = require('https')
const responseTime = require('response-time')
const uuid = require('uuid/v4')
const Common = require('shock-common')
const isARealUsableNumber = require('lodash/isFinite')
const Big = require('big.js')
const size = require('lodash/size')
const { range, flatten, evolve } = require('ramda')
const path = require('path')

const getListPage = require('../utils/paginate')
const auth = require('../services/auth/auth')
const FS = require('../utils/fs')
const Encryption = require('../utils/encryptionStore')
const ECC = require('../utils/ECC')
const LightningServices = require('../utils/lightningServices')
const lndErrorManager = require('../utils/lightningServices/errors')
const GunDB = require('../services/gunDB/Mediator')
const {
  unprotectedRoutes,
  nonEncryptedRoutes
} = require('../utils/protectedRoutes')
const GunActions = require('../services/gunDB/contact-api/actions')
const GunGetters = require('../services/gunDB/contact-api/getters')
const GunKey = require('../services/gunDB/contact-api/key')
const LV2 = require('../utils/lightningServices/v2')
const GunWriteRPC = require('../services/gunDB/rpc')
const Key = require('../services/gunDB/contact-api/key')
const { startedStream, endStream } = require('../services/streams')
const channelRequest = require('../utils/lightningServices/channelRequests')
const TipsForwarder = require('../services/tipsCallback')

const DEFAULT_MAX_NUM_ROUTES_TO_QUERY = 10
const SESSION_ID = uuid()

// module.exports = (app) => {
module.exports = async (
  app,
  config,
  mySocketsEvents,
  { serverPort, CA, CA_KEY, usetls }
) => {
  try {
    const Http = Axios.create({
      httpsAgent: new httpsAgent.Agent({
        ca: await FS.readFile(CA)
      })
    })

    const sanitizeLNDError = (message = '') => {
      if (message.toLowerCase().includes('unknown')) {
        const splittedMessage = message.split('UNKNOWN: ')
        return splittedMessage.length > 1
          ? splittedMessage.slice(1).join('')
          : splittedMessage.join('')
      }

      return message
    }

    const getAvailableService = () => {
      return lndErrorManager.getAvailableService()
    }

    const checkHealth = async () => {
      let LNDStatus = {}
      try {
        const serviceStatus = await getAvailableService()
        LNDStatus = serviceStatus
      } catch (e) {
        LNDStatus = {
          message: e.message,
          success: false
        }
      }

      try {
        const APIHealth = await Http.get(
          `${usetls ? 'https' : 'http'}://localhost:${serverPort}/ping`
        )
        const APIStatus = {
          message: APIHealth.data,
          responseTime: APIHealth.headers['x-response-time'],
          success: true
        }
        return {
          LNDStatus,
          APIStatus,
          deploymentType: process.env.DEPLOYMENT_TYPE || 'default'
        }
      } catch (err) {
        logger.error(err)
        const APIStatus = {
          message: err.response.data,
          responseTime: err.response.headers['x-response-time'],
          success: false
        }
        logger.warn('Failed to retrieve API status', APIStatus)
        return {
          LNDStatus,
          APIStatus,
          deploymentType: process.env.DEPLOYMENT_TYPE || 'default'
        }
      }
    }

    const handleError = async (res, err) => {
      const health = await checkHealth()
      if (health.LNDStatus.success) {
        if (err) {
          res.json({
            errorMessage: sanitizeLNDError(err.message)
          })
        } else {
          res.sendStatus(403)
        }
      } else {
        res.status(500)
        res.json({ errorMessage: 'LND is down' })
      }
    }

    const recreateLnServices = async () => {
      await LightningServices.init()

      return true
    }

    const lastSeenMiddleware = (req, res, next) => {
      const { authorization } = req.headers
      const { path, method } = req
      if (
        !unprotectedRoutes[method][path] &&
        authorization &&
        GunDB.isAuthenticated()
      ) {
        GunActions.setLastSeenApp()
      }

      next()
    }

    const unlockWallet = password =>
      new Promise((resolve, reject) => {
        try {
          const args = {
            wallet_password: Buffer.from(password, 'utf-8')
          }
          const { walletUnlocker } = LightningServices.services
          walletUnlocker.unlockWallet(args, (unlockErr, unlockResponse) => {
            if (unlockErr) {
              reject(unlockErr)
              return
            }

            resolve(unlockResponse)
          })
        } catch (err) {
          if (err.message === 'unknown service lnrpc.WalletUnlocker') {
            resolve({
              field: 'walletUnlocker',
              message: 'Wallet already unlocked'
            })
            return
          }

          logger.error('Unlock Error:', err)

          reject({
            field: 'wallet',
            code: err.code,
            message: sanitizeLNDError(err.message)
          })
        }
      })

    // Hack to check whether or not a wallet exists
    const walletExists = async () => {
      try {
        const availableService = await getAvailableService()
        if (availableService.service === 'lightning') {
          return true
        }

        if (availableService.service === 'walletUnlocker') {
          const randomPassword = Crypto.randomBytes(4).toString('hex')
          try {
            await unlockWallet(randomPassword)
            return true
          } catch (err) {
            if (err.message.indexOf('invalid passphrase') > -1) {
              return true
            }
            return false
          }
        }
      } catch (err) {
        logger.error('LND error:', err)
        return false
      }
    }

    app.use((req, res, next) => {
      res.setHeader('x-session-id', SESSION_ID)
      next()
    })

    app.use((req, res, next) => {
      const legacyDeviceId = req.headers['x-shockwallet-device-id']
      const deviceId = req.headers['encryption-device-id']
      try {
        if (
          nonEncryptedRoutes.includes(req.path) ||
          process.env.DISABLE_SHOCK_ENCRYPTION === 'true' ||
          (deviceId && !legacyDeviceId)
        ) {
          return next()
        }

        if (!legacyDeviceId) {
          const error = {
            field: 'deviceId',
            message: 'Please specify a device ID'
          }
          logger.error('Please specify a device ID')
          return res.status(401).json(error)
        }

        if (!Encryption.isAuthorizedDevice({ deviceId: legacyDeviceId })) {
          const error = {
            field: 'deviceId',
            message: 'Please specify a device ID'
          }
          logger.error('Unknown Device')
          return res.status(401).json(error)
        }
        if (
          !req.body.encryptionKey &&
          !req.body.iv &&
          !req.headers['x-shock-encryption-token']
        ) {
          return next()
        }
        let reqData = null
        let IV = null
        let encryptedKey = null
        let encryptedToken = null
        if (req.method === 'GET' || req.method === 'DELETE') {
          if (req.headers['x-shock-encryption-token']) {
            encryptedToken = req.headers['x-shock-encryption-token']
            encryptedKey = req.headers['x-shock-encryption-key']
            IV = req.headers['x-shock-encryption-iv']
          }
        } else {
          encryptedToken = req.body.token
          encryptedKey = req.body.encryptionKey || req.body.encryptedKey
          IV = req.body.iv
          reqData = req.body.data || req.body.encryptedData
        }
        const decryptedKey = Encryption.decryptKey({
          deviceId: legacyDeviceId,
          message: encryptedKey
        })
        if (reqData) {
          const decryptedMessage = Encryption.decryptMessage({
            message: reqData,
            key: decryptedKey,
            iv: IV
          })
          req.body = JSON.parse(decryptedMessage)
        }

        const decryptedToken = encryptedToken
          ? Encryption.decryptMessage({
              message: encryptedToken,
              key: decryptedKey,
              iv: IV
            })
          : null

        if (decryptedToken) {
          req.headers.authorization = decryptedToken
        }

        return next()
      } catch (err) {
        logger.error(err)
        return res.status(401).json(err)
      }
    })

    app.use(async (req, res, next) => {
      const legacyDeviceId = req.headers['x-shockwallet-device-id']
      const deviceId = req.headers['encryption-device-id']
      try {
        if (
          nonEncryptedRoutes.includes(req.path) ||
          process.env.DISABLE_SHOCK_ENCRYPTION === 'true' ||
          (legacyDeviceId && !deviceId)
        ) {
          return next()
        }

        if (!deviceId) {
          const error = {
            field: 'deviceId',
            message: 'Please specify a device ID'
          }
          logger.error('Please specify a device ID')
          return res.status(401).json(error)
        }

        if (!ECC.isAuthorizedDevice({ deviceId })) {
          const error = {
            field: 'deviceId',
            message: 'Please specify a device ID'
          }
          logger.error('Unknown Device')
          return res.status(401).json(error)
        }

        if (req.method === 'GET' || req.method === 'DELETE') {
          return next()
        }

        if (!ECC.isEncryptedMessage(req.body)) {
          logger.warn('Message not encrypted!', req.body)
          return next()
        }

        logger.info('Decrypting ECC message...')

        const decryptedMessage = await ECC.decryptMessage({
          deviceId,
          encryptedMessage: req.body
        })

        // eslint-disable-next-line
        req.body = JSON.parse(decryptedMessage)

        return next()
      } catch (err) {
        logger.error(err)
        return res.status(401).json(err)
      }
    })

    app.use(async (req, res, next) => {
      if (unprotectedRoutes[req.method][req.path]) {
        next()
      } else {
        try {
          const response = await auth.validateToken(
            req.headers.authorization.replace('Bearer ', '')
          )
          if (response.valid) {
            next()
          } else {
            res.status(401).json({
              field: 'authorization',
              errorMessage: "The authorization token you've supplied is invalid"
            })
          }
        } catch (err) {
          logger.error(
            !req.headers.authorization
              ? 'Please add an Authorization header'
              : err
          )
          res
            .status(401)
            .json({ field: 'authorization', errorMessage: 'Please log in' })
        }
      }
    })

    app.use(async (req, res, next) => {
      try {
        if (unprotectedRoutes[req.method][req.path]) {
          next()
          return
        }

        if (req.path.includes('/api/lnd')) {
          const walletStatus = await walletExists()
          const availableService = await getAvailableService()
          const statusMessage = availableService.walletStatus
          if (availableService.code === 12) {
            return res.status(401).json({
              field: 'lnd_locked',
              errorMessage: availableService.message
                ? availableService.message
                : 'unknown'
            })
          }
          if (availableService.code === 14) {
            return res.status(401).json({
              field: 'lnd_dead',
              errorMessage: availableService.message
                ? availableService.message
                : 'unknown'
            })
          }
          if (walletStatus) {
            if (statusMessage === 'unlocked') {
              return next()
            }
            return res.status(401).json({
              field: 'wallet',
              errorMessage: availableService.message
                ? availableService.message
                : 'unknown'
            })
          }

          return res.status(401).json({
            field: 'wallet',
            errorMessage: 'Please create a wallet before using the API'
          })
        }

        if (req.path.includes('/api/gun')) {
          const authenticated = GunDB.isAuthenticated()

          if (!authenticated) {
            return res.status(401).json({
              field: 'gun',
              errorMessage: 'Please login in order to perform this action'
            })
          }
        }
        next()
      } catch (err) {
        logger.error(err)
        if (err.code === 12) {
          return res.status(401).json({
            field: 'lnd_locked',
            errorMessage: err.message ? err.message : 'unknown'
          })
        }
        if (err.code === 14) {
          return res.status(401).json({
            field: 'lnd_dead',
            errorMessage: err.message ? err.message : 'unknown'
          })
        }
        res.status(500).json({
          field: 'wallet',
          errorMessage: err.message ? err.message : err
        })
      }
    })

    app.use(lastSeenMiddleware)

    app.use(['/ping'], responseTime())

    /**
     * health check
     */
    app.get('/health', async (req, res) => {
      const health = await checkHealth()
      res.json(health)
    })

    app.get('/tunnel/status', async (req, res) => {
      const [relayId, relayUrl] = await Promise.all([
        Storage.getItem('relay/id'),
        Storage.getItem('relay/url')
      ])
      res.json({ uri: `${relayId}@${relayUrl}` })
    })

    /**
     * kubernetes health check
     */
    app.get('/healthz', async (req, res) => {
      const health = await checkHealth()
      logger.info('Healthz response:', health.APIStatus.success)
      res.json(health)
    })

    app.get('/ping', (req, res) => {
      logger.info('Ping completed!')
      res.json({ message: 'OK' })
    })

    app.post('/api/mobile/error', (req, res) => {
      logger.debug('Mobile error:', JSON.stringify(req.body))
      res.json({ msg: 'OK' })
    })

    app.post('/api/security/exchangeKeys', async (req, res) => {
      try {
        const { publicKey, deviceId } = req.body

        if (!publicKey) {
          return res.status(400).json({
            field: 'publicKey',
            message: 'Please provide a valid public key'
          })
        }

        if (
          !deviceId ||
          !/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/iu.test(
            deviceId
          )
        ) {
          return res.status(400).json({
            field: 'deviceId',
            message: 'Please provide a valid device ID'
          })
        }

        const authorizedDevice = await Encryption.authorizeDevice({
          deviceId,
          publicKey
        })
        logger.info(authorizedDevice)
        return res.json(authorizedDevice)
      } catch (err) {
        logger.error(err)
        return res.status(401).json({
          field: 'unknown',
          message: err
        })
      }
    })

    app.post('/api/encryption/exchange', async (req, res) => {
      try {
        const { publicKey, deviceId } = req.body

        if (!publicKey) {
          return res.status(400).json({
            field: 'publicKey',
            message: 'Please provide a valid public key'
          })
        }

        if (
          !deviceId ||
          !/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/iu.test(
            deviceId
          )
        ) {
          return res.status(400).json({
            field: 'deviceId',
            message: 'Please provide a valid device ID'
          })
        }

        const authorizedDevice = await ECC.authorizeDevice({
          deviceId,
          publicKey
        })
        return res.json(authorizedDevice)
      } catch (err) {
        logger.error(err)
        return res.status(401).json({
          field: 'unknown',
          message: err
        })
      }
    })

    app.get('/api/lnd/wallet/status', async (req, res) => {
      try {
        const walletStatus = await walletExists()
        const availableService = await getAvailableService()

        res.json({
          walletExists: walletStatus,
          walletStatus: walletStatus ? availableService.walletStatus : null
        })
      } catch (err) {
        logger.error(err)
        const sanitizedMessage = sanitizeLNDError(err.message)
        res.status(500).json({
          field: 'LND',
          errorMessage: sanitizedMessage
            ? sanitizedMessage
            : 'An unknown error has occurred, please try restarting your LND and API servers'
        })
      }
    })

    const validateToken = async token => {
      try {
        const tokenValid = await auth.validateToken(token)
        return tokenValid
      } catch (err) {
        return false
      }
    }

    app.post('/api/lnd/auth', async (req, res) => {
      try {
        const health = await checkHealth()
        const walletInitialized = await walletExists()
        // If we're connected to lnd, unlock the wallet using the password supplied
        // and generate an auth token if that operation was successful.
        if (health.LNDStatus.success && walletInitialized) {
          const { alias, password, invite } = req.body

          await recreateLnServices()

          if (GunDB.isAuthenticated()) {
            GunDB.logoff()
          }

          const publicKey = await GunDB.authenticate(alias, password)

          if (!publicKey) {
            res.status(401).json({
              field: 'alias',
              errorMessage: 'Invalid alias/password combination',
              success: false
            })
            return false
          }

          const trustedKeysEnabled =
            process.env.TRUSTED_KEYS === 'true' || !process.env.TRUSTED_KEYS
          const trustedKeys = await Storage.get('trustedPKs')
          // Falls back to true if trusted keys is disabled in .env
          const [isKeyTrusted = !trustedKeysEnabled] = (
            trustedKeys || []
          ).filter(trustedKey => trustedKey === publicKey)
          const walletUnlocked = health.LNDStatus.walletStatus === 'unlocked'
          const { authorization = '' } = req.headers

          if (!isKeyTrusted) {
            logger.warn('Untrusted public key!')
          }

          if (!walletUnlocked) {
            await unlockWallet(password)
          }

          if (walletUnlocked && !authorization && !isKeyTrusted) {
            res.status(401).json({
              field: 'alias',
              errorMessage:
                'Invalid alias/password combination (Untrusted Device)',
              success: false
            })
            return
          }

          if (walletUnlocked && !isKeyTrusted) {
            const validatedToken = await validateToken(
              authorization.replace('Bearer ', '')
            )

            if (!validatedToken) {
              res.status(401).json({
                field: 'alias',
                errorMessage:
                  'Invalid alias/password combination (Untrusted Auth Token)',
                success: false
              })
              return
            }
          }

          if (!isKeyTrusted) {
            await Storage.set('trustedPKs', [...(trustedKeys || []), publicKey])
          }

          const { lightning } = LightningServices.services

          // Generate auth token and send it as a JSON response
          const token = await auth.generateToken()

          // wait for wallet to warm up
          await Common.Utils.makePromise((res, rej) => {
            let tries = 0
            let intervalID = null

            intervalID = setInterval(() => {
              if (tries === 7) {
                rej(new Error(`Wallet did not warm up in under 7 seconds.`))

                clearInterval(intervalID)
                return
              }

              tries++

              lightning.listInvoices({}, err => {
                if (!err) {
                  clearInterval(intervalID)
                  res()
                }
              })
            }, 1000)
          })

          //get the latest channel backups before subscribing
          const user = require('../services/gunDB/Mediator').getUser()
          const SEA = require('../services/gunDB/Mediator').mySEA

          await Common.Utils.makePromise((res, rej) => {
            lightning.exportAllChannelBackups({}, (err, channelBackups) => {
              if (err) {
                return rej(new Error(err.details))
              }

              res(
                GunActions.saveChannelsBackup(
                  JSON.stringify(channelBackups),
                  user,
                  SEA
                )
              )
            })
          })

          // Send an event to update lightning's status
          mySocketsEvents.emit('updateLightning')

          //register to listen for channel backups
          const onNewChannelBackup = () => {
            logger.warn('Subscribing to channel backup ...')
            const stream = lightning.SubscribeChannelBackups({})
            stream.on('data', data => {
              logger.info(' New channel backup data')
              GunActions.saveChannelsBackup(JSON.stringify(data), user, SEA)
            })
            stream.on('end', () => {
              logger.info('Channel backup stream ended, starting a new one...')
              // Prevents call stack overflow exceptions
              //process.nextTick(onNewChannelBackup)
            })
            stream.on('error', err => {
              logger.error('Channel backup stream error:', err)
            })
            stream.on('status', status => {
              logger.error('Channel backup stream status:', status)
              switch (status.code) {
                case 0: {
                  logger.info('Channel backup stream ok')
                  break
                }
                case 2: {
                  //Happens to fire when the grpc client lose access to macaroon file
                  logger.warn('Channel backup got UNKNOWN error status')
                  break
                }
                case 12: {
                  logger.warn(
                    'Channel backup LND locked, new registration in 60 seconds'
                  )
                  process.nextTick(() =>
                    setTimeout(() => onNewChannelBackup(), 60000)
                  )
                  break
                }
                case 13: {
                  //https://grpc.github.io/grpc/core/md_doc_statuscodes.html
                  logger.error('Channel backup INTERNAL LND error')
                  break
                }
                case 14: {
                  logger.error(
                    'Channel backup LND disconnected, sockets reconnecting in 30 seconds...'
                  )
                  process.nextTick(() =>
                    setTimeout(() => onNewChannelBackup(), 30000)
                  )
                  break
                }
                default: {
                  logger.error('[event:transaction:new] UNKNOWN LND error')
                }
              }
            })
          }

          onNewChannelBackup()

          setTimeout(() => {
            channelRequest(invite)
          }, 30 * 1000)
          res.json({
            authorization: token,
            user: {
              alias,
              publicKey
            }
          })

          return true
        }

        if (!walletInitialized) {
          res.status(500).json({
            field: 'wallet',
            errorMessage: 'Please create a wallet before authenticating',
            success: false
          })
          return false
        }

        res.status(500)
        res.json({
          field: 'health',
          errorMessage: sanitizeLNDError(health.LNDStatus.message),
          success: false
        })
        return false
      } catch (err) {
        logger.error('Unlock Error:', err)
        res.status(400)
        res.json({
          field: 'user',
          errorMessage: err.message ? sanitizeLNDError(err.message) : err,
          success: false
        })
        return err
      }
    })

    app.post('/api/lnd/wallet', async (req, res) => {
      try {
        const { walletUnlocker } = LightningServices.services
        const { password, alias, invite } = req.body
        const healthResponse = await checkHealth()
        if (!alias) {
          return res.status(400).json({
            field: 'alias',
            errorMessage: 'Please specify an alias for your new wallet'
          })
        }

        if (!password) {
          return res.status(400).json({
            field: 'password',
            errorMessage: 'Please specify a password for your new wallet'
          })
        }

        if (password.length < 8) {
          return res.status(400).json({
            field: 'password',
            errorMessage:
              "Please specify a password that's longer than 8 characters"
          })
        }

        if (healthResponse.LNDStatus.service !== 'walletUnlocker') {
          return res.status(400).json({
            field: 'wallet',
            errorMessage: 'Wallet is already unlocked'
          })
        }

        walletUnlocker.genSeed({}, async (genSeedErr, genSeedResponse) => {
          try {
            if (genSeedErr) {
              logger.debug('GenSeed Error:', genSeedErr)

              const healthResponse = await checkHealth()
              if (healthResponse.LNDStatus.success) {
                const message = genSeedErr.details
                return res.status(400).json({
                  field: 'GenSeed',
                  errorMessage: message,
                  success: false
                })
              }

              return res.status(500).json({
                field: 'health',
                errorMessage: 'LND is down',
                success: false
              })
            }

            logger.debug('GenSeed:', genSeedResponse)
            const mnemonicPhrase = genSeedResponse.cipher_seed_mnemonic
            const walletArgs = {
              wallet_password: Buffer.from(password, 'utf8'),
              cipher_seed_mnemonic: mnemonicPhrase
            }

            // Register user before creating wallet
            const publicKey = await GunDB.register(alias, password)

            await GunActions.saveSeedBackup(
              mnemonicPhrase,
              GunDB.getUser(),
              GunDB.mySEA
            )

            const trustedKeys = await Storage.get('trustedPKs')
            await Storage.setItem('trustedPKs', [
              ...(trustedKeys || []),
              publicKey
            ])

            walletUnlocker.initWallet(
              walletArgs,
              async (initWalletErr, initWalletResponse) => {
                try {
                  if (initWalletErr) {
                    logger.error('initWallet Error:', initWalletErr.message)
                    const healthResponse = await checkHealth()
                    if (healthResponse.LNDStatus.success) {
                      const errorMessage = initWalletErr.details

                      return res.status(400).json({
                        field: 'initWallet',
                        errorMessage,
                        success: false
                      })
                    }
                    return res.status(500).json({
                      field: 'health',
                      errorMessage: 'LND is down',
                      success: false
                    })
                  }
                  logger.info('initWallet:', initWalletResponse)

                  const waitUntilFileExists = seconds => {
                    logger.info(
                      `Waiting for admin.macaroon to be created. Seconds passed: ${seconds} Path: ${LightningServices.servicesConfig.macaroonPath}`
                    )
                    setTimeout(async () => {
                      try {
                        const macaroonExists = await FS.access(
                          LightningServices.servicesConfig.macaroonPath
                        )

                        if (!macaroonExists) {
                          return waitUntilFileExists(seconds + 1)
                        }

                        logger.info('admin.macaroon file created')

                        await LightningServices.init()

                        const token = await auth.generateToken()
                        setTimeout(() => {
                          channelRequest(invite)
                        }, 30 * 1000)
                        return res.json({
                          mnemonicPhrase,
                          authorization: token,
                          user: {
                            alias,
                            publicKey
                          }
                        })
                      } catch (err) {
                        logger.error(err)
                        res.status(400).json({
                          field: 'unknown',
                          errorMessage: sanitizeLNDError(err.message)
                        })
                      }
                    }, 1000)
                  }

                  waitUntilFileExists(1)
                } catch (err) {
                  logger.error(err)
                  return res.status(500).json({
                    field: 'unknown',
                    errorMessage: err
                  })
                }
              }
            )
          } catch (err) {
            logger.error(err)
            return res.status(500).json({
              field: 'unknown',
              errorMessage: err.message || err
            })
          }
        })
      } catch (err) {
        logger.error(err)
        return res.status(500).json({
          field: 'unknown',
          errorMessage: err
        })
      }
    })

    app.post('/api/lnd/wallet/existing', async (req, res) => {
      try {
        const { password, alias, invite } = req.body
        const healthResponse = await checkHealth()
        const exists = await walletExists()
        if (!exists) {
          return res.status(500).json({
            field: 'wallet',
            errorMessage: 'LND wallet does not exist, please create a new one'
          })
        }

        if (!alias) {
          return res.status(400).json({
            field: 'alias',
            errorMessage: 'Please specify an alias for your wallet'
          })
        }

        if (!password) {
          return res.status(400).json({
            field: 'password',
            errorMessage: 'Please specify a password for your wallet alias'
          })
        }

        if (password.length < 8) {
          return res.status(400).json({
            field: 'password',
            errorMessage:
              "Please specify a password that's longer than 8 characters"
          })
        }

        if (healthResponse.LNDStatus.service !== 'walletUnlocker') {
          return res.status(400).json({
            field: 'wallet',
            errorMessage:
              'Wallet is already unlocked. Please restart your LND instance and try again.'
          })
        }

        try {
          await unlockWallet(password)
        } catch (err) {
          return res.status(401).json({
            field: 'wallet',
            errorMessage: 'Invalid LND wallet password'
          })
        }

        // Register user after verifying wallet password
        const publicKey = await GunDB.register(alias, password)

        const trustedKeys = await Storage.get('trustedPKs')
        await Storage.setItem('trustedPKs', [...(trustedKeys || []), publicKey])

        // Generate Access Token
        const token = await auth.generateToken()
        setTimeout(() => {
          channelRequest(invite)
        }, 30 * 1000)
        res.json({
          authorization: token,
          user: {
            alias,
            publicKey
          }
        })
      } catch (err) {
        return res.status(500).json({
          errorMessage: err.message
        })
      }
    })

    // get lnd info
    app.get('/api/lnd/getinfo', (req, res) => {
      const { lightning } = LightningServices.services

      lightning.getInfo({}, async (err, response) => {
        if (err) {
          logger.error('GetInfo Error:', err)
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'getInfo',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
        if (!response.uris || response.uris.length === 0) {
          if (config.lndAddress) {
            response.uris = [response.identity_pubkey + '@' + config.lndAddress]
          }
        }
        res.json(response)
      })
    })

    // get lnd node info
    app.post('/api/lnd/getnodeinfo', (req, res) => {
      const { lightning } = LightningServices.services

      lightning.getNodeInfo(
        { pub_key: req.body.pubkey },
        async (err, response) => {
          if (err) {
            logger.debug('GetNodeInfo Error:', err)
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(400)
              res.json({
                field: 'getNodeInfo',
                errorMessage: sanitizeLNDError(err.message)
              })
            } else {
              res.status(500)
              res.json({ errorMessage: 'LND is down' })
            }
          }
          logger.debug('GetNodeInfo:', response)
          res.json(response)
        }
      )
    })
    // get lnd chan info
    app.post('/api/lnd/getchaninfo', async (req, res) => {
      try {
        return res.json(await LV2.getChanInfo(req.body.chan_id))
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    app.get('/api/lnd/getnetworkinfo', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.getNetworkInfo({}, async (err, response) => {
        if (err) {
          logger.debug('GetNetworkInfo Error:', err)
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'getNodeInfo',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
        logger.debug('GetNetworkInfo:', response)
        res.json(response)
      })
    })

    // get lnd node active channels list
    app.get('/api/lnd/listpeers', async (req, res) => {
      try {
        return res.json({
          peers: await LV2.listPeers(req.body.latestError)
        })
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    // newaddress
    app.post('/api/lnd/newaddress', async (req, res) => {
      try {
        return res.json({
          address: await LV2.newAddress(req.body.type)
        })
      } catch (e) {
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    // connect peer to lnd node
    app.post('/api/lnd/connectpeer', (req, res) => {
      const { lightning } = LightningServices.services
      const connectRequest = {
        addr: { pubkey: req.body.pubkey, host: req.body.host },
        perm: true
      }
      logger.debug('ConnectPeer Request:', connectRequest)
      lightning.connectPeer(connectRequest, (err, response) => {
        if (err) {
          logger.debug('ConnectPeer Error:', err)
          res.status(500).json({
            field: 'connectPeer',
            errorMessage: sanitizeLNDError(err.message)
          })
        } else {
          logger.debug('ConnectPeer:', response)
          res.json(response)
        }
      })
    })

    // disconnect peer from lnd node
    app.post('/api/lnd/disconnectpeer', (req, res) => {
      const { lightning } = LightningServices.services
      const disconnectRequest = { pub_key: req.body.pubkey }
      logger.debug('DisconnectPeer Request:', disconnectRequest)
      lightning.disconnectPeer(disconnectRequest, (err, response) => {
        if (err) {
          logger.debug('DisconnectPeer Error:', err)
          res.status(400).json({
            field: 'disconnectPeer',
            errorMessage: sanitizeLNDError(err.message)
          })
        } else {
          logger.debug('DisconnectPeer:', response)
          res.json(response)
        }
      })
    })

    // get lnd node opened channels list
    app.get('/api/lnd/listchannels', async (_, res) => {
      try {
        return res.json({
          channels: await LV2.listChannels({ active_only: false })
        })
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    app.get('/api/lnd/pendingchannels', async (req, res) => {
      try {
        return res.json(await LV2.pendingChannels())
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    app.get('/api/lnd/unifiedTrx', (req, res) => {
      const { lightning } = LightningServices.services
      const { itemsPerPage, page, reversed = true } = req.query
      const offset = (page - 1) * itemsPerPage
      lightning.listPayments({}, (err, { payments = [] } = {}) => {
        if (err) {
          return handleError(res, err)
        }

        lightning.listInvoices(
          { reversed, index_offset: offset, num_max_invoices: itemsPerPage },
          (err, { invoices, last_index_offset }) => {
            if (err) {
              return handleError(res, err)
            }

            lightning.getTransactions({}, (err, { transactions = [] } = {}) => {
              if (err) {
                return handleError(res, err)
              }

              res.json({
                transactions: getListPage({
                  entries: transactions.reverse(),
                  itemsPerPage,
                  page
                }),
                payments: getListPage({
                  entries: payments.reverse(),
                  itemsPerPage,
                  page
                }),
                invoices: {
                  content: invoices.filter(invoice => invoice.settled),
                  page,
                  totalPages: Math.ceil(last_index_offset / itemsPerPage),
                  totalItems: last_index_offset
                }
              })
            })
          }
        )
      })
    })

    app.post('/api/lnd/unifiedTrx', async (req, res) => {
      try {
        const { type, amt, to, memo, feeLimit, ackInfo } = req.body
        if (
          type !== 'spontaneousPayment' &&
          type !== 'tip' &&
          type !== 'torrentSeed' &&
          type !== 'contentReveal' &&
          type !== 'service' &&
          type !== 'product' &&
          type !== 'other'
        ) {
          return res.status(415).json({
            field: 'type',
            errorMessage: `Only 'spontaneousPayment'| 'tip' | 'torrentSeed' | 'contentReveal' | 'service' | 'product' |'other' payments supported via this endpoint for now.`
          })
        }

        const amount = Number(amt)

        if (!isARealUsableNumber(amount)) {
          return res.status(400).json({
            field: 'amt',
            errorMessage: 'Not an usable number'
          })
        }

        if (amount < 1) {
          return res.status(400).json({
            field: 'amt',
            errorMessage: 'Must be 1 or greater.'
          })
        }

        if (!isARealUsableNumber(feeLimit)) {
          return res.status(400).json({
            field: 'feeLimit',
            errorMessage: 'Not an usable number'
          })
        }

        if (feeLimit < 1) {
          return res.status(400).json({
            field: 'feeLimit',
            errorMessage: 'Must be 1 or greater.'
          })
        }

        if (type === 'tip' && typeof ackInfo !== 'string') {
          return res.status(400).json({
            field: 'ackInfo',
            errorMessage: `Send ackInfo`
          })
        }

        return res.status(200).json(
          await GunActions.sendSpontaneousPayment(to, amt, memo, feeLimit, {
            type,
            ackInfo
          })
        )
      } catch (e) {
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    // get lnd node payments list
    app.get('/api/lnd/listpayments', (req, res) => {
      const { lightning } = LightningServices.services
      const { itemsPerPage, page, paginate = true } = req.query
      lightning.listPayments(
        {
          include_incomplete: !!req.include_incomplete
        },
        (err, { payments = [] } = {}) => {
          if (err) {
            logger.debug('ListPayments Error:', err)
            handleError(res, err)
          } else {
            logger.debug('ListPayments:', payments)
            if (paginate) {
              res.json(getListPage({ entries: payments, itemsPerPage, page }))
            } else {
              res.json({ payments })
            }
          }
        }
      )
    })

    app.get('/api/lnd/payments', async (req, res) => {
      const {
        include_incomplete,
        index_offset,
        max_payments,
        reversed
      } = /** @type {Common.APISchema.ListPaymentsRequest} */ (evolve(
        {
          include_incomplete: x => x === 'true',
          index_offset: x => Number(x),
          max_payments: x => Number(x),
          reversed: x => x === 'true'
        },
        req.query
      ))

      if (typeof include_incomplete !== 'boolean') {
        return res.status(400).json({
          field: 'include_incomplete',
          errorMessage: 'include_incomplete not a boolean'
        })
      }

      if (!isARealUsableNumber(index_offset)) {
        return res.status(400).json({
          field: 'index_offset',
          errorMessage: 'index_offset not a number'
        })
      }

      if (!isARealUsableNumber(max_payments)) {
        return res.status(400).json({
          field: 'max_payments',
          errorMessage: 'max_payments not a number'
        })
      }

      if (typeof reversed !== 'boolean') {
        return res.status(400).json({
          field: 'reversed',
          errorMessage: 'reversed not a boolean'
        })
      }

      return res.status(200).json(
        await LV2.listPayments({
          include_incomplete,
          index_offset,
          max_payments,
          reversed
        })
      )
    })

    // get lnd node invoices list
    app.get('/api/lnd/listinvoices', (req, res) => {
      const { lightning } = LightningServices.services
      const { page, itemsPerPage, reversed = true } = req.query
      const offset = (page - 1) * itemsPerPage
      // const limit = page * itemsPerPage;
      lightning.listInvoices(
        { reversed, index_offset: offset, num_max_invoices: itemsPerPage },
        async (err, { invoices, last_index_offset } = {}) => {
          if (err) {
            logger.debug('ListInvoices Error:', err)
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(400).json({
                errorMessage: sanitizeLNDError(err.message),
                success: false
              })
            } else {
              res.status(500)
              res.json({
                errorMessage: health.LNDStatus.message,
                success: false
              })
            }
          } else {
            // logger.debug("ListInvoices:", response);
            res.json({
              content: invoices,
              page,
              totalPages: Math.ceil(last_index_offset / itemsPerPage),
              success: true
            })
          }
        }
      )
    })

    // get lnd node forwarding history
    app.get('/api/lnd/forwardinghistory', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.forwardingHistory({}, async (err, response) => {
        if (err) {
          logger.debug('ForwardingHistory Error:', err)
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'forwardingHistory',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
        logger.debug('ForwardingHistory:', response)
        res.json(response)
      })
    })

    // get the lnd node wallet balance
    app.get('/api/lnd/walletbalance', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.walletBalance({}, async (err, response) => {
        if (err) {
          logger.debug('WalletBalance Error:', err)
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'walletBalance',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
        logger.debug('WalletBalance:', response)
        res.json(response)
      })
    })

    // get the lnd node wallet balance and channel balance
    app.get('/api/lnd/balance', async (req, res) => {
      const { lightning } = LightningServices.services
      const health = await checkHealth()
      lightning.walletBalance({}, (err, walletBalance) => {
        if (err) {
          logger.debug('WalletBalance Error:', err)
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'walletBalance',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json(health.LNDStatus)
          }
          return err
        }

        lightning.channelBalance({}, (err, channelBalance) => {
          if (err) {
            logger.debug('ChannelBalance Error:', err)
            if (health.LNDStatus.success) {
              res.status(400).json({
                field: 'channelBalance',
                errorMessage: sanitizeLNDError(err.message)
              })
            } else {
              res.status(500)
              res.json(health.LNDStatus)
            }
            return err
          }

          logger.debug('ChannelBalance:', channelBalance)
          res.json({
            ...walletBalance,
            channel_balance: channelBalance.balance,
            pending_channel_balance: channelBalance.pending_open_balance
          })
        })
      })
    })

    app.post('/api/lnd/decodePayReq', (req, res) => {
      const { lightning } = LightningServices.services
      const { payReq } = req.body
      lightning.decodePayReq(
        { pay_req: payReq },
        async (err, paymentRequest) => {
          if (err) {
            logger.debug('DecodePayReq Error:', err)
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(500).json({
                errorMessage: sanitizeLNDError(err.message)
              })
            } else {
              res.status(500).json({ errorMessage: 'LND is down' })
            }
          } else {
            logger.info('DecodePayReq:', paymentRequest)
            res.json({
              decodedRequest: paymentRequest
            })
          }
        }
      )
    })

    app.get('/api/lnd/channelbalance', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.channelBalance({}, async (err, response) => {
        if (err) {
          logger.debug('ChannelBalance Error:', err)
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'channelBalance',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
        logger.debug('ChannelBalance:', response)
        res.json(response)
      })
    })

    // openchannel
    app.post('/api/lnd/openchannel', (req, res) => {
      const { lightning } = LightningServices.services

      const {
        pubkey,
        channelCapacity,
        channelPushAmount,
        satPerByte
      } = req.body

      const openChannelRequest = {
        node_pubkey: Buffer.from(pubkey, 'hex'),
        local_funding_amount: channelCapacity,
        push_sat: channelPushAmount === '' ? '0' : channelPushAmount,
        sat_per_byte: satPerByte
      }
      logger.info('OpenChannelRequest', openChannelRequest)
      let finalEvent = null //Object to send to the socket, depends on final event from the stream
      const openedChannel = lightning.openChannel(openChannelRequest)
      openedChannel.on('data', response => {
        logger.debug('OpenChannelRequest:', response)
        if (res.headersSent) {
          //if res was already sent
          if (response.update === 'chan_open') {
            finalEvent = { status: 'chan_open' }
          }
        } else {
          res.json(response)
        }
      })
      openedChannel.on('error', async err => {
        logger.info('OpenChannelRequest Error:', err)
        if (res.headersSent) {
          finalEvent = { error: err.details } //send error on socket if http has already finished
        } else {
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(500).json({
              field: 'openChannelRequest',
              errorMessage: sanitizeLNDError(err.details)
            })
          } else if (!res.headersSent) {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
      })
      openedChannel.on('end', () => {
        if (finalEvent !== null) {
          //send the last event got from the stream
          //TO DO send finalEvent on socket
        }
      })
    })

    // closechannel
    app.post('/api/lnd/closechannel', (req, res) => {
      const { lightning } = LightningServices.services
      const { channelPoint, outputIndex, force, satPerByte } = req.body
      const closeChannelRequest = {
        channel_point: {
          funding_txid_bytes: Buffer.from(channelPoint, 'hex'),
          funding_txid_str: channelPoint,
          output_index: outputIndex,
          sat_per_byte: satPerByte
        },
        force
      }
      logger.info('CloseChannelRequest', closeChannelRequest)
      const closedChannel = lightning.closeChannel(closeChannelRequest)

      closedChannel.on('data', response => {
        if (!res.headersSent) {
          logger.info('CloseChannelRequest:', response)
          res.json(response)
        }
      })

      closedChannel.on('error', async err => {
        logger.error('CloseChannelRequest Error:', err)
        const health = await checkHealth()
        if (!res.headersSent) {
          if (health.LNDStatus.success) {
            logger.debug('CloseChannelRequest Error:', err)
            res.status(400).json({
              field: 'closeChannel',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
      })
    })

    // sendpayment
    app.post('/api/lnd/sendpayment', async (req, res) => {
      // this is the recommended value from lightning labs
      const { keysend, maxParts = 3, timeoutSeconds = 5, feeLimit } = req.body

      if (!feeLimit) {
        return res.status(400).json({
          errorMessage:
            'please provide a "feeLimit" to the send payment request'
        })
      }

      try {
        if (keysend) {
          const { dest, amt, finalCltvDelta = 40 } = req.body
          if (!dest || !amt) {
            return res.status(400).json({
              errorMessage:
                'please provide "dest" and "amt" for keysend payments'
            })
          }

          const payment = await LV2.sendPaymentV2Keysend({
            amt,
            dest,
            feeLimit,
            finalCltvDelta,
            maxParts,
            timeoutSeconds
          })

          return res.status(200).json(payment)
        }
        const { payreq } = req.body

        const payment = await LV2.sendPaymentV2Invoice({
          feeLimit,
          payment_request: payreq,
          amt: req.body.amt,
          max_parts: maxParts,
          timeoutSeconds
        })

        return res.status(200).json(payment)
      } catch (e) {
        let msg = 'Unknown Error'

        if (e.message) msg = e.message

        logger.error(e)
        return res.status(500).json({ errorMessage: msg })
      }
    })

    app.post('/api/lnd/trackpayment', (req, res) => {
      const { router } = LightningServices.services
      const { paymentHash, inflightUpdates = true } = req.body

      logger.info('Tracking payment payment', { paymentHash, inflightUpdates })
      const trackedPayment = router.trackPaymentV2({
        payment_hash: paymentHash,
        no_inflight_updates: !inflightUpdates
      })

      // only emits one event
      trackedPayment.on('data', response => {
        if (response.payment_error) {
          logger.error('TrackPayment Info:', response)
          return res.status(500).json({
            errorMessage: response.payment_error
          })
        }

        logger.info('TrackPayment Data:', response)
        return res.json(response)
      })

      trackedPayment.on('status', status => {
        logger.info('TrackPayment Status:', status)
      })

      trackedPayment.on('error', async err => {
        logger.error('TrackPayment Error:', err)
        const health = await checkHealth()
        if (health.LNDStatus.success) {
          res.status(500).json({
            errorMessage: sanitizeLNDError(err.message)
          })
        } else {
          res.status(500)
          res.json({ errorMessage: 'LND is down' })
        }
      })
    })

    app.post('/api/lnd/sendtoroute', (req, res) => {
      const { router } = LightningServices.services
      const { paymentHash, route } = req.body

      router.sendToRoute({ payment_hash: paymentHash, route }, (err, data) => {
        if (err) {
          logger.error('SendToRoute Error:', err)
          return res.status(400).json(err)
        }

        return res.json(data)
      })
    })

    app.post('/api/lnd/estimateroutefee', (req, res) => {
      const { router } = LightningServices.services
      const { dest, amount } = req.body

      router.estimateRouteFee({ dest, amt_sat: amount }, (err, data) => {
        if (err) {
          logger.error('EstimateRouteFee Error:', err)
          return res.status(400).json(err)
        }

        return res.json(data)
      })
    })

    // addinvoice
    app.post('/api/lnd/addinvoice', async (req, res) => {
      const { expiry, value, memo } = req.body
      const addInvoiceRes = await LV2.addInvoice(value, memo, true, expiry)

      if (value) {
        const channelsList = await LV2.listChannels({ active_only: true })
        let remoteBalance = Big(0)
        channelsList.forEach(element => {
          const remB = Big(element.remote_balance)
          if (remB.gt(remoteBalance)) {
            remoteBalance = remB
          }
        })

        addInvoiceRes.liquidityCheck = remoteBalance > value
        //newInvoice.remoteBalance = remoteBalance
      }

      try {
        return res.json(addInvoiceRes)
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    })

    // signmessage
    app.post('/api/lnd/signmessage', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.signMessage(
        { msg: Buffer.from(req.body.msg, 'utf8') },
        async (err, response) => {
          if (err) {
            logger.debug('SignMessage Error:', err)
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(400).json({
                field: 'signMessage',
                errorMessage: sanitizeLNDError(err.message)
              })
            } else {
              res.status(500)
              res.json({ errorMessage: 'LND is down' })
            }
          }
          logger.debug('SignMessage:', response)
          res.json(response)
        }
      )
    })

    // verifymessage
    app.post('/api/lnd/verifymessage', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.verifyMessage(
        {
          msg: Buffer.from(req.body.msg, 'utf8'),
          signature: req.body.signature
        },
        async (err, response) => {
          if (err) {
            logger.debug('VerifyMessage Error:', err)
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(400).json({
                field: 'verifyMessage',
                errorMessage: sanitizeLNDError(err.message)
              })
            } else {
              res.status(500)
              res.json({ errorMessage: 'LND is down' })
            }
          }
          logger.debug('VerifyMessage:', response)
          res.json(response)
        }
      )
    })

    // sendcoins
    app.post('/api/lnd/sendcoins', (req, res) => {
      const { lightning } = LightningServices.services
      const sendCoinsRequest = {
        addr: req.body.addr,
        amount: req.body.amount,
        sat_per_byte: req.body.satPerByte,
        send_all: req.body.send_all === true
      }
      logger.debug('SendCoins', sendCoinsRequest)
      lightning.sendCoins(sendCoinsRequest, async (err, response) => {
        if (err) {
          logger.debug('SendCoins Error:', err)
          const health = await checkHealth()
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: 'sendCoins',
              errorMessage: sanitizeLNDError(err.message)
            })
          } else {
            res.status(500)
            res.json({ errorMessage: 'LND is down' })
          }
        }
        logger.debug('SendCoins:', response)
        res.json(response)
      })
    })

    // queryroute
    app.post('/api/lnd/queryroute', (req, res) => {
      const { lightning } = LightningServices.services
      const numRoutes =
        config.maxNumRoutesToQuery || DEFAULT_MAX_NUM_ROUTES_TO_QUERY
      lightning.queryRoutes(
        { pub_key: req.body.pubkey, amt: req.body.amt, num_routes: numRoutes },
        async (err, response) => {
          if (err) {
            logger.debug('QueryRoute Error:', err)
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(400).json({
                field: 'queryRoute',
                errorMessage: sanitizeLNDError(err.message)
              })
            } else {
              res.status(500)
              res.json({ errorMessage: 'LND is down' })
            }
          }
          logger.debug('QueryRoute:', response)
          res.json(response)
        }
      )
    })

    app.post('/api/lnd/estimatefee', (req, res) => {
      const { lightning } = LightningServices.services
      const { amount, confirmationBlocks } = req.body
      lightning.estimateFee(
        {
          AddrToAmount: {
            tb1qnpq3vj8p6jymah6nnh6wz3p333tt360mq32dtt: amount
          },
          target_conf: confirmationBlocks
        },
        async (err, fee) => {
          if (err) {
            const health = await checkHealth()
            if (health.LNDStatus.success) {
              res.status(400).json({
                error: err.message
              })
            } else {
              res.status(500)
              res.json({ errorMessage: 'LND is down' })
            }
          } else {
            logger.debug('EstimateFee:', fee)
            res.json(fee)
          }
        }
      )
    })

    const listunspent = async (req, res) => {
      try {
        return res.status(200).json({
          utxos: await LV2.listUnspent(
            req.body.minConfirmations,
            req.body.maxConfirmations
          )
        })
      } catch (e) {
        return res.status(500).json({
          errorMessage: e.message
        })
      }
    }

    app.get('/api/lnd/listunspent', listunspent)

    // TODO: should be GET
    app.post('/api/lnd/listunspent', listunspent)

    app.get('/api/lnd/transactions', (req, res) => {
      const { lightning } = LightningServices.services
      const { page, paginate = true, itemsPerPage } = req.query
      lightning.getTransactions({}, (err, { transactions = [] } = {}) => {
        if (err) {
          return handleError(res, err)
        }
        logger.debug('Transactions:', transactions)
        if (paginate) {
          res.json(getListPage({ entries: transactions, itemsPerPage, page }))
        } else {
          res.json({ transactions })
        }
      })
    })

    app.post('/api/lnd/sendmany', (req, res) => {
      const { lightning } = LightningServices.services
      const { addresses, satPerByte } = req.body
      lightning.sendMany(
        { AddrToAmount: addresses, sat_per_byte: satPerByte },
        (err, transactions) => {
          if (err) {
            return handleError(res, err)
          }
          logger.debug('Transactions:', transactions)
          res.json(transactions)
        }
      )
    })

    app.get('/api/lnd/closedchannels', (req, res) => {
      const { lightning } = LightningServices.services
      const { closeTypeFilters = [] } = req.query
      const lndFilters = closeTypeFilters.reduce(
        (filters, filter) => ({ ...filters, [filter]: true }),
        {}
      )
      lightning.closedChannels(lndFilters, (err, channels) => {
        if (err) {
          return handleError(res, err)
        }
        logger.debug('Channels:', channels)
        res.json(channels)
      })
    })

    app.post('/api/lnd/exportchanbackup', (req, res) => {
      const { lightning } = LightningServices.services
      const { channelPoint } = req.body
      lightning.exportChannelBackup(
        { chan_point: { funding_txid_str: channelPoint } },
        (err, backup) => {
          if (err) {
            return handleError(res, err)
          }
          logger.debug('ExportChannelBackup:', backup)
          res.json(backup)
        }
      )
    })

    app.post('/api/lnd/exportallchanbackups', (req, res) => {
      const { lightning } = LightningServices.services
      lightning.exportAllChannelBackups({}, (err, channelBackups) => {
        if (err) {
          return handleError(res, err)
        }
        logger.debug('ExportAllChannelBackups:', channelBackups)
        res.json(channelBackups)
      })
    })

    const GunEvent = Common.Constants.Event

    app.get('/api/gun/lndchanbackups', async (req, res) => {
      try {
        const user = require('../services/gunDB/Mediator').getUser()

        const SEA = require('../services/gunDB/Mediator').mySEA
        const mySecret = require('../services/gunDB/Mediator').getMySecret()
        const encBackup = await user.get(Key.CHANNELS_BACKUP).then()
        const backup = await SEA.decrypt(encBackup, mySecret)
        logger.info(backup)
        res.json({ data: backup })
      } catch (err) {
        res.json({ ok: 'err' })
      }
    })

    ////////////////////////////////////////////////////////////////////////////////

    app.post(`/api/gun/sendpayment`, async (req, res) => {
      const {
        recipientPub,
        amount,
        memo,
        maxParts,
        timeoutSeconds,
        feeLimit,
        sessionUuid
      } = req.body
      logger.info('handling spont pay')
      if (!feeLimit) {
        logger.error(
          'please provide a "feeLimit" to the send spont payment request'
        )
        return res.status(500).json({
          errorMessage:
            'please provide a "feeLimit" to the send spont payment request'
        })
      }
      if (!recipientPub || !amount) {
        logger.info(
          'please provide a "recipientPub" and "amount" to the send spont payment request'
        )
        return res.status(500).json({
          errorMessage:
            'please provide a "recipientPub" and "amount" to the send spont payment request'
        })
      }
      try {
        const preimage = await GunActions.sendPayment(
          recipientPub,
          amount,
          memo,
          feeLimit,
          maxParts,
          timeoutSeconds
        )
        res.json({ preimage, sessionUuid })
      } catch (err) {
        logger.info('spont pay err:', err)
        return res.status(500).json({
          errorMessage: err.message
        })
      }
    })

    app.post(`/api/gun/wall/`, async (req, res) => {
      try {
        const { tags, title, contentItems, enableTipsOverlay } = req.body
        const SEA = require('../services/gunDB/Mediator').mySEA
        const postRes = await GunActions.createPostNew(
          tags,
          title,
          contentItems,
          SEA
        )
        if (enableTipsOverlay) {
          const [postID] = postRes
          const accessId = TipsForwarder.enablePostNotifications(postID)
          return res.status(200).json([...postRes, accessId])
        }
        return res.status(200).json(postRes)
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage:
            (typeof e === 'string' ? e : e.message) || 'Unknown error.'
        })
      }
    })

    app.delete(`/api/gun/wall/:postInfo`, async (req, res) => {
      try {
        const { postInfo } = req.params
        const parts = postInfo.split('&')
        const [page, postId] = parts
        if (!page || !postId) {
          throw new Error(`please provide a "postId" and a "page"`)
        }
        await GunActions.deletePost(postId, page)
        return res.status(200).json({
          ok: 'true'
        })
      } catch (e) {
        return res.status(500).json({
          errorMessage:
            (typeof e === 'string' ? e : e.message) || 'Unknown error.'
        })
      }
    })

    /////////////////////////////////
    /**
     * @template P
     * @typedef {import('express-serve-static-core').RequestHandler<P>} RequestHandler
     */

    const ap = /** @type {Application} */ (app)

    /**
     * @typedef {object} FollowsRouteParams
     * @prop {(string|undefined)=} publicKey
     */

    /**
     * @type {RequestHandler<FollowsRouteParams>}
     */
    const apiGunFollowsPut = async (req, res) => {
      try {
        const { publicKey } = req.params
        if (!publicKey) {
          throw new Error(`Missing publicKey route param.`)
        }

        await GunActions.follow(req.params.publicKey, false)

        // 201 would be extraneous here. Implement it inside app.put
        return res.status(200).json({
          ok: true
        })
      } catch (err) {
        return res.status(500).json({
          errorMessage: err.message || 'Unknown error inside /api/gun/follows/'
        })
      }
    }

    /**
     * @type {RequestHandler<FollowsRouteParams>}
     */
    const apiGunFollowsDelete = async (req, res) => {
      try {
        const { publicKey } = req.params
        if (!publicKey) {
          throw new Error(`Missing publicKey route param.`)
        }

        await GunActions.unfollow(req.params.publicKey)

        return res.status(200).json({
          ok: true
        })
      } catch (err) {
        return res.status(500).json({
          errorMessage: err.message || 'Unknown error inside /api/gun/follows/'
        })
      }
    }

    ap.get('/api/gun/initwall', async (req, res) => {
      try {
        await GunActions.initWall()
        res.json({ ok: true })
      } catch (err) {
        logger.error(err)
        return res.status(500).json({
          errorMessage: err.message
        })
      }
    })
    ap.put(`/api/gun/follows/:publicKey`, apiGunFollowsPut)
    ap.delete(`/api/gun/follows/:publicKey`, apiGunFollowsDelete)

    /**
     * @type {RequestHandler<{}>}
     */
    const apiGunMeGet = async (_, res) => {
      try {
        return res.status(200).json(await GunGetters.getMyUser())
      } catch (err) {
        logger.error(err)
        return res.status(500).json({
          errorMessage: err.message
        })
      }
    }

    /**
     * @type {RequestHandler<{}>}
     */
    const apiGunMePut = async (req, res) => {
      /**
       * @typedef {Omit<Common.Schema.User, 'publicKey'>} UserWithoutPK
       * @typedef {{ handshakeAddress: boolean }} HasHandshakeAddress
       * @typedef {UserWithoutPK & HasHandshakeAddress} MePutBody
       */
      try {
        const {
          avatar,
          bio,
          displayName,
          handshakeAddress
        } = /** @type {Partial<MePutBody>} */ (req.body)

        if (avatar) {
          await GunActions.setAvatar(
            avatar,
            require('../services/gunDB/Mediator').getUser()
          )
        }

        if (bio) {
          await GunActions.setBio(
            bio,
            require('../services/gunDB/Mediator').getUser()
          )
        }

        if (displayName) {
          await GunActions.setDisplayName(
            displayName,
            require('../services/gunDB/Mediator').getUser()
          )
        }

        if (handshakeAddress) {
          await GunActions.generateHandshakeAddress()
        }

        return res.status(200).json({
          ok: true
        })
      } catch (err) {
        logger.error(err)
        return res.status(500).json({
          errorMessage: err.message
        })
      }
    }

    ap.get(`/api/gun/me`, apiGunMeGet)
    ap.put(`/api/gun/me`, apiGunMePut)

    ap.get(`/api/gun/auth`, (_, res) => {
      const { isAuthenticated } = require('../services/gunDB/Mediator')

      return res.status(200).json({
        data: isAuthenticated()
      })
    })

    /**
     * @typedef {object} HandleGunFetchParams
     * @prop {'once'|'load'} type
     * @prop {boolean} startFromUserGraph
     * @prop {string} path
     * @prop {string=} publicKey
     * @prop {string=} publicKeyForDecryption
     * @prop {string=} epubForDecryption
     */
    /**
     * @param {HandleGunFetchParams} args0
     * @returns {Promise<unknown>}
     */
    const handleGunFetch = ({
      type,
      startFromUserGraph,
      path,
      publicKey,
      publicKeyForDecryption,
      epubForDecryption
    }) => {
      const keys = path.split('>')
      const { tryAndWait } = require('../services/gunDB/contact-api/utils')
      return tryAndWait((gun, user) => {
        // eslint-disable-next-line no-nested-ternary
        let node = startFromUserGraph
          ? user
          : publicKey
          ? gun.user(publicKey)
          : gun
        keys.forEach(key => (node = node.get(key)))

        return new Promise((res, rej) => {
          const listener = data => {
            if (publicKeyForDecryption) {
              GunWriteRPC.deepDecryptIfNeeded(
                data,
                publicKeyForDecryption,
                epubForDecryption
              )
                .then(res)
                .catch(rej)
            } else {
              res(data)
            }
          }

          if (type === 'once') node.once(listener)
          if (type === 'load') node.load(listener)
        })
      })
    }

    /**
     * Used decryption of incoming data.
     */
    const PUBKEY_FOR_DECRYPT_HEADER = 'public-key-for-decryption'
    /**
     * Used decryption of incoming data.
     */
    const EPUB_FOR_DECRYPT_HEADER = 'epub-for-decryption'

    ap.get('/api/gun/once/:path', async (req, res) => {
      const publicKeyForDecryption = req.header(PUBKEY_FOR_DECRYPT_HEADER)
      const epubForDecryption = req.header(EPUB_FOR_DECRYPT_HEADER)
      const { path } = req.params
      logger.info(`gun ONCE: ${path}`)
      res.status(200).json({
        data: await handleGunFetch({
          path,
          startFromUserGraph: false,
          type: 'once',
          publicKeyForDecryption,
          epubForDecryption
        })
      })
    })

    ap.get('/api/gun/load/:path', async (req, res) => {
      const publicKeyForDecryption = req.header(PUBKEY_FOR_DECRYPT_HEADER)
      const epubForDecryption = req.header(EPUB_FOR_DECRYPT_HEADER)
      const { path } = req.params
      logger.info(`gun LOAD: ${path}`)
      res.status(200).json({
        data: await handleGunFetch({
          path,
          startFromUserGraph: false,
          type: 'load',
          publicKeyForDecryption,
          epubForDecryption
        })
      })
    })

    ap.get('/api/gun/user/once/:path', async (req, res) => {
      const publicKeyForDecryption = req.header(PUBKEY_FOR_DECRYPT_HEADER)
      const epubForDecryption = req.header(EPUB_FOR_DECRYPT_HEADER)
      const { path } = req.params
      logger.info(`gun otheruser ONCE: ${path}`)
      res.status(200).json({
        data: await handleGunFetch({
          path,
          startFromUserGraph: true,
          type: 'once',
          publicKeyForDecryption,
          epubForDecryption
        })
      })
    })

    ap.get('/api/gun/user/load/:path', async (req, res) => {
      const publicKeyForDecryption = req.header(PUBKEY_FOR_DECRYPT_HEADER)
      const epubForDecryption = req.header(EPUB_FOR_DECRYPT_HEADER)
      const { path } = req.params
      logger.info(`gun otheruser LOAD: ${path}`)
      res.status(200).json({
        data: await handleGunFetch({
          path,
          startFromUserGraph: true,
          type: 'load',
          publicKeyForDecryption,
          epubForDecryption
        })
      })
    })

    ap.get('/api/gun/otheruser/:publicKey/:type/:path', async (req, res) => {
      const allowedTypes = ['once', 'load', 'open']
      const publicKeyForDecryption = req.header(PUBKEY_FOR_DECRYPT_HEADER)
      const epubForDecryption = req.header(EPUB_FOR_DECRYPT_HEADER)
      const { path /*:rawPath*/, publicKey, type } = req.params
      logger.info(`gun otheruser ${type}: ${path}`)
      // const path = decodeURI(rawPath)
      if (!publicKey || publicKey === 'undefined') {
        res.status(400).json({
          errorMessage: 'Invalid publicKey specified'
        })
        return
      }

      if (!allowedTypes.includes(type)) {
        res.status(400).json({
          errorMessage: 'Invalid type specified'
        })
        return
      }
      try {
        res.status(200).json({
          data: await handleGunFetch({
            path,
            startFromUserGraph: false,
            type,
            publicKey,
            publicKeyForDecryption,
            epubForDecryption
          })
        })
      } catch (err) {
        res
          .status(
            err.message === Common.Constants.ErrorCode.NOT_AUTH ? 401 : 500
          )
          .json({
            errorMessage: err.message
          })
      }
    })

    ap.post('/api/lnd/cb/:methodName', (req, res) => {
      try {
        const { lightning } = LightningServices.services
        const { methodName } = req.params
        logger.info(`lnd RPC: ${methodName}`)
        const args = req.body

        lightning[methodName](args, (err, lres) => {
          if (err) {
            res.status(500).json({
              errorMessage: err.details
            })
          } else if (lres) {
            res.status(200).json(lres)
          } else {
            res.status(500).json({
              errorMessage: 'Unknown error'
            })
          }
        })
      } catch (err) {
        logger.warn(`Error inside api cb:`)
        logger.error(err)
        logger.error(err.message)

        return res.status(500).json({
          errorMessage: err.message
        })
      }
    })

    ap.post('/api/gun/put', async (req, res) => {
      try {
        const { path, value } = req.body
        logger.info(`gun PUT: ${path}`)
        await GunWriteRPC.put(path, value)

        res.status(200).json({
          ok: true
        })
      } catch (err) {
        res
          .status(
            err.message === Common.Constants.ErrorCode.NOT_AUTH ? 401 : 500
          )
          .json({
            errorMessage: err.message
          })
      }
    })

    ap.post('/api/gun/set', async (req, res) => {
      try {
        const { path, value } = req.body
        logger.info(`gun PUT: ${path}`)
        const id = await GunWriteRPC.set(path, value)

        res.status(200).json({
          ok: true,
          id
        })
      } catch (err) {
        res
          .status(
            err.message === Common.Constants.ErrorCode.NOT_AUTH ? 401 : 500
          )
          .json({
            errorMessage: err.message
          })
      }
    })

    ap.get('/api/log', async (_, res) => {
      try {
        // https://github.com/winstonjs/winston#querying-logs
        /**
         * @type {import('winston').QueryOptions}
         */
        const options = {
          from: new Date() - 1 * 60 * 60 * 1000,
          until: new Date()
        }

        const results = await Common.Utils.makePromise((res, rej) => {
          logger.query(options, (err, results) => {
            if (err) {
              rej(err)
            } else {
              res(results)
            }
          })
        })

        res.status(200).json(results)
      } catch (e) {
        res
          .status(e.message === Common.Constants.ErrorCode.NOT_AUTH ? 401 : 500)
          .json({
            errorMessage: e.message
          })
      }
    })
    //this is for OBS notifications, not wired with UI.
    ap.get('/api/subscribeStream', (req, res) => {
      res.sendFile(path.join(__dirname, '/index.html'))
    })
    ap.post('/api/enableNotificationsOverlay', (req, res) => {
      const { postID } = req.body
      if (!postID) {
        return res.status(400).json({
          errorMessage: 'no post id provided'
        })
      }
      const accessId = TipsForwarder.enablePostNotifications(postID)
      res.json({
        accessId
      })
    })
    //this is for wasLive/isLive status
    ap.post('/api/listenStream', (req, res) => {
      try {
        startedStream(req.body)
        return res.status(200).json({
          ok: true
        })
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage:
            (typeof e === 'string' ? e : e.message) || 'Unknown error.'
        })
      }
    })
    ap.post('/api/stopStream', (req, res) => {
      try {
        endStream(req.body)
        return res.status(200).json({
          ok: true
        })
      } catch (e) {
        logger.error(e)
        return res.status(500).json({
          errorMessage:
            (typeof e === 'string' ? e : e.message) || 'Unknown error.'
        })
      }
    })
  } catch (err) {
    logger.warn('Unhandled rejection:', err)
  }
}
