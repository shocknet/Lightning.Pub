/**
 * @format
 */
const Common = require('shock-common')
const pickBy = require('lodash/pickBy')
const size = require('lodash/size')
const mapValues = require('lodash/mapValues')

const Utils = require('../utils')
const Key = require('../key')

const User = require('./user')

/**
 * @param {string=} publicKey
 * @returns {Promise<number>}
 */
const getWallTotalPages = async publicKey => {
  const totalPages = await Utils.tryAndWait(
    (gun, u) => {
      /**
       * @type {import('../SimpleGUN').GUNNode}
       */
      let user = u

      if (publicKey && u._.sea.pub !== publicKey) {
        user = gun.user(publicKey)
      }

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
      /**
       * @type {import('../SimpleGUN').GUNNode}
       */
      let user = u

      if (publicKey && u._.sea.pub !== publicKey) {
        user = g.user(publicKey)
      }

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
   * We just use it so Common.Schema.isWallPage passes.
   */
  const mockUser = await User.getMyUser()

  /**
   * @type {Common.SchemaTypes.WallPage}
   */
  const thePage = await Utils.tryAndWait(
    (g, u) => {
      /**
       * @type {import('../SimpleGUN').GUNNode}
       */
      let user = u

      if (publicKey && u._.sea.pub !== publicKey) {
        user = g.user(publicKey)
      }

      return new Promise(res => {
        // forces data fetch
        user
          .get(Key.WALL)
          .get(Key.PAGES)
          .get(actualPageIdx.toString())
          // @ts-ignore
          .load(() => {})

        process.nextTick(() => {
          user
            .get(Key.WALL)
            .get(Key.PAGES)
            .get(actualPageIdx.toString())
            // @ts-ignore
            .load(res)
        })
      })
    },
    maybePage => {
      // sometimes load() returns an empty object on the first call
      if (size(/** @type {any} */ (maybePage)) === 0) {
        return true
      }

      const page = /** @type {Common.Schema.WallPage} */ (maybePage)

      if (typeof page.count !== 'number') {
        return true
      }

      // removes 'unused' initializer and aborted writes
      page.posts = pickBy(page.posts, v => v !== null)

      // .load() sometimes doesn't load all data on first call
      if (size(page.posts) === 0) {
        return true
      }

      // Give ids based on keys
      page.posts = mapValues(page.posts, (v, k) => ({
        ...v,
        id: k
      }))

      page.posts = mapValues(page.posts, v => ({
        ...v,
        // isWallPage() would otherwise not pass
        author: mockUser
      }))

      return !Common.Schema.isWallPage(page)
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
          await User.getAnUser(publicKey)
        : // eslint-disable-next-line no-await-in-loop
          await User.getMyUser()
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
