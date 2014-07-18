/* File: DataProvider.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

/**
 * Data provider module
 *
 * Provides data for the application's modules. Creates an interface to communicate with
 * the Storage. Responsible for creating update fragments by extracting the segments for a node.
 */
var config = require('./config');
var Helpers = require('./Helpers');

var Storage = require('./Storage');
var MarkupDataFactory = require('./MarkupDataFactory');
var TranslationOrigin = require('./TranslationOrigin');
var Mediator = require('./Mediator');

var DataProvider = (function () {
  var storage = Storage[config.storage].getInstance(),
      createMarkupData = MarkupDataFactory.create,
      transOrigin = TranslationOrigin,
      _rand = Helpers._rand;


  function UpdateFragment (paragraphId, segmentId, children, isTarget, data) {
    this.type = 'UPDATE';
    this.paragraphUnitUUID = paragraphId;
    this.segment = {};
    this.segment.id = segmentId;
    this.segment.children = children || [];
    this.segment.type = 'segment';
    this.segment.translationOrigin = (data) ? data.translationOrigin : {};
    this.segment.segmentNumber = (data) ? data.segmentNumber : 0;
    this.segment.confirmationLevel = (data) ? data.confirmationLevel : '';
    this.segment.isLocked = (data) ? data.isLocked : false;
    this.isTarget = isTarget || true;
  }


  UpdateFragment.prototype.addChildren = function (children) {
    if (children.instanceOf('Array')) {
      this.segment.children.concat(children);

      return;
    }

    this.segment.children.push(children);
  };


  /**
   * Prepare children to be added to the
   * @param  {HTMLElement} segment children
   */
  function prepareNode (element) {
    var nodes = element.children,
        children = [],
        i = 0,
        l = nodes.length;

    for (; i < l; i++) {

      if (nodes[i].dataset.type === 'text') {
        children.push(createMarkupData({
          type: 'text',
          id: nodes[i].dataset.id,
          text: nodes[i].textContent,
          metadata: nodes[i].dataset.metadata
        }));
      }

      if (nodes[i].nodeType === 1 && nodes[i].nodeName.toLowerCase() === "br") {
        children.push(createMarkupData({
          type: 'text',
          text: '\r\n'
        }));
      }

      if (nodes[i].dataset.type === 'tagpair') {
        children.push(createMarkupData({
          type: 'tagPair',
          id: nodes[i].dataset.id,
          children: prepareNode(nodes[i]),
          metadata: nodes[i].dataset.metadata,
          tagPairDefinitionId: nodes[i].dataset.definitionid
        }));
      }

      if (nodes[i].dataset.type === 'locked') {
        children.push(createMarkupData({
          type: 'locked',
          children: prepareNode(nodes[i])
        }));
      }

      if (nodes[i].dataset.type === 'placeholder') {
        children.push(createMarkupData({
          type: 'placeholderTag',
          id: nodes[i].dataset.id,
          metadata: nodes[i].dataset.metadata,
          placeholderTagDefinitionId: nodes[i].dataset.definitionid
        }));
      }
    }

    return children;
  }


  /**
   * Prepare segment data to be sent back to the server
   * @param  {segmentEl} current segment element
   * @return {Object}    updated fragment object
   */
  function prepareSegment (segmentEl) {
    var segmentInnerElement = segmentEl.children[0],
        nodes = segmentInnerElement.children,
        children = [],
        i = 0,
        l = nodes.length,
        otherSegmentData = {};


    for (; i < l; i++) {

      if (nodes[i].dataset.type === 'text') {
        children.push(createMarkupData({
          text: nodes[i].textContent,
          type: 'text',
          metadata: nodes[i].dataset.metadata
        }));
      }

      if (nodes[i].nodeType === 1 && nodes[i].nodeName.toLowerCase() === "br") {
        children.push(createMarkupData({
          type: 'text',
          text: '\r\n'
        }));
      }

      if (nodes[i].dataset.type === 'tagpair') {
        //Get tag-content from tag-pair node
        var tagContent = nodes[i];

        //create a new tag-pair markupdata
        children.push(createMarkupData({
          type: 'tagPair',
          id: nodes[i].dataset.id,
          children: prepareNode(tagContent),
          metadata: nodes[i].dataset.metadata,
          tagPairDefinitionId: nodes[i].dataset.definitionid
        }));
      }

      if (nodes[i].dataset.type === 'locked') {
        children.push(createMarkupData({
          type: 'locked',
          children: prepareNode(nodes[i])
        }));
      }

      if (nodes[i].dataset.type === 'placeholder') {
        children.push(createMarkupData({
          type: 'placeholderTag',
          id: nodes[i].dataset.id,
          metadata: nodes[i].dataset.metadata,
          placeholderTagDefinitionId: nodes[i].dataset.definitionid
        }));
      }
    }

    var segmentData = segmentEl.dataset;
    var segmentNumber = segmentData.segmentNumber;
    var segment = DataProvider.segmentsMap[segmentNumber];

    // other segment data
    otherSegmentData = {
      translationOrigin: transOrigin.originalFormat(segment.translationorigin),
      confirmationLevel: formatConfirmationLevel(segment.confirmationlevel),
      segmentNumber: segmentNumber,
      isLocked: segmentData.isLocked ? segmentData.isLocked : false
    };

    return new UpdateFragment(segmentEl.dataset.puid, segmentEl.dataset.segmentNumber, children, true, otherSegmentData);
  }


  function formatConfirmationLevel (value) {
    switch (value) {
      case 'not-translated':
        return 'NotTranslated';
      case 'approved-sign-off':
        return 'ApprovedSignOff';
      case 'approved-translation':
        return 'ApprovedTranslation';
      case 'draft':
        return 'Draft';
      case 'rejected-sign-off':
        return 'RejectedSignOff';
      case 'rejected-translation':
        return 'RejectedTranslation';
      case 'translated':
        return 'Translated';
      default:
        return 'NotTranslated';
    }
  }


  function createDefinitionMap (data) {
    var map = {};

    for (var i = 0, l = data.length; i < l; i++) {
      map[data[i].id] = data[i];
    }

    return map;
  }

  return {
    segmentsMap: {},
    segmentsMapLength: 0,
    saveQueue: {},
    metadataMap: {},

    cacheMetadata: function (metadata) {
      var key = _rand() + '-' + _rand() + '-' + _rand();
      this.metadataMap[key] = metadata;

      return key;
    },


    /**
     * Add to save queue the user action
     *
     * @param {String} segmentId - id of segment
     * @param {String} paragraphId - id of paragraph unit
     * @param {Object|DOMnode} html - html content of the DOM node
     */
    addSaveQueue: function (segmentId, paragraphId, html) {
      this.saveQueue[paragraphId] = {
        segmentId: segmentId,
        html: html
      };
    },


    saveAllChanges: function () {
      var q = this.saveQueue,
          segments = [],
          promise = storage.saveOperation(segments);

      for (var i in q) {
        segments.push(prepareSegment(q[i].html));
      }

      promise.done(function () {
        console.info('Saved successfully');
      }).fail(function () {
        console.error('Error saving');
      });
    },


    saveSegmentChange: function (data) {
      var segments = [prepareSegment(data.el, data.otherSegmentData)],
          promise = storage.saveOperation(segments);

      promise.done(function () {
        console.info('Saved successfully');
      }).fail(function () {
        console.error('Error saving');
      });
    },


    /**
     * Returns the current document
     *
     * @param:  {Function} callback
     * @return: {Object} document
     */
    getCurrentDocument: function (callback) {
      if (callback) {
        callback(null, storage.currentDocument);
      }

      return storage.currentDocument;
    },


    /**
     * Set the current document
     *
     * @param: {String} id - document id
     * @param: {Function} callback
     */
    // TODO: To be refactored when it proves even more painful
    setCurrentDocument: function (id, callback) {
      var me = this, index, map;

      // Inject current document
      storage.getDocument(id, function (err, data) {

        me.initData(id, data);

        map = function (err, skeleton) {

          me.mapSkeletonData(skeleton);

          if ((+index + 1) === me.files.length) {
            if (callback) {
              callback(null, storage.currentDocument);
            }
          }
        };

        for (var index in me.files) {
          storage.getSkeleton(me.files[index].id, map);
        }

      });
    },

    initData: function (id, data) {
      this.files = data.files;
      storage.currentDocument.id = id;
    },

    mapSkeletonData: function (skeleton) {
      var me = this;

      me.tagPairMap = createDefinitionMap(skeleton.tagPairDefinitions);
      me.formatingGroupMap = createDefinitionMap(skeleton.formattingGroups);
      me.placeholderMap = createDefinitionMap(skeleton.placeholderTagDefinitions);
    },

    /**
     * Get Paragraph from storage
     *
     * @param: {String} id
     * @param: {Function} callback
     */
    getParagraph: function (id, callback) {
      if (!id && callback) {
        callback(true);
      }

      if (callback) {
        storage.getParagraph(id, callback);
      }
    },


    /**
     * Get the next set of paragraphs of the current document
     *
     * @param: {Function} callback
     */
    getNextParagraphs: function (callback) {
      storage.getNextParagraphs(callback);
    },


    /**
     * Get all paragraphs from storage
     *
     * @param: {Function} callback
     */
    getParagraphs: function (documentId, callback, limit, offset) {
      if (typeof callback === 'function') {
        storage.getParagraphs(documentId, callback, limit, offset);
      }
    },


    /**
     * Get all documents
     *
     * @param: {Function} callback
     */
    getDocuments: function (callback) {
      if (typeof callback === 'function') {
        storage.getDocuments(callback);
      }
    },


    /**
     * Returns one document from the list of documents
     * @param  {String} id
     * @return {String}
     */
    getDocumentInfo: function (id) {
      return storage.documents.filter(function (doc) {
        return doc.id === id;
      })[0];
    },


    getSegmentBySegmentNumber: function (segmentNumber) {
      return this.segmentsMap[segmentNumber];
    },


    /**
     * Binds handlers for saving the changes
     */
    bindHandlers: function () {
      var me = this,
          changes = {};

      Mediator.subscribe(
        'segment:start-edit', // Fired by markCurrentSegment() in KeyboardBindings
        function (data) {
          changes[data.segmentNumber] = {
            status: data.otherSegmentData.confirmationlevel,
            html: data.el.innerHTML
          };
        });

      Mediator.subscribe(
        'segment:end-edit', // Fired by markCurrentSegment() in KeyboardBindings
        function (data) {
          var html = data.el.innerHTML,
              status = data.otherSegmentData.confirmationlevel,
              original = changes[data.segmentNumber];

          if (html !== original.html || status !== original.status) {
            me.saveSegmentChange(data);
          }
        });
    },

    init: function () {
      this.bindHandlers();
    }
  };
})();

module.exports = DataProvider;
