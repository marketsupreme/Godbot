const Discord = require('discord.js');
const ytdl = require('ytdl-core')
const scdl = require('soundcloud-downloader')
const ytsrch = require('youtube-search')

module.exports = {
    name: 'stop',
    description: "music go stop",
    execute(message, args){
        if(!message.member.voice.channel) return message.channel.send("you need to be in a voice channel to stop")
        message.member.voice.channel.leave()
    }
}