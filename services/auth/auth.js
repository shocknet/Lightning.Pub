/*
 * @prettier
 */
// @ts-nocheck
const jwt = require('jsonwebtoken')
const uuidv1 = require('uuid/v1')
const jsonfile = require('jsonfile')
const path = require('path')
const logger = require('winston')
const FS = require('../../utils/fs')

const rootFolder = process.resourcesPath || __dirname
const secretsFilePath = path.resolve(rootFolder, 'secrets.json')

class Auth {
  verifySecretsFile = async () => {
    try {
      const fileExists = await FS.access(secretsFilePath)

      if (!fileExists) {
        return { exists: false }
      }

      const secretsFile = await FS.readFile(secretsFilePath, {
        encoding: 'utf8'
      })

      // Check if secrets file has valid JSON
      JSON.parse(secretsFile)

      return { exists: true, parsable: true }
    } catch (err) {
      logger.error(err)
      return { exists: true, parsable: false }
    }
  }

  initSecretsFile = async () => {
    const { exists, parsable } = await this.verifySecretsFile()

    if (exists && parsable) {
      logger.info('Secrets file exists!')
      return true
    }

    if (exists && !parsable) {
      await FS.unlink(secretsFilePath)
    }

    await FS.writeFile(secretsFilePath, '{}')

    logger.info('New secrets file generated!')

    return true
  }

  readSecrets = () =>
    new Promise((resolve, reject) => {
      this.initSecretsFile()
        .then(() => {
          jsonfile.readFile(secretsFilePath, (err, allSecrets) => {
            if (err) {
              logger.error('readSecrets err', err)
              reject('Problem reading secrets file')
            } else {
              resolve(allSecrets)
            }
          })
        })
        .catch(reject)
    })

  async writeSecrets(key, value) {
    await this.initSecretsFile()
    const allSecrets = await this.readSecrets()
    return new Promise((resolve, reject) => {
      allSecrets[key] = value
      logger.info('Writing new secret:', secretsFilePath)
      jsonfile.writeFile(
        secretsFilePath,
        allSecrets,
        { spaces: 2, EOL: '\r\n' },
        err => {
          if (err) {
            logger.error('writeSecrets err', err)
            reject(err)
          } else {
            logger.info('New secret saved!')
            resolve(true)
          }
        }
      )
    })
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
      await this.initSecretsFile()
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
