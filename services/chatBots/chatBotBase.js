
//

/**
 * @typedef {object} Props
 * @prop {string} name
 * @prop {string} id
 * @prop {string?} version
 * @prop {string?} author
 * @prop {string?} authorPub 
 */

  /**
   * @typedef {object} BotCommandParamDef
   * @prop {string} paramName
   * @prop {boolean} isNumber
   */ 

  /**
   * @typedef {object} BotCommandDef
   * @prop {string} command
   * @prop {string} commandName
   * @prop {string} commandDescription
   * @prop {(BotCommandParamDef|null)} param
   */

  /**
   * @typedef {object} BotCommand
   * @prop {string} command
   * @prop {string|null} param
   */

/**
 * Dont use this class directly, extend it instead
 * @class ChatBotBase
 */
class ChatBotBase {
  /**
   * @param {Props} props 
   */
  constructor(props){
    this.name = props.name
    this.id = props.id
    this.version = props.version || '0.0.0'
    this.author = props.author || 'Shocknet'
    this.authorPub = props.authorPub || ''
  }

    /**
   * @type {Record<string,BotCommandDef>}
   */
  _availableCommands = {
    '/help':{
      command:'/help',
      commandName:'help',
      commandDescription:'list available commands',
      param:null
    }
  }

  get availableCommands(){
    return this._availableCommands
  }
  /**
   * 
   * @param {BotCommandDef[]} commands 
   */
  addCommands(commands){
    commands.forEach(element => {
      this._availableCommands[element.command] = element
    });
  }

  _connected = false
  _connecting = false

  get connected(){
    return this._connected
  }

  get connecting(){
    return this._connecting
  }

  /**
   * @type {import('socket.io').Socket|null}
   */
  _socket = null

  /**
   * 
   * @param {import('socket.io').Socket} socket 
   */
  Connect(socket){
    //get ready make the connections that you need
    if(this._connected || this._connecting){
      return {message:'attempted to conned while already connected or connecting'}
    }
    this._connecting = true

    if(!socket.connected){
      this._connecting  = false
      return {message:'attempted to conned with a non connected socket'}
    } 
    // send socket event and wait for response
    socket.on('userMessage', body => {
      if(!body || !body.userMessage){
        return
      }
      this.#parseMessage(body.userMessage)

    })

    socket.on('disconnect', () => {
      //wait two seconds, if still disconnected, clear flag to allow reconnection
      setTimeout(()=>{
        if(!socket.connected){
          this._connecting = false
          this._connected = false
        }
      },2000)
    })

    this._socket = socket
    this._connected = true
  }

  FireEvent(eventName){

  }
  
  ChatHistory(){
    //get the chat history with user
  }

  /**
   * 
   * @param {string} message 
   * @returns {(null|BotCommand|{message:string})}
   */
  #parseMessage(message){
    if(!message.startsWith('/')){
      return null
    }
    const words = message.split(' ')
    //only allow one param for simplicity
    const [command,param] = words
    const commandDef = this._availableCommands[command]
    if(!commandDef){
      return {message:'unknown command'}
    }
    const paramDef = commandDef.param
    if(param && paramDef){
      if(commandDef.params[0].isNumber && isNaN(param)){
        return {message:'expected number as parameter'}
      }

      return {
        command,
        param

      }
    }
    return {
      command,
      param:null
    }

  }

  /**
   * 
   * @param {('user'|'bot')} from 
   * @param {string} message 
   */
  #saveMessage(from,message){
    //save the message to gun
  }

  onConnect(){
    //fire a 'ready' event
  }

  /**
   * 
   * @param {string} message 
   */
  onMessage(message){
    //this.#saveMessage('user',message)
    const parsed = this.#parseMessage(message)
    if(parsed && parsed.message){//error
      //this.SendMessage(parsed.message)
      return 
    }

    if(parsed && parsed.command){//error

      if(parsed.command === '/help'){
        const helpMessage = this.#handleHelp()
        this.SendMessage(helpMessage)
        return
      }
      this.onCommand(parsed)
      return 
    }
  }

  /**
   * 
   * @param {BotCommand} command  
   */
  onCommand(command){
    //new command from user
  }

  /**
   * @param {string} message 
   */
  SendMessage(message){
    if(!this._socket.connected){
      return
    }
    this._socket.emit('botMessage',{botMessage:message})
  }

  SendNotification(){
    //send notification to user
  }

  /**
   * @returns {string}
   */
  #handleHelp(){
    let helpMessage = ''
    for (const key in this._availableCommands) {
      if (this._availableCommands.hasOwnProperty(key)) {
        const element = this._availableCommands[key];
        helpMessage += element.command + " : " + element.commandName + " , " + element.commandDescription + "\n"
      }
    }
    return helpMessage
  }


}

module.exports = ChatBotBase