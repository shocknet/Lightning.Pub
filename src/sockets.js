// app/sockets.js

const logger = require("winston");

module.exports = (
  io,
  lnd,
  login,
  pass,
  limitlogin,
  limitpass
) => {
  const Mediator = require("../services/gunDB/Mediator/index.js");
  const EventEmitter = require("events");

  class MySocketsEvents extends EventEmitter {}

  const mySocketsEvents = new MySocketsEvents();

  const clients = [];

  const authEnabled = (login && pass) || (limitlogin && limitpass);

  let userToken = null;
  let limitUserToken = null;
  if (login && pass) {
    userToken = Buffer.from(login + ":" + pass).toString("base64");
  }
  if (limitlogin && limitpass) {
    limitUserToken = Buffer.from(limitlogin + ":" + limitpass).toString(
      "base64"
    );
  }

  // register the lnd invoices listener
  const registerLndInvoiceListener = socket => {
    socket._invoiceListener = {
      dataReceived(data) {
        socket.emit("invoice", data);
      }
    };
    lnd.registerInvoiceListener(socket._invoiceListener);
  };

  // unregister the lnd invoices listener
  const unregisterLndInvoiceListener = socket => {
    lnd.unregisterInvoiceListener(socket._invoiceListener);
  };

  // register the socket listeners
  const registerSocketListeners = socket => {
    registerLndInvoiceListener(socket);
  };

  // unregister the socket listeners
  const unregisterSocketListeners = socket => {
    unregisterLndInvoiceListener(socket);
  };

  const getSocketAuthToken = socket => {
    if (socket.handshake.query.auth) {
      return socket.handshake.query.auth;
    } else if (socket.handshake.headers.authorization) {
      return socket.handshake.headers.authorization.substr(6);
    }

    socket.disconnect("unauthorized");
    return null;
  };


  io.on("connection", socket => {

    logger.info(`io.onconnection`)

    // this is where we create the websocket connection
    // with the GunDB service.
    Mediator.createMediator(socket);

    logger.info(`socket after createmediator`)

    logger.info("socket.handshake", socket.handshake);

    if (authEnabled) {
      logger.info('io.onconnection -> authEnabled')
      try {
        const authorizationHeaderToken = getSocketAuthToken(socket);
        logger.info('io.onconnection -> authHEaderTOken: ' + JSON.stringify(authorizationHeaderToken))

        if (authorizationHeaderToken === userToken) {
          logger.info('io.onconnection -> setting socket._limitUser to false')
          socket._limituser = false;
        } else if (authorizationHeaderToken === limitUserToken) {
          logger.info('io.onconnection -> setting socket._limitUser to true')
          socket._limituser = true;
        } else {
          logger.info('io.onconnection -> disconnecting socket as unauth')
          socket.disconnect("unauthorized");
          return;
        }
      } catch (err) {
        logger.info('io.onconnection -> error caught:')
        // probably because of missing authorization header
        logger.info(JSON.stringify(err));
        logger.info('WILL DISCONNECT SOCKET')
        socket.disconnect("unauthorized");
        return;
      }
    } else {
      logger.info('io.onconnection -> no auth enabled so setting socket._limituser to false')
      socket._limituser = false;
    }

    /** printing out the client who joined */
    logger.info("New socket client connected (id=" + socket.id + ").");

    socket.emit("hello", { limitUser: socket._limituser });
    socket.broadcast.emit("hello", { remoteAddress: socket.handshake.address });

    /** pushing new client to client array*/
    clients.push(socket);

    registerSocketListeners(socket);

    /** listening if client has disconnected */
    socket.on("disconnect", () => {
      clients.splice(clients.indexOf(socket), 1);
      unregisterSocketListeners(socket);
      logger.info("client disconnected (id=" + socket.id + ").");
    });
  });

  return mySocketsEvents;
};
