// @ts-check
const Gun = require("./gun/gun");
require("gun/lib/load");
require("gun/lib/then");
const Stream = require('stream')
const winston = require('winston')

const Utils = require("./utils/utils");

const tests = {
  ...require('./functional'),
  ...require('./unit')
}

/** @typedef {{
 * Assertor: winston.Logger
 * Reinstantiate: boolean
 * State: { Pass: number, Fail: number}
 * Nodes: [{ Name: string, Pub: string}]?
 * }} Handler 
*/
/** @type {Handler} handler */
const handler = {
  Assertor: winston.createLogger({
    levels: winston.config.syslog.levels,
    transports: new winston.transports.Stream({
        stream: new Stream.Writable({
          objectMode: true,
          write: (log, encoding, callback) => {
            Utils.LogWriter(log, handler)
            callback();
          },
          })
      })
  }),
  Reinstantiate: true,
  State: {
    Pass: 0,
    Fail: 0,
  },
  Nodes: null,
};

(async () => {
  for await (const test of Object.keys(tests)) {
    await tests[test](handler)
  }
  handler.Assertor.info({done: true})
  // eslint-disable-next-line no-process-exit
  process.exit(0)
})();

/** @param {Handler} handler */
// const app3 = async (handler) => {
//   let trio = await Gun.freshGun();
//   if (handler.Reinstantiate) {
//     trio = await Gun.freshGun();
//   }
//   const { gun, user, pub } = trio;
//   console.log("will listen");
//   const otherUser = gun.get(
//     `~mopNp2pvlUlF4h6qYZeHakXZEClncZoGafagwFWWs5k.m4kuKtefD6R2W0IfdGev9Zk2L7OltgM4kL39a7roPUk`
//   );
//   const name = await Utils.tryAndWait(
//     () => otherUser.get("Profile").get("displayName").then(),
//     (v) => typeof v !== "string"
//   );

//   console.log(`name: ${name}`);
// };

