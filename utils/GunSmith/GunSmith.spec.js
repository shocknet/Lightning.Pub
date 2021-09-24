/**
 * @format
 */
// @ts-check
const Gun = require('./GunSmith')
const words = require('random-words')
const fs = require('fs')
const debounce = require('lodash/debounce')
const expect = require('expect')

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

const user = instance.user()
const alias = words()
const pass = words()

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

/**
 * @param {number} ms
 */
const delay = ms => new Promise(res => setTimeout(res, ms))

describe('gun smith', () => {
  after(() => {
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
      .once(val => {
        expect(val).toBe(true)
        done()
        release()
      })
  })

  it('puts a false and reads it with once()', done => {
    expect.assertions(1)
    const a = words()
    const b = words()

    whenReady().then(() => {
      instance
        .get(a)
        .get(b)
        .put(false, ack => {
          if (ack.err) {
            throw new Error(ack.err)
          } else {
            instance
              .get(a)
              .get(b)
              .once(val => {
                expect(val).toBe(false)
                done()
                release()
              })
          }
        })
    })
  })

  it('puts numbers and reads them with once()', done => {
    expect.hasAssertions()

    const a = words()
    const b = words()

    whenReady().then(() => {
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
  })

  it('puts strings and reads them with once()', done => {
    expect.hasAssertions()
    const a = words()
    const b = words()
    const sentence = words({ exactly: 50 }).join(' ')
    whenReady().then(() => {
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
  })

  it('merges puts', async () => {
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

    const data = await node.then()

    if (typeof data !== 'object' || data === null) {
      throw new Error('Data not an object')
    }
    expect(removeBuiltInGunProps(data)).toEqual(c)

    release()
  })

  it('writes primitive items into sets and correctly assigns the id to ._.get', done => {
    expect.hasAssertions()
    whenReady().then(() => {
      const node = instance.get(words()).get(words())
      const item = node.set('hello')

      node.once(data => {
        expect(removeBuiltInGunProps(data)).toEqual({
          [item._.get]: 'hello'
        })
        done()
        release()
      })
    })
  })

  // TODO: find out why this test fucks up the previous one if it runs before
  // that one
  it('maps over a primitive set', done => {
    expect.assertions(100)
    whenReady().then(() => {
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
  })

  it('maps over an object set', done => {
    expect.assertions(100)
    whenReady().then(() => {
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
  })

  it('offs `on()`s', async () => {
    expect.assertions(1)
    await whenReady()
    const node = instance.get(words()).get(words())

    let called = false

    node.on(() => {
      called = true
    })

    node.off()

    await node.pPut('return')
    await delay(500)
    expect(called).toBe(false)

    release()
  })

  it('offs `map().on()`s', async () => {
    expect.assertions(1)
    await whenReady()
    const node = instance.get(words()).get(words())

    let called = false

    const iterateeNode = node.map()

    iterateeNode.on(() => {
      called = true
    })

    iterateeNode.off()

    await node.pSet('return')

    await delay(500)

    expect(called).toBe(false)

    release()
  })

  it('provides an user node with create(), auth() and leave()', async () => {
    expect.assertions(7)
    await whenReady()

    const ack = await new Promise(res => user.create(alias, pass, res))
    expect(ack.err).toBeUndefined()

    const { pub } = ack
    expect(pub).toBeTruthy()
    expect(user.is?.pub).toEqual(pub)

    user.leave()
    expect(user.is).toBeUndefined()

    /** @type {GunT.AuthAck} */
    const authAck = await new Promise(res =>
      user.auth(alias, pass, ack => res(ack))
    )
    expect(authAck.err).toBeUndefined()
    expect(authAck.sea?.pub).toEqual(pub)
    expect(user.is?.pub).toEqual(pub)
    user.leave()

    release()
  })

  it('reliably provides authentication information across re-forges', async () => {
    expect.assertions(3)
    await whenReady()

    /** @type {GunT.AuthAck} */
    const authAck = await new Promise(res =>
      user.auth(alias, pass, ack => res(ack))
    )
    const pub = authAck.sea?.pub
    expect(pub).toBeTruthy()

    Gun._reforge()
    expect(user.is?.pub).toEqual(pub)
    await Gun._isReady()
    expect(user.is?.pub).toEqual(pub)

    user.leave()
    release()
  })

  it('provides thenables for values', async () => {
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

    release()
  })

  it('provides an special thenable put()', async () => {
    expect.assertions(1)
    await whenReady()

    const a = words()
    const b = words()
    const node = instance.get(a).get(b)
    const value = words()

    await node.pPut(value)

    const res = await node.then()

    expect(res).toBe(value)

    release()
  })

  it('on()s and handles object>primitive>object transitions', done => {
    expect.assertions(3)
    whenReady().then(() => {
      const a = {
        one: 1
      }
      const b = 'two'
      const lastPut = {
        three: 3
      }
      const c = { ...a, ...lastPut }

      const node = instance.get(words()).get(words())

      let checked = 0

      node.on(data => {
        checked++
        if (checked === 1) {
          expect(removeBuiltInGunProps(data)).toEqual(a)
        } else if (checked === 2) {
          expect(data).toEqual(b)
        } else if (checked === 3) {
          expect(removeBuiltInGunProps(data)).toEqual(c)
          done()
          release()
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
  })

  // **************************************************************************
  // ** Long tests below
  // **************************************************************************

  it('writes object items into sets and correctly populates item._.get with the newly created id', done => {
    expect.hasAssertions()
    whenReady().then(() => {
      const node = instance.get(words()).get(words())

      const obj = {
        a: 1,
        b: 'hello'
      }

      const item = node.set(obj)

      node.get(item._.get).once(data => {
        expect(removeBuiltInGunProps(data)).toEqual(obj)
        done()
        release()
      })
    })
  })

  it('provides an special once() that restarts gun until a value is fetched', done => {
    expect.assertions(1)
    whenReady().then(() => {
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
  })

  it('provides an special then() that restarts gun until a value is fetched', async () => {
    expect.assertions(1)
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

    release()
  })

  it('provides an special on() that restarts gun when a value has not been obtained in a determinate amount of time', done => {
    // Kinda crappy test, this should be easier to test in real usage.
    expect.assertions(1)
    whenReady().then(() => {
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
  })
})
