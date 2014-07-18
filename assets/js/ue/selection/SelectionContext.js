/* File: SelectionContext.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var TextNodeType = 3;
var ElementNodeType = 1;

var SelectionContext = function () {
  var me = this;

  me.selection = document.getSelection();
  me.range = me.selection.getRangeAt(0);

  me.commonAncestorContainer = me.range.commonAncestorContainer;
  me.startContainer = me.range.startContainer;
  me.startOffset = me.range.startOffset;
  me.endContainer = me.range.endContainer;
  me.endOffset = me.range.endOffset;

  me.focusNode = me.selection.focusNode;
  me.focusOffset = me.selection.focusOffset;
  me.focusNodeParents = [];

  me.hasFocusNodeParent = me.focusNode !== null && me.focusNode.parentNode !== null;
  if (me.hasFocusNodeParent) {
    me.focusNodeParent = me.focusNode.parentNode;
  }

  me.isFocusTextNode = me.focusNode.nodeType === TextNodeType;
  me.isStartContainerTextNode = me.startContainer.nodeType === TextNodeType;
  me.isEndContainerTextNode = me.endContainer.nodeType === TextNodeType;
};

var proto = SelectionContext.prototype;

proto.isCollapsed = function () {
  var me = this;
  return me.range.collapsed;
};

proto.cloneContents = function () {
  var me = this;
  return me.range.cloneContents();
};

proto.deleteContents = function () {
  var me = this;

  me.range.deleteContents();
};

proto.insertNode = function (node) {
  var me = this;

  me.range.insertNode(node);
};

proto.hasCommonAncestorClass = function (className) {
  var me = this,
      commonAncestorContainer = me.commonAncestorContainer,
      result;

  if (commonAncestorContainer.nodeType === 3 || commonAncestorContainer === null) {
    return;
  }

  result = commonAncestorContainer.classList.contains(className);
  return result;
};

proto.changeRange = function (changeCallback) {
  var me = this,
    selection = me.selection,
    newRange = document.createRange();

  if (!changeCallback) {
    return;
  }

  if(!changeCallback(newRange)){
    return;
  }

  selection.removeAllRanges();
  selection.addRange(newRange);
};

module.exports = SelectionContext;