/**
 * @format
 */
// @ts-check
/* eslint-disable jest/prefer-strict-equal */
/* eslint-disable jest/no-test-callback */
const Gun = require('./GunSmith')
const words = require('random-words')
const fs = require('fs')
const debounce = require('lodash/debounce')

const logger = require('../../config/log')

const { removeBuiltInGunProps } = require('./misc')

if (!fs.existsSync('./test-radata')) {
  fs.mkdirSync('./test-radata')
}

// start with true, have first test doesn't check, else all other test start to
// run right away
let isBusy = true

const instance = Gun({
  axe: false,
  multicast: false,
  file: './test-radata/' + words({ exactly: 2 }).join('-')
})

const release = () => {
  isBusy = false
}

/**
 * @returns {Promise<void>}
 */
const whenReady = () =>
  new Promise(res => {
    setTimeout(() => {
      if (isBusy) {
        whenReady().then(res)
      } else {
        isBusy = true
        res()
      }
    }, 1000)
  })

describe('gun smith', () => {
  // eslint-disable-next-line jest/no-hooks
  afterAll(() => {
    Gun.kill()
  })

  it('puts a true and reads it with once()', done => {
    expect.assertions(1)
    // await whenReady()
    logger.info('puts a true and reads it with once()')
    const a = words()
    const b = words()

    instance
      .get(a)
      .get(b)
      .put(true)

    instance
      .get(a)
      .get(b)
      .once(
        val => {
          expect(val).toBe(true)
          done()
          release()
        },
        { wait: 1000 }
      )
  })

  it('puts a false and reads it with once()', async done => {
    expect.assertions(1)
    await whenReady()
    logger.info('puts a false and reads it with once()')
    const a = words()
    const b = words()

    await new Promise((res, rej) => {
      instance
        .get(a)
        .get(b)
        .put(false, ack => {
          if (ack.err) {
            rej(new Error(ack.err))
          } else {
            // @ts-ignore
            res()
          }
        })
    })

    instance
      .get(a)
      .get(b)
      .once(
        val => {
          expect(val).toBe(false)
          done()
          release()
        },
        { wait: 1000 }
      )
  })

  it('puts numbers and reads them with once()', async done => {
    expect.hasAssertions()
    await whenReady()
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
        release()
      })
  })

  it('puts strings and reads them with once()', async done => {
    expect.hasAssertions()
    await whenReady()
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
        release()
      })
  })

  it('merges puts', async done => {
    expect.hasAssertions()
    await whenReady()
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
        release()
        return
      }
      expect(removeBuiltInGunProps(data)).toEqual(c)
      done()
      release()
    })
  })

  it('writes primitive items into sets', async done => {
    expect.hasAssertions()
    await whenReady()
    const node = instance.get(words()).get(words())

    const item = node.set('hello')

    node.once(data => {
      if (typeof data !== 'object' || data === null) {
        done(new Error('Data not an object'))
        release()
        return
      }

      expect(removeBuiltInGunProps(data)).toEqual({
        [item._.get]: 'hello'
      })
      done()
      release()
    })
  })

  it('writes object items into sets', async done => {
    expect.hasAssertions()
    await whenReady()
    const node = instance.get(words()).get(words())

    const obj = {
      a: 1,
      b: 'hello'
    }

    const item = node.set(obj)

    node.get(item._.get).once(data => {
      if (typeof data !== 'object' || data === null) {
        done(new Error('Data not an object'))
        release()
        return
      }

      expect(removeBuiltInGunProps(data)).toEqual(obj)
      done()
      release()
    })
  })

  it('provides an special once() that restarts gun until a value is fetched', async done => {
    expect.assertions(1)
    jest.setTimeout(100000)
    await whenReady()

    const a = words()
    const b = words()
    const node = instance.get(a).get(b)
    const value = words()

    node.specialOnce(data => {
      expect(data).toEqual(value)

      done()
      release()
    })

    setTimeout(() => {
      node.put(value)
    }, 30000)
  })

  it('provides an special then() that restarts gun until a value is fetched', async done => {
    expect.assertions(1)
    jest.setTimeout(100000)
    await whenReady()

    const a = words()
    const b = words()
    const node = instance.get(a).get(b)
    const value = words()

    setTimeout(() => {
      node.put(value)
    }, 30000)

    const res = await node.specialThen()

    expect(res).toBe(value)
    done()
    release()
  })

  it('provides an special on() that restarts gun when a value has not been obtained in a determinate amount of time', async done => {
    // Kinda crappy test, this should be easier to test in real usage.
    expect.assertions(1)
    await whenReady()
    jest.setTimeout(40000)

    const initialProcCounter = Gun._getProcCounter()

    const node = instance.get(words()).get(words())

    const secondValue = words()

    node.specialOn(
      debounce(data => {
        if (data === secondValue) {
          expect(Gun._getProcCounter()).toEqual(initialProcCounter + 1)
          done()
          release()
        }
      })
    )

    setTimeout(() => {
      node.put(secondValue)
    }, 32000)
  })

  // TODO: find out why this test fucks up the previous one if it runs before
  // that one
  it('maps over a primitive set', async done => {
    expect.assertions(100)
    await whenReady()

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
        release()
      }
    })
  })

  it('maps over an object set', async done => {
    expect.assertions(100)
    await whenReady()
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
        release()
      }
    })
  })

  it('offs `on()`s', async done => {
    expect.assertions(1)
    await whenReady()
    const node = instance.get(words()).get(words())

    const fn = jest.fn()

    node.on(fn)

    node.off()

    node.put('return', ack => {
      if (ack.err) {
        done(new Error(ack.err))
        release()
      } else {
        expect(fn).not.toHaveBeenCalled()
        done()
        release()
      }
    })
  })

  it('offs `map().on()`s', async done => {
    expect.assertions(1)
    await whenReady()
    const node = instance.get(words()).get(words())

    const fn = jest.fn()

    const iterateeNode = node.map()

    iterateeNode.on(fn)

    iterateeNode.off()

    node.set('return', ack => {
      if (ack.err) {
        done(new Error(ack.err))
        release()
      } else {
        expect(fn).not.toHaveBeenCalled()
        done()
        release()
      }
    })
  })

  // eslint-disable-next-line jest/no-commented-out-tests
  // it('on()s and handles object>primitive>object transitions', async done => {
  //   expect.assertions(3)
  //   await whenReady()

  //   const a = {
  //     one: 1
  //   }
  //   const b = 'two'
  //   const c = {
  //     three: 3
  //   }
  //   const d = { ...a, ...c }
  //
  //   const node = instance.get(words()).get(words())
  //
  //   let checked = 0
  //
  //   node.on(data => logger.info(data))
  //
  //   node.on(data => {
  //     logger.info(data)
  //   })
  //
  //   node.put(a)
  //   setTimeout(() => {
  //     node.put(b)
  //   }, 400)
  //   setTimeout(() => {
  //     node.put(c)
  //   }, 800)
  // })

  describe('authentication', () => {
    const user = instance.user()
    const alias = words()
    const pass = words()

    it('provides an user node with create(), auth() and leave()', async done => {
      expect.assertions(6)
      await whenReady()

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
      release()
    })
  })

  it('provides thenables for values', async done => {
    expect.assertions(1)
    await whenReady()

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
    release()
  })

  it('provides an special thenable put()', async done => {
    expect.assertions(1)
    await whenReady()

    const a = words()
    const b = words()
    const node = instance.get(a).get(b)
    const value = words()

    await node.pPut(value)

    const res = await node.then()

    expect(res).toBe(value)
    done()
    release()
  })
})
