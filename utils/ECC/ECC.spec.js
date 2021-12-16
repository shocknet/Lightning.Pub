/**
 * @format
 */
// @ts-check
const Path = require('path')
const Storage = require('node-persist')
const expect = require('expect')
const words = require('random-words')

const {
  authorizeDevice,
  decryptMessage,
  encryptMessage,
  generateKeyPair,
  isAuthorizedDevice,
  killECCCryptoSubprocess
} = require('./ECC')

const uuid = () => {
  const arr = /** @type {string[]} */ (words({ exactly: 24 }))
  return arr.join('-')
}

const storageDirectory = Path.resolve(__dirname, `./.test-storage`)

console.log(`Storage directory: ${storageDirectory}`)

describe('ECC', () => {
  describe('generateKeyPair()', () => {
    it('generates a keypair', async () => {
      expect.hasAssertions()
      const pair = await generateKeyPair(uuid())

      expect(pair.privateKey).toBeInstanceOf(Buffer)
      expect(typeof pair.privateKeyBase64 === 'string').toBeTruthy()
      expect(pair.publicKey).toBeInstanceOf(Buffer)
      expect(typeof pair.publicKeyBase64 === 'string').toBeTruthy()
    })
    it('returns the same pair for the same device', async () => {
      expect.hasAssertions()
      const id = uuid()
      const pair = await generateKeyPair(id)
      const pairAgain = await generateKeyPair(id)

      expect(pairAgain).toStrictEqual(pair)
    })
  })

  describe('authorizeDevice()/isAuthorizedDevice()', () => {
    it('authorizes a device given its ID', async () => {
      expect.hasAssertions()
      await Storage.init({
        dir: storageDirectory
      })
      const deviceId = uuid()
      const pair = await generateKeyPair(deviceId)
      await authorizeDevice({ deviceId, publicKey: pair.publicKeyBase64 })
      expect(isAuthorizedDevice({ deviceId })).toBeTruthy()
    })
  })

  describe('encryptMessage()/decryptMessage()', () => {
    before(() =>
      Storage.init({
        dir: storageDirectory
      })
    )
    it('throws if provided with an unauthorized device id when encrypting', async () => {
      expect.hasAssertions()
      const deviceId = uuid()

      try {
        await encryptMessage({
          message: uuid(),
          deviceId
        })
        throw new Error('encryptMessage() did not throw')
      } catch (_) {
        expect(true).toBeTruthy()
      }
    })
    it('throws if provided with an unknown device id when decrypting', async () => {
      expect.hasAssertions()
      const deviceId = uuid()

      try {
        await decryptMessage({
          deviceId,
          encryptedMessage: {
            ciphertext: uuid(),
            ephemPublicKey: uuid(),
            iv: uuid(),
            mac: uuid(),
            metadata: uuid()
          }
        })
        throw new Error('decryptMessage() did not throw')
      } catch (_) {
        expect(true).toBeTruthy()
      }
    })
    it('encrypts and decrypts messages when given a known device id', async () => {
      expect.hasAssertions()
      const deviceId = uuid()

      const pair = await generateKeyPair(deviceId)

      await authorizeDevice({ deviceId, publicKey: pair.publicKeyBase64 })

      const message = 'Bitcoin fixes this'

      const encryptedMessage = await encryptMessage({ deviceId, message })

      const decrypted = await decryptMessage({
        deviceId,
        encryptedMessage
      })

      expect(decrypted).toEqual(message)
    })
  })

  after(killECCCryptoSubprocess)
})
