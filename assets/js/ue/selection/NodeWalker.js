/* File: NodeWalker.js */
/* jshint undef: true, unused: true */
/* globals $, module, require */
'use strict';

var Tmpl = require('../Tmpl');

var NodeWalker = function (node) {
  var me = this;

  me.el = node;
  me.returnNode = null;
};

var proto = NodeWalker.prototype;

proto.tagId = function () {
  var me = this,
      el = me.el;

  if (me.isNull() || me.isTextNode()) {
    return null;
  }

  return el.dataset.id;
};

proto.isSegment = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-segment');
};

proto.isInlineContent = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-inline-content');
};

proto.isText = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-text');
};

proto.isTextNode = function () {
  var me = this;

  if (me.isNull()) {
    return false;
  }

  return me.el.nodeType === 3;
};

proto.isTagPairContainer = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-tagpair-content');
};

proto.isTag = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-tag-wrapper');
};

proto.isStartTag = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.dataset.type === 'start-tag';
};

proto.isEndTag = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.dataset.type === 'end-tag';
};

proto.isPlaceholder = function () {
  var me = this;

  if (me.isNull()) {
    return false;
  }

  return me.el.dataset.type === 'placeholder';
};

proto.canHide = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.dataset.canHide;
};

/**
 * Loop over parents and return true if isLoked property is set
 * @return {Boolean} returns true if element or parent is locked
 */
proto.isLocked = function () {
  var me = this,
      node = me.el,
      isLocked = (node.hasOwnProperty('dataset') && node.dataset.isLocked) ? node.dataset.isLocked : false;

  while (!isLocked && node.nodeType !== 9) {
    isLocked = (node.hasOwnProperty('dataset') && node.dataset.isLocked) ? node.dataset.isLocked : false;
    node = node.parentNode;
  }

  return isLocked;
};

proto.isWrapperFor = function (node) {
  var me = this,
      el = me.el;

  return el === node;
};


/**
 * Tests if the cursor is in an empty segment
 * that contains only Zero Width Non-Joiner char
 *
 * @return {Boolean} true if it's an empty segment
 */
proto.isInvisibleChar = function () {
  var me = this,
      el = me.el,
      tmpl = Tmpl,
      textContent = el.textContent,
      isInvisibleChar;

  isInvisibleChar = textContent.length === 1 &&
    textContent.charCodeAt(0) === tmpl.zeroWidthNonJoinerCharCode;

  return isInvisibleChar;
};


proto.isElement = function (name) {
  var me = this,
      el = me.el,
      isElementType = me.el.nodeType === 1,
      checkName = name !== undefined && name !== null,
      result;

  result = isElementType;
  if (checkName) {
    result = result && el.nodeName.toLowerCase() === name;
  }

  return result;
};

proto.isNull = function () {
  var me = this;

  return me.el === null || me.el === undefined;
};

proto.hasChildren = function () {
  var me = this,
      childNodes = me.el.childNodes;

  return childNodes.length !== 0;
};

proto.equals = function (nodeWalker) {
  var me = this;

  if (me.isNull() && nodeWalker.isNull()) {
    return true;
  }

  return me.el === nodeWalker.el;
};

proto.textContent = function () {
  var me = this,
      el = me.el;

  return el.textContent;
};

proto.parent = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.el.parentNode);
  walker.returnNode = returnNode;

  return walker;
};

proto.returnToPrevious = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.returnNode);
  walker.returnNode = returnNode;

  return walker;
};

proto.next = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.el.nextSibling);
  walker.returnNode = returnNode;

  return walker;
};

proto.prev = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.el.previousSibling);
  walker.returnNode = returnNode;

  return walker;
};

proto.remove = function () {
  var me = this,
      parent = me.el.parentNode;
  parent.removeChild(me.el);
};

proto.firstChild = function () {
  var me = this,
      el = me.el,
      firstChild = me.el.firstChild,
      walker;

  walker = new NodeWalker(firstChild);
  walker.returnNode = el;

  return walker;
};

proto.lastChild = function () {
  var me = this,
      el = me.el,
      lastChild = me.el.lastChild,
      walker;

  walker = new NodeWalker(lastChild);
  walker.returnNode = el;

  return walker;
};

proto.replaceWithInnerContent = function () {
  var me = this,
      $el = $(me.el);

  $el.replaceWith($el.children());

  me.el = null;
};

proto.insertBefore = function (node) {
  var me = this,
      el = me.el,
      parent = el.parentNode,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  parent.insertBefore(nodeEl, el);
};

proto.insertAfter = function (node) {
  var me = this,
      el = me.el,
      parent = el.parentNode,
      nextSibling = el.nextSibling,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  parent.insertBefore(nodeEl, nextSibling);
};

proto.append = function (node) {
  var me = this,
      el = me.el,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  el.appendChild(nodeEl);
};

proto.prepend = function (node) {
  var me = this,
      el = me.el,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  el.insertBefore(nodeEl, el.firstChild);
};

proto.segmentNumber = function () {
  var me = this,
      el = me.el;

  return el.dataset.segmentNumber;
};

proto.setCanCopy = function (value) {
  var me = this,
      el = me.el;
  el.dataset.canCopy = value;
};

proto.canCopy = function () {
  var me = this,
      el = me.el;
  return el.dataset.canCopy;
};

proto.hasClass = function (cssClass) {
  var me = this,
      el = me.el;

  return el.classList.contains(cssClass);
};

proto.addClass = function (cssClass) {
  var me = this,
      el = me.el;

  el.classList.add(cssClass);
};

proto.removeClass = function (cssClass) {
  var me = this,
      el = me.el;
  el.classList.remove(cssClass);
};

proto.forEachChild = function (callback) {
  var me = this,
      walker = me.firstChild();

  while (!walker.isNull()) {
    callback(walker);

    walker = walker.next();
  }
};
module.exports = NodeWalker;