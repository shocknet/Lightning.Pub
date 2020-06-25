/**
 * @format
 */
const Common = require('shock-common')
const Utils = require('../utils')
const Key = require('../key')

/**
 * @returns {Promise<number>}
 */
const getWallTotalPages = async () => {
  const totalPages = await Utils.tryAndWait(
    (_, user) =>
      user
        .get(Key.WALL)
        .get(Key.NUM_OF_PAGES)
        .then(),
    v => typeof v !== 'number'
  )

  return typeof totalPages === 'number' ? totalPages : 0
}

/**
 * @param {number} page
 * @throws {TypeError}
 * @throws {RangeError}
 * @returns {Promise<Common.SchemaTypes.WallPage>}
 */
const getWallPage = async page => {
  const totalPages = await getWallTotalPages()

  if (page === 0 || totalPages === 0) {
    return {
      count: 0,
      posts: {}
    }
  }

  const actualPageIdx = page < 0 ? totalPages + page : page - 1

  if (actualPageIdx > totalPages - 1) {
    throw new RangeError(`Requested a page out of bounds`)
  }

  /**
   * @type {Common.SchemaTypes.WallPage}
   */
  const thePage = await Utils.tryAndWait(
    (_, user) =>
      new Promise(res => {
        user
          .get(Key.WALL)
          .get(Key.PAGES)
          .get(actualPageIdx.toString())
          // @ts-ignore
          .load(res)
      }),
    v => typeof v !== 'object'
  )

  const clean = {
    ...thePage
  }

  // delete unsuccessful writes
  Object.keys(clean.posts).forEach(k => {
    if (clean.posts[k] === null) {
      delete clean.posts[k]
    }
  })

  for (const [key, post] of Object.entries(clean.posts)) {
    if (post === null) {
      delete clean.posts[key]
    } else {
      post.id = key
    }
  }

  if (!Common.Schema.isWallPage(clean)) {
    throw new Error(
      `Fetched page not a wall page, instead got: ${JSON.stringify(clean)}`
    )
  }

  return clean
}

module.exports = {
  getWallTotalPages,
  getWallPage
}
