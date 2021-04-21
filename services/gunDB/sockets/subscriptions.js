/**
 * @typedef {() => void} Unsubscribe
 */

/** @type {Map<string, Map<string, { subscriptionId: string, unsubscribe?: () => void, metadata?: object }>>} */
const userSubscriptions = new Map()

/**
 * Adds a new Subscription
 * @param {Object} subscription
 * @param {string} subscription.deviceId
 * @param {string} subscription.subscriptionId
 * @param {(Unsubscribe)=} subscription.unsubscribe
 * @param {(object)=} subscription.metadata
 */
const add = ({ deviceId, subscriptionId, unsubscribe, metadata }) => {
  const deviceSubscriptions = userSubscriptions.get(deviceId)

  const subscriptions = deviceSubscriptions ?? new Map()
  subscriptions.set(subscriptionId, {
    subscriptionId,
    unsubscribe,
    metadata
  })
  userSubscriptions.set(deviceId, subscriptions)
}

/**
 * Adds a new Subscription
 * @param {Object} subscription
 * @param {string} subscription.deviceId
 * @param {string} subscription.subscriptionId
 * @param {Unsubscribe} subscription.unsubscribe
 */
const attachUnsubscribe = ({
  deviceId,
  subscriptionId,
  unsubscribe
}) => {
  const deviceSubscriptions = userSubscriptions.get(deviceId)

  const subscriptions = deviceSubscriptions

  if (!subscriptions) {
    return
  }

  const subscription = subscriptions.get(subscriptionId)

  if (!subscription) {
    return
  }

  subscriptions.set(subscriptionId, {
    ...subscription,
    unsubscribe
  })
  userSubscriptions.set(deviceId, subscriptions)
}

/**
 * Unsubscribes from a GunDB query
 * @param {Object} subscription
 * @param {string} subscription.deviceId
 * @param {string} subscription.subscriptionId
 */
const remove = ({ deviceId, subscriptionId }) => {
  const deviceSubscriptions = userSubscriptions.get(deviceId)

  const subscriptions = deviceSubscriptions ?? new Map()
  const subscription = subscriptions.get(subscriptionId);

  if (subscription?.unsubscribe) {
    subscription.unsubscribe()
  }

  subscriptions.delete(subscriptionId)
  userSubscriptions.set(deviceId, subscriptions)
}

/**
 * Unsubscribes from all GunDB queries for a specific device
 * @param {Object} subscription
 * @param {string} subscription.deviceId
 */
const removeDevice = ({ deviceId }) => {
  const deviceSubscriptions = userSubscriptions.get(deviceId);

  if (!deviceSubscriptions) {
    return
  }

  Array.from(deviceSubscriptions.values()).map(subscription => {
    if (subscription && subscription.unsubscribe) {
      subscription.unsubscribe()
    }

    return subscription
  })

  userSubscriptions.set(deviceId, new Map());
}

/**
 * Retrieves the specified subscription's info if it exists
 * @param {Object} subscription
 * @param {string} subscription.deviceId
 * @param {string} subscription.subscriptionId
 */
const get = ({ deviceId, subscriptionId }) => {
  const deviceSubscriptions = userSubscriptions.get(deviceId)

  if (!deviceSubscriptions) {
    return false
  }

  const subscription = deviceSubscriptions.get(subscriptionId)
  return subscription
}

module.exports = {
  add,
  attachUnsubscribe,
  get,
  remove,
  removeDevice
}