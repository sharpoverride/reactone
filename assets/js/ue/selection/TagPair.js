/* File: MouseCtrlClickHandler_test.js */
/* jshint undef: true, unused: true */
'use strict';
var NodeWalker = require('./NodeWalker');

var proto;
/*
 * Creates a tag pair formed of start-tag,
 * end-tag, inner-content.
 * @param {HTMLNode} el - can be any start-tag, inline-content,
 * or end-tag
 */
function TagPair(el) {
  if (el instanceof NodeWalker) {
    el = el.el;
  }
  this.el = el;
  this.walker = new NodeWalker(el);

  this.valid = (!this.walker.isPlaceholder()) && (this.walker.isTag() || this.walker.isTagPairContainer());

  if (this.walker.isStartTag()) {
    this.processFromStartTag();
  } else if (this.walker.isTagPairContainer()) {
    this.processFromTagPairContainer();
  } else if (this.walker.isEndTag()) {
    this.processFromEndTag();
  }
}
proto = TagPair.prototype;
/*
 * @returns {boolean}
 */
proto.isValid = function () {
  return this.valid;
};

proto.processFromStartTag = function () {
  this.startTagEl = this.walker.el;
  this.walker = this.walker.next();
  this.inlineContentEl = this.walker.el;
  this.walker = this.walker.next();
  this.endTagEl = this.walker.el;
};

proto.processFromTagPairContainer = function () {
  this.walker = this.walker.prev();
  this.processFromStartTag();
};

proto.processFromEndTag = function () {
  this.walker = this.walker.prev();
  this.processFromTagPairContainer();
};
/*
 * clones the Tag Pair structure
 * @returns {DocumentFragment} documentFragment
 */
proto.cloneStructure = function () {
  var me = this,
      startTagClone,
      inlineContentClone,
      endTagClone,
      documentFragment = document.createDocumentFragment();

  startTagClone = me.startTagEl.cloneNode(true);
  inlineContentClone = me.inlineContentEl.cloneNode(false);
  endTagClone = me.endTagEl.cloneNode(true);

  documentFragment.appendChild(startTagClone);
  documentFragment.appendChild(inlineContentClone);
  documentFragment.appendChild(endTagClone);

  return documentFragment;
};

proto.toArray = function () {
  return [
    this.startTagEl,
    this.inlineContentEl,
    this.endTagEl
  ];
};

module.exports = TagPair;
