// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');
const fs = require("fs");
const music = require("./commands/music.js")
const funcCall = require("./functionCaller.js")

var x = music.downloadYoutubemp3("2WPCLda_erI")
console.log(x)

return 
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
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;
});



// 	if (commandName === 'ping') {
// 		await interaction.reply('Pong!');
// 	} else if (commandName === 'server') {
// 		await interaction.reply('Server info.');
// 	} else if (commandName === 'user') {
// 		await interaction.reply('User info.');
// 	} else if (commandName === 'play') {
// 		await music.play(
//             interaction.options.getString('songname').replace(/['"]+/g, ''), //songname
//             client.channels.cache.get(interaction.channelId), //textChannel
//             client.channels.cache.get(interaction.member.voice.channel.id), //voiceChannel
//             client //client
//         );
//     }
// });

// Login to Discord with your client's token
client.login(token);
