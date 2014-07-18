/* File: SideBySideParagraphUnitsRenderer.js */
/* jshint undef: true, unused: true */
/* globals _, console, require, module */
'use strict';

var config = require('./config');
var Helpers = require('./Helpers');
var Tmpl = require('./Tmpl');
var SegmentsWatcher = require('./SegmentsWatcher');
var NodeWrapper = require('./NodeWrapper');
var TagContentBuilder = require('./renderer/TagContentBuilder');
var StylesMap = require('./renderer/StylesMap');

var SideBySideParagraphUnitsRenderer = function (paragraphs, ueDocument) {
  var me = this;

  me.paragraphs = paragraphs;
  me.ueDocument = ueDocument;

  me.tmpl = Tmpl;
  me.segmentsWatcher = SegmentsWatcher;

  me.sourceSectionEl = $(me.tmpl.sourceSection);
  me.targetSectionEl = $(me.tmpl.targetSection);

  me.segmentNumbers = $(me.tmpl.gutterColumn);
  me.sourceColumns = $(me.tmpl.sourceColumn);
  me.segmentStatus = $(me.tmpl.statusColumn);
  me.targetColumns = $(me.tmpl.targetColumn);

  me.sourceEditableColumn = $(me.tmpl.editableFalse);
  me.targetEditableColumn = $(me.tmpl.editableTrue);

  me.fileStart = $(me.tmpl.fileTagStart);
  me.fileEnd = $(me.tmpl.fileTagEnd);

  me.isTagCopyAllowed = false;

};

var renderer = SideBySideParagraphUnitsRenderer;

renderer.prototype.render = function () {
  var me = this;

  me.assignEditableColumnsLang();
  me.assignDocumentName();
  me.appendStructure();
  me.appendFileStart();
  me.appendEditableColumns();
  me.processParagraphs();
  me.appendFileEnd();
};


/**
 * Add lang attribute to content editable elements
 */
renderer.prototype.assignEditableColumnsLang = function () {
  var me = this,
      docData = me.ueDocument.data,
  columns = {
    source: me.sourceColumns,
    target: me.targetColumns
  };

  _.forEach(columns, function (column, columnName) {
    column.prop('lang',
      docData[columnName + 'LanguageCode']);
  });
};

renderer.prototype.assignDocumentName = function () {
  var me = this;
  [me.fileStart, me.fileEnd].forEach(function (fileTag) {
    fileTag[0].firstChild.dataset.displayContent = me.ueDocument.data.name;
  });
};

renderer.prototype.appendStructure = function () {
  var me = this;

  me.sourceSectionEl.append(me.segmentNumbers);
  me.sourceSectionEl.append(me.sourceColumns);
  me.targetSectionEl.append(me.segmentStatus);
  me.targetSectionEl.append(me.targetColumns);
};

renderer.prototype.appendFileStart = function () {
  var me = this;

  me.segmentNumbers.append($(me.tmpl.cell).html(me.tmpl.zwnj));
  me.sourceEditableColumn.append(me.fileStart);
  me.segmentStatus.append($(me.tmpl.cell).html(me.tmpl.zwnj));
  me.targetEditableColumn.append(me.fileStart.clone());
};

renderer.prototype.appendEditableColumns = function () {
  var me = this;

  me.sourceColumns.append(me.sourceEditableColumn);
  me.targetColumns.append(me.targetEditableColumn);
};

renderer.prototype.processParagraphs = function () {
  var me = this,
      paragraphSegments;

  me.paragraphs.forEach(function (paragraphItem) {
    paragraphSegments = new NodeWrapper(paragraphItem).segments();
    me.renderSegments(paragraphSegments);
  });
};

renderer.prototype.renderSegments = function (paragraphSegments) {
  var me = this;

  paragraphSegments.forEach(function (paragraph) {
    me.renderSource(paragraph.source);
    me.renderTarget(paragraph.target);
  });
};

renderer.prototype.renderSource = function (source) {
  var me = this,
      segment = source,
      segmentData, formatting, segmentNumberEl,
      segmentSourceEl, segmentStatusEl;

  me.isTagCopyAllowed = true;

  if (source.type === 'tagPair') {
    segmentData = me._findSegment(source);
    segment = segmentData.segment;
    formatting = segmentData.formatting || {};
  }

  me.segmentsWatcher.watchSegment(segment.segmentNumber);

  segmentNumberEl = me.renderSegmentNumber(segment);
  segmentSourceEl = me.renderSourceSegment(segment, formatting);
  segmentStatusEl = me.renderStatus(segment);

  me.segmentNumbers.append(segmentNumberEl);
  me.sourceEditableColumn.append(segmentSourceEl);
  me.segmentStatus.append(segmentStatusEl);
  me.segmentsWatcher.setSource(segmentSourceEl);
  me.segmentsWatcher.groupAdd(segmentNumberEl);
  me.segmentsWatcher.setStatus(segmentStatusEl);
};

renderer.prototype.renderTarget = function (target) {
  var me = this,
      segment = target,
      segmentData, formatting, segmentTargetEl;

  me.isTagCopyAllowed = false;

  if (target.type === 'tagPair') {
    segmentData = me._findSegment(target);
    segment = segmentData.segment;
    formatting = segmentData.formatting || {};
  }

  me.segmentsWatcher.watchSegment(segment.segmentNumber);
  segmentTargetEl = me.renderTargetSegment(segment, formatting);
  me.targetEditableColumn.append(segmentTargetEl);
  me.segmentsWatcher.setTarget(segmentTargetEl);
};

renderer.prototype._findSegment = function (container) {
  var segment = container,
      formatting = segment.formattingGroup || {}; // cache tagpair formatting

  while (segment !== null && segment.type === 'tagPair') {
    if (segment.children.length === 0) {
      return null;
    }

    segment = segment.children[0];
  }

  // return segment and tagpair formatting
  return {
    segment: segment,
    formatting: formatting
  };
};

renderer.prototype.renderSegmentNumber = function (segment) {
  var me = this,
      segmentNumberEl = $(me.tmpl.cell);

  segmentNumberEl.html(segment.segmentNumber);

  return segmentNumberEl;
};

renderer.prototype.renderSourceSegment = function (segment, formatting) {
  var me = this,
      segmentSourceEl = $(me.tmpl.segment),
      inlineContent = me._renderInlineContent(segment.children),
      sourceDataset;

  // If segment is locked, add 'ue-locked' class to segment element
  if (segment.isLocked) {
    segmentSourceEl[0].classList.add('ue-segment-locked');
    segmentSourceEl[0].dataset.isLocked = segment.isLocked;
  }

  if (formatting) {
    inlineContent[0].dataset.style = JSON.stringify(formatting.items);
    inlineContent[0].style.cssText = me._prepareFormatting(formatting);
  }

  segmentSourceEl.append(inlineContent);

  sourceDataset = segmentSourceEl[0].dataset;
  sourceDataset.sourceSegmentNumber = segment.segmentNumber;
  sourceDataset.sourcePuid = segment.puid();

  return segmentSourceEl;
};

renderer.prototype.renderStatus = function (segment) {
  var me = this,
      segmentStatusEl = $(me.tmpl.cell),
      segmentStatusContent = me._renderSegmentStatus(segment);

  segmentStatusEl.append(segmentStatusContent);
  segmentStatusEl.attr('title', segment.segmentInfo());

  return segmentStatusEl;
};

renderer.prototype.renderTargetSegment = function (segment, formatting) {
  var me = this,
      segmentTargetEl = me.tmpl.targetSegmentBuilder(),
      inlineContent = me._renderInlineContent(segment.children),
      targetDataset;

  // If segment is locked, add 'ue-segment-locked' class to segment element
  if (segment.isLocked) {
    segmentTargetEl[0].classList.add('ue-segment-locked');
    segmentTargetEl[0].dataset.isLocked = segment.isLocked;
    segmentTargetEl[0].dataset.segmentNumber = segment.segmentNumber;
  }

  // If we have formating add it to the inline content
  if (formatting) {
    inlineContent[0].dataset.style = JSON.stringify(formatting.items);
    inlineContent[0].style.cssText = me._prepareFormatting(formatting);
  }

  // Add Zero Width Non-Joiner as the first character
  // inside first "ue-inline-content" container
  inlineContent.prepend(me.tmpl.zwnj);
  segmentTargetEl.append(inlineContent);

  targetDataset = segmentTargetEl[0].dataset;
  targetDataset.segmentNumber = segment.segmentNumber;
  targetDataset.puid = segment.puid();

  return segmentTargetEl;
};

renderer.prototype.appendFileEnd = function () {
  var me = this;

  me.segmentNumbers.append($(me.tmpl.cell).html(me.tmpl.zwnj));
  me.sourceEditableColumn.append($(me.fileEnd));
  me.segmentStatus.append($(me.tmpl.cell).html(me.tmpl.zwnj));
  me.targetEditableColumn.append(me.fileEnd.clone());
};

renderer.prototype._renderSegmentStatus = function (segment) {
  var me = this,
      info = me._renderSegmentStatusIcon(segment),
      origin = me._renderSegmentOrigin(segment),
      status = me._renderSegmentStateIcon(segment);

  return [ info, origin, status ];
};

renderer.prototype._renderSegmentStatusIcon = function (segment) {
  var me = this,
      statusIconEl = $('<i/>').addClass('status-icon-' + segment.statusIcon());

  return $(me.tmpl.statusColumnWrapper('first')).append(statusIconEl);
};

renderer.prototype._renderSegmentOrigin = function (segment) {
  var me = this,
      segmentOriginEl = $('<div/>');

  if (segment.displayOriginIcon()) {
    segmentOriginEl = $('<div class="ue-translation-origin-' +
                          segment.originClass() + '">' +
                          segment.originText() + '</div>');
  }

  return $(me.tmpl.statusColumnWrapper('second')).append(segmentOriginEl);
};

/**
 * Render status third column icon
 * @param  {Object} segment
 * @return {Array}  jQuery wrapped set
 */
renderer.prototype._renderSegmentStateIcon = function (segment) {
  var me = this,
      segmentStateEl,
      isLocked = segment.isLockedSegment();

  if (isLocked) {
    segmentStateEl = $(me.tmpl.statusIconSegmentLocked);
  }

  return $(me.tmpl.statusColumnWrapper('third')).html(segmentStateEl);
};

renderer.prototype._renderInlineContent = function (children) {
  var me = this,
      content = [],
      inlineItems;

  if (!children) {
    return content;
  }

  children.forEach(function (inline) {
    inlineItems = me._renderInline(inline);
    content = content.concat(inlineItems);
  });

  return $(me.tmpl.inlineContentWrapper).append(content);
};


/**
 * Render text
 * @param  {Object} data
 * @return {Array}
 */
renderer.prototype._renderText = function (data) {
  var me = this,
      tmpl = me.tmpl,
      html = Helpers.stringToHTMLElement(tmpl.text),
      htmlEl = $(html);

  html.dataset.type = 'text';
  htmlEl.html(data.text);

  return [ htmlEl ];
};

/**
 * Render tags
 * @param  {Object} data
 * @return {Array}
 */
renderer.prototype._renderTagPair = function (data) {
  var me = this,
      tagPairStart,
      tagPairEnd,
      tagPair = [],
      inlineContent,
      inlineContentEl,
      tagPairStartContent,
      tagPairEndContent,
      tagPairContent = (new TagContentBuilder(config.tagDisplayContext.tagDisplayMode)).build(data),
      escapeHTML = Helpers.escapeHTML,
      tagDisplayContext = (config.tagDisplayContext.showFormatting === false);

  if (typeof tagPairContent === 'object') {
    tagPairStartContent = tagPairContent.tagStart;
    tagPairEndContent = tagPairContent.tagEnd;
  } else {
    tagPairStartContent = tagPairEndContent = tagPairContent;
  }

  // Build start & end tag
  tagPairStart = me.tmpl.tagPairStartBuilder();
  tagPairEnd = me.tmpl.tagPairEndBuilder();

  // This needs to be changed
  tagPairStart[0].childNodes[0].dataset.displayContent = tagPairStartContent;
  tagPairEnd[0].childNodes[0].dataset.displayContent = tagPairEndContent;

  // Add data-* attributes to tagpair
  tagPairStart[0].dataset.tagCopy = me.isTagCopyAllowed;
  tagPairEnd[0].dataset.tagCopy = me.isTagCopyAllowed;

  tagPairStart[0].dataset.id = data.id;
  tagPairEnd[0].dataset.id = data.id;

  tagPairStart[0].dataset.metadata = data.metadata;
  tagPairEnd[0].dataset.metadata = data.metadata;

  // If we have canHide property, add it to the tags
  if (data.canHide !== undefined) {
    tagPairStart[0].dataset.canHide = data.canHide;
    tagPairEnd[0].dataset.canHide = data.canHide;

    if (tagDisplayContext && data.canHide) {
      tagPairStart[0].classList.add('hide');
      tagPairEnd[0].classList.add('hide');
    }
  }

  tagPair.push(tagPairStart);

  inlineContent = me._renderInlineContent(data.children);
  inlineContent.addClass('ue-tagpair-content');

  inlineContentEl = inlineContent[0];
  inlineContentEl.dataset.type = 'tagpair';
  inlineContentEl.dataset.id = data.id;
  inlineContentEl.dataset.definitionid = data.tagPairDefinitionId;
  inlineContentEl.dataset.metadata = data.metadata;

  tagPairStart[0].dataset.id = data.id;
  tagPairEnd[0].dataset.id = data.id;

  // Reder styles if we have a formattingGroup
  if (data.formattingGroup) {
    inlineContent[0].dataset.style = JSON.stringify(data.formattingGroup.items);
    inlineContent[0].style.cssText = me._prepareFormatting(data.formattingGroup);
  }

  tagPair.push(inlineContent);
  tagPair.push(tagPairEnd);

  me.segmentsWatcher.addTagPair(data.id, [tagPairStart, tagPairEnd]);

  return tagPair;
};


/**
 * Render placeholders
 * @param  {Object} data
 * @return {Array}
 */
renderer.prototype._renderPlaceholder = function (data) {
  var me = this,
      tmpl = me.tmpl,
      placeholder,
      placeholderEl,
      placeholderContent = (new TagContentBuilder(config.tagDisplayContext.tagDisplayMode)).build(data),
      escapeHTML = Helpers.escapeHTML;

  // This needs to be changed
  placeholder = me.tmpl.placeholderTagBuilder();
  placeholder[0].childNodes[0].dataset.displayContent = placeholderContent;

  placeholderEl = placeholder[0];
  placeholderEl.dataset.type = 'placeholder';
  placeholderEl.dataset.id = data.id;
  placeholderEl.dataset.definitionid = data.placeholderTagDefinitionId;
  placeholderEl.dataset.metadata = data.metadata;
  placeholderEl.dataset.tagCopy = me.isTagCopyAllowed;

  return [ placeholder ];
};


/**
 * Render locked content inside a segment
 * @param  {Object} data
 * @return {Array}
 */
renderer.prototype._renderLockedContent = function (data) {
  var me = this,
      tmpl = me.tmpl,
      lockedContentStart,
      lockedContentEnd,
      lockedInlineContent;

  if (!data) {
    return;
  }

  lockedContentStart = tmpl.lockedContentStartTagBuilder();
  lockedContentEnd = tmpl.lockedContentEndTagBuilder();
  lockedInlineContent = me._renderInlineContent(data);

  lockedInlineContent[0].dataset.isLocked = true;
  lockedInlineContent[0].classList.add('ue-locked-content');

  return [
    lockedContentStart,
    lockedInlineContent,
    lockedContentEnd
  ];
};


renderer.prototype._renderInline = function (inline) {
  var me = this;

  // Render text
  if (inline.type === 'text') {
    return me._renderText(inline);
  }

  // Render tags and inline content
  if (inline.type === 'tagPair') {
    return me._renderTagPair(inline);
  }

  // Render placeholders
  if (inline.type === 'placeholderTag') {
    return me._renderPlaceholder(inline);
  }

  // Render locked content inside segments
  if (inline.type === 'locked') {
    return me._renderLockedContent(inline.children);
  }

  // Or return empty array
  return [];
};


/**
 * Prepares styles for tagpair formatting
 * @param  {object} formattingGroup
 * @return {string}
 */
renderer.prototype._prepareFormatting = function (formattingGroup) {
  var me = this,
      items = {},
      stylesList = [];

  if (formattingGroup) {
    items = formattingGroup.items;

    // Interate over formatting items
    _.forEach(items, function (item, key) {

      // Get all styles from StylesMap and build
      // the string for inline style attribute
      if (key && (key.toLowerCase() in StylesMap)) {
        _.forEach(StylesMap[key.toLowerCase()](items[key]), function (style, property) {
          stylesList.push([property, style].join(':'));
        });
      } else {
        // if the style doesn't exist in the StylesMap, log an error
        console.error('"' + key + '" does not exist in the styles map');
      }

    });
  }

  return stylesList.join(';');
};

module.exports = SideBySideParagraphUnitsRenderer;