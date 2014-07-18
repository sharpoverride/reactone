/* File: Storage.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var config = require('./config');
var Mediator = require('./Mediator');

module.exports = {
  StorageImplementation: (function () {
    var instance = null,
        base_url = config.baseUrl;

    var defaults = {
      limit: config.defaultLimit || 5,
      offset: config.defaultOffset || 0
    };


    /**
     * private search function
     *
     * @param {Array} list
     * @param {Function} function check constraints
     * @return {Number|Item} index|item
     */
    function search(list, fnc) {
      var len = list.length;

      if (!fnc || typeof(fnc) !== 'function') {
        return -1;
      }

      if (!list || !len || len < 1) {
        return -1;
      }

      for (var i = 0; i < len; i++) {
        if (fnc(list[i])) {
          return list[i];
        }
      }

      return -1;
    }

    /**
     * Single entry point to get data
     *
     * @dependency jQuery
     *
     * @param {String}    url
     * @param {Function}  callback success callback
     */
    function getData(url, callback) {
      var action = $.ajax({
        method: 'GET',
        url: base_url + url,
        dataType: 'json'
      });

      action.done(function (data) {
        if (callback) {
          callback(null, data);
        }
      });
    }

    function saveData(url, data) {
      var promise = $.Deferred();

      var action = $.ajax({
        method: 'PUT',
        url: base_url + url,
        contentType: 'application/json',
        data: JSON.stringify(data),
        dataType: 'text'
      });

      Mediator.publish('save:before');

      action.done(function (data) {

        promise.resolveWith(null, [data]);
        Mediator.publish('save:done');

      }).fail(function () {

        promise.rejectWith(null, [{
          // error object goes here
        }]);

        Mediator.publish('save:fail');
      });
      return promise;
    }

    function init() {

      return {
        currentParagraphIndex: 0,
        documents: [],
        paragraphs: [],
        currentDocument: {
          id: null,
          paragraphCount: 0,
          loadedParagraphs: 0,
          skeletons: []
        },
        /**
         * Get a paragraph
         *
         * @param {String} id
         * @param {Function} callback
         */
        getParagraph: function (id, callback) {
          if (!id) {
            callback(true, null);

            return;
          }

          if (paragraphUnits.length === 0) {
            callback(null, null);

            return;
          }

          if (paragraphUnits.length === 1 && paragraphUnits[0].id !== id) {
            callback(null, null);

            return;
          }

          var item = search(paragraphUnits, function (item) {
            return item.id === id;
          });

          //if search return -1
          if (!~item) {
            callback(null, null);
            return;
          }

          //return found item
          callback(null, item);
        },

        _getParagraphs: function (documentId, callback, limit, offset) {
          //if there is no local data, try to get data from the service
          if (paragraphUnits.length === 0) {
            getData('/api/paragraphunits', callback);

            return;
          }

          //if limit of offset exists create the query string and
          //ask the service for data
          if ((typeof limit) !== 'undefined' || (typeof offset) !== 'undefined') {
            //check if limit or offset are a valid number
            if (isNaN(+limit) || isNaN(+offset)) {
              callback(true);

              return;
            }

            //create the limit and offset query strings
            var l = (limit) ? '?limit=' + limit : '?limit=2';
            var o = (offset) ? '&offset=' + offset : '&offset=0';

            getData('/api/paragraphunits/' + l + o, callback);

            return;
          }

          callback(null, paragraphUnits);
        },
        /**
         * Gets all paragraph units for a specified document
         *
         * @param {String}    documentId
         * @param {Function}  callback
         * @param {Number}    limit
         * @param {Number}    offset
         */
        getParagraphs: function (documentId, callback, limit, offset) {
          var me = this;

          me.currentDocument.id = documentId;

          if ((typeof limit) !== 'undefined' || (typeof offset) !== 'undefined') {
            //sanity check
            if (isNaN(+limit) || isNaN(+offset) || limit === null || offset === null) {
              callback(true);

              return;
            }

            getData('/document/' + documentId + '/paragraphs/' + offset + '/' + limit, function (err, data) {
              me.currentDocument.loadedParagraphs = me.currentDocument.loadedParagraphs + data.length;
              me.paragraphs = me.paragraphs.concat(data);

              if (callback) {
                callback(err, data);
              }
            });

            return;
          }

          getData('/document/' + documentId + '/paragraphs/' + defaults.offset + '/' + defaults.limit, function (err, data) {
            me.currentDocument.loadedParagraphs = me.currentDocument.loadedParagraphs + data.length;

            me.paragraphs = me.paragraphs.concat(data);

            if (callback) {
              callback(err, data);
            }
          });
        },
        getNextParagraph: function (callback) {
          if (callback) {
            getData('/api/paragraphunits/?action=next', callback);
          }
        },
        getPrevParagraph: function (callback) {
          if (callback) {
            getData('/api/paragraphunits/?action=prev', callback);
          }
        },
        /**
         * Gets the next set of paragraph units from the storage
         *
         * @param {Function} callback
         */
        getNextParagraphs: function (callback) {
          var me = this,
              documentId = me.currentDocument.id;

          if (callback) {
            getData('/document/' + documentId + '/paragraphs/' + this.currentDocument.loadedParagraphs + '/' + defaults.limit, function (err, data) {
              me.currentDocument.loadedParagraphs = me.currentDocument.loadedParagraphs + data.length;

              me.paragraphs = me.paragraphs.concat(data);

              if (callback) {
                callback(err, data);
              }
            });
          }
        },
        /**
         * Get a list of documents
         *
         * @param {Function} callback
         */
        getDocuments: function (callback) {
          var me = this;

          if (callback) {
            getData('/documents', function (err, data) {
              //cache the documents
              me.documents = me.documents.concat(data);

              callback(err, data);
            });
          }
        },
        /**
         * Get a document by id
         *
         * @param {String} id
         * @param {Function} callback
         */
        getDocument: function (id, callback) {
          var me = this;

          if (callback) {
            getData('/document/' + id, function (err, data) {
              //cache data related to the document
              me.currentDocument.data = data;

              // count the number of paragraphs
              var nrParagraphs = 0;
              for (var i in data.files) {
                //get the regular paragraph unit count
                nrParagraphs += data.files[i].paragraphUnitCount - data.files[i].structureParagraphUnitCount;
              }

              me.currentDocument.paragraphCount = nrParagraphs;

              callback(err, data);
            });
          }
        },

        saveOperation: function (operations) { // arg 'callback' never used
          return saveData('/operation', {
            'actions' : operations
          });
        },

        getSkeleton: function (fileId, callback) {
          var me = this;
          if (!callback) {
            callback = function () {};
          }
          return getData('/skeleton/' + fileId, function (err, data) {
            me.currentDocument.skeletons.push(data);
            callback(err, data);
          });
        }
      };
    }

    function getInstance() {
      if (!instance) {
        instance = init();
      }

      return instance;
    }

    return {
      getInstance: getInstance,
      g: getInstance
    };
  })()
};