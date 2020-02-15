/**
 * @format
 * @typedef {import("../SimpleGUN").ValidDataValue} ValidDataValue
 * @typedef {import('../SimpleGUN').GUNNode} GUNNode
 * @typedef {import('./PGUNNode').PGUNNode} PGUNNode
 */

/**
 * @param {GUNNode} node
 * @returns {PGUNNode}
 */
const promisify = node => {
  const oldPut = node.put.bind(node)
  const oldSet = node.set.bind(node)
  const oldGet = node.get.bind(node)

  const _pnode = /** @type {unknown} */ (node)
  const pnode = /** @type {PGUNNode} */ (_pnode)

  pnode.put = data =>
    new Promise((res, rej) => {
      oldPut(data, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
    })

  pnode.set = data =>
    new Promise((res, rej) => {
      oldSet(data, ack => {
        if (ack.err) {
          rej(new Error(ack.err))
        } else {
          res()
        }
      })
    })

  pnode.get = key => promisify(oldGet(key))

  return pnode
}

module.exports = promisify
