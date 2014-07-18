/* File: TagContentBuilder.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var strategies = {
  none: function () {
    return String.fromCharCode(8204);
  },

  id: function (data) {
    return data.tagPairDefinitionId || data.placeholderTagDefinitionId;
  },

  partial: function (data) {
    if (data.type === 'tagPair') {
      return {
        tagStart: data.startTagDisplayText,
        tagEnd: data.endTagDisplayText
      };
    }

    return data.displayText;
  },

  full: function (data) {
    if (data.type === 'tagPair') {
      return {
        tagStart: data.startTagContent,
        tagEnd: data.endTagContent
      };
    }

    return data.tagContent;
  }
};

var TagContentBuilder = function (strategy) {
  this.strategy = strategies[strategy];
};

TagContentBuilder.prototype.build = function (data) {
  return this.strategy(data);
};

module.exports = TagContentBuilder;