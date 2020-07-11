/**
 * @format
 */
const Common = require('shock-common')

const Utils = require('../utils')
const Key = require('../key')

const Wall = require('./user')

/**
 * @param {string=} publicKey
 * @returns {Promise<number>}
 */
const getWallTotalPages = async publicKey => {
  const totalPages = await Utils.tryAndWait(
    (gun, u) => {
      const user = publicKey ? gun.get(`~${publicKey}`) : u

      return user
        .get(Key.WALL)
        .get(Key.NUM_OF_PAGES)
        .then()
    },
    v => typeof v !== 'number'
  )

  return typeof totalPages === 'number' ? totalPages : 0
}

/**
 * @param {number} page
 * @param {string=} publicKey
 * @throws {TypeError}
 * @throws {RangeError}
 * @returns {Promise<Common.SchemaTypes.WallPage>}
 */
const getWallPage = async (page, publicKey) => {
  const totalPages = await getWallTotalPages(publicKey)

  if (page === 0) {
    throw new RangeError(
      `Page number cannot be zero, only positive and negative integers are allowed.`
    )
  }

  const empty = {
    count: 0,
    posts: {}
  }

  if (totalPages === 0) {
    return empty
  }

  const actualPageIdx = page < 0 ? totalPages + page : page - 1

  if (actualPageIdx > totalPages - 1) {
    throw new RangeError(`Requested a page out of bounds`)
  }

  /**
   * @type {number}
   */
  // @ts-ignore
  const count = await Utils.tryAndWait(
    (g, u) => {
      const user = publicKey ? g.get(`~${publicKey}`) : u

      return user
        .get(Key.WALL)
        .get(Key.PAGES)
        .get(actualPageIdx.toString())
        .get(Key.COUNT)
        .then()
    },
    v => typeof v !== 'number'
  )

  if (count === 0) {
    return empty
  }

  /**
   * @type {Common.SchemaTypes.WallPage}
   */
  const thePage = await Utils.tryAndWait(
    (g, u) => {
      const user = publicKey ? g.get(`~${publicKey}`) : u

      return new Promise(res => {
        user
          .get(Key.WALL)
          .get(Key.PAGES)
          .get(actualPageIdx.toString())
          // @ts-ignore
          .load(res)
      })
    },
    maybePage => {
      if (typeof maybePage !== 'object' || maybePage === null) {
        return true
      }

      const clean = {
        ...maybePage
      }

      // @ts-ignore
      for (const [key, post] of Object.entries(clean.posts)) {
        // delete unsuccessful writes
        if (post === null) {
          // @ts-ignore
          delete clean.posts[key]
        } else {
          post.id = key
        }
      }

      // .load() sometimes doesn't load all data on first call
      // @ts-ignore
      if (Object.keys(clean.posts).length === 0) {
        return true
      }

      return !Common.Schema.isWallPage(clean)
    }
  )

  const clean = {
    ...thePage
  }

  for (const [key, post] of Object.entries(clean.posts)) {
    // delete unsuccessful writes
    if (post === null) {
      delete clean.posts[key]
      clean.count--
    } else {
      post.author = publicKey
        ? // eslint-disable-next-line no-await-in-loop
          await Wall.getAnUser(publicKey)
        : // eslint-disable-next-line no-await-in-loop
          await Wall.getMyUser()
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
