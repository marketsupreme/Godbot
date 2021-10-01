const { prefix } = require('../config.json');
const { funcCall } = require('../functionCaller.js')

module.exports = {
	name: 'messageCreate',
	execute(message) {
    if (message.member.user.bot) {return}
    
    message.content = message.content.trim()

    if (!message.content.startsWith(prefix)) {return}

    let firstSpace = message.content.indexOf(' ') + 1 || message.content.length; 
    let messageCommand = message.content.substring(0, firstSpace).replace(prefix, '').trim()
    message.content = message.content.substring(firstSpace)

    switch (messageCommand) {
        case "p":
        case "play":
            funcCall(messageCommand, message);
            break;
        case "skip":
            console.log('skipfunccall')
            funcCall(messageCommand, message);
            break;
        case "pause":
            funcCall(messageCommand, message);
            break;
        case "stop":
            funcCall(messageCommand, message)
            break;
        case "resume":
            funcCall(messageCommand, message)
            break;
        case "check":
          funcCall(messageCommand, message)
          break;
        case "volume":
            funcCall(messageCommand, message)
            break;
        case "queue":
        case "q":
            funcCall(messageCommand, message)
            break;
    }
	},
};