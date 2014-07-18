/* File: Documents.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

/**
 * Documents module
 *
 * Displays all documents from the storage, attaches event handlers to the
 * documents for opening them
 *
 */

var config = require('./config');
var Helpers = require('./Helpers');
var DataProvider = require('./DataProvider');
var Paragraphs = require('./Paragraphs');



var Documents = (function () {

  var dataProvider = DataProvider;

  // Not used?
  // function createNode(tag, content, className, style) {
  //   var elm = document.createElement(tag);
  //   if (className) {
  //     elm.className = className;
  //   }

  //   if (style) {
  //     elm.style.cssText = style;
  //   }

  //   if (typeof (content) === 'string') {
  //     addText(elm, content);
  //   }

  //   if (content && content.nodeName) {
  //     elm.appendChild(content);
  //   }

  //   return elm;
  // }

  // function addText(elm, text) {
  //   elm.innerHTML = text;
  // }

  return {

    /*
      The list of documents
    */
    documents: [],

    /**
     * Open a document in the view
     *
     */
    openDocument: function (id) {
      var me = this;

      dataProvider.setCurrentDocument(id, function (err, doc) {
        Paragraphs.renderFirstParagraphs();
        me.showDocumentInfo(doc.data);
      });

    },

    showDocumentInfo: function (doc) {
      var elements = ['.ue-translation-information'];
      for (var i = 0; i < elements.length; i++) {
        var el = $(elements[i]);
        el.html(Helpers.template(el.data('tmpl'), doc));
      }
    },


    /**
     * Renders all the documents
     *
     */
    renderDocuments: function () {
      var $documentsList = this.$documentsList, me = this;
      DataProvider.getDocuments(function (err, documents) {
        var reverseDocs = documents.reverse();
        me.documents = reverseDocs;
        $documentsList.html(
          Helpers.template('tmpl-documents-list', { documents: reverseDocs })
        );
      });
    },

    showDocumentList: function () {
      this.$documentsList.slideDown();
      $('.documents-control').addClass('slideup');
      this.$editor.addClass('faded');
    },

    hideDocumentList: function () {
      this.$documentsList.slideUp();
      $('.documents-control').removeClass('slideup');
      this.$editor.removeClass('hidden faded');
    },

    bindHandlers: function () {
      var me = this;

      this.$body.on('click.openDoc', '[data-action="open-document"]',
        config.fullMode ?
          function () { // arg was 'event' - not used
            var $this = $(this);

            $('.documents-control').addClass('active');
            me.openDocument($this.data('id'));
            me.hideDocumentList();

            return false;
          } :
          function () { // arg was 'event' - not used
            window.location = config.baseUrl + '/show/' + this.dataset.id;
            return false;
          }
      );

      this.$body.on('click.showDocs', '[data-action="show-documents-list"]', function () { // arg was 'event' - not used
        me.showDocumentList();
        return false;
      });

      this.$body.on('click.hideDocs', '[data-action="hide-documents-list"]', function () { // arg was 'event' - not used
        me.hideDocumentList();
        return false;
      });
    },

    init: function () {
      this.$body = $('body');
      this.$documentsList = this.$body.find('#documents-list');
      this.$editor = $('.editor-wrapper');

      var root = config.baseUrl + '/';
      if (window.location.href === root || window.location.hash === null) {
        this.renderDocuments();
      }

      this.bindHandlers();

      if (!config.fullMode && !config.onlyDocs) {
        this.$documentsList.css({display: 'none'});
        this.openDocument(Helpers.paramsFromUrl('/document/:id', window.location.href)[0]);
        $('.documents-control').addClass('active');
      } else {
        this.$editor.addClass('hidden');
      }
    }
  };
})();

module.exports = Documents;