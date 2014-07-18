/* File: MarkupDataFactory.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var MarkupDataFactory = function () {
  var me = this;
  var dataProvider = null;

  var MarkupDataSchema = {
    id: { type: String },
    type: { type: String },
    metadata: { type: Object }
  };

  var MkContainerSchema = {
    children: { type: Array, required: true, defaults: [] }
  };

  var MkSegmentSchema = {
    segmentNumber: { type: String },
    isLocked: { type: Boolean },
    confirmationLevel: { type: String },
    translationOrigin: { type: Object }
  };

  var MkTagpairSchema = {
    tagPairDefinitionId: { type: String },
    canHide: { type: Boolean }
  };

  var MkPlaceholderSchema = {
    placeholderTagDefinitionId: { type: String }
  };

  var MkLockedContentSchema = {
    children: { type: Array }
  };

  var MkTextSchema = {
    text: { type: String }
  };

  function MarkupData(options) {
    dataProvider = dataProvider || require('./DataProvider');
    for (var property in MarkupDataSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MarkupDataSchema[property]['required']) {
        this[property] = MarkupDataSchema[property]['defaults'];
      }

      if (options.metadata && typeof options.metadata === 'string') {
        options.metadata = dataProvider.metadataMap[options.metadata];
      }
    }
  }

  function MkContainer(options) {
    // Invoke the superclass constructor on the new object
    MarkupData.call(this, options);

    for (var property in MkContainerSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MkContainerSchema[property]['required']) {
        this[property] = MkContainerSchema[property]['defaults'];
      }
    }
  }

  function MkSegment(options) {
    // Invoke the superclass constructor on the new object
    MkContainer.call(this, options);

    for (var property in MkSegmentSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MkSegmentSchema[property]['required']) {
        this[property] = MkSegmentSchema[property]['defaults'];
      }
    }
  }

  function MkTagpair(options) {
    // Invoke the superclass constructor on the new object
    MkContainer.call(this, options);

    for (var property in MkTagpairSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MkTagpairSchema[property]['required']) {
        this[property] = MkTagpairSchema[property]['defaults'];
      }
    }
  }

  function MkPlaceholder(options) {
    // Invoke the superclass constructor on the new object
    MarkupData.call(this, options);

    for (var property in MkPlaceholderSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MkPlaceholderSchema[property]['required']) {
        this[property] = MkPlaceholderSchema[property]['defaults'];
      }
    }
  }

  function MkLockedContent(options) {
    // Invoke the superclass constructor on the new object
    MkContainer.call(this, options);


    for (var property in MkLockedContentSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MkLockedContentSchema[property]['required']) {
        this[property] = MkLockedContentSchema[property]['defaults'];
      }
    }
  }

  function MkText(options) {
    // Invoke the superclass constructor on the new object
    MarkupData.call(this, options);

    for (var property in MkTextSchema) {
      if (options.hasOwnProperty(property)) {
        this[property] = options[property];
      }

      if (!options.hasOwnProperty(property) && MkTextSchema[property]['required']) {
        this[property] = MkTextSchema[property]['defaults'];
      }
    }
  }

  return {
    create: function (data) {
      //delete property that does not exist
      for (var property in data) {
        if (data.hasOwnProperty(property)) {
          if (data[property] === null || data[property] === '' || data[property] === 'undefined' || (typeof data[property] === 'undefined')) {
            delete data[property];
          }
        }
      }

      //determine class type
      if (data.type === 'segment') {
        me.markupdataClass = MkSegment;
      } else if (data.type === 'tagPair') {
        me.markupdataClass = MkTagpair;
      } else if (data.type === 'placeholderTag') {
        me.markupdataClass = MkPlaceholder;
      } else if (data.type === 'text') {
        me.markupdataClass = MkText;
      } else if (data.type === 'locked') {
        me.markupdataClass = MkLockedContent;
      }

      //create new markupdata
      return new me.markupdataClass(data);
    }
  };
};

module.exports = new MarkupDataFactory();