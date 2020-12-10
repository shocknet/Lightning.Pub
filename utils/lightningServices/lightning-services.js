/**
 * @format
 */
/**
 * @typedef {import('commander').Command} Command
 */

const FS = require('../../utils/fs')
const lnrpc = require('../../services/lnd/lightning')

/**
 * @typedef {object} Config
 * @prop {boolean} useTLS
 * @prop {number} serverPort
 * @prop {string} serverHost
 * @prop {string} lndHost
 * @prop {string} lndCertPath
 * @prop {string} macaroonPath
 * @prop {string} lndProto
 * @prop {string} routerProto
 * @prop {string} invoicesProto
 * @prop {string} walletUnlockerProto
 */

class LightningServices {
  /**
   * @type {Config|null}
   */
  _config = null

  /**
   * @type {Config|null}
   */
  _defaults = null

  /**
   * @param {Config} newDefaults
   */
  set defaults(newDefaults) {
    this._defaults = newDefaults
  }

  /**
   * @param {Command} program
   */
  setDefaults = program => {
    /**
     * @type {Config}
     */
    const newDefaults = require('../../config/defaults')(program.mainnet)

    this.defaults = newDefaults

    this._config = {
      ...newDefaults,
      useTLS: program.usetls,
      serverPort: program.serverport || newDefaults.serverPort,
      serverHost: program.serverhost || newDefaults.serverHost,
      lndHost: program.lndhost || newDefaults.lndHost,
      lndCertPath: program.lndCertPath || newDefaults.lndCertPath,
      macaroonPath: program.macaroonPath || newDefaults.macaroonPath
    }
  }

  isInitialized = () => {
    return !!(this.lightning && this.walletUnlocker)
  }

  get services() {
    return {
      lightning: this.lightning,
      walletUnlocker: this.walletUnlocker,
      router: this.router
    }
  }

  get servicesData() {
    return this.lnServicesData
  }

  /**
   * @returns {Config}
   */
  get servicesConfig() {
    if (this._config) {
      return this._config
    }

    throw new Error(
      'Tried to access LightningServices.servicesConfig without setting defaults first.'
    )
  }

  get config() {
    if (this._config) {
      return this._config
    }

    throw new Error(
      'Tried to access LightningServices.config without setting defaults first.'
    )
  }

  /**
   * @returns {Config}
   */
  get defaults() {
    if (this._defaults) {
      return this._defaults
    }

    throw new Error(
      'Tried to access LightningServices.defaults without setting them first.'
    )
  }

  init = async () => {
    const { macaroonPath, lndHost, lndCertPath } = this.config
    const macaroonExists = await FS.access(macaroonPath)
    const lnServices = await lnrpc({
      lnrpcProtoPath: this.defaults.lndProto,
      routerProtoPath: this.defaults.routerProto,
      invoicesProtoPath: this.defaults.invoicesProto,
      walletUnlockerProtoPath: this.defaults.walletUnlockerProto,
      lndHost,
      lndCertPath,
      macaroonPath: macaroonExists ? macaroonPath : null
    })
    if (!lnServices) {
      throw new Error(`Could not init lnServices`)
    }
    const { lightning, walletUnlocker, router, invoices } = lnServices
    this.lightning = lightning
    this.walletUnlocker = walletUnlocker
    this.router = router
    this.invoices = invoices
    this.lnServicesData = {
      lndProto: this.defaults.lndProto,
      lndHost,
      lndCertPath,
      macaroonPath: macaroonExists ? macaroonPath : null
    }
  }
}

const lightningServices = new LightningServices()

module.exports = lightningServices
