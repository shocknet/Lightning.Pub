const crypto = require('crypto')
const fetch = require('node-fetch')

const selfContentToken = () => {
  const seedUrl = process.env.TORRENT_SEED_URL
  const seedToken = process.env.TORRENT_SEED_TOKEN
  if (!seedUrl || !seedToken) {
    return false
  }
  return {seedUrl,seedToken}
}

/**
 * 
 * @param {number} nOfTokens 
 * @param {{seedUrl:string,seedToken:string}} param1 
 * @returns 
 */
const enrollContentTokens = async (nOfTokens,{seedUrl,seedToken}) => {
  const tokens = Array(nOfTokens)
  for (let i = 0; i < nOfTokens; i++) {
    tokens[i] = crypto.randomBytes(32).toString('hex')
  }
  /**@param {string} token */
  const enrollToken = async token => {
    const reqData = {
      seed_token: seedToken,
      wallet_token: token
    }
    //@ts-expect-error
    const res = await fetch(`${seedUrl}/api/enroll_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reqData)
    })
    if (res.status !== 200) {
      throw new Error('torrentSeed service currently not available')
    }
  }
  await Promise.all(tokens.map(enrollToken))
  return tokens
}



module.exports = {
  selfContentToken,
  enrollContentTokens
}