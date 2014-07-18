/* File: ShiftEnterHandler.js */
/* jshint undef: true, unused: true */
/* globals require, module */
"use strict";

var Helpers = require('../Helpers');
var SegmentsWatcher = require('../SegmentsWatcher');
var KeyboardBindings = require('../KeyboardBindings');
var Keys = require('./Keys');
var Selection = require('../selection');

var ShiftEnterHandler = function (ev) {
  var me = this,
      isShiftKeyPressed = ev.shiftKey,
      isEnterPressed = ev.keyCode === Keys.functionKeys.keyEnter,
      isHandlingRequired = isShiftKeyPressed && isEnterPressed,
      selection = new Selection.SelectionContext(),
      focusNode = selection.focusNode;

  if (!isHandlingRequired) {
    return;
  }

  me.focus = new Selection.NodeWalker(focusNode);
  me.breakLinesOutsideOfText = [];

  me.moveFocusToTargetSegment();
  me.moveBreakLinesToTextContainers();

  SegmentsWatcher.resize(me.segmentNumber);
};

var proto = ShiftEnterHandler.prototype;

proto.moveFocusToTargetSegment = function () {
  var me = this,
      focus = me.focus;

  while (!focus.isNull() && !focus.isSegment()) {
    focus = focus.parent();
  }

  me.segmentNumber = focus.segmentNumber();
  me.focus = focus;
};

proto.moveBreakLinesToTextContainers = function () {
  var me = this,
      nodeWalker = me.focus;

  me.moveThrough(nodeWalker);
};

proto.moveThrough = function (container) {
  var me = this,
      nodeWalker = container;

  nodeWalker = nodeWalker.firstChild();
  while (!nodeWalker.isNull()) {

    if (nodeWalker.isInlineContent()) {
      me.insertBreakLinesAtStartOf(nodeWalker);
    }

    if (nodeWalker.isElement('br') && nodeWalker.parent().isSegment()) {
      me.breakLinesOutsideOfText.push(nodeWalker);
    }

    if (nodeWalker.isElement('br') && nodeWalker.parent().isTag()) {
      me.moveNodeAfterTheTag(nodeWalker);
    }

    if (nodeWalker.isElement()) {
      me.moveThrough(nodeWalker);
    }

    if (nodeWalker.isTag()) {
      me.exportNewLines(nodeWalker);
      me.insertBreakLinesAfter(nodeWalker);
    }

    if (nodeWalker.isText()) {
      me.convertCarriageReturnToBreak(nodeWalker);
    }

    nodeWalker = nodeWalker.next();
  }
};

proto.insertBreakLinesAtStartOf = function (nodeWalker) {
  var me = this,
      breakLineElement,
      firstChild = nodeWalker.firstChild();

  while (me.breakLinesOutsideOfText.length > 0) {
    breakLineElement = me.breakLinesOutsideOfText.pop();

    if (!firstChild.isNull()) {
      firstChild.insertBefore(breakLineElement);
    } else {
      nodeWalker.append(breakLineElement);
    }
  }
};

proto.insertBreakLinesAfter = function (nodeWalker) {
  var me = this,
      breakLineElement;

  while (me.breakLinesOutsideOfText.length > 0) {
    breakLineElement = me.breakLinesOutsideOfText.pop();

    nodeWalker.insertAfter(breakLineElement);
  }
};

proto.exportNewLines = function (container) {
  var me = this,
      textContent,
      newLinesCount,
      i,
      br;

  if (container.isNull()) {
    return;
  }

  textContent = container.textContent();
  newLinesCount = textContent.split('\n').length - 1;

  for (i = 0; i < newLinesCount; i++) {
    br = Helpers.stringToHTMLElement('<br>');
    me.breakLinesOutsideOfText.push(br);
  }

  if (newLinesCount > 0) {
    me.cleanCarriageReturnFrom(container);
  }
};

proto.cleanCarriageReturnFrom = function (container) {
  var processingQueue = [container],
      nodeValue;

  while (processingQueue.length > 0) {
    var item = processingQueue.pop();

    if (item.isTextNode()) {
      nodeValue = item.el.nodeValue;
      nodeValue = nodeValue.replace('\n', '');
      item.el.nodeValue = nodeValue;
    }

    if (!item.next().isNull()) {
      processingQueue.push(item.next());
    }

    if (!item.firstChild().isNull()) {
      processingQueue.push(item.firstChild());
    }
  }
};

proto.convertCarriageReturnToBreak = function (container) {
  var nodeWalker = container.firstChild();
  var nodeValue;
  var breakNode;
  var carriageReturnNode;
  var parentNode;

  while (!nodeWalker.isNull()) {
    if (nodeWalker.isTextNode()) {
      nodeValue = nodeWalker.el.nodeValue;
      carriageReturnNode = nodeWalker.el;
      parentNode = nodeWalker.el.parentNode;

      if (nodeValue === '\n') {
        breakNode = document.createElement('br');
        parentNode.replaceChild(breakNode, carriageReturnNode);
        nodeWalker.el = breakNode;
      }
    }

    nodeWalker = nodeWalker.next();
  }

};

proto.moveNodeAfterTheTag = function (brNode) {
  var tag = brNode.parent();

  tag.insertAfter(brNode);
};

module.exports = ShiftEnterHandler;