/* File: Segment.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var DataProvider = require('./DataProvider');
var TranslationOrigin = require('./TranslationOrigin');

var translationOriginClass = {
  'it': 'transparent',
  'at': 'blue',
  'pm': 'gray',
  'ap': 'yellow',
  'cm': 'green'
};

var dataProvider = DataProvider;
var translationOriginProvider = TranslationOrigin;

var Segment = function (initializer) {
  if (initializer) {
    this.segmentNumber = initializer.ordernumber;
  }

  this.segmentData = dataProvider.getSegmentBySegmentNumber(this.segmentNumber);
};

var proto = Segment.prototype;

proto.displayOriginIcon = function () {
  var me = this,
      lastType,
      originTypes,
      translationOrigin = me.segmentData.translationorigin;

  if (!translationOrigin || !translationOrigin.originType) {
    return false;
  }

  lastType = (translationOrigin.originBeforeAdaptation) ? translationOrigin.originBeforeAdaptation.originType : null;
  originTypes = {'interactive': true, 'source': true};

  if (originTypes[translationOrigin.originType] &&
      translationOrigin.matchPercent === 0 &&
      (translationOrigin.originBeforeAdaptation === null ||
      lastType === null || originTypes[lastType])) {
    return false;
  }

  return true;
};

proto.originClass = function () {
  var me = this,
      translationOrigin = me.segmentData.translationorigin,
      type = TranslationOrigin.originType(translationOrigin),
      className = translationOriginClass[type];

  if (className) {
    return className;
  }

  return translationOrigin.matchPercent < 100 ? 'yellow' : 'green';
};

proto.originText = function () {
  var me = this;

  var t = me.segmentData.translationorigin;
  var type = translationOriginProvider.originType(t);
  var percent = t.matchPercent;

  //look for the first origin Type
  if (t.originBeforeAdaptation !== null && type === 'it') {
    var last = t.originBeforeAdaptation;
    type = TranslationOrigin.originType(last);
    percent = last.matchPercent;
  }

  var sIcon = '';
  var percentTypes = {'fm': true, 'em': true, 'tm': true, 'it': true, 'ap': true };

  if (percentTypes[type]) {
    sIcon = percent + '%';
  } else {
    sIcon = type.toUpperCase();
  }

  return sIcon;
};

proto.segmentInfo = function () {
  var me = this;

  if (me.segmentData === undefined) {
    return '';
  }

  return translationOriginProvider.translationInfo(me.segmentData);
};

proto.statusIcon = function () {
  return this.segmentData.confirmationlevel || 'not-translated';
};

proto.isLockedSegment = function () {
  return this.segmentData.isLocked;
};

proto.isConfirmed = function () {
  var confirmedLevels = [
    'translated',
    'approved-translation',
    'approved-sign-off'
  ];

  var isConfirmed = confirmedLevels.indexOf(this.segmentData.confirmationlevel) !== -1;

  return isConfirmed;
};

proto.changeToDraft = function () {
  var me = this,
      translationOrigin;

  me.segmentData.confirmationlevel = 'draft';
  translationOrigin = me.segmentData.translationorigin;

  if (translationOrigin.originType !== 'interactive') {
    translationOrigin.originBeforeAdaptation = translationOriginProvider.clone(translationOrigin);
    translationOrigin.originType = 'interactive';
  }
};

module.exports = Segment;