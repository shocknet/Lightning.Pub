// app/lnd.js

const logger = require("winston");

// TODO
module.exports = function(lightning) {
  const module = {};

  const invoiceListeners = [];
  const transactionsListeners = [];

  let lndTransactionsStream = null;
  let lndInvoicesStream = null;
  const openLndTransactionsStream = function(){
    
    if(lndTransactionsStream){
      logger.debug("Lnd transactions subscription stream already opened.");
      return
    }
    logger.debug("Opening lnd transactions subscription stream...");
    lndTransactionsStream = lightning.subscribeTransactions({})
    logger.debug("Lnd transactions subscription stream opened.");
    lndTransactionsStream.on("data", function(data) {
      
      logger.debug("SubscribeInvoices Data", data);
      for (let i = 0; i < transactionsListeners.length; i++) {
        try {
          transactionsListeners[i].dataReceived(data);
        } catch (err) {
          logger.warn(err);
        }
      }
    });
    lndTransactionsStream.on("end", function() {
      logger.debug("SubscribeInvoices End");
      lndTransactionsStream = null;
      openLndTransactionsStream(); // try opening stream again
    });
    lndTransactionsStream.on("error", function(err) {
      logger.debug("SubscribeInvoices Error", err);
    });
    lndTransactionsStream.on("status", function(status) {
      logger.debug("SubscribeInvoices Status", status);
      if (status.code == 14) {
        // Unavailable
        lndTransactionsStream = null;
        openLndTransactionsStream(); // try opening stream again
      }
    });
  }

  const openLndInvoicesStream = function() {
    if (lndInvoicesStream) {
      logger.debug("Lnd invoices subscription stream already opened.");
    } else {
      logger.debug("Opening lnd invoices subscription stream...");
      lndInvoicesStream = lightning.subscribeInvoices({});
      logger.debug("Lnd invoices subscription stream opened.");
      lndInvoicesStream.on("data", function(data) {
        logger.debug("SubscribeInvoices Data", data);
        for (let i = 0; i < invoiceListeners.length; i++) {
          try {
            invoiceListeners[i].dataReceived(data);
          } catch (err) {
            logger.warn(err);
          }
        }
      });
      lndInvoicesStream.on("end", function() {
        logger.debug("SubscribeInvoices End");
        lndInvoicesStream = null;
        openLndInvoicesStream(); // try opening stream again
      });
      lndInvoicesStream.on("error", function(err) {
        logger.debug("SubscribeInvoices Error", err);
      });
      lndInvoicesStream.on("status", function(status) {
        logger.debug("SubscribeInvoices Status", status);
        if (status.code == 14) {
          // Unavailable
          lndInvoicesStream = null;
          openLndInvoicesStream(); // try opening stream again
        }
      });
    }
  };

  // register invoice listener
  module.registerInvoiceListener = function(listener) {
    invoiceListeners.push(listener);
    logger.debug(
      "New lnd invoice listener registered, " +
        invoiceListeners.length +
        " listening now"
    );
  };
  module.registerTransactionsListener = function(listener){
    
    transactionsListeners.push(listener)
    logger.debug(
      "New lnd Transactions listener registered, " +
      transactionsListeners.length +
        " listening now"
    );
  }
  module.unregisterTransactionsListener = function(listener){
    transactionsListeners.splice(transactionsListeners.indexOf(listener), 1);
    logger.debug(
      "Lnd transactions listener unregistered, " +
      transactionsListeners.length +
        " still listening"
    );
  }

  // unregister invoice listener
  module.unregisterInvoiceListener = function(listener) {
    invoiceListeners.splice(invoiceListeners.indexOf(listener), 1);
    logger.debug(
      "Lnd invoice listener unregistered, " +
        invoiceListeners.length +
        " still listening"
    );
  };

  // open lnd invoices stream on start
  openLndInvoicesStream();
  openLndTransactionsStream();

  // check every minute that lnd invoices stream is still opened
  setInterval(function() {
    if (!lndInvoicesStream) {
      openLndInvoicesStream();
    }
    if (!lndTransactionsStream) {
      openLndTransactionsStream();
    }
  }, 60 * 1000);

  return module;
};
