/* File: Tmpl.js */
/* jshint undef: true, unused: true */
/* globals $, module */
'use strict';
var h = require ('./Helpers').stringToHTMLElement;

module.exports = {
  fileStatus: '<span data-type="status-message"><%= status %></span>',

  segment: '<div class="ue-segment"/>',
  cell: '<div class="ue-cell"/>',
  sourceSection: '<section class="col-xs-6 wrapper-west"/>',
  targetSection: '<section class="col-xs-6 wrapper-east"/>',

  gutterColumn: '<div class="ue-gutter"/>',
  sourceColumn: '<div class="ue-source" spellcheck="false"/>',
  statusColumn: '<div class="ue-status"/>',
  targetColumn: '<div class="ue-target" spellcheck="true"/>',

  editableTrue: '<div class="ue-editable" contenteditable="true"/>',
  editableFalse: '<div class="ue-editable" contenteditable="false"/>',

  fileTagStart: '<div class="ue-file"><span class="ue-tag ue-tag-start ue-tag-file"></span></div>',
  fileTagEnd: '<div class="ue-file"><span class="ue-tag ue-tag-end ue-tag-file"></span></div>',

  file: '<div class="ue-editable" contenteditable="true"/>',

  tagPairStart: '<span class="ue-tag ue-tag-start" contenteditable="false"/>',
  tagPairEnd: '<span class="ue-tag ue-tag-end" contenteditable="false"/>',

  placeholderTag: '<span class="ue-tag" contenteditable="false"/>',
  text: '<span class="ue-text"/>',

  tagLockedStart: '<span class="ue-tag ue-tag-locked-start" contenteditable="false"/>',
  tagLockedEnd: '<span class="ue-tag ue-tag-locked-end" contenteditable="false"/>',

  inlineContentWrapper: '<div class="ue-inline-content"></div>',
  lockedContentWrapper: '<div class="ue-locked-content"></div>',

  tagWrapper: '<span class="ue-tag-wrapper"/>',

  // Status icons
  statusIconSegmentLocked: '<i class="status-icon-segment-state-loked"/>',

  // Activity indicator
  // The message can be changed by overriding
  // data-activity-message attribute
  activityIndicator:
    '<div class="ue-activity-indicator-wrapper">' +
      '<div class="ue-activity-indicator" data-activity-message="Loading ...">' +
        '<div class="spinner"></div>' +
      '</div>' +
    '</div>',

  // zeroWidthNonJoiner - invisible character
  zwnj: '&zwnj;',
  zeroWidthNonJoinerCharCode: 8204,


  keyTab: {
    charCode: 9,
    unicode: '\u0009',
    entity: '&#09;'
  },

  statusColumnWrapper: function (order) {
    return '<div class="col-' + order + '"/>';
  },

  targetSegmentBuilder: function () {
    var me = this,
        targetSegment;

    targetSegment = $(me.segment);//.append(me.zwnj);

    return targetSegment;
  },

  tagPairStartBuilder: function (displayText) {
    var me = this,
        startTag,
        wrapper;

    startTag = $(me.tagPairStart);
    startTag.html(displayText);

    wrapper = $(me.tagWrapper).append(startTag).append(me.zwnj);
    wrapper[0].dataset.type = 'start-tag';

    return wrapper;
  },

  tagPairEndBuilder: function (displayText) {
    var me = this,
        endTag,
        wrapper;

    endTag = $(me.tagPairEnd);
    endTag.html(displayText);

    wrapper = $(me.tagWrapper).append(endTag).append(me.zwnj);
    wrapper[0].dataset.type = 'end-tag';

    return wrapper;
  },

  placeholderTagBuilder: function (displayText) {
    var me = this,
        placeholder,
        wrapper;

    placeholder = $(me.placeholderTag);
    placeholder.html(displayText);

    wrapper = $(me.tagWrapper).append(placeholder).append(me.zwnj);
    wrapper[0].dataset.type = 'placeholder';

    return wrapper;
  },

  lockedContentStartTagBuilder: function () {
    var me = this,
        startTag,
        wrapper;

    startTag = $(me.tagLockedStart);
    startTag.html(me.zwnj);

    wrapper = $(me.tagWrapper).append(startTag).append(me.zwnj);
    wrapper[0].dataset.type = 'start-tag';

    return wrapper;
  },

  lockedContentEndTagBuilder: function () {
    var me = this,
        endTag,
        wrapper;

    endTag = $(me.tagLockedEnd);
    endTag.html(me.zwnj);

    wrapper = $(me.tagWrapper).append(endTag).append(me.zwnj);
    wrapper[0].dataset.type = 'end-tag';

    return wrapper;
  },

  buildSegmentInlineContent: function () {
    var me = this,
        inlineContent = h(me.inlineContentWrapper);

    inlineContent.appendChild(h(me.zwnj));

    return inlineContent;
  }
};