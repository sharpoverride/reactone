/* File: Keyboard.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var shiftEnterHandler = require('./keyboard/ShiftEnterHandler');
var segmentUnderCurrentSelection = require('./keyboard/SegmentUnderCurrentSelection');

module.exports = {
  ShiftEnterHandler: shiftEnterHandler,
  SegmentUnderCurrentSelection: segmentUnderCurrentSelection
};