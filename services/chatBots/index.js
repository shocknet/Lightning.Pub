
const ChatBotBase = require('./chatBotBase')
const LiquidityBotClass = require('./liquidityBot')
/**
 * @type {Record<string,ChatBotBase>}
 */
const ActiveChatBots = {}

//the 'id' must be unique
const liquidityBot = new LiquidityBotClass({
    name:'Liquidity BOT',
    id:'shocknet-liquidity-bot'
})

ActiveBots[liquidityBot.id] = liquidityBot

module.exports = ActiveChatBots