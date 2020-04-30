// app/sockets.js

const logger = require("winston");
const LightningServices = require("../utils/lightningServices");

module.exports = (
  /** @type {import('socket.io').Server} */
  io
) => {
  const Mediator = require("../services/gunDB/Mediator/index.js");
  
  const onNewInvoice = socket => {
    const { lightning } = LightningServices.services;
    logger.warn("Subscribing to invoices socket...")
    const stream = lightning.subscribeInvoices({});
    stream.on("data", data => {
      logger.info("[SOCKET] New invoice data:", data);
      socket.emit("invoice:new", data)
    })
    stream.on("end", () => {
      logger.info("New invoice stream ended, starting a new one...")
      onNewInvoice(socket);
    })
    stream.on("error", err => {
      logger.error("New invoice stream error:", err);
    })
    stream.on("status", status => {
      logger.error("New invoice stream status:", status);
      if (status.code === 14) {
        onNewInvoice(socket);
      }
    })
  }

  const onNewTransaction = socket => {
    const { lightning } = LightningServices.services;
    const stream = lightning.subscribeTransactions({});
    logger.warn("Subscribing to transactions socket...")
    stream.on("data", data => {
      logger.info("[SOCKET] New transaction data:", data);
      socket.emit("transaction:new", data)
    })
    stream.on("end", () => {
      logger.info("New invoice stream ended, starting a new one...")
      onNewTransaction(socket);
    })
    stream.on("error", err => {
      logger.error("New invoice stream error:", err);
    })
    stream.on("status", status => {
      logger.error("New invoice stream status:", status);
      if (status.code === 14) {
        onNewTransaction(socket);
      }
    })
  }

  io.on("connection", socket => {
    logger.info(`io.onconnection`)

    logger.info("socket.handshake", socket.handshake);

    /** printing out the client who joined */
    logger.info("New socket client connected (id=" + socket.id + ").");

    const isOneTimeUseSocket = !!socket.handshake.query.IS_GUN_AUTH
    const isLNDSocket = !!socket.handshake.query.IS_LND_SOCKET

    if (isOneTimeUseSocket) {
      logger.info('New socket is one time use')
      socket.on('IS_GUN_AUTH', () => {
        try {
          const isGunAuth = Mediator.isAuthenticated()
          socket.emit('IS_GUN_AUTH', {
            ok: true,
            msg: {
              isGunAuth
            },
            origBody: {}
          })
          socket.disconnect()
        } catch (err) {
          socket.emit('IS_GUN_AUTH', {
            ok: false,
            msg: err.message,
            origBody: {}
          })
          socket.disconnect()
        }
      })
    } else {
      logger.info('New socket is NOT one time use')
      // this is where we create the websocket connection
      // with the GunDB service.
      Mediator.createMediator(socket);
      if (isLNDSocket) {
        onNewInvoice(socket);
        onNewTransaction(socket);
      }

      /** listening if client has disconnected */
      socket.on("disconnect", () => {
        logger.info("client disconnected (id=" + socket.id + ").");
      });
    }
  })

  return io;
};
