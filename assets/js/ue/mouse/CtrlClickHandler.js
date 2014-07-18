/* File: CtrlClickHandler.js */
/* jshint undef: true, unused: true */
/* globals _ */
'use strict';
var helpers = require('../Helpers');
var dataProvider = require('../DataProvider');

var Mediator = require('../Mediator');
var Segment = require('../Segment');
var Keyboard = require('../Keyboard');
var NodeWalker = require('../selection').NodeWalker;
var TagPair = require('../selection').TagPair;
var SelectionContext = require('../selection').SelectionContext;

function MouseCtrlClickHandler() {
}
var proto = MouseCtrlClickHandler.prototype;

/**
 * Inserts tags or wraps selections with tags
 * @param  {Object} ev jQuery event object
 */
proto.handle = function (ev) {
  var me = this,
      tag, tags,
      placeholderClone,
      currentSegment = Keyboard.SegmentUnderCurrentSelection(),
      currentSegmentNumber = currentSegment.segmentNumber,
      isSelectionInSource, isCollapsed,
      segment, segmentData,
      startContainer;

  tag = new NodeWalker(ev.currentTarget);
  tags = document.createDocumentFragment();

  if (!tag.isTag()) {
    return;
  }

  if (tag.isPlaceholder()) {
    placeholderClone = tag.el.cloneNode(true);
    me.clearActiveClass(placeholderClone);
    me.disableTagCopy(placeholderClone);
    tags.appendChild(placeholderClone);
  } else {
    tag = new TagPair(tag);
    tags = tag.cloneStructure();
    me.clearActiveClass(tags.childNodes[0]);
    me.clearActiveClass(tags.childNodes[2]);

    me.disableTagCopy(tags.childNodes[0]);
    me.disableTagCopy(tags.childNodes[2]);
  }

  me.range = new SelectionContext();
  startContainer = me.range.startContainer;

  if (!startContainer) {
    return;
  }

  isCollapsed = me.range.isCollapsed();

  isSelectionInSource = helpers.hasParent(startContainer, 'ue-source');

  // Check if selection is in source
  if (isSelectionInSource) {
    return;
  }

  // If CTRL key is pressed and clicked
  // mouse button is left button, insert tag
  if (ev.ctrlKey && ev.which === 1) {
    if (isCollapsed) {
      me.insertTagAtCursor(tags);
    } else {
      me.insertTagOverSelection(tags);
    }

    // Change segment status to draft after tag insertion
    segmentData = dataProvider.getSegmentBySegmentNumber(currentSegmentNumber);
    segment = new Segment(segmentData);
    segment.changeToDraft();

    // Publish segment status has changed
    Mediator.publish('segment:confirmationLevelChanged', segmentData);
    ev.preventDefault();
  }
};

proto.clearActiveClass = function (tagWrapper) {
  var tag = tagWrapper.firstChild;
  tag.classList.remove('active');
};

proto.disableTagCopy = function (tagWrapper) {
  tagWrapper.dataset.tagCopy = false;
};

/**
 * Inserts the clicked tag at the current cursor position
 * @param  {DocumentFragment}  tags
 */
proto.insertTagAtCursor = function (tags) {
  var me = this,
      html = document.createDocumentFragment(),
      range = me.range,
      insertedNode = tags.firstChild,
      focusNode = insertedNode.lastChild;// I expect the invisible char to be here.

  html.appendChild(tags);

  range.insertNode(html);
  me.setCursorAt(focusNode);
};

proto.setCursorAt = function (focusNode){
  var me = this,
      range = me.range;

  if(focusNode === null || focusNode === undefined){
    return;
  }

  _.delay(function () {
    range.changeRange(function(newRange){
      var selectionOffset = 1;
      newRange.setStart(focusNode, selectionOffset);
      newRange.setEnd(focusNode, selectionOffset);

      return true;
    });
  });
};

/**
 * Wraps selection and inserts it at the current cursor position
 * @param  {DocumentFragment}  tags
 */
proto.insertTagOverSelection = function (tags) {
  var me = this,
      html = document.createDocumentFragment(),
      range = me.range,
      documentFragment,
      inlineContent;

  documentFragment = range.cloneContents();

  html.appendChild(tags);

  inlineContent = html.querySelector('.ue-inline-content');
  if (inlineContent !== null) {
    inlineContent.appendChild(documentFragment);
  }

  range.deleteContents();
  range.insertNode(html);
  me.selectContent(inlineContent);
};

proto.selectContent = function (inlineContent) {
  var me = this,
      range = me.range;

  if(inlineContent === undefined || inlineContent === null){
    return;
  }

  range.changeRange(function (range) {
    range.selectNodeContents(inlineContent);

    return true;
  });
};

module.exports = MouseCtrlClickHandler;