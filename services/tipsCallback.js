//@ts-nocheck TODO- fix types
class TipsCB {
    listeners = {}

    addSocket(postID,socket){
        console.log("subbing new socket for post: "+postID)
        
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