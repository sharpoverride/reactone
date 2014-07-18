/* File: Selection.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var nodeWalker = require('./selection/NodeWalker');
var tagPair = require('./selection/TagPair');
var selectionContext = require('./selection/SelectionContext');


module.exports = {
  NodeWalker: nodeWalker,
  SelectionContext: selectionContext,
  TagPair: tagPair
};