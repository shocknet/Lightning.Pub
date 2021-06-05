/**
 * @format
 * Example usage:
 * ```bash
 * node testcript.js on [user|gun|capdog|{publicKey}].[path] [alias] [pass]
 * ```
 * If no alias/pass provided, new user will be created, otherwise gun will
 * authenticate with the provided credentials.
 */
// @ts-check
const Gun = require('gun')
const randomWords = require('random-words')

/** @returns {string} */
const randomWord = () => {
  const word = randomWords()
  if (typeof word !== 'string') {
    throw new TypeError(`Not string`)
  }
  return word
}

require('gun/nts')
require('gun/lib/open')
require('gun/lib/load')

const args = process.argv.slice(2)

// eslint-disable-next-line prefer-const
let [method, path, alias, pass] = args

const fileName = randomWord()

if (!alias) {
  alias = '$$__GENERATE'
}

if (!pass) {
  pass = '$$__GENERATE'
}

console.log('\n')
console.log(`method: ${method}`)
console.log(`path: ${path}`)
console.log(`fileName: ${fileName}`)
console.log('\n')

// @ts-expect-error
const gun = /** @type {import('./services/gunDB/contact-api/SimpleGUN').GUNNode} */ (Gun(
  {
    axe: false,
    multicast: false,
    peers: ['https://gun.shock.network/gun', 'https://gun-eu.shock.network'],
    file: `TESTSCRIPT-RADATA/${fileName}`
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
    // gun
    //   .get('handshakeNodes')
    //   .map()
    //   .once(cb)

    // wait for user data to be received
    // await new Promise(res => setTimeout(res, 10000))

    const ack = await new Promise(res => {
      if (alias === '$$__GENERATE' || pass === '$$__GENERATE') {
        alias = randomWord()
        pass = randomWord()
        console.log(`alias: ${alias}`)
        console.log(`pass: ${pass}`)

        user.create(alias, pass, _ack => {
          res(_ack)
        })
      } else {
        user.auth(alias, pass, _ack => {
          res(_ack)
        })
      }
    })

    if (typeof ack.err === 'string') {
      throw new Error(ack.err)
    } else if (typeof ack.pub === 'string' || typeof user._.sea === 'object') {
      console.log(`\n`)
      console.log(`public key:`)
      console.log(`\n`)
      console.log(ack.pub || user._.sea.pub)
      console.log(`\n`)

      // clock skew
      await new Promise(res => setTimeout(res, 2000))
    } else {
      throw new Error('unknown error, ack: ' + JSON.stringify(ack))
    }

    const [root, ...keys] = path.split('.')

    let node = (() => {
      if (root === 'gun') {
        return gun
      }
      if (root === 'user') {
        return user
      }
      if (root === 'capdog') {
        return gun.user(
          'qsgziGQS99sPUxV1CRwwRckn9cG6cJ3prbDsrbL7qko.oRbCaVKwJFQURWrS1pFhkfAzrkEvkQgBRIUz9uoWtrg'
        )
      }
      if (root === 'explorador') {
        return gun.user(
          `zBQkPb1ohbdjVp_29TKFXyv_0g3amKgRJRqKr0E-Oyk.yB1P4UmOrzkGuPEL5zUgLETJWyYpM9K3l2ycNlt8jiY`
        )
      }
      if (root === 'pleb') {
        return gun.user(
          `e1C60yZ1Cm3Mkceq7L9SmH6QQ7zsDdbibPFeQz7tNsk._1VlqJNo8BIJmzz2D5WELiMiRjBh3DBlDvzC6fNltZw`
        )
      }
      if (root === 'boblazar') {
        return gun.user(
          `g6fcZ_1zyFwV1jR1eNK1GTUr2sSlEDL1D5vBsSvKoKg.2OA9MQHO2c1wjv6L-VPBFf36EZXjgQ1nnZFbOE9_5-o`
        )
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
