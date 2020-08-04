/**
 * @format
 */

const { asyncFilter } = require('./helpers')

const numbers = [1, 2, 3, 4]
const odds = [1, 3]
const evens = [2, 4]

describe('asyncFilter()', () => {
  it('returns an empty array when given one', async () => {
    expect.hasAssertions()
    const result = await asyncFilter([], () => true)

    expect(result).toStrictEqual([])
  })

  it('rejects', async () => {
    expect.hasAssertions()

    const result = await asyncFilter(numbers, () => false)

    expect(result).toStrictEqual([])
  })

  it('rejects via calling with the correct value', async () => {
    expect.hasAssertions()

    const result = await asyncFilter(numbers, v => v % 2 !== 0)

    expect(result).toStrictEqual(odds)
  })

  it('filters via calling with the correct value', async () => {
    expect.hasAssertions()

    const result = await asyncFilter(numbers, v => v % 2 === 0)

    expect(result).toStrictEqual(evens)
  })

  it('handles promises', async () => {
    expect.hasAssertions()

    const result = await asyncFilter(numbers, v => Promise.resolve(v % 2 === 0))
    expect(result).toStrictEqual(evens)
  })
})
