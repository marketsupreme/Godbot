const { prefix } = require('../config.json');
const music = require("../commands/music.js")
const htmlparse = require('../helpers/htmlparse.js');

module.exports = {
	name: 'messageCreate',
	execute(message) {
    if (message.member.user.bot) {return}
    
    message.content = message.content.trim()

    if (!message.content.startsWith(prefix)) {return}

    let firstSpace = message.content.indexOf(' ') + 1 || message.content.length; 
    let messageCommand = message.content.substring(0, firstSpace).replace(prefix, '').trim().toLowerCase()
    message.content = message.content.substring(firstSpace).trim()

    
    //KEEP THEM IN ALPHABETICAL ORDER !!!!
    switch (messageCommand) {
        case "bob":
            music.bob(message)
            break;
        case "check":
            music.check(message)
            break;
        case "np":
            music.nowPlaying(message)
            break;
        case "pause":
        case "ps":
            music.pause(message)
            break;
        case "play":
        case "p":
            music.play(message)
            break;
        case "queue":
        case "q":
            music.queue(message)
            break;
        case "resume":
            music.resume(message)
            break;
        case "search":
            console.log("messagecreate")
            htmlparse.getYoutubeTitle(message)
            break;
        case "skip":
            music.skip(message)
            break;
        case "stop":
            music.stop(message)
            break;
        case "volume":
            music.volume(message)
            break;
    }

    //if (message.channel.id != )
	},
};