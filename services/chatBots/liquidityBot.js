
const ChatBotBase = require("./chatBotBase");

/**
 * @typedef {import('./chatBotBase').Props} Props
 */

/**
 * @class LiquidityBot
 * @extends {ChatBotBase}
 */
class LiquidityBot extends ChatBotBase {
  
  constructor(props){
    super(props)
  }





  /**
   * 
   * @param {import('./chatBotBase').BotCommand} command 
   */
  onCommand(command){

  }
}

module.exports = LiquidityBot