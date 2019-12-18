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
const secretsFilePath = path.resolve(__dirname, 'secrets.json')

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
      console.error(err)
      return { exists: true, parsable: false }
    }
  }

  initSecretsFile = async () => {
    const { exists, parsable } = await this.verifySecretsFile()

    if (exists && parsable) {
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
      this.initSecretsFile().then(() => {
        jsonfile.readFile(secretsFilePath, (err, allSecrets) => {
          if (err) {
            logger.info('readSecrets err', err)
            reject('Problem reading secrets file')
          } else {
            resolve(allSecrets)
          }
        })
      })
    })

  writeSecrets(key, value) {
    return this.initSecretsFile()
      .then(() => this.readSecrets())
      .then(allSecrets => {
        return new Promise((resolve, reject) => {
          allSecrets[key] = value
          jsonfile.writeFile(
            secretsFilePath,
            allSecrets,
            { spaces: 2, EOL: '\r\n' },
            err => {
              if (err) {
                logger.info('writeSecrets err', err)
                reject(err)
              } else {
                resolve(true)
              }
            }
          )
        })
      })
  }

  async generateToken() {
    const timestamp = Date.now()
    const secret = uuidv1()
    const token = jwt.sign(
      {
        data: { timestamp }
      },
      secret,
      { expiresIn: '500h' }
    )
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
      console.error(err)
      throw err
    }
  }
}

module.exports = new Auth()
