// @ts-check
const Gun = require("./gun/gun");
require("gun/lib/load");
require("gun/lib/then");
const Stream = require('stream')
const winston = require('winston')
const Utils = require("./utils/utils");


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
}

const onBobsPub = async (bobsPub) => {
  try {
    handler.Assertor.info({message: `Alice received bob's pub from bob: ${bobsPub}`});
    handler.Assertor.info(
      {message:`Alice is now trying to fetch bobs name and will retry and even re-instantiate gun if bobs name is not an string`}
    );

    const bobsName = await Utils.tryAndWait(
      (gun) =>
        new Promise((res) => gun.get(`~${bobsPub}`).get("name").once(res)),
      // retry if bobs name is not an string
      (v) => typeof v !== "string"
    );

    handler.Assertor.info({message: `Alice found bobs name to be: ${bobsName}`});
    handler.Assertor.info(
      {message: `Alice will now place an ack on her usergraph telling bob she found her name`}
    );

    await new Promise((res, rej) => {
      Gun.getUser()
        .get("acks")
        .get(bobsPub)
        .put("OK", (ack) => {
          if (ack.err) {
            rej(new Error());
          } else {
            console.log(ack);
            res();
          }
        });
    });
  } catch (e) {
    handler.Assertor.error({message: `Unexpected error:\n${e}`});
  }
};

/** @param {Handler} handler */
const app1 = async (handler) => {
  handler.Assertor.info({message:"app1(Alice)"});
  handler.Assertor.log('notice', {success: true, message: `Successfully checked Bob's pub listener`})

  let trio = await Gun.freshGun();

  if (handler.Reinstantiate) {
    trio = await Gun.freshGun();
  }

  const { gun, user, pub } = trio;

  handler.Assertor.info({message: `[PUB]: ${pub}`});

  handler.Assertor.info({message:`Alice is writing her name to her user graph`});

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("alice", (ack) => {
      if (ack.err) {
        rej(new Error(`Error putting alices name: ${ack.err}`));
      } else {
        res();
      }
    });
  });

  handler.Assertor.info(
    {message:`Alice is listening to her public mailbox for bobs message (he will send his pub)`}
  );

  gun.get("publicmailbox").get(pub).on(onBobsPub);
};

/** @param {Handler} handler */
const app2 = async (handler) => {

  console.log("app2 (bob)");

  let trio = await Gun.freshGun();

  if (handler.Reinstantiate) {
    trio = await Gun.freshGun();
  }

  const { gun, user, pub } = trio;

  console.log(`\n PUB: \n`);
  console.log(pub);
  console.log(`\n`);

  console.log(`\nBob is writing his name to her user graph`);

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("bob", (ack) => {
      if (ack.err) {
        rej(new Error(`Error putting bobs name: ${ack.err}`));
      } else {
        res();
      }
    });
  });

  const {ALICES_PUB} = process.env;

  console.log(`\nalices pub:`);

  console.log(`\n${ALICES_PUB}`);

  console.log(`\n`);

  const alice = gun.get(`~${ALICES_PUB}`);

  console.log(`\nBob will try to read alice's name`);

  const alicesName = await Utils.tryAndWait(
    () => alice.get("name").then(),
    (v) => typeof v !== "string"
  );

  console.log(`\n alice's name is: ${alicesName}`);

  console.log(
    `\nBob is placing a listener in alice.acks.bobsPub to listen for ack`
  );

  alice
    .get("acks")
    .get(pub)
    .on((data) => {
      console.log(`\nBob got alice's ack: ${data}`);
    });

  console.log(`\nBob is placing a message to alice containing his pub`);

  await new Promise((res, rej) => {
    gun
      .get("publicmailbox")
      .get(ALICES_PUB)
      .put(pub, (ack) => {
        if (ack.err) {
          rej((new Error(ack.err.message)));
        } else {
          res();
        }
      });
  });
};

/** @param {Handler} handler */
const app3 = async (handler) => {
  let trio = await Gun.freshGun();
  if (handler.Reinstantiate) {
    trio = await Gun.freshGun();
  }
  const { gun, user, pub } = trio;
  console.log("will listen");
  const otherUser = gun.get(
    `~mopNp2pvlUlF4h6qYZeHakXZEClncZoGafagwFWWs5k.m4kuKtefD6R2W0IfdGev9Zk2L7OltgM4kL39a7roPUk`
  );
  const name = await Utils.tryAndWait(
    () => otherUser.get("Profile").get("displayName").then(),
    (v) => typeof v !== "string"
  );

  console.log(`name: ${name}`);
};

// app1(handler);
// app2(handler);
// app3();