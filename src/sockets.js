// app/sockets.js

const logger = require("winston");
const io = require('socket.io')

module.exports = (
  lnd,
) => {
  const Mediator = require("../services/gunDB/Mediator/index.js");
  const EventEmitter = require("events");

  class MySocketsEvents extends EventEmitter {}

  const mySocketsEvents = new MySocketsEvents();

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


  io.on("connection", socket => {
    logger.info(`io.onconnection`)

    // this is where we create the websocket connection
    // with the GunDB service.
    Mediator.createMediator(socket);

    logger.info(`socket after createmediator`)

    logger.info("socket.handshake", socket.handshake);

    /** printing out the client who joined */
    logger.info("New socket client connected (id=" + socket.id + ").");

    registerSocketListeners(socket);

    /** listening if client has disconnected */
    socket.on("disconnect", () => {
      unregisterSocketListeners(socket);
      logger.info("client disconnected (id=" + socket.id + ").");
    });
  });

  return mySocketsEvents;
};
