// @ts-check
const Gun = require("../gun/gun");
const colors = require('colors');
const TIMEOUT_ERR = "Timeout Error";

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * @template T
 * @param {Promise<T>} promise
 * @param {Number} timeout
 * @returns {Promise<T>}
 */
const timeout = (promise, timeout) => {
  /** @type {NodeJS.Timeout} */
  // eslint-disable-next-line init-declarations
  let timeoutID;

  return Promise.race([
    promise.then((v) => {
      clearTimeout(timeoutID);
      return v;
    }),

    new Promise((_, rej) => {
      timeoutID = setTimeout(() => {
        rej(new Error(TIMEOUT_ERR));
      }, timeout);
    }),
  ]);
};

/**
 * @template T
 * @param {(gun: any, user: any) => Promise<T>} promGen The function
 * receives the most recent gun and user instances.
 * @param {((resolvedValue: unknown) => boolean)=} shouldRetry
 * @returns {Promise<T>}
 */
const tryAndWait = async (promGen, shouldRetry = () => false) => {
  /* eslint-disable no-empty */
  /* eslint-disable init-declarations */

  // If hang stop at 10, wait 3, retry, if hang stop at 5, reinstate, warm for
  // 5, retry, stop at 10, err

  /** @type {T} */
  let resolvedValue;

  try {
    resolvedValue = await timeout(promGen(Gun.getGun(), Gun.getUser()), 10000);

    if (shouldRetry(resolvedValue)) {
      console.log(
        "force retrying" +
          ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
      );
    } else {
      return resolvedValue;
    }
  } catch (e) {
    console.log(e);
    if (e.message === "NOT_AUTH") {
      throw e;
    }
  }

  console.log(
    `\n retrying \n` +
      ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
  );

  await delay(3000);

  try {
    resolvedValue = await timeout(promGen(Gun.getGun(), Gun.getUser()), 5000);

    if (shouldRetry(resolvedValue)) {
      console.log(
        "force retrying" +
          ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
      );
    } else {
      return resolvedValue;
    }
  } catch (e) {
    console.log(e);
    if (e.message === "NOT_AUTH") {
      throw e;
    }
  }

  console.log(
    `\n recreating a fresh gun and retrying one last time \n` +
      ` args: ${promGen.toString()} -- ${shouldRetry.toString()}`
  );

  const { gun, user } = await Gun.freshGun();

  return timeout(promGen(gun, user), 10000);
};


/**
 * @param {string} pub
 * @returns {Promise<string>}
 */
const pubToEpub = async pub => {
  try {
    const epub = await tryAndWait(async gun => {
      const _epub = await gun
        .user(pub)
        .get('epub')
        .then()

      if (typeof _epub !== 'string') {
        throw new TypeError(
          `Expected gun.user(pub).get(epub) to be an string. Instead got: ${typeof _epub}`
        )
      }

      return _epub
    })

    return epub
  } catch (err) {
    console.error(err)
    throw new Error(`pubToEpub() -> ${err.message}`)
  }
}

module.exports = {
  tryAndWait,
  pubToEpub
};
