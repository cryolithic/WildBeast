/**
 * Index all commands
 * The name of the file will be used as the command name
 * Commands can be multiple directories deep
 * @type {Object}
 */

const dirreq = require('../internal/dir-require')
const Command = require('../classes/Command')
const commands = dirreq('src/commands/**/*.js')
const final = {
  commands: {},
  aliases: new Map()
}

Object.keys(commands).forEach(x => {
  /* eslint-disable no-throw-literal */
  try {
    if (!(commands[x] instanceof Command)) throw `Command ${x} is not a WildBeast command, skipping`
    if (final.commands[x]) throw `Can't index command ${x}, this command is duplicated, skipping`
    final.commands[x] = commands[x]
    if (commands[x].props.aliases && Array.isArray(commands[x].props.aliases)) {
      commands[x].props.aliases.forEach(y => {
        if (y.length < 1) throw `Aliases must be at least 1 character, an alias from ${x} is not, skipping`
        if (final.commands[y]) throw `Can't use ${y} as an alias, there's a command with this name, skipping`
        if (final.aliases.has(y)) throw `Can't set ${y} as an alias of ${x}, this alias already exists, skipping`
        final.aliases.set(y, x)
      })
    }
  } catch (e) {
    logger.error('COMMANDS', e)
  }
})

logger.trace('COMMANDS', final)
module.exports = final
