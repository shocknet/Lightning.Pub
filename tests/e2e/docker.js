const dockerode = require('dockerode')
const config = require('../config/config')

const Docker = new dockerode({
  socketPath: config.socketPath,
  host: config.host,
  port: config.port,
  protocol: config.protocol,
})

const buildGun = async () => {
  const a = await Docker.buildImage('', {})
}

/**
 * @param {String} name
 */
const setupGun = async (name) => {}

/**
 * @param {Number} count 
 */
const createNodes = async (name, count) => {}

/**
 */
const killGun = async (name) => {}

module.exports = {
  Nodes: [],
  setupGun,
  killGun,
  createNodes
}