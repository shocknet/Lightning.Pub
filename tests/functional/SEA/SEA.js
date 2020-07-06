// @ts-check
const Gun = require("../../gun/gun");
require("gun/lib/load");
require("gun/lib/then");
const GunSEA = require('gun/sea');
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
const onBobMSG = async (msg) => {
  try {
    Handler.Assertor.info({message: `Alice received bob's encrypted message: ${msg}`});
    Handler.Assertor.info(
      {message:`Alice is now trying to decrypt the message using her key`}
    );

    const dec = await GunSEA.decrypt(
      msg,
      await GunSEA.secret(
        await Utils.pubToEpub(Handler.Nodes.find(({Name}) => (Name === "Bob")).Pub), Gun.getUser().pair()
      )
    )
    Handler.Assertor.error({message: dec});
  } catch (e) {
    Handler.Assertor.error({message: `Unexpected error:\n${e}`});
  }
};

/**
 * @param {import('../../index').Handler} handler
 */
const SEA = async (handler) => {
  handler.Assertor.info({message:"[Test]: Send an encrypted message to a node"});

  Handler = handler

  const {gun,user,pub} = await addAliceToGraph(handler)

  gun.get("messages").get(pub).on(onBobMSG);

  const pair = await GunSEA.pair();

  // Encrypt the message using Alice's pub and Bob's key pair
  const enc = await GunSEA.encrypt('shared data', await GunSEA.secret(await Utils.pubToEpub(pub), pair));

  handler.Nodes.push({Name: "Bob", Pub: pair.pub})

  await new Promise((res, rej) => {
    gun.get("messages").get(pub).put(enc, (ack) => {
      if (ack.err) {
        handler.Assertor.error({message: `Unexpected error while adding the message to graph: ${ack.err.message}`})
        rej((new Error(ack.err.message)));
      } else {
        handler.Assertor.notice({message: "Encrypted, sent and decrypted a message between two nodes"})
        res(ack);
      }
    })
  })
  

}

module.exports = SEA