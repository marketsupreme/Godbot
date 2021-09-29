const Discord = require('discord.js');
const ytdl = require('ytdl-core')
const ytmp3 = require('youtube-mp3-downloader')
const scdl = require('soundcloud-downloader').default
const ytsrch = require('youtube-search')
const fs = require('fs')
const util = require('util')
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice')
const { VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');

const { demuxProbe, createAudioResource } = require('@discordjs/voice');
const { createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');


class ChannelInfo {
    constructor(voiceChannel, textChannel, connection) {
        this.voiceChannel = voiceChannel,
        this.textChannel = textChannel,
        this.player = null,
        this.connection = connection,
        this.queue = []
    }

    stop() {
        this.player.stop()
        this.connection.destroy()
    }

    queueIsEmpty() {
        return this.queue.length == 0
    }

    addToQueue(songName) {
        this.queue.push(songName)
    }

    getNextSongName() {        
        return this.queue[0]
    }

    popNextSongName() {
        return this.queue.shift()
    }

    removeFromQueue(position) {
        this.queue.splice(position-1, 1)
    }
}

let channelMap = new Object();

module.exports = {
    name: 'music',
    description: "plays music",
    play (message) {
        let songname = message.content, 
            textChannel = message.channel, 
            voiceChannel = message.member.voice.channel,
            client = message.client

        if (!voiceChannel) return textChannel.send('You must be in a voice channel for me to play music!');
        if (client.connections)
            if (!client.connections.has(voiceChannel)) 
                return textChannel.send('You are not in the same voice channel as me!')
                
        const permissions = voiceChannel.permissionsFor(client.user);
        if (!permissions.has('CONNECT')) return textChannel.send('i don\'t have permission to join this voice channel');
        if (!permissions.has('SPEAK')) return textChannel.send('i don\'t have permission to speak in this voice channel');

        channelMap[voiceChannel.guild.id]?.player?.unpause()

        try {
            var connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator
            });

            channelInfo = new ChannelInfo(voiceChannel, textChannel, connection)
            channelMap[message.guildId] = channelInfo

            connection.on(VoiceConnectionStatus.Disconnected, (oldstate, newstate) => {
                channelMap[guildId]?.stop()
                delete channelMap[guildId]
            })

            if (songname.includes('youtube.com')) {
                channelInfo.addToQueue(songname)
            }
            else if (songname.includes('soundcloud.com')) {
                channelInfo.addToQueue(songname)
            }
            else {
                this.ytsearch(songname);
                return;
            }
        }
        catch (error) {
            console.error(error)
            console.log('There was an error playing the requested song: ' + error);
            return textChannel.send('There was an error playing the requested song');
        }

        if (channelInfo?.player?._state.status != AudioPlayerStatus.Playing) {
            this.playNextSong(voiceChannel)
            message.react("🎶")
        }
        else {
            message.reply("Your song is in position " + channelInfo.queue.length + 1 + " in queue")
            message.react("✔")
        }
    },

    skip(message) {
        channelInfo = channelMap[message.guildId]
        if (channelInfo == null) {
            message.react('❌')
            return
        }

        this.playNextSong(channelInfo.voiceChannel)
        message.react("⏩")
    },

    stop(message) {
        try {
            channelInfo = channelMap[message.guildId]
            channelInfo.stop()
            message.react("🛑")
        }
        catch {
            message.react('❌')
        }
    },

    pause(message) {
        try {
        channelInfo = channelMap[message.guildId]
        channelInfo?.player?.pause();
        message.react("⏸")
        }
        catch {
            message.react('❌')
        }
    },

    resume(message) {
        try {
        channelInfo = channelMap[message.guildId]
        channelInfo?.player?.unpause();
        message.react("▶")
        }
        catch {
            message.react('❌')
        }
    },

    volume(message) { 
        //messageVol = parseInt(message.content)
        
        //message.member.voice.channel.dispatcher.setVolume(Math.min(2, messageVol / 100));
    },

    ytsearch(message) {
        try{
        var searchOptions = {
            maxResults:5,
            key: 'AIzaSyBvA15uusyx2YAPY0aq9A7y67jBMVQP-JU',
            videoDuration: 'any',
            type: 'video'
        };
    
        searchString = message.content
    
        ytsrch(searchString, searchOptions, function(err, results) {
            if (err) {
                return console.error(err);
            }

            let i = 0;
            let embed = new Discord.MessageEmbed();

            embed.setAuthor(message.author.username, message.author.avatarURL());
            embed.setDescription('Send a message with the number corresponding to the video you want');
            
            //console.dir(results)

            results.forEach(result => {
                i++;
                console.log(result.videoDuration)
                embed.addField('\u200b', i + '. [' + result.title + '](' + result.link + ')', false);
            })

            textChannel.send(embed);
        })
        }
        catch {
        message.react('❌')
        }
    },


    async probeAndCreateResource(readableStream) {
        try{
        const { stream, type } = await demuxProbe(readableStream);
        return createAudioResource(stream, { inputType: type });
        }
        catch {
            message.react('❌')
        }
    },

    async getNextSongStream(channelInfo) {
        try {
            let link = channelInfo?.popNextSongName()
            console.log(link)
            if (link.includes('youtube.com'))
                var strm = this.downloadYoutubemp3(link)
                //var strm = ytdl(link, {container: 'webm'});
            else if (link.includes('soundcloud.com'))
                var strm = await scdl.download(link).then(stream => stream)

            var resource = this.probeAndCreateResource(strm, { inlineVolume: true });
            //resource.volume.setVolume(0.5)

            //console.log(link)
            //console.dir(strm)

            return resource;
        }
        catch (error) {
            console.log("error in getNextStream")
            console.error(error)
        }
    },

    async playNextSong(voiceChannel) {
        try {
            let channelInfo = channelMap[voiceChannel.guild.id]
            if (channelInfo == null) {
                console.log("cannot find channel info")
                return
            }

            let resource = await this.getNextSongStream(channelInfo) 
            //console.log(resource)
            const connection = getVoiceConnection(voiceChannel.guild.id)

            let player = null;
            if (channelInfo.player == null) {
                player = createAudioPlayer();
                channelInfo.player = player;

                this.setupPlayerEvents(player)
            }
            else {
                player = channelInfo.player
            }

            player.play(resource);

            connection.subscribe(player);

            console.log("player status is " + player._state.status)
        }
        catch (error) {
            //console.error(error)
        }
    },

    setupPlayerEvents(channelInfo) {
        try {
            console.log('setting up player events')
            let player = channelInfo.player
            // player.on('error', error => {
            //     console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
            //     //player.play(this.getNextSongStream(channelInfo));
            // });

            // player.on(AudioPlayerStatus.Idle, () => {
            //     console.log("idle")
            //     player.play(this.getNextSongStream(channelInfo))
            // });
            console.log('done setting up player events')
        }
        catch {
            message.react('❌')
        }
    },

    async downloadYoutubemp3(link) {
        var YD = new ytmp3({
            "ffmpegPath": "x:/Coding/Discordbot/node_modules/ffmpeg-static/ffmpeg.exe",    // FFmpeg binary location
            "outputPath": "x:/Coding/Discordbot/temp_mp3/mp3s",       // Output file location (default: the home directory)
            "youtubeVideoQuality": "highestaudio",  // Desired video quality (default: highestaudio)
            "queueParallelism": 2,                  // Download parallelism (default: 1)
            "progressTimeout": 2000,                // Interval in ms for the progress reports (default: 1000)
            "allowWebm": true                      // Enable download from WebM sources (default: false)
        });

        if (link.includes('youtube'))
            videoId = link.substring(link.indexOf("v=") + 2)
        else
            videoId = link

        YD.on("error", function(error) {
            console.log(error);
        });

        YD.on("finished", function(err, data) {
            console.log(data.file);
        });
        
        let fileName = await YD.download(videoId).then(data => data.file)
        return fileName
    },

    check(message) {
        console.log(channelMap[message.guildId].player._state.status)
        //console.log(channelMap[message.guildId])
    },
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
}







/*        function shuffle(queue) {
            var j, x, i;
            for (i = queue.length - 1; i > 0; i--) {
                j = Math.floor(Math.random() * (i + 1));
                x = queue[i];
                queue[i] = queue[j];
                queue[j] = x;
            }
            return queue;
        }





const dispatcher = connection.play(strm)
        .on('finish', async () => {
            if (queue.length == 0) {
                await this.sleep(30000)
                if (queue.length == 0)
                    connection.channel.leave();
            }
            else {
                this.playNextSong(voiceChannel)
            }
            console.log('exiting')
        })
        .on('error', error => {
            voiceChannel.leave();
            console.log("play error: " + error);
        });
        dispatcher.setVolume(25 / 100);
        */