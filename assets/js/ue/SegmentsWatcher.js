/* File: SegmentWatcher.js */
/* jshint undef: true, unused: true */
/* globals $, _, module */
'use strict';

var SegmentsWatcher = (function () {
  var resizeCalls,
      groups = {},
      tagPairs = {},
      currentContainer = {};

  function segmentContainer() {
    this.sourceEl = null;
    this.targetEl = null;
    this.statusEl = null;

    this.sourceInlineContentEl = null;
    this.targetInlineContentEl = null;
    this.linkedElements = [];

    this.isHeightComputed = false;
  }

  segmentContainer.prototype.push = function (item) {
    this.linkedElements.push(item);
  };

  segmentContainer.prototype.replaceStatusEl = function (statusEl) {
    var me = this;
    var statusPosition = me.linkedElements.indexOf(me.statusEl);
    if (statusPosition === -1) {
      throw 'Invalid state, linkedElement does not exist';
    }

    me.statusEl.replaceWith(statusEl);
    me.statusEl = statusEl;

    me.linkedElements[statusPosition] = me.statusEl;
  };

  function _resizeContainer(container) {
    var MIN_HEIGHT = 27,
        sourceInlineContent = container.sourceInlineContentEl || $(container.sourceEl[0].firstChild), //$(':first-child', container.sourceEl),
        targetInlineContent = container.targetInlineContentEl || $(container.targetEl[0].firstChild), //$(':first-child', container.targetEl),
        sourceHeight = parseInt(sourceInlineContent.css('height'), 10),
        targetHeight = parseInt(targetInlineContent.css('height'), 10),
        maxHeight = Math.max(sourceHeight, targetHeight),
        targetedHeight = Math.max(MIN_HEIGHT, maxHeight);

    container.linkedElements.forEach(function (item) {
      item.css('height', targetedHeight + 'px');
    });
  }

  resizeCalls = 0;

  window.onresize = function () {
    SegmentsWatcher.resizeContainers();
  };

  return {
    resizeCalls: 0,
    /*
    * @elementGroup - list of elements that must have the same height
    */
    watchSegment: function (segmentNumber) {
      if (groups[segmentNumber] === undefined) {
        groups[segmentNumber] = new segmentContainer();
      }

      currentContainer = groups[segmentNumber];

      return this;
    },

    groupAdd: function (element) {
      currentContainer.push(element);

      return this;
    },

    setSource: function (sourceEl) {
      currentContainer.sourceEl = sourceEl;
      this.groupAdd(sourceEl);

      return this;
    },

    setStatus: function (statusEl) {
      currentContainer.statusEl = statusEl;
      this.groupAdd(statusEl);

      return this;
    },

    setTarget: function (targetEl) {
      currentContainer.targetEl = targetEl;
      this.groupAdd(targetEl);

      return this;
    },

    addTagPair: function (tagPairId, tagPairElements) {
      tagPairs[tagPairId] = tagPairElements;
    },

    removeTagPair: function (tagPairId) {
      var exists = tagPairId in tagPairs,
          element;

      if (!exists) {
        return;
      }

      tagPairs[tagPairId].forEach(function (element) {
        element.remove();
      });
    },

    resizeContainers: function () {
      _(groups).forOwn(_resizeContainer);

      if (this.resizeCalls < 3) {
        window.setTimeout(function () {
          SegmentsWatcher.resizeContainers();
        }, 500);
        this.resizeCalls++;
      }
    },

    resize: function (containerId) {
      _resizeContainer(groups[containerId]);
    },

    getContainerBySegmentNumber: function (segmentNumber) {
      return groups[segmentNumber];
    },

    markContainerAsActive: function (segmentNumber) {
      var container = this.getContainerBySegmentNumber(segmentNumber);

      if (container === undefined) {
        return;
      }

      container.linkedElements.forEach(function (linkedEl) {
        linkedEl.addClass('ue-row-active');
      });
    },

    markContainerAsInactive: function (segmentNumber) {
      var container = this.getContainerBySegmentNumber(segmentNumber);

      if (container === undefined) {
        return;
      }

      container.linkedElements.forEach(function (linkedEl) {
        linkedEl.removeClass('ue-row-active');
      });
    },

    focusTarget: function (segmentNumber) {
      var container = this.getContainerBySegmentNumber(segmentNumber);
      var range = document.createRange();
      range.setStartBefore(container.targetEl[0]);

      var selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      range.collapse();
    },

    getTargetEl: function (segmentNumber) {
      var container = this.getContainerBySegmentNumber(segmentNumber),
        targetEl;

      if (container === undefined) {
        return null;
      }

      targetEl = container.targetEl;

      return targetEl;
    },

    destroy: function () {

    }

  };

})();

module.exports = SegmentsWatcher;