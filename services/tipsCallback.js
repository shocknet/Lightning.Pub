//@ts-nocheck TODO- fix types
const { gunUUID } = require("../utils")
const logger = require('../config/log')
class TipsCB {
    listeners = {}

    postsEnabled = {}
    
    enablePostNotifications(postID){
        const accessId = gunUUID()
        this.postsEnabled[accessId] = postID
        return accessId
    }

    addSocket(accessId,socket){
        if(!this.postsEnabled[accessId]){
            return "invalid access id"
        }
        const postID = this.postsEnabled[accessId]
        logger.info("subbing new socket for post: "+postID)
        
        if(!this.listeners[postID]){
            this.listeners[postID] = []
        }
        this.listeners[postID].push(socket)
    }
    
    notifySocketIfAny(postID,name,message,amount){
        if(!this.listeners[postID]){
            return
        }
        this.listeners[postID].forEach(socket => {
            if(!socket.connected){
                return
            }
            socket.emit("update",{
                name,message,amount
            })
        });
    }
}

const TipsForwarder = new TipsCB()
module.exports = TipsForwarder