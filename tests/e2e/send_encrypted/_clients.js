/** @prettier */
const Gun = require('gun')
require('gun/lib/store')
require('gun/lib/load')
require('gun/lib/then')
require('gun/sea')
const Utils = require('../../utils/utils')
const GunSEA = require('gun/sea')

// eslint-disable-next-line prefer-destructuring
const TEST_CASE = process.argv[2]

// Alice is a node in gun's graph that registers their name
// and starts listening on the "messages" graph for a message
// from the second node aka "Bob"
const Alice = async () => {
  const ALIAS_AND_PASS = `${TEST_CASE}-${Alice.name}`
  console.log(ALIAS_AND_PASS)
  const gun = new Gun({
    axe: false
  })

  const user = gun.user()
  const pair = user.pair()

  const pub = await Utils.addUserToGun(user, ALIAS_AND_PASS, ALIAS_AND_PASS)

  console.log({ message: `(Alice) [PUB]: ${pub}` })

  console.log({ message: `Alice is listening for messages` })

  await gun.get('messages').on(async data => {
    if (data.msg) {
      gun.back()
      const bob = await gun.get(`~@${TEST_CASE}-Bob`).then()
      const epub = await gun
        .user(Object.keys(bob)[1].slice(1))
        .get('epub')
        .then()

      if (typeof epub !== 'string') {
        throw new TypeError(
          `Expected gun.user(pub).get(epub) to be an string. Instead got: ${typeof epub}`
        )
      }

      const dec = await GunSEA.decrypt(
        data.msg,
        await GunSEA.secret(epub, pair)
      )
    }
    console.log(`Got a message: ${JSON.stringify(data)}`)
  })
}

const Bob = async () => {
  const ALIAS_AND_PASS = `${TEST_CASE}-Bob`

  const gun = new Gun({
    axe: false
  })

  const user = gun.user()

  const pub = await Utils.addUserToGun(user, ALIAS_AND_PASS, ALIAS_AND_PASS)

  console.log({ message: `(Bob) [PUB]: ${pub}` })

  console.log({ message: `Bob is writing her name to her user graph` })

  await gun.get(`~@${TEST_CASE}-${Alice.name}`).once(async data => {
    const pair = user.pair()

    const epub = await gun
      .user(Object.keys(data)[1].slice(1))
      .get('epub')
      .then()

    if (typeof epub !== 'string') {
      throw new TypeError(
        `Expected gun.user(pub).get(epub) to be an string. Instead got: ${typeof epub}`
      )
    }

    console.log(await GunSEA.secret(epub, pair))
    const msg = await Gun.SEA.encrypt(
      'shared data',
      await GunSEA.secret(epub, pair)
    )
    // @ts-ignore
    gun.get('messages').put({ msg }, ack => {
      console.log(ack)
    })
  })
}

;(async () => {
  switch (process.argv[3]) {
    case Alice.name:
      await Alice()
      break
    case Bob.name:
      await Bob()
      break

    default:
      console.log('nothing')
      break
  }
})()

module.exports = {
  peers: [Alice]
}
