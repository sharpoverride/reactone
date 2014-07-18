/* File: Paragraphs.js */
/* jshint undef: true, unused: true */
/* globals $, require, module, Event */
'use strict';

/**
 *  Paragraphs module
 */

var DataProvider = require('./DataProvider');
var SegmentsWatcher = require('./SegmentsWatcher');
var SideBySideParagraphUnitsRenderer = require('./SideBySideParagraphUnitsRenderer');
var KeyboardBindings = require('./KeyboardBindings');

/**
 * Paragraphs module
 * Displays all Paragraphs from the storage, attaches event handlers
 */
var Paragraphs = (function () {
  var dataProvider = DataProvider,
      segmentsWatcher = SegmentsWatcher,
      formattingMap,
      statusIconClass,
      translationOriginClass;

  formattingMap = {
    'Bold' : 'font-weight: bold',
    'Italic' : 'font-style: italic',
    'Underline' : 'text-decoration: underline',
    'TextColor' : 'color: rgb({{s}})',
    'FontName' : 'font-family: {{s}}',
    'FontSize' : 'font-size: {{s}}px'
  };

  statusIconClass = {
    'NotTranslated': 'not-translated',
    'ApprovedSignOff': 'approved-sign-off',
    'ApprovedTranslation': 'approved-translation',
    'Draft': 'draft',
    'RejectedSignOff': 'rejected-sign-off',
    'RejectedTranslation': 'rejected-translation',
    'Translated': 'translated'
  };

  translationOriginClass = {
    'it': 'transparent',
    'at': 'blue',
    'pm': 'gray',
    'ap': 'yellow',
    'cm': 'green'
  };


  /**
   * Extract segment data from DOM
   * @param {DOMElement} el - an element representing a segment
   */
  function segmentData(el) {
    var data = el.dataset,
        otherSegmentData = dataProvider.segmentsMap[data.ordernumber];

    return {
      id:               data.id,
      puid:             data.puid,
      el:               el,
      otherSegmentData: otherSegmentData
    };
  }

  return {
     /**
     * Render the first set of paragraph units
     */
    renderFirstParagraphs: function () {
      var me = this;
      var cDoc = dataProvider.getCurrentDocument();
      var pOffset = 0;
      var pLimit = cDoc.paragraphCount;

      dataProvider.getParagraphs(cDoc.id, function (err, data) {

        var editorBody = $('#editor-body');
        editorBody.html('');

        me._renderParagraphs(data, cDoc);
      }, pLimit, pOffset);
    },

    _renderParagraphs: function (paragraphs, currentDocument) {
      var sideBySideRenderer = new SideBySideParagraphUnitsRenderer(paragraphs, currentDocument),
          editorBodyEl, keyboardBindings, sourceKeysBind;

      sideBySideRenderer.render();

      editorBodyEl = $(document.getElementById('editor-body'));
      editorBodyEl.append(sideBySideRenderer.sourceSectionEl);
      editorBodyEl.append(sideBySideRenderer.targetSectionEl);

      keyboardBindings = new KeyboardBindings(sideBySideRenderer.targetEditableColumn);
      keyboardBindings.bind();

      sourceKeysBind = new KeyboardBindings(sideBySideRenderer.sourceColumns);
      sourceKeysBind.bind();

      // Trigger window resize to make sure
      // the layout resizes to full page height
      // USE MEDIATOR TO TRIGGER THIS EVENT
      window.dispatchEvent(new Event('resize'));

      segmentsWatcher.resizeContainers();
    },

    /**
     * Load more paragraph units into the view
     *
     */
    loadMoreParagraphs: function () {
      var me = this;

      dataProvider.getNextParagraphs(function (err, data) {
        me.renderParagraphs(data);
      });
    }
  };
})();

module.exports = Paragraphs;