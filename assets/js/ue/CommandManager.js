/* File: CommandManager.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var Commands = require('./commands/EditorCommands');

function CommandManager(options) {
  this.options = options || null;
  this.commands = Commands || null;
}

var proto = CommandManager.prototype;

/**
 * Exscutes commands from the default command object
 * or commands added on the fly
 *
 * @param  {String} command - object property representing a command
 * @param  {Any} args
 */
proto.execute = function (command, args) {
  var me = this,
      cmds = me.commands;

  // Exit, nothing to execute or command not available
  if (!command || !cmds[command] || (!cmds[command].hasOwnProperty('handle') && !(typeof cmds[command].handle === 'function'))) {
    return;
  }

  if (typeof command === 'string') {
    return cmds[command].handle.call(me, args || null);
  }
};



/**
 * Dynamically adds commands to the commands object
 *
 * @param {Object} commandsList
 */
proto.addCommands = function (commandsList) {
  var me = this,
      commands = me.commands,
      command;

  for (command in commandsList) {
    if (commandsList.hasOwnProperty(command)) {
      commands[command] = commandsList[command];
    }
  }
};

/**
 * Delete commands from the commands object
 */
proto.deleteCommands = function () {
  var me = this,
      commands = me.commands,
      commandsList = Array.prototype.slice.call(arguments, 0);

  commandsList.forEach(function (command) {
    delete commands[command];
  });
};

module.exports = CommandManager;