/**
 * @format
 */
const Common = require('shock-common')
const Utils = require('../utils')
const Key = require('../key')

/**
 * @returns {Promise<number>}
 */
const getWallTotalPages = () =>
  /** @type {Promise<number>} */ (Utils.tryAndWait(
    (_, user) =>
      user
        .get(Key.WALL)
        .get(Key.NUM_OF_PAGES)
        .then(),
    v => typeof v !== 'number'
  ))

/**
 * Won't fail if given an invalid page, will return an empty set.
 * @param {number} page
 * @returns {Promise<Common.SchemaTypes.WallPage>}
 */
const getWallPage = async page => {
  const totalPages = await getWallTotalPages()
  const empty = {
    count: 0,
    posts: {}
  }

  if (page === 0) {
    return empty
  }

  const actualPageIdx = page < 0 ? totalPages + (page + 1) : page - 1

  const thePage = await Utils.tryAndWait(
    (_, user) =>
      new Promise(res => {
        user
          .get(Key.WALL)
          .get(Key.PAGES)
          .get(actualPageIdx.toString())
          .load(res)
      })
  )

  if (Common.Schema.isWallPage(thePage)) {
    return thePage
  }

  return empty
}

module.exports = {
  getWallTotalPages,
  getWallPage
}
