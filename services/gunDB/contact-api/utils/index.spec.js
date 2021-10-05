/**
 * @format
 */
const expect = require('expect')

const { gunID } = require('./index')

describe('gunID()', () => {
  it('generates 24-chars-long unique IDs', () => {
    const id = gunID()
    expect(id).toBeTruthy()
    expect(id.length).toBe(24)
  })
})
