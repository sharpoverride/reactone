/* File: EditorCommands.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var config = require('../config');

var cmds = {
  'paste': {
    handle: function (ev) {
      var text,
          rInvalidChars = /\r?\n/g,
          html = document.createElement('span'),
          clipboard = (ev.originalEvent || ev).clipboardData;

      ev.preventDefault();

      if (clipboard === undefined || clipboard === null) {
        text = window.clipboardData.getData('text') || '';

        if (text !== '') {
          text = text.replace(rInvalidChars, ' ');
          window.getSelection().getRangeAt(0).insertNode(html);
        }

      } else {
        text = clipboard.getData('text/plain') || '';

        if (text !== '') {
          text = text.replace(rInvalidChars, ' ');
          document.execCommand('insertText', false, text);
        }
      }
    }
  }
};

module.exports = cmds;