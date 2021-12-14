/**
 * @format
 */
// @ts-check
const Path = require('path')
const Storage = require('node-persist')
const expect = require('expect')

const {
  authorizeDevice,
  decryptMessage,
  encryptMessage,
  generateKeyPair,
  isAuthorizedDevice
} = require('./ECC')

const storageDirectory = Path.resolve(__dirname, `./.test-storage`)

console.log(`Storage directory: ${storageDirectory}`)

describe('generateKeyPair()', () => {
  it('generates a keypair', () => {
    const pair = generateKeyPair('jgjhfhjhjghjghjgkghfkhgfkh')

    expect(pair.privateKey).toBeInstanceOf(Buffer)
    expect(typeof pair.privateKeyBase64 === 'string').toBeTruthy()
    expect(pair.publicKey).toBeInstanceOf(Buffer)
    expect(typeof pair.publicKeyBase64 === 'string').toBeTruthy()
  })
  it('returns the same pair for the same device', () => {
    const id = 'fbuiio3089fhfunjancj,'
    const pair = generateKeyPair(id)
    const pairAgain = generateKeyPair(id)

    expect(pairAgain).toStrictEqual(pair)
  })
})

describe('authorizeDevice()/isAuthorizedDevice()', () => {
  it('authorizes a device given its ID', async () => {
    expect.hasAssertions()
    await Storage.init({
      dir: storageDirectory
    })
    const deviceId = 'ajksjkihjgjhfkjasbdjkabsf'
    const pair = generateKeyPair(deviceId)
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
    const deviceId = 'jfio2fb3h803fabsc018hfuIUFiufh9310u'

    try {
      await encryptMessage({
        message: 'klashdkljaskldjkasjlkdjaslkjd',
        deviceId
      })
      throw new Error('encryptMessage() did not throw')
    } catch (_) {
      expect(true).toBeTruthy()
    }
  })
  it('throws if provided with an unknown device id when decrypting', async () => {
    expect.hasAssertions()
    const deviceId = 'jfio2fb3h803fakujhjkfasbfbsc018hfuIUFiufh9310u'

    try {
      await decryptMessage({
        deviceId,
        encryptedMessage: {
          ciphertext: 'kajjshfkjhaskjdh',
          ephemPublicKey: 'akjshfjkashkjhasf',
          iv: 'lkasjdklahsfkjhasf',
          mac: 'alkshfkjashfkjasf',
          metadata: 'aklshdkjasd'
        }
      })
      throw new Error('decryptMessage() did not throw')
    } catch (_) {
      expect(true).toBeTruthy()
    }
  })
  it('encrypts and decrypts messages when given a known device id', async () => {
    expect.hasAssertions()
    const deviceId = 'jfio2fbnjkabscfjjpifpoijf018hfuIUFiufh9310u'

    const pair = generateKeyPair(deviceId)

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
