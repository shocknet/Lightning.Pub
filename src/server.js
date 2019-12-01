"use strict";

/**
 * Module dependencies.
 */
const server = program => {
  const Https = require("https");
  const Http = require("http");
  const Express = require("express");
  // const Cluster = require("cluster");
  // const OS = require("os");
  const app = Express();

  const FS = require("../utils/fs");
  const bodyParser = require("body-parser");
  const session = require("express-session");
  const methodOverride = require("method-override");
  // load app default configuration data
  const defaults = require("../config/defaults")(program.mainnet);
  // define useful global variables ======================================
  module.useTLS = program.usetls;
  module.serverPort = program.serverport || defaults.serverPort;
  module.httpsPort = module.serverPort;
  module.serverHost = program.serverhost || defaults.serverHost;

  // setup winston logging ==========
  const logger = require("../config/log")(
    program.logfile || defaults.logfile,
    program.loglevel || defaults.loglevel
  );

  // utilities functions =================
  require("../utils/server-utils")(module);

  // setup lightning client =================
  const lnrpc = require("../services/lnd/lightning");
  const lndHost = program.lndhost || defaults.lndHost;
  const lndCertPath = program.lndCertPath || defaults.lndCertPath;
  const macaroonPath = program.macaroonPath || defaults.macaroonPath;

  logger.info("Mainnet Mode:", !!program.mainnet);

  const wait = seconds =>
    new Promise(resolve => {
      const timer = setTimeout(() => resolve(timer), seconds * 1000);
    });

  // eslint-disable-next-line consistent-return
  const startServer = async () => {
    try {
      const macaroonExists = await FS.access(macaroonPath);
      const lnServices = await lnrpc(
        defaults.lndProto,
        lndHost,
        lndCertPath,
        macaroonExists ? macaroonPath : null
      );
      const { lightning } = lnServices;
      const { walletUnlocker } = lnServices;
      const lnServicesData = {
        lndProto: defaults.lndProto,
        lndHost,
        lndCertPath,
        macaroonPath: macaroonExists ? macaroonPath : null
      };

      // init lnd module =================
      const lnd = require("../services/lnd/lnd")(lightning);

      const unprotectedRoutes = {
        GET: {
          "/healthz": true,
          "/ping": true,
          // Errors out when viewing an API page from the browser
          "/favicon.ico": true,
          "/api/lnd/connect": true,
          "/api/lnd/wallet/status": true,
          "/api/lnd/auth": true
        },
        POST: {
          "/api/lnd/connect": true,
          "/api/lnd/wallet": true,
          "/api/lnd/wallet/existing": true,
          "/api/lnd/auth": true
        },
        PUT: {},
        DELETE: {}
      };
      const auth = require("../services/auth/auth");

      app.use(async (req, res, next) => {
        console.log("Route:", req.path)
        if (unprotectedRoutes[req.method][req.path]) {
          next();
        } else {
          try {
            const response = await auth.validateToken(
              req.headers.authorization.replace("Bearer ", "")
            );
            if (response.valid) {
              next();
            } else {
              res.status(401).json({ message: "Please log in" });
            }
          } catch (err) {
            logger.error(err);
            res.status(401).json({ message: "Please log in" });
          }
        }
      });

      const sensitiveRoutes = {
        GET: {},
        POST: {
          "/api/lnd/connect": true,
          "/api/lnd/wallet": true
        },
        PUT: {},
        DELETE: {}
      };
      app.use((req, res, next) => {
        if (sensitiveRoutes[req.method][req.path]) {
          console.log(
            JSON.stringify({
              time: new Date(),
              ip: req.ip,
              method: req.method,
              path: req.path,
              sessionId: req.sessionId
            })
          );
        } else {
          console.log(
            JSON.stringify({
              time: new Date(),
              ip: req.ip,
              method: req.method,
              path: req.path,
              body: req.body,
              query: req.query,
              sessionId: req.sessionId
            })
          );
        }
        next();
      });
      app.use(
        session({
          secret: defaults.sessionSecret,
          cookie: { maxAge: defaults.sessionMaxAge },
          resave: true,
          rolling: true,
          saveUninitialized: true
        })
      );
      app.use(bodyParser.urlencoded({ extended: "true" }));
      app.use(bodyParser.json());
      app.use(bodyParser.json({ type: "application/vnd.api+json" }));
      app.use(methodOverride());
      // WARNING
      // error handler middleware, KEEP 4 parameters as express detects the
      // arity of the function to treat it as a err handling middleware
      // eslint-disable-next-line no-unused-vars
      app.use((err, _, res, __) => {
        // Do logging and user-friendly error message display
        logger.error(err);
        res
          .status(500)
          .send({ status: 500, message: "internal error", type: "internal" });
      });

      const createServer = async () => {
        try {
          if (program.usetls) {
            const [key, cert] = await Promise.all([
              FS.readFile(program.usetls + "/key.pem"),
              FS.readFile(program.usetls + "/cert.pem")
            ]);
            const httpsServer = Https.createServer({ key, cert }, app);

            return httpsServer;
          }

          const httpServer = Http.Server(app);
          return httpServer;
        } catch (err) {
          logger.error(err.message);
          throw err;
        }
      };

      const serverInstance = await createServer();

      const io = require("socket.io")(serverInstance);

      // setup sockets =================
      const lndLogfile = program.lndlogfile || defaults.lndLogFile;

      const Sockets = require("./sockets")(
        io,
        lightning,
        lnd,
        program.user,
        program.pwd,
        program.limituser,
        program.limitpwd,
        lndLogfile,
        lnServicesData
      );

      require("./routes")(
        app,
        lightning,
        defaults,
        walletUnlocker,
        lnServicesData,
        Sockets,
        {
          serverHost: module.serverHost,
          serverPort: module.serverPort
        }
      );

      // enable CORS headers
      app.use(require("./cors"));
      // app.use(bodyParser.json({limit: '100000mb'}));
      app.use(bodyParser.json({ limit: "50mb" }));
      app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

      serverInstance.listen(module.serverPort, module.serverhost);

      logger.info(
        "App listening on " + module.serverHost + " port " + module.serverPort
      );

      module.server = serverInstance;

      // const localtunnel = require('localtunnel');
      //
      // const tunnel = localtunnel(port, (err, t) => {
      // 	console.log('err', err);
      // 	console.log('t', t.url);
      // });
    } catch (err) {
      console.error(err);
      logger.info("Restarting server in 30 seconds...");
      await wait(30);
      startServer();
      return false;
    }
  };

  startServer();
};

module.exports = server;
