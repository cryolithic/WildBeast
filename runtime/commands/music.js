'use strict'
var v = require('../internal/voice.js')
var checkLevel = require('../databases/controllers/permissions.js').checkLevel
var Commands = []

Commands.voice = {
  name: 'voice',
  help: 'I\'ll join a voice channel!',
  aliases: ['join-voice'],
  noDM: true,
  timeout: 10,
  level: 1,
  fn: function (msg, suffix, bot) {
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (!chan) {
      v.join(msg, suffix, bot)
    } else {
      msg.channel.createMessage(`${msg.author.mention} I am already streaming in this guild.`)
    }
  }
}

Commands['leave-voice'] = {
  name: 'leave-voice',
  help: 'I\'ll leave the current voice channel.',
  noDM: true,
  level: 1,
  fn: function (msg, suffix, bot) {
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (!chan) {
      msg.channel.createMessage(`${msg.author.mention} I am not streaming in this guild.`)
    } else {
      v.leave(msg, suffix, bot)
    }
  }
}

Commands.volume = {
  name: 'volume',
  help: 'I\'ll change my volume or return the current volume if you don\'t provide a number!',
  usage: '<nothing/number>',
  aliases: ['vol'],
  noDM: true,
  level: 1,
  fn: function (msg, suffix, bot) {
    v.volume(msg, suffix, bot).then(v => {
      msg.channel.createMessage(v)
    }).catch(err => {
      msg.channel.createMessage(err)
    })
  }
}

Commands.music = {
  name: 'music',
  help: 'I\'ll pause or play the music, just tell me what after the command!',
  aliases: ['pauseplay', 'playpause'],
  noDM: true,
  level: 1,
  fn: function (msg, suffix, bot) {
    v.music(msg, suffix, bot)
  }
}

Commands.skip = {
  name: 'skip',
  help: 'I\'ll skip this song if you don\'t like it.',
  noDM: true,
  level: 2,
  fn: function (msg, suffix, bot) {
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (!chan) {
      msg.channel.createMessage(`${msg.author.mention} I am not streaming in this guild.`)
    } else {
      v.skip(msg, bot)
    }
  }
}

Commands.voteskip = {
  name: 'voteskip',
  help: 'Vote to skip the current playing song.',
  noDM: true,
  level: 1,
  fn: function (msg, suffix, bot) {
    v.voteSkip(msg, bot)
  }
}

Commands.shuffle = {
  name: 'shuffle',
  help: 'Shuffle the current playlist.',
  noDM: true,
  level: 2,
  fn: function (msg, suffix, bot) {
    v.shuffle(msg, bot)
  }
}

Commands.playlist = {
  name: 'playlist',
  help: 'Use delete and a song number to remove it from the list else I will fetch you the playlist I\'m currently playing!',
  usage: '<clear/delete/remove> <number>',
  aliases: ['list'],
  noDM: true,
  timeout: 5,
  level: 0,
  fn: function (msg, suffix, bot) {
    suffix = suffix.toLowerCase().split(' ')
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (chan) {
      if (suffix[0] !== undefined && ['clear', 'delete', 'remove'].indexOf(suffix[0]) > -1) {
        checkLevel(msg, msg.author.id, msg.member.roles).then(x => {
          if (x >= 1) {
            if (suffix[0] === 'clear') {
              v.manageList(msg, 'all').then(r => {
                msg.channel.createMessage(r)
              }).catch(err => {
                msg.channel.createMessage(err)
              })
            } else {
              v.manageList(msg, (suffix[1])).then(r => {
                msg.channel.createMessage(`**${r}** has been removed from the playlist.`)
              }).catch(err => {
                msg.channel.createMessage(err)
              })
            }
          } else {
            msg.channel.createMessage('You do not have the required setlevel for this subcommand, check with the server owner if you should be allowed to do this, required level is 1 or higher.')
          }
        })
      } else {
        v.fetchList(msg).then((r) => {
          var arr = []
          let user = msg.channel.guild.members.get(r.requester[0]) !== null ? msg.channel.guild.members.get(r.requester[0]).nick !== null ? msg.channel.guild.members.get(r.requester[0]).nick : msg.channel.guild.members.get(r.requester[0]).user.username : r.requester[0]
          arr.push('Now playing: **' + r.title[0] + '** Requested by ' + user + '\n')
          for (var i = 1; i < r.title.length; i++) {
            let user = msg.channel.guild.members.get(r.requester[i]) !== null ? msg.channel.guild.members.get(r.requester[i]).nick !== null ? msg.channel.guild.members.get(r.requester[i]).nick : msg.channel.guild.members.get(r.requester[i]).user.username : r.requester[i]
            arr.push((i) + '. **' + r.title[i] + '** Requested by ' + user)
            if (i === 9) {
              if (r.title.length - 10 !== 0) arr.push('And about ' + (r.title.length - 10) + ' more songs.')
              break
            }
          }
          msg.channel.createMessage(arr.join('\n')).then((m) => {
            setTimeout(() => {
              m.delete()
            }, 30000)
          })
        }).catch(() => {
          msg.channel.createMessage('It appears that there aren\'t any songs in the current queue.')
        })
      }
    } else {
      msg.channel.createMessage('I am not streaming music in this server.')
    }
  }
}

Commands.time = {
  name: 'time',
  help: 'get the current time / time left of the current track',
  noDM: true,
  timeout: 10,
  level: 1,
  fn: function (msg, suffix, bot) {
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (!chan) {
      msg.channel.createMessage(`${msg.author.mention} I am not streaming in this guild.`)
    } else {
      v.time(msg, bot)
    }
  }
}

Commands.plreq = {
  name: 'plreq',
  help: 'none',
  noDM: true,
  usage: 'link',
  timeout: 10,
  level: 1,
  fn: function (msg, suffix, bot) {
    v.plreq(msg, suffix, bot)
  }
}

Commands.testreq = {
  name: 'testreq',
  help: 'none',
  noDM: true,
  usage: 'link',
  timeout: 10,
  level: 1,
  fn: function (msg, suffix, bot) {
    v.testreq(msg, suffix, bot)
  }
}

Commands.search = {
  name: 'search',
  help: 'Use this to search for songs on youtube',
  noDM: true,
  usage: 'keywords to search youtube',
  timeout: 10,
  level: 1,
  fn: function (msg, suffix, bot) {
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (!chan) {
      msg.channel.createMessage(`${msg.author.mention}, sorry but i am not in voice.`)
    } else if (!suffix) {
      msg.channel.createMessage(`<@${msg.author.id}>, Please enter something to search for!`)
    } else {
      v.search(msg, suffix, bot)
    }
  }
}

Commands.request = {
  name: 'request',
  help: 'Use this to request songs!',
  aliases: ['queue'],
  noDM: true,
  usage: 'link or keywords to search youtube',
  timeout: 10,
  level: 1,
  fn: function (msg, suffix, bot) {
    let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
    if (!chan) {
      msg.channel.createMessage(`${msg.author.mention}, sorry but i am not in voice.`)
    } else if (!suffix) {
      msg.channel.createMessage(`<@${msg.author.id}>, Please enter something to search for!`)
    } else {
      v.request(msg, suffix, bot)
    }
  }
}

exports.Commands = Commands
