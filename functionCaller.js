const music = require("./commands/music.js")

module.exports = {
  name: 'funcCall',
  funcCall(...args) {
    switch (args[0]) {
      case "p":
      case "play":
        music.play(args[1])
        break;
      case "skip":
        music.skip(args[1])
        break;
      case "pause":
        music.pause(args[1])
        break;
      case "stop":
        music.stop(args[1])
        break;
      case "resume":
        music.resume(args[1])
        break;
      case "check":
        music.check(args[1])
        break;
      case "volume":
        music.volume(args[1])
        break;
      case "queue":
      case "q":
        music.getQueue(args[1])
        break;
    }
  },
};