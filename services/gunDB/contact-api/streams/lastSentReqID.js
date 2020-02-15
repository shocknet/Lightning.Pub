/** @format */
const Key = require('../key')

/** @type {Record<string, string|null|undefined>} */
let pubToLastSentReqID = {}

/** @type {Set<() => void>} */
const listeners = new Set()
const notify = () => listeners.forEach(l => l())

let subbed = false

/**
 * @param {() => void} cb
 */
const onLastSentReqIDs = cb => {
  listeners.add(cb)
  cb()

  if (!subbed) {
    require('../../Mediator')
      .getUser()
      .get(Key.USER_TO_LAST_REQUEST_SENT)
      .open(data => {
        if (typeof data === 'object' && data !== null) {
          for (const [pub, id] of Object.entries(data)) {
            if (typeof id === 'string' || id === null) {
              pubToLastSentReqID[pub] = id
            }
          }
        } else {
          pubToLastSentReqID = {}
        }

        notify()
      })
    subbed = true
  }

  return () => {
    listeners.delete(cb)
  }
}

const getSentReqIDs = () => pubToLastSentReqID

module.exports = {
  onLastSentReqIDs,
  getSentReqIDs
}
