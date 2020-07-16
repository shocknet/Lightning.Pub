// @ts-check
const Gun = require("../../gun/gun");
require("gun/lib/load");
require("gun/lib/then");

const GunSEA = require('gun/sea');

const Utils = require("../../utils/utils");
const Config = require("../../config/config");

/** @type [{ Name: string, Pub: string}] */
let Nodes = null;

/**
 * Test helper to add a node called Alice to the graph
 */
const addAliceToGraph = async () => {
  let trio = await Gun.freshGun();

  if (Config.Reinstantiate) {
    trio = await Gun.freshGun();
  }

  const { user, pub } = trio;

  console.log({message: `[PUB]: ${pub}`});

  console.log({message:`Alice is writing her name to her user graph`});

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("alice", (ack) => {
      if (ack.err) {
        rej(new Error(`Error putting alices name: ${ack.err}`));
      } else {
        if (Nodes !== null) {
          Nodes.push({Name: "Alice", Pub: pub})
        } else {
          Nodes =  [{Name: "Alice", Pub: pub}]
        }
        res();
      }
    });
  });

  console.log(
    {message:`Alice is listening to her public mailbox for bobs message (he will send his pub)`}
  );

  return trio
}

/**
 * Test helper to initialize a listener for Bob (2nd Node)
 */
const onBobMSG = async (msg) => {
  try {
    console.log({message: `Alice received bob's encrypted message: ${msg}`});
    console.log(
      {message:`Alice is now trying to decrypt the message using her key`}
    );

    const dec = await GunSEA.decrypt(
      msg,
      await GunSEA.secret(
        await Utils.pubToEpub(Nodes.find(({Name}) => (Name === "Bob")).Pub), Gun.getUser().pair()
      )
    )
    console.error({message: dec});
  } catch (e) {
    console.error({message: `Unexpected error:\n${e}`});
  }
};

describe('test SEA pair, encrypt, and secret', () => {
  it('sends an encrypted message to a node', async () => {
    expect.hasAssertions()
    console.log({message:"[Test]: "});
  
    const {gun,user,pub} = await addAliceToGraph()
  
    gun.get("messages").get(pub).on(onBobMSG);
  
    const pair = await GunSEA.pair();
  
    // Encrypt the message using Alice's pub and Bob's key pair
    const enc = await GunSEA.encrypt('shared data', await GunSEA.secret(await Utils.pubToEpub(pub), pair));
  
    Nodes.push({Name: "Bob", Pub: pair.pub})
  
    const ack = await new Promise((res, rej) => {
      // @ts-ignore
      gun.get("messages").get(pub).put(enc, (ack) => {
        if (ack.err) {
          console.error({message: `Unexpected error while adding the message to graph: ${ack.err.message}`})
          rej((new Error(ack.err.message)));
        } else {
          console.log({message: "Encrypted, sent and decrypted a message between two nodes"})
          res(ack);
        }
      })
    })
    expect(ack.ok).toBe(1)
  });
})
