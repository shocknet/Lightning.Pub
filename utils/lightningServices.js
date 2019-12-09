const FS = require("../utils/fs");
const lnrpc = require("../services/lnd/lightning");

class LightningServices {
  setDefaults = program => {
    const defaults = require("../config/defaults")(program.mainnet);

    this.defaults = defaults;
    this.config = {
      useTLS: program.usetls,
      serverPort: program.serverport || defaults.serverPort,
      serverHost: program.serverhost || defaults.serverHost,
      lndHost: program.lndhost || defaults.lndHost,
      lndCertPath: program.lndCertPath || defaults.lndCertPath,
      macaroonPath: program.macaroonPath || defaults.macaroonPath
    };
  }

  isInitialized = () => {
    return !!(this.lightning && this.walletUnlocker);
  }

  get services() {
    return {
      lightning: this.lightning,
      walletUnlocker: this.walletUnlocker,
    };
  }

  get servicesData() {
    return this.lnServicesData;
  }

  init = async () => {
    const { macaroonPath, lndHost, lndCertPath } = this.config;
    const macaroonExists = await FS.access(macaroonPath);
    const lnServices = await lnrpc(
      this.defaults.lndProto,
      lndHost,
      lndCertPath,
      macaroonExists ? macaroonPath : null
    );
    const { lightning, walletUnlocker } = lnServices;
    this.lightning = lightning;
    this.walletUnlocker = walletUnlocker
    this.lnServicesData = {
      lndProto: this.defaults.lndProto,
      lndHost,
      lndCertPath,
      macaroonPath: macaroonExists ? macaroonPath : null
    };
  }
}

const lightningServices = new LightningServices();

module.exports = lightningServices;