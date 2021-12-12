/**
 * @format
 */
// @ts-check
const expect = require('expect')

const { generateRandomString } = require('./crypto')

describe('generateRandomString()', () => {
  it('creates a random string of the specified length', async () => {
    expect.hasAssertions()
    const len = Math.ceil(Math.random() * 100)
    const result = await generateRandomString(len)

    expect(result.length).toEqual(len)
  })
})
