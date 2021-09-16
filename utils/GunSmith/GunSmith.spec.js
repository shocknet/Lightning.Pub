/**
 * @format
 */
// @ts-check
/* eslint-disable jest/prefer-strict-equal */
/* eslint-disable jest/no-test-callback */
const Gun = require('./GunSmith')
const words = require('random-words')
const fs = require('fs')

const { removeBuiltInGunProps } = require('./misc')

if (!fs.existsSync('./test-radata')) {
  fs.mkdirSync('./test-radata')
}

/** @type {ReturnType<typeof Gun>} */
// eslint-disable-next-line init-declarations
let instance

describe('constructor', () => {
  // eslint-disable-next-line jest/no-hooks
  beforeEach(() => {
    instance = Gun({
      axe: false,
      multicast: false,
      file: './test-radata/' + words({ exactly: 2 }).join('-')
    })
  })

  // eslint-disable-next-line jest/no-hooks
  afterAll(() => {
    if (instance) {
      instance.reforge()
    }
  })

  it('puts a true and reads it with once()', done => {
    expect.hasAssertions()
    const a = words()
    const b = words()
    instance
      .get(a)
      .get(b)
      .put(true)

    instance
      .get(a)
      .get(b)
      .once(val => {
        expect(val).toStrictEqual(true)
        done()
      })
  })

  it('puts a false and reads it with once()', done => {
    expect.hasAssertions()
    const a = words()
    const b = words()
    instance
      .get(a)
      .get(b)
      .put(false)

    instance
      .get(a)
      .get(b)
      .once(val => {
        expect(val).toBe(false)
        done()
      })
  })

  it('puts numbers and reads them with once()', done => {
    expect.hasAssertions()
    const a = words()
    const b = words()
    instance
      .get(a)
      .get(b)
      .put(5)

    instance
      .get(a)
      .get(b)
      .once(val => {
        expect(val).toBe(5)
        done()
      })
  })

  it('puts strings and reads them with once()', done => {
    expect.hasAssertions()
    const a = words()
    const b = words()
    const sentence = words({ exactly: 50 }).join(' ')

    instance
      .get(a)
      .get(b)
      .put(sentence)

    instance
      .get(a)
      .get(b)
      .once(val => {
        expect(val).toBe(sentence)
        done()
      })
  })

  it('merges puts', done => {
    expect.hasAssertions()
    const a = {
      a: 1
    }
    const b = {
      b: 1
    }
    const c = { ...a, ...b }

    const node = instance.get('foo').get('bar')

    node.put(a)
    node.put(b)

    node.once(data => {
      if (typeof data !== 'object' || data === null) {
        done(new Error('Data not an object'))
        return
      }
      expect(removeBuiltInGunProps(data)).toEqual(c)
      done()
    })
  })

  it('writes primitive items into sets', done => {
    expect.hasAssertions()
    const node = instance.get(words()).get(words())

    const item = node.set('hello')

    node.once(data => {
      if (typeof data !== 'object' || data === null) {
        done(new Error('Data not an object'))
        return
      }

      expect(removeBuiltInGunProps(data)).toEqual({
        [item._.get]: 'hello'
      })
      done()
    })
  })

  it('writes object items into sets', done => {
    expect.hasAssertions()
    const node = instance.get(words()).get(words())

    const obj = {
      a: 1,
      b: 'hello'
    }

    const item = node.set(obj)

    node.get(item._.get).once(data => {
      if (typeof data !== 'object' || data === null) {
        done(new Error('Data not an object'))
        return
      }

      expect(removeBuiltInGunProps(data)).toEqual(obj)
      done()
    })
  })

  it('maps over a primitive set', done => {
    expect.assertions(100)

    const node = instance.get(words()).get(words())

    const items = words({ exactly: 50 })

    const ids = items.map(i => node.set(i)._.get)

    let checked = 0

    node.map().on((data, id) => {
      expect(items).toContain(data)
      expect(ids).toContain(id)
      checked++
      if (checked === 50) {
        done()
      }
    })
  })

  it('maps over an object set', done => {
    expect.assertions(100)

    const node = instance.get(words()).get(words())

    const items = words({ exactly: 50 }).map(w => ({
      word: w
    }))

    const ids = items.map(i => node.set(i)._.get)

    let checked = 0

    node.map().on((data, id) => {
      expect(items).toContainEqual(removeBuiltInGunProps(data))
      expect(ids).toContain(id)
      checked++
      if (checked === 50) {
        done()
      }
    })
  })

  it('offs `on()`s', done => {
    expect.assertions(1)

    const node = instance.get(words()).get(words())

    const fn = jest.fn()

    node.on(fn)

    node.off()

    node.put('return', ack => {
      if (ack.err) {
        done(new Error(ack.err))
      } else {
        expect(fn).not.toHaveBeenCalled()
        done()
      }
    })
  })

  it('offs `map().on()`s', done => {
    expect.assertions(1)

    const node = instance.get(words()).get(words())

    const fn = jest.fn()

    const iterateeNode = node.map()

    iterateeNode.on(fn)

    iterateeNode.off()

    node.set('return', ack => {
      if (ack.err) {
        done(new Error(ack.err))
      } else {
        expect(fn).not.toHaveBeenCalled()
        done()
      }
    })
  })

  it('on()s and handles object>primitive>object transitions', done => {
    expect.assertions(3)

    const a = {
      one: 1
    }
    const b = 'two'
    const c = {
      three: 3
    }
    const d = { ...a, ...c }

    const node = instance.get(words()).get(words())

    let checked = 0

    node.on(data => {
      checked++
      if (checked === 1) {
        expect(removeBuiltInGunProps(data)).toEqual(a)
      } else if (checked === 2) {
        expect(data).toBe(b)
      } else if (checked === 3) {
        expect(removeBuiltInGunProps(data)).toEqual(d)
        done()
      }
    })

    node.put(a)
    setTimeout(() => {
      node.put(b)
    }, 400)
    setTimeout(() => {
      node.put(c)
    }, 800)
  })

  it('provides an user node with create(), auth() and leave()', async done => {
    expect.assertions(6)

    const user = instance.user()
    const alias = words()
    const pass = words()

    const ack = await new Promise(res => user.create(alias, pass, res))
    expect(ack.err).toBeUndefined()

    const { pub } = ack
    expect(user.is?.pub).toEqual(pub)

    user.leave()
    expect(user.is).toBeUndefined()

    const authAck = await new Promise(res =>
      user.auth(alias, pass, ack => res(ack))
    )
    expect(authAck.err).toBeUndefined()
    expect(authAck.sea.pub).toEqual(pub)
    expect(user.is?.pub).toEqual(pub)
    user.leave()
    done()
  })

  it('provides thenables for values', async done => {
    expect.assertions(1)

    const a = words()
    const b = words()
    const node = instance.get(a).get(b)
    const value = words()

    await new Promise((res, rej) => {
      node.put(value, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          // @ts-ignore
          res()
        }
      })
    })

    const fetch = await instance
      .get(a)
      .get(b)
      .then()
    expect(fetch).toEqual(value)
    done()
  })
})
