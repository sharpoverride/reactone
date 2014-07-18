/* File: SegmentUnderCurrentSelection.js */
/* jshint undef: true, unused: true */
/* globals _ */
'use strict';
function SegmentUnderCurrentSelection() {
  var segmentNumber,
      segmentEl;

  var selection = document.getSelection();
  var focusNode = selection.focusNode;


  if (focusNode === null) {
    return {
      segmentNumber: undefined,
      segmentEl: undefined
    };
  }

  if (focusNode.dataset !== undefined) {
    segmentNumber = focusNode.dataset.segmentNumber;
    segmentEl = focusNode;
  }

  if (segmentNumber === undefined) {
    var parentSegment = $(selection.focusNode).parents('.ue-segment');
    var parentSegmentEl = _(parentSegment).first();

    segmentNumber = parentSegmentEl.dataset.segmentNumber;
    segmentEl = parentSegmentEl;
  }

  return {
    segmentNumber: segmentNumber,
    segmentEl: segmentEl
  };
}

module.exports = SegmentUnderCurrentSelection;