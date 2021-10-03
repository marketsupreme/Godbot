const cheerio = require('cheerio');
const request = require('request');
const fs = require('fs')

module.exports = {
  name: 'htmlparse',
  description: "parse html duh",
  async getYTvideoId(url) {
    regex1 = String.raw`(\/|%3D|v=)([0-9A-z-_]{11})([%#?&]|$)`
    regex2 = String.raw`(?:http:|https:)*?\/\/(?:www\.|)(?:youtube\.com|m\.youtube\.com|youtu\.|youtube-nocookie\.com).*(?:v=|v%3D|v\/|(?:a|p)\/(?:a|u)\/\d.*\/|watch\?|vi(?:=|\/)|\/embed\/|oembed\?|be\/|e\/)([^&?%#\/\n]*)`
    
    var regex1Match = url.match(regex1)
    if (regex1Match) {
      return regex1Match[2]
    }
    else {
      var regex2Match = url.match(regex2)
      if (regex2Match) {
        return regex2Match[1]
      }
    }

    return ""
  }
}