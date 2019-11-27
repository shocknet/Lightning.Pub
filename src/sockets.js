// app/sockets.js

const logger = require("winston");
const FS = require("../utils/fs");

module.exports = (
  io,
  lightning,
  lnd,
  login,
  pass,
  limitlogin,
  limitpass,
  lndLogfile,
  lnServicesData
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

  io.on("connection", async socket => {
    // this is where we create the websocket connection
    // with the GunDB service.
    Mediator.createMediator(socket);
    
    const macaroonExists = await FS.access(lnServicesData.macaroonPath);
    const lnServices = await require("../services/lnd/lightning")(
      lnServicesData.lndProto,
      lnServicesData.lndHost,
      lnServicesData.lndCertPath,
      macaroonExists ? lnServicesData.macaroonPath : null
    );
    // eslint-disable-next-line prefer-destructuring, no-param-reassign
    lightning = lnServices.lightning;

    mySocketsEvents.addListener("updateLightning", async () => {
      const newMacaroonExists = await FS.access(lnServicesData.macaroonPath);
      const newLNServices = await require("../services/lnd/lightning")(
        lnServicesData.lndProto,
        lnServicesData.lndHost,
        lnServicesData.lndCertPath,
        newMacaroonExists ? lnServicesData.macaroonPath : null
      );
      // eslint-disable-next-line prefer-destructuring, no-param-reassign
      lightning = newLNServices.lightning;
    });

    logger.debug("socket.handshake", socket.handshake);

    if (authEnabled) {
      try {
        const authorizationHeaderToken = getSocketAuthToken(socket);

        if (authorizationHeaderToken === userToken) {
          socket._limituser = false;
        } else if (authorizationHeaderToken === limitUserToken) {
          socket._limituser = true;
        } else {
          socket.disconnect("unauthorized");
          return;
        }
      } catch (err) {
        // probably because of missing authorization header
        logger.debug(err);
        socket.disconnect("unauthorized");
        return;
      }
    } else {
      socket._limituser = false;
    }

    /** printing out the client who joined */
    logger.debug("New socket client connected (id=" + socket.id + ").");

    socket.emit("hello", { limitUser: socket._limituser });

    socket.broadcast.emit("hello", { remoteAddress: socket.handshake.address });

    /** pushing new client to client array*/
    clients.push(socket);

    registerSocketListeners(socket);

    /** listening if client has disconnected */
    socket.on("disconnect", () => {
      clients.splice(clients.indexOf(socket), 1);
      unregisterSocketListeners(socket);
      logger.debug("client disconnected (id=" + socket.id + ").");
    });
  });

  return mySocketsEvents;
};
