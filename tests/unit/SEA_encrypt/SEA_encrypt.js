// @ts-check
const Gun = require("../../gun/gun");
require("gun/lib/load");
require("gun/lib/then");
const GunSEA = require('gun/sea');

const Utils = require("../../utils/utils");

/**
 * @param {import('../../index').Handler} handler
 */
const SEAEncrypt = async (handler) => {
  handler.Assertor.info({message:"[Test]: Encrypt and decrypt a message using a single pair"});

  const TEXT = 'hello world'
  const {gun, user, pub} = await Gun.freshGun()

  const pair = await GunSEA.pair(
    (pair) => {return pair})

  const enc = await GunSEA.encrypt(TEXT, pair);

  if (await GunSEA.decrypt(enc, pair) !== TEXT) {
    throw handler.Assertor.error({message: 'Decrypted version does not match original string'})
  }

  handler.Assertor.notice({message: 'Encrypted and decrypted a string'})
}

module.exports = SEAEncrypt