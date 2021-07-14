const logger = require('winston')
const fetch = require('node-fetch')
const Storage = require('node-persist')
const { listPeers, connectPeer,getInfo } = require('./v2')

const handlerBaseUrl = "https://channels.shock.network:4444"

module.exports = async () => {
  /**
   * @type string | undefined
   */
  const invite = process.env.HOSTING_INVITE
  if(!invite) {
    return
  }
  try {
    /**
     * @type string[]
     */
    const invites = await Storage.getItem('processedInvites') || []
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
    const channelReq = {
      userPubKey:identity_pubkey,
      invite,
      lndTo:pub,
    }
    //@ts-expect-error
    const res = await fetch(`${handlerBaseUrl}/channel`,{
      method:'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body:JSON.stringify(channelReq)
    })
    if(res.status !== 200 ){
      return
    }
    invites.push(invite)
    await Storage.setItem('processedInvites',invites)

  } catch(e){
    logger.error("error sending invite to channels handler")
    console.error(e)
  }

}