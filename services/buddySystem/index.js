const Common = require('shock-common')
/**
 * @typedef {object} Buddy
 * @prop {string} gunPub
 * @prop {number|null} balance
 * @prop {boolean} tenant
 * @prop {string|null} lndPub
 * @prop {string} latestMessage
 */

/** 
 * @typedef {object} InvoiceRequest
 * @prop {'BUDDY_INVOICE_REQUEST'} type
 * @prop {string} reqId
 * @prop {number=} amount
 * @prop {string=} memo
 *
 * @typedef {object} AddressRequest
 * @prop {'BUDDY_ADDRESS_REQUEST'} type
 * @prop {string} reqId
 * @prop {boolean=} legacy
 * 
 * @typedef {object} LightningPaymentRequest
 * @prop {'BUDDY_LIGHTNING_PAYMENT_REQUEST'} type
 * @prop {string} reqId
 * @prop {string} invoice
 *
 * @typedef {object} OnChainPaymentRequest
 * @prop {'BUDDY_ON_CHAIN_PAYMENT_REQUEST'} type
 * @prop {string} reqId
 * @prop {string} address
 * @prop {number} amount
 *
 * @typedef {object} InvoiceResponse
 * @prop {'BUDDY_INVOICE_RESPONSE'} type
 * @prop {string} reqId
 * @prop {string} invoice
 * 
 * @typedef {object} AddressResponse
 * @prop {'BUDDY_ADDRESS_RESPONSE'} type
 * @prop {string} reqId
 * @prop {string} address
 *
 * @typedef {object} InvoicePaidResponse
 * @prop {'BUDDY_INVOICE_PAID_RESPONSE'} type
 * @prop {string} reqId
 * @prop {string} invoice
 * @prop {number} amount
 * 
 * @typedef {object} AddressPaidResponse
 * @prop {'BUDDY_ADDRESS_PAID_RESPONSE'} type
 * @prop {string} reqId
 * @prop {string} address
 * @prop {number} amount
 */

/** 
 * @typedef {
 * InvoiceRequest |
 * AddressRequest | 
 * LightningPaymentRequest |
 * OnChainPaymentRequest |
 * InvoiceResponse| 
 * AddressResponse| 
 * InvoicePaidResponse| 
 * AddressPaidResponse 
 * } BuddyOperation
 */

//uuid in the chat message is used to reference request and their relative responses
const invoiceRequest = 'BUDDY_INVOICE_REQUEST' //prefix+uuid+amount+memo
const addressRequest = 'BUDDY_ADDRESS_REQUEST' //prefix+uuid+legacy

const lightningPaymentRequest = 'BUDDY_LIGHTNING_PAYMENT_REQUEST' //prefix+uuid+invoice
const onChainPaymentRequest = 'BUDDY_ON_CHAIN_PAYMENT_REQUEST' //prefix+uuid+addr+amount

const invoiceResponse = 'BUDDY_INVOICE_RESPONSE' //prefix+uuid+invoice
const addressResponse = 'BUDDY_ADDRESS_RESPONSE' //prefix+uuid+address

const invoicePaidResponse = 'BUDDY_INVOICE_PAID_RESPONSE' //prefix+uuid+invoice+amount
const addressPaidResponse = 'BUDDY_ADDRESS_PAID_RESPONSE' //prefix+uuid+address+amount

/* might be useful later with other operations
const successfulResponse = 'BUDDY_SUCCESSFUL_RESPONSE' //prefix+uuid
const failureResponse = 'BUDDY_FAILURE_RESPONSE' //prefix+uuid+reason
*/
class BuddyManager {
  /**
   * 
   * @param {string} gunPub 
   * @param {boolean} tenant 
   * @param {string|null} lndPub
   */
  addBuddy(gunPub, tenant, lndPub = null) {
    if (this._enabledBuddies[gunPub]) {
      return
    }

    this._enabledBuddies[gunPub] = {
      gunPub,
      balance: null,
      tenant,
      lndPub,
      latestMessage: ''
    }
  }

  /**
   * @param {Common.Schema.Chat[]} chats 
   */
  onChatsUpdate(chats) {
    chats.forEach(chat => {
      const { recipientPublicKey } = chat
      if (!this._enabledBuddies[recipientPublicKey]) {
        return
      }
      const buddy = this._enabledBuddies[recipientPublicKey]
      if (buddy.balance === null) {
        this._enabledBuddies[recipientPublicKey].balance = this.calculateBuddyBalance(messages)
      }
      const [latestMessage] = chat.messages
      if (latestMessage !== buddy.latestMessage) {

      }

    })
  }

  /**
   * @type {Record<string,Buddy>}
   */
  _enabledBuddies = {}

  payForBuddy() {
    //check balance
    //handle payment
    //send confirmation/error message
    //update balance
  }

  receiveForBuddy() {
    //create invoice and send to buddy via message
    //listen to invoice to be paid
    //send confirmation/error message
    //update balance
  }

  isInvoiceForBuddy() {

  }


  /**
   * 
   * @param {Common.Schema.ChatMessage[]} messages
   * @returns {number|null} 
   */
  calculateBuddyBalance(messages) {

  }

  /**
   * 
   * @param {Buddy} buddy 
   * @param {Common.Schema.ChatMessage[]} messages 
   */
  handleNewMessagesWithBuddy(buddy, messages) {
    let tmpIndex = messages.length
    if (buddy.latestMessage !== '') {
      tmpIndex = messages.indexOf(latestMessage) //should be pretty fast since the messages are in reverse order, so latest message known to manager should be one of the first ones 
    }

    for (; tmpIndex >= 0; tmpIndex--) {
      const maybeRequest = this.processMessage(messages[tmpIndex])
      if (maybeRequest) {
        //process request
      }
    }

  }

  /**
   * 
   * @param {Common.Schema.ChatMessage} message 
   * @returns {BuddyOperation|null}
   */
  processMessage(message) {
    if (message.outgoing) {//we only care about incoming messages here
      return null
    }
    if (message.body.startsWith(invoiceRequest)) {

    }
    if (message.body.startsWith(addressRequest)) {

    }
    if (message.body.startsWith(lightningPaymentRequest)) {

    }
    if (message.body.startsWith(onChainPaymentRequest)) {

    }
  }

  /**
   * @param {BuddyOperation} buddyRequest 
   */
  processRequest(buddyRequest) {

  }
}