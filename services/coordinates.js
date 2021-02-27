/**
 * @format
 */

const Common = require('shock-common')
const mapValues = require('lodash/mapValues')
const pickBy = require('lodash/pickBy')
const Bluebird = require('bluebird')
const Logger = require('winston')
const Key = require('../services/gunDB/contact-api/key')

const { getUser, getMySecret, mySEA } = require('./gunDB/Mediator')

/**
 * @param {string} coordID
 * @param {Common.Coordinate} data
 * @returns {Promise<void>}
 */
module.exports.writeCoordinate = async (coordID, data) => {
  if (coordID !== data.id) {
    throw new Error('CoordID must be equal to data.id')
  }

  try {
    /**
     * Because there are optional properties, typescript can also allow them
     * to be specified but with a value of `undefined`. Filter out these.
     * @type {Record<string, number|boolean|string>}
     */
    const sanitizedData = pickBy(data, v => typeof v !== 'undefined')

    const encData = await Bluebird.props(
      mapValues(sanitizedData, v => {
        return mySEA.encrypt(v, getMySecret())
      })
    )

    getUser()
      .get(Key.COORDINATES)
      .get(coordID)
      .put(encData, ack => {
        if (ack.err && typeof ack.err !== 'number') {
          Logger.info(
            `Error writting corrdinate, coordinate id: ${coordID}, data: ${JSON.stringify(
              data,
              null,
              2
            )}`
          )
          Logger.error(ack.err)
        }
      })
  } catch (e) {
    Logger.info(
      `Error writing coordinate, coordinate id: ${coordID}, data: ${JSON.stringify(
        data,
        null,
        2
      )}`
    )
    Logger.error(e.message)
  }
}
