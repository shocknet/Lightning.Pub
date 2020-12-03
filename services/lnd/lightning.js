const Path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const logger = require("winston");
const fs = require("../../utils/fs");
const errorConstants = require("../../constants/errors");

// expose the routes to our app with module.exports
/**
 * @typedef LightningConfig
 * @prop {string} lnrpcProtoPath
 * @prop {string} routerProtoPath
 * @prop {string} walletUnlockerProtoPath
 * @prop {string} lndHost
 * @prop {string} lndCertPath
 * @prop {string?} macaroonPath
 */

/** 
 * @typedef LightningServices
 * @prop {any} lightning
 * @prop {any} walletUnlocker
 * @prop {any} router
 * @prop {any} invoices
 */

/** 
 * @param {LightningConfig} args0
 * @returns {Promise<LightningServices>}
 */
module.exports = async ({
  lnrpcProtoPath,
  routerProtoPath,
  walletUnlockerProtoPath,
  lndHost, 
  lndCertPath, 
  macaroonPath 
}) => {
  try {
    process.env.GRPC_SSL_CIPHER_SUITES = "HIGH+ECDSA";
    const protoLoaderConfig = {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: ["node_modules/google-proto-files", "proto", Path.resolve(__dirname, "../../config")]
    }

    const [lnrpcProto, routerProto, walletUnlockerProto] = await Promise.all([protoLoader.load(lnrpcProtoPath, protoLoaderConfig), protoLoader.load(routerProtoPath, protoLoaderConfig), protoLoader.load(walletUnlockerProtoPath, protoLoaderConfig)]);
    const { lnrpc } = grpc.loadPackageDefinition(lnrpcProto);
    const { routerrpc } = grpc.loadPackageDefinition(routerProto);
    const { lnrpc: walletunlockerrpc } = grpc.loadPackageDefinition(walletUnlockerProto);

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
        const walletUnlocker = new walletunlockerrpc.WalletUnlocker(lndHost, credentials);
        // @ts-ignore
        const router = new routerrpc.Router(lndHost, credentials);
        // @ts-expect-error
        const invoices = new lnrpc.Invoices(lndHost, credentials)


        return {
          lightning,
          walletUnlocker,
          router,
          invoices
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
    throw err;
  }
};
