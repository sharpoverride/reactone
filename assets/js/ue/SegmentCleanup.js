/* File: SegmentCleanup.js */
'use strict';
var SegmentWatcher = require('./SegmentsWatcher');
var NodeWalker = require('./selection/NodeWalker');
var Tmpl = require('./Tmpl');

var proto;

function SegmentCleanup(segmentNo) {
  this.segment = SegmentWatcher.getTargetEl(segmentNo);
  this.walker = new NodeWalker(this.segment);
}

proto = SegmentCleanup.prototype;

proto.cleanStructure = function () {
  var me = this,
    walker = me.walker;

  if (!walker.isSegment()) {
    throw 'The structure must begin processing at segment level.';
  }

  me.ensureInlineContentExists();
  me.processStartOfSegment();
  me.processEndOfSegment();

  me.processTextElements();

};

proto.ensureInlineContentExists = function () {
  var me = this,
    walker = me.walker;

  walker = walker.firstChild();
  while (!walker.isNull() && !walker.isInlineContent()) {
    walker = walker.next();
  }

  if (walker.isInlineContent()) {
    return;
  }

  walker = me.walker;

  walker.append(Tmpl.buildSegmentInlineContent());
};

proto.processStartOfSegment = function () {
  var me = this,
    walker = me.walker,
    collectElementsToBeMoved = [];

  walker = walker.firstChild();
  if (walker.isInlineContent()) {
    return;
  }

  while (!walker.isNull() && !walker.isInlineContent()) {
    collectElementsToBeMoved.push(walker.el);
    walker = walker.next();
  }

  collectElementsToBeMoved.forEach(function (val) {
    walker.prepend(val);
  });
};

proto.processEndOfSegment = function () {
  var me = this,
    walker = me.walker,
    collectElementsToBeMoved = [];

  walker = walker.lastChild();

  while (!walker.isNull() && !walker.isInlineContent()) {
    collectElementsToBeMoved.push(walker.el);
    walker = walker.prev();
  }

  collectElementsToBeMoved.forEach(function (val) {
    walker.append(val);
  });
};

proto.processTextElements = function () {
  var me = this,
    walker = me.walker,
    processQueue = [],
    transformationRequired = {},
    trackingId = 0,
    tagIdentified;

  processQueue.push(walker.firstChild());

  function pushToQueue(child) {
    processQueue.push(child);
  }

  while (processQueue.length > 0) {
    walker = processQueue.pop();
    if (!walker.isTextNode()) {
      walker.forEachChild(pushToQueue);
    }

    if (walker.isTag() && walker.parent().isText()) {
      tagIdentified = walker;
      walker = walker.parent();
      if (!walker.el.dataset.trackingId) {
        transformationRequired[trackingId] = tagIdentified;
        walker.el.dataset.trackingId = trackingId;
        trackingId++;
      }
    }
  }

  for (trackingId in transformationRequired) {
    var prev, next, parent;

    walker = transformationRequired[trackingId];
    prev = walker.prev();
    next = walker.next();
    parent = walker.parent();

    if (!prev.isNull() && prev.isTextNode()) {
      me.moveTextNodeOutside(prev);
    }

    if (walker.isPlaceholder()) {
      me.movePlaceholderOutside(walker);
    }

    if (!next.isNull() && next.isTextNode()) {
      me.moveTextNodeOutside(next);
    }

    parent.remove();
  }
};

proto.moveTextNodeOutside = function (nodeWalker) {
  var parent,
    parentEl,
    parentClone;

  parent = nodeWalker.parent();
  parentEl = parent.el;
  parentClone = parentEl.cloneNode(false);
  parentClone.appendChild(nodeWalker.el);
  parent.insertAfter(parentClone);
};

proto.movePlaceholderOutside = function (placeholder) {
  var parent = placeholder.parent();

  parent = placeholder.parent();
  parent.insertAfter(placeholder);
};
module.exports = SegmentCleanup;