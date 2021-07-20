/**
 * @prettier
 */
const debounce = require('lodash/debounce')

const {
  Constants: { ErrorCode }
} = require('shock-common')

const Key = require('../key')

const DEBOUNCE_WAIT_TIME = 500

/** @type {string|null} */
let currentSeedBackup = null

/**
 * @param {(seedBackup: string|null) => void} cb
 * @param {import('../SimpleGUN').UserGUNNode} user
 * @param {import('../SimpleGUN').ISEA} SEA
 * @throws {Error} If user hasn't been auth.
 * @returns {void}
 */
const onSeedBackup = (cb, user, SEA) => {
  if (!user.is) {
    throw new Error(ErrorCode.NOT_AUTH)
  }

  const mySecret = require('../../Mediator').getMySecret()

  const callb = debounce(cb, DEBOUNCE_WAIT_TIME)
  callb(currentSeedBackup)

  user.get(Key.SEED_BACKUP).on(async seedBackup => {
    if (typeof seedBackup === 'string') {
      currentSeedBackup = await SEA.decrypt(seedBackup, mySecret)
      callb(currentSeedBackup)
    }
  })
}

module.exports = {
  onSeedBackup
}
