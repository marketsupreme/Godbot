const Discord = require('discord.js');
const { yt_API } = require('../config.json');
const ytdl = require('ytdl-core')
const ytstream = require('youtube-audio-stream')
const scdl = require('soundcloud-downloader').default
const ytsrch = require('youtube-search')
const fs = require('fs')
const util = require('util')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice')
const { VoiceConnectionStatus, AudioPlayerStatus } = require('@discordjs/voice');
const { MessageEmbed } = require('discord.js');
const { demuxProbe, createAudioResource } = require('@discordjs/voice');
const { createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');
const { MessageActionRow, MessageButton } = require('discord.js');


ffmpeg.setFfmpegPath(ffmpegPath);

class ChannelInfo {
    constructor(voiceChannel, textChannel) {
        this.voiceChannel = voiceChannel,
        this.textChannel = textChannel,
        this.queue = [],
        this.nowPlaying = null

        let guildId = voiceChannel.guild.id
        var connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guildId,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator
        });

        connection.on(VoiceConnectionStatus.Disconnected, (oldstate, newstate) => {
            channelMap[guildId]?.stop()
            delete channelMap[guildId]
        })

        let player = createAudioPlayer();
        this.player = player;
        connection.subscribe(player);
    }

    stop() {
        try {
            this.player.stop()
        } catch { }

        try {
            this.connection.destroy()
        } catch { }
    }

    queueIsEmpty() {
        return this.queue.length == 0
    }

    addToQueue(songObject) {
        this.queue.push(songObject)
    }

    popNextsongObject() {
        return this.queue.shift()
    }

    removeFromQueue(position) {
        this.queue.splice(position-1, 1)
    }

    playNewSong(resource) {
        this.player.play(resource)
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
            let channelInfo = channelMap[voiceChannel.guild.id]
            if (channelInfo == undefined) {
                channelInfo = new ChannelInfo(voiceChannel, textChannel)
                channelMap[message.guildId] = channelInfo
            }

            if (songname.includes('youtube.com')) {
                channelInfo.addToQueue(songname)
            }
            else if (songname.includes('soundcloud.com')) {
                channelInfo.addToQueue(songname)
            }
            else {
                this.ytsearch(message, textChannel);
                return;
            }
            
            console.log(channelInfo?.player?._state.status)
            if (channelInfo?.player?._state.status != AudioPlayerStatus.Playing) {
                this.playNextSong(voiceChannel)
                message.react("🎶")
            }
            // else {
            //     message.reply("Your song is in position " + channelInfo.queue.length + " in queue")
            //     message.react("✔")
            // }
        }
        catch (error) {
            console.error(error)
            console.log('There was an error playing the requested song: ' + error);
            return textChannel.send('There was an error playing the requested song');
        }
    },

    skip(message) {
        channelInfo = channelMap[message.guildId]
        if (channelInfo == null) {
            message.react('❌')
            return
        }

        if (channelInfo.queueIsEmpty()){
            channelInfo.textChannel.send("There is nothing in queue.")
        }
        else {
            this.playNextSong(channelInfo.voiceChannel)
            message.react("⏩")
            this.makeMessageButtons(message)
        }
    },

    stop(message) {
        try {
            channelInfo = channelMap[message.guildId]
            channelInfo.stop()
            message.react("🛑")
        }
        catch (err) {
            console.log(err)
            message.react('❌')
        }
    },

    pause(message) {
        try {
            channelInfo = channelMap[message.guildId]
            channelInfo?.player?.pause();
            message.react("⏸")
        }
        catch (err) {
            message.react('❌')
        }
    },

    resume(message) {
        try {
        channelInfo = channelMap[message.guildId]
        channelInfo?.player?.unpause();
        message.react("▶")
        }
        catch (err) {
            console.log(err)
            message.react('❌')
        }
    },

    volume(message) { 
        //messageVol = parseInt(message.content)
        
        //message.member.voice.channel.dispatcher.setVolume(Math.min(2, messageVol / 100));
    },

    ytsearch(message, textChannel) {
        try {
            var searchOptions = {
                maxResults:5,
                key: yt_API,
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

                embed.setAuthor(message.member.nickname || message.author.username, message.author.avatarURL());
                embed.setDescription('Send a message with the number corresponding to the video you want');
                
                //console.dir(results)

                results.forEach(result => {
                    i++;
                    embed.addField('\u200b', i + '. [' + result.title + '](' + result.link + ')', false);
                })

                let buttonRow = new MessageActionRow();
                emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"]
                
                for (let j = 0; j < i; j++) {
                    buttonRow.addComponents(
                        new MessageButton()
                            .setCustomId((j).toString())
                            .setLabel("")
                            .setStyle("SECONDARY")
                            .setEmoji(emojis[j])
                    );
                }

                textChannel.send({embeds: [embed], components: [buttonRow]}).then(sentMsg => {
                    
                });
            })
        }
        catch (err) {
            message.react('❌')
        }
    },

    async probeAndCreateResource(readableStream) {
        try{
        const { stream, type } = await demuxProbe(readableStream);
        return createAudioResource(stream, { inputType: type });
        }
        catch (err) {
            message.react('❌')
        }
    },

    async getNextSongStream(channelInfo) {
        try {
            let link = channelInfo?.popNextsongObject()

            if (link.includes('youtube.com')) {
                var strm = ytstream(link)
                //this.downloadYoutubemp3(link, channelInfo)
            }
            else if (link.includes('soundcloud.com')) {
                var strm = await scdl.download(link).then(stream => stream)
            }
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
            if (channelInfo == null || channelInfo == undefined) {
                console.log("cannot find channel info")
                return
            }

            let resource = await this.getNextSongStream(channelInfo) 
            const connection = getVoiceConnection(voiceChannel.guild.id)

            channelInfo.playNewSong(resource)
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
        catch (err) {
            message.react('❌')
        }
    },

    getQueue(channelInfo) {

        console.log(ChannelInfo.textChannel)
        // ChannelInfo.textChannel.send(ChannelInfo.queue)
    
    },

    check(message) {
        console.log(channelMap[message.guildId].player._state.status)
        //console.log(channelMap[message.guildId])
    },
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    makeMessageButtons(message) {

        console.log("making play buttons")
        let embed = new Discord.MessageEmbed();

        embed.setAuthor(message.member.nickname || message.author.username, message.author.avatarURL());
        embed.setDescription('Now Playing ');
        
        //console.dir(results)

        let buttonRow = new MessageActionRow();
        emojis = [["play","▶"], ["pause", "⏸"], ["stop", "⏹"], ["skip", "⏭"]]
        
        for (let j = 0; j < emojis.length; j++) {
            console.log("button " + j + " added")
            buttonRow.addComponents(
                new MessageButton()
                    .setCustomId((emojis[j][0]).toString())
                    .setLabel("")
                    .setStyle("SECONDARY")
                    .setEmoji(emojis[j][1])
            );
        }

        message.channel.send({embeds: [embed], components: [buttonRow]}).then(sentMsg => {
            // const reactionFilter = (reaction, user) => true;

            // const reactionCollector = sentMsg.createReactionCollector(backwardsFilter, {time:90000});
            
            // reactionCollector.on('collect', (r, user) => {
            //     try { 
            //         r.users.remove(user.id) 
            //         sentMsg.edit(embed)
            //     } catch { }
            // })
        });
        console.log("message sent")
    },
}


// /*        function shuffle(queue) {
//             var j, x, i;
//             for (i = queue.length - 1; i > 0; i--) {
//                 j = Math.floor(Math.random() * (i + 1));
//                 x = queue[i];
//                 queue[i] = queue[j];
//                 queue[j] = x;
//             }
//             return queue;
//         }
