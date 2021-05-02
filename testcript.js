/**
 * @format
 */
// @ts-check
const Gun = require('gun')

require('gun/nts')
require('gun/lib/open')
require('gun/lib/load')

const args = process.argv.slice(2)

const [fileName, alias, pass, method, path] = args

// @ts-expect-error
const gun = /** @type {import('./services/gunDB/contact-api/SimpleGUN').GUNNode} */ (Gun(
  {
    axe: false,
    multicast: false,
    peers: ['https://gun.shock.network:8765/gun'],
    file: `TESTCRIPT-RADATA/${fileName}`
  }
))

const user = gun.user()

/**
 * @param {any} data
 * @param {string} key
 */
const cb = (data, key) => {
  console.log('\n')
  console.log(`key: ${key}`)
  console.log('\n')
  console.log(data)
  console.log('\n')
}

;(async () => {
  try {
    console.log(`Alias: ${alias}`)
    console.log(`Pass: ${pass}`)
    console.log('\n')

    // gun
    //   .get('handshakeNodes')
    //   .map()
    //   .once(cb)

    // wait for user data to be received
    // await new Promise(res => setTimeout(res, 10000))

    const ack = await new Promise(res => {
      user.auth(alias, pass, _ack => {
        res(_ack)
      })
    })

    if (typeof ack.err === 'string') {
      throw new Error(ack.err)
    } else if (typeof ack.sea === 'object') {
      // clock skew
      await new Promise(res => setTimeout(res, 2000))
    } else {
      throw new Error('Unknown error.')
    }

    const [root, ...keys] = path.split('.')

    let node = (() => {
      if (root === 'gun') {
        return gun
      }
      if (root === 'user') {
        return user
      }
      return gun.user(root)
    })()

    keys.forEach(key => (node = node.get(key)))

    if (method === 'once') node.once(cb)
    if (method === 'load') node.load(cb)
    if (method === 'on') node.on(cb)
    if (method === 'map.once') node.map().once(cb)
    if (method === 'map.on') node.map().on(cb)
  } catch (e) {
    console.log(`\nCaught error in app:\n`)
    console.log(e)
  }
})()
