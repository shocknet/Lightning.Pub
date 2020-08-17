/*
 * @prettier
 */
// @ts-nocheck
const jwt = require('jsonwebtoken')
const uuidv1 = require('uuid/v1')
const jsonfile = require('jsonfile')
const path = require('path')
const logger = require('winston')
const Storage = require('node-persist')
const FS = require('../../utils/fs')

const rootFolder = process.resourcesPath || __dirname
const secretsFilePath = path.resolve(rootFolder, 'secrets.json')

class Auth {
  readSecrets = async () => {
    const secrets = await Storage.get('auth/secrets')

    if (secrets) {
      return secrets
    }

    const newSecrets = await Storage.set('auth/secrets', {})

    return newSecrets
  }

  async writeSecrets(key, value) {
    const allSecrets = await this.readSecrets()
    const newSecrets = await Storage.set('auth/secrets', {
      ...allSecrets,
      [key]: value
    })
    return newSecrets
  }

  async generateToken() {
    const timestamp = Date.now()
    const secret = uuidv1()
    logger.info('Generating new secret...')
    const token = jwt.sign(
      {
        data: { timestamp }
      },
      secret,
      { expiresIn: '500h' }
    )
    logger.info('Saving secret...')
    await this.writeSecrets(timestamp, secret)
    return token
  }

  async validateToken(token) {
    try {
      const key = jwt.decode(token).data.timestamp
      const secrets = await this.readSecrets()
      const secret = secrets[key]
      if (!secret) {
        throw { valid: false }
      }
      return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
          if (err) {
            logger.info('validateToken err', err)
            reject(err)
          } else {
            logger.info('decoded', decoded)
            resolve({ valid: true })
          }
        })
      })
    } catch (err) {
      logger.error(err)
      throw err
    }
  }
}

module.exports = new Auth()
