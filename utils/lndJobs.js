/**
 * @prettier
 */
const Logger = require('winston')
const Key = require('../services/gunDB/contact-api/key')
const { getUser } = require('../services/gunDB/Mediator')
const LightningServices = require('./lightningServices')

const ERROR_TRIES_THRESHOLD = 3
const INVOICE_STATE = {
  OPEN: 'OPEN',
  SETTLED: 'SETTLED',
  CANCELLED: 'CANCELLED',
  ACCEPTED: 'ACCEPTED'
}

const _lookupInvoice = hash =>
  new Promise((resolve, reject) => {
    const { lightning } = LightningServices.services
    lightning.lookupInvoice({ r_hash: hash }, (err, response) => {
      if (err) {
        Logger.error(
          '[TIP] An error has occurred while trying to lookup invoice:',
          err,
          '\nInvoice Hash:',
          hash
        )
        reject(err)
        return
      }

      Logger.info('[TIP] Invoice lookup result:', response)
      resolve(response)
    })
  })

const _getPostTipInfo = ({ postID, page }) =>
  new Promise((resolve, reject) => {
    getUser()
      .get(Key.WALL)
      .get(Key.PAGES)
      .get(page)
      .get(Key.POSTS)
      .get(postID)
      .once(post => {
        if (post && post.date) {
          const { tipCounter, tipValue } = post
          console.log(post)
          resolve({
            tipCounter: typeof tipCounter === 'number' ? tipCounter : 0,
            tipValue: typeof tipValue === 'number' ? tipValue : 0
          })
        }

        resolve(post)
      })
  })

const _incrementPost = ({ postID, page, orderAmount }) =>
  new Promise((resolve, reject) => {
    const parsedAmount = parseFloat(orderAmount)

    if (typeof parsedAmount !== 'number') {
      reject(new Error('Invalid order amount specified'))
      return
    }

    Logger.info('[POST TIP] Getting Post Tip Values...')

    return _getPostTipInfo({ postID, page })
      .then(({ tipValue, tipCounter }) => {
        const updatedTip = {
          tipCounter: tipCounter + 1,
          tipValue: tipValue + parsedAmount
        }

        getUser()
          .get(Key.WALL)
          .get(Key.PAGES)
          .get(page)
          .get(Key.POSTS)
          .get(postID)
          .put(updatedTip, () => {
            Logger.info('[POST TIP] Successfully updated Post tip info')
            resolve(updatedTip)
          })
      })
      .catch(err => {
        Logger.error(err)
        reject(err)
      })
  })

const _updateTipData = (invoiceHash, data) =>
  new Promise((resolve, reject) => {
    try {
      getUser()
        .get(Key.TIPS_PAYMENT_STATUS)
        .get(invoiceHash)
        .put(data, tip => {
          if (tip === undefined) {
            reject(new Error('Tip update failed'))
            return
          }

          console.log(tip)

          resolve(tip)
        })
    } catch (err) {
      Logger.error('An error has occurred while updating tip^data')
      throw err
    }
  })

const _getTipData = invoiceHash =>
  new Promise((resolve, reject) => {
    getUser()
      .get(Key.TIPS_PAYMENT_STATUS)
      .get(invoiceHash)
      .once(tip => {
        if (tip === undefined) {
          reject(new Error('Malformed data'))
          return
        }

        resolve(tip)
      })
  })

const executeTipAction = (tip, invoice) => {
  if (invoice.state !== INVOICE_STATE.SETTLED) {
    return
  }

  // Execute actions once invoice is settled
  Logger.info('Invoice settled!', invoice)

  if (tip.targetType === 'post') {
    _incrementPost({
      postID: tip.postID,
      page: tip.postPage,
      orderAmount: invoice.amt_paid_sat
    })
  }
}

const updateUnverifiedTips = () => {
  getUser()
    .get(Key.TIPS_PAYMENT_STATUS)
    .map()
    .once(async (tip, id) => {
      try {
        if (
          !tip ||
          tip.state !== INVOICE_STATE.OPEN ||
          (tip._errorCount && tip._errorCount >= ERROR_TRIES_THRESHOLD)
        ) {
          return
        }
        Logger.info('Unverified invoice found!', tip)
        const invoice = await _lookupInvoice(tip.hash)
        Logger.info('Invoice located:', invoice)
        if (invoice.state !== tip.state) {
          await _updateTipData(id, { state: invoice.state })

          // Actions to be executed when the tip's state is updated
          executeTipAction(tip, invoice)
        }
      } catch (err) {
        Logger.error('[TIP] An error has occurred while updating invoice', err)
        const errorCount = tip._errorCount ? tip._errorCount : 0
        _updateTipData(id, {
          _errorCount: errorCount + 1
        })
      }
    })
}

const startTipStatusJob = () => {
  const { lightning } = LightningServices.services
  const stream = lightning.subscribeInvoices({})
  updateUnverifiedTips()
  stream.on('data', async invoice => {
    const hash = invoice.r_hash.toString('base64')
    const tip = await _getTipData(hash)
    if (tip.state !== invoice.state) {
      await _updateTipData(hash, { state: invoice.state })
      executeTipAction(tip, invoice)
    }
  })
}

module.exports = {
  startTipStatusJob
}