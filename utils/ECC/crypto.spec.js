/**
 * @format
 */
// @ts-check
const expect = require('expect')

const {
  generateRandomString,
  convertBase64ToBuffer,
  convertBufferToBase64
} = require('./crypto')

describe('generateRandomString()', () => {
  it('creates a random string of the specified length', async () => {
    expect.hasAssertions()
    const base = Math.ceil(Math.random() * 100)
    const len = base % 2 !== 0 ? base + 1 : base
    const result = await generateRandomString(len)

    expect(result.length).toEqual(len)
  })
})

describe('Buffer <> String <> Buffer', () => {
  it('preserves values', async () => {
    const rnd = await generateRandomString(24)

    const asBuffer = convertBase64ToBuffer(rnd)

    const asStringAgain = convertBufferToBase64(asBuffer)

    expect(asStringAgain).toEqual(rnd)
  })
})
