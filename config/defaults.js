const os = require("os");
const path = require("path");
const platform = os.platform();
const homeDir = os.homedir();

const getLndDirectory = () => {
  if (platform === "darwin") {
    return homeDir + "/Library/Application Support/Lnd";
  } else if (platform === "win32") {
    // eslint-disable-next-line no-process-env
    const { APPDATA = "" } = process.env;
    return path.resolve(APPDATA, "../Local/Lnd");
  }

  return homeDir + "/.lnd";
};

const parsePath = (filePath = "") => {
  if (platform === "win32") {
    return filePath.replace("/", "\\");
  }

  return filePath;
};

const lndDirectory = getLndDirectory();

const SHOCK_SUPER_PEER = "http://gun.shock.network:8765/gun"

module.exports = (mainnet = false) => {
  const network = mainnet ? "mainnet" : "testnet";

  return {
    serverPort: 9835,
    serverHost: "localhost",
    sessionSecret: "my session secret",
    sessionMaxAge: 300000,
    lndAddress: "127.0.0.1:9735",
    maxNumRoutesToQuery: 20,
    lndProto: parsePath(`${__dirname}/rpc.proto`),
    routerProto: parsePath(`${__dirname}/router.proto`),
    walletUnlockerProto: parsePath(`${__dirname}/walletunlocker.proto`),
    lndHost: "localhost:10009",
    lndCertPath: parsePath(`${lndDirectory}/tls.cert`),
    macaroonPath: parsePath(
      `${lndDirectory}/data/chain/bitcoin/${network}/admin.macaroon`
    ),
    dataPath: parsePath(`${lndDirectory}/data`),
    loglevel: "info",
    logfile: "shockapi.log",
    lndLogFile: parsePath(`${lndDirectory}/logs/bitcoin/${network}/lnd.log`),
    lndDirPath: lndDirectory,
    peers: [SHOCK_SUPER_PEER],
    useTLS: false,
    tokenExpirationMS: 4500000
  }; 
};
