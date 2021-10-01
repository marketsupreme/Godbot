// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require("fs");
const music = require("./commands/music.js")
const funcCall = require("./functionCaller.js")

// Create a new client instance
const client = new Client({ intents: ['GUILD_VOICE_STATES', 'GUILD_MESSAGES', 'GUILDS', 'GUILD_MESSAGE_REACTIONS'] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
//     client.channels.fetch("892120127506632704")
//         .then(channel => channel.send("hey"))
//         .catch(console.error);
});

// event handler
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// listening for commands
client.on('interactionCreate', interaction => {
	if (interaction.isButton()) {
    	if (interaction.customId.match("[0-9]")) {
		
			let youtubeSearchResultRegex = String.raw`[\d]+. \[.*\]\((.*)\)`

			let messageField = interaction.message.embeds[0].fields[parseInt(interaction.customId)]
			let regexMatch = messageField.value.match(youtubeSearchResultRegex)

			if (regexMatch) {
				let newMessage = interaction.message
				newMessage.content = regexMatch[1]
				music.play(newMessage)
			}
			
			interaction.message.delete().then(msg => console.log("Deleted embedded message"))
			music.makeMessageButtons(interaction.message)
		}

		else {

			let buttonNum = interaction.customId
			switch (buttonNum) {
				case "play":
					music.resume(interaction.message)
					break;
				case "pause":
					music.pause(interaction.message)
					break;
				case "stop":
					music.stop(interaction.message)
					break;
				case "skip":
					music.skip(interaction.message)
					break;
			}

		}

	}
});

client.login(token);
