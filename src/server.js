/**
 * @prettier
 */
// @ts-check

const ECCrypto = require('eccrypto')

const ECC = require('../utils/ECC')

/**
 * This API run's private key.
 */
const runPrivateKey = ECCrypto.generatePrivate()
/**
 * This API run's public key.
 */
const runPublicKey = ECCrypto.getPublic(runPrivateKey)

process.on('uncaughtException', e => {
  console.log('something bad happened!')
  console.log(e)
})
/**
 * Module dependencies.
 */
const server = program => {
  const Http = require('http')
  const Https = require('https')
  const FS = require('fs')
  const Express = require('express')
  const Crypto = require('crypto')
  const Dotenv = require('dotenv')
  const Storage = require('node-persist')
  const Path = require('path')
  const { Logger: CommonLogger } = require('shock-common')
  const binaryParser = require('socket.io-msgpack-parser')

  const LightningServices = require('../utils/lightningServices')
  const app = Express()

  const compression = require('compression')
  const bodyParser = require('body-parser')
  const session = require('express-session')
  const methodOverride = require('method-override')
  const qrcode = require('qrcode-terminal')
  const relayClient = require('hybrid-relay-client/build')
  const {
    sensitiveRoutes,
    nonEncryptedRoutes
  } = require('../utils/protectedRoutes')

  /**
   * An offline-only private key used for authenticating a client's key
   * exchange. Neither the tunnel nor the WWW should see this private key, it
   * should only be served through STDOUT (via QR or else).
   */
  const accessSecret = program.tunnel ? ECCrypto.generatePrivate() : null

  // load app default configuration data
  const defaults = require('../config/defaults')(program.mainnet)
  const rootFolder = program.rootPath || process.resourcesPath || __dirname

  // define env variables
  Dotenv.config()

  const serverPort = program.serverport || defaults.serverPort
  const serverHost = program.serverhost || defaults.serverHost
  const tunnelHost = process.env.LOCAL_TUNNEL_SERVER || defaults.localtunnelHost

  // setup winston logging ==========
  const logger = require('../config/log')

  CommonLogger.setLogger(logger)

  // utilities functions =================
  require('../utils/server-utils')(module)

  logger.info('Mainnet Mode:', !!program.mainnet)

  if (process.env.SHOCK_ENCRYPTION_ECC === 'false') {
    logger.error('Encryption Mode: false')
  } else {
    logger.info('Encryption Mode: true')
  }

  const stringifyData = data => {
    if (typeof data === 'object') {
      const stringifiedData = JSON.stringify(data)
      return stringifiedData
    }

    if (data.toString) {
      return data.toString()
    }

    return data
  }

  const hashData = data => {
    return Crypto.createHash('SHA256')
      .update(Buffer.from(stringifyData(data)))
      .digest('hex')
  }

  /**
   * @param {Express.Request} req
   * @param {Express.Response} res
   * @param {(() => void)} next
   */
  const modifyResponseBody = (req, res, next) => {
    const deviceId = req.headers['encryption-device-id']
    const oldSend = res.send

    console.log({
      deviceId,
      encryptionDisabled: process.env.SHOCK_ENCRYPTION_ECC === 'false',
      unprotectedRoute: nonEncryptedRoutes.includes(req.path)
    })

    if (
      nonEncryptedRoutes.includes(req.path) ||
      process.env.SHOCK_ENCRYPTION_ECC === 'false'
    ) {
      next()
      return
    }

    // @ts-expect-error
    res.send = (...args) => {
      if (args[0] && args[0].ciphertext && args[0].iv) {
        logger.warn('Response loop detected!')
        oldSend.apply(res, args)
        return
      }

      if (typeof deviceId !== 'string' || !deviceId) {
        // TODO
      }

      const authorized = ECC.devicePublicKeys.has(deviceId)

      // Using classic promises syntax to avoid
      // modifying res.send's return type
      if (authorized && process.env.SHOCK_ENCRYPTION_ECC !== 'false') {
        const devicePub = Buffer.from(ECC.devicePublicKeys.get(deviceId))

        ECCrypto.encrypt(devicePub, Buffer.from(args[0], 'utf-8')).then(
          encryptedMessage => {
            args[0] = JSON.stringify(encryptedMessage)
            oldSend.apply(res, args)
          }
        )
      }

      if (!authorized || process.env.SHOCK_ENCRYPTION_ECC === 'false') {
        if (!authorized) {
          logger.warn(
            `An unauthorized Device ID is contacting the API: ${deviceId}`
          )
          logger.warn(
            `Authorized Device IDs: ${[...ECC.devicePublicKeys.keys()].join(
              ', '
            )}`
          )
        }
        args[0] = JSON.stringify(args[0])
        oldSend.apply(res, args)
      }
    }

    next()
  }

  const wait = seconds =>
    new Promise(resolve => {
      const timer = setTimeout(() => resolve(timer), seconds * 1000)
    })

  // eslint-disable-next-line consistent-return
  const startServer = async () => {
    try {
      LightningServices.setDefaults(program)
      if (!LightningServices.isInitialized()) {
        await LightningServices.init()
      }

      await /** @type {Promise<void>} */ (new Promise((resolve, reject) => {
        LightningServices.services.lightning.getInfo({}, (err, res) => {
          if (
            err &&
            !err.details.includes('wallet not created') &&
            !err.details.includes('wallet locked')
          ) {
            reject(err)
          } else {
            resolve()
          }
        })
      }))

      app.use(compression())

      app.use((req, res, next) => {
        if (process.env.ROUTE_LOGGING === 'true') {
          if (sensitiveRoutes[req.method][req.path]) {
            logger.info(
              JSON.stringify({
                time: new Date(),
                ip: req.ip,
                method: req.method,
                path: req.path,
                sessionId: req.sessionId
              })
            )
          } else {
            logger.info(
              JSON.stringify({
                time: new Date(),
                ip: req.ip,
                method: req.method,
                path: req.path,
                body: req.body,
                query: req.query,
                sessionId: req.sessionId
              })
            )
          }
        }
        next()
      })

      app.use((req, res, next) => {
        res.set('Version', program.version ? program.version() : 'N/A')
        next()
      })

      const storageDirectory = Path.resolve(
        rootFolder,
        `${program.rootPath ? '.' : '..'}/.storage`
      )

      await Storage.init({
        dir: storageDirectory
      }) /*
      if (false) {
        await Storage.removeItem('tunnel/token')
        await Storage.removeItem('tunnel/subdomain')
        await Storage.removeItem('tunnel/url')
      }*/

      const storePersistentRandomField = async ({ fieldName, length = 16 }) => {
        const randomField = await Storage.getItem(fieldName)

        if (randomField) {
          return randomField
        }

        const newValue = await ECC.generateRandomString(length)
        await Storage.setItem(fieldName, newValue)
        return newValue
      }

      const [sessionSecret] = await Promise.all([
        storePersistentRandomField({
          fieldName: 'config/sessionSecret'
        }),
        storePersistentRandomField({
          fieldName: 'encryption/hostId',
          length: 8
        })
      ])

      app.use(
        session({
          secret: sessionSecret,
          cookie: { maxAge: defaults.sessionMaxAge },
          resave: true,
          rolling: true,
          saveUninitialized: true
        })
      )
      app.use(bodyParser.urlencoded({ extended: 'true' }))
      app.use(bodyParser.json({ limit: '500kb' }))
      app.use(bodyParser.json({ type: 'application/vnd.api+json' }))
      app.use(methodOverride())
      // WARNING
      // error handler middleware, KEEP 4 parameters as express detects the
      // arity of the function to treat it as a err handling middleware
      // eslint-disable-next-line no-unused-vars
      app.use((err, _, res, __) => {
        // Do logging and user-friendly error message display
        logger.error(err)
        res.status(500).send({ status: 500, errorMessage: 'internal error' })
      })

      const CA = program.httpsCert
      const CA_KEY = program.httpsCertKey

      const createServer = () => {
        try {
          if (program.useTLS) {
            const key = FS.readFileSync(CA_KEY, 'utf-8')
            const cert = FS.readFileSync(CA, 'utf-8')

            const httpsServer = Https.createServer({ key, cert }, app)

            return httpsServer
          }

          const httpServer = new Http.Server(app)
          return httpServer
        } catch (err) {
          logger.error(err.message)
          logger.error(
            'An error has occurred while finding an LND cert to use to open an HTTPS server'
          )
          logger.warn('Falling back to opening an HTTP server...')
          const httpServer = new Http.Server(app)
          return httpServer
        }
      }

      const serverInstance = await createServer()

      const io = require('socket.io')(serverInstance, {
        parser: binaryParser,
        transports: ['websocket', 'polling'],
        cors: {
          origin: (origin, callback) => {
            callback(null, true)
          },
          allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'public-key-for-decryption',
            'encryption-device-id'
          ],
          credentials: true
        }
      })

      const Sockets = require('./sockets')(io)

      require('./routes')(
        app,
        {
          ...defaults,
          lndAddress: program.lndAddress,
          cliArgs: program
        },
        Sockets,
        {
          serverPort,
          useTLS: program.useTLS,
          CA,
          CA_KEY,
          runPrivateKey,
          runPublicKey,
          accessSecret
        }
      )

      // enable CORS headers
      app.use(require('./cors'))
      // app.use(bodyParser.json({limit: '100000mb'}));
      app.use(bodyParser.json({ limit: '50mb' }))
      app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))
      if (process.env.SHOCK_ENCRYPTION_ECC !== 'false') {
        app.use(modifyResponseBody)
      }

      if (program.tunnel) {
        const [relayToken, relayId, relayUrl] = await Promise.all([
          Storage.getItem('relay/token'),
          Storage.getItem('relay/id'),
          Storage.getItem('relay/url')
        ])
        const opts = {
          relayId,
          relayToken,
          address: tunnelHost,
          port: serverPort
        }
        logger.info(opts)
        relayClient.default(opts, async (connected, params) => {
          if (connected) {
            const noProtocolAddress = params.address.replace(
              /^http(?<secure>s)?:\/\//giu,
              ''
            )
            await Promise.all([
              Storage.setItem('relay/token', params.relayToken),
              Storage.setItem('relay/id', params.relayId),
              Storage.setItem('relay/url', noProtocolAddress)
            ])
            const dataToQr = JSON.stringify({
              URI: `https://${params.relayId}@${noProtocolAddress}`,
              // Null-check is just to please typescript
              accessSecret: accessSecret && accessSecret.toString('base64')
            })
            qrcode.generate(dataToQr, { small: false })
            logger.info(`connect to ${params.relayId}@${noProtocolAddress}:443`)
          } else {
            logger.error('!! Relay did not connect to server !!')
          }
        })
      }

      serverInstance.listen(serverPort, serverHost)
      logger.info('App listening on ' + serverHost + ' port ' + serverPort)
      // @ts-expect-error
      module.server = serverInstance
    } catch (err) {
      logger.error({ exception: err, message: err.message, code: err.code })
      logger.info('Restarting server in 30 seconds...')
      await wait(30)
      startServer()
      return false
    }
  }

  startServer()
}

module.exports = server
