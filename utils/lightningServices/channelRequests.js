const logger = require('winston')
const fetch = require('node-fetch')
const Storage = require('node-persist')
const { listPeers, connectPeer,getInfo } = require('./v2')

const handlerBaseUrl = "https://channels.shock.network:4444"

/**
 * 
 * @param {string} inviteFromAuth
 */
module.exports = async (inviteFromAuth) => {
  /**
   * @type string | undefined
   */
  const invite = inviteFromAuth || process.env.HOSTING_INVITE
  if(!invite) {
    return
  }
  try{
    await Storage.getItem('processedInvites')
  } catch(e) {
    await Storage.setItem('processedInvites',[])
  }
  try {
    /**
     * @type string[]
     */
    const invites = await Storage.getItem('processedInvites')
    if(invites.includes(invite)){
      return
    }

    const me = await getInfo()
    const {identity_pubkey} = me
    //@ts-expect-error
    const connectReq = await fetch(`${handlerBaseUrl}/connect`)
    if(connectReq.status !== 200 ){
      return
    }

    const connJson = await connectReq.json()
    const [uri] = connJson.uris
    const [pub,host] = uri.split("@")
    const peers = await listPeers()
    if(peers.findIndex(peer => peer.pub_key === pub) === -1){
      await connectPeer(pub,host)
    }

    //@ts-expect-error
    const res = await fetch(`${handlerBaseUrl}/channel`,{
      method:'POST',
      body:JSON.stringify({
        userPubKey:identity_pubkey,
        invite,
        lndTo:pub,
      })
    })

    invites.push(invite)
    await Storage.setItem('processedInvites',invites)

  } catch(e){
    logger.error("error sending invite to channels handler")
    console.error(e)
  }

}