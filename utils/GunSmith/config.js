/**
 * @format
 */
/* eslint-disable no-process-env */

const dotenv = require('dotenv')
const defaults = require('../../config/defaults')(false)

dotenv.config()

// @ts-ignore Let it crash if undefined
exports.DATA_FILE_NAME = process.env.DATA_FILE_NAME || defaults.dataFileName

/**
 * @type {string[]}
 */
exports.PEERS = process.env.PEERS
  ? JSON.parse(process.env.PEERS)
  : defaults.peers

exports.MS_TO_TOKEN_EXPIRATION = Number(
  process.env.MS_TO_TOKEN_EXPIRATION || defaults.tokenExpirationMS
)

exports.SHOW_LOG = process.env.SHOW_GUN_DB_LOG === 'true'
