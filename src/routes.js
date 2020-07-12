/* eslint-disable no-param-reassign */
/* eslint-disable prefer-destructuring */
/**
 * @prettier
 */
"use strict";

const Axios = require("axios");
const Crypto = require("crypto");
const logger = require("winston");
const httpsAgent = require("https");
const responseTime = require("response-time");
const uuid = require("uuid/v4");
const Common = require('shock-common')
const isARealUsableNumber = require('lodash/isFinite')

const getListPage = require("../utils/paginate");
const auth = require("../services/auth/auth");
const FS = require("../utils/fs");
const Encryption = require("../utils/encryptionStore");
const LightningServices = require("../utils/lightningServices");
const GunDB = require("../services/gunDB/Mediator");
const { unprotectedRoutes, nonEncryptedRoutes } = require("../utils/protectedRoutes");
const GunActions = require("../services/gunDB/contact-api/actions")
const GunGetters = require('../services/gunDB/contact-api/getters')

const DEFAULT_MAX_NUM_ROUTES_TO_QUERY = 10;
const SESSION_ID = uuid();

// module.exports = (app) => {
module.exports = async (
  app,
  config,
  mySocketsEvents,
  { serverPort, CA, CA_KEY, usetls }
) => {
  const {timeout5} = require('../services/gunDB/contact-api/utils')

  const Http = Axios.create({
    httpsAgent: new httpsAgent.Agent({  
      ca: await FS.readFile(CA)
    })
  })
  
  const sanitizeLNDError = (message = "") => {
    if (message.toLowerCase().includes("unknown")) {
      const splittedMessage = message
        .split("UNKNOWN: ");
      return splittedMessage.length > 1
        ? splittedMessage.slice(1).join("")
        : splittedMessage.join("")
    }

    return message
  }
  
  const getAvailableService = () =>
    new Promise((resolve, reject) => {
      const { lightning } = LightningServices.services;

      lightning.getInfo({}, (err, response) => {
        if (err) {
          if (err.message.includes("unknown service lnrpc.Lightning")) {
            resolve({
              service: "walletUnlocker",
              message: "Wallet locked",
              code: err.code,
              walletStatus: "locked",
              success: true
            });
          } else if (err.code === 14) {
            reject({
              service: "unknown",
              message:
                "Failed to connect to LND server, make sure it's up and running.",
              code: 14,
              walletStatus: "unknown",
              success: false
            });
          } else {
            reject({
              service: "lightning",
              message: sanitizeLNDError(err.message),
              code: err.code,
              walletStatus: "unlocked",
              success: false
            });
          }
        }

        resolve({
          service: "lightning",
          message: response,
          code: null,
          walletStatus: "unlocked",
          success: true
        });
      });
    });
  
  const checkHealth = async () => {
    logger.info("Getting service status...")
    const serviceStatus = await getAvailableService();
    logger.info("Received status:", serviceStatus);
    const LNDStatus = serviceStatus;
    try {
      logger.info("Getting API status...");
      const APIHealth = await Http.get(`${usetls ? 'https' : 'http'}://localhost:${serverPort}/ping`);
      const APIStatus = {
        message: APIHealth.data,
        responseTime: APIHealth.headers["x-response-time"],
        success: true
      };
      logger.info("Received API status!", APIStatus);
      return {
        LNDStatus,
        APIStatus
      };
    } catch (err) {
      logger.error(err);
      const APIStatus = {
        message: err.response.data,
        responseTime: err.response.headers["x-response-time"],
        success: false
      };
      logger.warn("Failed to retrieve API status", APIStatus);
      return {
        LNDStatus,
        APIStatus
      };
    }
  };
  
  const handleError = async (res, err) => {
    const health = await checkHealth();
    if (health.LNDStatus.success) {
      if (err) {
        res.json({
          errorMessage: sanitizeLNDError(err.message)
        });
      } else {
        res.sendStatus(403);
      }
    } else {
      res.status(500);
      res.json({ errorMessage: "LND is down" });
    }
  };

  const recreateLnServices = async () => {
    await LightningServices.init();

    return true;
  };

  const lastSeenMiddleware = (req, res, next) => {
    const { authorization } = req.headers
    const { path, method } = req
    if (!unprotectedRoutes[method][path] && authorization && GunDB.isAuthenticated()) {
      GunActions.setLastSeenApp()
    }

    next()
  }

  const unlockWallet = password =>
    new Promise((resolve, reject) => {
      try {
        const args = {
          wallet_password: Buffer.from(password, "utf-8")
        };
        const { walletUnlocker } = LightningServices.services;
        walletUnlocker.unlockWallet(args, (unlockErr, unlockResponse) => {
          if (unlockErr) {
            reject(unlockErr);
            return;
          }

          resolve(unlockResponse);
        });
      } catch (err) {
        logger.error(err);
        if (err.message === "unknown service lnrpc.WalletUnlocker") {
          resolve({
            message: "Wallet already unlocked"
          });
          return;
        }

        reject({
          field: "wallet",
          code: err.code,
          message: sanitizeLNDError(err.message)
        });
      }
    });
  
  // Hack to check whether or not a wallet exists
  const walletExists = async () => {
    try {
      const availableService = await getAvailableService();
      if (availableService.service === "lightning") {
        return true;
      }
  
      if (availableService.service === "walletUnlocker") {
        const randomPassword = Crypto.randomBytes(4).toString('hex');
        try {
          await unlockWallet(randomPassword);
          return true;
        } catch (err) {
          if (err.message.indexOf("invalid passphrase") > -1) {
            return true;
          }
          return false;
        }
      }
    } catch(err) {
      logger.error("LND error:", err);
      return false;
    }
  };

  app.use((req, res, next) => {
    res.setHeader("x-session-id", SESSION_ID)
    next()
  })

  app.use((req, res, next) => {
    const deviceId = req.headers["x-shockwallet-device-id"];
    logger.debug("Decrypting route...")
    try {
      if (nonEncryptedRoutes.includes(req.path) || process.env.DISABLE_SHOCK_ENCRYPTION === "true") {
        return next();
      }
  
      if (!deviceId) {
        const error = {
          field: "deviceId",
          message: "Please specify a device ID"
        };
        logger.error("Please specify a device ID")
        return res.status(401).json(error);
      }

      if (!Encryption.isAuthorizedDevice({ deviceId })) {
        const error = {
          field: "deviceId",
          message: "Please specify a device ID"
        };
        logger.error("Unknown Device")
        return res.status(401).json(error);
      }

      if (req.method === "GET" || req.method === "DELETE" || !req.body.encryptionKey && !req.body.iv) {
        return next();
      }

      const decryptedKey = Encryption.decryptKey({ deviceId, message: req.body.encryptionKey });
      const decryptedMessage = Encryption.decryptMessage({ message: req.body.data, key: decryptedKey, iv: req.body.iv })
      req.body = JSON.parse(decryptedMessage);
      return next();
    } catch (err) {
      logger.error(err);
      return res
        .status(401)
        .json(
          err
        );
    }
  })

  app.use(async (req, res, next) => {
    try {
      logger.info("Route:", req.path)

      if (unprotectedRoutes[req.method][req.path]) {
        next();
        return;
      }

      if (req.path.includes("/api/lnd")) {
        const walletStatus = await walletExists();
        const availableService = await getAvailableService();
        const statusMessage = availableService.walletStatus;
        if (walletStatus) {
          if (statusMessage === "unlocked") {
            return next();
          }

          return res
            .status(401)
            .json({ 
              field: "wallet", 
              errorMessage: statusMessage 
                ? statusMessage 
                : "unknown" 
            })
        }

        return res
          .status(401)
          .json({ 
            field: "wallet", 
            errorMessage: "Please create a wallet before using the API" 
          });
      }
      next()
    } catch (err) {
      logger.error(err);
      res
        .status(500)
        .json({ 
          field: "wallet", 
          errorMessage: err.message 
            ? err.message 
            : err 
        });
    }
  });

  app.use(lastSeenMiddleware);

  app.use(["/ping"], responseTime());

  /**
   * health check
   */
  app.get("/health", async (req, res) => {
    const health = await checkHealth();
    res.json(health);
  });

  /**
   * kubernetes health check
   */
  app.get("/healthz", async (req, res) => {
    const health = await checkHealth();
    logger.info("Healthz response:", health);
    res.json(health);
  });

  app.get("/ping", (req, res) => {
    logger.info("Ping completed!");
    res.json({ message: "OK" });
  });

  app.post("/api/mobile/error", (req, res) => {
    logger.debug("Mobile error:", JSON.stringify(req.body));
    res.json({ msg: "OK" });
  });

  app.post("/api/security/exchangeKeys", async (req, res) => {
    try {
      const { publicKey, deviceId } = req.body;
  
      if (!publicKey) {
        return res.status(400).json({
          field: 'publicKey',
          message: "Please provide a valid public key"
        })
      }

      if (!deviceId ||
        !/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/iu
          .test(deviceId)) {
        return res.status(400).json({
          field: 'deviceId',
          message: "Please provide a valid device ID"
        })
      }
  
      const authorizedDevice = await Encryption.authorizeDevice({ deviceId, publicKey })
      logger.info(authorizedDevice)
      return res.status(200).json(authorizedDevice)
    } catch (err) {
      logger.error(err)
      return res.status(401).json({
        field: 'unknown',
        message: err
      })
    }
  })

  app.get("/api/lnd/wallet/status", async (req, res) => {
    try {
      const walletStatus = await walletExists();
      const availableService = await getAvailableService();
  
      res.json({
        walletExists: walletStatus,
        walletStatus: walletStatus ? availableService.walletStatus : null
      })
    } catch (err) {
      logger.error(err);
      const sanitizedMessage = sanitizeLNDError(err.message);
      res.status(500).json({
        field: "LND",
        errorMessage: sanitizedMessage ? sanitizedMessage : "An unknown error has occurred, please try restarting your LND and API servers"
      });
    }
  });

  app.post("/api/lnd/auth", async (req, res) => {
    try {
      logger.info("/api/lnd/auth Body:", req.body)
      const health = await checkHealth();
      const walletInitialized = await walletExists();
      // If we're connected to lnd, unlock the wallet using the password supplied
      // and generate an auth token if that operation was successful.
      if (health.LNDStatus.success && walletInitialized) {
        const { alias, password } = req.body;

        await recreateLnServices();

        if (GunDB.isAuthenticated()) {
          GunDB.logoff();
        }

        const publicKey = await GunDB.authenticate(alias, password);
        if (walletInitialized && health.LNDStatus.walletStatus === "locked" && publicKey) {
          await unlockWallet(password);
        }

        // Send an event to update lightning's status
        mySocketsEvents.emit("updateLightning");

        //get the latest channel backups before subscribing
        const user = require('../services/gunDB/Mediator').getUser()
        const SEA = require('../services/gunDB/Mediator').mySEA
        const { lightning } = LightningServices.services;
        lightning.exportAllChannelBackups({}, (err, channelBackups) => {
          if (err) {
            return handleError(res, err);
          }
          GunActions.saveChannelsBackup(JSON.stringify(channelBackups),user,SEA)
          
        });
        
        /*
        const feedObj = {
          feed: [
              {
                  id:'bd7acbea-c1b1-46c2-aed5-3ad53abb28ba',
                  paragraphs:[
                      "SOme text and stuff 12"
                      "SOme text and stuff"
                  ],
                  profilePic:"",
                  username:"bobni",
                  media:[
                      {
                          type:'VIDEO',
                          ratio_x: 1024,
                          ratio_y: 436,
                          magnetUri:'magnet:?xt=urn:btih:08ada5a7a6183aae1e09d831df6748d566095a10&dn=Sintel&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fsintel.torrent',
                      },
                  ]
              },
              {
                  id:'3ac68afc-c605-48d3-a4f8-fbd91aa97f63',
                  paragraphs:[
                      "SOme text and stuff"
                  ],
                  profilePic:"",
                  username:"bobni",
                  media:[
                      {
                          type:'VIDEO',
                          ratio_x: 1920,
                          ratio_y: 804,
                          magnetUri:'magnet:?xt=urn:btih:c9e15763f722f23e98a29decdfae341b98d53056&dn=Cosmos+Laundromat&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fcosmos-laundromat.torrent',
                      },
                  ]
              },
              {
                  id:'58694a0f-3da1-471f-bd96-145571e29d72',
                  paragraphs:[
                      "SOme text and stuff"
                  ],
                  profilePic:"",
                  username:"bobni",
                  media:[
                      {
                          type:'VIDEO',
                          ratio_x: 1920,
                          ratio_y: 1080,
                          magnetUri:'magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny&tr=udp%3A%2F%2Fexplodie.org%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.empire-js.us%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.fastcast.nz&tr=wss%3A%2F%2Ftracker.openwebtorrent.com&ws=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2F&xs=https%3A%2F%2Fwebtorrent.io%2Ftorrents%2Fbig-buck-bunny.torrent',
                      },
                  ]
              }
          ]
        }
        user.get("FEED_POC").put(JSON.stringify(feedObj), ack => {
          if (ack.err) {
            //rej(new Error(ack.err))
        }*/
        const feedObj = {
          feed :{}
        }
        user.get("FEED_POC").put(feedObj, ack => {
          if (ack.err) {
            //rej(ack.err)
            logger.log(ack.err)
          } else {
            logger.log(ack.err)
          }
        })

        //register to listen for channel backups
        const onNewChannelBackup  = () => {
          logger.warn("Subscribing to channel backup ...")
          const stream = lightning.SubscribeChannelBackups({})
          stream.on("data", data => {
            logger.info(" New channel backup data")
            GunActions.saveChannelsBackup(JSON.stringify(data),user,SEA)
          })
          stream.on("end", ()=>{
            logger.info("Channel backup stream ended, starting a new one...")
            // Prevents call stack overflow exceptions
            process.nextTick(onNewChannelBackup)
          })
          stream.on("error", err => {
            logger.error("Channel backup stream error:", err);
          })
          stream.on("status", status => {
            logger.error("Channel backup stream status:", status);
            if (status.code === 14) {
              // Prevents call stack overflow exceptions
              process.nextTick(onNewChannelBackup)
              
            }
          })
        }
        onNewChannelBackup();

        // Generate auth token and send it as a JSON response
        const token = await auth.generateToken();
        res.json({
          authorization: token,
          user: {
            alias,
            publicKey
          }
        });

        return true;
      }

      if (!walletInitialized) {
        res.status(500).json({
          field: "wallet",
          errorMessage: "Please create a wallet before authenticating",
          success: false
        });
        return false;
      }

      res.status(500);
      res.json({
        field: "health",
        errorMessage: sanitizeLNDError(health.LNDStatus.message),
        success: false
      });
      return false;
    } catch (err) {
      logger.error("Unlock Error:", err);
      res.status(400);
      res.json({ field: "user", errorMessage: err.message ? sanitizeLNDError(err.message) : err, success: false });
      return err;
    }
  });

  app.post("/api/lnd/wallet", async (req, res) => {
    try {
      const {  walletUnlocker } = LightningServices.services;
      const { password, alias } = req.body;
      const healthResponse = await checkHealth();
      if (!alias) {
        return res.status(400).json({
          field: "alias",
          errorMessage: "Please specify an alias for your new wallet"
        });
      }
  
      if (!password) {
        return res.status(400).json({
          field: "password",
          errorMessage: "Please specify a password for your new wallet"
        });
      }
  
      if (password.length < 8) {
        return res.status(400).json({
          field: "password",
          errorMessage: "Please specify a password that's longer than 8 characters"
        });
      }
  
      if (healthResponse.LNDStatus.service !== "walletUnlocker") {
        return res.status(400).json({
          field: "wallet",
          errorMessage: "Wallet is already unlocked"
        });
      }
  
      walletUnlocker.genSeed({}, async (genSeedErr, genSeedResponse) => {
        try {
          if (genSeedErr) {
            logger.debug("GenSeed Error:", genSeedErr);
    
            const healthResponse = await checkHealth();
            if (healthResponse.LNDStatus.success) {
              const message = genSeedErr.details;
              return res
                .status(400)
                .json({ field: "GenSeed", errorMessage: message, success: false });
            }
    
            return res
              .status(500)
              .json({ field: "health", errorMessage: "LND is down", success: false });
          }
    
          logger.debug("GenSeed:", genSeedResponse);
          const mnemonicPhrase = genSeedResponse.cipher_seed_mnemonic;
          const walletArgs = {
            wallet_password: Buffer.from(password, "utf8"),
            cipher_seed_mnemonic: mnemonicPhrase
          };
    
          // Register user before creating wallet
          const publicKey = await GunDB.register(alias, password);

          await GunActions.saveSeedBackup(
            mnemonicPhrase,
            GunDB.getUser(),
            GunDB.mySEA
          )

          walletUnlocker.initWallet(
            walletArgs,
            async (initWalletErr, initWalletResponse) => {
              try {
                if (initWalletErr) {
                  logger.error("initWallet Error:", initWalletErr.message);
                  const healthResponse = await checkHealth();
                  if (healthResponse.LNDStatus.success) {
                    const errorMessage = initWalletErr.details;
      
                    return res.status(400).json({
                      field: "initWallet",
                      errorMessage,
                      success: false
                    });
                  }
                  return res.status(500).json({
                    field: "health",
                    errorMessage: "LND is down",
                    success: false
                  });
                }
                logger.info("initWallet:", initWalletResponse);
      
                const waitUntilFileExists = seconds => {
                  logger.info(
                    `Waiting for admin.macaroon to be created. Seconds passed: ${seconds} Path: ${LightningServices.servicesConfig.macaroonPath}`
                  );
                  setTimeout(async () => {
                    try {
                      const macaroonExists = await FS.access(
                        LightningServices.servicesConfig.macaroonPath
                      );

                      if (!macaroonExists) {
                        return waitUntilFileExists(seconds + 1);
                      }
      
                      logger.info("admin.macaroon file created");
      
                      await LightningServices.init();

                      const token = await auth.generateToken();
                      return res.json({
                        mnemonicPhrase,
                        authorization: token,
                        user: {
                          alias,
                          publicKey
                        }
                      });
                    } catch (err) {
                      logger.error(err);
                      res.status(400).json({
                        field: "unknown",
                        errorMessage: sanitizeLNDError(err.message)
                      });
                    }
                  }, 1000);
                };
      
                waitUntilFileExists(1);
              } catch (err) {
                logger.error(err);
                return res.status(500).json({
                  field: "unknown",
                  errorMessage: err
                })
              }
            }
          );
        } catch (err) {
          logger.error(err);
          return res.status(500).json({
            field: "unknown",
            errorMessage: err
          })
        }
      });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({
        field: "unknown",
        errorMessage: err
      })
    }
  });

  app.post("/api/lnd/wallet/existing", async (req, res) => {
    try {
      const { password, alias } = req.body;
      const healthResponse = await checkHealth();
      const exists = await walletExists();
      if (!exists) {
        return res.status(500).json({
          field: "wallet",
          errorMessage: "LND wallet does not exist, please create a new one"
        });
      }

      if (!alias) {
        return res.status(400).json({
          field: "alias",
          errorMessage: "Please specify an alias for your wallet"
        });
      }

      if (!password) {
        return res.status(400).json({
          field: "password",
          errorMessage: "Please specify a password for your wallet alias"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          field: "password",
          errorMessage: "Please specify a password that's longer than 8 characters"
        });
      }

      if (healthResponse.LNDStatus.service !== "walletUnlocker") {
        return res.status(400).json({
          field: "wallet",
          errorMessage: "Wallet is already unlocked. Please restart your LND instance and try again."
        });
      }

      try {
        await unlockWallet(password);
      } catch(err) {
        return res.status(401).json({
          field: "wallet",
          errorMessage: "Invalid LND wallet password"
        });
      }

      // Register user after verifying wallet password
      const publicKey = await GunDB.register(alias, password);

      // Generate Access Token
      const token = await auth.generateToken();

      res.json({
        authorization: token,
        user: {
          alias,
          publicKey
        }
      })
    } catch (err) {
      return res.status(500).json({
        errorMessage: err.message,
      })
    }
  });

  // get lnd info
  app.get("/api/lnd/getinfo", (req, res) => {
    const { lightning } = LightningServices.services;
    
    lightning.getInfo({}, async (err, response) => {
      if (err) {
        logger.error("GetInfo Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "getInfo",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.info("GetInfo:", response);
      if (!response.uris || response.uris.length === 0) {
        if (config.lndAddress) {
          response.uris = [response.identity_pubkey + "@" + config.lndAddress];
        }
      }
      res.json(response);
    });
  });

  // get lnd node info
  app.post("/api/lnd/getnodeinfo", (req, res) => {
    const { lightning } = LightningServices.services;

    lightning.getNodeInfo(
      { pub_key: req.body.pubkey },
      async (err, response) => {
        if (err) {
          logger.debug("GetNodeInfo Error:", err);
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400);
            res.json({
              field: "getNodeInfo",
              errorMessage: sanitizeLNDError(err.message)
            });
          } else {
            res.status(500);
            res.json({ errorMessage: "LND is down" });
          }
        }
        logger.debug("GetNodeInfo:", response);
        res.json(response);
      }
    );
  });
  // get lnd chan info
  app.post("/api/lnd/getchaninfo", (req, res) => {
    const { lightning } = LightningServices.services;

    lightning.getChanInfo(
      { chan_id: req.body.chan_id },
      async (err, response) => {
        if (err) {
          logger.debug("GetChanInfo Error:", err);
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400);
            res.json({
              field: "getChanInfo",
              errorMessage: sanitizeLNDError(err.message)
            });
          } else {
            res.status(500);
            res.json({ errorMessage: "LND is down" });
          }
        }
        logger.debug("GetChanInfo:", response);
        res.json(response);
      }
    );
  });

  app.get("/api/lnd/getnetworkinfo", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.getNetworkInfo({}, async (err, response) => {
      if (err) {
        logger.debug("GetNetworkInfo Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "getNodeInfo",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("GetNetworkInfo:", response);
      res.json(response);
    });
  });

  // get lnd node active channels list
  app.get("/api/lnd/listpeers", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.listPeers({}, async (err, response) => {
      if (err) {
        logger.debug("ListPeers Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "listPeers",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("ListPeers:", response);
      res.json(response);
    });
  });

  // newaddress
  app.post("/api/lnd/newaddress", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.newAddress({ type: req.body.type }, async (err, response) => {
      if (err) {
        logger.debug("NewAddress Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "newAddress",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("NewAddress:", response);
      res.json(response);
    });
  });

  // connect peer to lnd node
  app.post("/api/lnd/connectpeer", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.status(403);
        return res.json({
          field: "limituser",
          errorMessage: "User limited"
        });
      }
      res.status(500);
      res.json({ errorMessage: "LND is down" });
    }
    const connectRequest = {
      addr: { pubkey: req.body.pubkey, host: req.body.host },
      perm: true
    };
    logger.debug("ConnectPeer Request:", connectRequest);
    lightning.connectPeer(connectRequest, (err, response) => {
      if (err) {
        logger.debug("ConnectPeer Error:", err);
        res.status(500).json({ field: "connectPeer", errorMessage: sanitizeLNDError(err.message) });
      } else {
        logger.debug("ConnectPeer:", response);
        res.json(response);
      }
    });
  });

  // disconnect peer from lnd node
  app.post("/api/lnd/disconnectpeer", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.status(403);
        return res.json({
          field: "limituser",
          errorMessage: "User limited"
        });
      }
      res.status(500);
      res.json({ errorMessage: "LND is down" });
    }
    const disconnectRequest = { pub_key: req.body.pubkey };
    logger.debug("DisconnectPeer Request:", disconnectRequest);
    lightning.disconnectPeer(disconnectRequest, (err, response) => {
      if (err) {
        logger.debug("DisconnectPeer Error:", err);
        res.status(400).json({ field: "disconnectPeer", errorMessage: sanitizeLNDError(err.message) });
      } else {
        logger.debug("DisconnectPeer:", response);
        res.json(response);
      }
    });
  });

  // get lnd node opened channels list
  app.get("/api/lnd/listchannels", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.listChannels({}, async (err, response) => {
      if (err) {
        logger.debug("ListChannels Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "listChannels",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("ListChannels:", response);
      res.json(response);
    });
  });

  // get lnd node pending channels list
  app.get("/api/lnd/pendingchannels", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.pendingChannels({}, async (err, response) => {
      if (err) {
        logger.debug("PendingChannels Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "pendingChannels",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("PendingChannels:", response);
      res.json(response);
    });
  });

  app.get("/api/lnd/unifiedTrx", (req, res) => {
    const { lightning } = LightningServices.services;
    const { itemsPerPage, page, reversed = true } = req.query;
    const offset = (page - 1) * itemsPerPage;
    lightning.listPayments({}, (err, { payments = [] } = {}) => {
      if (err) {
        return handleError(res, err);
      }

      lightning.listInvoices(
        { reversed, index_offset: offset, num_max_invoices: itemsPerPage },
        (err, { invoices, last_index_offset }) => {
          if (err) {
            return handleError(res, err);
          }

          lightning.getTransactions({}, (err, { transactions = [] } = {}) => {
            if (err) {
              return handleError(res, err);
            }

            res.json({
              transactions: getListPage({
                entries: transactions,
                itemsPerPage,
                page
              }),
              payments: getListPage({
                entries: payments,
                itemsPerPage,
                page
              }),
              invoices: {
                content: invoices,
                page,
                totalPages: Math.ceil(last_index_offset / itemsPerPage),
                totalItems: last_index_offset
              }
            });
          });
        }
      );
    });
  });

  // get lnd node payments list
  app.get("/api/lnd/listpayments", (req, res) => {
    const { lightning } = LightningServices.services;
    const { itemsPerPage, page, paginate = true } = req.query;
    lightning.listPayments({
      include_incomplete: !!req.include_incomplete,
    }, (err, { payments = [] } = {}) => {
      if (err) {
        logger.debug("ListPayments Error:", err);
        handleError(res, err);
      } else {
        logger.debug("ListPayments:", payments);
        if (paginate) {
          res.json(getListPage({ entries: payments, itemsPerPage, page }));
        } else {
          res.json({ payments });
        }
      }
    });
  });

  // get lnd node invoices list
  app.get("/api/lnd/listinvoices", (req, res) => {
    const { lightning } = LightningServices.services;
    const { page, itemsPerPage, reversed = true } = req.query;
    const offset = (page - 1) * itemsPerPage;
    // const limit = page * itemsPerPage;
    lightning.listInvoices(
      { reversed, index_offset: offset, num_max_invoices: itemsPerPage },
      async (err, { invoices, last_index_offset } = {}) => {
        if (err) {
          logger.debug("ListInvoices Error:", err);
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400).json({ errorMessage: sanitizeLNDError(err.message), success: false });
          } else {
            res.status(500);
            res.json({ errorMessage: health.LNDStatus.message, success: false });
          }
        } else {
          // logger.debug("ListInvoices:", response);
          res.json({
            content: invoices,
            page,
            totalPages: Math.ceil(last_index_offset / itemsPerPage),
            success: true
          });
        }
      }
    );
  });

  // get lnd node forwarding history
  app.get("/api/lnd/forwardinghistory", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.forwardingHistory({}, async (err, response) => {
      if (err) {
        logger.debug("ForwardingHistory Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "forwardingHistory",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("ForwardingHistory:", response);
      res.json(response);
    });
  });

  // get the lnd node wallet balance
  app.get("/api/lnd/walletbalance", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.walletBalance({}, async (err, response) => {
      if (err) {
        logger.debug("WalletBalance Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "walletBalance",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("WalletBalance:", response);
      res.json(response);
    });
  });

  // get the lnd node wallet balance and channel balance
  app.get("/api/lnd/balance", async (req, res) => {
    const { lightning } = LightningServices.services;
    const health = await checkHealth();
    lightning.walletBalance({}, (err, walletBalance) => {
      if (err) {
        logger.debug("WalletBalance Error:", err);
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "walletBalance",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json(health.LNDStatus);
        }
        return err;
      }

      lightning.channelBalance({}, (err, channelBalance) => {
        if (err) {
          logger.debug("ChannelBalance Error:", err);
          if (health.LNDStatus.success) {
            res.status(400).json({
              field: "channelBalance",
              errorMessage: sanitizeLNDError(err.message)
            });
          } else {
            res.status(500);
            res.json(health.LNDStatus);
          }
          return err;
        }

        logger.debug("ChannelBalance:", channelBalance);
        res.json({
          ...walletBalance,
          channel_balance: channelBalance.balance,
          pending_channel_balance: channelBalance.pending_open_balance
        });
      });
    });
  });

  app.post("/api/lnd/decodePayReq", (req, res) => {
    const { lightning } = LightningServices.services;
    const { payReq } = req.body;
    lightning.decodePayReq({ pay_req: payReq }, async (err, paymentRequest) => {
      if (err) {
        logger.debug("DecodePayReq Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(500).json({ 
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500).json({ errorMessage: "LND is down" });
        }
      } else {
        logger.info("DecodePayReq:", paymentRequest);
        res.json({
          decodedRequest: paymentRequest,
        });
      }
    });
  });

  app.get("/api/lnd/channelbalance", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.channelBalance({}, async (err, response) => {
      if (err) {
        logger.debug("ChannelBalance Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "channelBalance",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("ChannelBalance:", response);
      res.json(response);
    });
  });

  // openchannel
  app.post("/api/lnd/openchannel", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.sendStatus(403);
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
      return;
    }

    const { pubkey, channelCapacity, channelPushAmount,satPerByte } = req.body;

    const openChannelRequest = {
      node_pubkey: Buffer.from(pubkey, 'hex'),
      local_funding_amount: channelCapacity,
      push_sat: channelPushAmount,
      sat_per_byte:satPerByte,
    };
    logger.info("OpenChannelRequest", openChannelRequest);
    const openedChannel = lightning.openChannel(openChannelRequest);
    openedChannel.on("data", response => {
      logger.debug("OpenChannelRequest:", response);
      if (!res.headersSent) {
        res.json(response);
      }
    });
    openedChannel.on("error", async err => {
      logger.info("OpenChannelRequest Error:", err);
      const health = await checkHealth();
      if (health.LNDStatus.success && !res.headersSent) {
        res.status(500).json({ field: "openChannelRequest", errorMessage: sanitizeLNDError(err.message) });
      } else if (!res.headersSent) {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
    });
    openedChannel.write(openChannelRequest)
  });

  // closechannel
  app.post("/api/lnd/closechannel", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        // return res.sendStatus(403);
        res.sendStatus(403);
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
    }
    const { channelPoint, outputIndex, force,satPerByte } = req.body;
    const closeChannelRequest = {
      channel_point: {
        funding_txid_bytes: Buffer.from(channelPoint, "hex"),
        funding_txid_str: channelPoint,
        output_index: outputIndex,
        sat_per_byte:satPerByte,
      },
      force
    };
    logger.info("CloseChannelRequest", closeChannelRequest);
    const closedChannel = lightning.closeChannel(closeChannelRequest);

    closedChannel.on('data', (response) => {
      if (!res.headersSent) {
        logger.info("CloseChannelRequest:", response);
        res.json(response);
      }
    })

    closedChannel.on('error', async (err) => {
      logger.error("CloseChannelRequest Error:", err);
      const health = await checkHealth();
      if (!res.headersSent) {
        if (health.LNDStatus.success) {
          logger.debug("CloseChannelRequest Error:", err);
          res.status(400).json({
            field: "closeChannel",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
    });
  });

  // sendpayment
  app.post("/api/lnd/sendpayment", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.sendStatus(403);
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
    }
    const paymentRequest = { payment_request: req.body.payreq };

    if (req.body.amt) {
      paymentRequest.amt = req.body.amt;
    }

    logger.info("Sending payment", paymentRequest);
    const sentPayment = lightning.sendPayment(paymentRequest);

    sentPayment.on("data", response => {
      if (response.payment_error) {
        logger.error("SendPayment Info:", response)
        return res.status(500).json({
          errorMessage: response.payment_error
        });
      }
      
      logger.info("SendPayment Data:", response);
      return res.json(response);
    });

    sentPayment.on("status", status => {
      logger.info("SendPayment Status:", status);
    });

    sentPayment.on("error", async err => {
      logger.error("SendPayment Error:", err);
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.status(500).json({
          errorMessage: sanitizeLNDError(err.message)
        });
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
    });

    sentPayment.write(paymentRequest);
  });

  // addinvoice
  app.post("/api/lnd/addinvoice", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.sendStatus(403);
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
      return false;
    }
    const invoiceRequest = { memo: req.body.memo, private: true };
    if (req.body.value) {
      invoiceRequest.value = req.body.value;
    }
    if (req.body.expiry) {
      invoiceRequest.expiry = req.body.expiry;
    }
    lightning.addInvoice(invoiceRequest, async (err, response) => {
      if (err) {
        logger.debug("AddInvoice Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "addInvoice",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
        return err;
      }
      logger.debug("AddInvoice:", response);
      res.json(response);
    });
  });

  // signmessage
  app.post("/api/lnd/signmessage", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.sendStatus(403);
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
    }
    lightning.signMessage(
      { msg: Buffer.from(req.body.msg, "utf8") },
      async (err, response) => {
        if (err) {
          logger.debug("SignMessage Error:", err);
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400).json({ field: "signMessage", errorMessage: sanitizeLNDError(err.message) });
          } else {
            res.status(500);
            res.json({ errorMessage: "LND is down" });
          }
        }
        logger.debug("SignMessage:", response);
        res.json(response);
      }
    );
  });

  // verifymessage
  app.post("/api/lnd/verifymessage", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.verifyMessage(
      { msg: Buffer.from(req.body.msg, "utf8"), signature: req.body.signature },
      async (err, response) => {
        if (err) {
          logger.debug("VerifyMessage Error:", err);
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400).json({ field: "verifyMessage", errorMessage: sanitizeLNDError(err.message) });
          } else {
            res.status(500);
            res.json({ errorMessage: "LND is down" });
          }
        }
        logger.debug("VerifyMessage:", response);
        res.json(response);
      }
    );
  });

  // sendcoins
  app.post("/api/lnd/sendcoins", async (req, res) => {
    const { lightning } = LightningServices.services;
    if (req.limituser) {
      const health = await checkHealth();
      if (health.LNDStatus.success) {
        res.sendStatus(403);
      } else {
        res.status(500);
        res.json({ errorMessage: "LND is down" });
      }
    }
    const sendCoinsRequest = { 
      addr: req.body.addr, 
      amount: req.body.amount,
      sat_per_byte:req.body.satPerByte 
    };
    logger.debug("SendCoins", sendCoinsRequest);
    lightning.sendCoins(sendCoinsRequest, async (err, response) => {
      if (err) {
        logger.debug("SendCoins Error:", err);
        const health = await checkHealth();
        if (health.LNDStatus.success) {
          res.status(400).json({
            field: "sendCoins",
            errorMessage: sanitizeLNDError(err.message)
          });
        } else {
          res.status(500);
          res.json({ errorMessage: "LND is down" });
        }
      }
      logger.debug("SendCoins:", response);
      res.json(response);
    });
  });

  // queryroute
  app.post("/api/lnd/queryroute", (req, res) => {
    const { lightning } = LightningServices.services;
    const numRoutes =
      config.maxNumRoutesToQuery || DEFAULT_MAX_NUM_ROUTES_TO_QUERY;
    lightning.queryRoutes(
      { pub_key: req.body.pubkey, amt: req.body.amt, num_routes: numRoutes },
      async (err, response) => {
        if (err) {
          logger.debug("QueryRoute Error:", err);
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400).json({ field: "queryRoute", errorMessage: sanitizeLNDError(err.message) });
          } else {
            res.status(500);
            res.json({ errorMessage: "LND is down" });
          }
        }
        logger.debug("QueryRoute:", response);
        res.json(response);
      }
    );
  });

  app.post("/api/lnd/estimatefee", (req, res) => {
    const { lightning } = LightningServices.services;
    const { amount, confirmationBlocks } = req.body;
    lightning.estimateFee(
      {
        AddrToAmount: {
          tb1qnpq3vj8p6jymah6nnh6wz3p333tt360mq32dtt: amount
        },
        target_conf: confirmationBlocks
      },
      async (err, fee) => {
        if (err) {
          const health = await checkHealth();
          if (health.LNDStatus.success) {
            res.status(400).json({
              error: err.message
            });
          } else {
            res.status(500);
            res.json({ errorMessage: "LND is down" });
          }
        } else {
          logger.debug("EstimateFee:", fee);
          res.json(fee);
        }
      }
    );
  });

  app.post("/api/lnd/listunspent", (req, res) => {
    const { lightning } = LightningServices.services;
    const { minConfirmations = 3, maxConfirmations = 6 } = req.body;
    lightning.listUnspent(
      {
        min_confs: minConfirmations,
        max_confs: maxConfirmations
      },
      (err, unspent) => {
        if (err) {
          return handleError(res, err);
        }
        logger.debug("ListUnspent:", unspent);
        res.json(unspent);
      }
    );
  });

  app.get("/api/lnd/transactions", (req, res) => {
    const { lightning } = LightningServices.services;
    const { page, paginate = true, itemsPerPage } = req.query;
    lightning.getTransactions({}, (err, { transactions = [] } = {}) => {
      if (err) {
        return handleError(res, err);
      }
      logger.debug("Transactions:", transactions);
      if (paginate) {
        res.json(getListPage({ entries: transactions, itemsPerPage, page }));
      } else {
        res.json({ transactions });
      }
    });
  });

  app.post("/api/lnd/sendmany", (req, res) => {
    const { lightning } = LightningServices.services;
    const { addresses,satPerByte } = req.body;
    lightning.sendMany({ AddrToAmount: addresses,sat_per_byte:satPerByte }, (err, transactions) => {
      if (err) {
        return handleError(res, err);
      }
      logger.debug("Transactions:", transactions);
      res.json(transactions);
    });
  });

  app.get("/api/lnd/closedchannels", (req, res) => {
    const { lightning } = LightningServices.services;
    const { closeTypeFilters = [] } = req.query;
    const lndFilters = closeTypeFilters.reduce(
      (filters, filter) => ({ ...filters, [filter]: true }),
      {}
    );
    lightning.closedChannels(lndFilters, (err, channels) => {
      if (err) {
        return handleError(res, err);
      }
      logger.debug("Channels:", channels);
      res.json(channels);
    });
  });

  app.post("/api/lnd/exportchanbackup", (req, res) => {
    const { lightning } = LightningServices.services;
    const { channelPoint } = req.body;
    lightning.exportChannelBackup(
      { chan_point: { funding_txid_str: channelPoint } },
      (err, backup) => {
        if (err) {
          return handleError(res, err);
        }
        logger.debug("ExportChannelBackup:", backup);
        res.json(backup);
      }
    );
  });

  app.post("/api/lnd/exportallchanbackups", (req, res) => {
    const { lightning } = LightningServices.services;
    lightning.exportAllChannelBackups({}, (err, channelBackups) => {
      if (err) {
        return handleError(res, err);
      }
      logger.debug("ExportAllChannelBackups:", channelBackups);
      res.json(channelBackups);
    });
  });
  
  const GunEvent = Common.Constants.Event
  const Key = require('../services/gunDB/contact-api/key')

  app.get("/api/gun/lndchanbackups", async (req,res) => {
    try{
      const user = require('../services/gunDB/Mediator').getUser()
      
      const SEA = require('../services/gunDB/Mediator').mySEA
      const mySecret = require('../services/gunDB/Mediator').getMySecret()
      const encBackup = await timeout5(user.get(Key.CHANNELS_BACKUP).then())
      const backup = await SEA.decrypt(encBackup,mySecret)
      logger.info(backup)
      res.json({data:backup})
    } catch (err) {
      res.json({ok:"err"})
    }
  })
  app.get("/api/gun/feedpoc", async (req,res) =>{
    try{
      logger.warn("FEED POC")
      const user = require('../services/gunDB/Mediator').getUser()
      const feedObj = await timeout5(user.get("FEED_POC").then())
      logger.warn(feedObj)
      
      res.json({data:feedObj})
    } catch (err) {
      //res.json({ok:"err"})
    }
  })

  const Events = require('../services/gunDB/contact-api/events')
  
  app.get(`/api/gun/${GunEvent.ON_RECEIVED_REQUESTS}`, (_, res) => {
    try {
      // spinup
      Events.onSimplerReceivedRequests(() => {})()
      const data = Events.getCurrentReceivedReqs()
      res.json({
        data,
      })
    } catch (err) {
      logger.info('Error in Received Requests poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })

  app.get(`/api/gun/${GunEvent.ON_SENT_REQUESTS}`, (_, res) => {
    try {
      // spinup
      Events.onSimplerSentRequests(() => {})()
      const data = Events.getCurrentSentReqs()
      logger.info(`Sent requests poll: ${JSON.stringify(data, null, 4)}`)
      res.json({
        data,
      })
    } catch (err) {
      logger.info('Error in sentRequests poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })

  app.get(`/api/gun/${GunEvent.ON_CHATS}`, (_, res) => {
    try {
      // spinup
      Events.onChats(() => {})()
      const data =  Events.getChats()
      logger.info(`Chats polled: ${JSON.stringify(data, null, 4)}`)
      res.json({
        data
      })
    } catch (err) {
      logger.info('Error in Chats poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })

  app.get(`/api/gun/${GunEvent.ON_AVATAR}`, async (_, res) => {
    try {
      const user = require('../services/gunDB/Mediator').getUser()
      const data = await timeout5(user.get(Key.PROFILE).get(Key.AVATAR).then())
      logger.info(`avatar poll:${data}`)
      res.json({
        data
      })
    } catch (err) {
      logger.info('Error in Avatar poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })

  app.get(`/api/gun/${GunEvent.ON_DISPLAY_NAME}`, async (_, res) => {
    try {
      const user = require('../services/gunDB/Mediator').getUser()
      const data = await timeout5(user.get(Key.PROFILE).get(Key.DISPLAY_NAME).then())
      logger.info(`display name poll:${data}`)
      res.json({
        data
      })
    } catch (err) {
      logger.info('Error in Display Name poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })

  app.get(`/api/gun/${GunEvent.ON_HANDSHAKE_ADDRESS}`, async (_, res) => {
    try {
      const user = require('../services/gunDB/Mediator').getUser()
      const data = await timeout5(user.get(Key.CURRENT_HANDSHAKE_ADDRESS).then())
      logger.info(`handshake address poll:${data}`)
      res.json({
        data
      })
    } catch (err) {
      logger.info('Error in Handshake Address poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })

  app.get(`/api/gun/${GunEvent.ON_BIO}`, async (_, res) => {
    try {
      const user = require('../services/gunDB/Mediator').getUser()
      const data = await timeout5(user.get(Key.BIO).then())
      logger.debug(data)
      res.json({
        data
      })
    } catch (err) {
      logger.info('Error in BIO poll:')
      logger.error(err)
      res.status(err.message === 'NON_AUTH' ? 401 : 500).json({
        errorMessage: typeof err === 'string' ? err : err.message
      })
    }
  })
////////////////////////////////////////////////////////////////////////////////

  app.get(`/api/gun/wall/:publicKey?`, async (req, res) => {
    try {
      const { page } = req.query;
      const {publicKey} = req.params

      const pageNum = Number(page)

      if (!isARealUsableNumber(pageNum)) {
        return res.status(400).json({
          field: 'page',
          errorMessage: 'Not a number'
        })
      }

      if (pageNum === 0) {
        return res.status(400).json({
          field: 'page',
          errorMessage: 'Page must be a non-zero integer'
        })
      }

      const totalPages = await GunGetters.getWallTotalPages(publicKey)
      const fetchedPage = await GunGetters.getWallPage(pageNum, publicKey)

      return res.status(200).json({
        ...fetchedPage,
        totalPages,
      })
    } catch (err) {
      return res.status(500).json({
        errorMessage: err.message
      })
    }
  })

  app.post(`/api/gun/wall/`, async (req,res) => {
    try{
      const {tags,title,contentItems} = req.body
      return res.status(200).json(await GunActions.createPost(
        tags,
        title,
        contentItems
      ))
    } catch(e) {
      return res.status(500).json({
        errorMessage: (typeof e === 'string' ? e : e.message)
          || 'Unknown error.'
      })
    }
  })

  app.delete(`/api/gun/wall/:postID`, (_, res) => res.status(200).json({
    ok: 'true'
  }))
  /////////////////////////////////
  /**
   * @template P
   * @typedef {import('express-serve-static-core').RequestHandler<P>} RequestHandler
   */


  const ap = /** @type {Application} */ (app);

  /**
   * @typedef {object} FollowsRouteParams
   * @prop {(string|undefined)=} publicKey
   */

  
  /**
   * @type {RequestHandler<FollowsRouteParams>}
   */
  const apiGunFollowsGet =   async (_, res) => {
    try {
      const currFollows = await GunGetters.Follows.currentFollows()

      return res.status(200).json(currFollows)
    } catch (err) {
      return res.status(500).json({
        errorMessage: err.message || 'Unknown ERR at GET /api/follows'
      })
    }
  }
  
  
  /**
   * @type {RequestHandler<FollowsRouteParams>}
   */
  const apiGunFollowsPut = async (req, res) => {
    try {
      const { publicKey } = req.params;
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
      const { publicKey } = req.params;
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

  ap.get('/api/gun/follows/', apiGunFollowsGet)
  ap.get('/api/gun/follows/:publicKey', apiGunFollowsGet)
  ap.put(`/api/gun/follows/:publicKey`,apiGunFollowsPut)
  ap.delete(`/api/gun/follows/:publicKey`, apiGunFollowsDelete)

  /**
    * @type {RequestHandler<{}>}
    */
   const apiGunFeedGet = async (req, res) => {
    try {
      const { page: pageStr } = req.query;
      const page = Number(pageStr)

      if (!isARealUsableNumber(page)) {
        return res.status(400).json({
          field: 'page',
          errorMessage: 'page must be a number'
        })
      }

      if (page < 1) {
        return res.status(400).json({
          field: page,
          errorMessage: 'page must be a positive number'
        })
      }

      return res.status(200).json({
        posts: await GunGetters.getFeedPage(page)
      })
    } catch (err) {
      return res.status(500).json({
        errorMessage: err.message || 'Unknown error inside /api/gun/follows/'
      })
    }
  }

  ap.get(`/api/gun/feed`, apiGunFeedGet)

  /**
   * Return app so that it can be used by express.
   */
  // return app;
}
