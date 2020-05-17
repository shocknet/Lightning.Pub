const { promisify } = require("util");
const FS = require("fs");

module.exports = {
  /**
   * @param {string} path
   */
  access: path =>
    new Promise(resolve => {
      FS.access(path, FS.constants.F_OK, err => {
        resolve(!err);
      });
    }),
  exists: promisify(FS.exists),
  readFile: promisify(FS.readFile),
  writeFile: promisify(FS.writeFile),
  readdir: promisify(FS.readdir),
  unlink: promisify(FS.unlink)
};
