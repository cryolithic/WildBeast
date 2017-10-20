'use strict'
let config = require('../../config.json')
let info = {}
var superagent = require('superagent')
var url = require('url')
let reactions = {
  '1⃣': 0,
  '2⃣': 1,
  '3⃣': 2,
  '4⃣': 3,
  '5⃣': 4,
  '❌': 'cancel'
}

// TODO: Proper error messages everyone and finish adding whatever's not added.
// TODO: Something to track how many voice connections are active, Bezerk?

exports.join = function (msg, suffix, bot) {
  // TODO: Make a function that creates the join message so we don't have a hundred line export.
  let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
  if (!chan) {
    if (msg.channel.guild.channels.filter(c => c.type === 2).length === 0) {
      msg.channel.createMessage(`${msg.author.mention}, sorry pal but there are no voice channels I can join.`)
    } else {
      let voiceChan = msg.channel.guild.channels.find(c => c.id === msg.channel.guild.members.find(m => m.id === msg.author.id).voiceState.channelID)
      if (!voiceChan) {
        msg.channel.createMessage(`${msg.author.mention}, join a voice channel before using this command again.`)
      } else {
        if (suffix) {
          if (url.parse(suffix).host === null) {
            resolveTracks(config.musicNodes[0], `ytsearch:${encodeURI(suffix)}`).then(tracks => {
              if (tracks.length === 0) {
                msg.channel.createMessage(`No tracks found.`)
              } else {
                getPlayer(bot, voiceChan).then(() => {
                  msg.channel.createMessage(`join message goes here`)
                  makeGuildInfo(msg, bot, voiceChan, [tracks[0]])
                })
              }
            })
          } else {
            resolveTracks(config.musicNodes[0], suffix).then(tracks => {
              if (tracks.length === 0) {
                msg.channel.createMessage(`No tracks found.`)
              } else {
                getPlayer(bot, voiceChan).then(() => {
                  msg.channel.createMessage(`join message goes here`)
                  makeGuildInfo(msg, bot, voiceChan, tracks)
                })
              }
            })
          }
        } else {
          getPlayer(bot, voiceChan).then(() => {
            msg.channel.createMessage(`join message goes here`)
            makeGuildInfo(msg, bot, voiceChan)
          })
        }
      }
    }
  } else {
    msg.channel.createMessage(`${msg.author.mention}, I am already streaming in this guild.`)
  }
}

exports.leave = function (msg, suffix, bot) {
  let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
  if (!chan) {
    msg.channel.createMessage(`${msg.author.mention}, sorry but i am not in voice.`)
  } else {
    getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
      player.stop()
      player.disconnect()
    }).catch(err => {
      console.log(err)
    })
  }
}

exports.volume = function(msg, suffix, bot) {
  let chan = bot.voiceConnections.find(vc => vc.guildId === msg.channel.guild.id)
  if (!chan) {
    msg.channel.createMessage(`${msg.author.mention}, sorry but i am not in voice.`)
  } else {
    if (!suffix) {
      msg.channel.createMessage(`${msg.author.mention}, the volume is currently ${info[msg.channel.guild.id].volume !== undefined ? info[msg.channel.guild.id].volume : '100'}`)
    } else if(isNaN(suffix)) {
      msg.channel.createMessage(`${msg.author.mention}, use a number between 0-100`)
    } else {
      getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
        player.setVolume(suffix)
        info[msg.channel.guild.id].volume = suffix
        msg.channel.createMessage(`${msg.author.mention}, the volume is now set to ${suffix}`)
      }).catch(err => {
        console.log(err)
      })
    }
  }
}

exports.skip = function (msg, bot) {
  if (info[msg.channel.guild.id].track.length <= 1) {
    if (config.settings.leaveAfterPlaylistEnd) {
      getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
        player.stop()
        player.disconnect()
        delete info[msg.channel.guild.id]
        info[msg.channel.guild.id] = undefined
      })
      msg.channel.createMessage(`The playlist has ended, leaving voice.`)
    } else {
      info[msg.channel.guild.id].track = []
      info[msg.channel.guild.id].title = []
      info[msg.channel.guild.id].length = []
      info[msg.channel.guild.id].requester = []
      info[msg.channel.guild.id].skips = {count: 0, users: []}
      getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
        player.stop()
      })
      msg.channel.createMessage(`The playlist has ended, add more tracks with request.`)
    }
  } else {
    info[msg.channel.guild.id].track.shift()
    info[msg.channel.guild.id].title.shift()
    info[msg.channel.guild.id].length.shift()
    info[msg.channel.guild.id].requester.shift()
    info[msg.channel.guild.id].skips = {count: 0, users: []}
    getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
      if (player.playing) {
        player.stop()
      }
    })
    play(msg, bot)
  }
}

exports.time = function (msg, bot) {
  getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
    if (player.playing) {
      let user = msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]) !== null ? msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]).nick !== null ? msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]).nick : msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]).user.username : info[msg.channel.guild.id].requester[0]
      msg.channel.createMessage(`**Current song:** _${info[msg.channel.guild.id].title[0]}_\n**Requested by:** _${user}_\n:arrow_forward: ${progressBar(Math.round((player.getTimestamp() / info[msg.channel.guild.id].length[0]) * 8))} **[${hhMMss(player.getTimestamp() / 1000)}/${hhMMss(info[msg.channel.guild.id].length[0] / 1000)}]**`)
    }
  })

  function progressBar (percent) {
    let str = ''
    for (let i = 0; i < 8; i++) {
      if (i === percent)
        str += '\uD83D\uDD18'
      else
        str += '▬'
    }
    return str
  }
}

exports.fetchList = function (msg) {
  return new Promise((resolve, reject) => {
    if (info[msg.channel.guild.id] && info[msg.channel.guild.id].track.length >= 1) {
      return resolve(info[msg.channel.guild.id])
    } else {
      return reject()
    }
  })
}

exports.plreq = function (msg, suffix, bot) {
  var link = url.parse(suffix)
  var query = require('querystring').parse(link)
  console.log(query)
  resolveTracks(config.musicNodes[0], suffix).then(tracks => {
    console.log(tracks)
  })
}

exports.testreq = function (msg, suffix, bot) {
  if (url.parse(suffix).host === null) {
    resolveTracks(config.musicNodes[0], `ytsearch:${suffix}`).then(tracks => {
      if (tracks.length === 0) {
        msg.channel.createMessage('no tracks lul')
      } else {
        let titles = tracks.splice(0, 5).map(t => `${t.info.title.indexOf}: ${t.info.title}`)
        msg.channel.createMessage(titles)
      }
    })
  } else {
    resolveTracks(config.musicNodes[0], suffix).then(tracks => {
      if (tracks.length === 0) {
        msg.channel.createMessage('no tracks lul')
      } else {
        let titles = tracks.splice(0, 5).map(t => `${t.info.title.indexOf}: ${t.info.title}`)
        msg.channel.createMessage(titles)
      }
    })
  }
}

exports.search = function (msg, suffix, bot) {
  // TODO: Make the reaction event a function for cleaner code also add voice check.
  resolveTracks(config.musicNodes[0], `ytsearch:${suffix}`).then(tracks => {
    if (tracks.length === 0) {
      msg.channel.createMessage('no tracks lul')
    } else {
      let titles = tracks.slice(0, 5).map((t, index) => `${index + 1}: ${t.info.title}`)
      msg.channel.createMessage(`${titles.join('\n')}\nPlease pick one using 1-5 or use :x: to cancel`).then(ms => {
        ms.addReaction('1⃣').catch(err => {console.log(err)})
        ms.addReaction('2⃣').catch(err => {console.log(err)})
        ms.addReaction('3⃣').catch(err => {console.log(err)})
        ms.addReaction('4⃣').catch(err => {console.log(err)})
        ms.addReaction('5⃣').catch(err => {console.log(err)})
        ms.addReaction('❌').then(() => {
          bot.on('messageReactionAdd', function pick (m, emoji, user) {
            if (m.channel.id === msg.channel.id && user === msg.author.id) {
              if (reactions[emoji.name] !== 'cancel') {
                ms.edit(`You picked ${titles[reactions[emoji.name]]} to play`).then(() => {
                  setTimeout(() => {
                    ms.delete()
                  }, 5000)
                })
                addTracks(msg, bot, [tracks[reactions[emoji.name]]])
                bot.removeListener('messageReactionAdd', pick)
              } else if (reactions[emoji.name] === 'cancel') {
                ms.edit(`Cancelling request.`).then(() => {
                  setTimeout(() => {
                    ms.delete()
                  }, 3000)
                })
                bot.removeListener('messageReactionAdd', pick)
              }
            }
          })
        }, 3000)
      }).catch(console.log)
    }
  }).catch(err => {
    console.log(err)
  })
}

exports.request = function (msg, suffix, bot) {
  // TODO: Move the voice check here.
  if (url.parse(suffix).host === null) {
    resolveTracks(config.musicNodes[0], `ytsearch:${encodeURI(suffix)}`).then(tracks => {
      if (tracks.length === 0) {
        msg.channel.createMessage(`${msg.author.mention}, sorry but i could not find any tracks with those keywords`)
      } else {
        addTracks(msg, bot, [tracks[0]])
      }
    }).catch(err => {
      console.error(err)
    })
  } else {
    // TODO: Maybe fix youtube watch?v=ID&list=smth or throw an error, probably throw.
    resolveTracks(config.musicNodes[0], suffix).then(tracks => {
      if (tracks.length === 0) {
        msg.channel.createMessage(`${msg.author.mention}, sorry but i could not fetch that`)
      } else {
        if (tracks.length === 1) {
          addTracks(msg, bot, [tracks[0]])
        } else {
          addTracks(msg, bot, tracks)
        }
      }
    }).catch(err => {
      console.error(err)
    })
  }
}

function play (msg, bot) {
  getPlayer(bot, info[msg.channel.guild.id].channel).then(player => {
    player.play(info[msg.channel.guild.id].track[0])

    player.on('disconnect', (err) => {
      if (err) {
        console.error(err)
      }
      // do something
    })

    player.on('error', err => {
      if (err) {
        console.error(err)
      }
      // log error and handle it
    })

    player.on('stuck', msg => {
      if (msg) {
        console.error(msg)
      }
      // track stuck event
    })

    player.once('end', data => {
      if (data.reason && data.reason === 'REPLACED' || data.reason && data.reason === 'STOPPED') {
        return
      } else {
        if (info[msg.channel.guild.id].track.length <= 1) {
          if (config.settings.leaveAfterPlaylistEnd) {
            msg.channel.createMessage(`The playlist has ended, leaving voice.`)
            player.disconnect()
            delete info[msg.channel.guild.id]
            info[msg.channel.guild.id] = undefined
          } else {
            msg.channel.createMessage(`The playlist has ended, add more tracks with request.`)
            info[msg.channel.guild.id].track = []
            info[msg.channel.guild.id].title = []
            info[msg.channel.guild.id].length = []
            info[msg.channel.guild.id].requester = []
            info[msg.channel.guild.id].skips = {count: 0, users: []}
          }
        } else {
          info[msg.channel.guild.id].track.shift()
          info[msg.channel.guild.id].title.shift()
          info[msg.channel.guild.id].length.shift()
          info[msg.channel.guild.id].requester.shift()
          info[msg.channel.guild.id].skips = {count: 0, users: []}
          let user = msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]) !== null ? msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]).nick !== null ? msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]).nick : msg.channel.guild.members.get(info[msg.channel.guild.id].requester[0]).user.username : info[msg.channel.guild.id].requester[0]
          msg.channel.createMessage(`Now playing ${info[msg.channel.guild.id].title[0]} [${hhMMss(info[msg.channel.guild.id].length[0] / 1000)}] requested by ${user}`)
          play(msg, bot)
        }
      }
    })
  })
}

exports.getPlayer = getPlayer

function makeGuildInfo (msg, bot, voiceChan, tracks) {
  info[msg.channel.guild.id] = {
    channel: voiceChan,
    track: [],
    title: [],
    length: [],
    requester: [],
    volume: undefined,
    skips: {count: 0, users: []}
  }
  if (tracks) {
    addTracks(msg, bot, tracks)
  }
}

function addTracks (msg, bot, tracks) {
  if (tracks.length > 1) {
    safeLoop(msg, bot, tracks)
  } else {
    if (info[msg.channel.guild.id].track.length === 0) {
      info[msg.channel.guild.id].track.push(tracks[0].track)
      info[msg.channel.guild.id].title.push(tracks[0].info.title)
      info[msg.channel.guild.id].length.push(tracks[0].info.length)
      info[msg.channel.guild.id].requester.push(msg.author.id)
      msg.channel.createMessage(`Now playing ${tracks[0].info.title} [${hhMMss(tracks[0].info.length / 1000)}] requested by ${msg.member !== null ? msg.member.nick !== null ? msg.member.nick : msg.author.username : msg.author.id}`)
      play(msg, bot)
    } else {
      info[msg.channel.guild.id].track.push(tracks[0].track)
      info[msg.channel.guild.id].title.push(tracks[0].info.title)
      info[msg.channel.guild.id].length.push(tracks[0].info.length)
      info[msg.channel.guild.id].requester.push(msg.author.id)
      msg.channel.createMessage(`Added track ${tracks[0].info.title} [${hhMMss(tracks[0].info.length / 1000)}] to the queue by request of ${msg.member !== null ? msg.member.nick !== null ? msg.member.nick : msg.author.username : msg.author.id}.`)
    }
  }
}

function getPlayer (bot, channel) {
  if (!channel || !channel.guild) {
    return Promise.reject('Not a guild channel.')
  }

  let player = bot.voiceConnections.get(channel.guild.id)
  if (player) {
    return Promise.resolve(player)
  }

  let options = {}
  if (channel.guild.region) {
    options.region = channel.guild.region
  }

  return bot.voiceConnections.join(channel.guild.id, channel.id, options)
}

function resolveTracks (node, search) {
  return new Promise((resolve, reject) => {
    superagent.get(`http://${node.host}:2333/loadtracks?identifier=${search}`)
      .set('Authorization', node.password)
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (err) {
          return reject(err)
        } else {
          return resolve(res.body)
        }
      })
  })
}

function safeLoop (msg, bot, tracks) {
  if (tracks.length === 0) {
    msg.channel.createMessage('Done fetching that playlist')
  } else {
    if (info[msg.channel.guild.id].track.length === 0) {
      info[msg.channel.guild.id].track.push(tracks[0].track)
      info[msg.channel.guild.id].title.push(tracks[0].info.title)
      info[msg.channel.guild.id].length.push(tracks[0].info.length)
      info[msg.channel.guild.id].requester.push(msg.author.id)
      msg.channel.createMessage(`Auto playing ${tracks[0].info.title} [${hhMMss(tracks[0].info.length / 1000)}]`)
      play(msg, bot)
      tracks.shift()
      safeLoop(msg, bot, tracks)
    } else {
      info[msg.channel.guild.id].track.push(tracks[0].track)
      info[msg.channel.guild.id].title.push(tracks[0].info.title)
      info[msg.channel.guild.id].length.push(tracks[0].info.length)
      info[msg.channel.guild.id].requester.push(msg.author.id)
      tracks.shift()
      safeLoop(msg, bot, tracks)
    }
  }
}

function hhMMss (time) {
  if (time !== undefined) {
    let hours = (Math.floor(time / ((60 * 60)) % 24))
    let minutes = (Math.floor(time / (60)) % 60)
    let seconds = (Math.floor(time) % 60)
    let parsedTime = []
    hours >= 1 ? parsedTime.push(hours) : null
    minutes >= 10 ? parsedTime.push(minutes) : parsedTime.push(`0${minutes}`)
    seconds >= 10 ? parsedTime.push(seconds) : parsedTime.push(`0${seconds}`)
    return parsedTime.join(':')
  } else {
    return '00:00:00'
  }
}
