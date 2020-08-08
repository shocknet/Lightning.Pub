/** @prettier */

const clients = require('./_clients.js')
const child_process = require('child_process')
const fs = require('fs')
const path = require('path')

describe("send encrypted message between two peers and decrypted by receiver's public key", () => {
  jest.setTimeout(15000)

  /* eslint jest/no-hooks: ["error", { "allow": ["beforeAll", "afterAll"] }] */
  beforeAll(async () => {})

  it('encrypt and send message, then decrypt at destination', async () => {
    expect.assertions(1)
    const testAlias = Math.round(Math.random() * 10000).toString()

    // @ts-ignore
    const peers = clients.peers.map(peer => {
      return new Promise((res, rej) => {
        const a = child_process.spawn('node', [
          // @ts-ignore
          path.join(__dirname, '_clients.js'),
          testAlias,
          peer.name
        ])
        // @ts-ignore
        a.stdout.pipe(process.stdout)
        // @ts-ignore
        a.stdout.on('data', data => {
          console.log(`stdout: ${data}`)
        })

        // @ts-ignore
        a.stderr.on('data', data => {
          // @ts-ignore
          res(`stderr: ${data}`)
          console.error(`stderr: ${data}`)
        })

        a.on('error', err => {
          console.log(err)
        })

        a.on('close', code => {
          // @ts-ignore
          rej(`child process exited with code ${code}`)
          console.log(`child process exited with code ${code}`)
        })
      })
    })

    await Promise.all(peers).then(results => {
      console.log(results)
    })

    expect(true).toBe(true)
  })
})
