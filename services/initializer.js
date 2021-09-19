const API = require('./gunDB/contact-api')

module.exports.InitUserData = async (user) => {
    await API.Actions.setDisplayName('anon' + user._.sea.pub.slice(0, 8), user)
    await API.Actions.generateHandshakeAddress()
    await API.Actions.generateOrderAddress(user)
    await API.Actions.initWall()
    await API.Actions.setBio('A little bit about myself.', user)
    await API.Actions.setDefaultSeedProvider('', user)
    await API.Actions.setSeedServiceData('', user)
    await API.Actions.setCurrentStreamInfo('', user)
}