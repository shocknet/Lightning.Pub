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
 * @param {any} log
 * @param {import('../index').Handler} handler
 */
const LogWriter = (log, handler) => {
  switch (log.level) {
    case 'notice':
      console.log(
        colors.bgGreen('SUCCESS:'),
        colors.white.underline(log.message)
      )
      handler.State.Pass += 1
      break;
  
    case 'error':
      console.log(
        colors.bgRed.white('FAILURE:'),
        colors.white.underline(log.message)
      )
      handler.State.Fail += 1
      break;

     case 'info':
       if (log.message.done) {
        console.log(colors.rainbow("===+++==="));
        console.log(
          colors.bgCyan.black(`Total: ${handler.State.Fail+handler.State.Pass}`),
          colors.bgGreen.black(`Passed: ${handler.State.Pass}`),
          colors.bgRed.white(`Failed: ${handler.State.Fail}`),
        )
        console.log(colors.rainbow("===+++==="));
        break;
       }
      console.log(
        colors.bgWhite.black('INFO:'),
        colors.white(log.message)
      )
      break;
    default:
      console.log(
        colors.grey(log.message)
      );
      break;
  }
  
  // TODO_ADD: An map tree which includes failure, success and asserts
}

module.exports = {
  tryAndWait,
  LogWriter
};
