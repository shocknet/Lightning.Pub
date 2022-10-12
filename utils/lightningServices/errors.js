
const LightningServices = require('./lightning-services')

/**
 * @typedef {{
 * code:number,
 * details:string,
 * message:string
 * }} LNDError 
 */

/**
 * @typedef {(err:LNDError,response:object)=>void} HealthListener 
 */

class LNDErrorManager {

  /**
   * @type {boolean}
   */
  _isCheckingHealth = false

  /**
   * @type {string|null}
   */
  _lndPub = null

  get lndPub() {
    return this._lndPub
  }

  /**
   * @type {HealthListener[]}
   */
  _healthListeners = []

  //rejects if(err && err.code !== 12)  
  getAvailableService() {

    //require('shock-common').Utils.makePromise((res, rej) => ...)
    return new Promise((res, rej) => {
      if (!this._isCheckingHealth) {
        this._isCheckingHealth = true
        this.getInfo()
      }
      /**
       * 
       * @param {LNDError} err 
       * @param {object} response 
       */
      const listener = (err, response) => {
        if (err) {
          if (err.details.includes("wallet not created") || err.details.includes("wallet locked")) {
            res({
              service: 'walletUnlocker',
              message: 'Wallet locked',
              code: err.code,
              walletStatus: 'locked',
              success: true
            })
          } else if (err.code === 14) {
            rej({
              service: 'unknown',
              message:
                "Failed to connect to LND server, make sure it's up and running.",
              code: 14,
              walletStatus: 'unknown',
              success: false
            })
          } else if (err.code === 4) {
            rej({
              service: 'unknown',
              message:
                "LND Timeout",
              code: 4,
              walletStatus: 'unknown',
              success: false
            })
          } else {
            rej({
              service: 'lightning',
              message: this.sanitizeLNDError(err),
              code: err.code,
              walletStatus: 'unlocked',
              success: false
            })
          }
        }

        res({
          service: 'lightning',
          message: response,
          code: null,
          walletStatus: 'unlocked',
          success: true
        })

      }
      this._healthListeners.push(listener)
    })

  }

  //private
  getInfo() {
    const { lightning } = LightningServices.services
    /**
     * 
     * @param {LNDError} err 
     * @param {{identity_pubkey:string}} response 
     */
    const callback = (err, response) => {
      if (response && response.identity_pubkey) {
        this._lndPub = response.identity_pubkey
      }
      this._healthListeners.forEach(l => {
        l(err, response)
      })
      this._healthListeners.length = 0
      this._isCheckingHealth = false
    }
    const deadline = Date.now() + 10000
    lightning.getInfo({}, { deadline }, callback)
  }

  /**
   * @param {LNDError} e 
   */
  handleError(e) {
    return this.sanitizeLNDError(e)
  }

  /**
   * @param {LNDError} e 
   */
  // eslint-disable-next-line
  sanitizeLNDError(e) {
    let eMessage = ''
    if (typeof e === 'string') {
      eMessage = e
    } else if (e.details) {
      eMessage = e.details
    } else if (e.message) {
      eMessage = e.message
    }
    if (eMessage.toLowerCase().includes('unknown')) {
      const splittedMessage = eMessage.split('UNKNOWN: ')
      return splittedMessage.length > 1
        ? splittedMessage.slice(1).join('')
        : splittedMessage.join('')
    }
    if (eMessage === '') {
      return 'unknown LND error'
    }
    return eMessage
  }


}


const lndErrorManager = new LNDErrorManager()

module.exports = lndErrorManager