const grpc = require("grpc");
const protoLoader = require("@grpc/proto-loader");
const fs = require("../../utils/fs");
const logger = require("winston");
const errorConstants = require("../../constants/errors");

// expose the routes to our app with module.exports
/**
 * @param {string} protoPath
 * @param {string} lndHost
 * @param {string} lndCertPath
 * @param {string|null} macaroonPath
 * @returns {Promise<any>}
 */
module.exports = async (protoPath, lndHost, lndCertPath, macaroonPath) => {
  try {
    process.env.GRPC_SSL_CIPHER_SUITES = "HIGH+ECDSA";

    const packageDefinition = await protoLoader.load(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: ["node_modules/google-proto-files", "proto"]
    });
    const { lnrpc } = grpc.loadPackageDefinition(packageDefinition);

    const getCredentials = async () => {
      const lndCert = await fs.readFile(lndCertPath);
      const sslCreds = grpc.credentials.createSsl(lndCert);

      if (macaroonPath) {
        const macaroonExists = await fs.access(macaroonPath);

        if (macaroonExists) {
          const macaroonCreds = grpc.credentials.createFromMetadataGenerator(
            async (_, callback) => {
              const adminMacaroon = await fs.readFile(macaroonPath);
              const metadata = new grpc.Metadata();
              metadata.add("macaroon", adminMacaroon.toString("hex"));
              callback(null, metadata);
            }
          );
          return grpc.credentials.combineChannelCredentials(
            sslCreds,
            macaroonCreds
          );
        }

        const error = errorConstants.MACAROON_PATH(macaroonPath);
        logger.error(error);
        throw error;
      } else {
        return sslCreds;
      }
    };

    if (lndCertPath) {
      const certExists = await fs.access(lndCertPath);

      if (certExists) {
        const credentials = await getCredentials();

        // @ts-ignore
        const lightning = new lnrpc.Lightning(lndHost, credentials);
        // @ts-ignore
        const walletUnlocker = new lnrpc.WalletUnlocker(lndHost, credentials);

        return {
          lightning,
          walletUnlocker
        };
      }

      const error = errorConstants.CERT_PATH(lndCertPath);
      logger.error(error);
      throw error;
    } else {
      const error = errorConstants.CERT_AND_MACAROON_MISSING(macaroonPath, lndCertPath);
      logger.error(error);
      throw error;
    }
  } catch (err) {
    logger.error(err);
    if (err.code === 14) {
      throw {
        field: "unknown",
        message:
          "Failed to connect to LND server, make sure it's up and running."
      };
    }
  }
};
