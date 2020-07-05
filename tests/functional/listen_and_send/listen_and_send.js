// @ts-check
const Gun = require("../../gun/gun");
require("gun/lib/load");
require("gun/lib/then");
const Utils = require("../../utils/utils");

/** @type {import('../../index').Handler} */
let Handler = null;

/**
 * Test helper to add a node called Alice to the graph
 * @param {import('../../index').Handler} handler
 */
const addAliceToGraph = async (handler) => {
  let trio = await Gun.freshGun();

  if (handler.Reinstantiate) {
    trio = await Gun.freshGun();
  }

  const { user, pub } = trio;

  handler.Assertor.info({message: `[PUB]: ${pub}`});

  handler.Assertor.info({message:`Alice is writing her name to her user graph`});

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("alice", (ack) => {
      if (ack.err) {
        rej(new Error(`Error putting alices name: ${ack.err}`));
      } else {
        if (handler.Nodes !== null) {
          handler.Nodes.push({Name: "Alice", Pub: pub})
        } else {
          handler.Nodes =  [{Name: "Alice", Pub: pub}]
        }
        res();
      }
    });
  });

  handler.Assertor.info(
    {message:`Alice is listening to her public mailbox for bobs message (he will send his pub)`}
  );

  return trio
}

/**
 * Test helper to initialize a listener for Bob (2nd Node)
 */
const onBobsPub = async (bobsPub) => {
  try {
    Handler.Assertor.info({message: `Alice received bob's pub from bob: ${bobsPub}`});
    Handler.Assertor.info(
      {message:`Alice is now trying to fetch bobs name and will retry and even re-instantiate gun if bobs name is not an string`}
    );

    const bobsName = await Utils.tryAndWait(
      (gun) =>
        new Promise((res) => gun.get(`~${bobsPub}`).get("name").once(res)),
      // retry if bobs name is not an string
      (v) => typeof v !== "string"
    );

    Handler.Assertor.info({message: `Alice found bobs name to be: ${bobsName}`});
    Handler.Assertor.info(
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
            Handler.Assertor.info(ack);
            res();
          }
        });
    });
  } catch (e) {
    Handler.Assertor.error({message: `Unexpected error:\n${e}`});
  }
};

/**
 * Test helper to add a node called Bob to the graph (2nd)
 * @param {import('../../index').Handler} handler
 */
const sendFromBobToAlice = async (handler) => {
  let trio = await Gun.freshGun();

  if (handler.Reinstantiate) {
    trio = await Gun.freshGun();
  }

  const { gun, user, pub } = trio;

  handler.Assertor.info(`\n PUB: \n`);
  handler.Assertor.info(pub);
  handler.Assertor.info(`\n`);

  handler.Assertor.info(`\nBob is writing his name to her user graph`);

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("bob", (ack) => {
      if (ack.err) {
        rej(new Error(`Error putting bobs name: ${ack.err}`));
      } else {
        if (handler.Nodes !== null) {
          handler.Nodes.push({Name: "Bob", Pub: pub})
        } else {
          handler.Nodes =  [{Name: "Bob", Pub: pub}]
        }
        res();
      }
    });
  });

  const ALICES_PUB = handler.Nodes.find(({Name}) => (Name === "Alice")).Pub

  handler.Assertor.info(`\nalices pub:`);
  handler.Assertor.info(`\n${JSON.stringify(handler.Nodes.find(({Name}) => (Name === "Alice")))}`);

  handler.Assertor.info(`\n${ALICES_PUB}`);

  handler.Assertor.info(`\n`);

  const alice = gun.get(`~${ALICES_PUB}`);

  handler.Assertor.info(`\nBob will try to read alice's name`);

  const alicesName = await Utils.tryAndWait(
    () => alice.get("name").then(),
    (v) => typeof v !== "string"
  );

  handler.Assertor.info(`\n alice's name is: ${alicesName}`);

  handler.Assertor.info(
    `\nBob is placing a listener in alice.acks.bobsPub to listen for ack`
  );

  alice
    .get("acks")
    .get(pub)
    .on((data) => {
      handler.Assertor.info(`\nBob got alice's ack: ${data}`);
    });
  
  handler.Assertor.info(`\nBob is placing a message to alice containing his pub`);
  
  await new Promise((res, rej) => {
      gun
        .get("publicmailbox")
        .get(handler.Nodes.find(({Name}) => (Name === "Alice")).Pub)
        .put(pub, (ack) => {
          if (ack.err) {
            rej((new Error(ack.err.message)));
          } else {
            res();
          }
        });
    });
}

/**
 * @param {import('../../index').Handler} handler
 */
const ListenAndSend = async (handler) => {
  Handler = handler
  handler.Assertor.info({message:"[Test]: Add a node called Alice to the Gun graph"});

  const {gun,user,pub} = await addAliceToGraph(handler)

  gun.get("publicmailbox").get(pub).on(onBobsPub);

  try {
    await sendFromBobToAlice(handler);
    handler.Assertor.notice('Sent a message from Bob to Alice and they both returned ack')
  } catch (error) {
    handler.Assertor.error("Unexpected failure: ", error)
  }
}

module.exports = ListenAndSend