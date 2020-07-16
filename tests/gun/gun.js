// @ts-check
const Gun = require("gun/gun");

const ALIAS_AND_PASS = Math.round(Math.random() * 10000).toString();

/**
 * Runs mimiza's fork.
 */
const FORK_SUPER_PEER = "http://gun.shock.network:8765/gun";

/**
 * Runs mimiza's fork.
 */
const AUX_SUPER_PEER = "";

const Peer = {
  NO_PEERS: [],
  OUR_USUAL_PEER: [FORK_SUPER_PEER],
  SHOCK_PLUS_ANOTHER: [FORK_SUPER_PEER, AUX_SUPER_PEER],
};

// eslint-disable-next-line init-declarations
let gun, user;

const freshGun = async () => {
  console.log(`[GUN]: Creating a fresh instance of Gun`);
  gun = null;
  user = null;

  gun = new Gun({
    axe: false,
    peers: Peer.OUR_USUAL_PEER,
  });

  user = gun.user();

  const pub = await new Promise((res, rej) => {
    user.create(ALIAS_AND_PASS, ALIAS_AND_PASS, (ack) => {
      if (ack.err === `User already created!`) {
        res(
          new Promise((res, rej) => {
            user.auth(ALIAS_AND_PASS, ALIAS_AND_PASS, (ack) => {
              if (ack.err) {
                rej(ack.err);
              } else {
                res(ack.sea.pub);
              }
            });
          })
        );

        return;
      }

      if (ack.err) {
        rej(new Error(ack.err));
      } else {
        res(ack.pub);
      }
    });
  });

  return {
    gun,
    user,
    pub,
  };
};

const getGun = () => gun;

const getUser = () => user;

module.exports = {
  freshGun,
  getGun,
  getUser,
};
