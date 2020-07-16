// @ts-check
const Gun = require("../../gun/gun");
require("gun/lib/load");
require("gun/lib/then");
require('gun/sea')


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

  console.log({message: `(Alice) [PUB]: ${pub}`});

  console.log({message:`Alice is writing her name to her user graph`});

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("alice", (ack) => {
      if (ack.err) {
        console.log('\n\n\n',ack,'\n\n\n');
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
const onBobsPub = async (bobsPub) => {
  try {
    console.log({message: `(Bob) [PUB]: Alice received: ${bobsPub}`});
    console.log(
      {message:`Alice is now trying to fetch bobs name and will retry and even re-instantiate gun if bobs name is not an string`}
    );

    const bobsName = await Utils.tryAndWait(
      (gun) =>
        new Promise((res) => gun.get(`~${bobsPub}`).get("name").once(res)),
      // retry if bobs name is not an string
      (v) => typeof v !== "string"
    );

    console.log({message: `Alice found bob's name to be: ${bobsName}`});
    console.log(
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
            res(ack);
          }
        });
    });
  } catch (e) {
    console.log({message: `Unexpected error:\n${e}`});
  }
};

/**
 * Test helper to add a node called Bob to the graph (2nd)
 */
const sendFromBobToAlice = async () => {
  let trio = await Gun.freshGun();

  if (Config.Reinstantiate) {
    trio = await Gun.freshGun();
  }

  const { gun, user, pub } = trio;

  console.log({message: `\n(Bob) [PUB]: ${pub}\n`});

  console.log(`\nBob is writing his name to his user graph`);

  await new Promise((res, rej) => {
    // @ts-ignore
    user.get("name").put("bob", (ack) => {
      if (ack.err) {
        rej(new Error(`Error putting bobs name: ${ack.err}`));
      } else {
        if (Nodes !== null) {
          Nodes.push({Name: "Bob", Pub: pub})
        } else {
          Nodes = [{Name: "Bob", Pub: pub}]
        }
        res();
      }
    });
  });

  const ALICES_PUB = Nodes.find(({Name}) => (Name === "Alice")).Pub

  console.log({message: `(Alice) [PUB]: Bob received: ${ALICES_PUB}`});

  const alice = gun.get(`~${ALICES_PUB}`);

  console.log(`\nBob will try to read alice's name`);

  const alicesName = await Utils.tryAndWait(
    () => alice.get("name").then(),
    (v) => typeof v !== "string"
  );

  console.log(`\nAlice's name is: ${alicesName}`);

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
  
  const ack = await new Promise((res, rej) => {
      gun
        .get("publicmailbox")
        .get(Nodes.find(({Name}) => (Name === "Alice")).Pub)
        // @ts-ignore
        .put(pub, (ack) => {
          if (ack.err) {
            rej((new Error(ack.err.message)));
          } else {
            res(ack);
          }
        });
    });
    return ack
}


describe('prepare communication between two nodes', () => {
  jest.setTimeout(15000)
  it('adds a node called Alice to the Gun graph', async () => {
    expect.hasAssertions()
    const {gun,user,pub} = await addAliceToGraph()
  
    gun.get("publicmailbox").get(pub).on(onBobsPub); 
  
    const ack = await sendFromBobToAlice();

    // @ts-ignore
    expect(ack.ok).toBe(1);
  })
})