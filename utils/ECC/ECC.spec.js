/**
 * @format
 */
const expect = require('expect')

const { generateKeyPair } = require('./ECC')

describe('generateKeyPair()', () => {
  it('generates a keypair', () => {
    const pair = generateKeyPair()

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
