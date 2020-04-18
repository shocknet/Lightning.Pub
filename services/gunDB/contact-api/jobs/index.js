/**
 * @format
 * Jobs are subscriptions to events that perform actions (write to GUN) on
 * response to certain ways events can happen. These tasks need to be fired up
 * at app launch otherwise certain features won't work as intended. Tasks should
 * ideally be idempotent, that is, if they were to be fired up after a certain
 * amount of time after app launch, everything should work as intended. For this
 * to work, special care has to be put into how these respond to events. These
 * tasks accept factories that are homonymous to the events on this same module.
 */

const onAcceptedRequests = require('./onAcceptedRequests')
const onOrders = require('./onOrders')
const lastSeenNode = require('./lastSeenNode')

module.exports = {
  onAcceptedRequests,
  onOrders,
  lastSeenNode
}
