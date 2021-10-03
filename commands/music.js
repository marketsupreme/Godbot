const Discord = require('discord.js');
const { yt_API } = require('../config.json');
const ytdl = require('ytdl-core')
const ytstream = require('youtube-audio-stream')
const scdl = require('soundcloud-downloader').default
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
const { MessageSelectMenu } = require('discord.js');
const searchYoutube = require('youtube-search-without-api-key').search;
const htmlparse = require('../helpers/htmlparse.js')
const path = require('path')


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
        this.setupPlayerEvents(player)
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
        if (this.nowPlaying == null) {
            this.nowPlaying = songObject
            this.playNextSong(songObject)
        }
        else {
            this.queue.push(songObject)   
        }
    }

    popNextSongObject() {
        return this.queue.shift()
    }

    removeFromQueue(position) {
        this.queue.splice(position-1, 1)
    }

    playNewSong(resource) {
        this.nowPlaying = resource.songObject
        this.player.play(resource.resource)

        this.textChannel.send("now playing " + this.nowPlaying.title)
    }

    setupPlayerEvents(player) {
        try {
            player.on('error', error => {
                console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
                this.nowPlaying = null
                this.playNextSong()
            });

            player.on(AudioPlayerStatus.Idle, () => {
                console.log("idle")
                this.nowPlaying = null;
                this.playNextSong()
            });
        }
        catch (err) {
            console.log(err)
        }
    }

    async probeAndCreateResource(readableStream) {
        try{
            const { stream, type } = await demuxProbe(readableStream);
            return createAudioResource(stream, { inputType: type });
        }
        catch (err) {
            console.log(err)
        }
    }

    async getNextSongStream(songObject) {
        try {
            if (!songObject)
                songObject = this.popNextSongObject()

            if (songObject == undefined)
                return null

            let url = songObject.url

            if (url.includes('youtube.com')) {
                var strm = ytstream(url)
            }
            else if (url.includes('soundcloud.com')) {
                var strm = await scdl.download(url).then(stream => stream)
            }
            var resource = await this.probeAndCreateResource(strm);

            return { resource: resource, songObject: songObject };
        }
        catch (error) {
            console.log("error in getNextSongStream")
            console.error(error)
        }
    }

    async playNextSong(songObject = null, skip = false) {
        try {
            if (this.nowPlaying != null && skip == true) {
                return
            }

            let resourceObject = await this.getNextSongStream(songObject) 
            if (resourceObject == null) {
                return
            }

            this.playNewSong(resourceObject)
        }
        catch (error) {
            console.log(error)
        }
    }

    playMp3(songObject) {
        try {
            let fileResource = createAudioResource(songObject.url)
            if (fileResource) {
                let resourceObject = {
                    songObject: songObject,
                    resource: fileResource
                }

                this.playNewSong(resourceObject)
            }
        }
        catch (error) {
            console.log(error)
        }
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
                htmlparse.getYTvideoId(songname).then((videoId) => {
                    searchYoutube(videoId.toString()).then((results) => {
                        let ytVid = results[0]
                        let videoDurationRegex = ytVid.snippet.duration.match(String.raw`(\d+):\d+:\d+`)
                        if (videoDurationRegex) {
                            let videoHours = parseInt(videoDurationRegex[1]) 
                            if (videoHours && videoHours >= 3) {
                                message.reply("Cannot play a song greater longer than 3 hours")
                                return
                            }
                        }
        
                        var songObject = {
                            title: ytVid.snippet.title,
                            url: ytVid.snippet.url
                        }

                        channelInfo.addToQueue(songObject)
                    })
                })
            }
            else if (songname.includes('soundcloud.com')) {
                channelInfo.addToQueue(songname)
            }
            else {
                this.ytsearch(message, textChannel);
                return;
            }
            
            // console.log(channelInfo?.player?._state.status)
            // if () {
            //     this.makeMessageButtons(message)
    
            //     message.react("🎶")
            // }
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
            channelInfo.stop()
            channelInfo.textChannel.send("No more songs in queue.")
            message.react('⏩')
        }
        else {
            channelInfo.playNextSong(skip = true)
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

    nowPlaying(message) {
        try {
            message.reply(channelMap[message.guildId]?.nowPlaying.url)
        }
        catch (err) {
            console.log(err)
            message.react('❌')
        }
    },

    bob(message) {
        const bobDir = fs.readdir("bob",(err, files) => {
            if (err) {
                console.log(err)
                return
            }

            let randFileNum = Math.floor(Math.random() * files.length)
            let channelInfo = channelMap[message.guildId]
            if (!channelInfo) {
                channelInfo = new ChannelInfo(message.member.voice.channel, message.channel)
                channelMap[message.guildId] = channelInfo
            }

            songObject = {
                title: "BOBB BOP BOBAZOOEEE",
                url: path.resolve("../bob/" + files[randFileNum])
            }

            channelInfo?.playMp3(songObject)

        });
    },

    queue(message) {
        let channelInfo = channelMap[message.guildId]

        console.log(channelInfo.queue)
        let row = new MessageActionRow()
            .addComponents(
                new MessageSelectMenu()
                    .setCustomId('queueMenu')
                    .setPlaceholder('Select song to play')
                    .addOptions([
                        {
                            label: 'Song 1',
                            description: 'Song 1 desc',
                            value: 'first'
                        },
                        {
                            label: 'Song 2',
                            description: 'Second song desc',
                            value: 'second'
                        }
                    ])
            );
        
        let embed = new MessageEmbed()
            .setTitle('queue')

        message.reply({embeds: [embed], componenets: [row]})
    },

    check(message) {
        console.log(channelMap[message.guildId].player._state.status)
        //console.log(channelMap[message.guildId])
    },
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    async ytsearch(message, textChannel) {
        try {
            searchString = message.content
        
            var results = await searchYoutube(searchString.toString());
            let i = 0;
            let embed = new Discord.MessageEmbed();

            embed.setAuthor(message.member.nickname || message.author.username, message.author.avatarURL());
            embed.setDescription('Send a message with the number corresponding to the video you want');
            
            //console.dir(results)

            results.forEach(result => {
                i++;
                let videoTitle = result.snippet.title
                //console.log(videoTitle)
                if (videoTitle.length > 69)
                     { videoTitle = videoTitle.substring(0, 31) + "..." }

                embed.addField('\u200b', i + '. [' + videoTitle + '](' + result.snippet.url + ')', false);
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
        }
        catch (err) {
            message.react('❌')
            console.log(err)
        }
    }, 

    makeMessageButtons(message) {

        channelInfo = channelMap[message.guildId]

        let embed = new Discord.MessageEmbed();
        let buttonRow = new MessageActionRow();

        embed.setAuthor(message.member.nickname || message.author.username, message.author.avatarURL());
        embed.setDescription('Now Playing - ' + channelInfo.nowPlaying.title);
        emojis = [["play","▶"], ["pause", "⏸"], ["stop", "⏹"], ["skip", "⏭"]]
        
        for (let j = 0; j < emojis.length; j++) {
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
