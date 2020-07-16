// @ts-check
const Gun = require("../../gun/gun");
require("gun/lib/load");
require("gun/lib/then");

const GunSEA = require('gun/sea');


describe('tests SEA pair, encrypt and decrypt', () => {
  it('encrypts and decrypts an message using a single pair', async () => {
    expect.hasAssertions()
    const TEXT = 'hello world'
    const {gun, user, pub} = await Gun.freshGun()
  
    const pair = await GunSEA.pair(
      (pair) => {return pair})
  
    const enc = await GunSEA.encrypt(TEXT, pair);
  
    expect(await GunSEA.decrypt(enc, pair)).toBe(TEXT)
  })
})