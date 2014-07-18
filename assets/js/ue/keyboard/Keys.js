/* File: Keys.js */
/* jshint undef: true, unused: true */
/* globals module */

'use strict';

var FUNCTION_KEYS = {
  // Keyboard keys
  keyTab: 9,
  keyBackspace: 8,
  keyEnter: 13,
  keySpace: 32,

  keyPageUp: 33,
  keyPageDown: 34,
  keyEnd: 35,
  keyHome: 36,
  keyInsert: 45,
  keyDelete: 46,

  keyLeftArrow: 37,
  keyUpArrow: 38,
  keyRightArrow: 39,
  keyDownArrow: 40,

  keyShift: 16,
  keyCtrl: 17,
  keyAlt: 18,
  keyEsc: 27,

  keyCapsLock: 20,
  keyNumLock: 144,
  keyScrollLock: 145,

  keyF1: 112,
  keyF2: 113,
  keyF3: 114,
  keyF4: 115,
  keyF5: 116,
  keyF6: 117,
  keyF7: 118,
  keyF8: 119,
  keyF9: 120,
  keyF10: 121,
  keyF11: 122,
  keyF12: 123
};

var IGNORED_KEYS = [
  FUNCTION_KEYS.keyLeftArrow,
  FUNCTION_KEYS.keyUpArrow,
  FUNCTION_KEYS.keyRightArrow,
  FUNCTION_KEYS.keyDownArrow,
  FUNCTION_KEYS.keyCapsLock,
  FUNCTION_KEYS.keyScrollLock,
  FUNCTION_KEYS.keyNumLock,
  FUNCTION_KEYS.keyAlt,
  FUNCTION_KEYS.keyCtrl,
  FUNCTION_KEYS.keyShift,
  FUNCTION_KEYS.keyPageUp,
  FUNCTION_KEYS.keyPageDown,
  FUNCTION_KEYS.keyHome,
  FUNCTION_KEYS.keyEnd,
  FUNCTION_KEYS.keyEnter,
  FUNCTION_KEYS.keyEsc,
  FUNCTION_KEYS.keyInsert,
  FUNCTION_KEYS.keyF1,
  FUNCTION_KEYS.keyF2,
  FUNCTION_KEYS.keyF3,
  FUNCTION_KEYS.keyF4,
  FUNCTION_KEYS.keyF5,
  FUNCTION_KEYS.keyF6,
  FUNCTION_KEYS.keyF7,
  FUNCTION_KEYS.keyF8,
  FUNCTION_KEYS.keyF9,
  FUNCTION_KEYS.keyF10,
  FUNCTION_KEYS.keyF11,
  FUNCTION_KEYS.keyF12
];

var ALLOWED_IN_LOCKED_CONTENT = {
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',

  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12'
};

var Keys = {
  functionKeys: FUNCTION_KEYS,
  ignoredKeys: IGNORED_KEYS,
  allowedKeysInLockedContent: ALLOWED_IN_LOCKED_CONTENT
};

module.exports = Keys;