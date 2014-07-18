/* File: SegmentStatusUpdater.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var Mediator = require('./Mediator');
var DataProvider = require('./DataProvider');
var Segment = require('./Segment');
var SegmentsWatcher = require('./SegmentsWatcher');
var SideBySideParagraphUnitsRenderer = require('./SideBySideParagraphUnitsRenderer');

var renderer = new SideBySideParagraphUnitsRenderer();

function segmentStatusUpdate (segmentData) {
  var segment,
      status,
      segmentContainer;

  // Stop changing the status when cursor is
  // in locked segment or locked content
  if (segmentData.stopEditing) {
    return;
  }

  segment = new Segment(segmentData);
  status = renderer.renderStatus(segment);
  segmentContainer = SegmentsWatcher.getContainerBySegmentNumber(segment.segmentNumber);

  segmentContainer.replaceStatusEl(status);
  SegmentsWatcher.resize(segment.segmentNumber);
  SegmentsWatcher.markContainerAsActive(segment.segmentNumber);
};

function jumpToNextUnConfirmedSegment (segmentData) {
  var initialSegment,
      segment;

  initialSegment = segment = new Segment(segmentData);

  do {
    var nextSegmentData = DataProvider.getSegmentBySegmentNumber(+segment.segmentNumber + 1);
    segment = null;

    if (nextSegmentData) {
      segment = new Segment(nextSegmentData);
    }

  } while (segment !== null && segment.isConfirmed());

  if (segment === null) {
    return;
  }

  SegmentsWatcher.markContainerAsInactive(initialSegment.segmentNumber);
  SegmentsWatcher.markContainerAsActive(segment.segmentNumber);
  SegmentsWatcher.focusTarget(segment.segmentNumber);
};

var SegmentStatusUpdater = function () {
  Mediator.subscribe('segment:confirmationLevelChanged', segmentStatusUpdate);
  Mediator.subscribe('segment:jumpToNextUnConfirmed', jumpToNextUnConfirmedSegment);

  Mediator.subscribe('segment:lock', segmentStatusUpdate);
  Mediator.subscribe('segment:unlock', segmentStatusUpdate);

  Mediator.subscribe('segment:stopEditingInLockedContent', segmentStatusUpdate);
};

module.exports = SegmentStatusUpdater();