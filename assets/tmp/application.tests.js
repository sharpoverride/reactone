(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/* File: application.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

module.exports = require('./ue/UE.js');
},{"./ue/UE.js":23}],2:[function(require,module,exports){
/* File: CommandManager.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var Commands = require('./commands/EditorCommands');

function CommandManager(options) {
  this.options = options || null;
  this.commands = Commands || null;
}

var proto = CommandManager.prototype;

/**
 * Exscutes commands from the default command object
 * or commands added on the fly
 *
 * @param  {String} command - object property representing a command
 * @param  {Any} args
 */
proto.execute = function (command, args) {
  var me = this,
      cmds = me.commands;

  // Exit, nothing to execute or command not available
  if (!command || !cmds[command] || (!cmds[command].hasOwnProperty('handle') && !(typeof cmds[command].handle === 'function'))) {
    return;
  }

  if (typeof command === 'string') {
    return cmds[command].handle.call(me, args || null);
  }
};



/**
 * Dynamically adds commands to the commands object
 *
 * @param {Object} commandsList
 */
proto.addCommands = function (commandsList) {
  var me = this,
      commands = me.commands,
      command;

  for (command in commandsList) {
    if (commandsList.hasOwnProperty(command)) {
      commands[command] = commandsList[command];
    }
  }
};

/**
 * Delete commands from the commands object
 */
proto.deleteCommands = function () {
  var me = this,
      commands = me.commands,
      commandsList = Array.prototype.slice.call(arguments, 0);

  commandsList.forEach(function (command) {
    delete commands[command];
  });
};

module.exports = CommandManager;
},{"./commands/EditorCommands":24}],3:[function(require,module,exports){
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

},{"./Helpers":5,"./MarkupDataFactory":9,"./Mediator":10,"./Storage":20,"./TranslationOrigin":22,"./config":25}],4:[function(require,module,exports){
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
},{"./DataProvider":3,"./Helpers":5,"./Paragraphs":13,"./config":25}],5:[function(require,module,exports){
/* File: Documents.js */
/* jshint undef: true, unused: true */
/* globals require, module, Handlebars */
'use strict';

var config = require('./config');

var Helpers = (function () {
  var root          = config.baseUrl,
      optionalParam = /\((.*?)\)/g,
      namedParam    = /(\(\?)?:\w+/g,
      splatParam    = /\*\w+/g,
      escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  var TEMPLATES = {};

  Handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  Handlebars.registerHelper('whichever', function () {
    for (var i = 0; i < arguments.length - 1; i++) {
      if (arguments[i]) {
        return arguments[i];
      }
    }

    return '';
  });

  Handlebars.registerHelper('toLanguageCodeLowerCase', function (str) {
    var minimumLanguageCodeLength = 2,
        standarsIsoLength = 5;

    if (str.length < minimumLanguageCodeLength) {
      return '';
    }

    if (str.length === minimumLanguageCodeLength) {
      return str.toLowerCase();
    }

    if (str.length === standarsIsoLength) {
      str = str.substring(3).toLowerCase();
    }

    return str;
  });

  function _routeToRegExp(route) {
    route = route.replace(escapeRegExp, '\\$&').replace(optionalParam, '(?:$1)?')
                 .replace(namedParam, function (match, optional) {
                    return optional ? match : '([^\/]+)';
                  }).replace(splatParam, '(.*?)');

    return new RegExp('^' + route + '$');
  }

  function _extractParameters(route, fragment) {
    var result = route.exec(fragment);
    return result.slice(1);
  }

  function precompileTemplate(templateName, isPartial) {
    var el = document.getElementById(templateName);
    var str = el.innerHTML,
        partials = (el.dataset.partials || '').split(/\s+/);

    for (var i = 0; i < partials.length; i++) {
      if (partials[i]) {
        precompileTemplate(partials[i], true);
      }
    }

    if (isPartial) {
      Handlebars.partials[templateName] = Handlebars.compile(str);
    } else {
      TEMPLATES[templateName] = Handlebars.compile(str);
    }
  }


  function keyCodeToString(keyCode) {
    return String.fromCharCode(keyCode).toLowerCase();
  }

  /**
   * Converts document fragment to html string
   * @param  {DocumentFragment}
   * @return {String}
   */
  function fragmentToString(fragment) {
    var elem = document.createElement('div'),
        string = '';

    if (fragment && fragment.hasChildNodes()) {
      elem.appendChild(fragment.cloneNode(true));
      string = elem.innerHTML;
    }

    return string;
  }


  /**
   * Creates a documentFragment from a HTML Sring
   * @param  {String} elem HTML string '<dic class="some"></div>'
   * @return {DocumentFragment}
   */
  function stringToHTMLElement(elem) {
    var doc = document,
        div = doc.createElement('div'),
        fragment = doc.createDocumentFragment();

    div.innerHTML = elem;

    return fragment.appendChild(div.firstChild);
  }



  /**
   * Returns true if element has parent with given class name
   * @param  {HTMLNode} elem
   * @param  {String}   parentClass
   * @return {Boolean}
   */
  function hasParent(elem, parentClass) {
    while (elem && elem.nodeType !== 9 && (elem.nodeType !== 1 || !hasClass(elem, parentClass))) {
      elem = elem.parentNode;

      if (elem && elem.nodeType === 1 && hasClass(elem, parentClass)) {
        return true;
      }
    }

    return false;
  }


  /**
   * Returns true if an element has a given class
   * @param  {HTMLElement}  elem
   * @param  {String}       className
   * @return {Boolean}
   */
  function hasClass(elem, className) {
    return elem.className.replace(/[\t\r\n\f]/g, ' ').indexOf(className) >= 0;
  }


  /**
   * Escapes a HTML string
   * @param  {String} html - HTML string
   * @return {String} returns escaped HTML string
   */
  function escapeHTML(html) {
    var map = {
      '&'  : '&amp;',
      '<'  : '&lt;',
      '>'  : '&gt;',
      '"'  : '&quot;',
      '\'' : '&#x27;',
      '/'  : '&#x2F;',
    };

    return String(html).replace(/[&<>"'\/]/g, function (str) {
      return map[str];
    });
  }

  return {
    paramsFromUrl: function (policy, url) {
      policy = _routeToRegExp(policy);
      url = url.substr(root.length);

      return _extractParameters(policy, url);
    },

    _rand: function () {
      return parseInt(Math.random() * 0xFFFFFF, 10);
    },

    _extend: function (destination, source) {
      for (var property in source) {
        if (destination[property] && (typeof(destination[property]) === 'object') &&
           (destination[property].toString() === '[object Object]') && source[property]) {
          this._extend(destination[property], source[property]);
        } else {
          destination[property] = source[property];
        }
      }

      return destination;
    },

    constructor: function (prototype) {
      function mixin(obj, attr) {
        for (var i in attr) {
          obj[i] = attr[i];
        }
      }
      var c = function () {
        if (this.init) {
          this.init.apply(this, Array.prototype.slice.apply(arguments));
        }
      };
      mixin(c.prototype, prototype);
      return c;
    },

    template: function (templateName, data) {
      if (!TEMPLATES[templateName]) {
        precompileTemplate(templateName);
      }

      return TEMPLATES[templateName](data);
    },

    keyCodeToString: keyCodeToString,
    fragmentToString: fragmentToString,
    hasParent: hasParent,
    hasClass: hasClass,
    stringToHTMLElement: stringToHTMLElement,
    escapeHTML: escapeHTML
  };
})();

module.exports = Helpers;
},{"./config":25}],6:[function(require,module,exports){
/* File: Keyboard.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var shiftEnterHandler = require('./keyboard/ShiftEnterHandler');
var segmentUnderCurrentSelection = require('./keyboard/SegmentUnderCurrentSelection');

module.exports = {
  ShiftEnterHandler: shiftEnterHandler,
  SegmentUnderCurrentSelection: segmentUnderCurrentSelection
};
},{"./keyboard/SegmentUnderCurrentSelection":27,"./keyboard/ShiftEnterHandler":28}],7:[function(require,module,exports){
/* File: KeyboardBingings.js */
/* jshint undef: true, unused: true */
/* globals $, _, require, module */
'use strict';

var dataProvider = require('./DataProvider');
var segmentWatcher = require('./SegmentsWatcher');
var Mediator = require('./Mediator');
var tmpl = require('./Tmpl');
var helpers = require('./Helpers');

var Segment = require('./Segment');
var Selection = require('./Selection');
var Keyboard = require('./Keyboard');
var Mouse = require('./Mouse');
var CommandManager = require('./CommandManager');

var KeyboardBindings = function (target) {
  var me = this;
  me.target = target;
};

var proto = KeyboardBindings.prototype = {
  // Keyboard keys
  keyTab: 9,
  keyBackspace: 8,
  keyEnter: 13,
  keySpace: 32,

  keyPageUp: 33,
  keyPageDown: 34,
  keyEnd: 35,
  keyHome: 36,
  keyInsert: 45,
  keyDelete: 46,

  keyLeftArrow: 37,
  keyUpArrow: 38,
  keyRightArrow: 39,
  keyDownArrow: 40,

  keyShift: 16,
  keyCtrl: 17,
  keyAlt: 18,
  keyEsc: 27,

  keyCapsLock: 20,
  keyNumLock: 144,
  keyScrollLock: 145,

  keyF1: 112,
  keyF2: 113,
  keyF3: 114,
  keyF4: 115,
  keyF5: 116,
  keyF6: 117,
  keyF7: 118,
  keyF8: 119,
  keyF9: 120,
  keyF10: 121,
  keyF11: 122,
  keyF12: 123
};

proto.ignoredKeys = [
  proto.keyLeftArrow,
  proto.keyUpArrow,
  proto.keyRightArrow,
  proto.keyDownArrow,
  proto.keyCapsLock,
  proto.keyScrollLock,
  proto.keyNumLock,
  proto.keyAlt,
  proto.keyCtrl,
  proto.keyShift,
  proto.keyPageUp,
  proto.keyPageDown,
  proto.keyHome,
  proto.keyEnd,
  proto.keyEnter,
  proto.keyEsc,
  proto.keyInsert,
  proto.keyF1,
  proto.keyF2,
  proto.keyF3,
  proto.keyF4,
  proto.keyF5,
  proto.keyF6,
  proto.keyF7,
  proto.keyF8,
  proto.keyF9,
  proto.keyF10,
  proto.keyF11,
  proto.keyF12
];

proto.allowedKeysInLockedContent = {
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',

  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12'
};

proto.textNodeType = 3;
proto.elementNodeType = 1;
proto.currentSelection = null;
proto.currentElementIsLocked = false;

proto.bind = function () {
  var me = this;

  me.target.on('keydown', function (ev) { return me.disableEnterKey(ev); });
  me.target.on('keydown', function (ev) { return me.disableBackspaceAtStartOfSegment(ev); });
  me.target.on('keydown', function (ev) { return me.disableDeleteAtEndOfSegment(ev); });
  me.target.on('keydown', function (ev) { return me.handleBackspaceAction(ev); });
  me.target.on('keydown', function (ev) { return me.handleDeleteAction(ev); });
  me.target.on('keydown', function (ev) { return me.handleRemoveOnSelection(ev); });
  me.target.on('keydown', function (ev) { return me.preventTagsRemoval(ev); });
  me.target.on('keydown', function (ev) { return me.toggleSegmentLockState(ev); });
  me.target.on('keydown', function (ev) { return me.handleClearTagsShortcutPreventsDefault(ev); });
  me.target.on('keydown', function (ev) { return me.handleTabKey(ev); });

  // Trigger mouseup & keydown events in locked content to make sure we stop editing
  me.target.on('mouseup', function (ev) { return me.handleCrossSegmentSelection(ev); });
  me.target.on('keydown mouseup', function (ev) { return me.disableEditing(ev); });
  me.target.on('mouseup', function (ev) { return me.markCurrentSegment(ev); });

  me.target.on('keyup', function (ev) { return me.handleCaretPosition(ev); });
  me.target.on('keyup', function (ev) { return me.markCurrentSegment(ev); });
  me.target.on('keyup', function (ev) { return me.changeStatusToDraft(ev); });
  me.target.on('keyup', function (ev) { return me.changeStatusToConfirmed(ev); });
  me.target.on('keyup', function (ev) { return me.handleMissingTextContainer(ev); });
  me.target.on('keyup', function (ev) { return me.handleClearTags(ev); });
  me.target.on('keyup', function (ev) { return new Keyboard.ShiftEnterHandler(ev); });

  me.target.on('keyup paste', function (ev) { return me.resizeContainer(ev); });
  me.target.on('paste', function (ev) { return (new CommandManager()).execute('paste', ev); });

  // Handel CTRL+CLICK on tags
  me.target.on('mousedown', '[data-tag-copy="true"]',
    function (ev) { return new Mouse.CtrlClickHandler().handle(ev); });

  me.target.on('mouseover', '[data-tag-copy="true"]',
    function (ev) { return new Mouse.CtrlHoverHandler().mouseOver(ev); });

  me.target.on('mouseleave', '[data-tag-copy="true"]',
    function (ev) { return new Mouse.CtrlHoverHandler().mouseLeave(ev); });
};

// TODO once KeyboardBindings is refactored this can be removed
// SegmentUnderCurrentSelection has been moved to it's own module
proto._segmentUnderCurrentSelection = Keyboard.SegmentUnderCurrentSelection;


proto.disableEnterKey = function (ev) {
  var me = this;

  if (ev.shiftKey) {
    return;
  }

  if (ev.keyCode === me.keyEnter) {
    ev.preventDefault();
  }
};

proto.disableBackspaceAtStartOfSegment = function (ev) {
  var me = this;
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var segmentEl;

  if (ev.keyCode !== me.keyBackspace) {
    return;
  }

  if (!me._isInvisibleChar(focusNode)) {
    return;
  }

  segmentEl = $(focusNode.parentNode);

  if (focusNode.previousSibling === null &&
      segmentEl.hasClass('ue-segment')) {
    ev.preventDefault();
  }
};

proto.disableDeleteAtEndOfSegment = function (ev) {
  var me = this,
      selection = document.getSelection(),
      focusNode,
      focusOffset;

  if (!selection.isCollapsed) {
    return;
  }

  if (ev.keyCode !== me.keyDelete) {
    return;
  }

  focusNode = selection.focusNode;
  focusOffset = selection.focusOffset;

  if (focusNode === null) {
    return;
  }

  if (focusNode.nextSibling === null &&
      focusNode.length === focusOffset &&
      me.isLastInSegment(focusNode)) {
    ev.preventDefault();
  }
};

proto.isLastInSegment = function (node) {
  var parentEl,
      nodeEl,
      atIndex,
      numberOfChildren;

  nodeEl = $(node);
  parentEl = nodeEl.parent();

  while (!parentEl.hasClass('ue-inline-content')) {
    nodeEl = parentEl;
    parentEl = nodeEl.parent();
  }

  atIndex = nodeEl.index() + 1;
  numberOfChildren = parentEl.children().length;

  return atIndex === numberOfChildren;
};

proto.handleBackspaceAction = function (ev) {
  var me = this,
      selection = document.getSelection(),
      focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      previousSibling,
      inlineElement,
      tag,
      isStartTag;

  if (!selection.isCollapsed) {
    return;
  }

  if (focusNode === null) {
    return;
  }

  if ($(focusNode).hasClass('ue-tagpair-content') && focusOffset === 0) {
    selection.modify('move', 'backward', 'character');
    focusNode = selection.focusNode;
    focusOffset = selection.focusOffset;
  }

  if (!me._isInvisibleChar(focusNode)) {
    return;
  }

  inlineElement = focusNode.parentNode;
  tag = focusNode.previousSibling;

  if (ev.keyCode !== me.keyBackspace) {
    return;
  }

  if (inlineElement === null) {
    return;
  }

  if ($(inlineElement).hasClass('ue-segment')) {
    return;
  }

  if (focusOffset === 0) {
    selection.modify('move', 'forward', 'character');
  }

  isStartTag = $(tag).hasClass('ue-tag-start');

  if (isStartTag) {
    var ueTagWrapper = inlineElement;
    previousSibling = ueTagWrapper.previousSibling;

    var parentIsAnotherTag = $(ueTagWrapper.parentNode).hasClass('ue-tagpair-content');
    if (parentIsAnotherTag) {
      var ueTagPairContent = ueTagWrapper.parentNode;
      previousSibling = ueTagPairContent.previousSibling;
    }

  } else {
    previousSibling = inlineElement.previousSibling.lastChild;
  }

  me._removeInline(inlineElement, ev);

  if (previousSibling === null) {
    return;
  }

  var range = document.createRange();

  range.setStartAfter(previousSibling);

  selection.removeAllRanges();
  selection.addRange(range);

  ev.stopPropagation();
};


proto.handleDeleteAction = function (ev) {
  var me = this,
      selection = document.getSelection(),
      focusNode,
      focusNodeParent,
      focusOffset,
      nextSibling,
      ueTextParentEl,
      isNextSiblingTag,
      isNextSiblingTagHidden,
      isFocusOnText,
      isAtEndOfTextNode,
      isFocusInsideStartTag,
      isFocusOnInvisibleChar,
      isFocusInsidePreviousTag,
      isFocusAtStartOfSegment,
      selectionRangePosition,
      range;

  if (!selection.isCollapsed) {
    return;
  }

  if (ev.keyCode !== me.keyDelete) {
    return;
  }

  focusNode = selection.focusNode;
  focusNodeParent = focusNode.parentNode;
  focusOffset = selection.focusOffset;

  isFocusOnText = focusNode.nodeType === me.textNodeType;
  isAtEndOfTextNode = focusOffset === focusNode.length;
  isFocusOnInvisibleChar = me._isInvisibleChar(focusNode);
  isFocusInsideStartTag = isFocusOnInvisibleChar && $(focusNode.previousSibling).hasClass('ue-tag-start');
  isFocusInsidePreviousTag = isFocusOnInvisibleChar && $(focusNode.previousSibling).hasClass('ue-tag');
  isFocusAtStartOfSegment = isFocusOnInvisibleChar && $(focusNode).index() === 0;

  nextSibling = focusNode.nextSibling;

  if (isFocusOnInvisibleChar && focusOffset === 0) {
    selection.modify('move', 'forward', 'character');
  }

  if (isFocusOnText && !isFocusOnInvisibleChar) {
    if (!isAtEndOfTextNode) {
      return;
    }

    ueTextParentEl = $(focusNodeParent);

    if (ueTextParentEl.hasClass('ue-text')) { // we are in text before start tag
      nextSibling = focusNode.parentNode.nextSibling; // ue-tag-wrapper for start tag
    } else {
      throw 'unexpected case where selection is text, but is not contained in a text node';
    }

    // we are in text inside a tag pair
    if (nextSibling === null && $(focusNodeParent.parentNode).hasClass('ue-tagpair-content')) {
      nextSibling = focusNodeParent.parentNode.nextSibling; // ue-tag-wrapper for end tag
      selectionRangePosition = nextSibling.nextSibling; // what comes after the end-tag
    }
  }

  if (isFocusInsideStartTag) {
    var contentExists = focusNodeParent.nextSibling.firstChild;

    if (contentExists) {

      if ($(contentExists).hasClass('ue-text')) {
        // position cursor and let the default behavior
        range = document.createRange();
        range.setStartBefore(contentExists);

        selection.removeAllRanges();
        selection.addRange(range);

        return;
      }

      if ($(contentExists).hasClass('ue-tag-wrapper')) {
        nextSibling = contentExists;
      }

    } else { // we delete the current tag
      nextSibling = focusNodeParent;
    }

  } else if (isFocusInsidePreviousTag) {
    nextSibling = focusNodeParent.nextSibling;
  } else if (isFocusAtStartOfSegment) {
    nextSibling = focusNode.nextSibling.firstChild;
  }

  isNextSiblingTag = $(nextSibling).hasClass('ue-tag-wrapper');
  isNextSiblingTagHidden = isNextSiblingTag && $(nextSibling).hasClass('hide');

  if (isNextSiblingTagHidden) {
    return;
  }

  if (isNextSiblingTag) {
    me._removeInline(nextSibling, ev);
  }

  if (selectionRangePosition) {
    range = document.createRange();
    range.setStartBefore(selectionRangePosition);

    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto._removeInline = function (inlineElement, ev) {
  var tagPairId,
      tagPairContent,
      tagPairContentEl,
      isEndTagPair,
      isStartTagPair,
      isTagPair,
      isPlaceholder;

  isPlaceholder = inlineElement.dataset.type === 'placeholder';
  isEndTagPair = inlineElement.dataset.type === 'end-tag';
  isStartTagPair = inlineElement.dataset.type === 'start-tag';
  isTagPair = isStartTagPair || isEndTagPair;

  if (isPlaceholder) {
    inlineElement.remove();
    ev.preventDefault();

    return;
  }

  if (!isTagPair) {
    return;
  }

  if (isEndTagPair) {
    tagPairContent = inlineElement.previousSibling;
    tagPairId = tagPairContent.dataset.id;
  }

  if (isStartTagPair) {
    tagPairContent =  inlineElement.nextSibling;
    tagPairId = tagPairContent.dataset.id;
  }

  if (isTagPair) {
    segmentWatcher.removeTagPair(tagPairId);
    tagPairContentEl = $(tagPairContent);
    tagPairContentEl.replaceWith(tagPairContentEl.children());

    ev.preventDefault();
  }
};

proto.handleRemoveOnSelection = function (ev) {
  var me = this,
      selection = document.getSelection(),
      range,
      currentRange,
      rangeContent,
      commonAncestorContainer,
      startContainer;

  if (selection.getRangeAt(0).collapsed) {
    return;
  }

  if (ev.keyCode !== me.keyDelete && ev.keyCode !== me.keyBackspace) {
    return;
  }

  if (me.isCrossSegmentSelection()) {
    ev.preventDefault();
    return;
  }

  range = selection.getRangeAt(0);
  rangeContent = range.cloneContents();

  if (rangeContent.firstChild === rangeContent.lastChild &&
      rangeContent.firstChild.nodeType === me.textNodeType) {

    return;// allow default delete action
  }

  me.cleanupStrategy(rangeContent);


  currentRange = selection.getRangeAt(0);
  commonAncestorContainer = currentRange.commonAncestorContainer;
  startContainer = currentRange.startContainer;

  range.deleteContents();

  range = document.createRange();
  range.selectNode(startContainer);
  range.collapse();

  selection.removeAllRanges();
  selection.addRange(range);

  me.insertRangeContent(rangeContent, commonAncestorContainer);

  ev.preventDefault();
};

proto.isCrossSegmentSelection = function () {
  var selection = new Selection.SelectionContext(),
      result;

  result = selection.hasCommonAncestorClass('ue-editable');

  return result;
};

proto.cleanupStrategy = function (container) {
  var me = this;

  me.removeElementQueue = [];
  me._cleanup(container);
  me.removeElementQueue.forEach(function (item) {
    item.remove();
  });

  me.removeElementQueue = null;
};

proto._cleanup = function (container) {
  var me = this,
      i = 0,
      el;

  for (; i < container.childNodes.length; i++) {
    el = container.childNodes[i];

    me.removeText(el);
    me.removePairedTags(el, container);
    me.cleanTagPairContainer(el);
  }
};

proto.removeText = function (el) {
  var me = this,
      $el = $(el);

  if ($el.hasClass('ue-text')) {
    me.removeElementQueue.push($el);
  }
};

proto.removePairedTags = function (el, container) {
  var me = this,
      $el = $(el);

  if (el.dataset.type !== 'start-tag') {
    return;
  }

  var id = el.dataset.id;
  var matchedEndTag = _(container.childNodes).find(function (item) {
    var isTagWrapper = $(item).hasClass('ue-tag-wrapper'),

    isHidden = isTagWrapper && $(item).hasClass('hide'),
    dataset = item.dataset || {},
    isEndTag,
    hasMatchingId,
    isOk;

    isEndTag = dataset.type === 'end-tag';
    hasMatchingId = dataset.id === id;

    isOk = isTagWrapper && !isHidden && isEndTag && hasMatchingId;

    if (isOk) {
      return item;
    }

    return null;
  });

  var matchedTagPair = _(container.childNodes).find(function (item) {
    var isTagPairContainer = $(item).hasClass('ue-tagpair-content'),
    dataset = item.dataset || {},
    isTagPair,
    hasMatchingId,
    isOk;

    isTagPair = dataset.type === 'tagpair';
    hasMatchingId = dataset.id === id;

    isOk =  isTagPairContainer && isTagPair && hasMatchingId;

    if (isOk) {
      return item;
    }

    return;
  });

  if (matchedEndTag !== undefined) {
    me.removeElementQueue.push($el);
    me.removeElementQueue.push($(matchedEndTag));
    me.removeElementQueue.push($(matchedTagPair));
  }
};

proto.cleanTagPairContainer = function (el) {
  var me = this,
      isTagPair = $(el).hasClass('ue-tagpair-content');

  if (!isTagPair) {
    return;
  }

  me._cleanup(el);
};

proto.insertRangeContent = function (rangeContent, commonAncestorContainer) {
  var me = this,
      selection = document.getSelection(),
      focusNode,
      childNode,
      nextSibling,
      aheadSibling;

  focusNode = selection.focusNode;

  if (rangeContent.childNodes.length === 0) {
    return;
  }

  if (focusNode === null) {
    return;
  }

  // add content back
  while (focusNode.parentNode !== commonAncestorContainer) {
    focusNode = focusNode.parentNode;
  }

  childNode = rangeContent.childNodes[0];

  var firstChildEl = $(childNode);
  if (firstChildEl.hasClass('ue-tag-wrapper')) {
    // simple case, just add the content back
    $(focusNode).after(firstChildEl[0]);
    nextSibling = focusNode.nextSibling;
  } else if (me._needToMergeContainers(childNode, focusNode)) {
    me.mergeContentAtEndOf(childNode, focusNode);
    nextSibling = focusNode;
  }

  while (rangeContent.childNodes.length > 0) {
    childNode = rangeContent.childNodes[0];
    aheadSibling = nextSibling.nextSibling;

    if (me._needToMergeContainers(childNode, aheadSibling)) {
      me.mergeContentAheadOf(childNode, aheadSibling);
    } else {
      $(nextSibling).after(childNode);
      nextSibling = childNode;
    }
  }

};

proto._needToMergeContainers = function (childNode, aheadSibling) {
  var isChildNodeTagContainer,
      isAheadSibilingTagContainer,
      childNodeTagId,
      aheadSiblingTagId,
      isMergeNeeded;

  isChildNodeTagContainer = $(childNode).hasClass('ue-tagpair-content');
  isAheadSibilingTagContainer = $(aheadSibling).hasClass('ue-tagpair-content');

  if (!isChildNodeTagContainer) {
    return false;
  }

  if (!isAheadSibilingTagContainer) {
    return false;
  }

  childNodeTagId = childNode.dataset.id;
  aheadSiblingTagId = aheadSibling.dataset.id;

  isMergeNeeded = childNodeTagId === aheadSiblingTagId;

  return isMergeNeeded;
};

proto.mergeContentAheadOf = function (childNode, aheadSibling) {
  var me = this,
      positionEl;

  positionEl = $(childNode.childNodes[0]);
  positionEl.prependTo(aheadSibling);

  me.moveContents(childNode, positionEl);

  $(childNode).remove();
};

proto.mergeContentAtEndOf = function (childNode, previousSibling) {
  var me = this,
      positionEl;

  positionEl = $(childNode.childNodes[0]);
  positionEl.appendTo(previousSibling);

  me.moveContents(childNode, positionEl);

  $(childNode).remove();
};

proto.moveContents = function (fromNode, afterPositionEl) {
  var positionEl = afterPositionEl,
      childNode = fromNode,
      currentNode;

  while (childNode.childNodes.length > 0) {
    currentNode = childNode.childNodes[0];
    positionEl.after(currentNode);
    positionEl = $(currentNode);
  }
};

proto.preventTagsRemoval = function (ev) {
  var me = this,
      selection = document.getSelection(),
      textNode = selection.focusNode,
      focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      focusNodeLength,
      isKeyBackspace = ev.keyCode === me.keyBackspace,
      isKeyDelete = ev.keyCode === me.keyDelete,
      singleCharacter = 1;

  if (!selection.isCollapsed) {
    return;
  }

  if (focusNode === null) {
    return;
  }

  if (!isKeyDelete && !isKeyBackspace) {
    return;
  }

  if (focusNode.nodeType === me.textNodeType) {
    // Firefox position fix
    if (focusOffset === 0 && isKeyBackspace) {
      me.fixFirefoxPositionZero();
      focusNode = selection.focusNode;
      focusOffset = selection.focusOffset;
    }

    focusNodeLength = focusNode.length;
    focusNode = focusNode.parentNode;
  }

  var isAtEnd = focusOffset === focusNodeLength;
  var isAtStart = focusOffset === singleCharacter;
  var isAtLastCharacter = (!isAtEnd && (focusOffset + singleCharacter)) === focusNodeLength;

  var isFocusOnText,
      isNextSiblingTag,
      isPreviousSibilingTag,
      isCurrentContainerTagPairContent,
      isParentTagContainer,
      ueTagWrapper,
      range;

  isFocusOnText = $(focusNode).hasClass('ue-text');
  // isParentTagContainer should be true in firefox
  isParentTagContainer = $(focusNode.parentNode).hasClass('ue-tagpair-content');

  var nextSibling = focusNode.nextSibling;
  var previousSibling = focusNode.previousSibling;
  var focusNodeParent = focusNode.parentNode;

  isNextSiblingTag = $(nextSibling).hasClass('ue-tag-wrapper');
  isPreviousSibilingTag = $(previousSibling).hasClass('ue-tag-wrapper');
  isCurrentContainerTagPairContent = $(focusNodeParent).hasClass('ue-tagpair-content');

  if (!isAtStart && !isAtEnd && !isAtLastCharacter || !isFocusOnText) {
    return;
  }

  if (isPreviousSibilingTag || isNextSiblingTag || isCurrentContainerTagPairContent) {
    if (isKeyBackspace) {
      ev.preventDefault();

      selection.removeAllRanges();
      range = document.createRange();
      range.setStart(textNode, (focusOffset - singleCharacter));
      range.setEnd(textNode, focusOffset);

      selection.addRange(range);
      range.deleteContents();

      // position
      if (isAtStart) {
        var moveDirection = isKeyBackspace ? 'backward' : 'forward';
        selection.modify('move', moveDirection, 'character');
      }
    }

    if (isKeyDelete && isNextSiblingTag) {
      var tagPairContent = nextSibling.nextSibling;
      var isTagPairContainer = $(tagPairContent).hasClass('ue-tagpair-content');

      if (isAtLastCharacter) {
        ev.preventDefault();

        // remove from the next text node
        selection.removeAllRanges();
        range = document.createRange();
        range.setStart(textNode, focusOffset);
        range.setEnd(textNode, focusOffset + singleCharacter);
        selection.addRange(range);
        range.deleteContents();

        // set selection position to start of text node
        selection.removeAllRanges();
        range = document.createRange();
        range.setStart(textNode, focusOffset);
        range.setEnd(textNode, focusOffset);
        selection.addRange(range);
      }

      if (isAtEnd) {
        if (isTagPairContainer) {
          var ueText = tagPairContent.firstChild;
          textNode = ueText.firstChild;

          if (textNode.length === 0) {
            // move to next sibling
            ueTagWrapper = tagPairContent.nextSibling;
            ueText = ueTagWrapper.nextSibling;

            if (ueText === null) {
              return;
            }

            textNode = ueText.firstChild;
          }

          ev.preventDefault();

          // remove from the next text node
          selection.removeAllRanges();
          range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 1);
          selection.addRange(range);
          range.deleteContents();

          // set selection position to start of text node
          range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);
          selection.addRange(range);
        }
      }
    }
  }

  if (isKeyDelete && isParentTagContainer) {
    // this is firefox, he puts the selection within the text node
    // unlike the current chrome implementation

    // remove textNode content
    var isRemovingFromCurrentTagContainer = focusOffset + singleCharacter === focusNodeLength;
    if (isRemovingFromCurrentTagContainer) {
      ev.preventDefault();

      range = document.createRange();
      range.setStart(textNode, focusOffset);
      range.setEnd(textNode, (focusOffset + singleCharacter));
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
    }
    // move selection to next sibling
    nextSibling = focusNodeParent;
    do {
      nextSibling = nextSibling.nextSibling;
    } while (nextSibling !== null && $(nextSibling).hasClass('ue-tag-wrapper'));

    textNode = nextSibling;
    do {
      textNode = textNode.firstChild;
    } while (textNode !== null && textNode.nodeType !== me.textNodeType);

    if (!isRemovingFromCurrentTagContainer) {
      ev.preventDefault();
      range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, singleCharacter);
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
    }

    range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 0);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto.fixFirefoxPositionZero = function () {
  var selection = document.getSelection(),
      focusNode = selection.focusNode,
      ueText, ueTag, ueTagContainer,
      range;

  ueText = focusNode.parentNode;
  ueTag = ueText.previousSibling;

  if ($(ueTag).hasClass('ue-tag-wrapper')) {
    ueTagContainer = ueTag.previousSibling;

    range = document.createRange();
    range.selectNode(ueTagContainer.lastChild);
    range.collapse();

    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto.handleClearTagsShortcutPreventsDefault = function (ev) {
  var me = this,
    selection = new Selection.SelectionContext(),
    isCtrlPressed = ev.ctrlKey,
    isSpaceKeyPressed = ev.keyCode === me.keySpace,
    isClearTagsCommandPressed = isCtrlPressed && isSpaceKeyPressed;

  if (me.isCrossSegmentSelection()) {
    return;
  }

  if (selection.isCollapsed()) {
    return;
  }

  if (!isClearTagsCommandPressed) {
    return;
  }

  ev.preventDefault();
};

proto.handleClearTags = function (ev) {
  var me = this,
      selection = new Selection.SelectionContext(),
      isCtrlPressed = ev.ctrlKey,
      isSpaceKeyPressed = ev.keyCode === me.keySpace,
      isClearTagsCommandPressed = isCtrlPressed && isSpaceKeyPressed;

  if (me.isCrossSegmentSelection()) {
    return;
  }

  if (selection.isCollapsed()) {
    return;
  }

  if (!isClearTagsCommandPressed) {
    return;
  }

  me.tags = {};
  me.storedEvent = ev;

  var commonAncestorContainer = selection.commonAncestorContainer,
      startContainer = selection.startContainer,
      endContainer = selection.endContainer;
  if (commonAncestorContainer === startContainer && commonAncestorContainer === endContainer) {
    return;
  }
  // TODO see about edge cases where the startContainer and endContainer are left with no content
  // if selection at start is 0 maybe the tagpair start should automatically be included with the selection
  // if selection at end is full container length maybe the tagpair end should automatically be included with the selection

  var nodeWalker = new Selection.NodeWalker(startContainer);
  var end = new Selection.NodeWalker(endContainer);

  if (end.isTextNode()) {
    end = end.parent();
  }

  while (!nodeWalker.isNull() && !nodeWalker.isWrapperFor(commonAncestorContainer)) {
    me.identifyTagsInContainer(nodeWalker, end);
    nodeWalker = nodeWalker.parent();
  }

  var documentFragmentContainer = new Selection.NodeWalker(selection.cloneContents());

  me.moveTagsToFront = [];
  me.moveTagsToEnd = [];

  me.transformTags(documentFragmentContainer);

  me.moveTagsToFront.forEach(function (tag) {
    tag.remove();
  });
  me.moveTagsToEnd.forEach(function (tag) {
    tag.remove();
  });

  var needsToMoveTags =  me.moveTagsToFront.length > 0 || me.moveTagsToEnd.length > 0;
  if (!needsToMoveTags) {
    return;
  }

  selection.deleteContents();

  var patch = new Selection.NodeWalker(startContainer);
  if (patch.isTextNode()) {
    patch = patch.parent();
  }

  var lastEndTag = patch;
  while (patch.parent().isTagPairContainer()) {
    patch = patch.parent();
    if (me.moveTagsToFront.length > 0) {
      lastEndTag = me.moveTagsToFront.shift();
      patch.insertAfter(lastEndTag);
    }
  }
  lastEndTag.insertAfter(documentFragmentContainer);

  patch = new Selection.NodeWalker(endContainer);
  if (patch.isTextNode()) {
    patch = patch.parent();
  }

  while (!patch.isNull() && patch.parent().isTagPairContainer()) {
    patch = patch.parent();

    if (me.moveTagsToEnd.length > 0) {
      patch.insertBefore(me.moveTagsToEnd.pop());
    }
  }

  me.moveTagsToFront = null;
  me.moveTagsToEnd = null;
  me.tags = null;
  me.storedEvent = null;
};

proto.identifyTagsInContainer = function (nodeWalker, end) {
  var me = this,
      tagId;

  me.endContainerReached = false;

  do {
    if (nodeWalker.equals(end)) {
      me.endContainerReached = true;
    }

    if (nodeWalker.isTagPairContainer()) {
      nodeWalker = nodeWalker.firstChild();
      me.identifyTagsInContainer(nodeWalker, end);
      nodeWalker = nodeWalker.parent();
    }

    if (nodeWalker.isStartTag() && nodeWalker.canHide()) {
      tagId = nodeWalker.tagId();
      me.tags[tagId] = {startTag: nodeWalker,
        endTag: null
      };
    }

    if (nodeWalker.isEndTag() && nodeWalker.canHide()) {
      tagId = nodeWalker.tagId();
      me.tags[tagId] = me.tags[tagId] || {startTag: null, endTag: null };
      me.tags[tagId].endTag = nodeWalker;

      if (me.tags[tagId].startTag !== null) {
        me._removeInline(nodeWalker.el, me.storedEvent);

        delete me.tags[tagId];
      }
    }

    nodeWalker = nodeWalker.next();

  } while (!nodeWalker.isNull() && !me.endContainerReached);

  nodeWalker.returnToPrevious();
};

proto.transformTags = function (container) {
  var me = this,
      isInTags,
      nodeWalker;

  if (!container.hasChildren()) {
    return;
  }

  nodeWalker = container.firstChild();
  do {
    isInTags = nodeWalker.tagId() in me.tags;
    if (nodeWalker.isTagPairContainer() && isInTags) {
      var tagpair = nodeWalker;

      me.transformTags(tagpair);
      nodeWalker = nodeWalker.next();
      tagpair.replaceWithInnerContent();

      continue;
    }

    if (nodeWalker.isStartTag() && isInTags) {
      me.moveTagsToEnd.push(nodeWalker);
    }

    if (nodeWalker.isEndTag() && isInTags) {
      me.moveTagsToFront.push(nodeWalker);
    }

    nodeWalker = nodeWalker.next();
  } while (!nodeWalker.isNull());
};


proto.handleMissingTextContainer = function (ev) {
  var me = this,
      selection,
      focusNode,
      textContent,
      zeroWidthCharIndex,
      textBefore,
      textAfter,
      textEl,
      isInSegment,
      containerEl,
      currentText,
      ueTagWrapper,
      range;

  if (me.ignoredKeys.indexOf(ev.keyCode) !== -1) {
    return;
  }

  if (ev.keyCode === me.keyDelete || ev.keyCode === me.keyBackspace) {
    return;
  }

  selection = document.getSelection() || {};
  focusNode = selection.focusNode;

  if (focusNode === undefined || focusNode === null) {
    return;
  }

  textContent = focusNode.textContent;
  zeroWidthCharIndex = textContent.indexOf(String.fromCharCode(tmpl.zeroWidthNonJoinerCharCode));

  if (zeroWidthCharIndex > -1) {
    textBefore = textContent.substring(0, zeroWidthCharIndex);
    textAfter = textContent.substring(zeroWidthCharIndex + 1);

    textEl = $(tmpl.text).append(textBefore).append(textAfter);
    textEl[0].dataset.type = 'text';

    isInSegment = $(focusNode.parentNode).hasClass('ue-segment');

    if (isInSegment) {
      $(focusNode.nextSibling).prepend(textEl);
    } else {
      containerEl = $(focusNode.parentNode);

      if (containerEl.hasClass('ue-text')) {
        currentText = containerEl.text();
        containerEl.html(textEl.text() + currentText);
      } else if (containerEl.hasClass('ue-inline-content')) {
        containerEl.append(textEl);
      } else {
        ueTagWrapper = $(focusNode).parent();
        ueTagWrapper.after(textEl);
      }
    }

    $(focusNode).replaceWith(tmpl.zwnj);

    range = document.createRange();
    range.selectNode(textEl[0]);
    range.collapse();

    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto._hasInlineContentParent = function (node) {
  var hasInlineContentParent = $(node.parentNode).hasClass('ue-inline-content');

  return hasInlineContentParent;
};

proto._positionInParent = function (node) {
  var parent = node.parentNode,
      position = parent.children.indexOf(node);

  return position;
};

proto.resizeContainer = function (ev) {
  var me = this;
  var enterIsPressed = (ev.keyCode === me.keyEnter);

  if (!(ev.shiftKey && enterIsPressed)) {
    return;
  }

  segmentWatcher.resize(me.currentSegmentNumber);
};

proto.markCurrentSegment = function () {
  var me = this;

  var previousSegmentNumber = me.currentSegmentNumber;
  var previousSegmentEl = me.currentSegmentEl;

  var currentSegmentSelection = me._segmentUnderCurrentSelection();

  me.currentSegmentNumber = currentSegmentSelection.segmentNumber;
  me.currentSegmentEl = currentSegmentSelection.segmentEl;

  segmentWatcher.markContainerAsInactive(previousSegmentNumber);
  segmentWatcher.markContainerAsActive(me.currentSegmentNumber);

  if (me.currentSegmentNumber !== undefined &&
    me.currentSegmentEl !== undefined &&
    me.currentSegmentNumber !== previousSegmentNumber) {

    var currentDataset = me.currentSegmentEl.dataset;

    Mediator.publish('segment:start-edit', {
      el: me.currentSegmentEl,
      segmentNumber: currentDataset.segmentNumber,
      otherSegmentData: dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber)
    });

  }

  if (previousSegmentNumber !== me.currentSegmentNumber &&
      previousSegmentEl !== undefined) {
    var previousDataset = previousSegmentEl.dataset;

    Mediator.publish('segment:end-edit', {
      el: previousSegmentEl,
      segmentNumber: previousDataset.segmentNumber,
      otherSegmentData: dataProvider.getSegmentBySegmentNumber(previousSegmentNumber)
    });
  }
};

proto.changeStatusToDraft = function (ev) {
  var me = this,
      isShiftEnterPressed,
      segment,
      segmentData;

  isShiftEnterPressed = (ev.shiftKey && ev.keyCode === me.keyEnter);

  if (!isShiftEnterPressed && me.ignoredKeys.indexOf(ev.keyCode) !== -1) {
    return;
  }

  segmentData = dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber);
  segment = new Segment(segmentData);

  if ((!ev.ctrlKey || !ev.metaKey) && helpers.keyCodeToString(ev.which) !== 'l') {
    segment.changeToDraft();
  }


  Mediator.publish('segment:confirmationLevelChanged', segmentData);
};


proto.changeStatusToConfirmed = function (ev) {
  var me = this;
  var isCtrlEnterPressed = ev.ctrlKey && (ev.keyCode === me.keyEnter);

  if (!isCtrlEnterPressed) {
    return;
  }

  var segment = dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber);

  if (segment.confirmationlevel !== 'translated') {
    segment.confirmationlevel = 'translated';
    Mediator.publish('segment:confirmationLevelChanged', segment);
    Mediator.publish('segment:jumpToNextUnConfirmed', segment);
  }
};

proto.handleCaretPosition = function (ev) {
  var me = this,
      arrowKeyPressed = me.isArrowKey(ev.keyCode),
      selection = document.getSelection(),
      focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      movementKeys = [me.keyLeftArrow, me.keyRightArrow],
      indexOfMovementKeys = movementKeys.indexOf(ev.keyCode);

  if (selection === null || focusNode === null) {
    return;
  }

  if (indexOfMovementKeys === -1) {
    return;
  }

  var isTextNode = focusNode.nodeType === me.textNodeType;

  var isMovingForward = ev.keyCode === me.keyRightArrow;
  var moveDirection = isMovingForward ? 'forward' : 'backward';

  if (isTextNode && (me._isInvisibleChar(focusNode))) {
    if (ev.keyCode === me.keyLeftArrow) {
      selection.modify('move', 'backward', 'character');
    }

    if (ev.keyCode === me.keyRightArrow) {
      selection.modify('move', 'forward', 'character');
    }
  }

  if (focusNode.nodeType === me.elementNodeType) {
    selection.modify('move', 'forward', 'character');
  }

  while (me._isInsideTag(selection.focusNode)) {
    selection.modify('move', moveDirection, 'character');
  }
};

proto._isInvisibleChar = function (node) {
  var textContent = node.textContent,
      isInvisibleChar = textContent.length === 1 &&
                        textContent.charCodeAt(0) === tmpl.zeroWidthNonJoinerCharCode;

  return isInvisibleChar;
};

proto._isInsideTag = function (node) {
  var isTag;

  if (node.parentNode === null) {
    return false;
  }

  isTag = $(node.parentNode).hasClass('ue-tag');

  return isTag;
};

proto.isArrowKey = function (keyCode) {
  var me = this;

  return keyCode === me.keyUpArrow ||
         keyCode === me.keyDownArrow ||
         keyCode === me.keyLeftArrow ||
         keyCode === me.keyRightArrow;
};



/**
 * Lock current segment on CTRL+l
 * @param  {EventObject} ev
 */
proto.toggleSegmentLockState = function (ev) {
  var me = this,
      charKey = helpers.keyCodeToString(ev.which),
      segment = me._segmentUnderCurrentSelection(),
      segmentData = dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber),
      segmentEl = segment.segmentEl,
      isLockedSegment,
      sourceRel;

  if ((ev.ctrlKey || ev.metaKey) && charKey === 'l') {
    ev.preventDefault();

    isLockedSegment = segmentData.isLocked || false; //helpers.hasClass(segmentEl, 'ue-segment-locked');
    sourceRel = $('[data-source-segment-number="' + segment.segmentNumber + '"]')[0];

    if (isLockedSegment) {
      // Un-lock segment and publish unlock event
      [segmentEl, sourceRel].forEach(function (elem) {
        elem.classList.remove('ue-segment-locked');
        elem.dataset.isLocked = false;
        segmentData.isLocked = false;
      });

      Mediator.publish('segment:unlock', segmentData);

      return;
    }

    // Mark segment as locked and publish lock event
    [segmentEl, sourceRel].forEach(function (elem) {
      elem.classList.add('ue-segment-locked');
      elem.dataset.isLocked = true;
      segmentData.isLocked = true;
    });

    Mediator.publish('segment:lock', segmentData);
  }
};


/**
 * Insert tab on TAB keypress
 * @param  {Event} ev
 */
proto.insertTab = function (selection) {
  var tab = tmpl.keyTab.unicode,
      textNode = document.createTextNode(tab),
      range;

  if (!selection.anchorNode) {
    return;
  }

  range = selection.getRangeAt(0);


  if (selection.isCollapsed) {
    range.insertNode(textNode);
  }

  if (!selection.isCollapsed) {
    range.deleteContents();
    range.insertNode(textNode);
  }


  // Move cursor after inserted tab
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);

  selection.removeAllRanges();
  selection.addRange(range);
};


/**
 * Handel TAB keys press
 * @param  {Object} ev [description]
 */
proto.handleTabKey = function (ev) {
  var me = this,
      selection = document.getSelection();

  if (ev.keyCode === me.keyTab) {
    ev.preventDefault();

    // If locked segment or locked content
    // stop inserting tabs
    if (me.currentElementIsLocked) {
      return;
    }

    me.insertTab(selection);
  }
};


/**
 * Disables editting in a locked segment or a locked content
 * @param  {Object} ev
 */
proto.disableEditing = function (ev) {
  var me = this,
      currentSegment = me._segmentUnderCurrentSelection(),
      selectionContext = new Selection.SelectionContext(),
      selection = selectionContext.selection,
      nodeWalker = new Selection.NodeWalker(ev.target),
      isInvisibleChar = nodeWalker.isInvisibleChar(),
      isSegment = nodeWalker.isSegment(),
      segmentData, elem, range;

  // Make sure this is false by default
  me.currentElementIsLocked = false;

  // Is locked content
  if (selection.anchorNode) {
    elem = selectionContext.commonAncestorContainer;
  }

  if (isSegment && selectionContext.isCollapsed()) {
    range = document.createRange();
    range.selectNode(nodeWalker.firstChild().el.nextSibling);

    selection.removeAllRanges();
    selection.addRange(range);
    range.collapse(true);
  }

  // Is cursor in a locked segment or content?
  if (currentSegment.segmentEl.dataset.isLocked || helpers.hasParent(elem.parentNode, 'ue-locked-content')) {
    me.currentElementIsLocked = true;
  }

  if (me.currentElementIsLocked) {
    // Prevent user to edit locked segment or content
    if (!(ev.keyCode in me.allowedKeysInLockedContent)) {
      ev.preventDefault();

      segmentData = dataProvider.getSegmentBySegmentNumber(currentSegment.segmentNumber);

      // Prevent segment status change
      segmentData.stopEditing = me.currentElementIsLocked;
      Mediator.publish('segment:stopEditingInLockedContent', segmentData);

      return false;
    }
  }
};


/**
 * Handles cross segments selection
 * TODO: extend it for mouse drag selection or keyboard selection?
 */
proto.handleCrossSegmentSelection = function (ev) {
  var textContent = ev.target.textContent,
      selectionContext = new Selection.SelectionContext(),
      selection = selectionContext.selection,
      isInvisibleChar = (new Selection.NodeWalker(ev.target)).isInvisibleChar(),
      range;

  // If dblclick or tripleclick and segment is empty
  // (relies on Zero Width Non-Joiner, to be changed if it will be removed)
  if (ev.originalEvent.detail >= 2 && isInvisibleChar) {
    range = document.createRange();
    range.selectNode(ev.target.children[0]);

    selection.removeAllRanges();
    selection.addRange(range);
    range.collapse(true);
  }
};

module.exports = KeyboardBindings;
},{"./CommandManager":2,"./DataProvider":3,"./Helpers":5,"./Keyboard":6,"./Mediator":10,"./Mouse":11,"./Segment":14,"./SegmentsWatcher":17,"./Selection":18,"./Tmpl":21}],8:[function(require,module,exports){
/* File: Layout.js */
/* jshint undef: true, unused: true */
/* globals _, require, module */

'use strict';

var Helpers = require('./Helpers');
var Tmpl = require('./Tmpl');
var Mediator = require('./Mediator');
var RibbonMenuCommands = require('./layout/RibbonMenuCommands');

var displaySavingInformation = function (type) {
  var elem = document.getElementsByClassName('ue-status-information').item(0),
      children = elem ? elem.childNodes : null,
      tmpl = Tmpl.fileStatus,
      stringToHTMLElement = Helpers.stringToHTMLElement,
      i = 0, len, prepareMessage;

  // Exit if element is no present
  if (elem === undefined || elem === null) {
    return;
  }

  // Remove existing messages
  if (children.length) {
    len = children.length;

    for (; i < len; i++) {
      elem.removeChild(children[i]);
    }
  }

  // Display messages utility function
  prepareMessage = function (message) {
    return elem.appendChild(stringToHTMLElement(_.template(tmpl, {status: message})));
  }

  switch (type) {
    case 'before':
      prepareMessage('Saving changes...');
      break;

    case 'after':
      prepareMessage('All changes saved');
      break;

    case 'failed':
      prepareMessage('Saving failed');
      break;
  }
};

var beforeSave = function () {
  return displaySavingInformation('before');
};

var afterSave = function () {
  return displaySavingInformation('after');
};

var failedSave = function () {
  return displaySavingInformation('failed');
};


module.exports = {
  init: function () {
    $(function () {
      // TO DO: Re-factor this part which deals with
      //        editor columns resize
      $(window).on('load resize', function () {
        var wrapper = $('.wrapper'),
            west = $('.wrapper-west'),
            east = $('.wrapper-east'),
            lineNumbers = $('.ue-gutter'),
            status = $('.ue-status'),
            topHeight = $('.navbar').outerHeight(),
            ribbonHeight = $('.nav-ribbon').outerHeight(),
            windowHeight = $(window).height(),
            statusBarHeight = $('.status-bar').outerHeight(),
            colHeight;

        if (west.length || east.length) {
          colHeight = windowHeight - (topHeight + ribbonHeight + statusBarHeight);

          wrapper.height(colHeight);
          west.css('min-height', colHeight + 'px');
          east.css('min-height', colHeight + 'px');
          lineNumbers.css('min-height', colHeight + 'px');
          status.css('min-height', colHeight + 'px');
        }
      });

      // Sidebar show/hide
      $('.btn-menu').on('click', function () {
        var sidebarEl = $('.sidebar');

        $(this).toggleClass('active');
        if (sidebarEl.length) {
          sidebarEl.toggleClass('open');
        }
      });

    });

    Mediator.subscribe('save:before', beforeSave);
    Mediator.subscribe('save:done', afterSave);
    Mediator.subscribe('save:fail', failedSave);

    // Initialize the ribbon menu commands
    RibbonMenuCommands.init();
  }
};
},{"./Helpers":5,"./Mediator":10,"./Tmpl":21,"./layout/RibbonMenuCommands":29}],9:[function(require,module,exports){
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
},{"./DataProvider":3}],10:[function(require,module,exports){
/* File: Mediator.js */
/* jshint undef: true, unused: true */
/* globals module, pubsub */
'use strict';

// var Mediator = {},
//     mediator = new pubsub();

// // Method aliases
// Mediator.publish = mediator.pub;
// Mediator.subscribe = mediator.sub;
// Mediator.unsubscribe = mediator.unsub;
// Mediator.subscribe_once = mediator.once;
// Mediator.subscribe_recoup = mediator.recoup;



var EventEmitter = require('events').EventEmitter,
    Mediator = new EventEmitter();

// Method aliases
Mediator.publish = Mediator.emit;
Mediator.subscribe = Mediator.on;
Mediator.unsubscribe = Mediator.removeListener;
Mediator.subscribe_once = Mediator.once;
// Mediator.subscribe_recoup = events.recoup;

module.exports = Mediator;
},{"events":41}],11:[function(require,module,exports){
/* File: Mouse.js */
'use strict';
var CtrlHoverHandler = require('./mouse/CtrlHoverHandler');
var CtrlClickHandler = require('./mouse/CtrlClickHandler');

module.exports = {
  CtrlHoverHandler: CtrlHoverHandler,
  CtrlClickHandler: CtrlClickHandler
};
},{"./mouse/CtrlClickHandler":30,"./mouse/CtrlHoverHandler":31}],12:[function(require,module,exports){
/* File: NodeWrapper.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var Helpers = require('./Helpers');
var DataProvider = require('./DataProvider');
var TranslationOrigin = require('./TranslationOrigin');

var def;

var statusIconClass = {
    'NotTranslated': 'not-translated',
    'ApprovedSignOff': 'approved-sign-off',
    'ApprovedTranslation': 'approved-translation',
    'Draft': 'draft',
    'RejectedSignOff': 'rejected-sign-off',
    'RejectedTranslation': 'rejected-translation',
    'Translated': 'translated'
  };

var translationOriginClass = {
    'it': 'transparent',
    'at': 'blue',
    'pm': 'gray',
    'ap': 'yellow',
    'cm': 'green'
  };


var NodeWrapper = Helpers.constructor({
  _extend: Helpers._extend,

  init: function (attrs, parent) {
    this._attrs = attrs;
    this._parent = parent;
    this._extend(this, attrs);

    if (!this.type) {
      this.type = 'paragraph-unit';
    }

    if (this.metadata) {
      this.metadata = DataProvider.cacheMetadata(this.metadata);
    }

    switch (this.type) {

      case 'tagPair':
        def = this._extend({}, DataProvider.tagPairMap[this.tagPairDefinitionId]);
        def.pmetadata = def.metadata;
        delete def.metadata; // make sure we dont' overwrite our metadata
        delete def.id; // make sure we don't overwrite our id
        this._extend(this, def);

        break;

      case 'placeholderTag':
        def = this._extend({}, DataProvider.placeholderMap[this.placeholderTagDefinitionId]);
        def.pmetadata = def.metadata;
        delete def.metadata; // make sure we dont' overwrite our metadata
        delete def.id; // make sure we don't overwrite our id
        this._extend(this, def);

        break;

      case 'segment':
        if (!this.translationOrigin) {
          this.translationOrigin = TranslationOrigin.create();
        }

        DataProvider.segmentsMap[this.segmentNumber] = {
          'ordernumber' : this.segmentNumber,
          'isLocked' : this.isLocked || false,
          'confirmationlevel': statusIconClass[this.confirmationLevel] || 'not-translated',
          'translationorigin': this.translationOrigin
        };
        DataProvider.segmentsMapLength++;

        break;

      case 'text':
        break;

      case 'locked':
        break;
    }

    if (this.source) {
      this.source = new NodeWrapper(this.source, this);
    }

    if (this.target) {
      this.target = new NodeWrapper(this.target, this);
    }

    this._parent = parent || null;


    if (this.children) {
      this.children = this.children.map(function (child) {
        return new NodeWrapper(child, this);
      }, this);
    }


    // Prepare formatting
    if (this.formattingGroupId) {
      this.formattingGroup = this._extend(this.formattingGroup || {}, DataProvider.formatingGroupMap[this.formattingGroupId]);
    }
  },

  containsSegment: function () {
    return this.isSegment() || (this.children && this.children.filter(function (child) {
      return child.containsSegment();
    }).length);
  },

  isSegment: function () {
    return this.type === 'segment' || (this._parent && this._parent.isSegment());
  },

  metadataText: function () {
    return this.metadata ? JSON.stringify(this.metadata) : '';
  },

  subcontentText: function () {
    return this.localizableSubContentList ? JSON.stringify(this.localizableSubContentList) : '';
  },

  translationOriginText: function () {
    return this.translationOrigin ? JSON.stringify(this.translationOrigin) : '';
  },

  statusIcon: function () {
    return DataProvider.segmentsMap[this.segmentNumber].confirmationlevel || 'not-translated';
  },

  displayOriginIcon: function () {
    var translationOrigin = DataProvider.segmentsMap[this.segmentNumber].translationorigin;

    if (!translationOrigin || !translationOrigin.originType) {
      return false;
    }

    var lastType = (translationOrigin.originBeforeAdaptation) ? translationOrigin.originBeforeAdaptation.originType : null;
    var originTypes = {'interactive': true, 'source': true};

    if (originTypes[translationOrigin.originType] &&
        translationOrigin.matchPercent === 0 &&
        (translationOrigin.originBeforeAdaptation === null ||
         lastType === null || originTypes[lastType])) {
      return false;
    }

    return true;
  },

  originClass: function () {
    var translationOrigin = DataProvider.segmentsMap[this.segmentNumber].translationorigin,
        type = TranslationOrigin.originType(translationOrigin),
        className = translationOriginClass[type];

    if (className) {
      return className;
    }

    return translationOrigin.matchPercent < 100 ? 'yellow' : 'green';
  },

  originText: function () {
    var t = DataProvider.segmentsMap[this.segmentNumber].translationorigin;
    var type = TranslationOrigin.originType(t);
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
  },

  /**
   * Get segment locked state
   */
  isLockedSegment: function () {
    return DataProvider.segmentsMap[this.segmentNumber].isLocked || false;
  },

  segmentInfo: function () {
    var segm = DataProvider.segmentsMap[this.segmentNumber];

    if (segm === undefined) {
      return '';
    }

    return TranslationOrigin.translationInfo(segm);
  },

  puid: function () {
    if (this.type === 'paragraph-unit') {
      return this.id;
    }

    if (this._parent) {
      return this._parent.puid();
    }

    return null;
  },

  childSegments: function () {
    return this.children ? this.children.filter(function (item) {
      return item.containsSegment();
    }) : [];
  },

  segments: function () {
    var segments = [],
        i = 0;
    if (this.type === 'paragraph-unit') {
      var sourceSegments = this.source.segments();
      var targetSegments = this.target.segments();
      for (i = 0; i < sourceSegments.length; i++) {
        segments.push({
          puid: this.id,
          source: sourceSegments[i],
          target: targetSegments[i]
        });
      }
    } else {
      var children = this.childSegments();

      for (i = 0; i < children.length; i++) {

        if (children[i].type === 'segment') {
          segments.push(children[i]);
        } else {

          var s = children[i].segments().map(function (segment) {
            var flat = this.clone();
            flat.children = [segment];
            return flat;
          }, children[i]);

          segments = segments.concat(s);
        }
      }
    }
    return segments;
  },

  clone: function () {
    return new NodeWrapper(this._attrs, this._parent);
  },

  showTags: function () {
    return this.type === 'tagPair' && this.canHide === false && this.isSegment();
  },

  query: function (callback) {
    var res = [];
    if (callback(this)) {
      res.push(this);
    }

    if (this.children && this.children.length) {
      var child_res = this.children.map(function (child) {
        return child.query(callback);
      });
      res = Array.prototype.concat.apply(res, child_res);
    }

    return res;
  }
});

module.exports = NodeWrapper;
},{"./DataProvider":3,"./Helpers":5,"./TranslationOrigin":22}],13:[function(require,module,exports){
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
},{"./DataProvider":3,"./KeyboardBindings":7,"./SegmentsWatcher":17,"./SideBySideParagraphUnitsRenderer":19}],14:[function(require,module,exports){
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
},{"./DataProvider":3,"./TranslationOrigin":22}],15:[function(require,module,exports){
/* File: SegmentCleanup.js */
'use strict';
var SegmentWatcher = require('./SegmentsWatcher');
var NodeWalker = require('./selection/NodeWalker');
var Tmpl = require('./Tmpl');

var proto;

function SegmentCleanup(segmentNo) {
  this.segment = SegmentWatcher.getTargetEl(segmentNo);
  this.walker = new NodeWalker(this.segment);
}

proto = SegmentCleanup.prototype;

proto.cleanStructure = function () {
  var me = this,
    walker = me.walker;

  if (!walker.isSegment()) {
    throw 'The structure must begin processing at segment level.';
  }

  me.ensureInlineContentExists();
  me.processStartOfSegment();
  me.processEndOfSegment();

  me.processTextElements();

};

proto.ensureInlineContentExists = function () {
  var me = this,
    walker = me.walker;

  walker = walker.firstChild();
  while (!walker.isNull() && !walker.isInlineContent()) {
    walker = walker.next();
  }

  if (walker.isInlineContent()) {
    return;
  }

  walker = me.walker;

  walker.append(Tmpl.buildSegmentInlineContent());
};

proto.processStartOfSegment = function () {
  var me = this,
    walker = me.walker,
    collectElementsToBeMoved = [];

  walker = walker.firstChild();
  if (walker.isInlineContent()) {
    return;
  }

  while (!walker.isNull() && !walker.isInlineContent()) {
    collectElementsToBeMoved.push(walker.el);
    walker = walker.next();
  }

  collectElementsToBeMoved.forEach(function (val) {
    walker.prepend(val);
  });
};

proto.processEndOfSegment = function () {
  var me = this,
    walker = me.walker,
    collectElementsToBeMoved = [];

  walker = walker.lastChild();

  while (!walker.isNull() && !walker.isInlineContent()) {
    collectElementsToBeMoved.push(walker.el);
    walker = walker.prev();
  }

  collectElementsToBeMoved.forEach(function (val) {
    walker.append(val);
  });
};

proto.processTextElements = function () {
  var me = this,
    walker = me.walker,
    processQueue = [],
    transformationRequired = {},
    trackingId = 0,
    tagIdentified;

  processQueue.push(walker.firstChild());

  function pushToQueue(child) {
    processQueue.push(child);
  }

  while (processQueue.length > 0) {
    walker = processQueue.pop();
    if (!walker.isTextNode()) {
      walker.forEachChild(pushToQueue);
    }

    if (walker.isTag() && walker.parent().isText()) {
      tagIdentified = walker;
      walker = walker.parent();
      if (!walker.el.dataset.trackingId) {
        transformationRequired[trackingId] = tagIdentified;
        walker.el.dataset.trackingId = trackingId;
        trackingId++;
      }
    }
  }

  for (trackingId in transformationRequired) {
    var prev, next, parent;

    walker = transformationRequired[trackingId];
    prev = walker.prev();
    next = walker.next();
    parent = walker.parent();

    if (!prev.isNull() && prev.isTextNode()) {
      me.moveTextNodeOutside(prev);
    }

    if (walker.isPlaceholder()) {
      me.movePlaceholderOutside(walker);
    }

    if (!next.isNull() && next.isTextNode()) {
      me.moveTextNodeOutside(next);
    }

    parent.remove();
  }
};

proto.moveTextNodeOutside = function (nodeWalker) {
  var parent,
    parentEl,
    parentClone;

  parent = nodeWalker.parent();
  parentEl = parent.el;
  parentClone = parentEl.cloneNode(false);
  parentClone.appendChild(nodeWalker.el);
  parent.insertAfter(parentClone);
};

proto.movePlaceholderOutside = function (placeholder) {
  var parent = placeholder.parent();

  parent = placeholder.parent();
  parent.insertAfter(placeholder);
};
module.exports = SegmentCleanup;
},{"./SegmentsWatcher":17,"./Tmpl":21,"./selection/NodeWalker":35}],16:[function(require,module,exports){
/* File: SegmentStatusUpdater.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var Mediator = require('./Mediator');
var DataProvider = require('./DataProvider');
var Segment = require('./Segment');
var SegmentsWatcher = require('./SegmentsWatcher');
var SideBySideParagraphUnitsRenderer = require('./SideBySideParagraphUnitsRenderer');

var renderer = new SideBySideParagraphUnitsRenderer();

function segmentStatusUpdate (segmentData) {
  var segment,
      status,
      segmentContainer;

  // Stop changing the status when cursor is
  // in locked segment or locked content
  if (segmentData.stopEditing) {
    return;
  }

  segment = new Segment(segmentData);
  status = renderer.renderStatus(segment);
  segmentContainer = SegmentsWatcher.getContainerBySegmentNumber(segment.segmentNumber);

  segmentContainer.replaceStatusEl(status);
  SegmentsWatcher.resize(segment.segmentNumber);
  SegmentsWatcher.markContainerAsActive(segment.segmentNumber);
};

function jumpToNextUnConfirmedSegment (segmentData) {
  var initialSegment,
      segment;

  initialSegment = segment = new Segment(segmentData);

  do {
    var nextSegmentData = DataProvider.getSegmentBySegmentNumber(+segment.segmentNumber + 1);
    segment = null;

    if (nextSegmentData) {
      segment = new Segment(nextSegmentData);
    }

  } while (segment !== null && segment.isConfirmed());

  if (segment === null) {
    return;
  }

  SegmentsWatcher.markContainerAsInactive(initialSegment.segmentNumber);
  SegmentsWatcher.markContainerAsActive(segment.segmentNumber);
  SegmentsWatcher.focusTarget(segment.segmentNumber);
};

var SegmentStatusUpdater = function () {
  Mediator.subscribe('segment:confirmationLevelChanged', segmentStatusUpdate);
  Mediator.subscribe('segment:jumpToNextUnConfirmed', jumpToNextUnConfirmedSegment);

  Mediator.subscribe('segment:lock', segmentStatusUpdate);
  Mediator.subscribe('segment:unlock', segmentStatusUpdate);

  Mediator.subscribe('segment:stopEditingInLockedContent', segmentStatusUpdate);
};

module.exports = SegmentStatusUpdater();
},{"./DataProvider":3,"./Mediator":10,"./Segment":14,"./SegmentsWatcher":17,"./SideBySideParagraphUnitsRenderer":19}],17:[function(require,module,exports){
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
},{}],18:[function(require,module,exports){
/* File: Selection.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var nodeWalker = require('./selection/NodeWalker');
var tagPair = require('./selection/TagPair');
var selectionContext = require('./selection/SelectionContext');


module.exports = {
  NodeWalker: nodeWalker,
  SelectionContext: selectionContext,
  TagPair: tagPair
};
},{"./selection/NodeWalker":35,"./selection/SelectionContext":36,"./selection/TagPair":37}],19:[function(require,module,exports){
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
},{"./Helpers":5,"./NodeWrapper":12,"./SegmentsWatcher":17,"./Tmpl":21,"./config":25,"./renderer/StylesMap":32,"./renderer/TagContentBuilder":33}],20:[function(require,module,exports){
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
},{"./Mediator":10,"./config":25}],21:[function(require,module,exports){
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
},{"./Helpers":5}],22:[function(require,module,exports){
/* File: TranslationOrigin.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var Helpers = require('./Helpers');

var TranslationOrigin = (function () {
  var __extend = Helpers._extend;

  var translationOrigin = {
    metadata :                null, // array of Objects = {name : String, value : String}
    originType :              null, // String
    originSystem:             null,
    matchPercent:             0,    // Int
    textContextMatchLevel:    null,
    originalTranslationHash:  null,
    originBeforeAdaptation:   null, // {object - translationOrigin type of object}
    isStructureContextMatch:  false // boolean
  };

  // Not used?
  // var formatOriginType = {
  //   'al':  'auto-aligned',
  //   'ap':  'auto-propagated',
  //   'at':  'mt',
  //   'nt':  'not-translated',
  //   'src': 'source',
  //   'un':  'unknown'
  // };

  var confirmationLevelText = {
    'not-translated':       'Not Translated',
    'NotTranslated':        'Not Translated',
    'approved-sign-off':    'Sign Off',
    'ApprovedSignOff':      'Sign Off',
    'approved-translation': 'Translation Approved',
    'ApprovedTranslation':  'Translation Approved',
    'draft':                'Draft',
    'Draft':                'Draft',
    'rejected-sign-off':    'Sign Off Rejected',
    'RejectedSignOff':      'Sign Off Rejected',
    'rejected-translation': 'Translation Rejected',
    'RejectedTranslation':  'Translation Rejected',
    'translated':           'Translated',
    'Translated':           'Translated'
  };

  var originText = {
    'al':  'Auto-aligned',
    'ap':  'Auto-propagated',
    'at':  'Automated Translation',
    'cm':  'Context Match',
    'em':  'Exact Match',
    'fm':  'Fuzzy Match',
    'it':  'Interactive',
    'nt':  'Not Translated',
    'pm':  'Perfect Match',
    'src': 'Copied From Source',
    'tm':  'Translation Memory',
    'un':  'Unknown'
  };

  function translationDetails(segmentData) {
    var info = 'Translation Details: ' + '\r\n',
        status = confirmationLevelText[segmentData.confirmationlevel] || 'Not Translated',
        type = TranslationOrigin.originType(segmentData.translationorigin);

    //add confirmation level info
    info += 'Status: ' + status + '\r\n';

    //add origin info
    info += 'Origin: ' + originText[type] + '\r\n';

    //add origin system
    if (type !== 'it') {
      info += 'System: ' + segmentData.translationorigin.originSystem + '\r\n';
    }

    //add percent info
    info += 'Score: ' + segmentData.translationorigin.matchPercent + '%' + '\r\n';

    return info;
  }

  function beforeInteractiveEditing(tObj) {
    var tO = tObj.originBeforeAdaptation,
        info, type;

    if (!isDifferent(tObj, tO)) {
      return '';
    }

    info = 'Before Interactive Editing: ' + '\r\n';
    type = TranslationOrigin.originType(tO);

    //add origin info
    info += 'Origin: ' + originText[type] + '\r\n';

    //add origin system
    if (tO.originSystem) {
      info += 'System: ' + tO.originSystem + '\r\n';
    }

    //add percent info
    info += 'Score: ' + tO.matchPercent + '%' + '\r\n';

    return info;
  }

  function isDifferent(tO, originalTO) {
    if (!tO.originType || !originalTO || !originalTO.originType) {
      return false;
    }

    if (tO.originType !== originalTO.originType) {
      return true;
    }

    if (tO.matchPercent !== originalTO.matchPercent) {
      return true;
    }

    // TO DO - not finished
    //textContextMatchLevel conpare

    return false;
  }

  return {
    create: function () {
      return translationOrigin;
    },

    originalFormat: function (trOrigin) {
      var cloneTrOrigin = __extend({}, trOrigin);
      delete cloneTrOrigin.wasChanged;

      return cloneTrOrigin;
    },

    /**
     * Clone | Duplicate translation Origin Object
     */
    clone: function (trOrigin) {
      return {
        metadata :               trOrigin.metadata,
        originType:              trOrigin.originType,
        originSystem:            trOrigin.originSystem,
        matchPercent:            trOrigin.matchPercent,
        textContextMatchLevel:   trOrigin.textContextMatchLevel,
        originalTranslationHash: trOrigin.originalTranslationHash,
        originBeforeAdaptation:  trOrigin.originBeforeAdaptation,
        isStructureContextMatch: trOrigin.isStructureContextMatch,
      };
    },

    translationInfo: function (data) {
      //translation details
      var details = translationDetails(data),
          moreDetails;

      //before interactive editing details
      if (data.translationorigin.originBeforeAdaptation !== null) {
        moreDetails = beforeInteractiveEditing(data.translationorigin, data.confirmationlevel);
        details += (moreDetails !== '') ? '\r\n' + moreDetails : '';
      }

      return details;
    },

    originType : function (translationObj) {
      var shortOriginType = 'it';

      if (translationObj === undefined || translationObj === [] || translationObj === {}) {
        return shortOriginType;
      }

      if (translationObj.originType === undefined || translationObj.originType === null || translationObj.originType === 'interactive') {
        return shortOriginType;
      }

      //!!!!! Do not change if order !!!!!
      if (translationObj.matchPercent !== null && translationObj.matchPercent === 100) {      //Exact Match case
        shortOriginType = 'em';
      } else if (translationObj.matchPercent !== null && translationObj.matchPercent < 100) { //Fuzzy Match case
        shortOriginType = 'fm';
      }

      switch (translationObj.originType) {
        case 'tm': //Translation Memory case
          shortOriginType = 'tm';

          if (translationObj.textContextMatchLevel !== null && translationObj.textContextMatchLevel.toLowerCase() === 'sourceandtarget') {
            shortOriginType = 'cm';
          }
          break;

        case 'document-match': //Perfect Match case
          if (translationObj.textContextMatchLevel !== null && translationObj.textContextMatchLevel.toLowerCase() === 'source') {
            shortOriginType = 'pm';
          }
          break;

        case 'mt': //Automated Translation case
          shortOriginType = 'at';
          break;

        case 'source': //Source case
          shortOriginType = 'src';
          break;

        case 'auto-propagated': //Source case
          shortOriginType = 'ap';
          break;

        case 'not-translated': //Not Translated case !!!!! NOT TREATED
          shortOriginType = 'nt';
          break;

        case 'auto-aligned': //Auto-aligned case !!!!! NOT TREATED
          shortOriginType = 'al';
          break;

        case 'unknown': //Unknown case !!!!! NOT TREATED
          shortOriginType = 'un';
          break;
      }

      return shortOriginType;
    }
  };
})();

module.exports = TranslationOrigin;
},{"./Helpers":5}],23:[function(require,module,exports){
/* File: ue.js */
/* jshint undef: true, unused: true */
/* globals $, require, module */

'use strict';

var config = require('./config');
var DataProvider = require('./DataProvider');
var Documents = require('./Documents');
var Layout = require('./Layout');
var CommandManager = require('./CommandManager');
var SegmentStatusUpdater = require('./SegmentStatusUpdater');


var App = module.exports = {};

// Rendering module
var ViewRenderer = (function () {
  return {
    init: function () {
      this.$body = $('body');

      Layout.init();
      Documents.init();
    }
  };
})();

// Default config
App.config = config;

// Default environment
App.config.environment = 'development';

// App initialization
App.init = function (options) {

  // Merge config if the case
  if (options.config && (typeof options.config === 'object')) {
    for (var key in options.config) {
      if (options.config.hasOwnProperty(key)) {
        App.config[key] = options.config[key];
      }
    }
  }

  DataProvider.init();
  ViewRenderer.init();
  Documents.openDocument(options.doc);
};

// Expose command mannager as an external API
App.CommandManager = CommandManager;
},{"./CommandManager":2,"./DataProvider":3,"./Documents":4,"./Layout":8,"./SegmentStatusUpdater":16,"./config":25}],24:[function(require,module,exports){
/* File: EditorCommands.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var config = require('../config');

var cmds = {
  'paste': {
    handle: function (ev) {
      var text,
          rInvalidChars = /\r?\n/g,
          html = document.createElement('span'),
          clipboard = (ev.originalEvent || ev).clipboardData;

      ev.preventDefault();

      if (clipboard === undefined || clipboard === null) {
        text = window.clipboardData.getData('text') || '';

        if (text !== '') {
          text = text.replace(rInvalidChars, ' ');
          window.getSelection().getRangeAt(0).insertNode(html);
        }

      } else {
        text = clipboard.getData('text/plain') || '';

        if (text !== '') {
          text = text.replace(rInvalidChars, ' ');
          document.execCommand('insertText', false, text);
        }
      }
    }
  }
};

module.exports = cmds;
},{"../config":25}],25:[function(require,module,exports){
/* File: config.js */
/* jshint undef: true, unused: true */
/* globals module */
'use strict';

var config = {
  fullMode: true,

  //set the storage implementation module
  storage: 'StorageImplementation',

  //set display limit of paragraph units
  //defaultLimit: 50,
  defaultLimit: 1000, //trying to get load all paragraphs in file

  //set the default offset from where to get paragraph units
  defaultOffset: 0,

  baseUrl: 'http://clujeditor01:8080/wse/lue',//'http://localhost:8080/ce',
  //apiUrl: UE.config.baseUrl + '',
  apiUrl: 'http://clujeditor01:8080/wse/lue',

  tagDisplayContext: {
    // Determines how the tag pairs will be displayed
    //
    // Options:
    //    none    - No Tag Text
    //    partial - Partial Tag Text
    //    full    - Full Tag Text
    //    id      - Tag Id
    //
    // The default display mode is Partial Tag Text
    tagDisplayMode: 'partial',
    showFormatting: false
  }
};

module.exports = config;
},{}],26:[function(require,module,exports){
/* File: Keys.js */
/* jshint undef: true, unused: true */
/* globals module */

'use strict';

var FUNCTION_KEYS = {
  // Keyboard keys
  keyTab: 9,
  keyBackspace: 8,
  keyEnter: 13,
  keySpace: 32,

  keyPageUp: 33,
  keyPageDown: 34,
  keyEnd: 35,
  keyHome: 36,
  keyInsert: 45,
  keyDelete: 46,

  keyLeftArrow: 37,
  keyUpArrow: 38,
  keyRightArrow: 39,
  keyDownArrow: 40,

  keyShift: 16,
  keyCtrl: 17,
  keyAlt: 18,
  keyEsc: 27,

  keyCapsLock: 20,
  keyNumLock: 144,
  keyScrollLock: 145,

  keyF1: 112,
  keyF2: 113,
  keyF3: 114,
  keyF4: 115,
  keyF5: 116,
  keyF6: 117,
  keyF7: 118,
  keyF8: 119,
  keyF9: 120,
  keyF10: 121,
  keyF11: 122,
  keyF12: 123
};

var IGNORED_KEYS = [
  FUNCTION_KEYS.keyLeftArrow,
  FUNCTION_KEYS.keyUpArrow,
  FUNCTION_KEYS.keyRightArrow,
  FUNCTION_KEYS.keyDownArrow,
  FUNCTION_KEYS.keyCapsLock,
  FUNCTION_KEYS.keyScrollLock,
  FUNCTION_KEYS.keyNumLock,
  FUNCTION_KEYS.keyAlt,
  FUNCTION_KEYS.keyCtrl,
  FUNCTION_KEYS.keyShift,
  FUNCTION_KEYS.keyPageUp,
  FUNCTION_KEYS.keyPageDown,
  FUNCTION_KEYS.keyHome,
  FUNCTION_KEYS.keyEnd,
  FUNCTION_KEYS.keyEnter,
  FUNCTION_KEYS.keyEsc,
  FUNCTION_KEYS.keyInsert,
  FUNCTION_KEYS.keyF1,
  FUNCTION_KEYS.keyF2,
  FUNCTION_KEYS.keyF3,
  FUNCTION_KEYS.keyF4,
  FUNCTION_KEYS.keyF5,
  FUNCTION_KEYS.keyF6,
  FUNCTION_KEYS.keyF7,
  FUNCTION_KEYS.keyF8,
  FUNCTION_KEYS.keyF9,
  FUNCTION_KEYS.keyF10,
  FUNCTION_KEYS.keyF11,
  FUNCTION_KEYS.keyF12
];

var ALLOWED_IN_LOCKED_CONTENT = {
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',

  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12'
};

var Keys = {
  functionKeys: FUNCTION_KEYS,
  ignoredKeys: IGNORED_KEYS,
  allowedKeysInLockedContent: ALLOWED_IN_LOCKED_CONTENT
};

module.exports = Keys;
},{}],27:[function(require,module,exports){
/* File: SegmentUnderCurrentSelection.js */
/* jshint undef: true, unused: true */
/* globals _ */
'use strict';
function SegmentUnderCurrentSelection() {
  var segmentNumber,
      segmentEl;

  var selection = document.getSelection();
  var focusNode = selection.focusNode;


  if (focusNode === null) {
    return {
      segmentNumber: undefined,
      segmentEl: undefined
    };
  }

  if (focusNode.dataset !== undefined) {
    segmentNumber = focusNode.dataset.segmentNumber;
    segmentEl = focusNode;
  }

  if (segmentNumber === undefined) {
    var parentSegment = $(selection.focusNode).parents('.ue-segment');
    var parentSegmentEl = _(parentSegment).first();

    segmentNumber = parentSegmentEl.dataset.segmentNumber;
    segmentEl = parentSegmentEl;
  }

  return {
    segmentNumber: segmentNumber,
    segmentEl: segmentEl
  };
}

module.exports = SegmentUnderCurrentSelection;
},{}],28:[function(require,module,exports){
/* File: ShiftEnterHandler.js */
/* jshint undef: true, unused: true */
/* globals require, module */
"use strict";

var Helpers = require('../Helpers');
var SegmentsWatcher = require('../SegmentsWatcher');
var KeyboardBindings = require('../KeyboardBindings');
var Keys = require('./Keys');
var Selection = require('../selection');

var ShiftEnterHandler = function (ev) {
  var me = this,
      isShiftKeyPressed = ev.shiftKey,
      isEnterPressed = ev.keyCode === Keys.functionKeys.keyEnter,
      isHandlingRequired = isShiftKeyPressed && isEnterPressed,
      selection = new Selection.SelectionContext(),
      focusNode = selection.focusNode;

  if (!isHandlingRequired) {
    return;
  }

  me.focus = new Selection.NodeWalker(focusNode);
  me.breakLinesOutsideOfText = [];

  me.moveFocusToTargetSegment();
  me.moveBreakLinesToTextContainers();

  SegmentsWatcher.resize(me.segmentNumber);
};

var proto = ShiftEnterHandler.prototype;

proto.moveFocusToTargetSegment = function () {
  var me = this,
      focus = me.focus;

  while (!focus.isNull() && !focus.isSegment()) {
    focus = focus.parent();
  }

  me.segmentNumber = focus.segmentNumber();
  me.focus = focus;
};

proto.moveBreakLinesToTextContainers = function () {
  var me = this,
      nodeWalker = me.focus;

  me.moveThrough(nodeWalker);
};

proto.moveThrough = function (container) {
  var me = this,
      nodeWalker = container;

  nodeWalker = nodeWalker.firstChild();
  while (!nodeWalker.isNull()) {

    if (nodeWalker.isInlineContent()) {
      me.insertBreakLinesAtStartOf(nodeWalker);
    }

    if (nodeWalker.isElement('br') && nodeWalker.parent().isSegment()) {
      me.breakLinesOutsideOfText.push(nodeWalker);
    }

    if (nodeWalker.isElement('br') && nodeWalker.parent().isTag()) {
      me.moveNodeAfterTheTag(nodeWalker);
    }

    if (nodeWalker.isElement()) {
      me.moveThrough(nodeWalker);
    }

    if (nodeWalker.isTag()) {
      me.exportNewLines(nodeWalker);
      me.insertBreakLinesAfter(nodeWalker);
    }

    if (nodeWalker.isText()) {
      me.convertCarriageReturnToBreak(nodeWalker);
    }

    nodeWalker = nodeWalker.next();
  }
};

proto.insertBreakLinesAtStartOf = function (nodeWalker) {
  var me = this,
      breakLineElement,
      firstChild = nodeWalker.firstChild();

  while (me.breakLinesOutsideOfText.length > 0) {
    breakLineElement = me.breakLinesOutsideOfText.pop();

    if (!firstChild.isNull()) {
      firstChild.insertBefore(breakLineElement);
    } else {
      nodeWalker.append(breakLineElement);
    }
  }
};

proto.insertBreakLinesAfter = function (nodeWalker) {
  var me = this,
      breakLineElement;

  while (me.breakLinesOutsideOfText.length > 0) {
    breakLineElement = me.breakLinesOutsideOfText.pop();

    nodeWalker.insertAfter(breakLineElement);
  }
};

proto.exportNewLines = function (container) {
  var me = this,
      textContent,
      newLinesCount,
      i,
      br;

  if (container.isNull()) {
    return;
  }

  textContent = container.textContent();
  newLinesCount = textContent.split('\n').length - 1;

  for (i = 0; i < newLinesCount; i++) {
    br = Helpers.stringToHTMLElement('<br>');
    me.breakLinesOutsideOfText.push(br);
  }

  if (newLinesCount > 0) {
    me.cleanCarriageReturnFrom(container);
  }
};

proto.cleanCarriageReturnFrom = function (container) {
  var processingQueue = [container],
      nodeValue;

  while (processingQueue.length > 0) {
    var item = processingQueue.pop();

    if (item.isTextNode()) {
      nodeValue = item.el.nodeValue;
      nodeValue = nodeValue.replace('\n', '');
      item.el.nodeValue = nodeValue;
    }

    if (!item.next().isNull()) {
      processingQueue.push(item.next());
    }

    if (!item.firstChild().isNull()) {
      processingQueue.push(item.firstChild());
    }
  }
};

proto.convertCarriageReturnToBreak = function (container) {
  var nodeWalker = container.firstChild();
  var nodeValue;
  var breakNode;
  var carriageReturnNode;
  var parentNode;

  while (!nodeWalker.isNull()) {
    if (nodeWalker.isTextNode()) {
      nodeValue = nodeWalker.el.nodeValue;
      carriageReturnNode = nodeWalker.el;
      parentNode = nodeWalker.el.parentNode;

      if (nodeValue === '\n') {
        breakNode = document.createElement('br');
        parentNode.replaceChild(breakNode, carriageReturnNode);
        nodeWalker.el = breakNode;
      }
    }

    nodeWalker = nodeWalker.next();
  }

};

proto.moveNodeAfterTheTag = function (brNode) {
  var tag = brNode.parent();

  tag.insertAfter(brNode);
};

module.exports = ShiftEnterHandler;
},{"../Helpers":5,"../KeyboardBindings":7,"../SegmentsWatcher":17,"../selection":34,"./Keys":26}],29:[function(require,module,exports){
/* File: RibbonMenuCommands.js */
/* jshint undef: true, unused: true */
/* globals $, require, module */

'use strict';

var config = require('../config');
var Mediator = require('../Mediator');
var CommandManager = require('../CommandManager');

var Storage = require('../Storage');
var DataProvider = require('../DataProvider');
var Paragraphs = require('../Paragraphs');

var cmdr = new CommandManager();

var RibbonMenuCommands = {
  setupListeners: function () {
    var me = this;

    var commands = {
      'toggle_formatting_tags': {
        handle: function (elem) {
          var target = $(elem),
              hidden = target.data('hidden'),
              showFormatting = config.tagDisplayContext.showFormatting;

          if (showFormatting) {
            target.data('hidden', false).addClass('active');
          }

          if (typeof hidden === 'undefined' || hidden) {
            target.data('hidden', false).addClass('active');
            me.showTags();
            config.tagDisplayContext.showFormatting = true;
          } else {
            target.data('hidden', true).removeClass('active');
            me.hideTags();
            config.tagDisplayContext.showFormatting = false;
          }
        }
      },

      'display_tag_none': {
        handle: function (elem) {
          me.toggleGroupedButtons(elem);
          me.switchDisplayMode('none');
        }
      },

      'display_tag_partial': {
        handle: function (elem) {
          me.toggleGroupedButtons(elem);
          me.switchDisplayMode('partial');
        }
      },

      'display_tag_full': {
        handle: function (elem) {
          me.toggleGroupedButtons(elem);
          me.switchDisplayMode('full');
        }
      },

      'display_tag_id': {
        handle: function (elem) {
          me.toggleGroupedButtons(elem);
          me.switchDisplayMode('id');
        }
      }
    };

    me.$ribbon.on('click', '[data-action]', function (ev) {
      var elem = ev.currentTarget;

      Mediator.publish('ribbon:command', {
        elem: elem,
        action: elem.dataset.action || null
      });
    });

    // Set up commands for the ribbon menu
    cmdr.addCommands(commands);

  },

  hideTags: function () {
    var me = this,
        elems = me.$editor.find('[data-can-hide="true"]');

    elems.addClass('hide').data('can-delete', false);
  },

  showTags: function () {
    var me = this,
        elems = me.$editor.find('[data-can-hide="true"]');

    elems.removeClass('hide').data('can-delete', true);
  },


  /**
   * Toggle grouped buttons state
   * @param  {HTMLElement} target - Clicked element
   *
   * TODO: it depends heavily on jQuery, this should be changed
   */
  toggleGroupedButtons: function (target) {
    var targetEl = $(target);

    if (!target.dataset.actionGroup) {
      return;
    }

    targetEl.parents('.nav-ribbon-panel')
            .find('[data-action-group]')
            .removeClass('active');

    targetEl.addClass('active');
  },


  /**
   * Switch the display mode for formatting tags
   * @param  {String} mode
   */
  switchDisplayMode: function (mode) {
    var me = this,
        storage = Storage[config.storage].getInstance(),
        currentDoc = DataProvider.getCurrentDocument();

    config.tagDisplayContext.tagDisplayMode = mode;

    me.$editor.html('');
    Paragraphs._renderParagraphs(storage.paragraphs, currentDoc);
  },


  init: function () {
    var me = this;

    me.$editor = $('#editor-body');
    me.$ribbon = $('.nav-ribbon');

    me.setupListeners();
  }
};

// Subscribe to ribbon commands and execute them
Mediator.subscribe('ribbon:command', function (data) {
  cmdr.execute(data.action, data.elem);
});

module.exports = RibbonMenuCommands;
},{"../CommandManager":2,"../DataProvider":3,"../Mediator":10,"../Paragraphs":13,"../Storage":20,"../config":25}],30:[function(require,module,exports){
/* File: CtrlClickHandler.js */
/* jshint undef: true, unused: true */
/* globals _ */
'use strict';
var helpers = require('../Helpers');
var dataProvider = require('../DataProvider');

var Mediator = require('../Mediator');
var Segment = require('../Segment');
var Keyboard = require('../Keyboard');
var NodeWalker = require('../selection').NodeWalker;
var TagPair = require('../selection').TagPair;
var SelectionContext = require('../selection').SelectionContext;

function MouseCtrlClickHandler() {
}
var proto = MouseCtrlClickHandler.prototype;

/**
 * Inserts tags or wraps selections with tags
 * @param  {Object} ev jQuery event object
 */
proto.handle = function (ev) {
  var me = this,
      tag, tags,
      placeholderClone,
      currentSegment = Keyboard.SegmentUnderCurrentSelection(),
      currentSegmentNumber = currentSegment.segmentNumber,
      isSelectionInSource, isCollapsed,
      segment, segmentData,
      startContainer;

  tag = new NodeWalker(ev.currentTarget);
  tags = document.createDocumentFragment();

  if (!tag.isTag()) {
    return;
  }

  if (tag.isPlaceholder()) {
    placeholderClone = tag.el.cloneNode(true);
    me.clearActiveClass(placeholderClone);
    me.disableTagCopy(placeholderClone);
    tags.appendChild(placeholderClone);
  } else {
    tag = new TagPair(tag);
    tags = tag.cloneStructure();
    me.clearActiveClass(tags.childNodes[0]);
    me.clearActiveClass(tags.childNodes[2]);

    me.disableTagCopy(tags.childNodes[0]);
    me.disableTagCopy(tags.childNodes[2]);
  }

  me.range = new SelectionContext();
  startContainer = me.range.startContainer;

  if (!startContainer) {
    return;
  }

  isCollapsed = me.range.isCollapsed();

  isSelectionInSource = helpers.hasParent(startContainer, 'ue-source');

  // Check if selection is in source
  if (isSelectionInSource) {
    return;
  }

  // If CTRL key is pressed and clicked
  // mouse button is left button, insert tag
  if (ev.ctrlKey && ev.which === 1) {
    if (isCollapsed) {
      me.insertTagAtCursor(tags);
    } else {
      me.insertTagOverSelection(tags);
    }

    // Change segment status to draft after tag insertion
    segmentData = dataProvider.getSegmentBySegmentNumber(currentSegmentNumber);
    segment = new Segment(segmentData);
    segment.changeToDraft();

    // Publish segment status has changed
    Mediator.publish('segment:confirmationLevelChanged', segmentData);
    ev.preventDefault();
  }
};

proto.clearActiveClass = function (tagWrapper) {
  var tag = tagWrapper.firstChild;
  tag.classList.remove('active');
};

proto.disableTagCopy = function (tagWrapper) {
  tagWrapper.dataset.tagCopy = false;
};

/**
 * Inserts the clicked tag at the current cursor position
 * @param  {DocumentFragment}  tags
 */
proto.insertTagAtCursor = function (tags) {
  var me = this,
      html = document.createDocumentFragment(),
      range = me.range,
      insertedNode = tags.firstChild,
      focusNode = insertedNode.lastChild;// I expect the invisible char to be here.

  html.appendChild(tags);

  range.insertNode(html);
  me.setCursorAt(focusNode);
};

proto.setCursorAt = function (focusNode){
  var me = this,
      range = me.range;

  if(focusNode === null || focusNode === undefined){
    return;
  }

  _.delay(function () {
    range.changeRange(function(newRange){
      var selectionOffset = 1;
      newRange.setStart(focusNode, selectionOffset);
      newRange.setEnd(focusNode, selectionOffset);

      return true;
    });
  });
};

/**
 * Wraps selection and inserts it at the current cursor position
 * @param  {DocumentFragment}  tags
 */
proto.insertTagOverSelection = function (tags) {
  var me = this,
      html = document.createDocumentFragment(),
      range = me.range,
      documentFragment,
      inlineContent;

  documentFragment = range.cloneContents();

  html.appendChild(tags);

  inlineContent = html.querySelector('.ue-inline-content');
  if (inlineContent !== null) {
    inlineContent.appendChild(documentFragment);
  }

  range.deleteContents();
  range.insertNode(html);
  me.selectContent(inlineContent);
};

proto.selectContent = function (inlineContent) {
  var me = this,
      range = me.range;

  if(inlineContent === undefined || inlineContent === null){
    return;
  }

  range.changeRange(function (range) {
    range.selectNodeContents(inlineContent);

    return true;
  });
};

module.exports = MouseCtrlClickHandler;
},{"../DataProvider":3,"../Helpers":5,"../Keyboard":6,"../Mediator":10,"../Segment":14,"../selection":34}],31:[function(require,module,exports){
/* File: CtrlHoverHandler.js */
/* jshint undef: true, unused: true */
'use strict';

function MouseCtrlHoverHandler() {
}

var proto = MouseCtrlHoverHandler.prototype;

proto.mouseOver = function (ev) {
  if (!ev.ctrlKey || ev.type !== 'mouseover') {
    return;
  }
  $(ev.currentTarget).children().addClass('active');
};

proto.mouseLeave = function (ev) {
  if (ev.type !== 'mouseleave') {
    return;
  }
  $(ev.currentTarget).children().removeClass('active');
};
module.exports = MouseCtrlHoverHandler;
},{}],32:[function(require,module,exports){
/* File: StylesMap.js */
/* jshint undef: true, unused: true */
/* globals module */

'use strict';

// Used to map different represetations
// of a true/false strings
var booleanMap = {
  'FALSE': false,
  'False': false,
  'false': false,
  'TRUE': true,
  'True': true,
  'true': true
};

// Map text position names to multiple CSS properties,
// because 'super' and 'sub' values of 'vertical-align' property are not enough
var textPositionMap = {
  'Superscript': {
    'font-size': '0.8em',
    'vertical-align': '0.6em'
  },
  'Subscript': {
    'font-size': '0.8em',
    'vertical-align': '-0.3em'
  },
  'Normal': {
    'font-size': 'inherit',
    'vertical-align': 'inherit'
  }
};

var StylesMap = {
  'textcolor': function (value) {
    var values = value.split(','),
        rgbRegexp = /(^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*)$/i,
        rgbTest, rgbText;

    // In case TextColor format is '"TextColor": "0, 112, 48, 160"'
    if (values.length > 3) {
      values.shift();
    }

    // If "TextColor":"Transparent"
    // it happens when white text has background color in a MS Word document
    if (typeof value === 'string' && value.toLowerCase() === 'transparent') {
      value = 'rgb(255, 255, 255)';
    }

    rgbText = values.toString();
    rgbTest = rgbText.match(rgbRegexp);

    return {
      'color': rgbTest ? 'rgb(' + rgbText + ')' : value.toLowerCase()
    };
  },

  'fontsize': function (value) {
    var str = value.match(/\s*(\d{1,3})px/);

    return {
      'font-size': str ? value : value + 'px'
    };
  },

  'bold': function (value) {
    return {
      'font-weight': value ? 'bold' : 'normal'
    };
  },

  'italic': function (value) {
    return {
      'font-style': value ? 'italic' : 'none'
    };
  },

  'fontname': function (value) {
    return {
      'font-family': value
    };
  },

  'underline': function (value) {
    return {
      'text-decoration': booleanMap[value] ? 'underline' : 'none'
    };
  },

  'strikethrough': function (value) {
    return {
      'text-decoration': booleanMap[value] ? 'line-through' : 'none'
    };
  },

  'textposition': function (value) {
    return textPositionMap[value];
  },

  'backgroundcolor': function (value) {
    var values = value.split(','),
        rgbRegexp = /(^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*)$/i,
        rgbTest, rgbText;

    // In case TextColor format is '"TextColor": "0, 112, 48, 160"'
    if (values.length > 3) {
      values.shift();
    }

    rgbText = values.toString();
    rgbTest = rgbText.match(rgbRegexp);

    return {
      'background-color': rgbTest ? 'rgb(' + rgbText + ')' : value.toLowerCase()
    };
  },

  'shadow': function () {},
  'rstyle': function () {},
  'w14:prstdash': function () {},
  'w14:reflection': function () {},
  'w14:glow': function () {},
  'fonttheme': function () {},
  'w14:props3d': function () {}
};

module.exports = StylesMap;
},{}],33:[function(require,module,exports){
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
},{}],34:[function(require,module,exports){
module.exports=require(18)
},{"./selection/NodeWalker":35,"./selection/SelectionContext":36,"./selection/TagPair":37}],35:[function(require,module,exports){
/* File: NodeWalker.js */
/* jshint undef: true, unused: true */
/* globals $, module, require */
'use strict';

var Tmpl = require('../Tmpl');

var NodeWalker = function (node) {
  var me = this;

  me.el = node;
  me.returnNode = null;
};

var proto = NodeWalker.prototype;

proto.tagId = function () {
  var me = this,
      el = me.el;

  if (me.isNull() || me.isTextNode()) {
    return null;
  }

  return el.dataset.id;
};

proto.isSegment = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-segment');
};

proto.isInlineContent = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-inline-content');
};

proto.isText = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-text');
};

proto.isTextNode = function () {
  var me = this;

  if (me.isNull()) {
    return false;
  }

  return me.el.nodeType === 3;
};

proto.isTagPairContainer = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-tagpair-content');
};

proto.isTag = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.classList.contains('ue-tag-wrapper');
};

proto.isStartTag = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.dataset.type === 'start-tag';
};

proto.isEndTag = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.dataset.type === 'end-tag';
};

proto.isPlaceholder = function () {
  var me = this;

  if (me.isNull()) {
    return false;
  }

  return me.el.dataset.type === 'placeholder';
};

proto.canHide = function () {
  var me = this;

  if (me.isNull() || me.isTextNode()) {
    return false;
  }

  return me.el.dataset.canHide;
};

/**
 * Loop over parents and return true if isLoked property is set
 * @return {Boolean} returns true if element or parent is locked
 */
proto.isLocked = function () {
  var me = this,
      node = me.el,
      isLocked = (node.hasOwnProperty('dataset') && node.dataset.isLocked) ? node.dataset.isLocked : false;

  while (!isLocked && node.nodeType !== 9) {
    isLocked = (node.hasOwnProperty('dataset') && node.dataset.isLocked) ? node.dataset.isLocked : false;
    node = node.parentNode;
  }

  return isLocked;
};

proto.isWrapperFor = function (node) {
  var me = this,
      el = me.el;

  return el === node;
};


/**
 * Tests if the cursor is in an empty segment
 * that contains only Zero Width Non-Joiner char
 *
 * @return {Boolean} true if it's an empty segment
 */
proto.isInvisibleChar = function () {
  var me = this,
      el = me.el,
      tmpl = Tmpl,
      textContent = el.textContent,
      isInvisibleChar;

  isInvisibleChar = textContent.length === 1 &&
    textContent.charCodeAt(0) === tmpl.zeroWidthNonJoinerCharCode;

  return isInvisibleChar;
};


proto.isElement = function (name) {
  var me = this,
      el = me.el,
      isElementType = me.el.nodeType === 1,
      checkName = name !== undefined && name !== null,
      result;

  result = isElementType;
  if (checkName) {
    result = result && el.nodeName.toLowerCase() === name;
  }

  return result;
};

proto.isNull = function () {
  var me = this;

  return me.el === null || me.el === undefined;
};

proto.hasChildren = function () {
  var me = this,
      childNodes = me.el.childNodes;

  return childNodes.length !== 0;
};

proto.equals = function (nodeWalker) {
  var me = this;

  if (me.isNull() && nodeWalker.isNull()) {
    return true;
  }

  return me.el === nodeWalker.el;
};

proto.textContent = function () {
  var me = this,
      el = me.el;

  return el.textContent;
};

proto.parent = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.el.parentNode);
  walker.returnNode = returnNode;

  return walker;
};

proto.returnToPrevious = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.returnNode);
  walker.returnNode = returnNode;

  return walker;
};

proto.next = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.el.nextSibling);
  walker.returnNode = returnNode;

  return walker;
};

proto.prev = function () {
  var me = this,
      returnNode = me.el,
      walker;

  walker = new NodeWalker(me.el.previousSibling);
  walker.returnNode = returnNode;

  return walker;
};

proto.remove = function () {
  var me = this,
      parent = me.el.parentNode;
  parent.removeChild(me.el);
};

proto.firstChild = function () {
  var me = this,
      el = me.el,
      firstChild = me.el.firstChild,
      walker;

  walker = new NodeWalker(firstChild);
  walker.returnNode = el;

  return walker;
};

proto.lastChild = function () {
  var me = this,
      el = me.el,
      lastChild = me.el.lastChild,
      walker;

  walker = new NodeWalker(lastChild);
  walker.returnNode = el;

  return walker;
};

proto.replaceWithInnerContent = function () {
  var me = this,
      $el = $(me.el);

  $el.replaceWith($el.children());

  me.el = null;
};

proto.insertBefore = function (node) {
  var me = this,
      el = me.el,
      parent = el.parentNode,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  parent.insertBefore(nodeEl, el);
};

proto.insertAfter = function (node) {
  var me = this,
      el = me.el,
      parent = el.parentNode,
      nextSibling = el.nextSibling,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  parent.insertBefore(nodeEl, nextSibling);
};

proto.append = function (node) {
  var me = this,
      el = me.el,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  el.appendChild(nodeEl);
};

proto.prepend = function (node) {
  var me = this,
      el = me.el,
      nodeEl;

  if (node instanceof NodeWalker) {
    nodeEl = node.el;
  } else {
    nodeEl = node;
  }

  el.insertBefore(nodeEl, el.firstChild);
};

proto.segmentNumber = function () {
  var me = this,
      el = me.el;

  return el.dataset.segmentNumber;
};

proto.setCanCopy = function (value) {
  var me = this,
      el = me.el;
  el.dataset.canCopy = value;
};

proto.canCopy = function () {
  var me = this,
      el = me.el;
  return el.dataset.canCopy;
};

proto.hasClass = function (cssClass) {
  var me = this,
      el = me.el;

  return el.classList.contains(cssClass);
};

proto.addClass = function (cssClass) {
  var me = this,
      el = me.el;

  el.classList.add(cssClass);
};

proto.removeClass = function (cssClass) {
  var me = this,
      el = me.el;
  el.classList.remove(cssClass);
};

proto.forEachChild = function (callback) {
  var me = this,
      walker = me.firstChild();

  while (!walker.isNull()) {
    callback(walker);

    walker = walker.next();
  }
};
module.exports = NodeWalker;
},{"../Tmpl":21}],36:[function(require,module,exports){
/* File: SelectionContext.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var TextNodeType = 3;
var ElementNodeType = 1;

var SelectionContext = function () {
  var me = this;

  me.selection = document.getSelection();
  me.range = me.selection.getRangeAt(0);

  me.commonAncestorContainer = me.range.commonAncestorContainer;
  me.startContainer = me.range.startContainer;
  me.startOffset = me.range.startOffset;
  me.endContainer = me.range.endContainer;
  me.endOffset = me.range.endOffset;

  me.focusNode = me.selection.focusNode;
  me.focusOffset = me.selection.focusOffset;
  me.focusNodeParents = [];

  me.hasFocusNodeParent = me.focusNode !== null && me.focusNode.parentNode !== null;
  if (me.hasFocusNodeParent) {
    me.focusNodeParent = me.focusNode.parentNode;
  }

  me.isFocusTextNode = me.focusNode.nodeType === TextNodeType;
  me.isStartContainerTextNode = me.startContainer.nodeType === TextNodeType;
  me.isEndContainerTextNode = me.endContainer.nodeType === TextNodeType;
};

var proto = SelectionContext.prototype;

proto.isCollapsed = function () {
  var me = this;
  return me.range.collapsed;
};

proto.cloneContents = function () {
  var me = this;
  return me.range.cloneContents();
};

proto.deleteContents = function () {
  var me = this;

  me.range.deleteContents();
};

proto.insertNode = function (node) {
  var me = this;

  me.range.insertNode(node);
};

proto.hasCommonAncestorClass = function (className) {
  var me = this,
      commonAncestorContainer = me.commonAncestorContainer,
      result;

  if (commonAncestorContainer.nodeType === 3 || commonAncestorContainer === null) {
    return;
  }

  result = commonAncestorContainer.classList.contains(className);
  return result;
};

proto.changeRange = function (changeCallback) {
  var me = this,
    selection = me.selection,
    newRange = document.createRange();

  if (!changeCallback) {
    return;
  }

  if(!changeCallback(newRange)){
    return;
  }

  selection.removeAllRanges();
  selection.addRange(newRange);
};

module.exports = SelectionContext;
},{}],37:[function(require,module,exports){
/* File: MouseCtrlClickHandler_test.js */
/* jshint undef: true, unused: true */
'use strict';
var NodeWalker = require('./NodeWalker');

var proto;
/*
 * Creates a tag pair formed of start-tag,
 * end-tag, inner-content.
 * @param {HTMLNode} el - can be any start-tag, inline-content,
 * or end-tag
 */
function TagPair(el) {
  if (el instanceof NodeWalker) {
    el = el.el;
  }
  this.el = el;
  this.walker = new NodeWalker(el);

  this.valid = (!this.walker.isPlaceholder()) && (this.walker.isTag() || this.walker.isTagPairContainer());

  if (this.walker.isStartTag()) {
    this.processFromStartTag();
  } else if (this.walker.isTagPairContainer()) {
    this.processFromTagPairContainer();
  } else if (this.walker.isEndTag()) {
    this.processFromEndTag();
  }
}
proto = TagPair.prototype;
/*
 * @returns {boolean}
 */
proto.isValid = function () {
  return this.valid;
};

proto.processFromStartTag = function () {
  this.startTagEl = this.walker.el;
  this.walker = this.walker.next();
  this.inlineContentEl = this.walker.el;
  this.walker = this.walker.next();
  this.endTagEl = this.walker.el;
};

proto.processFromTagPairContainer = function () {
  this.walker = this.walker.prev();
  this.processFromStartTag();
};

proto.processFromEndTag = function () {
  this.walker = this.walker.prev();
  this.processFromTagPairContainer();
};
/*
 * clones the Tag Pair structure
 * @returns {DocumentFragment} documentFragment
 */
proto.cloneStructure = function () {
  var me = this,
      startTagClone,
      inlineContentClone,
      endTagClone,
      documentFragment = document.createDocumentFragment();

  startTagClone = me.startTagEl.cloneNode(true);
  inlineContentClone = me.inlineContentEl.cloneNode(false);
  endTagClone = me.endTagEl.cloneNode(true);

  documentFragment.appendChild(startTagClone);
  documentFragment.appendChild(inlineContentClone);
  documentFragment.appendChild(endTagClone);

  return documentFragment;
};

proto.toArray = function () {
  return [
    this.startTagEl,
    this.inlineContentEl,
    this.endTagEl
  ];
};

module.exports = TagPair;

},{"./NodeWalker":35}],38:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

},{"base64-js":39,"ieee754":40}],39:[function(require,module,exports){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var ZERO   = '0'.charCodeAt(0)
	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS)
			return 62 // '+'
		if (code === SLASH)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	module.exports.toByteArray = b64ToByteArray
	module.exports.fromByteArray = uint8ToBase64
}())

},{}],40:[function(require,module,exports){
exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isLE ? (nBytes - 1) : 0,
      d = isLE ? -1 : 1,
      s = buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0),
      i = isLE ? 0 : (nBytes - 1),
      d = isLE ? 1 : -1,
      s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8);

  e = (e << mLen) | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8);

  buffer[offset + i - d] |= s * 128;
};

},{}],41:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],42:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],43:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.once = noop;
process.off = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],44:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],45:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("d:\\xampp\\htdocs\\universal-editor-web\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":44,"d:\\xampp\\htdocs\\universal-editor-web\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":43,"inherits":42}],46:[function(require,module,exports){
module.exports = require('./lib/chai');

},{"./lib/chai":47}],47:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var used = []
  , exports = module.exports = {};

/*!
 * Chai version
 */

exports.version = '1.9.1';

/*!
 * Assertion Error
 */

exports.AssertionError = require('assertion-error');

/*!
 * Utils for plugins (not exported)
 */

var util = require('./chai/utils');

/**
 * # .use(function)
 *
 * Provides a way to extend the internals of Chai
 *
 * @param {Function}
 * @returns {this} for chaining
 * @api public
 */

exports.use = function (fn) {
  if (!~used.indexOf(fn)) {
    fn(this, util);
    used.push(fn);
  }

  return this;
};

/*!
 * Configuration
 */

var config = require('./chai/config');
exports.config = config;

/*!
 * Primary `Assertion` prototype
 */

var assertion = require('./chai/assertion');
exports.use(assertion);

/*!
 * Core Assertions
 */

var core = require('./chai/core/assertions');
exports.use(core);

/*!
 * Expect interface
 */

var expect = require('./chai/interface/expect');
exports.use(expect);

/*!
 * Should interface
 */

var should = require('./chai/interface/should');
exports.use(should);

/*!
 * Assert interface
 */

var assert = require('./chai/interface/assert');
exports.use(assert);

},{"./chai/assertion":48,"./chai/config":49,"./chai/core/assertions":50,"./chai/interface/assert":51,"./chai/interface/expect":52,"./chai/interface/should":53,"./chai/utils":64,"assertion-error":73}],48:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('./config');

module.exports = function (_chai, util) {
  /*!
   * Module dependencies.
   */

  var AssertionError = _chai.AssertionError
    , flag = util.flag;

  /*!
   * Module export.
   */

  _chai.Assertion = Assertion;

  /*!
   * Assertion Constructor
   *
   * Creates object for chaining.
   *
   * @api private
   */

  function Assertion (obj, msg, stack) {
    flag(this, 'ssfi', stack || arguments.callee);
    flag(this, 'object', obj);
    flag(this, 'message', msg);
  }

  Object.defineProperty(Assertion, 'includeStack', {
    get: function() {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      return config.includeStack;
    },
    set: function(value) {
      console.warn('Assertion.includeStack is deprecated, use chai.config.includeStack instead.');
      config.includeStack = value;
    }
  });

  Object.defineProperty(Assertion, 'showDiff', {
    get: function() {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      return config.showDiff;
    },
    set: function(value) {
      console.warn('Assertion.showDiff is deprecated, use chai.config.showDiff instead.');
      config.showDiff = value;
    }
  });

  Assertion.addProperty = function (name, fn) {
    util.addProperty(this.prototype, name, fn);
  };

  Assertion.addMethod = function (name, fn) {
    util.addMethod(this.prototype, name, fn);
  };

  Assertion.addChainableMethod = function (name, fn, chainingBehavior) {
    util.addChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  Assertion.overwriteProperty = function (name, fn) {
    util.overwriteProperty(this.prototype, name, fn);
  };

  Assertion.overwriteMethod = function (name, fn) {
    util.overwriteMethod(this.prototype, name, fn);
  };

  Assertion.overwriteChainableMethod = function (name, fn, chainingBehavior) {
    util.overwriteChainableMethod(this.prototype, name, fn, chainingBehavior);
  };

  /*!
   * ### .assert(expression, message, negateMessage, expected, actual)
   *
   * Executes an expression and check expectations. Throws AssertionError for reporting if test doesn't pass.
   *
   * @name assert
   * @param {Philosophical} expression to be tested
   * @param {String} message to display if fails
   * @param {String} negatedMessage to display if negated expression fails
   * @param {Mixed} expected value (remember to check for negation)
   * @param {Mixed} actual (optional) will default to `this.obj`
   * @api private
   */

  Assertion.prototype.assert = function (expr, msg, negateMsg, expected, _actual, showDiff) {
    var ok = util.test(this, arguments);
    if (true !== showDiff) showDiff = false;
    if (true !== config.showDiff) showDiff = false;

    if (!ok) {
      var msg = util.getMessage(this, arguments)
        , actual = util.getActual(this, arguments);
      throw new AssertionError(msg, {
          actual: actual
        , expected: expected
        , showDiff: showDiff
      }, (config.includeStack) ? this.assert : flag(this, 'ssfi'));
    }
  };

  /*!
   * ### ._obj
   *
   * Quick reference to stored `actual` value for plugin developers.
   *
   * @api private
   */

  Object.defineProperty(Assertion.prototype, '_obj',
    { get: function () {
        return flag(this, 'object');
      }
    , set: function (val) {
        flag(this, 'object', val);
      }
  });
};

},{"./config":49}],49:[function(require,module,exports){
module.exports = {

  /**
   * ### config.includeStack
   *
   * User configurable property, influences whether stack trace
   * is included in Assertion error message. Default of false
   * suppresses stack trace in the error message.
   *
   *     chai.config.includeStack = true;  // enable stack on error
   *
   * @param {Boolean}
   * @api public
   */

   includeStack: false,

  /**
   * ### config.showDiff
   *
   * User configurable property, influences whether or not
   * the `showDiff` flag should be included in the thrown
   * AssertionErrors. `false` will always be `false`; `true`
   * will be true when the assertion has requested a diff
   * be shown.
   *
   * @param {Boolean}
   * @api public
   */

  showDiff: true,

  /**
   * ### config.truncateThreshold
   *
   * User configurable property, sets length threshold for actual and
   * expected values in assertion errors. If this threshold is exceeded,
   * the value is truncated.
   *
   * Set it to zero if you want to disable truncating altogether.
   *
   *     chai.config.truncateThreshold = 0;  // disable truncating
   *
   * @param {Number}
   * @api public
   */

  truncateThreshold: 40

};

},{}],50:[function(require,module,exports){
/*!
 * chai
 * http://chaijs.com
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, _) {
  var Assertion = chai.Assertion
    , toString = Object.prototype.toString
    , flag = _.flag;

  /**
   * ### Language Chains
   *
   * The following are provided as chainable getters to
   * improve the readability of your assertions. They
   * do not provide testing capabilities unless they
   * have been overwritten by a plugin.
   *
   * **Chains**
   *
   * - to
   * - be
   * - been
   * - is
   * - that
   * - and
   * - has
   * - have
   * - with
   * - at
   * - of
   * - same
   *
   * @name language chains
   * @api public
   */

  [ 'to', 'be', 'been'
  , 'is', 'and', 'has', 'have'
  , 'with', 'that', 'at'
  , 'of', 'same' ].forEach(function (chain) {
    Assertion.addProperty(chain, function () {
      return this;
    });
  });

  /**
   * ### .not
   *
   * Negates any of assertions following in the chain.
   *
   *     expect(foo).to.not.equal('bar');
   *     expect(goodFn).to.not.throw(Error);
   *     expect({ foo: 'baz' }).to.have.property('foo')
   *       .and.not.equal('bar');
   *
   * @name not
   * @api public
   */

  Assertion.addProperty('not', function () {
    flag(this, 'negate', true);
  });

  /**
   * ### .deep
   *
   * Sets the `deep` flag, later used by the `equal` and
   * `property` assertions.
   *
   *     expect(foo).to.deep.equal({ bar: 'baz' });
   *     expect({ foo: { bar: { baz: 'quux' } } })
   *       .to.have.deep.property('foo.bar.baz', 'quux');
   *
   * @name deep
   * @api public
   */

  Assertion.addProperty('deep', function () {
    flag(this, 'deep', true);
  });

  /**
   * ### .a(type)
   *
   * The `a` and `an` assertions are aliases that can be
   * used either as language chains or to assert a value's
   * type.
   *
   *     // typeof
   *     expect('test').to.be.a('string');
   *     expect({ foo: 'bar' }).to.be.an('object');
   *     expect(null).to.be.a('null');
   *     expect(undefined).to.be.an('undefined');
   *
   *     // language chain
   *     expect(foo).to.be.an.instanceof(Foo);
   *
   * @name a
   * @alias an
   * @param {String} type
   * @param {String} message _optional_
   * @api public
   */

  function an (type, msg) {
    if (msg) flag(this, 'message', msg);
    type = type.toLowerCase();
    var obj = flag(this, 'object')
      , article = ~[ 'a', 'e', 'i', 'o', 'u' ].indexOf(type.charAt(0)) ? 'an ' : 'a ';

    this.assert(
        type === _.type(obj)
      , 'expected #{this} to be ' + article + type
      , 'expected #{this} not to be ' + article + type
    );
  }

  Assertion.addChainableMethod('an', an);
  Assertion.addChainableMethod('a', an);

  /**
   * ### .include(value)
   *
   * The `include` and `contain` assertions can be used as either property
   * based language chains or as methods to assert the inclusion of an object
   * in an array or a substring in a string. When used as language chains,
   * they toggle the `contain` flag for the `keys` assertion.
   *
   *     expect([1,2,3]).to.include(2);
   *     expect('foobar').to.contain('foo');
   *     expect({ foo: 'bar', hello: 'universe' }).to.include.keys('foo');
   *
   * @name include
   * @alias contain
   * @param {Object|String|Number} obj
   * @param {String} message _optional_
   * @api public
   */

  function includeChainingBehavior () {
    flag(this, 'contains', true);
  }

  function include (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    var expected = false;
    if (_.type(obj) === 'array' && _.type(val) === 'object') {
      for (var i in obj) {
        if (_.eql(obj[i], val)) {
          expected = true;
          break;
        }
      }
    } else if (_.type(val) === 'object') {
      if (!flag(this, 'negate')) {
        for (var k in val) new Assertion(obj).property(k, val[k]);
        return;
      }
      var subset = {}
      for (var k in val) subset[k] = obj[k]
      expected = _.eql(subset, val);
    } else {
      expected = obj && ~obj.indexOf(val)
    }
    this.assert(
        expected
      , 'expected #{this} to include ' + _.inspect(val)
      , 'expected #{this} to not include ' + _.inspect(val));
  }

  Assertion.addChainableMethod('include', include, includeChainingBehavior);
  Assertion.addChainableMethod('contain', include, includeChainingBehavior);

  /**
   * ### .ok
   *
   * Asserts that the target is truthy.
   *
   *     expect('everthing').to.be.ok;
   *     expect(1).to.be.ok;
   *     expect(false).to.not.be.ok;
   *     expect(undefined).to.not.be.ok;
   *     expect(null).to.not.be.ok;
   *
   * @name ok
   * @api public
   */

  Assertion.addProperty('ok', function () {
    this.assert(
        flag(this, 'object')
      , 'expected #{this} to be truthy'
      , 'expected #{this} to be falsy');
  });

  /**
   * ### .true
   *
   * Asserts that the target is `true`.
   *
   *     expect(true).to.be.true;
   *     expect(1).to.not.be.true;
   *
   * @name true
   * @api public
   */

  Assertion.addProperty('true', function () {
    this.assert(
        true === flag(this, 'object')
      , 'expected #{this} to be true'
      , 'expected #{this} to be false'
      , this.negate ? false : true
    );
  });

  /**
   * ### .false
   *
   * Asserts that the target is `false`.
   *
   *     expect(false).to.be.false;
   *     expect(0).to.not.be.false;
   *
   * @name false
   * @api public
   */

  Assertion.addProperty('false', function () {
    this.assert(
        false === flag(this, 'object')
      , 'expected #{this} to be false'
      , 'expected #{this} to be true'
      , this.negate ? true : false
    );
  });

  /**
   * ### .null
   *
   * Asserts that the target is `null`.
   *
   *     expect(null).to.be.null;
   *     expect(undefined).not.to.be.null;
   *
   * @name null
   * @api public
   */

  Assertion.addProperty('null', function () {
    this.assert(
        null === flag(this, 'object')
      , 'expected #{this} to be null'
      , 'expected #{this} not to be null'
    );
  });

  /**
   * ### .undefined
   *
   * Asserts that the target is `undefined`.
   *
   *     expect(undefined).to.be.undefined;
   *     expect(null).to.not.be.undefined;
   *
   * @name undefined
   * @api public
   */

  Assertion.addProperty('undefined', function () {
    this.assert(
        undefined === flag(this, 'object')
      , 'expected #{this} to be undefined'
      , 'expected #{this} not to be undefined'
    );
  });

  /**
   * ### .exist
   *
   * Asserts that the target is neither `null` nor `undefined`.
   *
   *     var foo = 'hi'
   *       , bar = null
   *       , baz;
   *
   *     expect(foo).to.exist;
   *     expect(bar).to.not.exist;
   *     expect(baz).to.not.exist;
   *
   * @name exist
   * @api public
   */

  Assertion.addProperty('exist', function () {
    this.assert(
        null != flag(this, 'object')
      , 'expected #{this} to exist'
      , 'expected #{this} to not exist'
    );
  });


  /**
   * ### .empty
   *
   * Asserts that the target's length is `0`. For arrays, it checks
   * the `length` property. For objects, it gets the count of
   * enumerable keys.
   *
   *     expect([]).to.be.empty;
   *     expect('').to.be.empty;
   *     expect({}).to.be.empty;
   *
   * @name empty
   * @api public
   */

  Assertion.addProperty('empty', function () {
    var obj = flag(this, 'object')
      , expected = obj;

    if (Array.isArray(obj) || 'string' === typeof object) {
      expected = obj.length;
    } else if (typeof obj === 'object') {
      expected = Object.keys(obj).length;
    }

    this.assert(
        !expected
      , 'expected #{this} to be empty'
      , 'expected #{this} not to be empty'
    );
  });

  /**
   * ### .arguments
   *
   * Asserts that the target is an arguments object.
   *
   *     function test () {
   *       expect(arguments).to.be.arguments;
   *     }
   *
   * @name arguments
   * @alias Arguments
   * @api public
   */

  function checkArguments () {
    var obj = flag(this, 'object')
      , type = Object.prototype.toString.call(obj);
    this.assert(
        '[object Arguments]' === type
      , 'expected #{this} to be arguments but got ' + type
      , 'expected #{this} to not be arguments'
    );
  }

  Assertion.addProperty('arguments', checkArguments);
  Assertion.addProperty('Arguments', checkArguments);

  /**
   * ### .equal(value)
   *
   * Asserts that the target is strictly equal (`===`) to `value`.
   * Alternately, if the `deep` flag is set, asserts that
   * the target is deeply equal to `value`.
   *
   *     expect('hello').to.equal('hello');
   *     expect(42).to.equal(42);
   *     expect(1).to.not.equal(true);
   *     expect({ foo: 'bar' }).to.not.equal({ foo: 'bar' });
   *     expect({ foo: 'bar' }).to.deep.equal({ foo: 'bar' });
   *
   * @name equal
   * @alias equals
   * @alias eq
   * @alias deep.equal
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEqual (val, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'deep')) {
      return this.eql(val);
    } else {
      this.assert(
          val === obj
        , 'expected #{this} to equal #{exp}'
        , 'expected #{this} to not equal #{exp}'
        , val
        , this._obj
        , true
      );
    }
  }

  Assertion.addMethod('equal', assertEqual);
  Assertion.addMethod('equals', assertEqual);
  Assertion.addMethod('eq', assertEqual);

  /**
   * ### .eql(value)
   *
   * Asserts that the target is deeply equal to `value`.
   *
   *     expect({ foo: 'bar' }).to.eql({ foo: 'bar' });
   *     expect([ 1, 2, 3 ]).to.eql([ 1, 2, 3 ]);
   *
   * @name eql
   * @alias eqls
   * @param {Mixed} value
   * @param {String} message _optional_
   * @api public
   */

  function assertEql(obj, msg) {
    if (msg) flag(this, 'message', msg);
    this.assert(
        _.eql(obj, flag(this, 'object'))
      , 'expected #{this} to deeply equal #{exp}'
      , 'expected #{this} to not deeply equal #{exp}'
      , obj
      , this._obj
      , true
    );
  }

  Assertion.addMethod('eql', assertEql);
  Assertion.addMethod('eqls', assertEql);

  /**
   * ### .above(value)
   *
   * Asserts that the target is greater than `value`.
   *
   *     expect(10).to.be.above(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *
   * @name above
   * @alias gt
   * @alias greaterThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertAbove (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len > n
        , 'expected #{this} to have a length above #{exp} but got #{act}'
        , 'expected #{this} to not have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj > n
        , 'expected #{this} to be above ' + n
        , 'expected #{this} to be at most ' + n
      );
    }
  }

  Assertion.addMethod('above', assertAbove);
  Assertion.addMethod('gt', assertAbove);
  Assertion.addMethod('greaterThan', assertAbove);

  /**
   * ### .least(value)
   *
   * Asserts that the target is greater than or equal to `value`.
   *
   *     expect(10).to.be.at.least(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a minimum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.least(2);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.least(3);
   *
   * @name least
   * @alias gte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertLeast (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= n
        , 'expected #{this} to have a length at least #{exp} but got #{act}'
        , 'expected #{this} to have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj >= n
        , 'expected #{this} to be at least ' + n
        , 'expected #{this} to be below ' + n
      );
    }
  }

  Assertion.addMethod('least', assertLeast);
  Assertion.addMethod('gte', assertLeast);

  /**
   * ### .below(value)
   *
   * Asserts that the target is less than `value`.
   *
   *     expect(5).to.be.below(10);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *
   * @name below
   * @alias lt
   * @alias lessThan
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertBelow (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len < n
        , 'expected #{this} to have a length below #{exp} but got #{act}'
        , 'expected #{this} to not have a length below #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj < n
        , 'expected #{this} to be below ' + n
        , 'expected #{this} to be at least ' + n
      );
    }
  }

  Assertion.addMethod('below', assertBelow);
  Assertion.addMethod('lt', assertBelow);
  Assertion.addMethod('lessThan', assertBelow);

  /**
   * ### .most(value)
   *
   * Asserts that the target is less than or equal to `value`.
   *
   *     expect(5).to.be.at.most(5);
   *
   * Can also be used in conjunction with `length` to
   * assert a maximum length. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.of.at.most(4);
   *     expect([ 1, 2, 3 ]).to.have.length.of.at.most(3);
   *
   * @name most
   * @alias lte
   * @param {Number} value
   * @param {String} message _optional_
   * @api public
   */

  function assertMost (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len <= n
        , 'expected #{this} to have a length at most #{exp} but got #{act}'
        , 'expected #{this} to have a length above #{exp}'
        , n
        , len
      );
    } else {
      this.assert(
          obj <= n
        , 'expected #{this} to be at most ' + n
        , 'expected #{this} to be above ' + n
      );
    }
  }

  Assertion.addMethod('most', assertMost);
  Assertion.addMethod('lte', assertMost);

  /**
   * ### .within(start, finish)
   *
   * Asserts that the target is within a range.
   *
   *     expect(7).to.be.within(5,10);
   *
   * Can also be used in conjunction with `length` to
   * assert a length range. The benefit being a
   * more informative error message than if the length
   * was supplied directly.
   *
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name within
   * @param {Number} start lowerbound inclusive
   * @param {Number} finish upperbound inclusive
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('within', function (start, finish, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , range = start + '..' + finish;
    if (flag(this, 'doLength')) {
      new Assertion(obj, msg).to.have.property('length');
      var len = obj.length;
      this.assert(
          len >= start && len <= finish
        , 'expected #{this} to have a length within ' + range
        , 'expected #{this} to not have a length within ' + range
      );
    } else {
      this.assert(
          obj >= start && obj <= finish
        , 'expected #{this} to be within ' + range
        , 'expected #{this} to not be within ' + range
      );
    }
  });

  /**
   * ### .instanceof(constructor)
   *
   * Asserts that the target is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , Chai = new Tea('chai');
   *
   *     expect(Chai).to.be.an.instanceof(Tea);
   *     expect([ 1, 2, 3 ]).to.be.instanceof(Array);
   *
   * @name instanceof
   * @param {Constructor} constructor
   * @param {String} message _optional_
   * @alias instanceOf
   * @api public
   */

  function assertInstanceOf (constructor, msg) {
    if (msg) flag(this, 'message', msg);
    var name = _.getName(constructor);
    this.assert(
        flag(this, 'object') instanceof constructor
      , 'expected #{this} to be an instance of ' + name
      , 'expected #{this} to not be an instance of ' + name
    );
  };

  Assertion.addMethod('instanceof', assertInstanceOf);
  Assertion.addMethod('instanceOf', assertInstanceOf);

  /**
   * ### .property(name, [value])
   *
   * Asserts that the target has a property `name`, optionally asserting that
   * the value of that property is strictly equal to  `value`.
   * If the `deep` flag is set, you can use dot- and bracket-notation for deep
   * references into objects and arrays.
   *
   *     // simple referencing
   *     var obj = { foo: 'bar' };
   *     expect(obj).to.have.property('foo');
   *     expect(obj).to.have.property('foo', 'bar');
   *
   *     // deep referencing
   *     var deepObj = {
   *         green: { tea: 'matcha' }
   *       , teas: [ 'chai', 'matcha', { tea: 'konacha' } ]
   *     };

   *     expect(deepObj).to.have.deep.property('green.tea', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[1]', 'matcha');
   *     expect(deepObj).to.have.deep.property('teas[2].tea', 'konacha');
   *
   * You can also use an array as the starting point of a `deep.property`
   * assertion, or traverse nested arrays.
   *
   *     var arr = [
   *         [ 'chai', 'matcha', 'konacha' ]
   *       , [ { tea: 'chai' }
   *         , { tea: 'matcha' }
   *         , { tea: 'konacha' } ]
   *     ];
   *
   *     expect(arr).to.have.deep.property('[0][1]', 'matcha');
   *     expect(arr).to.have.deep.property('[1][2].tea', 'konacha');
   *
   * Furthermore, `property` changes the subject of the assertion
   * to be the value of that property from the original object. This
   * permits for further chainable assertions on that property.
   *
   *     expect(obj).to.have.property('foo')
   *       .that.is.a('string');
   *     expect(deepObj).to.have.property('green')
   *       .that.is.an('object')
   *       .that.deep.equals({ tea: 'matcha' });
   *     expect(deepObj).to.have.property('teas')
   *       .that.is.an('array')
   *       .with.deep.property('[2]')
   *         .that.deep.equals({ tea: 'konacha' });
   *
   * @name property
   * @alias deep.property
   * @param {String} name
   * @param {Mixed} value (optional)
   * @param {String} message _optional_
   * @returns value of property for chaining
   * @api public
   */

  Assertion.addMethod('property', function (name, val, msg) {
    if (msg) flag(this, 'message', msg);

    var descriptor = flag(this, 'deep') ? 'deep property ' : 'property '
      , negate = flag(this, 'negate')
      , obj = flag(this, 'object')
      , value = flag(this, 'deep')
        ? _.getPathValue(name, obj)
        : obj[name];

    if (negate && undefined !== val) {
      if (undefined === value) {
        msg = (msg != null) ? msg + ': ' : '';
        throw new Error(msg + _.inspect(obj) + ' has no ' + descriptor + _.inspect(name));
      }
    } else {
      this.assert(
          undefined !== value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name)
        , 'expected #{this} to not have ' + descriptor + _.inspect(name));
    }

    if (undefined !== val) {
      this.assert(
          val === value
        , 'expected #{this} to have a ' + descriptor + _.inspect(name) + ' of #{exp}, but got #{act}'
        , 'expected #{this} to not have a ' + descriptor + _.inspect(name) + ' of #{act}'
        , val
        , value
      );
    }

    flag(this, 'object', value);
  });


  /**
   * ### .ownProperty(name)
   *
   * Asserts that the target has an own property `name`.
   *
   *     expect('test').to.have.ownProperty('length');
   *
   * @name ownProperty
   * @alias haveOwnProperty
   * @param {String} name
   * @param {String} message _optional_
   * @api public
   */

  function assertOwnProperty (name, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        obj.hasOwnProperty(name)
      , 'expected #{this} to have own property ' + _.inspect(name)
      , 'expected #{this} to not have own property ' + _.inspect(name)
    );
  }

  Assertion.addMethod('ownProperty', assertOwnProperty);
  Assertion.addMethod('haveOwnProperty', assertOwnProperty);

  /**
   * ### .length(value)
   *
   * Asserts that the target's `length` property has
   * the expected value.
   *
   *     expect([ 1, 2, 3]).to.have.length(3);
   *     expect('foobar').to.have.length(6);
   *
   * Can also be used as a chain precursor to a value
   * comparison for the length property.
   *
   *     expect('foo').to.have.length.above(2);
   *     expect([ 1, 2, 3 ]).to.have.length.above(2);
   *     expect('foo').to.have.length.below(4);
   *     expect([ 1, 2, 3 ]).to.have.length.below(4);
   *     expect('foo').to.have.length.within(2,4);
   *     expect([ 1, 2, 3 ]).to.have.length.within(2,4);
   *
   * @name length
   * @alias lengthOf
   * @param {Number} length
   * @param {String} message _optional_
   * @api public
   */

  function assertLengthChain () {
    flag(this, 'doLength', true);
  }

  function assertLength (n, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).to.have.property('length');
    var len = obj.length;

    this.assert(
        len == n
      , 'expected #{this} to have a length of #{exp} but got #{act}'
      , 'expected #{this} to not have a length of #{act}'
      , n
      , len
    );
  }

  Assertion.addChainableMethod('length', assertLength, assertLengthChain);
  Assertion.addMethod('lengthOf', assertLength, assertLengthChain);

  /**
   * ### .match(regexp)
   *
   * Asserts that the target matches a regular expression.
   *
   *     expect('foobar').to.match(/^foo/);
   *
   * @name match
   * @param {RegExp} RegularExpression
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('match', function (re, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        re.exec(obj)
      , 'expected #{this} to match ' + re
      , 'expected #{this} not to match ' + re
    );
  });

  /**
   * ### .string(string)
   *
   * Asserts that the string target contains another string.
   *
   *     expect('foobar').to.have.string('bar');
   *
   * @name string
   * @param {String} string
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('string', function (str, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('string');

    this.assert(
        ~obj.indexOf(str)
      , 'expected #{this} to contain ' + _.inspect(str)
      , 'expected #{this} to not contain ' + _.inspect(str)
    );
  });


  /**
   * ### .keys(key1, [key2], [...])
   *
   * Asserts that the target has exactly the given keys, or
   * asserts the inclusion of some keys when using the
   * `include` or `contain` modifiers.
   *
   *     expect({ foo: 1, bar: 2 }).to.have.keys(['foo', 'bar']);
   *     expect({ foo: 1, bar: 2, baz: 3 }).to.contain.keys('foo', 'bar');
   *
   * @name keys
   * @alias key
   * @param {String...|Array} keys
   * @api public
   */

  function assertKeys (keys) {
    var obj = flag(this, 'object')
      , str
      , ok = true;

    keys = keys instanceof Array
      ? keys
      : Array.prototype.slice.call(arguments);

    if (!keys.length) throw new Error('keys required');

    var actual = Object.keys(obj)
      , len = keys.length;

    // Inclusion
    ok = keys.every(function(key){
      return ~actual.indexOf(key);
    });

    // Strict
    if (!flag(this, 'negate') && !flag(this, 'contains')) {
      ok = ok && keys.length == actual.length;
    }

    // Key string
    if (len > 1) {
      keys = keys.map(function(key){
        return _.inspect(key);
      });
      var last = keys.pop();
      str = keys.join(', ') + ', and ' + last;
    } else {
      str = _.inspect(keys[0]);
    }

    // Form
    str = (len > 1 ? 'keys ' : 'key ') + str;

    // Have / include
    str = (flag(this, 'contains') ? 'contain ' : 'have ') + str;

    // Assertion
    this.assert(
        ok
      , 'expected #{this} to ' + str
      , 'expected #{this} to not ' + str
    );
  }

  Assertion.addMethod('keys', assertKeys);
  Assertion.addMethod('key', assertKeys);

  /**
   * ### .throw(constructor)
   *
   * Asserts that the function target will throw a specific error, or specific type of error
   * (as determined using `instanceof`), optionally with a RegExp or string inclusion test
   * for the error's message.
   *
   *     var err = new ReferenceError('This is a bad function.');
   *     var fn = function () { throw err; }
   *     expect(fn).to.throw(ReferenceError);
   *     expect(fn).to.throw(Error);
   *     expect(fn).to.throw(/bad function/);
   *     expect(fn).to.not.throw('good function');
   *     expect(fn).to.throw(ReferenceError, /bad function/);
   *     expect(fn).to.throw(err);
   *     expect(fn).to.not.throw(new RangeError('Out of range.'));
   *
   * Please note that when a throw expectation is negated, it will check each
   * parameter independently, starting with error constructor type. The appropriate way
   * to check for the existence of a type of error but for a message that does not match
   * is to use `and`.
   *
   *     expect(fn).to.throw(ReferenceError)
   *        .and.not.throw(/good function/);
   *
   * @name throw
   * @alias throws
   * @alias Throw
   * @param {ErrorConstructor} constructor
   * @param {String|RegExp} expected error message
   * @param {String} message _optional_
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @returns error for chaining (null if no error)
   * @api public
   */

  function assertThrows (constructor, errMsg, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    new Assertion(obj, msg).is.a('function');

    var thrown = false
      , desiredError = null
      , name = null
      , thrownError = null;

    if (arguments.length === 0) {
      errMsg = null;
      constructor = null;
    } else if (constructor && (constructor instanceof RegExp || 'string' === typeof constructor)) {
      errMsg = constructor;
      constructor = null;
    } else if (constructor && constructor instanceof Error) {
      desiredError = constructor;
      constructor = null;
      errMsg = null;
    } else if (typeof constructor === 'function') {
      name = constructor.prototype.name || constructor.name;
      if (name === 'Error' && constructor !== Error) {
        name = (new constructor()).name;
      }
    } else {
      constructor = null;
    }

    try {
      obj();
    } catch (err) {
      // first, check desired error
      if (desiredError) {
        this.assert(
            err === desiredError
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp}'
          , (desiredError instanceof Error ? desiredError.toString() : desiredError)
          , (err instanceof Error ? err.toString() : err)
        );

        flag(this, 'object', err);
        return this;
      }

      // next, check constructor
      if (constructor) {
        this.assert(
            err instanceof constructor
          , 'expected #{this} to throw #{exp} but #{act} was thrown'
          , 'expected #{this} to not throw #{exp} but #{act} was thrown'
          , name
          , (err instanceof Error ? err.toString() : err)
        );

        if (!errMsg) {
          flag(this, 'object', err);
          return this;
        }
      }

      // next, check message
      var message = 'object' === _.type(err) && "message" in err
        ? err.message
        : '' + err;

      if ((message != null) && errMsg && errMsg instanceof RegExp) {
        this.assert(
            errMsg.exec(message)
          , 'expected #{this} to throw error matching #{exp} but got #{act}'
          , 'expected #{this} to throw error not matching #{exp}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else if ((message != null) && errMsg && 'string' === typeof errMsg) {
        this.assert(
            ~message.indexOf(errMsg)
          , 'expected #{this} to throw error including #{exp} but got #{act}'
          , 'expected #{this} to throw error not including #{act}'
          , errMsg
          , message
        );

        flag(this, 'object', err);
        return this;
      } else {
        thrown = true;
        thrownError = err;
      }
    }

    var actuallyGot = ''
      , expectedThrown = name !== null
        ? name
        : desiredError
          ? '#{exp}' //_.inspect(desiredError)
          : 'an error';

    if (thrown) {
      actuallyGot = ' but #{act} was thrown'
    }

    this.assert(
        thrown === true
      , 'expected #{this} to throw ' + expectedThrown + actuallyGot
      , 'expected #{this} to not throw ' + expectedThrown + actuallyGot
      , (desiredError instanceof Error ? desiredError.toString() : desiredError)
      , (thrownError instanceof Error ? thrownError.toString() : thrownError)
    );

    flag(this, 'object', thrownError);
  };

  Assertion.addMethod('throw', assertThrows);
  Assertion.addMethod('throws', assertThrows);
  Assertion.addMethod('Throw', assertThrows);

  /**
   * ### .respondTo(method)
   *
   * Asserts that the object or class target will respond to a method.
   *
   *     Klass.prototype.bar = function(){};
   *     expect(Klass).to.respondTo('bar');
   *     expect(obj).to.respondTo('bar');
   *
   * To check if a constructor will respond to a static function,
   * set the `itself` flag.
   *
   *     Klass.baz = function(){};
   *     expect(Klass).itself.to.respondTo('baz');
   *
   * @name respondTo
   * @param {String} method
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('respondTo', function (method, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object')
      , itself = flag(this, 'itself')
      , context = ('function' === _.type(obj) && !itself)
        ? obj.prototype[method]
        : obj[method];

    this.assert(
        'function' === typeof context
      , 'expected #{this} to respond to ' + _.inspect(method)
      , 'expected #{this} to not respond to ' + _.inspect(method)
    );
  });

  /**
   * ### .itself
   *
   * Sets the `itself` flag, later used by the `respondTo` assertion.
   *
   *     function Foo() {}
   *     Foo.bar = function() {}
   *     Foo.prototype.baz = function() {}
   *
   *     expect(Foo).itself.to.respondTo('bar');
   *     expect(Foo).itself.not.to.respondTo('baz');
   *
   * @name itself
   * @api public
   */

  Assertion.addProperty('itself', function () {
    flag(this, 'itself', true);
  });

  /**
   * ### .satisfy(method)
   *
   * Asserts that the target passes a given truth test.
   *
   *     expect(1).to.satisfy(function(num) { return num > 0; });
   *
   * @name satisfy
   * @param {Function} matcher
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('satisfy', function (matcher, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        matcher(obj)
      , 'expected #{this} to satisfy ' + _.objDisplay(matcher)
      , 'expected #{this} to not satisfy' + _.objDisplay(matcher)
      , this.negate ? false : true
      , matcher(obj)
    );
  });

  /**
   * ### .closeTo(expected, delta)
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     expect(1.5).to.be.closeTo(1, 0.5);
   *
   * @name closeTo
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('closeTo', function (expected, delta, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');
    this.assert(
        Math.abs(obj - expected) <= delta
      , 'expected #{this} to be close to ' + expected + ' +/- ' + delta
      , 'expected #{this} not to be close to ' + expected + ' +/- ' + delta
    );
  });

  function isSubsetOf(subset, superset, cmp) {
    return subset.every(function(elem) {
      if (!cmp) return superset.indexOf(elem) !== -1;

      return superset.some(function(elem2) {
        return cmp(elem, elem2);
      });
    })
  }

  /**
   * ### .members(set)
   *
   * Asserts that the target is a superset of `set`,
   * or that the target and `set` have the same strictly-equal (===) members.
   * Alternately, if the `deep` flag is set, set members are compared for deep
   * equality.
   *
   *     expect([1, 2, 3]).to.include.members([3, 2]);
   *     expect([1, 2, 3]).to.not.include.members([3, 2, 8]);
   *
   *     expect([4, 2]).to.have.members([2, 4]);
   *     expect([5, 2]).to.not.have.members([5, 2, 1]);
   *
   *     expect([{ id: 1 }]).to.deep.include.members([{ id: 1 }]);
   *
   * @name members
   * @param {Array} set
   * @param {String} message _optional_
   * @api public
   */

  Assertion.addMethod('members', function (subset, msg) {
    if (msg) flag(this, 'message', msg);
    var obj = flag(this, 'object');

    new Assertion(obj).to.be.an('array');
    new Assertion(subset).to.be.an('array');

    var cmp = flag(this, 'deep') ? _.eql : undefined;

    if (flag(this, 'contains')) {
      return this.assert(
          isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to be a superset of #{act}'
        , 'expected #{this} to not be a superset of #{act}'
        , obj
        , subset
      );
    }

    this.assert(
        isSubsetOf(obj, subset, cmp) && isSubsetOf(subset, obj, cmp)
        , 'expected #{this} to have the same members as #{act}'
        , 'expected #{this} to not have the same members as #{act}'
        , obj
        , subset
    );
  });
};

},{}],51:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */


module.exports = function (chai, util) {

  /*!
   * Chai dependencies.
   */

  var Assertion = chai.Assertion
    , flag = util.flag;

  /*!
   * Module export.
   */

  /**
   * ### assert(expression, message)
   *
   * Write your own test expressions.
   *
   *     assert('foo' !== 'bar', 'foo is not bar');
   *     assert(Array.isArray([]), 'empty arrays are arrays');
   *
   * @param {Mixed} expression to test for truthiness
   * @param {String} message to display on error
   * @name assert
   * @api public
   */

  var assert = chai.assert = function (express, errmsg) {
    var test = new Assertion(null, null, chai.assert);
    test.assert(
        express
      , errmsg
      , '[ negation message unavailable ]'
    );
  };

  /**
   * ### .fail(actual, expected, [message], [operator])
   *
   * Throw a failure. Node.js `assert` module-compatible.
   *
   * @name fail
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @param {String} operator
   * @api public
   */

  assert.fail = function (actual, expected, message, operator) {
    message = message || 'assert.fail()';
    throw new chai.AssertionError(message, {
        actual: actual
      , expected: expected
      , operator: operator
    }, assert.fail);
  };

  /**
   * ### .ok(object, [message])
   *
   * Asserts that `object` is truthy.
   *
   *     assert.ok('everything', 'everything is ok');
   *     assert.ok(false, 'this will fail');
   *
   * @name ok
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.ok = function (val, msg) {
    new Assertion(val, msg).is.ok;
  };

  /**
   * ### .notOk(object, [message])
   *
   * Asserts that `object` is falsy.
   *
   *     assert.notOk('everything', 'this will fail');
   *     assert.notOk(false, 'this will pass');
   *
   * @name notOk
   * @param {Mixed} object to test
   * @param {String} message
   * @api public
   */

  assert.notOk = function (val, msg) {
    new Assertion(val, msg).is.not.ok;
  };

  /**
   * ### .equal(actual, expected, [message])
   *
   * Asserts non-strict equality (`==`) of `actual` and `expected`.
   *
   *     assert.equal(3, '3', '== coerces values to strings');
   *
   * @name equal
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.equal = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.equal);

    test.assert(
        exp == flag(test, 'object')
      , 'expected #{this} to equal #{exp}'
      , 'expected #{this} to not equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .notEqual(actual, expected, [message])
   *
   * Asserts non-strict inequality (`!=`) of `actual` and `expected`.
   *
   *     assert.notEqual(3, 4, 'these numbers are not equal');
   *
   * @name notEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notEqual = function (act, exp, msg) {
    var test = new Assertion(act, msg, assert.notEqual);

    test.assert(
        exp != flag(test, 'object')
      , 'expected #{this} to not equal #{exp}'
      , 'expected #{this} to equal #{act}'
      , exp
      , act
    );
  };

  /**
   * ### .strictEqual(actual, expected, [message])
   *
   * Asserts strict equality (`===`) of `actual` and `expected`.
   *
   *     assert.strictEqual(true, true, 'these booleans are strictly equal');
   *
   * @name strictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.strictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.equal(exp);
  };

  /**
   * ### .notStrictEqual(actual, expected, [message])
   *
   * Asserts strict inequality (`!==`) of `actual` and `expected`.
   *
   *     assert.notStrictEqual(3, '3', 'no coercion for strict equality');
   *
   * @name notStrictEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notStrictEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.equal(exp);
  };

  /**
   * ### .deepEqual(actual, expected, [message])
   *
   * Asserts that `actual` is deeply equal to `expected`.
   *
   *     assert.deepEqual({ tea: 'green' }, { tea: 'green' });
   *
   * @name deepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.deepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.eql(exp);
  };

  /**
   * ### .notDeepEqual(actual, expected, [message])
   *
   * Assert that `actual` is not deeply equal to `expected`.
   *
   *     assert.notDeepEqual({ tea: 'green' }, { tea: 'jasmine' });
   *
   * @name notDeepEqual
   * @param {Mixed} actual
   * @param {Mixed} expected
   * @param {String} message
   * @api public
   */

  assert.notDeepEqual = function (act, exp, msg) {
    new Assertion(act, msg).to.not.eql(exp);
  };

  /**
   * ### .isTrue(value, [message])
   *
   * Asserts that `value` is true.
   *
   *     var teaServed = true;
   *     assert.isTrue(teaServed, 'the tea has been served');
   *
   * @name isTrue
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isTrue = function (val, msg) {
    new Assertion(val, msg).is['true'];
  };

  /**
   * ### .isFalse(value, [message])
   *
   * Asserts that `value` is false.
   *
   *     var teaServed = false;
   *     assert.isFalse(teaServed, 'no tea yet? hmm...');
   *
   * @name isFalse
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFalse = function (val, msg) {
    new Assertion(val, msg).is['false'];
  };

  /**
   * ### .isNull(value, [message])
   *
   * Asserts that `value` is null.
   *
   *     assert.isNull(err, 'there was no error');
   *
   * @name isNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNull = function (val, msg) {
    new Assertion(val, msg).to.equal(null);
  };

  /**
   * ### .isNotNull(value, [message])
   *
   * Asserts that `value` is not null.
   *
   *     var tea = 'tasty chai';
   *     assert.isNotNull(tea, 'great, time for tea!');
   *
   * @name isNotNull
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNull = function (val, msg) {
    new Assertion(val, msg).to.not.equal(null);
  };

  /**
   * ### .isUndefined(value, [message])
   *
   * Asserts that `value` is `undefined`.
   *
   *     var tea;
   *     assert.isUndefined(tea, 'no tea defined');
   *
   * @name isUndefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isUndefined = function (val, msg) {
    new Assertion(val, msg).to.equal(undefined);
  };

  /**
   * ### .isDefined(value, [message])
   *
   * Asserts that `value` is not `undefined`.
   *
   *     var tea = 'cup of chai';
   *     assert.isDefined(tea, 'tea has been defined');
   *
   * @name isDefined
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isDefined = function (val, msg) {
    new Assertion(val, msg).to.not.equal(undefined);
  };

  /**
   * ### .isFunction(value, [message])
   *
   * Asserts that `value` is a function.
   *
   *     function serveTea() { return 'cup of tea'; };
   *     assert.isFunction(serveTea, 'great, we can have tea now');
   *
   * @name isFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isFunction = function (val, msg) {
    new Assertion(val, msg).to.be.a('function');
  };

  /**
   * ### .isNotFunction(value, [message])
   *
   * Asserts that `value` is _not_ a function.
   *
   *     var serveTea = [ 'heat', 'pour', 'sip' ];
   *     assert.isNotFunction(serveTea, 'great, we have listed the steps');
   *
   * @name isNotFunction
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotFunction = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('function');
  };

  /**
   * ### .isObject(value, [message])
   *
   * Asserts that `value` is an object (as revealed by
   * `Object.prototype.toString`).
   *
   *     var selection = { name: 'Chai', serve: 'with spices' };
   *     assert.isObject(selection, 'tea selection is an object');
   *
   * @name isObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isObject = function (val, msg) {
    new Assertion(val, msg).to.be.a('object');
  };

  /**
   * ### .isNotObject(value, [message])
   *
   * Asserts that `value` is _not_ an object.
   *
   *     var selection = 'chai'
   *     assert.isNotObject(selection, 'tea selection is not an object');
   *     assert.isNotObject(null, 'null is not an object');
   *
   * @name isNotObject
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotObject = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('object');
  };

  /**
   * ### .isArray(value, [message])
   *
   * Asserts that `value` is an array.
   *
   *     var menu = [ 'green', 'chai', 'oolong' ];
   *     assert.isArray(menu, 'what kind of tea do we want?');
   *
   * @name isArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isArray = function (val, msg) {
    new Assertion(val, msg).to.be.an('array');
  };

  /**
   * ### .isNotArray(value, [message])
   *
   * Asserts that `value` is _not_ an array.
   *
   *     var menu = 'green|chai|oolong';
   *     assert.isNotArray(menu, 'what kind of tea do we want?');
   *
   * @name isNotArray
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotArray = function (val, msg) {
    new Assertion(val, msg).to.not.be.an('array');
  };

  /**
   * ### .isString(value, [message])
   *
   * Asserts that `value` is a string.
   *
   *     var teaOrder = 'chai';
   *     assert.isString(teaOrder, 'order placed');
   *
   * @name isString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isString = function (val, msg) {
    new Assertion(val, msg).to.be.a('string');
  };

  /**
   * ### .isNotString(value, [message])
   *
   * Asserts that `value` is _not_ a string.
   *
   *     var teaOrder = 4;
   *     assert.isNotString(teaOrder, 'order placed');
   *
   * @name isNotString
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotString = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('string');
  };

  /**
   * ### .isNumber(value, [message])
   *
   * Asserts that `value` is a number.
   *
   *     var cups = 2;
   *     assert.isNumber(cups, 'how many cups');
   *
   * @name isNumber
   * @param {Number} value
   * @param {String} message
   * @api public
   */

  assert.isNumber = function (val, msg) {
    new Assertion(val, msg).to.be.a('number');
  };

  /**
   * ### .isNotNumber(value, [message])
   *
   * Asserts that `value` is _not_ a number.
   *
   *     var cups = '2 cups please';
   *     assert.isNotNumber(cups, 'how many cups');
   *
   * @name isNotNumber
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotNumber = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('number');
  };

  /**
   * ### .isBoolean(value, [message])
   *
   * Asserts that `value` is a boolean.
   *
   *     var teaReady = true
   *       , teaServed = false;
   *
   *     assert.isBoolean(teaReady, 'is the tea ready');
   *     assert.isBoolean(teaServed, 'has tea been served');
   *
   * @name isBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isBoolean = function (val, msg) {
    new Assertion(val, msg).to.be.a('boolean');
  };

  /**
   * ### .isNotBoolean(value, [message])
   *
   * Asserts that `value` is _not_ a boolean.
   *
   *     var teaReady = 'yep'
   *       , teaServed = 'nope';
   *
   *     assert.isNotBoolean(teaReady, 'is the tea ready');
   *     assert.isNotBoolean(teaServed, 'has tea been served');
   *
   * @name isNotBoolean
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.isNotBoolean = function (val, msg) {
    new Assertion(val, msg).to.not.be.a('boolean');
  };

  /**
   * ### .typeOf(value, name, [message])
   *
   * Asserts that `value`'s type is `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.typeOf({ tea: 'chai' }, 'object', 'we have an object');
   *     assert.typeOf(['chai', 'jasmine'], 'array', 'we have an array');
   *     assert.typeOf('tea', 'string', 'we have a string');
   *     assert.typeOf(/tea/, 'regexp', 'we have a regular expression');
   *     assert.typeOf(null, 'null', 'we have a null');
   *     assert.typeOf(undefined, 'undefined', 'we have an undefined');
   *
   * @name typeOf
   * @param {Mixed} value
   * @param {String} name
   * @param {String} message
   * @api public
   */

  assert.typeOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.a(type);
  };

  /**
   * ### .notTypeOf(value, name, [message])
   *
   * Asserts that `value`'s type is _not_ `name`, as determined by
   * `Object.prototype.toString`.
   *
   *     assert.notTypeOf('tea', 'number', 'strings are not numbers');
   *
   * @name notTypeOf
   * @param {Mixed} value
   * @param {String} typeof name
   * @param {String} message
   * @api public
   */

  assert.notTypeOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.a(type);
  };

  /**
   * ### .instanceOf(object, constructor, [message])
   *
   * Asserts that `value` is an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new Tea('chai');
   *
   *     assert.instanceOf(chai, Tea, 'chai is an instance of tea');
   *
   * @name instanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.instanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.be.instanceOf(type);
  };

  /**
   * ### .notInstanceOf(object, constructor, [message])
   *
   * Asserts `value` is not an instance of `constructor`.
   *
   *     var Tea = function (name) { this.name = name; }
   *       , chai = new String('chai');
   *
   *     assert.notInstanceOf(chai, Tea, 'chai is not an instance of tea');
   *
   * @name notInstanceOf
   * @param {Object} object
   * @param {Constructor} constructor
   * @param {String} message
   * @api public
   */

  assert.notInstanceOf = function (val, type, msg) {
    new Assertion(val, msg).to.not.be.instanceOf(type);
  };

  /**
   * ### .include(haystack, needle, [message])
   *
   * Asserts that `haystack` includes `needle`. Works
   * for strings and arrays.
   *
   *     assert.include('foobar', 'bar', 'foobar contains string "bar"');
   *     assert.include([ 1, 2, 3 ], 3, 'array contains value');
   *
   * @name include
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.include = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.include).include(inc);
  };

  /**
   * ### .notInclude(haystack, needle, [message])
   *
   * Asserts that `haystack` does not include `needle`. Works
   * for strings and arrays.
   *i
   *     assert.notInclude('foobar', 'baz', 'string not include substring');
   *     assert.notInclude([ 1, 2, 3 ], 4, 'array not include contain value');
   *
   * @name notInclude
   * @param {Array|String} haystack
   * @param {Mixed} needle
   * @param {String} message
   * @api public
   */

  assert.notInclude = function (exp, inc, msg) {
    new Assertion(exp, msg, assert.notInclude).not.include(inc);
  };

  /**
   * ### .match(value, regexp, [message])
   *
   * Asserts that `value` matches the regular expression `regexp`.
   *
   *     assert.match('foobar', /^foo/, 'regexp matches');
   *
   * @name match
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.match = function (exp, re, msg) {
    new Assertion(exp, msg).to.match(re);
  };

  /**
   * ### .notMatch(value, regexp, [message])
   *
   * Asserts that `value` does not match the regular expression `regexp`.
   *
   *     assert.notMatch('foobar', /^foo/, 'regexp does not match');
   *
   * @name notMatch
   * @param {Mixed} value
   * @param {RegExp} regexp
   * @param {String} message
   * @api public
   */

  assert.notMatch = function (exp, re, msg) {
    new Assertion(exp, msg).to.not.match(re);
  };

  /**
   * ### .property(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`.
   *
   *     assert.property({ tea: { green: 'matcha' }}, 'tea');
   *
   * @name property
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.property = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.property(prop);
  };

  /**
   * ### .notProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`.
   *
   *     assert.notProperty({ tea: { green: 'matcha' }}, 'coffee');
   *
   * @name notProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.property(prop);
  };

  /**
   * ### .deepProperty(object, property, [message])
   *
   * Asserts that `object` has a property named by `property`, which can be a
   * string using dot- and bracket-notation for deep reference.
   *
   *     assert.deepProperty({ tea: { green: 'matcha' }}, 'tea.green');
   *
   * @name deepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.deepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop);
  };

  /**
   * ### .notDeepProperty(object, property, [message])
   *
   * Asserts that `object` does _not_ have a property named by `property`, which
   * can be a string using dot- and bracket-notation for deep reference.
   *
   *     assert.notDeepProperty({ tea: { green: 'matcha' }}, 'tea.oolong');
   *
   * @name notDeepProperty
   * @param {Object} object
   * @param {String} property
   * @param {String} message
   * @api public
   */

  assert.notDeepProperty = function (obj, prop, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop);
  };

  /**
   * ### .propertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`.
   *
   *     assert.propertyVal({ tea: 'is good' }, 'tea', 'is good');
   *
   * @name propertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.property(prop, val);
  };

  /**
   * ### .propertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`.
   *
   *     assert.propertyNotVal({ tea: 'is good' }, 'tea', 'is bad');
   *
   * @name propertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.propertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.property(prop, val);
  };

  /**
   * ### .deepPropertyVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property` with value given
   * by `value`. `property` can use dot- and bracket-notation for deep
   * reference.
   *
   *     assert.deepPropertyVal({ tea: { green: 'matcha' }}, 'tea.green', 'matcha');
   *
   * @name deepPropertyVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.have.deep.property(prop, val);
  };

  /**
   * ### .deepPropertyNotVal(object, property, value, [message])
   *
   * Asserts that `object` has a property named by `property`, but with a value
   * different from that given by `value`. `property` can use dot- and
   * bracket-notation for deep reference.
   *
   *     assert.deepPropertyNotVal({ tea: { green: 'matcha' }}, 'tea.green', 'konacha');
   *
   * @name deepPropertyNotVal
   * @param {Object} object
   * @param {String} property
   * @param {Mixed} value
   * @param {String} message
   * @api public
   */

  assert.deepPropertyNotVal = function (obj, prop, val, msg) {
    new Assertion(obj, msg).to.not.have.deep.property(prop, val);
  };

  /**
   * ### .lengthOf(object, length, [message])
   *
   * Asserts that `object` has a `length` property with the expected value.
   *
   *     assert.lengthOf([1,2,3], 3, 'array has length of 3');
   *     assert.lengthOf('foobar', 5, 'string has length of 6');
   *
   * @name lengthOf
   * @param {Mixed} object
   * @param {Number} length
   * @param {String} message
   * @api public
   */

  assert.lengthOf = function (exp, len, msg) {
    new Assertion(exp, msg).to.have.length(len);
  };

  /**
   * ### .throws(function, [constructor/string/regexp], [string/regexp], [message])
   *
   * Asserts that `function` will throw an error that is an instance of
   * `constructor`, or alternately that it will throw an error with message
   * matching `regexp`.
   *
   *     assert.throw(fn, 'function throws a reference error');
   *     assert.throw(fn, /function throws a reference error/);
   *     assert.throw(fn, ReferenceError);
   *     assert.throw(fn, ReferenceError, 'function throws a reference error');
   *     assert.throw(fn, ReferenceError, /function throws a reference error/);
   *
   * @name throws
   * @alias throw
   * @alias Throw
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.Throw = function (fn, errt, errs, msg) {
    if ('string' === typeof errt || errt instanceof RegExp) {
      errs = errt;
      errt = null;
    }

    var assertErr = new Assertion(fn, msg).to.Throw(errt, errs);
    return flag(assertErr, 'object');
  };

  /**
   * ### .doesNotThrow(function, [constructor/regexp], [message])
   *
   * Asserts that `function` will _not_ throw an error that is an instance of
   * `constructor`, or alternately that it will not throw an error with message
   * matching `regexp`.
   *
   *     assert.doesNotThrow(fn, Error, 'function does not throw');
   *
   * @name doesNotThrow
   * @param {Function} function
   * @param {ErrorConstructor} constructor
   * @param {RegExp} regexp
   * @param {String} message
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Error#Error_types
   * @api public
   */

  assert.doesNotThrow = function (fn, type, msg) {
    if ('string' === typeof type) {
      msg = type;
      type = null;
    }

    new Assertion(fn, msg).to.not.Throw(type);
  };

  /**
   * ### .operator(val1, operator, val2, [message])
   *
   * Compares two values using `operator`.
   *
   *     assert.operator(1, '<', 2, 'everything is ok');
   *     assert.operator(1, '>', 2, 'this will fail');
   *
   * @name operator
   * @param {Mixed} val1
   * @param {String} operator
   * @param {Mixed} val2
   * @param {String} message
   * @api public
   */

  assert.operator = function (val, operator, val2, msg) {
    if (!~['==', '===', '>', '>=', '<', '<=', '!=', '!=='].indexOf(operator)) {
      throw new Error('Invalid operator "' + operator + '"');
    }
    var test = new Assertion(eval(val + operator + val2), msg);
    test.assert(
        true === flag(test, 'object')
      , 'expected ' + util.inspect(val) + ' to be ' + operator + ' ' + util.inspect(val2)
      , 'expected ' + util.inspect(val) + ' to not be ' + operator + ' ' + util.inspect(val2) );
  };

  /**
   * ### .closeTo(actual, expected, delta, [message])
   *
   * Asserts that the target is equal `expected`, to within a +/- `delta` range.
   *
   *     assert.closeTo(1.5, 1, 0.5, 'numbers are close');
   *
   * @name closeTo
   * @param {Number} actual
   * @param {Number} expected
   * @param {Number} delta
   * @param {String} message
   * @api public
   */

  assert.closeTo = function (act, exp, delta, msg) {
    new Assertion(act, msg).to.be.closeTo(exp, delta);
  };

  /**
   * ### .sameMembers(set1, set2, [message])
   *
   * Asserts that `set1` and `set2` have the same members.
   * Order is not taken into account.
   *
   *     assert.sameMembers([ 1, 2, 3 ], [ 2, 1, 3 ], 'same members');
   *
   * @name sameMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.sameMembers = function (set1, set2, msg) {
    new Assertion(set1, msg).to.have.same.members(set2);
  }

  /**
   * ### .includeMembers(superset, subset, [message])
   *
   * Asserts that `subset` is included in `superset`.
   * Order is not taken into account.
   *
   *     assert.includeMembers([ 1, 2, 3 ], [ 2, 1 ], 'include members');
   *
   * @name includeMembers
   * @param {Array} superset
   * @param {Array} subset
   * @param {String} message
   * @api public
   */

  assert.includeMembers = function (superset, subset, msg) {
    new Assertion(superset, msg).to.include.members(subset);
  }

  /*!
   * Undocumented / untested
   */

  assert.ifError = function (val, msg) {
    new Assertion(val, msg).to.not.be.ok;
  };

  /*!
   * Aliases.
   */

  (function alias(name, as){
    assert[as] = assert[name];
    return alias;
  })
  ('Throw', 'throw')
  ('Throw', 'throws');
};

},{}],52:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  chai.expect = function (val, message) {
    return new chai.Assertion(val, message);
  };
};


},{}],53:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

module.exports = function (chai, util) {
  var Assertion = chai.Assertion;

  function loadShould () {
    // explicitly define this method as function as to have it's name to include as `ssfi`
    function shouldGetter() {
      if (this instanceof String || this instanceof Number) {
        return new Assertion(this.constructor(this), null, shouldGetter);
      } else if (this instanceof Boolean) {
        return new Assertion(this == true, null, shouldGetter);
      }
      return new Assertion(this, null, shouldGetter);
    }
    function shouldSetter(value) {
      // See https://github.com/chaijs/chai/issues/86: this makes
      // `whatever.should = someValue` actually set `someValue`, which is
      // especially useful for `global.should = require('chai').should()`.
      //
      // Note that we have to use [[DefineProperty]] instead of [[Put]]
      // since otherwise we would trigger this very setter!
      Object.defineProperty(this, 'should', {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
    // modify Object.prototype to have `should`
    Object.defineProperty(Object.prototype, 'should', {
      set: shouldSetter
      , get: shouldGetter
      , configurable: true
    });

    var should = {};

    should.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.equal(val2);
    };

    should.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.Throw(errt, errs);
    };

    should.exist = function (val, msg) {
      new Assertion(val, msg).to.exist;
    }

    // negation
    should.not = {}

    should.not.equal = function (val1, val2, msg) {
      new Assertion(val1, msg).to.not.equal(val2);
    };

    should.not.Throw = function (fn, errt, errs, msg) {
      new Assertion(fn, msg).to.not.Throw(errt, errs);
    };

    should.not.exist = function (val, msg) {
      new Assertion(val, msg).to.not.exist;
    }

    should['throw'] = should['Throw'];
    should.not['throw'] = should.not['Throw'];

    return should;
  };

  chai.should = loadShould;
  chai.Should = loadShould;
};

},{}],54:[function(require,module,exports){
/*!
 * Chai - addChainingMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var transferFlags = require('./transferFlags');
var flag = require('./flag');
var config = require('../config');

/*!
 * Module variables
 */

// Check whether `__proto__` is supported
var hasProtoSupport = '__proto__' in Object;

// Without `__proto__` support, this module will need to add properties to a function.
// However, some Function.prototype methods cannot be overwritten,
// and there seems no easy cross-platform way to detect them (@see chaijs/chai/issues/69).
var excludeNames = /^(?:length|name|arguments|caller)$/;

// Cache `Function` properties
var call  = Function.prototype.call,
    apply = Function.prototype.apply;

/**
 * ### addChainableMethod (ctx, name, method, chainingBehavior)
 *
 * Adds a method to an object, such that the method can also be chained.
 *
 *     utils.addChainableMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addChainableMethod('foo', fn, chainingBehavior);
 *
 * The result can then be used as both a method assertion, executing both `method` and
 * `chainingBehavior`, or as a language chain, which only executes `chainingBehavior`.
 *
 *     expect(fooStr).to.be.foo('bar');
 *     expect(fooStr).to.be.foo.equal('foo');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for `name`, when called
 * @param {Function} chainingBehavior function to be called every time the property is accessed
 * @name addChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  if (typeof chainingBehavior !== 'function') {
    chainingBehavior = function () { };
  }

  var chainableBehavior = {
      method: method
    , chainingBehavior: chainingBehavior
  };

  // save the methods so we can overwrite them later, if we need to.
  if (!ctx.__methods) {
    ctx.__methods = {};
  }
  ctx.__methods[name] = chainableBehavior;

  Object.defineProperty(ctx, name,
    { get: function () {
        chainableBehavior.chainingBehavior.call(this);

        var assert = function assert() {
          var old_ssfi = flag(this, 'ssfi');
          if (old_ssfi && config.includeStack === false)
            flag(this, 'ssfi', assert);
          var result = chainableBehavior.method.apply(this, arguments);
          return result === undefined ? this : result;
        };

        // Use `__proto__` if available
        if (hasProtoSupport) {
          // Inherit all properties from the object by replacing the `Function` prototype
          var prototype = assert.__proto__ = Object.create(this);
          // Restore the `call` and `apply` methods from `Function`
          prototype.call = call;
          prototype.apply = apply;
        }
        // Otherwise, redefine all properties (slow!)
        else {
          var asserterNames = Object.getOwnPropertyNames(ctx);
          asserterNames.forEach(function (asserterName) {
            if (!excludeNames.test(asserterName)) {
              var pd = Object.getOwnPropertyDescriptor(ctx, asserterName);
              Object.defineProperty(assert, asserterName, pd);
            }
          });
        }

        transferFlags(this, assert);
        return assert;
      }
    , configurable: true
  });
};

},{"../config":49,"./flag":57,"./transferFlags":71}],55:[function(require,module,exports){
/*!
 * Chai - addMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

var config = require('../config');

/**
 * ### .addMethod (ctx, name, method)
 *
 * Adds a method to the prototype of an object.
 *
 *     utils.addMethod(chai.Assertion.prototype, 'foo', function (str) {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.equal(str);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(fooStr).to.be.foo('bar');
 *
 * @param {Object} ctx object to which the method is added
 * @param {String} name of method to add
 * @param {Function} method function to be used for name
 * @name addMethod
 * @api public
 */
var flag = require('./flag');

module.exports = function (ctx, name, method) {
  ctx[name] = function () {
    var old_ssfi = flag(this, 'ssfi');
    if (old_ssfi && config.includeStack === false)
      flag(this, 'ssfi', ctx[name]);
    var result = method.apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{"../config":49,"./flag":57}],56:[function(require,module,exports){
/*!
 * Chai - addProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### addProperty (ctx, name, getter)
 *
 * Adds a property to the prototype of an object.
 *
 *     utils.addProperty(chai.Assertion.prototype, 'foo', function () {
 *       var obj = utils.flag(this, 'object');
 *       new chai.Assertion(obj).to.be.instanceof(Foo);
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.addProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.foo;
 *
 * @param {Object} ctx object to which the property is added
 * @param {String} name of property to add
 * @param {Function} getter function to be used for name
 * @name addProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter.call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],57:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### flag(object ,key, [value])
 *
 * Get or set a flag value on an object. If a
 * value is provided it will be set, else it will
 * return the currently set value or `undefined` if
 * the value is not set.
 *
 *     utils.flag(this, 'foo', 'bar'); // setter
 *     utils.flag(this, 'foo'); // getter, returns `bar`
 *
 * @param {Object} object (constructed Assertion
 * @param {String} key
 * @param {Mixed} value (optional)
 * @name flag
 * @api private
 */

module.exports = function (obj, key, value) {
  var flags = obj.__flags || (obj.__flags = Object.create(null));
  if (arguments.length === 3) {
    flags[key] = value;
  } else {
    return flags[key];
  }
};

},{}],58:[function(require,module,exports){
/*!
 * Chai - getActual utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getActual(object, [actual])
 *
 * Returns the `actual` value for an Assertion
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  return args.length > 4 ? args[4] : obj._obj;
};

},{}],59:[function(require,module,exports){
/*!
 * Chai - getEnumerableProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getEnumerableProperties(object)
 *
 * This allows the retrieval of enumerable property names of an object,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getEnumerableProperties
 * @api public
 */

module.exports = function getEnumerableProperties(object) {
  var result = [];
  for (var name in object) {
    result.push(name);
  }
  return result;
};

},{}],60:[function(require,module,exports){
/*!
 * Chai - message composition utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag')
  , getActual = require('./getActual')
  , inspect = require('./inspect')
  , objDisplay = require('./objDisplay');

/**
 * ### .getMessage(object, message, negateMessage)
 *
 * Construct the error message based on flags
 * and template tags. Template tags will return
 * a stringified inspection of the object referenced.
 *
 * Message template tags:
 * - `#{this}` current asserted object
 * - `#{act}` actual value
 * - `#{exp}` expected value
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 * @name getMessage
 * @api public
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , val = flag(obj, 'object')
    , expected = args[3]
    , actual = getActual(obj, args)
    , msg = negate ? args[2] : args[1]
    , flagMsg = flag(obj, 'message');

  msg = msg || '';
  msg = msg
    .replace(/#{this}/g, objDisplay(val))
    .replace(/#{act}/g, objDisplay(actual))
    .replace(/#{exp}/g, objDisplay(expected));

  return flagMsg ? flagMsg + ': ' + msg : msg;
};

},{"./flag":57,"./getActual":58,"./inspect":65,"./objDisplay":66}],61:[function(require,module,exports){
/*!
 * Chai - getName utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * # getName(func)
 *
 * Gets the name of a function, in a cross-browser way.
 *
 * @param {Function} a function (usually a constructor)
 */

module.exports = function (func) {
  if (func.name) return func.name;

  var match = /^\s?function ([^(]*)\(/.exec(func);
  return match && match[1] ? match[1] : "";
};

},{}],62:[function(require,module,exports){
/*!
 * Chai - getPathValue utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * @see https://github.com/logicalparadox/filtr
 * MIT Licensed
 */

/**
 * ### .getPathValue(path, object)
 *
 * This allows the retrieval of values in an
 * object given a string path.
 *
 *     var obj = {
 *         prop1: {
 *             arr: ['a', 'b', 'c']
 *           , str: 'Hello'
 *         }
 *       , prop2: {
 *             arr: [ { nested: 'Universe' } ]
 *           , str: 'Hello again!'
 *         }
 *     }
 *
 * The following would be the results.
 *
 *     getPathValue('prop1.str', obj); // Hello
 *     getPathValue('prop1.att[2]', obj); // b
 *     getPathValue('prop2.arr[0].nested', obj); // Universe
 *
 * @param {String} path
 * @param {Object} object
 * @returns {Object} value or `undefined`
 * @name getPathValue
 * @api public
 */

var getPathValue = module.exports = function (path, obj) {
  var parsed = parsePath(path);
  return _getPathValue(parsed, obj);
};

/*!
 * ## parsePath(path)
 *
 * Helper function used to parse string object
 * paths. Use in conjunction with `_getPathValue`.
 *
 *      var parsed = parsePath('myobject.property.subprop');
 *
 * ### Paths:
 *
 * * Can be as near infinitely deep and nested
 * * Arrays are also valid using the formal `myobject.document[3].property`.
 *
 * @param {String} path
 * @returns {Object} parsed
 * @api private
 */

function parsePath (path) {
  var str = path.replace(/\[/g, '.[')
    , parts = str.match(/(\\\.|[^.]+?)+/g);
  return parts.map(function (value) {
    var re = /\[(\d+)\]$/
      , mArr = re.exec(value)
    if (mArr) return { i: parseFloat(mArr[1]) };
    else return { p: value };
  });
};

/*!
 * ## _getPathValue(parsed, obj)
 *
 * Helper companion function for `.parsePath` that returns
 * the value located at the parsed address.
 *
 *      var value = getPathValue(parsed, obj);
 *
 * @param {Object} parsed definition from `parsePath`.
 * @param {Object} object to search against
 * @returns {Object|Undefined} value
 * @api private
 */

function _getPathValue (parsed, obj) {
  var tmp = obj
    , res;
  for (var i = 0, l = parsed.length; i < l; i++) {
    var part = parsed[i];
    if (tmp) {
      if ('undefined' !== typeof part.p)
        tmp = tmp[part.p];
      else if ('undefined' !== typeof part.i)
        tmp = tmp[part.i];
      if (i == (l - 1)) res = tmp;
    } else {
      res = undefined;
    }
  }
  return res;
};

},{}],63:[function(require,module,exports){
/*!
 * Chai - getProperties utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .getProperties(object)
 *
 * This allows the retrieval of property names of an object, enumerable or not,
 * inherited or not.
 *
 * @param {Object} object
 * @returns {Array}
 * @name getProperties
 * @api public
 */

module.exports = function getProperties(object) {
  var result = Object.getOwnPropertyNames(subject);

  function addProperty(property) {
    if (result.indexOf(property) === -1) {
      result.push(property);
    }
  }

  var proto = Object.getPrototypeOf(subject);
  while (proto !== null) {
    Object.getOwnPropertyNames(proto).forEach(addProperty);
    proto = Object.getPrototypeOf(proto);
  }

  return result;
};

},{}],64:[function(require,module,exports){
/*!
 * chai
 * Copyright(c) 2011 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Main exports
 */

var exports = module.exports = {};

/*!
 * test utility
 */

exports.test = require('./test');

/*!
 * type utility
 */

exports.type = require('./type');

/*!
 * message utility
 */

exports.getMessage = require('./getMessage');

/*!
 * actual utility
 */

exports.getActual = require('./getActual');

/*!
 * Inspect util
 */

exports.inspect = require('./inspect');

/*!
 * Object Display util
 */

exports.objDisplay = require('./objDisplay');

/*!
 * Flag utility
 */

exports.flag = require('./flag');

/*!
 * Flag transferring utility
 */

exports.transferFlags = require('./transferFlags');

/*!
 * Deep equal utility
 */

exports.eql = require('deep-eql');

/*!
 * Deep path value
 */

exports.getPathValue = require('./getPathValue');

/*!
 * Function name
 */

exports.getName = require('./getName');

/*!
 * add Property
 */

exports.addProperty = require('./addProperty');

/*!
 * add Method
 */

exports.addMethod = require('./addMethod');

/*!
 * overwrite Property
 */

exports.overwriteProperty = require('./overwriteProperty');

/*!
 * overwrite Method
 */

exports.overwriteMethod = require('./overwriteMethod');

/*!
 * Add a chainable method
 */

exports.addChainableMethod = require('./addChainableMethod');

/*!
 * Overwrite chainable method
 */

exports.overwriteChainableMethod = require('./overwriteChainableMethod');


},{"./addChainableMethod":54,"./addMethod":55,"./addProperty":56,"./flag":57,"./getActual":58,"./getMessage":60,"./getName":61,"./getPathValue":62,"./inspect":65,"./objDisplay":66,"./overwriteChainableMethod":67,"./overwriteMethod":68,"./overwriteProperty":69,"./test":70,"./transferFlags":71,"./type":72,"deep-eql":74}],65:[function(require,module,exports){
// This is (almost) directly from Node.js utils
// https://github.com/joyent/node/blob/f8c335d0caf47f16d31413f89aa28eda3878e3aa/lib/util.js

var getName = require('./getName');
var getProperties = require('./getProperties');
var getEnumerableProperties = require('./getEnumerableProperties');

module.exports = inspect;

/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Boolean} showHidden Flag that shows hidden (not enumerable)
 *    properties of objects.
 * @param {Number} depth Depth in which to descend in object. Default is 2.
 * @param {Boolean} colors Flag to turn on ANSI escape codes to color the
 *    output. Default is false (no coloring).
 */
function inspect(obj, showHidden, depth, colors) {
  var ctx = {
    showHidden: showHidden,
    seen: [],
    stylize: function (str) { return str; }
  };
  return formatValue(ctx, obj, (typeof depth === 'undefined' ? 2 : depth));
}

// https://gist.github.com/1044128/
var getOuterHTML = function(element) {
  if ('outerHTML' in element) return element.outerHTML;
  var ns = "http://www.w3.org/1999/xhtml";
  var container = document.createElementNS(ns, '_');
  var elemProto = (window.HTMLElement || window.Element).prototype;
  var xmlSerializer = new XMLSerializer();
  var html;
  if (document.xmlVersion) {
    return xmlSerializer.serializeToString(element);
  } else {
    container.appendChild(element.cloneNode(false));
    html = container.innerHTML.replace('><', '>' + element.innerHTML + '<');
    container.innerHTML = '';
    return html;
  }
};

// Returns true if object is a DOM element.
var isDOMElement = function (object) {
  if (typeof HTMLElement === 'object') {
    return object instanceof HTMLElement;
  } else {
    return object &&
      typeof object === 'object' &&
      object.nodeType === 1 &&
      typeof object.nodeName === 'string';
  }
};

function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (value && typeof value.inspect === 'function' &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes);
    if (typeof ret !== 'string') {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // If it's DOM elem, get outer HTML.
  if (isDOMElement(value)) {
    return getOuterHTML(value);
  }

  // Look up the keys of the object.
  var visibleKeys = getEnumerableProperties(value);
  var keys = ctx.showHidden ? getProperties(value) : visibleKeys;

  // Some type of object without properties can be shortcutted.
  // In IE, errors have a single `stack` property, or if they are vanilla `Error`,
  // a `stack` plus `description` property; ignore those for consistency.
  if (keys.length === 0 || (isError(value) && (
      (keys.length === 1 && keys[0] === 'stack') ||
      (keys.length === 2 && keys[0] === 'description' && keys[1] === 'stack')
     ))) {
    if (typeof value === 'function') {
      var name = getName(value);
      var nameSuffix = name ? ': ' + name : '';
      return ctx.stylize('[Function' + nameSuffix + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toUTCString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (typeof value === 'function') {
    var name = getName(value);
    var nameSuffix = name ? ': ' + name : '';
    base = ' [Function' + nameSuffix + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    return formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  switch (typeof value) {
    case 'undefined':
      return ctx.stylize('undefined', 'undefined');

    case 'string':
      var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                               .replace(/'/g, "\\'")
                                               .replace(/\\"/g, '"') + '\'';
      return ctx.stylize(simple, 'string');

    case 'number':
      return ctx.stylize('' + value, 'number');

    case 'boolean':
      return ctx.stylize('' + value, 'boolean');
  }
  // For some reason typeof null is "object", so special case here.
  if (value === null) {
    return ctx.stylize('null', 'null');
  }
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (Object.prototype.hasOwnProperty.call(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str;
  if (value.__lookupGetter__) {
    if (value.__lookupGetter__(key)) {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Getter/Setter]', 'special');
      } else {
        str = ctx.stylize('[Getter]', 'special');
      }
    } else {
      if (value.__lookupSetter__(key)) {
        str = ctx.stylize('[Setter]', 'special');
      }
    }
  }
  if (visibleKeys.indexOf(key) < 0) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(value[key]) < 0) {
      if (recurseTimes === null) {
        str = formatValue(ctx, value[key], null);
      } else {
        str = formatValue(ctx, value[key], recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (typeof name === 'undefined') {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}

function isArray(ar) {
  return Array.isArray(ar) ||
         (typeof ar === 'object' && objectToString(ar) === '[object Array]');
}

function isRegExp(re) {
  return typeof re === 'object' && objectToString(re) === '[object RegExp]';
}

function isDate(d) {
  return typeof d === 'object' && objectToString(d) === '[object Date]';
}

function isError(e) {
  return typeof e === 'object' && objectToString(e) === '[object Error]';
}

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

},{"./getEnumerableProperties":59,"./getName":61,"./getProperties":63}],66:[function(require,module,exports){
/*!
 * Chai - flag utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var inspect = require('./inspect');
var config = require('../config');

/**
 * ### .objDisplay (object)
 *
 * Determines if an object or an array matches
 * criteria to be inspected in-line for error
 * messages or should be truncated.
 *
 * @param {Mixed} javascript object to inspect
 * @name objDisplay
 * @api public
 */

module.exports = function (obj) {
  var str = inspect(obj)
    , type = Object.prototype.toString.call(obj);

  if (config.truncateThreshold && str.length >= config.truncateThreshold) {
    if (type === '[object Function]') {
      return !obj.name || obj.name === ''
        ? '[Function]'
        : '[Function: ' + obj.name + ']';
    } else if (type === '[object Array]') {
      return '[ Array(' + obj.length + ') ]';
    } else if (type === '[object Object]') {
      var keys = Object.keys(obj)
        , kstr = keys.length > 2
          ? keys.splice(0, 2).join(', ') + ', ...'
          : keys.join(', ');
      return '{ Object (' + kstr + ') }';
    } else {
      return str;
    }
  } else {
    return str;
  }
};

},{"../config":49,"./inspect":65}],67:[function(require,module,exports){
/*!
 * Chai - overwriteChainableMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteChainableMethod (ctx, name, fn)
 *
 * Overwites an already existing chainable method
 * and provides access to the previous function or
 * property.  Must return functions to be used for
 * name.
 *
 *     utils.overwriteChainableMethod(chai.Assertion.prototype, 'length',
 *       function (_super) {
 *       }
 *     , function (_super) {
 *       }
 *     );
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteChainableMethod('foo', fn, fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.have.length(3);
 *     expect(myFoo).to.have.length.above(3);
 *
 * @param {Object} ctx object whose method / property is to be overwritten
 * @param {String} name of method / property to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @param {Function} chainingBehavior function that returns a function to be used for property
 * @name overwriteChainableMethod
 * @api public
 */

module.exports = function (ctx, name, method, chainingBehavior) {
  var chainableBehavior = ctx.__methods[name];

  var _chainingBehavior = chainableBehavior.chainingBehavior;
  chainableBehavior.chainingBehavior = function () {
    var result = chainingBehavior(_chainingBehavior).call(this);
    return result === undefined ? this : result;
  };

  var _method = chainableBehavior.method;
  chainableBehavior.method = function () {
    var result = method(_method).apply(this, arguments);
    return result === undefined ? this : result;
  };
};

},{}],68:[function(require,module,exports){
/*!
 * Chai - overwriteMethod utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteMethod (ctx, name, fn)
 *
 * Overwites an already existing method and provides
 * access to previous function. Must return function
 * to be used for name.
 *
 *     utils.overwriteMethod(chai.Assertion.prototype, 'equal', function (_super) {
 *       return function (str) {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.value).to.equal(str);
 *         } else {
 *           _super.apply(this, arguments);
 *         }
 *       }
 *     });
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteMethod('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.equal('bar');
 *
 * @param {Object} ctx object whose method is to be overwritten
 * @param {String} name of method to overwrite
 * @param {Function} method function that returns a function to be used for name
 * @name overwriteMethod
 * @api public
 */

module.exports = function (ctx, name, method) {
  var _method = ctx[name]
    , _super = function () { return this; };

  if (_method && 'function' === typeof _method)
    _super = _method;

  ctx[name] = function () {
    var result = method(_super).apply(this, arguments);
    return result === undefined ? this : result;
  }
};

},{}],69:[function(require,module,exports){
/*!
 * Chai - overwriteProperty utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### overwriteProperty (ctx, name, fn)
 *
 * Overwites an already existing property getter and provides
 * access to previous value. Must return function to use as getter.
 *
 *     utils.overwriteProperty(chai.Assertion.prototype, 'ok', function (_super) {
 *       return function () {
 *         var obj = utils.flag(this, 'object');
 *         if (obj instanceof Foo) {
 *           new chai.Assertion(obj.name).to.equal('bar');
 *         } else {
 *           _super.call(this);
 *         }
 *       }
 *     });
 *
 *
 * Can also be accessed directly from `chai.Assertion`.
 *
 *     chai.Assertion.overwriteProperty('foo', fn);
 *
 * Then can be used as any other assertion.
 *
 *     expect(myFoo).to.be.ok;
 *
 * @param {Object} ctx object whose property is to be overwritten
 * @param {String} name of property to overwrite
 * @param {Function} getter function that returns a getter function to be used for name
 * @name overwriteProperty
 * @api public
 */

module.exports = function (ctx, name, getter) {
  var _get = Object.getOwnPropertyDescriptor(ctx, name)
    , _super = function () {};

  if (_get && 'function' === typeof _get.get)
    _super = _get.get

  Object.defineProperty(ctx, name,
    { get: function () {
        var result = getter(_super).call(this);
        return result === undefined ? this : result;
      }
    , configurable: true
  });
};

},{}],70:[function(require,module,exports){
/*!
 * Chai - test utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependancies
 */

var flag = require('./flag');

/**
 * # test(object, expression)
 *
 * Test and object for expression.
 *
 * @param {Object} object (constructed Assertion)
 * @param {Arguments} chai.Assertion.prototype.assert arguments
 */

module.exports = function (obj, args) {
  var negate = flag(obj, 'negate')
    , expr = args[0];
  return negate ? !expr : expr;
};

},{"./flag":57}],71:[function(require,module,exports){
/*!
 * Chai - transferFlags utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### transferFlags(assertion, object, includeAll = true)
 *
 * Transfer all the flags for `assertion` to `object`. If
 * `includeAll` is set to `false`, then the base Chai
 * assertion flags (namely `object`, `ssfi`, and `message`)
 * will not be transferred.
 *
 *
 *     var newAssertion = new Assertion();
 *     utils.transferFlags(assertion, newAssertion);
 *
 *     var anotherAsseriton = new Assertion(myObj);
 *     utils.transferFlags(assertion, anotherAssertion, false);
 *
 * @param {Assertion} assertion the assertion to transfer the flags from
 * @param {Object} object the object to transfer the flags too; usually a new assertion
 * @param {Boolean} includeAll
 * @name getAllFlags
 * @api private
 */

module.exports = function (assertion, object, includeAll) {
  var flags = assertion.__flags || (assertion.__flags = Object.create(null));

  if (!object.__flags) {
    object.__flags = Object.create(null);
  }

  includeAll = arguments.length === 3 ? includeAll : true;

  for (var flag in flags) {
    if (includeAll ||
        (flag !== 'object' && flag !== 'ssfi' && flag != 'message')) {
      object.__flags[flag] = flags[flag];
    }
  }
};

},{}],72:[function(require,module,exports){
/*!
 * Chai - type utility
 * Copyright(c) 2012-2014 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Arguments]': 'arguments'
  , '[object Array]': 'array'
  , '[object Date]': 'date'
  , '[object Function]': 'function'
  , '[object Number]': 'number'
  , '[object RegExp]': 'regexp'
  , '[object String]': 'string'
};

/**
 * ### type(object)
 *
 * Better implementation of `typeof` detection that can
 * be used cross-browser. Handles the inconsistencies of
 * Array, `null`, and `undefined` detection.
 *
 *     utils.type({}) // 'object'
 *     utils.type(null) // `null'
 *     utils.type(undefined) // `undefined`
 *     utils.type([]) // `array`
 *
 * @param {Mixed} object to detect type of
 * @name type
 * @api private
 */

module.exports = function (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
};

},{}],73:[function(require,module,exports){
/*!
 * assertion-error
 * Copyright(c) 2013 Jake Luer <jake@qualiancy.com>
 * MIT Licensed
 */

/*!
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param {String} excluded properties ...
 * @return {Function}
 */

function exclude () {
  var excludes = [].slice.call(arguments);

  function excludeProps (res, obj) {
    Object.keys(obj).forEach(function (key) {
      if (!~excludes.indexOf(key)) res[key] = obj[key];
    });
  }

  return function extendExclude () {
    var args = [].slice.call(arguments)
      , i = 0
      , res = {};

    for (; i < args.length; i++) {
      excludeProps(res, args[i]);
    }

    return res;
  };
};

/*!
 * Primary Exports
 */

module.exports = AssertionError;

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param {String} message
 * @param {Object} properties to include (optional)
 * @param {callee} start stack function (optional)
 */

function AssertionError (message, _props, ssf) {
  var extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON')
    , props = extend(_props || {});

  // default values
  this.message = message || 'Unspecified AssertionError';
  this.showDiff = false;

  // copy from properties
  for (var key in props) {
    this[key] = props[key];
  }

  // capture stack trace
  ssf = ssf || arguments.callee;
  if (ssf && Error.captureStackTrace) {
    Error.captureStackTrace(this, ssf);
  }
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param {Boolean} include stack (default: `true`)
 * @return {Object} object that can be `JSON.stringify`
 */

AssertionError.prototype.toJSON = function (stack) {
  var extend = exclude('constructor', 'toJSON', 'stack')
    , props = extend({ name: this.name }, this);

  // include stack if exists and not turned off
  if (false !== stack && this.stack) {
    props.stack = this.stack;
  }

  return props;
};

},{}],74:[function(require,module,exports){
module.exports = require('./lib/eql');

},{"./lib/eql":75}],75:[function(require,module,exports){
/*!
 * deep-eql
 * Copyright(c) 2013 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Module dependencies
 */

var type = require('type-detect');

/*!
 * Buffer.isBuffer browser shim
 */

var Buffer;
try { Buffer = require('buffer').Buffer; }
catch(ex) {
  Buffer = {};
  Buffer.isBuffer = function() { return false; }
}

/*!
 * Primary Export
 */

module.exports = deepEqual;

/**
 * Assert super-strict (egal) equality between
 * two objects of any type.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @param {Array} memoised (optional)
 * @return {Boolean} equal match
 */

function deepEqual(a, b, m) {
  if (sameValue(a, b)) {
    return true;
  } else if ('date' === type(a)) {
    return dateEqual(a, b);
  } else if ('regexp' === type(a)) {
    return regexpEqual(a, b);
  } else if (Buffer.isBuffer(a)) {
    return bufferEqual(a, b);
  } else if ('arguments' === type(a)) {
    return argumentsEqual(a, b, m);
  } else if (!typeEqual(a, b)) {
    return false;
  } else if (('object' !== type(a) && 'object' !== type(b))
  && ('array' !== type(a) && 'array' !== type(b))) {
    return sameValue(a, b);
  } else {
    return objectEqual(a, b, m);
  }
}

/*!
 * Strict (egal) equality test. Ensures that NaN always
 * equals NaN and `-0` does not equal `+0`.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} equal match
 */

function sameValue(a, b) {
  if (a === b) return a !== 0 || 1 / a === 1 / b;
  return a !== a && b !== b;
}

/*!
 * Compare the types of two given objects and
 * return if they are equal. Note that an Array
 * has a type of `array` (not `object`) and arguments
 * have a type of `arguments` (not `array`/`object`).
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function typeEqual(a, b) {
  return type(a) === type(b);
}

/*!
 * Compare two Date objects by asserting that
 * the time values are equal using `saveValue`.
 *
 * @param {Date} a
 * @param {Date} b
 * @return {Boolean} result
 */

function dateEqual(a, b) {
  if ('date' !== type(b)) return false;
  return sameValue(a.getTime(), b.getTime());
}

/*!
 * Compare two regular expressions by converting them
 * to string and checking for `sameValue`.
 *
 * @param {RegExp} a
 * @param {RegExp} b
 * @return {Boolean} result
 */

function regexpEqual(a, b) {
  if ('regexp' !== type(b)) return false;
  return sameValue(a.toString(), b.toString());
}

/*!
 * Assert deep equality of two `arguments` objects.
 * Unfortunately, these must be sliced to arrays
 * prior to test to ensure no bad behavior.
 *
 * @param {Arguments} a
 * @param {Arguments} b
 * @param {Array} memoize (optional)
 * @return {Boolean} result
 */

function argumentsEqual(a, b, m) {
  if ('arguments' !== type(b)) return false;
  a = [].slice.call(a);
  b = [].slice.call(b);
  return deepEqual(a, b, m);
}

/*!
 * Get enumerable properties of a given object.
 *
 * @param {Object} a
 * @return {Array} property names
 */

function enumerable(a) {
  var res = [];
  for (var key in a) res.push(key);
  return res;
}

/*!
 * Simple equality for flat iterable objects
 * such as Arrays or Node.js buffers.
 *
 * @param {Iterable} a
 * @param {Iterable} b
 * @return {Boolean} result
 */

function iterableEqual(a, b) {
  if (a.length !==  b.length) return false;

  var i = 0;
  var match = true;

  for (; i < a.length; i++) {
    if (a[i] !== b[i]) {
      match = false;
      break;
    }
  }

  return match;
}

/*!
 * Extension to `iterableEqual` specifically
 * for Node.js Buffers.
 *
 * @param {Buffer} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function bufferEqual(a, b) {
  if (!Buffer.isBuffer(b)) return false;
  return iterableEqual(a, b);
}

/*!
 * Block for `objectEqual` ensuring non-existing
 * values don't get in.
 *
 * @param {Mixed} object
 * @return {Boolean} result
 */

function isValue(a) {
  return a !== null && a !== undefined;
}

/*!
 * Recursively check the equality of two objects.
 * Once basic sameness has been established it will
 * defer to `deepEqual` for each enumerable key
 * in the object.
 *
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean} result
 */

function objectEqual(a, b, m) {
  if (!isValue(a) || !isValue(b)) {
    return false;
  }

  if (a.prototype !== b.prototype) {
    return false;
  }

  var i;
  if (m) {
    for (i = 0; i < m.length; i++) {
      if ((m[i][0] === a && m[i][1] === b)
      ||  (m[i][0] === b && m[i][1] === a)) {
        return true;
      }
    }
  } else {
    m = [];
  }

  try {
    var ka = enumerable(a);
    var kb = enumerable(b);
  } catch (ex) {
    return false;
  }

  ka.sort();
  kb.sort();

  if (!iterableEqual(ka, kb)) {
    return false;
  }

  m.push([ a, b ]);

  var key;
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!deepEqual(a[key], b[key], m)) {
      return false;
    }
  }

  return true;
}

},{"buffer":38,"type-detect":76}],76:[function(require,module,exports){
module.exports = require('./lib/type');

},{"./lib/type":77}],77:[function(require,module,exports){
/*!
 * type-detect
 * Copyright(c) 2013 jake luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/*!
 * Primary Exports
 */

var exports = module.exports = getType;

/*!
 * Detectable javascript natives
 */

var natives = {
    '[object Array]': 'array'
  , '[object RegExp]': 'regexp'
  , '[object Function]': 'function'
  , '[object Arguments]': 'arguments'
  , '[object Date]': 'date'
};

/**
 * ### typeOf (obj)
 *
 * Use several different techniques to determine
 * the type of object being tested.
 *
 *
 * @param {Mixed} object
 * @return {String} object type
 * @api public
 */

function getType (obj) {
  var str = Object.prototype.toString.call(obj);
  if (natives[str]) return natives[str];
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (obj === Object(obj)) return 'object';
  return typeof obj;
}

exports.Library = Library;

/**
 * ### Library
 *
 * Create a repository for custom type detection.
 *
 * ```js
 * var lib = new type.Library;
 * ```
 *
 */

function Library () {
  this.tests = {};
}

/**
 * #### .of (obj)
 *
 * Expose replacement `typeof` detection to the library.
 *
 * ```js
 * if ('string' === lib.of('hello world')) {
 *   // ...
 * }
 * ```
 *
 * @param {Mixed} object to test
 * @return {String} type
 */

Library.prototype.of = getType;

/**
 * #### .define (type, test)
 *
 * Add a test to for the `.test()` assertion.
 *
 * Can be defined as a regular expression:
 *
 * ```js
 * lib.define('int', /^[0-9]+$/);
 * ```
 *
 * ... or as a function:
 *
 * ```js
 * lib.define('bln', function (obj) {
 *   if ('boolean' === lib.of(obj)) return true;
 *   var blns = [ 'yes', 'no', 'true', 'false', 1, 0 ];
 *   if ('string' === lib.of(obj)) obj = obj.toLowerCase();
 *   return !! ~blns.indexOf(obj);
 * });
 * ```
 *
 * @param {String} type
 * @param {RegExp|Function} test
 * @api public
 */

Library.prototype.define = function (type, test) {
  if (arguments.length === 1) return this.tests[type];
  this.tests[type] = test;
  return this;
};

/**
 * #### .test (obj, test)
 *
 * Assert that an object is of type. Will first
 * check natives, and if that does not pass it will
 * use the user defined custom tests.
 *
 * ```js
 * assert(lib.test('1', 'int'));
 * assert(lib.test('yes', 'bln'));
 * ```
 *
 * @param {Mixed} object
 * @param {String} type
 * @return {Boolean} result
 * @api public
 */

Library.prototype.test = function (obj, type) {
  if (type === getType(obj)) return true;
  var test = this.tests[type];

  if (test && 'regexp' === getType(test)) {
    return test.test(obj);
  } else if (test && 'function' === getType(test)) {
    return test(obj);
  } else {
    throw new ReferenceError('Type test "' + type + '" not defined or invalid.');
  }
};

},{}],78:[function(require,module,exports){
/*jslint eqeqeq: false, onevar: false, forin: true, nomen: false, regexp: false, plusplus: false*/
/*global module, require, __dirname, document*/
/**
 * Sinon core utilities. For internal use only.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

var sinon = (function (formatio) {
    var div = typeof document != "undefined" && document.createElement("div");
    var hasOwn = Object.prototype.hasOwnProperty;

    function isDOMNode(obj) {
        var success = false;

        try {
            obj.appendChild(div);
            success = div.parentNode == obj;
        } catch (e) {
            return false;
        } finally {
            try {
                obj.removeChild(div);
            } catch (e) {
                // Remove failed, not much we can do about that
            }
        }

        return success;
    }

    function isElement(obj) {
        return div && obj && obj.nodeType === 1 && isDOMNode(obj);
    }

    function isFunction(obj) {
        return typeof obj === "function" || !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function isReallyNaN(val) {
        return typeof val === 'number' && isNaN(val);
    }

    function mirrorProperties(target, source) {
        for (var prop in source) {
            if (!hasOwn.call(target, prop)) {
                target[prop] = source[prop];
            }
        }
    }

    function isRestorable (obj) {
        return typeof obj === "function" && typeof obj.restore === "function" && obj.restore.sinon;
    }

    var sinon = {
        wrapMethod: function wrapMethod(object, property, method) {
            if (!object) {
                throw new TypeError("Should wrap property of object");
            }

            if (typeof method != "function") {
                throw new TypeError("Method wrapper should be function");
            }

            var wrappedMethod = object[property],
                error;

            if (!isFunction(wrappedMethod)) {
                error = new TypeError("Attempted to wrap " + (typeof wrappedMethod) + " property " +
                                    property + " as function");
            }

            if (wrappedMethod.restore && wrappedMethod.restore.sinon) {
                error = new TypeError("Attempted to wrap " + property + " which is already wrapped");
            }

            if (wrappedMethod.calledBefore) {
                var verb = !!wrappedMethod.returns ? "stubbed" : "spied on";
                error = new TypeError("Attempted to wrap " + property + " which is already " + verb);
            }

            if (error) {
                if (wrappedMethod._stack) {
                    error.stack += '\n--------------\n' + wrappedMethod._stack;
                }
                throw error;
            }

            // IE 8 does not support hasOwnProperty on the window object and Firefox has a problem
            // when using hasOwn.call on objects from other frames.
            var owned = object.hasOwnProperty ? object.hasOwnProperty(property) : hasOwn.call(object, property);
            object[property] = method;
            method.displayName = property;
            // Set up a stack trace which can be used later to find what line of
            // code the original method was created on.
            method._stack = (new Error('Stack Trace for original')).stack;

            method.restore = function () {
                // For prototype properties try to reset by delete first.
                // If this fails (ex: localStorage on mobile safari) then force a reset
                // via direct assignment.
                if (!owned) {
                    delete object[property];
                }
                if (object[property] === method) {
                    object[property] = wrappedMethod;
                }
            };

            method.restore.sinon = true;
            mirrorProperties(method, wrappedMethod);

            return method;
        },

        extend: function extend(target) {
            for (var i = 1, l = arguments.length; i < l; i += 1) {
                for (var prop in arguments[i]) {
                    if (arguments[i].hasOwnProperty(prop)) {
                        target[prop] = arguments[i][prop];
                    }

                    // DONT ENUM bug, only care about toString
                    if (arguments[i].hasOwnProperty("toString") &&
                        arguments[i].toString != target.toString) {
                        target.toString = arguments[i].toString;
                    }
                }
            }

            return target;
        },

        create: function create(proto) {
            var F = function () {};
            F.prototype = proto;
            return new F();
        },

        deepEqual: function deepEqual(a, b) {
            if (sinon.match && sinon.match.isMatcher(a)) {
                return a.test(b);
            }

            if (typeof a != 'object' || typeof b != 'object') {
                if (isReallyNaN(a) && isReallyNaN(b)) {
                    return true;
                } else {
                    return a === b;
                }
            }

            if (isElement(a) || isElement(b)) {
                return a === b;
            }

            if (a === b) {
                return true;
            }

            if ((a === null && b !== null) || (a !== null && b === null)) {
                return false;
            }

            if (a instanceof RegExp && b instanceof RegExp) {
              return (a.source === b.source) && (a.global === b.global) &&
                (a.ignoreCase === b.ignoreCase) && (a.multiline === b.multiline);
            }

            var aString = Object.prototype.toString.call(a);
            if (aString != Object.prototype.toString.call(b)) {
                return false;
            }

            if (aString == "[object Date]") {
                return a.valueOf() === b.valueOf();
            }

            var prop, aLength = 0, bLength = 0;

            if (aString == "[object Array]" && a.length !== b.length) {
                return false;
            }

            for (prop in a) {
                aLength += 1;

                if (!deepEqual(a[prop], b[prop])) {
                    return false;
                }
            }

            for (prop in b) {
                bLength += 1;
            }

            return aLength == bLength;
        },

        functionName: function functionName(func) {
            var name = func.displayName || func.name;

            // Use function decomposition as a last resort to get function
            // name. Does not rely on function decomposition to work - if it
            // doesn't debugging will be slightly less informative
            // (i.e. toString will say 'spy' rather than 'myFunc').
            if (!name) {
                var matches = func.toString().match(/function ([^\s\(]+)/);
                name = matches && matches[1];
            }

            return name;
        },

        functionToString: function toString() {
            if (this.getCall && this.callCount) {
                var thisValue, prop, i = this.callCount;

                while (i--) {
                    thisValue = this.getCall(i).thisValue;

                    for (prop in thisValue) {
                        if (thisValue[prop] === this) {
                            return prop;
                        }
                    }
                }
            }

            return this.displayName || "sinon fake";
        },

        getConfig: function (custom) {
            var config = {};
            custom = custom || {};
            var defaults = sinon.defaultConfig;

            for (var prop in defaults) {
                if (defaults.hasOwnProperty(prop)) {
                    config[prop] = custom.hasOwnProperty(prop) ? custom[prop] : defaults[prop];
                }
            }

            return config;
        },

        format: function (val) {
            return "" + val;
        },

        defaultConfig: {
            injectIntoThis: true,
            injectInto: null,
            properties: ["spy", "stub", "mock", "clock", "server", "requests"],
            useFakeTimers: true,
            useFakeServer: true
        },

        timesInWords: function timesInWords(count) {
            return count == 1 && "once" ||
                count == 2 && "twice" ||
                count == 3 && "thrice" ||
                (count || 0) + " times";
        },

        calledInOrder: function (spies) {
            for (var i = 1, l = spies.length; i < l; i++) {
                if (!spies[i - 1].calledBefore(spies[i]) || !spies[i].called) {
                    return false;
                }
            }

            return true;
        },

        orderByFirstCall: function (spies) {
            return spies.sort(function (a, b) {
                // uuid, won't ever be equal
                var aCall = a.getCall(0);
                var bCall = b.getCall(0);
                var aId = aCall && aCall.callId || -1;
                var bId = bCall && bCall.callId || -1;

                return aId < bId ? -1 : 1;
            });
        },

        log: function () {},

        logError: function (label, err) {
            var msg = label + " threw exception: ";
            sinon.log(msg + "[" + err.name + "] " + err.message);
            if (err.stack) { sinon.log(err.stack); }

            setTimeout(function () {
                err.message = msg + err.message;
                throw err;
            }, 0);
        },

        typeOf: function (value) {
            if (value === null) {
                return "null";
            }
            else if (value === undefined) {
                return "undefined";
            }
            var string = Object.prototype.toString.call(value);
            return string.substring(8, string.length - 1).toLowerCase();
        },

        createStubInstance: function (constructor) {
            if (typeof constructor !== "function") {
                throw new TypeError("The constructor should be a function.");
            }
            return sinon.stub(sinon.create(constructor.prototype));
        },

        restore: function (object) {
            if (object !== null && typeof object === "object") {
                for (var prop in object) {
                    if (isRestorable(object[prop])) {
                        object[prop].restore();
                    }
                }
            }
            else if (isRestorable(object)) {
                object.restore();
            }
        }
    };

    var isNode = typeof module !== "undefined" && module.exports;
    var isAMD = typeof define === 'function' && typeof define.amd === 'object' && define.amd;

    if (isAMD) {
        define(function(){
            return sinon;
        });
    } else if (isNode) {
        try {
            formatio = require("formatio");
        } catch (e) {}
        module.exports = sinon;
        module.exports.spy = require("./sinon/spy");
        module.exports.spyCall = require("./sinon/call");
        module.exports.behavior = require("./sinon/behavior");
        module.exports.stub = require("./sinon/stub");
        module.exports.mock = require("./sinon/mock");
        module.exports.collection = require("./sinon/collection");
        module.exports.assert = require("./sinon/assert");
        module.exports.sandbox = require("./sinon/sandbox");
        module.exports.test = require("./sinon/test");
        module.exports.testCase = require("./sinon/test_case");
        module.exports.assert = require("./sinon/assert");
        module.exports.match = require("./sinon/match");
    }

    if (formatio) {
        var formatter = formatio.configure({ quoteStrings: false });
        sinon.format = function () {
            return formatter.ascii.apply(formatter, arguments);
        };
    } else if (isNode) {
        try {
            var util = require("util");
            sinon.format = function (value) {
                return typeof value == "object" && value.toString === Object.prototype.toString ? util.inspect(value) : value;
            };
        } catch (e) {
            /* Node, but no util module - would be very old, but better safe than
             sorry */
        }
    }

    return sinon;
}(typeof formatio == "object" && formatio));

},{"./sinon/assert":79,"./sinon/behavior":80,"./sinon/call":81,"./sinon/collection":82,"./sinon/match":83,"./sinon/mock":84,"./sinon/sandbox":85,"./sinon/spy":86,"./sinon/stub":87,"./sinon/test":88,"./sinon/test_case":89,"formatio":91,"util":45}],79:[function(require,module,exports){
(function (global){
/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Assertions matching the test spy retrieval interface.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon, global) {
    var commonJSModule = typeof module !== "undefined" && module.exports;
    var slice = Array.prototype.slice;
    var assert;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function verifyIsStub() {
        var method;

        for (var i = 0, l = arguments.length; i < l; ++i) {
            method = arguments[i];

            if (!method) {
                assert.fail("fake is not a spy");
            }

            if (typeof method != "function") {
                assert.fail(method + " is not a function");
            }

            if (typeof method.getCall != "function") {
                assert.fail(method + " is not stubbed");
            }
        }
    }

    function failAssertion(object, msg) {
        object = object || global;
        var failMethod = object.fail || assert.fail;
        failMethod.call(object, msg);
    }

    function mirrorPropAsAssertion(name, method, message) {
        if (arguments.length == 2) {
            message = method;
            method = name;
        }

        assert[name] = function (fake) {
            verifyIsStub(fake);

            var args = slice.call(arguments, 1);
            var failed = false;

            if (typeof method == "function") {
                failed = !method(fake);
            } else {
                failed = typeof fake[method] == "function" ?
                    !fake[method].apply(fake, args) : !fake[method];
            }

            if (failed) {
                failAssertion(this, fake.printf.apply(fake, [message].concat(args)));
            } else {
                assert.pass(name);
            }
        };
    }

    function exposedName(prefix, prop) {
        return !prefix || /^fail/.test(prop) ? prop :
            prefix + prop.slice(0, 1).toUpperCase() + prop.slice(1);
    }

    assert = {
        failException: "AssertError",

        fail: function fail(message) {
            var error = new Error(message);
            error.name = this.failException || assert.failException;

            throw error;
        },

        pass: function pass(assertion) {},

        callOrder: function assertCallOrder() {
            verifyIsStub.apply(null, arguments);
            var expected = "", actual = "";

            if (!sinon.calledInOrder(arguments)) {
                try {
                    expected = [].join.call(arguments, ", ");
                    var calls = slice.call(arguments);
                    var i = calls.length;
                    while (i) {
                        if (!calls[--i].called) {
                            calls.splice(i, 1);
                        }
                    }
                    actual = sinon.orderByFirstCall(calls).join(", ");
                } catch (e) {
                    // If this fails, we'll just fall back to the blank string
                }

                failAssertion(this, "expected " + expected + " to be " +
                              "called in order but were called as " + actual);
            } else {
                assert.pass("callOrder");
            }
        },

        callCount: function assertCallCount(method, count) {
            verifyIsStub(method);

            if (method.callCount != count) {
                var msg = "expected %n to be called " + sinon.timesInWords(count) +
                    " but was called %c%C";
                failAssertion(this, method.printf(msg));
            } else {
                assert.pass("callCount");
            }
        },

        expose: function expose(target, options) {
            if (!target) {
                throw new TypeError("target is null or undefined");
            }

            var o = options || {};
            var prefix = typeof o.prefix == "undefined" && "assert" || o.prefix;
            var includeFail = typeof o.includeFail == "undefined" || !!o.includeFail;

            for (var method in this) {
                if (method != "export" && (includeFail || !/^(fail)/.test(method))) {
                    target[exposedName(prefix, method)] = this[method];
                }
            }

            return target;
        },

        match: function match(actual, expectation) {
            var matcher = sinon.match(expectation);
            if (matcher.test(actual)) {
                assert.pass("match");
            } else {
                var formatted = [
                    "expected value to match",
                    "    expected = " + sinon.format(expectation),
                    "    actual = " + sinon.format(actual)
                ]
                failAssertion(this, formatted.join("\n"));
            }
        }
    };

    mirrorPropAsAssertion("called", "expected %n to have been called at least once but was never called");
    mirrorPropAsAssertion("notCalled", function (spy) { return !spy.called; },
                          "expected %n to not have been called but was called %c%C");
    mirrorPropAsAssertion("calledOnce", "expected %n to be called once but was called %c%C");
    mirrorPropAsAssertion("calledTwice", "expected %n to be called twice but was called %c%C");
    mirrorPropAsAssertion("calledThrice", "expected %n to be called thrice but was called %c%C");
    mirrorPropAsAssertion("calledOn", "expected %n to be called with %1 as this but was called with %t");
    mirrorPropAsAssertion("alwaysCalledOn", "expected %n to always be called with %1 as this but was called with %t");
    mirrorPropAsAssertion("calledWithNew", "expected %n to be called with new");
    mirrorPropAsAssertion("alwaysCalledWithNew", "expected %n to always be called with new");
    mirrorPropAsAssertion("calledWith", "expected %n to be called with arguments %*%C");
    mirrorPropAsAssertion("calledWithMatch", "expected %n to be called with match %*%C");
    mirrorPropAsAssertion("alwaysCalledWith", "expected %n to always be called with arguments %*%C");
    mirrorPropAsAssertion("alwaysCalledWithMatch", "expected %n to always be called with match %*%C");
    mirrorPropAsAssertion("calledWithExactly", "expected %n to be called with exact arguments %*%C");
    mirrorPropAsAssertion("alwaysCalledWithExactly", "expected %n to always be called with exact arguments %*%C");
    mirrorPropAsAssertion("neverCalledWith", "expected %n to never be called with arguments %*%C");
    mirrorPropAsAssertion("neverCalledWithMatch", "expected %n to never be called with match %*%C");
    mirrorPropAsAssertion("threw", "%n did not throw exception%C");
    mirrorPropAsAssertion("alwaysThrew", "%n did not always throw exception%C");

    if (commonJSModule) {
        module.exports = assert;
    } else {
        sinon.assert = assert;
    }
}(typeof sinon == "object" && sinon || null, typeof window != "undefined" ? window : (typeof self != "undefined") ? self : global));

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../sinon":78}],80:[function(require,module,exports){
(function (process){
/**
 * @depend ../sinon.js
 */
/*jslint eqeqeq: false, onevar: false*/
/*global module, require, sinon, process, setImmediate, setTimeout*/
/**
 * Stub behavior
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @author Tim Fischbach (mail@timfischbach.de)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    var slice = Array.prototype.slice;
    var join = Array.prototype.join;
    var proto;

    var nextTick = (function () {
        if (typeof process === "object" && typeof process.nextTick === "function") {
            return process.nextTick;
        } else if (typeof setImmediate === "function") {
            return setImmediate;
        } else {
            return function (callback) {
                setTimeout(callback, 0);
            };
        }
    })();

    function throwsException(error, message) {
        if (typeof error == "string") {
            this.exception = new Error(message || "");
            this.exception.name = error;
        } else if (!error) {
            this.exception = new Error("Error");
        } else {
            this.exception = error;
        }

        return this;
    }

    function getCallback(behavior, args) {
        var callArgAt = behavior.callArgAt;

        if (callArgAt < 0) {
            var callArgProp = behavior.callArgProp;

            for (var i = 0, l = args.length; i < l; ++i) {
                if (!callArgProp && typeof args[i] == "function") {
                    return args[i];
                }

                if (callArgProp && args[i] &&
                    typeof args[i][callArgProp] == "function") {
                    return args[i][callArgProp];
                }
            }

            return null;
        }

        return args[callArgAt];
    }

    function getCallbackError(behavior, func, args) {
        if (behavior.callArgAt < 0) {
            var msg;

            if (behavior.callArgProp) {
                msg = sinon.functionName(behavior.stub) +
                    " expected to yield to '" + behavior.callArgProp +
                    "', but no object with such a property was passed.";
            } else {
                msg = sinon.functionName(behavior.stub) +
                    " expected to yield, but no callback was passed.";
            }

            if (args.length > 0) {
                msg += " Received [" + join.call(args, ", ") + "]";
            }

            return msg;
        }

        return "argument at index " + behavior.callArgAt + " is not a function: " + func;
    }

    function callCallback(behavior, args) {
        if (typeof behavior.callArgAt == "number") {
            var func = getCallback(behavior, args);

            if (typeof func != "function") {
                throw new TypeError(getCallbackError(behavior, func, args));
            }

            if (behavior.callbackAsync) {
                nextTick(function() {
                    func.apply(behavior.callbackContext, behavior.callbackArguments);
                });
            } else {
                func.apply(behavior.callbackContext, behavior.callbackArguments);
            }
        }
    }

    proto = {
        create: function(stub) {
            var behavior = sinon.extend({}, sinon.behavior);
            delete behavior.create;
            behavior.stub = stub;

            return behavior;
        },

        isPresent: function() {
            return (typeof this.callArgAt == 'number' ||
                    this.exception ||
                    typeof this.returnArgAt == 'number' ||
                    this.returnThis ||
                    this.returnValueDefined);
        },

        invoke: function(context, args) {
            callCallback(this, args);

            if (this.exception) {
                throw this.exception;
            } else if (typeof this.returnArgAt == 'number') {
                return args[this.returnArgAt];
            } else if (this.returnThis) {
                return context;
            }

            return this.returnValue;
        },

        onCall: function(index) {
            return this.stub.onCall(index);
        },

        onFirstCall: function() {
            return this.stub.onFirstCall();
        },

        onSecondCall: function() {
            return this.stub.onSecondCall();
        },

        onThirdCall: function() {
            return this.stub.onThirdCall();
        },

        withArgs: function(/* arguments */) {
            throw new Error('Defining a stub by invoking "stub.onCall(...).withArgs(...)" is not supported. ' +
                            'Use "stub.withArgs(...).onCall(...)" to define sequential behavior for calls with certain arguments.');
        },

        callsArg: function callsArg(pos) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }

            this.callArgAt = pos;
            this.callbackArguments = [];
            this.callbackContext = undefined;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        callsArgOn: function callsArgOn(pos, context) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = pos;
            this.callbackArguments = [];
            this.callbackContext = context;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        callsArgWith: function callsArgWith(pos) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }

            this.callArgAt = pos;
            this.callbackArguments = slice.call(arguments, 1);
            this.callbackContext = undefined;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        callsArgOnWith: function callsArgWith(pos, context) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = pos;
            this.callbackArguments = slice.call(arguments, 2);
            this.callbackContext = context;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        yields: function () {
            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 0);
            this.callbackContext = undefined;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        yieldsOn: function (context) {
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 1);
            this.callbackContext = context;
            this.callArgProp = undefined;
            this.callbackAsync = false;

            return this;
        },

        yieldsTo: function (prop) {
            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 1);
            this.callbackContext = undefined;
            this.callArgProp = prop;
            this.callbackAsync = false;

            return this;
        },

        yieldsToOn: function (prop, context) {
            if (typeof context != "object") {
                throw new TypeError("argument context is not an object");
            }

            this.callArgAt = -1;
            this.callbackArguments = slice.call(arguments, 2);
            this.callbackContext = context;
            this.callArgProp = prop;
            this.callbackAsync = false;

            return this;
        },


        "throws": throwsException,
        throwsException: throwsException,

        returns: function returns(value) {
            this.returnValue = value;
            this.returnValueDefined = true;

            return this;
        },

        returnsArg: function returnsArg(pos) {
            if (typeof pos != "number") {
                throw new TypeError("argument index is not number");
            }

            this.returnArgAt = pos;

            return this;
        },

        returnsThis: function returnsThis() {
            this.returnThis = true;

            return this;
        }
    };

    // create asynchronous versions of callsArg* and yields* methods
    for (var method in proto) {
        // need to avoid creating anotherasync versions of the newly added async methods
        if (proto.hasOwnProperty(method) &&
            method.match(/^(callsArg|yields)/) &&
            !method.match(/Async/)) {
            proto[method + 'Async'] = (function (syncFnName) {
                return function () {
                    var result = this[syncFnName].apply(this, arguments);
                    this.callbackAsync = true;
                    return result;
                };
            })(method);
        }
    }

    if (commonJSModule) {
        module.exports = proto;
    } else {
        sinon.behavior = proto;
    }
}(typeof sinon == "object" && sinon || null));
}).call(this,require("d:\\xampp\\htdocs\\universal-editor-web\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js"))
},{"../sinon":78,"d:\\xampp\\htdocs\\universal-editor-web\\node_modules\\browserify\\node_modules\\insert-module-globals\\node_modules\\process\\browser.js":43}],81:[function(require,module,exports){
/**
  * @depend ../sinon.js
  * @depend match.js
  */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
  * Spy calls
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @author Maximilian Antoni (mail@maxantoni.de)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  * Copyright (c) 2013 Maximilian Antoni
  */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function throwYieldError(proxy, text, args) {
        var msg = sinon.functionName(proxy) + text;
        if (args.length) {
            msg += " Received [" + slice.call(args).join(", ") + "]";
        }
        throw new Error(msg);
    }

    var slice = Array.prototype.slice;

    var callProto = {
        calledOn: function calledOn(thisValue) {
            if (sinon.match && sinon.match.isMatcher(thisValue)) {
                return thisValue.test(this.thisValue);
            }
            return this.thisValue === thisValue;
        },

        calledWith: function calledWith() {
            for (var i = 0, l = arguments.length; i < l; i += 1) {
                if (!sinon.deepEqual(arguments[i], this.args[i])) {
                    return false;
                }
            }

            return true;
        },

        calledWithMatch: function calledWithMatch() {
            for (var i = 0, l = arguments.length; i < l; i += 1) {
                var actual = this.args[i];
                var expectation = arguments[i];
                if (!sinon.match || !sinon.match(expectation).test(actual)) {
                    return false;
                }
            }
            return true;
        },

        calledWithExactly: function calledWithExactly() {
            return arguments.length == this.args.length &&
                this.calledWith.apply(this, arguments);
        },

        notCalledWith: function notCalledWith() {
            return !this.calledWith.apply(this, arguments);
        },

        notCalledWithMatch: function notCalledWithMatch() {
            return !this.calledWithMatch.apply(this, arguments);
        },

        returned: function returned(value) {
            return sinon.deepEqual(value, this.returnValue);
        },

        threw: function threw(error) {
            if (typeof error === "undefined" || !this.exception) {
                return !!this.exception;
            }

            return this.exception === error || this.exception.name === error;
        },

        calledWithNew: function calledWithNew() {
            return this.proxy.prototype && this.thisValue instanceof this.proxy;
        },

        calledBefore: function (other) {
            return this.callId < other.callId;
        },

        calledAfter: function (other) {
            return this.callId > other.callId;
        },

        callArg: function (pos) {
            this.args[pos]();
        },

        callArgOn: function (pos, thisValue) {
            this.args[pos].apply(thisValue);
        },

        callArgWith: function (pos) {
            this.callArgOnWith.apply(this, [pos, null].concat(slice.call(arguments, 1)));
        },

        callArgOnWith: function (pos, thisValue) {
            var args = slice.call(arguments, 2);
            this.args[pos].apply(thisValue, args);
        },

        "yield": function () {
            this.yieldOn.apply(this, [null].concat(slice.call(arguments, 0)));
        },

        yieldOn: function (thisValue) {
            var args = this.args;
            for (var i = 0, l = args.length; i < l; ++i) {
                if (typeof args[i] === "function") {
                    args[i].apply(thisValue, slice.call(arguments, 1));
                    return;
                }
            }
            throwYieldError(this.proxy, " cannot yield since no callback was passed.", args);
        },

        yieldTo: function (prop) {
            this.yieldToOn.apply(this, [prop, null].concat(slice.call(arguments, 1)));
        },

        yieldToOn: function (prop, thisValue) {
            var args = this.args;
            for (var i = 0, l = args.length; i < l; ++i) {
                if (args[i] && typeof args[i][prop] === "function") {
                    args[i][prop].apply(thisValue, slice.call(arguments, 2));
                    return;
                }
            }
            throwYieldError(this.proxy, " cannot yield to '" + prop +
                "' since no callback was passed.", args);
        },

        toString: function () {
            var callStr = this.proxy.toString() + "(";
            var args = [];

            for (var i = 0, l = this.args.length; i < l; ++i) {
                args.push(sinon.format(this.args[i]));
            }

            callStr = callStr + args.join(", ") + ")";

            if (typeof this.returnValue != "undefined") {
                callStr += " => " + sinon.format(this.returnValue);
            }

            if (this.exception) {
                callStr += " !" + this.exception.name;

                if (this.exception.message) {
                    callStr += "(" + this.exception.message + ")";
                }
            }

            return callStr;
        }
    };

    callProto.invokeCallback = callProto.yield;

    function createSpyCall(spy, thisValue, args, returnValue, exception, id) {
        if (typeof id !== "number") {
            throw new TypeError("Call id is not a number");
        }
        var proxyCall = sinon.create(callProto);
        proxyCall.proxy = spy;
        proxyCall.thisValue = thisValue;
        proxyCall.args = args;
        proxyCall.returnValue = returnValue;
        proxyCall.exception = exception;
        proxyCall.callId = id;

        return proxyCall;
    }
    createSpyCall.toString = callProto.toString; // used by mocks

    if (commonJSModule) {
        module.exports = createSpyCall;
    } else {
        sinon.spyCall = createSpyCall;
    }
}(typeof sinon == "object" && sinon || null));


},{"../sinon":78}],82:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true*/
/*global module, require, sinon*/
/**
 * Collections of stubs, spies and mocks.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    var push = [].push;
    var hasOwnProperty = Object.prototype.hasOwnProperty;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function getFakes(fakeCollection) {
        if (!fakeCollection.fakes) {
            fakeCollection.fakes = [];
        }

        return fakeCollection.fakes;
    }

    function each(fakeCollection, method) {
        var fakes = getFakes(fakeCollection);

        for (var i = 0, l = fakes.length; i < l; i += 1) {
            if (typeof fakes[i][method] == "function") {
                fakes[i][method]();
            }
        }
    }

    function compact(fakeCollection) {
        var fakes = getFakes(fakeCollection);
        var i = 0;
        while (i < fakes.length) {
          fakes.splice(i, 1);
        }
    }

    var collection = {
        verify: function resolve() {
            each(this, "verify");
        },

        restore: function restore() {
            each(this, "restore");
            compact(this);
        },

        verifyAndRestore: function verifyAndRestore() {
            var exception;

            try {
                this.verify();
            } catch (e) {
                exception = e;
            }

            this.restore();

            if (exception) {
                throw exception;
            }
        },

        add: function add(fake) {
            push.call(getFakes(this), fake);
            return fake;
        },

        spy: function spy() {
            return this.add(sinon.spy.apply(sinon, arguments));
        },

        stub: function stub(object, property, value) {
            if (property) {
                var original = object[property];

                if (typeof original != "function") {
                    if (!hasOwnProperty.call(object, property)) {
                        throw new TypeError("Cannot stub non-existent own property " + property);
                    }

                    object[property] = value;

                    return this.add({
                        restore: function () {
                            object[property] = original;
                        }
                    });
                }
            }
            if (!property && !!object && typeof object == "object") {
                var stubbedObj = sinon.stub.apply(sinon, arguments);

                for (var prop in stubbedObj) {
                    if (typeof stubbedObj[prop] === "function") {
                        this.add(stubbedObj[prop]);
                    }
                }

                return stubbedObj;
            }

            return this.add(sinon.stub.apply(sinon, arguments));
        },

        mock: function mock() {
            return this.add(sinon.mock.apply(sinon, arguments));
        },

        inject: function inject(obj) {
            var col = this;

            obj.spy = function () {
                return col.spy.apply(col, arguments);
            };

            obj.stub = function () {
                return col.stub.apply(col, arguments);
            };

            obj.mock = function () {
                return col.mock.apply(col, arguments);
            };

            return obj;
        }
    };

    if (commonJSModule) {
        module.exports = collection;
    } else {
        sinon.collection = collection;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78}],83:[function(require,module,exports){
/* @depend ../sinon.js */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
 * Match functions
 *
 * @author Maximilian Antoni (mail@maxantoni.de)
 * @license BSD
 *
 * Copyright (c) 2012 Maximilian Antoni
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function assertType(value, type, name) {
        var actual = sinon.typeOf(value);
        if (actual !== type) {
            throw new TypeError("Expected type of " + name + " to be " +
                type + ", but was " + actual);
        }
    }

    var matcher = {
        toString: function () {
            return this.message;
        }
    };

    function isMatcher(object) {
        return matcher.isPrototypeOf(object);
    }

    function matchObject(expectation, actual) {
        if (actual === null || actual === undefined) {
            return false;
        }
        for (var key in expectation) {
            if (expectation.hasOwnProperty(key)) {
                var exp = expectation[key];
                var act = actual[key];
                if (match.isMatcher(exp)) {
                    if (!exp.test(act)) {
                        return false;
                    }
                } else if (sinon.typeOf(exp) === "object") {
                    if (!matchObject(exp, act)) {
                        return false;
                    }
                } else if (!sinon.deepEqual(exp, act)) {
                    return false;
                }
            }
        }
        return true;
    }

    matcher.or = function (m2) {
        if (!arguments.length) {
            throw new TypeError("Matcher expected");
        } else if (!isMatcher(m2)) {
            m2 = match(m2);
        }
        var m1 = this;
        var or = sinon.create(matcher);
        or.test = function (actual) {
            return m1.test(actual) || m2.test(actual);
        };
        or.message = m1.message + ".or(" + m2.message + ")";
        return or;
    };

    matcher.and = function (m2) {
        if (!arguments.length) {
            throw new TypeError("Matcher expected");
        } else if (!isMatcher(m2)) {
            m2 = match(m2);
        }
        var m1 = this;
        var and = sinon.create(matcher);
        and.test = function (actual) {
            return m1.test(actual) && m2.test(actual);
        };
        and.message = m1.message + ".and(" + m2.message + ")";
        return and;
    };

    var match = function (expectation, message) {
        var m = sinon.create(matcher);
        var type = sinon.typeOf(expectation);
        switch (type) {
        case "object":
            if (typeof expectation.test === "function") {
                m.test = function (actual) {
                    return expectation.test(actual) === true;
                };
                m.message = "match(" + sinon.functionName(expectation.test) + ")";
                return m;
            }
            var str = [];
            for (var key in expectation) {
                if (expectation.hasOwnProperty(key)) {
                    str.push(key + ": " + expectation[key]);
                }
            }
            m.test = function (actual) {
                return matchObject(expectation, actual);
            };
            m.message = "match(" + str.join(", ") + ")";
            break;
        case "number":
            m.test = function (actual) {
                return expectation == actual;
            };
            break;
        case "string":
            m.test = function (actual) {
                if (typeof actual !== "string") {
                    return false;
                }
                return actual.indexOf(expectation) !== -1;
            };
            m.message = "match(\"" + expectation + "\")";
            break;
        case "regexp":
            m.test = function (actual) {
                if (typeof actual !== "string") {
                    return false;
                }
                return expectation.test(actual);
            };
            break;
        case "function":
            m.test = expectation;
            if (message) {
                m.message = message;
            } else {
                m.message = "match(" + sinon.functionName(expectation) + ")";
            }
            break;
        default:
            m.test = function (actual) {
              return sinon.deepEqual(expectation, actual);
            };
        }
        if (!m.message) {
            m.message = "match(" + expectation + ")";
        }
        return m;
    };

    match.isMatcher = isMatcher;

    match.any = match(function () {
        return true;
    }, "any");

    match.defined = match(function (actual) {
        return actual !== null && actual !== undefined;
    }, "defined");

    match.truthy = match(function (actual) {
        return !!actual;
    }, "truthy");

    match.falsy = match(function (actual) {
        return !actual;
    }, "falsy");

    match.same = function (expectation) {
        return match(function (actual) {
            return expectation === actual;
        }, "same(" + expectation + ")");
    };

    match.typeOf = function (type) {
        assertType(type, "string", "type");
        return match(function (actual) {
            return sinon.typeOf(actual) === type;
        }, "typeOf(\"" + type + "\")");
    };

    match.instanceOf = function (type) {
        assertType(type, "function", "type");
        return match(function (actual) {
            return actual instanceof type;
        }, "instanceOf(" + sinon.functionName(type) + ")");
    };

    function createPropertyMatcher(propertyTest, messagePrefix) {
        return function (property, value) {
            assertType(property, "string", "property");
            var onlyProperty = arguments.length === 1;
            var message = messagePrefix + "(\"" + property + "\"";
            if (!onlyProperty) {
                message += ", " + value;
            }
            message += ")";
            return match(function (actual) {
                if (actual === undefined || actual === null ||
                        !propertyTest(actual, property)) {
                    return false;
                }
                return onlyProperty || sinon.deepEqual(value, actual[property]);
            }, message);
        };
    }

    match.has = createPropertyMatcher(function (actual, property) {
        if (typeof actual === "object") {
            return property in actual;
        }
        return actual[property] !== undefined;
    }, "has");

    match.hasOwn = createPropertyMatcher(function (actual, property) {
        return actual.hasOwnProperty(property);
    }, "hasOwn");

    match.bool = match.typeOf("boolean");
    match.number = match.typeOf("number");
    match.string = match.typeOf("string");
    match.object = match.typeOf("object");
    match.func = match.typeOf("function");
    match.array = match.typeOf("array");
    match.regexp = match.typeOf("regexp");
    match.date = match.typeOf("date");

    if (commonJSModule) {
        module.exports = match;
    } else {
        sinon.match = match;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78}],84:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 */
/*jslint eqeqeq: false, onevar: false, nomen: false*/
/*global module, require, sinon*/
/**
 * Mock functions.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    var push = [].push;
    var match;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    match = sinon.match;

    if (!match && commonJSModule) {
        match = require("./match");
    }

    function mock(object) {
        if (!object) {
            return sinon.expectation.create("Anonymous mock");
        }

        return mock.create(object);
    }

    sinon.mock = mock;

    sinon.extend(mock, (function () {
        function each(collection, callback) {
            if (!collection) {
                return;
            }

            for (var i = 0, l = collection.length; i < l; i += 1) {
                callback(collection[i]);
            }
        }

        return {
            create: function create(object) {
                if (!object) {
                    throw new TypeError("object is null");
                }

                var mockObject = sinon.extend({}, mock);
                mockObject.object = object;
                delete mockObject.create;

                return mockObject;
            },

            expects: function expects(method) {
                if (!method) {
                    throw new TypeError("method is falsy");
                }

                if (!this.expectations) {
                    this.expectations = {};
                    this.proxies = [];
                }

                if (!this.expectations[method]) {
                    this.expectations[method] = [];
                    var mockObject = this;

                    sinon.wrapMethod(this.object, method, function () {
                        return mockObject.invokeMethod(method, this, arguments);
                    });

                    push.call(this.proxies, method);
                }

                var expectation = sinon.expectation.create(method);
                push.call(this.expectations[method], expectation);

                return expectation;
            },

            restore: function restore() {
                var object = this.object;

                each(this.proxies, function (proxy) {
                    if (typeof object[proxy].restore == "function") {
                        object[proxy].restore();
                    }
                });
            },

            verify: function verify() {
                var expectations = this.expectations || {};
                var messages = [], met = [];

                each(this.proxies, function (proxy) {
                    each(expectations[proxy], function (expectation) {
                        if (!expectation.met()) {
                            push.call(messages, expectation.toString());
                        } else {
                            push.call(met, expectation.toString());
                        }
                    });
                });

                this.restore();

                if (messages.length > 0) {
                    sinon.expectation.fail(messages.concat(met).join("\n"));
                } else {
                    sinon.expectation.pass(messages.concat(met).join("\n"));
                }

                return true;
            },

            invokeMethod: function invokeMethod(method, thisValue, args) {
                var expectations = this.expectations && this.expectations[method];
                var length = expectations && expectations.length || 0, i;

                for (i = 0; i < length; i += 1) {
                    if (!expectations[i].met() &&
                        expectations[i].allowsCall(thisValue, args)) {
                        return expectations[i].apply(thisValue, args);
                    }
                }

                var messages = [], available, exhausted = 0;

                for (i = 0; i < length; i += 1) {
                    if (expectations[i].allowsCall(thisValue, args)) {
                        available = available || expectations[i];
                    } else {
                        exhausted += 1;
                    }
                    push.call(messages, "    " + expectations[i].toString());
                }

                if (exhausted === 0) {
                    return available.apply(thisValue, args);
                }

                messages.unshift("Unexpected call: " + sinon.spyCall.toString.call({
                    proxy: method,
                    args: args
                }));

                sinon.expectation.fail(messages.join("\n"));
            }
        };
    }()));

    var times = sinon.timesInWords;

    sinon.expectation = (function () {
        var slice = Array.prototype.slice;
        var _invoke = sinon.spy.invoke;

        function callCountInWords(callCount) {
            if (callCount == 0) {
                return "never called";
            } else {
                return "called " + times(callCount);
            }
        }

        function expectedCallCountInWords(expectation) {
            var min = expectation.minCalls;
            var max = expectation.maxCalls;

            if (typeof min == "number" && typeof max == "number") {
                var str = times(min);

                if (min != max) {
                    str = "at least " + str + " and at most " + times(max);
                }

                return str;
            }

            if (typeof min == "number") {
                return "at least " + times(min);
            }

            return "at most " + times(max);
        }

        function receivedMinCalls(expectation) {
            var hasMinLimit = typeof expectation.minCalls == "number";
            return !hasMinLimit || expectation.callCount >= expectation.minCalls;
        }

        function receivedMaxCalls(expectation) {
            if (typeof expectation.maxCalls != "number") {
                return false;
            }

            return expectation.callCount == expectation.maxCalls;
        }

        function verifyMatcher(possibleMatcher, arg){
            if (match && match.isMatcher(possibleMatcher)) {
                return possibleMatcher.test(arg);
            } else {
                return true;
            }
        }

        return {
            minCalls: 1,
            maxCalls: 1,

            create: function create(methodName) {
                var expectation = sinon.extend(sinon.stub.create(), sinon.expectation);
                delete expectation.create;
                expectation.method = methodName;

                return expectation;
            },

            invoke: function invoke(func, thisValue, args) {
                this.verifyCallAllowed(thisValue, args);

                return _invoke.apply(this, arguments);
            },

            atLeast: function atLeast(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.maxCalls = null;
                    this.limitsSet = true;
                }

                this.minCalls = num;

                return this;
            },

            atMost: function atMost(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not number");
                }

                if (!this.limitsSet) {
                    this.minCalls = null;
                    this.limitsSet = true;
                }

                this.maxCalls = num;

                return this;
            },

            never: function never() {
                return this.exactly(0);
            },

            once: function once() {
                return this.exactly(1);
            },

            twice: function twice() {
                return this.exactly(2);
            },

            thrice: function thrice() {
                return this.exactly(3);
            },

            exactly: function exactly(num) {
                if (typeof num != "number") {
                    throw new TypeError("'" + num + "' is not a number");
                }

                this.atLeast(num);
                return this.atMost(num);
            },

            met: function met() {
                return !this.failed && receivedMinCalls(this);
            },

            verifyCallAllowed: function verifyCallAllowed(thisValue, args) {
                if (receivedMaxCalls(this)) {
                    this.failed = true;
                    sinon.expectation.fail(this.method + " already called " + times(this.maxCalls));
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    sinon.expectation.fail(this.method + " called with " + thisValue + " as thisValue, expected " +
                        this.expectedThis);
                }

                if (!("expectedArguments" in this)) {
                    return;
                }

                if (!args) {
                    sinon.expectation.fail(this.method + " received no arguments, expected " +
                        sinon.format(this.expectedArguments));
                }

                if (args.length < this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too few arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    sinon.expectation.fail(this.method + " received too many arguments (" + sinon.format(args) +
                        "), expected " + sinon.format(this.expectedArguments));
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {

                    if (!verifyMatcher(this.expectedArguments[i],args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", didn't match " + this.expectedArguments.toString());
                    }

                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        sinon.expectation.fail(this.method + " received wrong arguments " + sinon.format(args) +
                            ", expected " + sinon.format(this.expectedArguments));
                    }
                }
            },

            allowsCall: function allowsCall(thisValue, args) {
                if (this.met() && receivedMaxCalls(this)) {
                    return false;
                }

                if ("expectedThis" in this && this.expectedThis !== thisValue) {
                    return false;
                }

                if (!("expectedArguments" in this)) {
                    return true;
                }

                args = args || [];

                if (args.length < this.expectedArguments.length) {
                    return false;
                }

                if (this.expectsExactArgCount &&
                    args.length != this.expectedArguments.length) {
                    return false;
                }

                for (var i = 0, l = this.expectedArguments.length; i < l; i += 1) {
                    if (!verifyMatcher(this.expectedArguments[i],args[i])) {
                        return false;
                    }

                    if (!sinon.deepEqual(this.expectedArguments[i], args[i])) {
                        return false;
                    }
                }

                return true;
            },

            withArgs: function withArgs() {
                this.expectedArguments = slice.call(arguments);
                return this;
            },

            withExactArgs: function withExactArgs() {
                this.withArgs.apply(this, arguments);
                this.expectsExactArgCount = true;
                return this;
            },

            on: function on(thisValue) {
                this.expectedThis = thisValue;
                return this;
            },

            toString: function () {
                var args = (this.expectedArguments || []).slice();

                if (!this.expectsExactArgCount) {
                    push.call(args, "[...]");
                }

                var callStr = sinon.spyCall.toString.call({
                    proxy: this.method || "anonymous mock expectation",
                    args: args
                });

                var message = callStr.replace(", [...", "[, ...") + " " +
                    expectedCallCountInWords(this);

                if (this.met()) {
                    return "Expectation met: " + message;
                }

                return "Expected " + message + " (" +
                    callCountInWords(this.callCount) + ")";
            },

            verify: function verify() {
                if (!this.met()) {
                    sinon.expectation.fail(this.toString());
                } else {
                    sinon.expectation.pass(this.toString());
                }

                return true;
            },

            pass: function(message) {
              sinon.assert.pass(message);
            },
            fail: function (message) {
                var exception = new Error(message);
                exception.name = "ExpectationError";

                throw exception;
            }
        };
    }());

    if (commonJSModule) {
        module.exports = mock;
    } else {
        sinon.mock = mock;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78,"./match":83}],85:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend collection.js
 * @depend util/fake_timers.js
 * @depend util/fake_server_with_clock.js
 */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global require, module*/
/**
 * Manages fake collections as well as fake utilities such as Sinon's
 * timers and fake XHR implementation in one convenient object.
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

if (typeof module !== 'undefined' && module.exports) {
    var sinon = require("../sinon");
    sinon.extend(sinon, require("./util/fake_timers"));
}

(function () {
    var push = [].push;

    function exposeValue(sandbox, config, key, value) {
        if (!value) {
            return;
        }

        if (config.injectInto && !(key in config.injectInto)) {
            config.injectInto[key] = value;
            sandbox.injectedKeys.push(key);
        } else {
            push.call(sandbox.args, value);
        }
    }

    function prepareSandboxFromConfig(config) {
        var sandbox = sinon.create(sinon.sandbox);

        if (config.useFakeServer) {
            if (typeof config.useFakeServer == "object") {
                sandbox.serverPrototype = config.useFakeServer;
            }

            sandbox.useFakeServer();
        }

        if (config.useFakeTimers) {
            if (typeof config.useFakeTimers == "object") {
                sandbox.useFakeTimers.apply(sandbox, config.useFakeTimers);
            } else {
                sandbox.useFakeTimers();
            }
        }

        return sandbox;
    }

    sinon.sandbox = sinon.extend(sinon.create(sinon.collection), {
        useFakeTimers: function useFakeTimers() {
            this.clock = sinon.useFakeTimers.apply(sinon, arguments);

            return this.add(this.clock);
        },

        serverPrototype: sinon.fakeServer,

        useFakeServer: function useFakeServer() {
            var proto = this.serverPrototype || sinon.fakeServer;

            if (!proto || !proto.create) {
                return null;
            }

            this.server = proto.create();
            return this.add(this.server);
        },

        inject: function (obj) {
            sinon.collection.inject.call(this, obj);

            if (this.clock) {
                obj.clock = this.clock;
            }

            if (this.server) {
                obj.server = this.server;
                obj.requests = this.server.requests;
            }

            return obj;
        },

        restore: function () {
            sinon.collection.restore.apply(this, arguments);
            this.restoreContext();
        },

        restoreContext: function () {
            if (this.injectedKeys) {
                for (var i = 0, j = this.injectedKeys.length; i < j; i++) {
                    delete this.injectInto[this.injectedKeys[i]];
                }
                this.injectedKeys = [];
            }
        },

        create: function (config) {
            if (!config) {
                return sinon.create(sinon.sandbox);
            }

            var sandbox = prepareSandboxFromConfig(config);
            sandbox.args = sandbox.args || [];
            sandbox.injectedKeys = [];
            sandbox.injectInto = config.injectInto;
            var prop, value, exposed = sandbox.inject({});

            if (config.properties) {
                for (var i = 0, l = config.properties.length; i < l; i++) {
                    prop = config.properties[i];
                    value = exposed[prop] || prop == "sandbox" && sandbox;
                    exposeValue(sandbox, config, prop, value);
                }
            } else {
                exposeValue(sandbox, config, "sandbox", value);
            }

            return sandbox;
        }
    });

    sinon.sandbox.useFakeXMLHttpRequest = sinon.sandbox.useFakeServer;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = sinon.sandbox;
    }
}());

},{"../sinon":78,"./util/fake_timers":90}],86:[function(require,module,exports){
/**
  * @depend ../sinon.js
  * @depend call.js
  */
/*jslint eqeqeq: false, onevar: false, plusplus: false*/
/*global module, require, sinon*/
/**
  * Spy functions
  *
  * @author Christian Johansen (christian@cjohansen.no)
  * @license BSD
  *
  * Copyright (c) 2010-2013 Christian Johansen
  */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;
    var push = Array.prototype.push;
    var slice = Array.prototype.slice;
    var callId = 0;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function spy(object, property) {
        if (!property && typeof object == "function") {
            return spy.create(object);
        }

        if (!object && !property) {
            return spy.create(function () { });
        }

        var method = object[property];
        return sinon.wrapMethod(object, property, spy.create(method));
    }

    function matchingFake(fakes, args, strict) {
        if (!fakes) {
            return;
        }

        for (var i = 0, l = fakes.length; i < l; i++) {
            if (fakes[i].matches(args, strict)) {
                return fakes[i];
            }
        }
    }

    function incrementCallCount() {
        this.called = true;
        this.callCount += 1;
        this.notCalled = false;
        this.calledOnce = this.callCount == 1;
        this.calledTwice = this.callCount == 2;
        this.calledThrice = this.callCount == 3;
    }

    function createCallProperties() {
        this.firstCall = this.getCall(0);
        this.secondCall = this.getCall(1);
        this.thirdCall = this.getCall(2);
        this.lastCall = this.getCall(this.callCount - 1);
    }

    var vars = "a,b,c,d,e,f,g,h,i,j,k,l";
    function createProxy(func) {
        // Retain the function length:
        var p;
        if (func.length) {
            eval("p = (function proxy(" + vars.substring(0, func.length * 2 - 1) +
                ") { return p.invoke(func, this, slice.call(arguments)); });");
        }
        else {
            p = function proxy() {
                return p.invoke(func, this, slice.call(arguments));
            };
        }
        return p;
    }

    var uuid = 0;

    // Public API
    var spyApi = {
        reset: function () {
            this.called = false;
            this.notCalled = true;
            this.calledOnce = false;
            this.calledTwice = false;
            this.calledThrice = false;
            this.callCount = 0;
            this.firstCall = null;
            this.secondCall = null;
            this.thirdCall = null;
            this.lastCall = null;
            this.args = [];
            this.returnValues = [];
            this.thisValues = [];
            this.exceptions = [];
            this.callIds = [];
            if (this.fakes) {
                for (var i = 0; i < this.fakes.length; i++) {
                    this.fakes[i].reset();
                }
            }
        },

        create: function create(func) {
            var name;

            if (typeof func != "function") {
                func = function () { };
            } else {
                name = sinon.functionName(func);
            }

            var proxy = createProxy(func);

            sinon.extend(proxy, spy);
            delete proxy.create;
            sinon.extend(proxy, func);

            proxy.reset();
            proxy.prototype = func.prototype;
            proxy.displayName = name || "spy";
            proxy.toString = sinon.functionToString;
            proxy._create = sinon.spy.create;
            proxy.id = "spy#" + uuid++;

            return proxy;
        },

        invoke: function invoke(func, thisValue, args) {
            var matching = matchingFake(this.fakes, args);
            var exception, returnValue;

            incrementCallCount.call(this);
            push.call(this.thisValues, thisValue);
            push.call(this.args, args);
            push.call(this.callIds, callId++);

            try {
                if (matching) {
                    returnValue = matching.invoke(func, thisValue, args);
                } else {
                    returnValue = (this.func || func).apply(thisValue, args);
                }

                var thisCall = this.getCall(this.callCount - 1);
                if (thisCall.calledWithNew() && typeof returnValue !== 'object') {
                    returnValue = thisValue;
                }
            } catch (e) {
                exception = e;
            }

            push.call(this.exceptions, exception);
            push.call(this.returnValues, returnValue);

            createCallProperties.call(this);

            if (exception !== undefined) {
                throw exception;
            }

            return returnValue;
        },

        getCall: function getCall(i) {
            if (i < 0 || i >= this.callCount) {
                return null;
            }

            return sinon.spyCall(this, this.thisValues[i], this.args[i],
                                    this.returnValues[i], this.exceptions[i],
                                    this.callIds[i]);
        },

        getCalls: function () {
            var calls = [];
            var i;

            for (i = 0; i < this.callCount; i++) {
                calls.push(this.getCall(i));
            }

            return calls;
        },

        calledBefore: function calledBefore(spyFn) {
            if (!this.called) {
                return false;
            }

            if (!spyFn.called) {
                return true;
            }

            return this.callIds[0] < spyFn.callIds[spyFn.callIds.length - 1];
        },

        calledAfter: function calledAfter(spyFn) {
            if (!this.called || !spyFn.called) {
                return false;
            }

            return this.callIds[this.callCount - 1] > spyFn.callIds[spyFn.callCount - 1];
        },

        withArgs: function () {
            var args = slice.call(arguments);

            if (this.fakes) {
                var match = matchingFake(this.fakes, args, true);

                if (match) {
                    return match;
                }
            } else {
                this.fakes = [];
            }

            var original = this;
            var fake = this._create();
            fake.matchingAguments = args;
            fake.parent = this;
            push.call(this.fakes, fake);

            fake.withArgs = function () {
                return original.withArgs.apply(original, arguments);
            };

            for (var i = 0; i < this.args.length; i++) {
                if (fake.matches(this.args[i])) {
                    incrementCallCount.call(fake);
                    push.call(fake.thisValues, this.thisValues[i]);
                    push.call(fake.args, this.args[i]);
                    push.call(fake.returnValues, this.returnValues[i]);
                    push.call(fake.exceptions, this.exceptions[i]);
                    push.call(fake.callIds, this.callIds[i]);
                }
            }
            createCallProperties.call(fake);

            return fake;
        },

        matches: function (args, strict) {
            var margs = this.matchingAguments;

            if (margs.length <= args.length &&
                sinon.deepEqual(margs, args.slice(0, margs.length))) {
                return !strict || margs.length == args.length;
            }
        },

        printf: function (format) {
            var spy = this;
            var args = slice.call(arguments, 1);
            var formatter;

            return (format || "").replace(/%(.)/g, function (match, specifyer) {
                formatter = spyApi.formatters[specifyer];

                if (typeof formatter == "function") {
                    return formatter.call(null, spy, args);
                } else if (!isNaN(parseInt(specifyer, 10))) {
                    return sinon.format(args[specifyer - 1]);
                }

                return "%" + specifyer;
            });
        }
    };

    function delegateToCalls(method, matchAny, actual, notCalled) {
        spyApi[method] = function () {
            if (!this.called) {
                if (notCalled) {
                    return notCalled.apply(this, arguments);
                }
                return false;
            }

            var currentCall;
            var matches = 0;

            for (var i = 0, l = this.callCount; i < l; i += 1) {
                currentCall = this.getCall(i);

                if (currentCall[actual || method].apply(currentCall, arguments)) {
                    matches += 1;

                    if (matchAny) {
                        return true;
                    }
                }
            }

            return matches === this.callCount;
        };
    }

    delegateToCalls("calledOn", true);
    delegateToCalls("alwaysCalledOn", false, "calledOn");
    delegateToCalls("calledWith", true);
    delegateToCalls("calledWithMatch", true);
    delegateToCalls("alwaysCalledWith", false, "calledWith");
    delegateToCalls("alwaysCalledWithMatch", false, "calledWithMatch");
    delegateToCalls("calledWithExactly", true);
    delegateToCalls("alwaysCalledWithExactly", false, "calledWithExactly");
    delegateToCalls("neverCalledWith", false, "notCalledWith",
        function () { return true; });
    delegateToCalls("neverCalledWithMatch", false, "notCalledWithMatch",
        function () { return true; });
    delegateToCalls("threw", true);
    delegateToCalls("alwaysThrew", false, "threw");
    delegateToCalls("returned", true);
    delegateToCalls("alwaysReturned", false, "returned");
    delegateToCalls("calledWithNew", true);
    delegateToCalls("alwaysCalledWithNew", false, "calledWithNew");
    delegateToCalls("callArg", false, "callArgWith", function () {
        throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
    });
    spyApi.callArgWith = spyApi.callArg;
    delegateToCalls("callArgOn", false, "callArgOnWith", function () {
        throw new Error(this.toString() + " cannot call arg since it was not yet invoked.");
    });
    spyApi.callArgOnWith = spyApi.callArgOn;
    delegateToCalls("yield", false, "yield", function () {
        throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
    });
    // "invokeCallback" is an alias for "yield" since "yield" is invalid in strict mode.
    spyApi.invokeCallback = spyApi.yield;
    delegateToCalls("yieldOn", false, "yieldOn", function () {
        throw new Error(this.toString() + " cannot yield since it was not yet invoked.");
    });
    delegateToCalls("yieldTo", false, "yieldTo", function (property) {
        throw new Error(this.toString() + " cannot yield to '" + property +
            "' since it was not yet invoked.");
    });
    delegateToCalls("yieldToOn", false, "yieldToOn", function (property) {
        throw new Error(this.toString() + " cannot yield to '" + property +
            "' since it was not yet invoked.");
    });

    spyApi.formatters = {
        "c": function (spy) {
            return sinon.timesInWords(spy.callCount);
        },

        "n": function (spy) {
            return spy.toString();
        },

        "C": function (spy) {
            var calls = [];

            for (var i = 0, l = spy.callCount; i < l; ++i) {
                var stringifiedCall = "    " + spy.getCall(i).toString();
                if (/\n/.test(calls[i - 1])) {
                    stringifiedCall = "\n" + stringifiedCall;
                }
                push.call(calls, stringifiedCall);
            }

            return calls.length > 0 ? "\n" + calls.join("\n") : "";
        },

        "t": function (spy) {
            var objects = [];

            for (var i = 0, l = spy.callCount; i < l; ++i) {
                push.call(objects, sinon.format(spy.thisValues[i]));
            }

            return objects.join(", ");
        },

        "*": function (spy, args) {
            var formatted = [];

            for (var i = 0, l = args.length; i < l; ++i) {
                push.call(formatted, sinon.format(args[i]));
            }

            return formatted.join(", ");
        }
    };

    sinon.extend(spy, spyApi);

    spy.spyCall = sinon.spyCall;

    if (commonJSModule) {
        module.exports = spy;
    } else {
        sinon.spy = spy;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78}],87:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend spy.js
 * @depend behavior.js
 */
/*jslint eqeqeq: false, onevar: false*/
/*global module, require, sinon*/
/**
 * Stub functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function stub(object, property, func) {
        if (!!func && typeof func != "function") {
            throw new TypeError("Custom stub should be function");
        }

        var wrapper;

        if (func) {
            wrapper = sinon.spy && sinon.spy.create ? sinon.spy.create(func) : func;
        } else {
            wrapper = stub.create();
        }

        if (!object && typeof property === "undefined") {
            return sinon.stub.create();
        }

        if (typeof property === "undefined" && typeof object == "object") {
            for (var prop in object) {
                if (typeof object[prop] === "function") {
                    stub(object, prop);
                }
            }

            return object;
        }

        return sinon.wrapMethod(object, property, wrapper);
    }

    function getDefaultBehavior(stub) {
        return stub.defaultBehavior || getParentBehaviour(stub) || sinon.behavior.create(stub);
    }

    function getParentBehaviour(stub) {
        return (stub.parent && getCurrentBehavior(stub.parent));
    }

    function getCurrentBehavior(stub) {
        var behavior = stub.behaviors[stub.callCount - 1];
        return behavior && behavior.isPresent() ? behavior : getDefaultBehavior(stub);
    }

    var uuid = 0;

    sinon.extend(stub, (function () {
        var proto = {
            create: function create() {
                var functionStub = function () {
                    return getCurrentBehavior(functionStub).invoke(this, arguments);
                };

                functionStub.id = "stub#" + uuid++;
                var orig = functionStub;
                functionStub = sinon.spy.create(functionStub);
                functionStub.func = orig;

                sinon.extend(functionStub, stub);
                functionStub._create = sinon.stub.create;
                functionStub.displayName = "stub";
                functionStub.toString = sinon.functionToString;

                functionStub.defaultBehavior = null;
                functionStub.behaviors = [];

                return functionStub;
            },

            resetBehavior: function () {
                var i;

                this.defaultBehavior = null;
                this.behaviors = [];

                delete this.returnValue;
                delete this.returnArgAt;
                this.returnThis = false;

                if (this.fakes) {
                    for (i = 0; i < this.fakes.length; i++) {
                        this.fakes[i].resetBehavior();
                    }
                }
            },

            onCall: function(index) {
                if (!this.behaviors[index]) {
                    this.behaviors[index] = sinon.behavior.create(this);
                }

                return this.behaviors[index];
            },

            onFirstCall: function() {
                return this.onCall(0);
            },

            onSecondCall: function() {
                return this.onCall(1);
            },

            onThirdCall: function() {
                return this.onCall(2);
            }
        };

        for (var method in sinon.behavior) {
            if (sinon.behavior.hasOwnProperty(method) &&
                !proto.hasOwnProperty(method) &&
                method != 'create' &&
                method != 'withArgs' &&
                method != 'invoke') {
                proto[method] = (function(behaviorMethod) {
                    return function() {
                        this.defaultBehavior = this.defaultBehavior || sinon.behavior.create(this);
                        this.defaultBehavior[behaviorMethod].apply(this.defaultBehavior, arguments);
                        return this;
                    };
                }(method));
            }
        }

        return proto;
    }()));

    if (commonJSModule) {
        module.exports = stub;
    } else {
        sinon.stub = stub;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78}],88:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend stub.js
 * @depend mock.js
 * @depend sandbox.js
 */
/*jslint eqeqeq: false, onevar: false, forin: true, plusplus: false*/
/*global module, require, sinon*/
/**
 * Test function, sandboxes fakes
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon) {
        return;
    }

    function test(callback) {
        var type = typeof callback;

        if (type != "function") {
            throw new TypeError("sinon.test needs to wrap a test function, got " + type);
        }

        return function () {
            var config = sinon.getConfig(sinon.config);
            config.injectInto = config.injectIntoThis && this || config.injectInto;
            var sandbox = sinon.sandbox.create(config);
            var exception, result;
            var args = Array.prototype.slice.call(arguments).concat(sandbox.args);

            try {
                result = callback.apply(this, args);
            } catch (e) {
                exception = e;
            }

            if (typeof exception !== "undefined") {
                sandbox.restore();
                throw exception;
            }
            else {
                sandbox.verifyAndRestore();
            }

            return result;
        };
    }

    test.config = {
        injectIntoThis: true,
        injectInto: null,
        properties: ["spy", "stub", "mock", "clock", "server", "requests"],
        useFakeTimers: true,
        useFakeServer: true
    };

    if (commonJSModule) {
        module.exports = test;
    } else {
        sinon.test = test;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78}],89:[function(require,module,exports){
/**
 * @depend ../sinon.js
 * @depend test.js
 */
/*jslint eqeqeq: false, onevar: false, eqeqeq: false*/
/*global module, require, sinon*/
/**
 * Test case, sandboxes all test functions
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

(function (sinon) {
    var commonJSModule = typeof module !== 'undefined' && module.exports;

    if (!sinon && commonJSModule) {
        sinon = require("../sinon");
    }

    if (!sinon || !Object.prototype.hasOwnProperty) {
        return;
    }

    function createTest(property, setUp, tearDown) {
        return function () {
            if (setUp) {
                setUp.apply(this, arguments);
            }

            var exception, result;

            try {
                result = property.apply(this, arguments);
            } catch (e) {
                exception = e;
            }

            if (tearDown) {
                tearDown.apply(this, arguments);
            }

            if (exception) {
                throw exception;
            }

            return result;
        };
    }

    function testCase(tests, prefix) {
        /*jsl:ignore*/
        if (!tests || typeof tests != "object") {
            throw new TypeError("sinon.testCase needs an object with test functions");
        }
        /*jsl:end*/

        prefix = prefix || "test";
        var rPrefix = new RegExp("^" + prefix);
        var methods = {}, testName, property, method;
        var setUp = tests.setUp;
        var tearDown = tests.tearDown;

        for (testName in tests) {
            if (tests.hasOwnProperty(testName)) {
                property = tests[testName];

                if (/^(setUp|tearDown)$/.test(testName)) {
                    continue;
                }

                if (typeof property == "function" && rPrefix.test(testName)) {
                    method = property;

                    if (setUp || tearDown) {
                        method = createTest(property, setUp, tearDown);
                    }

                    methods[testName] = sinon.test(method);
                } else {
                    methods[testName] = tests[testName];
                }
            }
        }

        return methods;
    }

    if (commonJSModule) {
        module.exports = testCase;
    } else {
        sinon.testCase = testCase;
    }
}(typeof sinon == "object" && sinon || null));

},{"../sinon":78}],90:[function(require,module,exports){
(function (global){
/*jslint eqeqeq: false, plusplus: false, evil: true, onevar: false, browser: true, forin: false*/
/*global module, require, window*/
/**
 * Fake timer API
 * setTimeout
 * setInterval
 * clearTimeout
 * clearInterval
 * tick
 * reset
 * Date
 *
 * Inspired by jsUnitMockTimeOut from JsUnit
 *
 * @author Christian Johansen (christian@cjohansen.no)
 * @license BSD
 *
 * Copyright (c) 2010-2013 Christian Johansen
 */
"use strict";

if (typeof sinon == "undefined") {
    var sinon = {};
}

(function (global) {
    // node expects setTimeout/setInterval to return a fn object w/ .ref()/.unref()
    // browsers, a number.
    // see https://github.com/cjohansen/Sinon.JS/pull/436
    var timeoutResult = setTimeout(function() {}, 0);
    var addTimerReturnsObject = typeof timeoutResult === 'object';
    clearTimeout(timeoutResult);

    var id = 1;

    function addTimer(args, recurring) {
        if (args.length === 0) {
            throw new Error("Function requires at least 1 parameter");
        }

        if (typeof args[0] === "undefined") {
            throw new Error("Callback must be provided to timer calls");
        }

        var toId = id++;
        var delay = args[1] || 0;

        if (!this.timeouts) {
            this.timeouts = {};
        }

        this.timeouts[toId] = {
            id: toId,
            func: args[0],
            callAt: this.now + delay,
            invokeArgs: Array.prototype.slice.call(args, 2)
        };

        if (recurring === true) {
            this.timeouts[toId].interval = delay;
        }

        if (addTimerReturnsObject) {
            return {
                id: toId,
                ref: function() {},
                unref: function() {}
            };
        }
        else {
            return toId;
        }
    }

    function parseTime(str) {
        if (!str) {
            return 0;
        }

        var strings = str.split(":");
        var l = strings.length, i = l;
        var ms = 0, parsed;

        if (l > 3 || !/^(\d\d:){0,2}\d\d?$/.test(str)) {
            throw new Error("tick only understands numbers and 'h:m:s'");
        }

        while (i--) {
            parsed = parseInt(strings[i], 10);

            if (parsed >= 60) {
                throw new Error("Invalid time " + str);
            }

            ms += parsed * Math.pow(60, (l - i - 1));
        }

        return ms * 1000;
    }

    function createObject(object) {
        var newObject;

        if (Object.create) {
            newObject = Object.create(object);
        } else {
            var F = function () {};
            F.prototype = object;
            newObject = new F();
        }

        newObject.Date.clock = newObject;
        return newObject;
    }

    sinon.clock = {
        now: 0,

        create: function create(now) {
            var clock = createObject(this);

            if (typeof now == "number") {
                clock.now = now;
            }

            if (!!now && typeof now == "object") {
                throw new TypeError("now should be milliseconds since UNIX epoch");
            }

            return clock;
        },

        setTimeout: function setTimeout(callback, timeout) {
            return addTimer.call(this, arguments, false);
        },

        clearTimeout: function clearTimeout(timerId) {
            if (!this.timeouts) {
                this.timeouts = [];
            }

            if (timerId in this.timeouts) {
                delete this.timeouts[timerId];
            }
        },

        setInterval: function setInterval(callback, timeout) {
            return addTimer.call(this, arguments, true);
        },

        clearInterval: function clearInterval(timerId) {
            this.clearTimeout(timerId);
        },

        setImmediate: function setImmediate(callback) {
            var passThruArgs = Array.prototype.slice.call(arguments, 1);

            return addTimer.call(this, [callback, 0].concat(passThruArgs), false);
        },

        clearImmediate: function clearImmediate(timerId) {
            this.clearTimeout(timerId);
        },

        tick: function tick(ms) {
            ms = typeof ms == "number" ? ms : parseTime(ms);
            var tickFrom = this.now, tickTo = this.now + ms, previous = this.now;
            var timer = this.firstTimerInRange(tickFrom, tickTo);

            var firstException;
            while (timer && tickFrom <= tickTo) {
                if (this.timeouts[timer.id]) {
                    tickFrom = this.now = timer.callAt;
                    try {
                      this.callTimer(timer);
                    } catch (e) {
                      firstException = firstException || e;
                    }
                }

                timer = this.firstTimerInRange(previous, tickTo);
                previous = tickFrom;
            }

            this.now = tickTo;

            if (firstException) {
              throw firstException;
            }

            return this.now;
        },

        firstTimerInRange: function (from, to) {
            var timer, smallest = null, originalTimer;

            for (var id in this.timeouts) {
                if (this.timeouts.hasOwnProperty(id)) {
                    if (this.timeouts[id].callAt < from || this.timeouts[id].callAt > to) {
                        continue;
                    }

                    if (smallest === null || this.timeouts[id].callAt < smallest) {
                        originalTimer = this.timeouts[id];
                        smallest = this.timeouts[id].callAt;

                        timer = {
                            func: this.timeouts[id].func,
                            callAt: this.timeouts[id].callAt,
                            interval: this.timeouts[id].interval,
                            id: this.timeouts[id].id,
                            invokeArgs: this.timeouts[id].invokeArgs
                        };
                    }
                }
            }

            return timer || null;
        },

        callTimer: function (timer) {
            if (typeof timer.interval == "number") {
                this.timeouts[timer.id].callAt += timer.interval;
            } else {
                delete this.timeouts[timer.id];
            }

            try {
                if (typeof timer.func == "function") {
                    timer.func.apply(null, timer.invokeArgs);
                } else {
                    eval(timer.func);
                }
            } catch (e) {
              var exception = e;
            }

            if (!this.timeouts[timer.id]) {
                if (exception) {
                  throw exception;
                }
                return;
            }

            if (exception) {
              throw exception;
            }
        },

        reset: function reset() {
            this.timeouts = {};
        },

        Date: (function () {
            var NativeDate = Date;

            function ClockDate(year, month, date, hour, minute, second, ms) {
                // Defensive and verbose to avoid potential harm in passing
                // explicit undefined when user does not pass argument
                switch (arguments.length) {
                case 0:
                    return new NativeDate(ClockDate.clock.now);
                case 1:
                    return new NativeDate(year);
                case 2:
                    return new NativeDate(year, month);
                case 3:
                    return new NativeDate(year, month, date);
                case 4:
                    return new NativeDate(year, month, date, hour);
                case 5:
                    return new NativeDate(year, month, date, hour, minute);
                case 6:
                    return new NativeDate(year, month, date, hour, minute, second);
                default:
                    return new NativeDate(year, month, date, hour, minute, second, ms);
                }
            }

            return mirrorDateProperties(ClockDate, NativeDate);
        }())
    };

    function mirrorDateProperties(target, source) {
        if (source.now) {
            target.now = function now() {
                return target.clock.now;
            };
        } else {
            delete target.now;
        }

        if (source.toSource) {
            target.toSource = function toSource() {
                return source.toSource();
            };
        } else {
            delete target.toSource;
        }

        target.toString = function toString() {
            return source.toString();
        };

        target.prototype = source.prototype;
        target.parse = source.parse;
        target.UTC = source.UTC;
        target.prototype.toUTCString = source.prototype.toUTCString;

        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                target[prop] = source[prop];
            }
        }

        return target;
    }

    var methods = ["Date", "setTimeout", "setInterval",
                   "clearTimeout", "clearInterval"];

    if (typeof global.setImmediate !== "undefined") {
        methods.push("setImmediate");
    }

    if (typeof global.clearImmediate !== "undefined") {
        methods.push("clearImmediate");
    }

    function restore() {
        var method;

        for (var i = 0, l = this.methods.length; i < l; i++) {
            method = this.methods[i];

            if (global[method].hadOwnProperty) {
                global[method] = this["_" + method];
            } else {
                try {
                    delete global[method];
                } catch (e) {}
            }
        }

        // Prevent multiple executions which will completely remove these props
        this.methods = [];
    }

    function stubGlobal(method, clock) {
        clock[method].hadOwnProperty = Object.prototype.hasOwnProperty.call(global, method);
        clock["_" + method] = global[method];

        if (method == "Date") {
            var date = mirrorDateProperties(clock[method], global[method]);
            global[method] = date;
        } else {
            global[method] = function () {
                return clock[method].apply(clock, arguments);
            };

            for (var prop in clock[method]) {
                if (clock[method].hasOwnProperty(prop)) {
                    global[method][prop] = clock[method][prop];
                }
            }
        }

        global[method].clock = clock;
    }

    sinon.useFakeTimers = function useFakeTimers(now) {
        var clock = sinon.clock.create(now);
        clock.restore = restore;
        clock.methods = Array.prototype.slice.call(arguments,
                                                   typeof now == "number" ? 1 : 0);

        if (clock.methods.length === 0) {
            clock.methods = methods;
        }

        for (var i = 0, l = clock.methods.length; i < l; i++) {
            stubGlobal(clock.methods[i], clock);
        }

        return clock;
    };
}(typeof global != "undefined" && typeof global !== "function" ? global : this));

sinon.timers = {
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setImmediate: (typeof setImmediate !== "undefined" ? setImmediate : undefined),
    clearImmediate: (typeof clearImmediate !== "undefined" ? clearImmediate: undefined),
    setInterval: setInterval,
    clearInterval: clearInterval,
    Date: Date
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = sinon;
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],91:[function(require,module,exports){
(function (global){
((typeof define === "function" && define.amd && function (m) {
    define("formatio", ["samsam"], m);
}) || (typeof module === "object" && function (m) {
    module.exports = m(require("samsam"));
}) || function (m) { this.formatio = m(this.samsam); }
)(function (samsam) {
    "use strict";

    var formatio = {
        excludeConstructors: ["Object", /^.$/],
        quoteStrings: true
    };

    var hasOwn = Object.prototype.hasOwnProperty;

    var specialObjects = [];
    if (typeof global !== "undefined") {
        specialObjects.push({ object: global, value: "[object global]" });
    }
    if (typeof document !== "undefined") {
        specialObjects.push({
            object: document,
            value: "[object HTMLDocument]"
        });
    }
    if (typeof window !== "undefined") {
        specialObjects.push({ object: window, value: "[object Window]" });
    }

    function functionName(func) {
        if (!func) { return ""; }
        if (func.displayName) { return func.displayName; }
        if (func.name) { return func.name; }
        var matches = func.toString().match(/function\s+([^\(]+)/m);
        return (matches && matches[1]) || "";
    }

    function constructorName(f, object) {
        var name = functionName(object && object.constructor);
        var excludes = f.excludeConstructors ||
                formatio.excludeConstructors || [];

        var i, l;
        for (i = 0, l = excludes.length; i < l; ++i) {
            if (typeof excludes[i] === "string" && excludes[i] === name) {
                return "";
            } else if (excludes[i].test && excludes[i].test(name)) {
                return "";
            }
        }

        return name;
    }

    function isCircular(object, objects) {
        if (typeof object !== "object") { return false; }
        var i, l;
        for (i = 0, l = objects.length; i < l; ++i) {
            if (objects[i] === object) { return true; }
        }
        return false;
    }

    function ascii(f, object, processed, indent) {
        if (typeof object === "string") {
            var qs = f.quoteStrings;
            var quote = typeof qs !== "boolean" || qs;
            return processed || quote ? '"' + object + '"' : object;
        }

        if (typeof object === "function" && !(object instanceof RegExp)) {
            return ascii.func(object);
        }

        processed = processed || [];

        if (isCircular(object, processed)) { return "[Circular]"; }

        if (Object.prototype.toString.call(object) === "[object Array]") {
            return ascii.array.call(f, object, processed);
        }

        if (!object) { return String((1/object) === -Infinity ? "-0" : object); }
        if (samsam.isElement(object)) { return ascii.element(object); }

        if (typeof object.toString === "function" &&
                object.toString !== Object.prototype.toString) {
            return object.toString();
        }

        var i, l;
        for (i = 0, l = specialObjects.length; i < l; i++) {
            if (object === specialObjects[i].object) {
                return specialObjects[i].value;
            }
        }

        return ascii.object.call(f, object, processed, indent);
    }

    ascii.func = function (func) {
        return "function " + functionName(func) + "() {}";
    };

    ascii.array = function (array, processed) {
        processed = processed || [];
        processed.push(array);
        var i, l, pieces = [];
        for (i = 0, l = array.length; i < l; ++i) {
            pieces.push(ascii(this, array[i], processed));
        }
        return "[" + pieces.join(", ") + "]";
    };

    ascii.object = function (object, processed, indent) {
        processed = processed || [];
        processed.push(object);
        indent = indent || 0;
        var pieces = [], properties = samsam.keys(object).sort();
        var length = 3;
        var prop, str, obj, i, l;

        for (i = 0, l = properties.length; i < l; ++i) {
            prop = properties[i];
            obj = object[prop];

            if (isCircular(obj, processed)) {
                str = "[Circular]";
            } else {
                str = ascii(this, obj, processed, indent + 2);
            }

            str = (/\s/.test(prop) ? '"' + prop + '"' : prop) + ": " + str;
            length += str.length;
            pieces.push(str);
        }

        var cons = constructorName(this, object);
        var prefix = cons ? "[" + cons + "] " : "";
        var is = "";
        for (i = 0, l = indent; i < l; ++i) { is += " "; }

        if (length + indent > 80) {
            return prefix + "{\n  " + is + pieces.join(",\n  " + is) + "\n" +
                is + "}";
        }
        return prefix + "{ " + pieces.join(", ") + " }";
    };

    ascii.element = function (element) {
        var tagName = element.tagName.toLowerCase();
        var attrs = element.attributes, attr, pairs = [], attrName, i, l, val;

        for (i = 0, l = attrs.length; i < l; ++i) {
            attr = attrs.item(i);
            attrName = attr.nodeName.toLowerCase().replace("html:", "");
            val = attr.nodeValue;
            if (attrName !== "contenteditable" || val !== "inherit") {
                if (!!val) { pairs.push(attrName + "=\"" + val + "\""); }
            }
        }

        var formatted = "<" + tagName + (pairs.length > 0 ? " " : "");
        var content = element.innerHTML;

        if (content.length > 20) {
            content = content.substr(0, 20) + "[...]";
        }

        var res = formatted + pairs.join(" ") + ">" + content +
                "</" + tagName + ">";

        return res.replace(/ contentEditable="inherit"/, "");
    };

    function Formatio(options) {
        for (var opt in options) {
            this[opt] = options[opt];
        }
    }

    Formatio.prototype = {
        functionName: functionName,

        configure: function (options) {
            return new Formatio(options);
        },

        constructorName: function (object) {
            return constructorName(this, object);
        },

        ascii: function (object, processed, indent) {
            return ascii(this, object, processed, indent);
        }
    };

    return Formatio.prototype;
});

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"samsam":92}],92:[function(require,module,exports){
((typeof define === "function" && define.amd && function (m) { define("samsam", m); }) ||
 (typeof module === "object" &&
      function (m) { module.exports = m(); }) || // Node
 function (m) { this.samsam = m(); } // Browser globals
)(function () {
    var o = Object.prototype;
    var div = typeof document !== "undefined" && document.createElement("div");

    function isNaN(value) {
        // Unlike global isNaN, this avoids type coercion
        // typeof check avoids IE host object issues, hat tip to
        // lodash
        var val = value; // JsLint thinks value !== value is "weird"
        return typeof value === "number" && value !== val;
    }

    function getClass(value) {
        // Returns the internal [[Class]] by calling Object.prototype.toString
        // with the provided value as this. Return value is a string, naming the
        // internal class, e.g. "Array"
        return o.toString.call(value).split(/[ \]]/)[1];
    }

    /**
     * @name samsam.isArguments
     * @param Object object
     *
     * Returns ``true`` if ``object`` is an ``arguments`` object,
     * ``false`` otherwise.
     */
    function isArguments(object) {
        if (getClass(object) === 'Arguments') { return true; }
        if (typeof object !== "object" || typeof object.length !== "number" ||
                getClass(object) === "Array") {
            return false;
        }
        if (typeof object.callee == "function") { return true; }
        try {
            object[object.length] = 6;
            delete object[object.length];
        } catch (e) {
            return true;
        }
        return false;
    }

    /**
     * @name samsam.isElement
     * @param Object object
     *
     * Returns ``true`` if ``object`` is a DOM element node. Unlike
     * Underscore.js/lodash, this function will return ``false`` if ``object``
     * is an *element-like* object, i.e. a regular object with a ``nodeType``
     * property that holds the value ``1``.
     */
    function isElement(object) {
        if (!object || object.nodeType !== 1 || !div) { return false; }
        try {
            object.appendChild(div);
            object.removeChild(div);
        } catch (e) {
            return false;
        }
        return true;
    }

    /**
     * @name samsam.keys
     * @param Object object
     *
     * Return an array of own property names.
     */
    function keys(object) {
        var ks = [], prop;
        for (prop in object) {
            if (o.hasOwnProperty.call(object, prop)) { ks.push(prop); }
        }
        return ks;
    }

    /**
     * @name samsam.isDate
     * @param Object value
     *
     * Returns true if the object is a ``Date``, or *date-like*. Duck typing
     * of date objects work by checking that the object has a ``getTime``
     * function whose return value equals the return value from the object's
     * ``valueOf``.
     */
    function isDate(value) {
        return typeof value.getTime == "function" &&
            value.getTime() == value.valueOf();
    }

    /**
     * @name samsam.isNegZero
     * @param Object value
     *
     * Returns ``true`` if ``value`` is ``-0``.
     */
    function isNegZero(value) {
        return value === 0 && 1 / value === -Infinity;
    }

    /**
     * @name samsam.equal
     * @param Object obj1
     * @param Object obj2
     *
     * Returns ``true`` if two objects are strictly equal. Compared to
     * ``===`` there are two exceptions:
     *
     *   - NaN is considered equal to NaN
     *   - -0 and +0 are not considered equal
     */
    function identical(obj1, obj2) {
        if (obj1 === obj2 || (isNaN(obj1) && isNaN(obj2))) {
            return obj1 !== 0 || isNegZero(obj1) === isNegZero(obj2);
        }
    }


    /**
     * @name samsam.deepEqual
     * @param Object obj1
     * @param Object obj2
     *
     * Deep equal comparison. Two values are "deep equal" if:
     *
     *   - They are equal, according to samsam.identical
     *   - They are both date objects representing the same time
     *   - They are both arrays containing elements that are all deepEqual
     *   - They are objects with the same set of properties, and each property
     *     in ``obj1`` is deepEqual to the corresponding property in ``obj2``
     *
     * Supports cyclic objects.
     */
    function deepEqualCyclic(obj1, obj2) {

        // used for cyclic comparison
        // contain already visited objects
        var objects1 = [],
            objects2 = [],
        // contain pathes (position in the object structure)
        // of the already visited objects
        // indexes same as in objects arrays
            paths1 = [],
            paths2 = [],
        // contains combinations of already compared objects
        // in the manner: { "$1['ref']$2['ref']": true }
            compared = {};

        /**
         * used to check, if the value of a property is an object
         * (cyclic logic is only needed for objects)
         * only needed for cyclic logic
         */
        function isObject(value) {

            if (typeof value === 'object' && value !== null &&
                    !(value instanceof Boolean) &&
                    !(value instanceof Date)    &&
                    !(value instanceof Number)  &&
                    !(value instanceof RegExp)  &&
                    !(value instanceof String)) {

                return true;
            }

            return false;
        }

        /**
         * returns the index of the given object in the
         * given objects array, -1 if not contained
         * only needed for cyclic logic
         */
        function getIndex(objects, obj) {

            var i;
            for (i = 0; i < objects.length; i++) {
                if (objects[i] === obj) {
                    return i;
                }
            }

            return -1;
        }

        // does the recursion for the deep equal check
        return (function deepEqual(obj1, obj2, path1, path2) {
            var type1 = typeof obj1;
            var type2 = typeof obj2;

            // == null also matches undefined
            if (obj1 === obj2 ||
                    isNaN(obj1) || isNaN(obj2) ||
                    obj1 == null || obj2 == null ||
                    type1 !== "object" || type2 !== "object") {

                return identical(obj1, obj2);
            }

            // Elements are only equal if identical(expected, actual)
            if (isElement(obj1) || isElement(obj2)) { return false; }

            var isDate1 = isDate(obj1), isDate2 = isDate(obj2);
            if (isDate1 || isDate2) {
                if (!isDate1 || !isDate2 || obj1.getTime() !== obj2.getTime()) {
                    return false;
                }
            }

            if (obj1 instanceof RegExp && obj2 instanceof RegExp) {
                if (obj1.toString() !== obj2.toString()) { return false; }
            }

            var class1 = getClass(obj1);
            var class2 = getClass(obj2);
            var keys1 = keys(obj1);
            var keys2 = keys(obj2);

            if (isArguments(obj1) || isArguments(obj2)) {
                if (obj1.length !== obj2.length) { return false; }
            } else {
                if (type1 !== type2 || class1 !== class2 ||
                        keys1.length !== keys2.length) {
                    return false;
                }
            }

            var key, i, l,
                // following vars are used for the cyclic logic
                value1, value2,
                isObject1, isObject2,
                index1, index2,
                newPath1, newPath2;

            for (i = 0, l = keys1.length; i < l; i++) {
                key = keys1[i];
                if (!o.hasOwnProperty.call(obj2, key)) {
                    return false;
                }

                // Start of the cyclic logic

                value1 = obj1[key];
                value2 = obj2[key];

                isObject1 = isObject(value1);
                isObject2 = isObject(value2);

                // determine, if the objects were already visited
                // (it's faster to check for isObject first, than to
                // get -1 from getIndex for non objects)
                index1 = isObject1 ? getIndex(objects1, value1) : -1;
                index2 = isObject2 ? getIndex(objects2, value2) : -1;

                // determine the new pathes of the objects
                // - for non cyclic objects the current path will be extended
                //   by current property name
                // - for cyclic objects the stored path is taken
                newPath1 = index1 !== -1
                    ? paths1[index1]
                    : path1 + '[' + JSON.stringify(key) + ']';
                newPath2 = index2 !== -1
                    ? paths2[index2]
                    : path2 + '[' + JSON.stringify(key) + ']';

                // stop recursion if current objects are already compared
                if (compared[newPath1 + newPath2]) {
                    return true;
                }

                // remember the current objects and their pathes
                if (index1 === -1 && isObject1) {
                    objects1.push(value1);
                    paths1.push(newPath1);
                }
                if (index2 === -1 && isObject2) {
                    objects2.push(value2);
                    paths2.push(newPath2);
                }

                // remember that the current objects are already compared
                if (isObject1 && isObject2) {
                    compared[newPath1 + newPath2] = true;
                }

                // End of cyclic logic

                // neither value1 nor value2 is a cycle
                // continue with next level
                if (!deepEqual(value1, value2, newPath1, newPath2)) {
                    return false;
                }
            }

            return true;

        }(obj1, obj2, '$1', '$2'));
    }

    var match;

    function arrayContains(array, subset) {
        if (subset.length === 0) { return true; }
        var i, l, j, k;
        for (i = 0, l = array.length; i < l; ++i) {
            if (match(array[i], subset[0])) {
                for (j = 0, k = subset.length; j < k; ++j) {
                    if (!match(array[i + j], subset[j])) { return false; }
                }
                return true;
            }
        }
        return false;
    }

    /**
     * @name samsam.match
     * @param Object object
     * @param Object matcher
     *
     * Compare arbitrary value ``object`` with matcher.
     */
    match = function match(object, matcher) {
        if (matcher && typeof matcher.test === "function") {
            return matcher.test(object);
        }

        if (typeof matcher === "function") {
            return matcher(object) === true;
        }

        if (typeof matcher === "string") {
            matcher = matcher.toLowerCase();
            var notNull = typeof object === "string" || !!object;
            return notNull &&
                (String(object)).toLowerCase().indexOf(matcher) >= 0;
        }

        if (typeof matcher === "number") {
            return matcher === object;
        }

        if (typeof matcher === "boolean") {
            return matcher === object;
        }

        if (getClass(object) === "Array" && getClass(matcher) === "Array") {
            return arrayContains(object, matcher);
        }

        if (matcher && typeof matcher === "object") {
            var prop;
            for (prop in matcher) {
                var value = object[prop];
                if (typeof value === "undefined" &&
                        typeof object.getAttribute === "function") {
                    value = object.getAttribute(prop);
                }
                if (typeof value === "undefined" || !match(value, matcher[prop])) {
                    return false;
                }
            }
            return true;
        }

        throw new Error("Matcher was not a string, a number, a " +
                        "function, a boolean or an object");
    };

    return {
        isArguments: isArguments,
        isElement: isElement,
        isDate: isDate,
        isNegZero: isNegZero,
        identical: identical,
        deepEqual: deepEqualCyclic,
        match: match,
        keys: keys
    };
});

},{}],93:[function(require,module,exports){
"use strict";
var Selection = require('../../assets/js/ue/selection');
var KeyboardBindings = require('../../assets/js/ue/KeyboardBindings');
var FakeNode = require('./FakeNode');
var sinon = require('sinon');


var CrossSegmentSelectionObjectMother = function () {
  this.keyboardBindings = new KeyboardBindings('fake target');
};

var proto = CrossSegmentSelectionObjectMother.prototype;

proto.setupSelectionContextToHaveCommonAncestor = function (className) {
  var me = this;
  me.store = Selection.SelectionContext;
  me.stub = sinon.createStubInstance(Selection.SelectionContext);

  me.stub.commonAncestorContainer = new FakeNode().withClass(className);
  me.stub.hasCommonAncestorClass.restore();

  Selection.SelectionContext = function () {
    return me.stub;
  };
};

proto.resetSelectionContext = function () {
  var me = this;
  Selection.SelectionContext = me.store;
};

module.exports = CrossSegmentSelectionObjectMother;

},{"../../assets/js/ue/KeyboardBindings":7,"../../assets/js/ue/selection":34,"./FakeNode":96,"sinon":78}],94:[function(require,module,exports){
/* File: DataProviderObjectMother.js */
/* jshint undef: true, unused: true*/
'use strict';
var proto;
var DataProvider = require('../../assets/js/ue/DataProvider');

function DataProviderObjectMother() {
}

proto = DataProviderObjectMother.prototype;

proto.hackInitialization = function (paragraphs, ueDocument) {
  DataProvider.initData(ueDocument.id, ueDocument);
  DataProvider.mapSkeletonData(ueDocument.skeletons[0]);
};

module.exports = DataProviderObjectMother;

},{"../../assets/js/ue/DataProvider":3}],95:[function(require,module,exports){
/* File: FakeEvent.js */
/* jshint undef: true, unused: true */
'use strict';

function FakeEvent() {
  this.keyCode = -1;
  this.ctrlKey = false;
  this.shiftKey = false;
  this.type = '';
  this.which = undefined;

  this.hasPreventedDefault = false;
  this.hasStoppedPropagation = false;
}

FakeEvent.prototype.setKeyCode = function (value) {
  var me = this;

  me.keyCode = value;
};

FakeEvent.prototype.setShiftKey = function (value) {
  var me = this;

  me.shiftKey = value;
};

FakeEvent.prototype.setCtrlKey = function (value) {
  var me = this;

  me.ctrlKey = value;
};

FakeEvent.prototype.setType = function (value) {
  this.type = value;
};

FakeEvent.prototype.setCurrentTarget = function (target) {
  this.currentTarget = target;
};

FakeEvent.prototype.preventDefault = function () {
  var me = this;

  me.hasPreventedDefault = true;
};

FakeEvent.prototype.stopPropagation = function () {
  var me = this;

  me.hasStoppedPropagation = true;
};

FakeEvent.prototype.setLeftButtonPressed = function () {
  this.which = 1;
}

module.exports = FakeEvent;

},{}],96:[function(require,module,exports){
function FakeNode(){
  this.nodeType = -1;
  this.parentNode = null;

  this.firstChild = null;
  this.nextSibling = null;
  this.previousSibling = null;
  this.childNodes = [];

  this.classList = {
    contents: [],
    contains:function(className){
      return this.contents.indexOf(className) > -1;
    }
  };

  this.dataset = {};
}

FakeNode.prototype.textNode = function(){
  this.nodeType = 3;
  return this;
};

FakeNode.prototype.withClass = function(className){
  this.classList.contents.push(className);

  return this;
};

module.exports = FakeNode;


},{}],97:[function(require,module,exports){
var sinon = require('sinon');
var FakeNode = require('./FakeNode');

function FakeRange(){
  this.collapsed = false;
  this.commonAncestorContainer = new FakeNode();
  this.endContainer = new FakeNode();
  this.endOffset = 36;
  this.startContainer = new FakeNode();
  this.startOffset = 33;
}

FakeRange.prototype.cloneContents = sinon.stub();
FakeRange.prototype.deleteContents = sinon.spy();
FakeRange.prototype.insertNode = sinon.spy();

module.exports = FakeRange;
},{"./FakeNode":96,"sinon":78}],98:[function(require,module,exports){
var FakeNode = require('./FakeNode');
function FakeSelection(){
  this.anchorNode = new FakeNode();
  this.anchorOffset = 0;
  this.focusNode = new FakeNode();
  this.focusOffset = 0;
  this.isCollapsed = true;
  this.rangeCount = 0;

  this.ranges = {};
}

FakeSelection.prototype.getRangeAt = function(index){
  return this.ranges[index];
};

FakeSelection.prototype.setRangeAt = function(index, range){
  this.ranges[index] = range;
};

module.exports = FakeSelection;


},{"./FakeNode":96}],99:[function(require,module,exports){
var Helpers = require('../../assets/js/ue/Helpers');
var proto;

var HandleClearTagsFixtures = function () {
};

proto = HandleClearTagsFixtures.prototype;

proto.tagPairSample = function () {
  var result;
  result = Helpers.stringToHTMLElement('<div class="ue-inline-content">' +
    '<span class="ue-text">text</span>' +
    '<div class="ue-tag-wrapper" data-id="1" data-can-hide="true" data-type="start-tag">' +
    '<span class="ue-tag ue-tag-start">cf</span>&zwnj;' +
    '</div>' +
    '<div class="ue-inline-content ue-tagpair-content" data-id="1">' +
    '<span class="ue-text">inner content</span>' +
    '</div>' +
    '<div class="ue-tag-wrapper" data-id="1" data-can-hide="true" data-type="end-tag">' +
    '<span class="ue-tag ue-tag-end">cf</span>&zwnj;' +
    '</div>' +
    '<span class="ue-text">at end.</span>' +
    '</div>');

  return result;
};

module.exports = HandleClearTagsFixtures;

},{"../../assets/js/ue/Helpers":5}],100:[function(require,module,exports){
"use strict";
var Helpers = require('../../assets/js/ue/Helpers');
var KeyboardBindings = require('../../assets/js/ue/KeyboardBindings');
var sinon = require('sinon');

var KeyboardBindingsObjectMother = function KeyboardBindingsObjectMother () {
  this.kb = new KeyboardBindings();
};

var proto = KeyboardBindingsObjectMother.prototype;
proto.assignTagsContainer = function () {
  this.kb.tags = {};
  this.kb.moveTagsToFront = [];
  this.kb.moveTagsToEnd = [];
};

proto.deleteTagsContainer = function () {
  delete this.kb.tags;
  delete this.moveTagsToFront;
  delete this.moveTagsToEnd;
};

proto.hasCollectedTag = function (tagId) {
  return this.kb.tags.hasOwnProperty(tagId);
};

proto.getTag = function (tagId) {
  return this.kb.tags[tagId];
};

proto.setupSimpleContainer = function () {
  var result = Helpers.stringToHTMLElement('<div class="ue-inline-content">' +
    '<span class="ue-text">Some basic text here</span>' +
    '<span class="ue-text">end text</span>' +
    '</div>');

  return result;
};

proto.singleStartTagSample = function () {
  var result;
  result = Helpers.stringToHTMLElement('<div class="ue-inline-content">' +
    '<span class="ue-text">text</span>' +
    '<div class="ue-tag-wrapper" data-id="1" data-can-hide="true" data-type="start-tag">' +
    '<span class="ue-tag ue-tag-start">cf</span>&zwnj;' +
    '</div>' +
    '<div class="ue-inline-content ue-tagpair-content" data-id="1">' +
    '<span class="ue-text">inner content</span>' +
    '</div>' +
    '</div>');

  return result;
};

proto.singleEndTagSample = function () {
  var result;
  result = Helpers.stringToHTMLElement('<div class="ue-inline-content">' +
    '<div class="ue-tag-wrapper" data-id="1" data-can-hide="true" data-type="start-tag">' +
    '<span class="ue-tag ue-tag-start">cf</span>&zwnj;' +
    '</div>' +
    '<div class="ue-inline-content ue-tagpair-content">' +
    '<span class="ue-text">inner content</span>' +
    '</div>' +
    '<div class="ue-tag-wrapper" data-id="1" data-can-hide="true" data-type="end-tag">' +
    '<span class="ue-tag ue-tag-end">cf</span>&zwnj;' +
    '</div>' +
    '<span class="ue-text">text content</span>' +
    '</div>');

  return result;
};

proto.stubRemoveInline = function () {
  sinon.stub(this.kb, '_removeInline');
};

proto.resetRemoveInlineStub = function () {
  this.kb._removeInline.reset();
};
module.exports = KeyboardBindingsObjectMother;
},{"../../assets/js/ue/Helpers":5,"../../assets/js/ue/KeyboardBindings":7,"sinon":78}],101:[function(require,module,exports){
/* File: SegmentCleanupFixture.js */
'use strict';
var h = require('../../assets/js/ue/Helpers').stringToHTMLElement;
var proto;

function SegmentCleanupFixture() {
}

proto = SegmentCleanupFixture.prototype;

proto.contentBeforeInlineContent = function () {
  return h('<div class="ue-segment ue-row-active" data-segment-number="16" data-puid="deaf7b2d-f332-45f9-97f5-4e90e164837a" style="height: 27px;">' +
      'outside content<div class="ue-inline-content"></div>' +
    '</div>');
};

proto.segmentWithNoInlineContent = function () {
  return h('<div class="ue-segment ue-row-active" data-segment-number="16" data-puid="deaf7b2d-f332-45f9-97f5-4e90e164837a" style="height: 27px;">' +
    '</div>');
};

proto.contentAfterInlineContent = function () {

  return h('<div class="ue-segment ue-row-active" data-segment-number="16" data-puid="deaf7b2d-f332-45f9-97f5-4e90e164837a" style="height: 27px;">' +
    '<div class="ue-inline-content"></div> content outside' +
    '</div>');
};

proto.placeholderInsideText = function () {
  return h('<div class="ue-segment ue-row-active" data-segment-number="8" data-puid="94220b60-8ff9-46fe-b1a7-050770918d87" style="height: 27px;">' +
  '<div class="ue-inline-content">‌' +
    '<span class="ue-text" data-type="text">not<span class="ue-tag-wrapper" data-type="placeholder" data-id="44" data-definitionid="10" data-metadata="11344047-5376878-5467698" data-tag-copy="false"><span class="ue-tag" contenteditable="false" data-display-content="x"></span>‌</span> empty</span>' +
  '</div></div>');
};

module.exports = SegmentCleanupFixture;
},{"../../assets/js/ue/Helpers":5}],102:[function(require,module,exports){
var KeyboardBindings = require('../../assets/js/ue/KeyboardBindings');
var FakeRange = require('./FakeRange');
var FakeNode = require('./FakeNode');
var FakeSelection = require('./FakeSelection');

var Selection = require('../../assets/js/ue/selection');
var Helpers = require('../../assets/js/ue/Helpers');

var sinon = require('sinon');

var fakeTarget = 'anything';

var SelectionContextObjectMother = function () {
  this.keyboardBindings = new KeyboardBindings(fakeTarget);
  this.fakeRange = new FakeRange();
  this.fakeSelection = new FakeSelection();

  this.fakeSelection.setRangeAt(0, this.fakeRange);
};

var proto = SelectionContextObjectMother.prototype;

proto.stubSelection = function () {
  var me = this;
  sinon.stub(document, 'getSelection', function () {
    return me.fakeSelection;
  });
};

proto.restoreSelection = function () {
  document.getSelection.restore();
};

proto.defineFocusNodeParent = function () {
  this.fakeSelection.focusNode.parentNode = new FakeNode();
};

proto.assignTextNodes = function () {
  this.fakeSelection.focusNode.textNode();
  this.fakeRange.startContainer.textNode();
  this.fakeRange.endContainer.textNode();
};

proto.setRangeCollapsed = function (state) {
  this.fakeRange.collapsed = state;
};

proto.setupEmptyCloneContents = function () {
  var me = this;

  me.fakeCloneContents = new FakeNode();

  me.fakeRange.cloneContents.returns(
    me.fakeCloneContents);
};

/**
 * setCrossSegmentSelectionTo sets the return value to @param value
 * @param value - the return value of the function
 * when value is null or undefined the original method is restored
 */
proto.setCrossSegmentSelectionTo = function (value) {
  var me = this;

  sinon.stub(me.keyboardBindings, 'isCrossSegmentSelection').
    returns(value);
  me.stubSelectionContext();
};

proto.resetCrossSegmentSelection = function () {
  var me = this;

  me.keyboardBindings.isCrossSegmentSelection.restore();
  me.restoreSelectionContext();
};

proto.setCollapsedSelection = function () {
  var me = this;
  me.stubSelectionContext();
  me.stubSelectionContext.isCollapsed.returns(true);
};

proto.setupSameContainerForSelection = function () {
  var me = this,
      fakeContainer;
  fakeContainer = document.createDocumentFragment();
  me.stubSelectionContext();

  me.stubSelectionContext.startContainer = me.stubSelectionContext.endContainer = fakeContainer;
  me.stubSelectionContext.commonAncestorContainer = fakeContainer;
};

proto.setupSimpleAncestorStartContainer = function () {
  var me = this,
      fakeContainer,
      startTextContainer,
      startTextNode;

  me.stubSelectionContext();

  fakeContainer = Helpers.stringToHTMLElement("<div class='ue-inline-content'>" +
    "<span class='ue-text'>start container is text node</span>" +
    "</div>");
  startTextContainer = fakeContainer.firstChild;
  startTextNode = startTextContainer.firstChild;

  me.stubSelectionContext.commonAncestorContainer = fakeContainer;
  me.stubSelectionContext.startContainer = startTextNode;
  me.stubSelectionContext.startOffset = 0;
  me.stubSelectionContext.endContainer = null;

  me.stubSelectionContext.cloneContents.returns(document.createDocumentFragment());
};

proto.commonAncestorToText = function () {
  var me = this;
  return me.stubSelectionContext.commonAncestorContainer.outerHTML;
};

proto.stubSelectionContext = function () {
  var me = this;

  me.originalSelectionContext = Selection.SelectionContext;
  me.stubSelectionContext = sinon.createStubInstance(Selection.SelectionContext);

  Selection.SelectionContext = function () {
    return me.stubSelectionContext;
  };

  return me.stubSelectionContext;
};

proto.restoreSelectionContext = function () {
  Selection.SelectionContext = this.originalSelectionContext;
};


proto.spyKeyboardBindingsMethod = function (method) {
  var me = this,
      keyboardBindings = me.keyboardBindings;

  sinon.spy(keyboardBindings, method);
};

proto.restoreKeyboardBindingsMethod = function (method) {
  var me = this,
      keyboardBindings = me.keyboardBindings;

  keyboardBindings[method].restore();
};

proto.keyboardBindingsSpy = function (method) {
  var me = this,
      keyboardBindings = me.keyboardBindings;

  return keyboardBindings[method];
};

proto.attachMoveTagsToEndStub = function () {
  var me = this,
      kb = me.keyboardBindings,
      transformTagsOriginalMethod = kb.transformTags;
  me.nodeWalkerStub = sinon.createStubInstance(Selection.NodeWalker);

  kb.transformTags = function () {
    kb.moveTagsToEnd = [me.nodeWalkerStub];
    kb.transformTags = transformTagsOriginalMethod;
  };
};

proto.attachMoveTagsToFrontStub = function () {
  var me = this,
      kb = me.keyboardBindings,
      transformTagsOriginalMethod = kb.transformTags;
  me.nodeWalkerStub = sinon.createStubInstance(Selection.NodeWalker);

  kb.transformTags = function () {
    kb.moveTagsToFront = [me.nodeWalkerStub];
    kb.transformTags = transformTagsOriginalMethod;
  };
};
module.exports = SelectionContextObjectMother;

},{"../../assets/js/ue/Helpers":5,"../../assets/js/ue/KeyboardBindings":7,"../../assets/js/ue/selection":34,"./FakeNode":96,"./FakeRange":97,"./FakeSelection":98,"sinon":78}],103:[function(require,module,exports){
var Helpers = require('../../assets/js/ue/Helpers');
var proto;

var ShiftEnterHandlerFixture = function () {
};

proto = ShiftEnterHandlerFixture.prototype;

proto.segmentWithTextSample = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
    '&zwnj;' +
    '<div class="ue-inline-content">' +
    '<span class="ue-text">text</span>' +
    '</div>' +
    '</div>')
  return sample;
};

proto.breakAtSegmentStartSample = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment">' +
    '<br>' +
    '&zwnj;' +
    '<div class="ue-inline-content">' +
    '<span class="ue-text">text</span>' +
    '</div>' +
    '</div>')
  return sample;
};

proto.newLineInsideStartTagWrapperSample = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
      '&zwnj;' +
      '<div class="ue-inline-content">' +
      '<span class="ue-tag-wrapper" data-type="start-tag" data-tag-copy="true" data-id="28" data-metadata="15901602-6591740-7060381" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-start" contenteditable="false">cf</span>' +
      '\n' +
      '‌&zwnj;' +
      '</span>' +
      '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="28" data-definitionid="12" data-metadata="15901602-6591740-7060381" data-style="{&quot;FontName&quot;:&quot;Arial&quot;,&quot;FontSize&quot;:&quot;7&quot;,&quot;TextColor&quot;:&quot;0, 0, 112, 192&quot;}" style="font-family: Arial; font-size: 7px; color: rgb(0, 112, 192);">' +
      '<span class="ue-text" data-type="text">and </span>' +
      '</div>' +
      '</div>'
  );

  return sample;
};

proto.newLineInsideEndTagWrapperSample = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
      '&zwnj;' +
      '<div class="ue-inline-content">' +
      '<span class="ue-tag-wrapper" data-type="start-tag" data-tag-copy="true" data-id="28" data-metadata="15901602-6591740-7060381" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-start" contenteditable="false">cf</span>' +
      '‌&zwnj;' +
      '</span>' +
      '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="28" data-definitionid="12" data-metadata="15901602-6591740-7060381" data-style="{&quot;FontName&quot;:&quot;Arial&quot;,&quot;FontSize&quot;:&quot;7&quot;,&quot;TextColor&quot;:&quot;0, 0, 112, 192&quot;}" style="font-family: Arial; font-size: 7px; color: rgb(0, 112, 192);">' +
      '<span class="ue-text" data-type="text">and </span>' +
      '</div>' +
      '<span class="ue-tag-wrapper" data-type="end-tag" data-tag-copy="true" data-id="28" data-metadata="14382281-7833779-4176112" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-end" contenteditable="false">cf</span>‌' +
      '\n' +
      '</span>' +
      '</div>'
  );

  return sample;
};

proto.newLinesInsideTextContainer = function () {
  var sample,
      inlineContent,
      textContainer;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
      '&zwnj;' +
      '<div class="ue-inline-content">' +
      '<span class="ue-text" data-type="text"></span>' +
      '</div>'
  );

  inlineContent = sample.childNodes[1];
  textContainer = inlineContent.firstChild;

  var start = document.createTextNode('It has survived not only five centuries'),
      middle = document.createTextNode('\n'),
      end = document.createTextNode(', but also the leap into electronic typesetting.');

  textContainer.appendChild(start);
  textContainer.appendChild(middle);
  textContainer.appendChild(end);

  return sample;
};

proto.startTagWithBreak = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
      '&zwnj;' +
      '<div class="ue-inline-content">' +
      '<span class="ue-tag-wrapper" data-type="start-tag" data-tag-copy="true" data-id="28" data-metadata="15901602-6591740-7060381" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-start" contenteditable="false">cf</span>' +

      '<br>' +

      '‌&zwnj;' +
      '</span>' +
      '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="28" data-definitionid="12" data-metadata="15901602-6591740-7060381" data-style="{&quot;FontName&quot;:&quot;Arial&quot;,&quot;FontSize&quot;:&quot;7&quot;,&quot;TextColor&quot;:&quot;0, 0, 112, 192&quot;}" style="font-family: Arial; font-size: 7px; color: rgb(0, 112, 192);">' +
      '<span class="ue-text" data-type="text">and </span>' +
      '</div>' +
      '<span class="ue-tag-wrapper" data-type="end-tag" data-tag-copy="true" data-id="28" data-metadata="14382281-7833779-4176112" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-end" contenteditable="false">cf</span>‌' +
      '‌&zwnj;' +
      '</span>' +
      '</div>' +
      '</div>'
  );
  return sample;
};

proto.endTagWithBreak = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
      '&zwnj;' +
      '<div class="ue-inline-content">' +
      '<span class="ue-tag-wrapper" data-type="start-tag" data-tag-copy="true" data-id="28" data-metadata="15901602-6591740-7060381" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-start" contenteditable="false">cf</span>' +
      '‌&zwnj;' +
      '</span>' +
      '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="28" data-definitionid="12" data-metadata="15901602-6591740-7060381" data-style="{&quot;FontName&quot;:&quot;Arial&quot;,&quot;FontSize&quot;:&quot;7&quot;,&quot;TextColor&quot;:&quot;0, 0, 112, 192&quot;}" style="font-family: Arial; font-size: 7px; color: rgb(0, 112, 192);">' +
      '<span class="ue-text" data-type="text">and </span>' +
      '</div>' +
      '<span class="ue-tag-wrapper" data-type="end-tag" data-tag-copy="true" data-id="28" data-metadata="14382281-7833779-4176112" data-can-hide="true">' +
      '<span class="ue-tag ue-tag-end" contenteditable="false">cf</span>‌' +
      '‌&zwnj;' +

      '<br>' +

      '</span>' +
      '</div>' +
      '</div>'
  );

  return sample;
};

proto.emptySegment = function () {
  var sample;

  sample = Helpers.stringToHTMLElement('<div class="ue-segment" data-segment-number="1">' +
      '&zwnj;' +
      '<br>' +
      '<div class="ue-inline-content">' +
      '</div>'
  );

  return sample;
};

module.exports = ShiftEnterHandlerFixture;

},{"../../assets/js/ue/Helpers":5}],104:[function(require,module,exports){
/* File: SideBySideParagraphUnitsRendererFixture.js */
'use strict';
var proto;

function SideBySideParagraphUnitsRendererFixture() {
}
proto = SideBySideParagraphUnitsRendererFixture.prototype;

proto.defaultDocumentSample = function () {
  var ueDocument;

  ueDocument = {
    "data": {
      "files": [
        {
          "dependencyFiles": [
            {
              "fileName": "c:\\LocalFilesFps\\14b2a81db0884dbcacc1abf1c9d3d70f_WordWithFormatting.docx",
              "id": "inputfile",
              "location": "http://clujgwqa15:8080/gw-file-management-web/files/530b330684ae940a9ff276be/file?DOWNLOAD_TOKEN=Sp76WBzr1Xmi5WyadJO18w%3D%3D_1.0",
              "usage": "Generation"
            }
          ],
          "fileTypeDefinitionId": "Word 2007 v 2.0.0.0",
          "id": "4473d21495d446c5b0d22908a7de040c",
          "metadata": {
            "ExtractDocumentProperties": "False",
            "ExtractHyperlinks": "True",
            "ExtractShapeOrder": "TopLeftToBottomRightByRow",
            "ExtractTrackChangesMode": "Merge",
            "ProcessListItemValues": "False",
            "ProcessLockedContentControls": "False",
            "SDL:AutoClonedFlagSupported": "True",
            "SDL:CreationDate": "02/24/2014 13:54:42",
            "SDL:FileId": "aa798b1a-db2d-4229-afd5-d6305fcc5a04",
            "SDL:FileTypeDefinitionId": "Word 2007 v 2.0.0.0",
            "SDL:OriginalFilePath": "c:\\LocalFilesFps\\14b2a81db0884dbcacc1abf1c9d3d70f_WordWithFormatting.docx",
            "SDL:SourceLanguage": "en-GB",
            "SDL:TargetLanguage": "en-GB",
            "SkipAdvancedFontFormatting": "True",
            "SkipComplexScriptAndAsianTextFont": "True",
            "SkipNonAcceptedRejectedChanges": "False",
            "TranslateComments": "True",
            "WriteStudioCommentsToTarget": "True"
          },
          "originalFileName": "14b2a81db0884dbcacc1abf1c9d3d70f_WordWithFormatting.docx",
          "paragraphUnitCount": 1,
          "paragraphUnits": [
            null
          ],
          "structureParagraphUnitCount": 0
        }
      ],
      "id": "8e741443-d632-40b1-8809-064bcf5d1b0c",
      "name": "14b2a81db0884dbcacc1abf1c9d3d70f_WordWithFormatting.docx",
      "paragraphUnitCount": 1,
      "sourceLanguageCode": "en-GB",
      "sourceLanguageName": "English (United Kingdom)",
      "structureParagraphUnitCount": 0,
      "targetLanguageCode": "en-GB",
      "targetLanguageName": "English (United Kingdom)"
    },
    "id": "8e741443-d632-40b1-8809-064bcf5d1b0c",
    "loadedParagraphs": 4,
    "paragraphCount": 1,
    "skeletons": [
      {
        "comments": [],
        "contextDefinitions": [],
        "contexts": [],
        "fileId": "69b07a3475ba4d9687fd6bb80363cadb",
        "formattingGroups": [
          {
            "id": 1,
            "items": {
              "FontSize": "12"
            },
            "metadata": null
          },
          {
            "id": 2,
            "items": {
              "FontSize": "12",
              "TextColor": "0, 255, 0, 0"
            },
            "metadata": null
          },
          {
            "id": 3,
            "items": {
              "FontSize": "12",
              "TextColor": "0, 192, 80, 77"
            },
            "metadata": null
          },
          {
            "id": 4,
            "items": {
              "FontSize": "12",
              "Strikethrough": "True",
              "TextColor": "0, 192, 80, 77",
              "Underline": "True"
            },
            "metadata": null
          },
          {
            "id": 5,
            "items": {
              "FontSize": "12",
              "TextColor": "0, 0, 112, 192"
            },
            "metadata": null
          },
          {
            "id": 6,
            "items": {
              "Bold": "True",
              "FontSize": "12",
              "Strikethrough": "True"
            },
            "metadata": null
          },
          {
            "id": 7,
            "items": {
              "FontSize": "12",
              "TextColor": "Transparent"
            },
            "metadata": null
          },
          {
            "id": 8,
            "items": {
              "BackgroundColor": "0, 255, 0, 0",
              "FontSize": "12",
              "TextColor": "Transparent"
            },
            "metadata": null
          },
          {
            "id": 9,
            "items": {
              "BackgroundColor": "0, 0, 255, 0",
              "FontSize": "12"
            },
            "metadata": null
          },
          {
            "id": 10,
            "items": {
              "FontSize": "12",
              "Italic": "True",
              "Underline": "True"
            },
            "metadata": null
          },
          {
            "id": 11,
            "items": {
              "BackgroundColor": "0, 0, 0, 255",
              "FontSize": "12",
              "TextColor": "Transparent"
            },
            "metadata": null
          }
        ],
        "placeholderTagDefinitions": [],
        "structureTagDefinitions": [],
        "tagPairDefinitions": [
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 1,
            "id": 1,
            "metadata": null,
            "startTagContent": "<cf size=12>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 2,
            "id": 2,
            "metadata": null,
            "startTagContent": "<cf color=FF0000>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 3,
            "id": 3,
            "metadata": null,
            "startTagContent": "<cf color=C0504D size=12>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 4,
            "id": 4,
            "metadata": null,
            "startTagContent": "<cf strikethrough=single underline=single>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 5,
            "id": 5,
            "metadata": null,
            "startTagContent": "<cf color=0070C0 size=12>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 6,
            "id": 6,
            "metadata": null,
            "startTagContent": "<cf bold=True strikethrough=single>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 7,
            "id": 7,
            "metadata": null,
            "startTagContent": "<cf color=FFFFFF size=12>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 8,
            "id": 8,
            "metadata": null,
            "startTagContent": "<cf highlight=red>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 9,
            "id": 9,
            "metadata": null,
            "startTagContent": "<cf highlight=green>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 10,
            "id": 10,
            "metadata": null,
            "startTagContent": "<cf italic=True underline=single>",
            "startTagDisplayText": "cf",
            "subContent": []
          },
          {
            "canHide": true,
            "endTagContent": "</cf>",
            "endTagDisplayText": "cf",
            "formattingGroupId": 11,
            "id": 11,
            "metadata": null,
            "startTagContent": "<cf color=FFFFFF highlight=blue>",
            "startTagDisplayText": "cf",
            "subContent": []
          }
        ]
      }
    ]
  };
  return ueDocument;
};

proto.defaultParagraphsSample = function () {
  var paragraphs;

  paragraphs = [
    {
      "contextId": 0,
      "id": "f85f5518-e6df-4a76-9664-bf96b9aded0f",
      "index": 1,
      "isLocked": false,
      "isStructure": false,
      "parentFileId": "69b07a3475ba4d9687fd6bb80363cadb",
      "source": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "The European languages are members of the same family.",
                    "type": "text"
                  }
                ],
                "isLocked": true,
                "segmentNumber": "1",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Their separate existence is a myth.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "2",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "For science, music, sport, ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "etc",
                        "type": "text"
                      }
                    ],
                    "id": "2",
                    "metadata": {
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "TextColor": "FF0000",
                      "frameworkOriginalTagId": "5",
                      "w:color": "<w:color w:val=\"FF0000\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 2,
                    "type": "tagPair"
                  },
                  {
                    "text": ", Europe uses the same vocabulary.",
                    "type": "text"
                  }
                ],
                "isLocked": true,
                "segmentNumber": "3",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "The languages only differ in their grammar, their ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "canHide": false,
                        "children": [
                          {
                            "text": "pronunciation and their most common",
                            "type": "text"
                          }
                        ],
                        "id": "4",
                        "metadata": {
                          "FontSize": "12",
                          "ParentTag": "w:r",
                          "StartTag": "w:rPr",
                          "Strikethrough": "single",
                          "TextColor": "C0504D",
                          "Underline": "single",
                          "frameworkOriginalTagId": "11",
                          "w:color": "<w:color w:val=\"C0504D\" w:themeColor=\"accent2\"/>",
                          "w:strike": "<w:strike/>",
                          "w:sz": "<w:sz w:val=\"24\"/>",
                          "w:szCs": "<w:szCs w:val=\"24\"/>",
                          "w:u": "<w:u w:val=\"single\"/>"
                        },
                        "tagPairDefinitionId": 4,
                        "type": "tagPair"
                      },
                      {
                        "text": " ",
                        "type": "text"
                      }
                    ],
                    "id": "3",
                    "metadata": {
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "TextColor": "C0504D",
                      "frameworkOriginalTagId": "14",
                      "w:color": "<w:color w:val=\"C0504D\" w:themeColor=\"accent2\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 3,
                    "type": "tagPair"
                  },
                  {
                    "text": "words.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "4",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Everyone realizes why a new common language would be desirable: one could refuse to pay expensive translators.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "5",
                "type": "segment",
                "wordCount": 0
              }
            ],
            "id": "1",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "frameworkOriginalTagId": "2",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 1,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      },
      "target": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Limbile europene sunt membre ale aceleiasi familii lingvistice",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": true,
                "segmentNumber": "1",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "cOXWu/3S5sgtIGpSc5gi3JYH/m8="
                  },
                  "originBeforeAdaptation": {
                    "isStructureContextMatch": false,
                    "matchPercent": 0,
                    "metadata": {
                      "SegmentIdentityHash": "cOXWu/3S5sgtIGpSc5gi3JYH/m8="
                    },
                    "originBeforeAdaptation": null,
                    "originSystem": null,
                    "originType": "interactive",
                    "originalTranslationHash": null,
                    "textContextMatchLevel": null
                  },
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Existen\u021ba lor separat\u0103 este un mit.",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": false,
                "segmentNumber": "2",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "dpiKpPIDDjfG5rVT67mbQ8EZIaA="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Pentru \u0219tiin\u021b\u0103, muzic\u0103, sport, ",
                    "type": "text"
                  },
                  {
                    "children": [
                      {
                        "text": " ",
                        "type": "text"
                      },
                      {
                        "canHide": false,
                        "children": [
                          {
                            "text": "etc",
                            "type": "text"
                          }
                        ],
                        "id": "6",
                        "metadata": {
                          "FontSize": "12",
                          "ParentTag": "w:r",
                          "StartTag": "w:rPr",
                          "TextColor": "FF0000",
                          "frameworkOriginalTagId": "5",
                          "w:color": "<w:color w:val=\"FF0000\"/>",
                          "w:sz": "<w:sz w:val=\"24\"/>",
                          "w:szCs": "<w:szCs w:val=\"24\"/>"
                        },
                        "tagPairDefinitionId": 2,
                        "type": "tagPair"
                      },
                      {
                        "text": ",",
                        "type": "text"
                      }
                    ],
                    "type": "locked"
                  },
                  {
                    "text": "Europa folose\u0219te acela\u0219i vocabular.",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": true,
                "segmentNumber": "3",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "LgAmJoDpA7Xmh4E1eraRUCEKJgU="
                  },
                  "originBeforeAdaptation": {
                    "isStructureContextMatch": false,
                    "matchPercent": 0,
                    "metadata": {
                      "SegmentIdentityHash": "LgAmJoDpA7Xmh4E1eraRUCEKJgU="
                    },
                    "originBeforeAdaptation": null,
                    "originSystem": null,
                    "originType": "interactive",
                    "originalTranslationHash": null,
                    "textContextMatchLevel": null
                  },
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Limbile difer\u0103 doar \u00een gramatica lor, pronun\u021bie \u0219i cuvintele lor, cele mai comune.",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": false,
                "segmentNumber": "4",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "q154Vbekc7Z8qbZgpTIQqztrWyU="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "\t\t\t\tCu totii realizeaza ...",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": false,
                "segmentNumber": "5",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "m1xdu6/UlYcTKPKYH4wY3miafjk="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              }
            ],
            "id": "5",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "frameworkOriginalTagId": "2",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 1,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      }
    },
    {
      "contextId": 0,
      "id": "5d5abbbf-6ad1-42cd-a919-b343c1bfde86",
      "index": 2,
      "isLocked": false,
      "isStructure": false,
      "parentFileId": "69b07a3475ba4d9687fd6bb80363cadb",
      "source": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "To achieve this, it would be necessary to have uniform grammar, pronunciation and more common words.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "6",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "If several languages coalesce, the grammar of the resulting language is more simple and regular than that of the individual languages.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "7",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "The new common language will be more simple and regular than the existing European languages.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "8",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "It will be as simple as Occidental; in fact, it will be Occidental.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "9",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              }
            ],
            "id": "7",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "TextColor": "0070C0",
              "frameworkOriginalTagId": "20",
              "w:color": "<w:color w:val=\"0070C0\"/>",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 5,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      },
      "target": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "To achieve this, it would be necessary to have uniform grammar, pronunciation and more common words.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "6",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "h7RJ9nxQBpl4EBtBPiGVLurYiFY="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "source",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "If several languages coalesce, the grammar of the resulting language is more simple and regular than that of the individual languages.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "7",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "jM/wS3KvMtgBO/uUe5x2IZLTXRg="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "source",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "The new common language will be more simple and regular than the existing European languages.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "8",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "rrspF4Wzo0wljf1UAzTnYNtBTWQ="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "source",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "It will be as simple as Occidental; in fact, it will be Occidental.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "9",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "rcM9RCYDVCb+SRa9TQThHRrX6zA="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "source",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              }
            ],
            "id": "8",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "TextColor": "0070C0",
              "frameworkOriginalTagId": "20",
              "w:color": "<w:color w:val=\"0070C0\"/>",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 5,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      }
    },
    {
      "contextId": 0,
      "id": "a20a2ef4-d57c-4a60-9c93-698e1f95fbc8",
      "index": 3,
      "isLocked": false,
      "isStructure": false,
      "parentFileId": "69b07a3475ba4d9687fd6bb80363cadb",
      "source": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "To an English person, it will seem like simplified English, as a skeptical Cambridge friend of mine told me what Occidental is.",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "The European languages are members of the same family",
                        "type": "text"
                      }
                    ],
                    "id": "10",
                    "metadata": {
                      "Bold": "True",
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "Strikethrough": "single",
                      "frameworkOriginalTagId": "32",
                      "w:b": "<w:b/>",
                      "w:strike": "<w:strike/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 6,
                    "type": "tagPair"
                  },
                  {
                    "text": ".",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "10",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Their separate existence is a myth.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "11",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "For science, music, sport, etc, Europe uses the same vocabulary.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "12",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "The languages only differ in their grammar, their pronunciation and their most common words.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "13",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Everyone realizes why a new common language would be desirable: one could refuse to pay expensive translators.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "14",
                "type": "segment",
                "wordCount": 0
              }
            ],
            "id": "9",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "frameworkOriginalTagId": "26",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 1,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      },
      "target": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "To an English person, it will seem like simplified English, as a skeptical Cambridge friend of mine told me what Occidental is.",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "The ",
                        "type": "text"
                      },
                      {
                        "children": [
                          {
                            "text": "European",
                            "type": "text"
                          }
                        ],
                        "type": "locked"
                      },
                      {
                        "text": " languages are members of the same family",
                        "type": "text"
                      }
                    ],
                    "id": "12",
                    "metadata": {
                      "Bold": "True",
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "Strikethrough": "single",
                      "frameworkOriginalTagId": "32",
                      "w:b": "<w:b/>",
                      "w:strike": "<w:strike/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 6,
                    "type": "tagPair"
                  },
                  {
                    "text": ".",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": false,
                "segmentNumber": "10",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "kBguG4Byt8KDzLkbntvGIHoJHFQ="
                  },
                  "originBeforeAdaptation": {
                    "isStructureContextMatch": false,
                    "matchPercent": 0,
                    "metadata": {
                      "SegmentIdentityHash": "kBguG4Byt8KDzLkbntvGIHoJHFQ="
                    },
                    "originBeforeAdaptation": {
                      "isStructureContextMatch": false,
                      "matchPercent": 0,
                      "metadata": null,
                      "originBeforeAdaptation": null,
                      "originSystem": null,
                      "originType": null,
                      "originalTranslationHash": null,
                      "textContextMatchLevel": null
                    },
                    "originSystem": null,
                    "originType": "source",
                    "originalTranslationHash": null,
                    "textContextMatchLevel": null
                  },
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "11",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "dpiKpPIDDjfG5rVT67mbQ8EZIaA="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": null,
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "12",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "13",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "14",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "m1xdu6/UlYcTKPKYH4wY3miafjk="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": null,
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              }
            ],
            "id": "11",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "frameworkOriginalTagId": "26",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 1,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      }
    },
    {
      "contextId": 0,
      "id": "c434586f-a4fe-4f2c-8f8a-39804236e291",
      "index": 4,
      "isLocked": false,
      "isStructure": false,
      "parentFileId": "69b07a3475ba4d9687fd6bb80363cadb",
      "source": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "One morning, when ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "canHide": false,
                        "children": [
                          {
                            "text": "Gregor Samsa",
                            "type": "text"
                          }
                        ],
                        "id": "15",
                        "metadata": {
                          "BackgroundColor": "red",
                          "FontSize": "12",
                          "ParentTag": "w:r",
                          "StartTag": "w:rPr",
                          "TextColor": "FFFFFF",
                          "frameworkOriginalTagId": "50",
                          "w:color": "<w:color w:val=\"FFFFFF\" w:themeColor=\"background1\"/>",
                          "w:highlight": "<w:highlight w:val=\"red\"/>",
                          "w:sz": "<w:sz w:val=\"24\"/>",
                          "w:szCs": "<w:szCs w:val=\"24\"/>"
                        },
                        "tagPairDefinitionId": 8,
                        "type": "tagPair"
                      },
                      {
                        "text": " ",
                        "type": "text"
                      }
                    ],
                    "id": "14",
                    "metadata": {
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "TextColor": "FFFFFF",
                      "frameworkOriginalTagId": "59",
                      "w:color": "<w:color w:val=\"FFFFFF\" w:themeColor=\"background1\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 7,
                    "type": "tagPair"
                  },
                  {
                    "text": "woke from troubled dreams, he found himself transformed in his bed into a horrible vermin.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "15",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "He lay on his armour-like back, and if he lifted his head a little he could see ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "his brown belly",
                        "type": "text"
                      }
                    ],
                    "id": "16",
                    "metadata": {
                      "BackgroundColor": "green",
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "frameworkOriginalTagId": "71",
                      "w:highlight": "<w:highlight w:val=\"green\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 9,
                    "type": "tagPair"
                  },
                  {
                    "text": ", slightly domed ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "and divided",
                        "type": "text"
                      }
                    ],
                    "id": "17",
                    "metadata": {
                      "FontSize": "12",
                      "Italic": "True",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "Underline": "single",
                      "frameworkOriginalTagId": "77",
                      "w:i": "<w:i/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>",
                      "w:u": "<w:u w:val=\"single\"/>"
                    },
                    "tagPairDefinitionId": 10,
                    "type": "tagPair"
                  },
                  {
                    "text": " by arches into stiff sections.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "16",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "The bedding was hardly able to cover it and seemed ready to slide off any moment.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "17",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "18",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "\"What's happened to me?\"",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "19",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "he thought",
                        "type": "text"
                      }
                    ],
                    "id": "18",
                    "metadata": {
                      "BackgroundColor": "blue",
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "TextColor": "FFFFFF",
                      "frameworkOriginalTagId": "83",
                      "w:color": "<w:color w:val=\"FFFFFF\" w:themeColor=\"background1\"/>",
                      "w:highlight": "<w:highlight w:val=\"blue\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 11,
                    "type": "tagPair"
                  },
                  {
                    "text": ".",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "20",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "It wasn't a dream.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "21",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "His room, a proper human room although a little too small, lay peacefully between its four familiar walls.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "22",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "23",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the viewer.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "24",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "Gregor then turned to look out the window at the dull weather.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "25",
                "type": "segment",
                "wordCount": 0
              }
            ],
            "id": "13",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "frameworkOriginalTagId": "47",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 1,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      },
      "target": {
        "children": [
          {
            "canHide": false,
            "children": [
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "15",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "text": "He lay on his armour-like back, and if he lifted his head a little he could see ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "his brown belly",
                        "type": "text"
                      }
                    ],
                    "id": "20",
                    "metadata": {
                      "BackgroundColor": "green",
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "frameworkOriginalTagId": "71",
                      "w:highlight": "<w:highlight w:val=\"green\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 9,
                    "type": "tagPair"
                  },
                  {
                    "text": ", slightly domed ",
                    "type": "text"
                  },
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "and divided",
                        "type": "text"
                      }
                    ],
                    "id": "21",
                    "metadata": {
                      "FontSize": "12",
                      "Italic": "True",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "Underline": "single",
                      "frameworkOriginalTagId": "77",
                      "w:i": "<w:i/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>",
                      "w:u": "<w:u w:val=\"single\"/>"
                    },
                    "tagPairDefinitionId": 10,
                    "type": "tagPair"
                  },
                  {
                    "text": " by arches into stiff sections.",
                    "type": "text"
                  }
                ],
                "isLocked": false,
                "segmentNumber": "16",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "CFbKxT+0xPGx7znyTTTpqiKNRVE="
                  },
                  "originBeforeAdaptation": null,
                  "originSystem": null,
                  "originType": "source",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "17",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "18",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "19",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [
                  {
                    "canHide": false,
                    "children": [
                      {
                        "text": "s-a gandit el",
                        "type": "text"
                      }
                    ],
                    "id": "22",
                    "metadata": {
                      "BackgroundColor": "blue",
                      "FontSize": "12",
                      "ParentTag": "w:r",
                      "StartTag": "w:rPr",
                      "TextColor": "FFFFFF",
                      "frameworkOriginalTagId": "83",
                      "w:color": "<w:color w:val=\"FFFFFF\" w:themeColor=\"background1\"/>",
                      "w:highlight": "<w:highlight w:val=\"blue\"/>",
                      "w:sz": "<w:sz w:val=\"24\"/>",
                      "w:szCs": "<w:szCs w:val=\"24\"/>"
                    },
                    "tagPairDefinitionId": 11,
                    "type": "tagPair"
                  },
                  {
                    "text": ".",
                    "type": "text"
                  }
                ],
                "confirmationLevel": "Draft",
                "isLocked": false,
                "segmentNumber": "20",
                "translationOrigin": {
                  "isStructureContextMatch": false,
                  "matchPercent": 0,
                  "metadata": {
                    "SegmentIdentityHash": "53my/YbsFeOO7oM9YjPVb07rh6Y="
                  },
                  "originBeforeAdaptation": {
                    "isStructureContextMatch": false,
                    "matchPercent": 0,
                    "metadata": {
                      "SegmentIdentityHash": "53my/YbsFeOO7oM9YjPVb07rh6Y="
                    },
                    "originBeforeAdaptation": {
                      "isStructureContextMatch": false,
                      "matchPercent": 0,
                      "metadata": null,
                      "originBeforeAdaptation": null,
                      "originSystem": null,
                      "originType": null,
                      "originalTranslationHash": null,
                      "textContextMatchLevel": null
                    },
                    "originSystem": null,
                    "originType": "source",
                    "originalTranslationHash": null,
                    "textContextMatchLevel": null
                  },
                  "originSystem": null,
                  "originType": "interactive",
                  "originalTranslationHash": null,
                  "textContextMatchLevel": null
                },
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "21",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "22",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "23",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "24",
                "type": "segment",
                "wordCount": 0
              },
              {
                "text": " ",
                "type": "text"
              },
              {
                "characterCount": 0,
                "children": [],
                "isLocked": false,
                "segmentNumber": "25",
                "type": "segment",
                "wordCount": 0
              }
            ],
            "id": "19",
            "metadata": {
              "FontSize": "12",
              "ParentTag": "w:r",
              "StartTag": "w:rPr",
              "frameworkOriginalTagId": "47",
              "w:sz": "<w:sz w:val=\"24\"/>",
              "w:szCs": "<w:szCs w:val=\"24\"/>"
            },
            "tagPairDefinitionId": 1,
            "type": "tagPair"
          }
        ],
        "type": "paragraph"
      }
    }
  ];

  return paragraphs;
};

proto.simpleTagPair = function () {
  return {
    "canHide": false,
    "children": [
      {
        "text": "etc",
        "type": "text"
      }
    ],
    "id": "2",
    "metadata": {
      "FontSize": "12",
      "ParentTag": "w:r",
      "StartTag": "w:rPr",
      "TextColor": "FF0000",
      "frameworkOriginalTagId": "5",
      "w:color": "<w:color w:val=\"FF0000\"/>",
      "w:sz": "<w:sz w:val=\"24\"/>",
      "w:szCs": "<w:szCs w:val=\"24\"/>"
    },
    "tagPairDefinitionId": 2,
    "type": "tagPair"
  };
};

module.exports = SideBySideParagraphUnitsRendererFixture;
},{}],105:[function(require,module,exports){
/* File: CommandManager_test.js */
/* jshint undef: true, unused: true */
/* globals require, describe, it */

'use strict';

var CommandManager = require('../../assets/js/ue/CommandManager');

var sinon = require('sinon');
var assert = require('chai').assert;

describe('CommandManager', function () {
  var commander;

  var commands = {
    single: {
      'test_command': {
        handle: function () {
          return true;
        }
      }
    },

    multiple: {
      'first_test_command': {
        handle: function () {
          return true;
        }
      },
      'second_test_command': {
        handle: function () {
          return true;
        }
      }
    }
  };

  beforeEach(function () {
    commander = new CommandManager();
  });

  describe('constructor', function () {
    it('should instantiate the new class', function () {
      assert.instanceOf(commander, CommandManager, 'and commander will be CommandManager instance');
    });

    it('should have a default "options" property', function () {
      assert.property(commander, 'options');
    });

    it('should have a default "commands" property', function () {
      assert.property(commander, 'commands');
    });

    describe('CommandManager#methods', function () {
      it('should have a "execute" method', function () {
        assert.isFunction(commander.execute, 'CommandManager#execute exist');
      });

      it('should have an "addCommands" method', function () {
        assert.isFunction(commander.addCommands, '');
      });
    });
  });

  describe('CommandManager#addCommands', function () {
    it('should dynamically add one single command', function () {
      commander.addCommands(commands.single);
      assert.isFunction(commander.commands['test_command'].handle);
    });

    it('should dynamically add multiple commands', function () {
      commander.addCommands(commands.multiple);
      assert.isFunction(commander.commands['first_test_command'].handle);
      assert.isFunction(commander.commands['second_test_command'].handle);
    });
  });

  describe('CommandManager#deleteCommands', function () {
    it('should be able to delete commands', function () {
      commander.addCommands(commands.multiple);
      commander.deleteCommands('first_test_command', 'second_test_command');

      assert.isUndefined(commander.execute('first_test_command'), 'first_test_command was not executed');
      assert.isUndefined(commander.execute('second_test_command'), 'second_test_command was not executed');
    });

    it('should exit the execution if command is not available', function () {
      assert.isUndefined(commander.execute('unknown_test_command'), 'unknown_test_command was not executed');
    });
  });

  describe('CommandManager#execute', function () {
    it('should be able to execute available commands', function () {
      commander.addCommands(commands.multiple);
      assert.isTrue(commander.execute('first_test_command'), 'first_test_command was executed');
      assert.isTrue(commander.execute('second_test_command'), 'second_test_command was executed');
    });

    it('should exit the execution if command is not available', function () {
      assert.isUndefined(commander.execute('unknown_test_command'), 'unknown_test_command was not executed');
    });
  });
});
},{"../../assets/js/ue/CommandManager":2,"chai":46,"sinon":78}],106:[function(require,module,exports){
/* File: DataProvider_test.js */
/* jshint undef: true, unused: true */
/* globals require, describe, it, beforeEach, afterEach */
'use strict';
var DataProvider = require('../../assets/js/ue/DataProvider');
var Mediator = require('../../assets/js/ue/Mediator');
var DataProviderObjectMother = require('../support/DataProviderObjectMother');
var h = require('../../assets/js/ue/Helpers').stringToHTMLElement;

var sinon = require('sinon');
var assert = require('chai').assert;

describe('DataProvider', function () {
  var dataProviderObjectMother;
  beforeEach(function () {
    dataProviderObjectMother = new DataProviderObjectMother();
    DataProvider.init();
  });

  describe('when receives the segment:end-edit message', function () {
    beforeEach(function() {
      sinon.stub(DataProvider, 'saveSegmentChange');
      Mediator.publish('segment:start-edit', {
        el: h('<div class="segment"/>'),
        segmentNumber: '1',
        otherSegmentData: {
          'confirmationlevel': 'draft'
        }
      });
    });

    afterEach(function () {
      DataProvider.saveSegmentChange.restore();
    });

    describe('when the content has changed', function () {
      it('calls DataProvider#saveSegmentChange', function () {
        Mediator.publish('segment:end-edit', {
          el: h('<div class="segment">content has changed</div>'),
          segmentNumber: '1',
          otherSegmentData: {
            'confirmationlevel': 'draft'
          }
        });

        assert(DataProvider.saveSegmentChange.called, 'DataProvider#saveSegmentChange has been called');
      });
    });

    describe('when the status has changed', function () {
      it('calls DataProvider#saveSegmentChange', function () {
        Mediator.publish('segment:end-edit', {
          el: h('<div class="segment"/>'),
          segmentNumber: '1',
          otherSegmentData: {
            'confirmationlevel': 'no-longer-draft'
          }
        });

        assert(DataProvider.saveSegmentChange.called, 'DataProvider#saveSegmentChange has been called');
      });
    });

    describe('when the content and status is unchanged', function () {
      it('does not call DataProvider#saveSegmentChange', function () {
        Mediator.publish('segment:end-edit', {
          el: h('<div class="segment"/>'),
          segmentNumber: '1',
          otherSegmentData: {
            'confirmationlevel': 'draft'
          }
        });

        assert.isFalse(DataProvider.saveSegmentChange.called, 'DataProvider#saveSegmentChange has been called');
      });
    });
  });
});

},{"../../assets/js/ue/DataProvider":3,"../../assets/js/ue/Helpers":5,"../../assets/js/ue/Mediator":10,"../support/DataProviderObjectMother":94,"chai":46,"sinon":78}],107:[function(require,module,exports){
/* File: SegmentCleanup_test.js */
/* globals describe, beforeEach, it */
'use strict';
var SegmentsWatcher = require('../../assets/js/ue/SegmentsWatcher');
var SegmentCleanup = require('../../assets/js/ue/SegmentCleanup');
var NodeWalker = require('../../assets/js/ue/selection/NodeWalker');

var SegmentCleanupFixture = require('../support/SegmentCleanupFixture');

var assert = require('chai').assert;

describe('SegmentCleanup', function () {
  var segmentFixture = new SegmentCleanupFixture(),
      segmentNumber = '1',
      segmentCleanup,
      targetContent,
      walker;

  function cleanupSegment() {
    segmentCleanup = new SegmentCleanup(segmentNumber);
    segmentCleanup.cleanStructure();
  }

  function setupTargetContent(targetContent) {
    SegmentsWatcher.watchSegment(segmentNumber)
      .setTarget(targetContent);
  }

  describe('#cleanStructure', function () {
    describe('when content is before div.inline-content', function () {
      beforeEach(function () {
        targetContent = segmentFixture.contentBeforeInlineContent();
        setupTargetContent(targetContent);
      });

      it('moves content inside div.inline-content', function () {
        cleanupSegment();

        walker = new NodeWalker(targetContent.firstChild);
        assert.isFalse(walker.isTextNode(), 'text node has been moved');
      });
    });

    describe('when content is after div.inline-content', function () {
      beforeEach(function () {
        targetContent = segmentFixture.contentAfterInlineContent();
        setupTargetContent(targetContent);
      });

      it('moves content inside div.inline-content', function () {
        cleanupSegment();

        walker = new NodeWalker(targetContent.lastChild);
        assert.isFalse(walker.isTextNode(), 'text node has been moved');
      });
    });

    describe('when div.inline-content is missing from segment', function () {
      beforeEach(function () {
        targetContent = segmentFixture.segmentWithNoInlineContent();
        setupTargetContent(targetContent);
      });

      it('creates the inline content', function () {
        cleanupSegment();

        walker = new NodeWalker(targetContent.firstChild);
        assert.isTrue(walker.isInlineContent(), 'inline content has been created');
      });
    });

    describe('when text contains placeholder', function () {
      beforeEach(function () {
        targetContent = segmentFixture.placeholderInsideText();
        setupTargetContent(targetContent);
      });

      it('splits the text node', function () {
        var placeholder,
            walker,
            textBefore,
            textAfter;

        cleanupSegment();

        placeholder = targetContent.querySelector('.ue-tag-wrapper');
        walker = new NodeWalker(placeholder);
        textBefore = walker.prev();
        textAfter = walker.next();

        assert(textBefore.isText(), 'text was split before');
        assert(textAfter.isText(), 'text was split after');
      });
    });
  });

});

},{"../../assets/js/ue/SegmentCleanup":15,"../../assets/js/ue/SegmentsWatcher":17,"../../assets/js/ue/selection/NodeWalker":35,"../support/SegmentCleanupFixture":101,"chai":46}],108:[function(require,module,exports){
/* File: SegmentWatcher_test.js */
/* globals describe, beforeEach, afterEach, it */
'use strict';

var h = require('../../assets/js/ue/Helpers').stringToHTMLElement;
var SegmentsWatcher = require('../../assets/js/ue/SegmentsWatcher');
var assert = require('chai').assert;

describe('SegmentWatcher', function () {
  var undefinedTargetSegmentNumber = '10',
      sourceEl = h('<div class="ue-segment"/>'),
      statusEl = h('<div class="ue-status"/>'),
      targetEl = h('<div class="ue-segment"/>');

  describe('getTargetEl', function () {
    var returnedTargetEl,
        segmentNumber = '1';

    it('returns null when the segment number is not watched', function () {

      returnedTargetEl = SegmentsWatcher.getTargetEl(undefinedTargetSegmentNumber);

      assert.isNull(returnedTargetEl, 'target segment has not been found');
    });

    describe('when the segment is watched', function () {
      beforeEach(function () {
        SegmentsWatcher.watchSegment(segmentNumber)
          .setSource(sourceEl)
          .setStatus(statusEl)
          .setTarget(targetEl);
      });

      it('returns the targetEl', function () {
        returnedTargetEl = SegmentsWatcher.getTargetEl(segmentNumber);

        assert.equal(targetEl, returnedTargetEl, 'target segment has been returned');
      });
    });
  });
});
},{"../../assets/js/ue/Helpers":5,"../../assets/js/ue/SegmentsWatcher":17,"chai":46}],109:[function(require,module,exports){
/* File: SideBySideParagraphUnitsRenderer_test.js */
/* jshint undef: true, unused: true */
/* globals require, describe, beforeEach, afterEach, it */
'use strict';
var assert = require('chai').assert;

var config = require('../../assets/js/ue/config');

var DataProviderObjectMother = require('../support/DataProviderObjectMother');
var SideBySideParagraphUnitsRenderer = require('../../assets/js/ue/SideBySideParagraphUnitsRenderer');
var SideBySideParagraphUnitsRendererFixture = require('../support/SideBySideParagraphUnitsRendererFixture');

describe('SideBySideParagraphUnitsRenderer ', function () {
  var renderer,
      fixture,
      dataProviderObjectMother,
      ueDocument,
      paragraphs;

  beforeEach(function () {
    fixture = new SideBySideParagraphUnitsRendererFixture();
    dataProviderObjectMother = new DataProviderObjectMother();

    ueDocument = fixture.defaultDocumentSample();
    paragraphs = fixture.defaultParagraphsSample();

    dataProviderObjectMother.hackInitialization(
      paragraphs, ueDocument);

    fixture = new SideBySideParagraphUnitsRendererFixture();
    renderer = new SideBySideParagraphUnitsRenderer(
      paragraphs,
      ueDocument);
  });

  describe('render', function () {
    it('generates the editor content in source and target columns', function () {
      var sourceEditableColumn,
          targetEditableColumn;

      renderer.render();

      sourceEditableColumn = renderer.sourceEditableColumn;
      targetEditableColumn = renderer.targetEditableColumn;

      assert.isNotNull(sourceEditableColumn, 'sourceEditableColumn is assigned to');
      assert.isNotNull(targetEditableColumn, 'targetEditableColumn is assigned to');

      assert.instanceOf(sourceEditableColumn, jQuery, 'sourceEditableColumn is jquery object');
      assert.instanceOf(targetEditableColumn, jQuery, 'targetEditableColumn is jquery object');
    });

  });

  describe('#_renderTagPair', function (){
    it('renders the elements that form a tag', function () {
      var tagPair = fixture.simpleTagPair(),
          tagPairRender;

      tagPairRender = renderer._renderTagPair(tagPair);

      assert.isNotNull(tagPairRender);
      assert.lengthOf(tagPairRender, 3, 'start-tag, content, end-tag are rendered');
    });

    it('renders the elements as jQuery objects', function () {
      var tagPair = fixture.simpleTagPair(),
          tagPairRender;

      tagPairRender = renderer._renderTagPair(tagPair);

      assert.instanceOf(tagPairRender[0], jQuery, 'start-tag is rendered as a jQuery object');
      assert.instanceOf(tagPairRender[1], jQuery, 'start-tag is rendered as a jQuery object');
      assert.instanceOf(tagPairRender[2], jQuery, 'start-tag is rendered as a jQuery object');
    });

    it('adds the canHide as a data attribute', function () {
      var tagPair = fixture.simpleTagPair(),
          tagPairRender,
          startTag, startTagEl,
          endTag, endTagEl;

      tagPairRender = renderer._renderTagPair(tagPair);

      startTag = tagPairRender[0];
      startTagEl = startTag[0];
      endTag = tagPairRender[2];
      endTagEl = endTag[0];

      assert.equal(startTagEl.dataset.canHide, 'false', 'startTag has canHide');
      assert.equal(endTagEl.dataset.canHide, 'false', 'endTag has canHide');
    });

    describe('when canHideIsTrue and tag formatting is hidden by default', function () {
      var tagPair,
          tagPairRender,
          startTag, startTagEl,
          endTag, endTagEl;

      beforeEach(function () {
        config.tagDisplayContext.showFormatting = false;
        tagPair = fixture.simpleTagPair();
        tagPair.canHide = true;
      });

      afterEach(function () {
        tagPair.canHide = false;
      });

      it('adds .hide as a CSS class', function () {

        tagPairRender = renderer._renderTagPair(tagPair);

        startTag = tagPairRender[0];
        startTagEl = startTag[0];
        endTag = tagPairRender[2];
        endTagEl = endTag[0];

        assert.isTrue(startTagEl.classList.contains('hide'), 'startTag has CSS class hide');
        assert.isTrue(endTagEl.classList.contains('hide'), 'endTag has CSS class hide');
      });
    });

    describe('when canHideIsTrue and tag formatting is not hidden by default', function () {
      var tagPair,
          tagPairRender,
          startTag, startTagEl,
          endTag, endTagEl;

      beforeEach(function () {
        config.tagDisplayContext.showFormatting = true;
        tagPair = fixture.simpleTagPair();
        tagPair.canHide = true;
      });

      afterEach(function () {
        tagPair.canHide = false;
      });

      it('does not add .hide as a CSS class', function () {

        tagPairRender = renderer._renderTagPair(tagPair);

        startTag = tagPairRender[0];
        startTagEl = startTag[0];
        endTag = tagPairRender[2];
        endTagEl = endTag[0];

        assert.isFalse(startTagEl.classList.contains('hide'), 'startTag has no CSS class hide');
        assert.isFalse(endTagEl.classList.contains('hide'), 'endTag has no CSS class hide');
      });
    });
  });
});
},{"../../assets/js/ue/SideBySideParagraphUnitsRenderer":19,"../../assets/js/ue/config":25,"../support/DataProviderObjectMother":94,"../support/SideBySideParagraphUnitsRendererFixture":104,"chai":46}],110:[function(require,module,exports){
/* File: Tmpl_test.js */
/* globals describe, beforeEach, it*/
'use strict';
var Tmpl = require('../../assets/js/ue/Tmpl');
var NodeWalker = require('../../assets/js/ue/selection/NodeWalker');

var assert = require('chai').assert;

describe('Tmpl', function () {
  describe('#buldSegmentInlineContent', function () {
    var inlineContent,
        nodeWalker;

    beforeEach(function () {
      inlineContent = Tmpl.buildSegmentInlineContent();
      nodeWalker = new NodeWalker(inlineContent);
    });

    it('builds the inline content for a segment', function () {
      assert.isTrue(nodeWalker.isInlineContent(), 'inline content has been built');
    });

    it('adds a zwnj character as the first child', function () {
      nodeWalker = nodeWalker.firstChild();

      assert.isTrue(nodeWalker.isInvisibleChar(), 'invisible character was added to the structure');
    });
  });
});
},{"../../assets/js/ue/Tmpl":21,"../../assets/js/ue/selection/NodeWalker":35,"chai":46}],111:[function(require,module,exports){
var assert = require('chai').assert;
var sinon = require('sinon');

var KeyboardBindings = require('../../../assets/js/ue/KeyboardBindings');
var SegmentsWatcher = require('../../../assets/js/ue/SegmentsWatcher');
var ShiftEnterHandler = require('../../../assets/js/ue/keyboard/ShiftEnterHandler');

var FakeEvent = require('../../support/FakeEvent');
var ShiftEnterHandlerFixture = require('../../support/ShiftEnterHandlerFixture');
var SelectionContextObjectMother = require('../../support/SelectionContextObjectMother');
var Selection = require('../../../assets/js/ue/selection');

describe('Keyboard: ShiftEnterHandler', function () {
  "use strict";
  var fakeEvent,
      handle,
      keys = KeyboardBindings.prototype,
      selectionObjectMother,
      selectionContext,
      fixture = new ShiftEnterHandlerFixture(),
      sample;

  beforeEach(function () {
    handle = function (ev) {
      new ShiftEnterHandler(ev);
    };

    selectionObjectMother = new SelectionContextObjectMother();
    selectionContext = selectionObjectMother.stubSelectionContext();

    sinon.stub(SegmentsWatcher, 'resize');
  });

  afterEach(function () {
    selectionObjectMother.restoreSelectionContext();
    SegmentsWatcher.resize.restore();
  });

  describe('when the expected shift+enter combination was pressed', function () {

    function breakIsMovedWithinInlineContentBeforeText () {
      var brIsInsideInlineContent,
          inlineContent = sample.childNodes[1],
          nodeWalker = new Selection.NodeWalker(inlineContent.firstChild);

      brIsInsideInlineContent = nodeWalker.isElement('br');

      return brIsInsideInlineContent;
    }

    beforeEach(function () {
      fakeEvent = new FakeEvent();
      fakeEvent.setShiftKey(true);
      fakeEvent.setKeyCode(keys.keyEnter);
    });
    describe('Chrome generates a <br> at the invisible character position inside the ue-segment container', function () {
      beforeEach(function () {
        sample = fixture.breakAtSegmentStartSample();
        selectionContext.focusNode = sample.firstChild;
      });

      afterEach(function () {
      });

      it('moves the segment start <br> inside inline content container to allow it to be processed', function () {
        handle(fakeEvent);

        assert.isTrue(breakIsMovedWithinInlineContentBeforeText(), '<br> is moved to the proper container');
      });

    });

    describe('when Chrome inserts carriage return inside span ue-tag', function () {
      it('converts the \n inside start tag to <br> and moves it after the tag-wrapper', function () {
        // Arrange
        sample = fixture.newLineInsideStartTagWrapperSample();
        selectionContext.focusNode = sample.firstChild;

        // Act
        handle(fakeEvent);

        // Assert
        assert.isTrue(breakIsAddedToInlineContent(), '<br> is moved to the proper container');
      });

      it('converts the \n inside end tag to <br> and moves it after the tag-wrapper', function () {
        // Arrange
        sample = fixture.newLineInsideEndTagWrapperSample();
        selectionContext.focusNode = sample.firstChild;

        // Act
        handle(fakeEvent);

        // Assert
        assert.isTrue(breakIsAddedToInlineContent(), '<br> is moved to the proper container');
      });

      function breakIsAddedToInlineContent(){
        var nodeWalker=  new Selection.NodeWalker(sample);
        var processingQueue = [nodeWalker];
        var breakFoundInsideInlineContent;

        while(processingQueue.length > 0){
          nodeWalker = processingQueue.pop();

          if(!nodeWalker.next().isNull()){
            processingQueue.push(nodeWalker.next());
          }

          if(!nodeWalker.firstChild().isNull()){
            processingQueue.push(nodeWalker.firstChild());
          }

          if(nodeWalker.isElement("br") && nodeWalker.parent().isInlineContent()){
            breakFoundInsideInlineContent = true;
          }
        }
        return breakFoundInsideInlineContent;
      }
    });

    describe('when Chrome inserts carriage return inside a text', function () {

      it('converts those carriage returns to <br> elements', function () {
        var sample = fixture.newLinesInsideTextContainer();
        var breakElementsInserted;
        selectionContext.focusNode = sample.firstChild;

        handle(fakeEvent);

        breakElementsInserted = sample.querySelectorAll('br');
        assert.lengthOf(breakElementsInserted, 1, 'new line converted to break');
      });

    });

    describe('when Firefox inserts <br> inside ue-tag-wrapper', function () {
      it('moves <br> after the start tag-wrapper', function () {
        var sample = fixture.startTagWithBreak();
        var breakElement;
        var nodeWalker;
        selectionContext.focusNode = sample;

        handle(fakeEvent);

        breakElement = sample.querySelector('br');
        nodeWalker = new Selection.NodeWalker(breakElement);
        nodeWalker = nodeWalker.prev();

        assert.isTrue(nodeWalker.isStartTag(), '<br> was moved after end tag');
      });

      it('moves <br> after the end tag-wrapper', function () {
        var sample = fixture.endTagWithBreak();
        var breakElement;
        var nodeWalker;
        selectionContext.focusNode = sample;

        handle(fakeEvent);

        breakElement = sample.querySelector('br');
        nodeWalker = new Selection.NodeWalker(breakElement);
        nodeWalker = nodeWalker.prev();

        assert.isTrue(nodeWalker.isEndTag(), '<br> was moved after end tag');
      });
    });

    describe('when segment is empty', function () {
      it('moves the br inside the inline content', function(){
        var sample = fixture.emptySegment();
        var breakElement,
            nodeWalker;
        selectionContext.focusNode = sample;

        handle(fakeEvent);

        breakElement = sample.querySelector('br');
        nodeWalker = new Selection.NodeWalker(breakElement);
        assert.isTrue(nodeWalker.parent().isInlineContent(), 'br was moved to the empty inline content')
      });
    });
  });

  describe('when shift+enter is not pressed', function () {
    beforeEach(function () {
      fakeEvent = new FakeEvent();
    });

    it('does nothing when enter is pressed', function () {
      fakeEvent.setKeyCode(keys.keyEnter);

      handle(fakeEvent);

      assert.isFalse(fakeEvent.hasPreventedDefault, 'Event#preventDefault has not been called');
    });

    it('does nothing when shift is pressed', function () {
      fakeEvent.setShiftKey(true);

      handle(fakeEvent);

      assert.isFalse(fakeEvent.hasPreventedDefault, 'Event#preventDefault has not been called');
    });
  });


});
},{"../../../assets/js/ue/KeyboardBindings":7,"../../../assets/js/ue/SegmentsWatcher":17,"../../../assets/js/ue/keyboard/ShiftEnterHandler":28,"../../../assets/js/ue/selection":34,"../../support/FakeEvent":95,"../../support/SelectionContextObjectMother":102,"../../support/ShiftEnterHandlerFixture":103,"chai":46,"sinon":78}],112:[function(require,module,exports){
var assert = require('chai').assert;

var SelectionContextObjectMother = require('../../support/SelectionContextObjectMother');
var FakeEvent = require('../../support/FakeEvent');

describe('KeyboardBindings#handleClearTagsShortcutPreventsDefault', function () {
  "use strict";

  var
    handleClearTagsShortcutPreventsDefault,

    objectMother,
    fakeEvent;

  beforeEach(function () {
    objectMother = new SelectionContextObjectMother();

    fakeEvent = new FakeEvent();

    fakeEvent.setCtrlKey(true);
    fakeEvent.setKeyCode(objectMother.keyboardBindings.keySpace);

    objectMother.setupEmptyCloneContents();
    handleClearTagsShortcutPreventsDefault = function () {
      objectMother.keyboardBindings.handleClearTagsShortcutPreventsDefault(fakeEvent);
    };
  });

  afterEach(function () {
  });


  describe("when the current selection is cross segment selection", function () {
    beforeEach(function () {
      objectMother.setCrossSegmentSelectionTo(true);
    });

    afterEach(function () {
      objectMother.resetCrossSegmentSelection();
    });

    it('does nothing', function () {
      handleClearTagsShortcutPreventsDefault();

      assert.isFalse(fakeEvent.hasPreventedDefault, 'KeyboardEvent#PreventDefault has been called');
    });
  });

  describe('when the current selection is collapsed', function () {

    beforeEach(function () {
      objectMother.setCollapsedSelection();
    });

    afterEach(function () {
      objectMother.restoreSelectionContext();
    });

    it('does nothing', function () {
      handleClearTagsShortcutPreventsDefault();

      assert.isFalse(fakeEvent.hasPreventedDefault, 'KeyboardEvent#PreventDefault has been called');
    });
  });

  describe('when the CTRL + Space combination is not pressed', function () {
    beforeEach(function () {
      objectMother.stubSelectionContext();
      fakeEvent.ctrlKey = false;
    });
    afterEach(function(){
      objectMother.restoreSelectionContext();
    });

    it('does nothing', function () {
      handleClearTagsShortcutPreventsDefault();

      assert.isFalse(fakeEvent.hasPreventedDefault, 'KeyboardEvent#PreventDefault has been called');
    });
  });

  describe('when the commonAncestor is same as endContainer and startContainer ', function () {
    beforeEach(function () {
      objectMother.setupSameContainerForSelection();
    });

    afterEach(function () {
      objectMother.restoreSelectionContext();
    });

    it('prevents the default browser action', function () {
      handleClearTagsShortcutPreventsDefault();
      assert.isTrue(fakeEvent.hasPreventedDefault, 'KeyboardEvent#PreventDefault has been called');
    });
  });
});

},{"../../support/FakeEvent":95,"../../support/SelectionContextObjectMother":102,"chai":46}],113:[function(require,module,exports){
var assert = require('chai').assert;

var Helpers = require('../../../assets/js/ue/Helpers');
var FakeEvent = require('../../support/FakeEvent');
var HandleClearTagsFixtures = require('../../support/HandleClearTagsFixtures')
var KeyboardBindings = require('../../../assets/js/ue/KeyboardBindings');
var Selection = require('../../../assets/js/ue/selection');
var SegmentsWatcher = require('../../../assets/js/ue/SegmentsWatcher');

describe('KeyboardBindings#handleClearTags acceptance', function(){
  var body,
    fixtureHost,
    fixtures,
    tagPairSample,
    selection,
    range;

  var kb, fakeEvent;

  beforeEach(function(){
    body = document.body;
    fixtureHost = Helpers.stringToHTMLElement('<div class="fixture-host hidden ue-editable" contenteditable="on"></div>');
    fixtures = new HandleClearTagsFixtures();
    tagPairSample = fixtures.tagPairSample();

    body.appendChild(fixtureHost);

    kb = new KeyboardBindings();

    fakeEvent = new FakeEvent();
    fakeEvent.setCtrlKey(true);
    fakeEvent.setKeyCode(kb.keySpace);
  });

  describe('when selection starts before a tag pair, and ends inside tag pair', function(){
    beforeEach(function(){
      var ueTextStart,
          ueTagPairContent,
          ueTagPairText,
          startTextNode,
          endTextNode;

      fixtureHost.appendChild(tagPairSample);
      selection = document.getSelection();
      range = newRange();
      ueTextStart = tagPairSample.firstChild;
      ueTagPairContent = tagPairSample.childNodes[2];
      ueTagPairText = ueTagPairContent.firstChild;

      startTextNode = ueTextStart.firstChild;
      endTextNode = ueTagPairText.firstChild;

      assignRange(startTextNode, endTextNode);
    });

    afterEach(function () {
      selection.removeAllRanges();
      fixtureHost.innerHTML = "";
    });

    it('will break the text at the start of the selection in two parts', function(){
      kb.handleClearTags(fakeEvent);

      var ueText = new Selection.NodeWalker(tagPairSample.firstChild.nextSibling);
      assert.equal(ueText.el.textContent, "xt");
    });

    it('will move the text selected in the tag pair, outside', function(){
      kb.handleClearTags(fakeEvent);

      var nodeWalker = new Selection.NodeWalker(tagPairSample.firstChild.nextSibling);
      var ueText = nodeWalker.next();
      assert(ueText.isText(), 'The sample has ue-text as the third child');
      assert.equal(ueText.el.textContent, "inner ");
    });

    it('will move the tag pair start wrapper after the selected text', function(){
      kb.handleClearTags(fakeEvent);

      var nodeWalker = new Selection.NodeWalker(tagPairSample.firstChild.nextSibling.nextSibling);
      var startTagWrapper = nodeWalker.next();
      assert(startTagWrapper.isStartTag(), 'The sample has startTag as the fourth child"');
    });
  });

  describe('when selection starts inside a tag pair and continues outside of it', function(){
    beforeEach(function () {
      var tagPairContent,
        ueTextEnd,
        ueTextStart,
        startTextNode,
        endTextNode;

      fixtureHost.appendChild(tagPairSample);

      tagPairContent = tagPairSample.childNodes[2];
      ueTextEnd = tagPairSample.lastChild;

      ueTextStart = tagPairContent.firstChild;

      startTextNode = ueTextStart.firstChild;
      endTextNode = ueTextEnd.firstChild;

      assignRange(startTextNode, endTextNode);
    });

    afterEach(function(){
      selection.removeAllRanges();
      fixtureHost.innerHTML = "";
    });

    it('moves the end tag at the front of the selection', function(){
      kb.handleClearTags(fakeEvent);
      var nodeWalker = new Selection.NodeWalker(tagPairSample.childNodes[3]);
      assert(nodeWalker.isEndTag(), 'end tag preserved before the start of the selection');
    });

    it('moves content out of the tag pair container', function(){
      kb.handleClearTags(fakeEvent);
      var ueText = new Selection.NodeWalker(tagPairSample.childNodes[4]);
      assert(ueText.isText(), 'text was moved outside of the tag pair container');
      assert.equal(ueText.el.textContent, 'content');
    });
  });

  describe('when tag pair is inside selection', function(){

    beforeEach(function(){
      var ueTextStart,
        ueTextEnd, startTextNode, endTextNode,
        tagPairStart, tagPairEnd,
        segmentWatcher;
      segmentWatcher = SegmentsWatcher;
      tagPairStart = tagPairSample.childNodes[1];
      tagPairEnd = tagPairSample.childNodes[3];
      segmentWatcher.addTagPair(tagPairStart.dataset.id, [tagPairStart, tagPairEnd]);

      fixtureHost.appendChild(tagPairSample);

      ueTextStart = tagPairSample.firstChild;
      ueTextEnd = tagPairSample.lastChild;

      startTextNode = ueTextStart.firstChild;
      endTextNode = ueTextEnd.firstChild;

      assignRange(startTextNode, endTextNode);
    });

    afterEach(function(){
      selection.removeAllRanges();
      fixtureHost.innerHTML = "";
    });


    it('remove the tag pair', function(){
      var nw = Selection.NodeWalker,
          hasTagPair;

      kb.handleClearTags(fakeEvent);

      hasTagPair = _(tagPairSample.childNodes).any(function(node){
        var nodeWalker = new nw(node);

        return nodeWalker.isTagPairContainer() || nodeWalker.isTag();
      });

      assert.isFalse(hasTagPair, 'no tag pair found in transformed sample');
    });
  });

  function assignRange(startTextNode, endTextNode){
    range = newRange();

    range.setStart(startTextNode, startTextNode.length /2);
    range.setEnd(endTextNode, endTextNode.length / 2);

    selection.addRange(range);
  }

  function newRange(){
    return document.createRange();
  }
});
},{"../../../assets/js/ue/Helpers":5,"../../../assets/js/ue/KeyboardBindings":7,"../../../assets/js/ue/SegmentsWatcher":17,"../../../assets/js/ue/selection":34,"../../support/FakeEvent":95,"../../support/HandleClearTagsFixtures":99,"chai":46}],114:[function(require,module,exports){
var assert = require('chai').assert;
var SelectionContextObjectMother = require('../../support/SelectionContextObjectMother');
var FakeEvent = require('../../support/FakeEvent');

describe('KeyboardBindings#handleClearTags', function () {
  "use strict";

  var
      handleClearTags,

      objectMother,
      fakeEvent;

  beforeEach(function () {
    objectMother = new SelectionContextObjectMother();
    objectMother.stubSelection();

    fakeEvent = new FakeEvent();

    fakeEvent.setCtrlKey(true);
    fakeEvent.setKeyCode(objectMother.keyboardBindings.keySpace);

    objectMother.setupEmptyCloneContents();
    handleClearTags = function () {
      objectMother.keyboardBindings.handleClearTags(fakeEvent);
    };
  });

  afterEach(function () {
    objectMother.restoreSelection();
  });

  describe("when the current selection is cross segment selection", function () {
    beforeEach(function () {
      objectMother.setCrossSegmentSelectionTo(true);
    });

    afterEach(function () {
      objectMother.resetCrossSegmentSelection();
    });

    it('does nothing', function () {
      handleClearTags();

      assert.isFalse(objectMother.stubSelectionContext.deleteContents.called, 'SelectionContext#deleteContents was called')
    });
  });

  describe('when the current selection is collapsed', function () {

    beforeEach(function () {
      objectMother.setCollapsedSelection();
    });

    afterEach(function () {
      objectMother.restoreSelectionContext();
    });

    it('does nothing', function () {
      handleClearTags();

      assert.isFalse(objectMother.stubSelectionContext.deleteContents.called, 'SelectionContext#deleteContents was called')
    });
  });

  describe('when the CTRL + Space combination is not pressed', function () {
    beforeEach(function () {
      objectMother.stubSelectionContext();
      fakeEvent.ctrlKey = false;
    });
    afterEach(function(){
      objectMother.restoreSelectionContext();
    });

    it('does nothing', function () {
      handleClearTags();

      assert.isFalse(objectMother.stubSelectionContext.deleteContents.called, 'SelectionContext#deleteContents was called')
    });
  });

  describe('when the commonAncestor is same as endContainer and startContainer ', function () {
    beforeEach(function () {
      objectMother.setupSameContainerForSelection();
    });

    afterEach(function () {
      objectMother.restoreSelectionContext();
    });

    it('does nothing', function () {
      handleClearTags();

      assert.isFalse(objectMother.stubSelectionContext.deleteContents.called, 'SelectionContext#deleteContents was called')
    });
  });

  describe('when the startContainer is different from commonAncestor', function () {
    beforeEach(function () {
      objectMother.setupSimpleAncestorStartContainer();
      objectMother.spyKeyboardBindingsMethod('identifyTagsInContainer');
      objectMother.spyKeyboardBindingsMethod('transformTags');
    });
    afterEach(function () {
      objectMother.restoreSelectionContext();
      objectMother.restoreKeyboardBindingsMethod('identifyTagsInContainer');
      objectMother.restoreKeyboardBindingsMethod('transformTags');
    });

    it('calls identifyTagsInContainer', function () {
      handleClearTags();
      assert(objectMother.keyboardBindingsSpy('identifyTagsInContainer').called,
          'expected identifyTagsInContainer to have been called');
    });

    it('calls transformTags', function () {
      handleClearTags();
      assert(objectMother.keyboardBindingsSpy('transformTags').called,
          'expected identifyTagsInContainer to have been called');
    });

    describe('when transformTags has tags that need to be move', function () {
      it('calls NodeWalker#remove for tags in moveTagsToEnd', function () {
        objectMother.attachMoveTagsToEndStub();

        handleClearTags();

        assert(objectMother.nodeWalkerStub.remove.called, 'NodeWalker#remove is called');
      });

      it('calls NodeWalker#remove for tags in moveTagsToStart', function () {
        objectMother.attachMoveTagsToFrontStub();

        handleClearTags();

        assert(objectMother.nodeWalkerStub.remove.called, 'NodeWalker#remove is called');

      });

      it('calls SelectionContext#deleteContents when there are tags to move', function () {
        objectMother.attachMoveTagsToFrontStub();

        handleClearTags();

        assert(objectMother.stubSelectionContext.deleteContents.called, 'SelectionContext#deleteContents was called')
      });
    });
  });


});
},{"../../support/FakeEvent":95,"../../support/SelectionContextObjectMother":102,"chai":46}],115:[function(require,module,exports){
var assert = require('chai').assert;
var KeyboardBindingsObjectMother = require('../../support/KeyboardBindingsObjectMother');
var Selection = require('../../../assets/js/ue/selection');

describe('KeyboardBindings#identifyTagsInContainer', function () {
  "use strict";
  var objectMother,
      identifyTagsInContainer,
      nodeWalker,
      end,
      fakeContainerEl,
      startContainer,
      endContainer;

  beforeEach(function () {
    objectMother = new KeyboardBindingsObjectMother();

    objectMother.assignTagsContainer();

    identifyTagsInContainer = function () {
      objectMother.kb.identifyTagsInContainer(nodeWalker, end);
    }
  });

  afterEach(function () {
    objectMother.deleteTagsContainer();
  });

  it('will walk through all nodes', function () {
    var textContainer,
        kb = objectMother.kb;

    // arrange
    fakeContainerEl = objectMother.setupSimpleContainer();
    textContainer = fakeContainerEl.firstChild;
    end = new Selection.NodeWalker(fakeContainerEl.lastChild);

    nodeWalker = new Selection.NodeWalker(textContainer);
    // act
    identifyTagsInContainer();

    //assert
    assert.isTrue(kb.endContainerReached, 'expected to reach end container');
  });

  describe('when collecting start tags', function () {
    var collectedTag;

    beforeEach(function(){
      fakeContainerEl = objectMother.singleStartTagSample();
      startContainer = fakeContainerEl.firstChild;
      endContainer = fakeContainerEl.lastChild;

      nodeWalker = new Selection.NodeWalker(startContainer);
      end = new Selection.NodeWalker(endContainer);
    });

    it('will collect start tags if they can hide', function () {
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      assert.isTrue(objectMother.hasCollectedTag("1"));
    });

    it('does not register end tag', function () {
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      collectedTag = objectMother.getTag("1");
      assert.isNull(collectedTag.endTag);
    });

    it('stores the startTag as a NodeWalker', function(){
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      collectedTag = objectMother.getTag("1");
      assert.instanceOf(collectedTag.startTag, Selection.NodeWalker, 'start tag is instance of NodeWalker');
    });
  });

  describe('when collecting endTags', function(){
    var collectedTag;

    beforeEach(function(){
      fakeContainerEl = objectMother.singleEndTagSample();
      startContainer = fakeContainerEl.firstChild.nextSibling;// selection starts in tag-pair-container
      endContainer = fakeContainerEl.lastChild;// ends in text node

      nodeWalker = new Selection.NodeWalker(startContainer);
      end = new Selection.NodeWalker(endContainer);
    });

    it('will collect end tags if they can hide', function () {
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      assert.isTrue(objectMother.hasCollectedTag("1"));
    });

    it('does not register start tag', function () {
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      collectedTag = objectMother.getTag("1");
      assert.isNull(collectedTag.startTag);
    });

    it('stores the endTag as a NodeWalker', function(){
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      collectedTag = objectMother.getTag("1");
      assert.instanceOf(collectedTag.endTag, Selection.NodeWalker, 'end tag is instance of NodeWalker');
    });
  });

  describe('when start tag and end tag are inside the same container', function(){
    var kb;
    beforeEach(function(){
      fakeContainerEl = objectMother.singleEndTagSample();
      startContainer = fakeContainerEl.firstChild;
      endContainer = fakeContainerEl.lastChild;

      nodeWalker = new Selection.NodeWalker(startContainer);
      end = new Selection.NodeWalker(endContainer);

      objectMother.stubRemoveInline();
      kb = objectMother.kb;
    });

    afterEach(function(){
      objectMother.resetRemoveInlineStub();
    });

    it('calls KeyboardBindings#_removeInline with end tag element', function(){
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      var element = kb._removeInline.getCall(0).args[0];
      assert(kb._removeInline.called, '_remove inline method was called');
      assert.equal(element.dataset.type, 'end-tag');
    });

    it('removes the tagId from tags', function(){
      // arrange
      // act
      identifyTagsInContainer();
      // assert
      assert.isUndefined(objectMother.getTag('1'));
    });
  });
});
},{"../../../assets/js/ue/selection":34,"../../support/KeyboardBindingsObjectMother":100,"chai":46}],116:[function(require,module,exports){
var assert = require('chai').assert;
var CrossSegmentSelectionObjectMother = require('../../support/CrossSegmentSelectionObjectMother');

describe('KeyboardBindings#isCrossSegmentSelection', function(){
  var isCrossSegmentSelection,
      objectMother,
      result;

  isCrossSegmentSelection = function(){
    return objectMother.keyboardBindings.isCrossSegmentSelection();
  };

  beforeEach(function(){
    objectMother = new CrossSegmentSelectionObjectMother();
  });

  describe(' when commonAncestor is ue-editable', function(){
    beforeEach(function(){
      objectMother.setupSelectionContextToHaveCommonAncestor('ue-editable');
    });

    afterEach(function(){
      objectMother.resetSelectionContext();
    });

    it('returns true', function(){
      result = isCrossSegmentSelection();

      assert.isTrue(result);
    });
  });

  describe(' when commonAncestor is not ue-editable', function(){
    beforeEach(function(){
      objectMother.setupSelectionContextToHaveCommonAncestor('ue-inline-content');
    });

    afterEach(function(){
      objectMother.resetSelectionContext();
    });

    it('returns false', function(){
      result = isCrossSegmentSelection();

      assert.isFalse(result);
    });
  });
});

},{"../../support/CrossSegmentSelectionObjectMother":93,"chai":46}],117:[function(require,module,exports){
var assert = require('chai').assert;
var KeyboardBindingsObjectMother = require('../../support/KeyboardBindingsObjectMother');
var Selection = require('../../../assets/js/ue/selection');
var Helpers = require('../../../assets/js/ue/Helpers');

describe('KeyboardBindings#transformTags',function(){
  "use strict";

  var objectMother,
      transformTags,
      documentFragmentWalker,
      documentFragment;

  beforeEach(function(){
    objectMother = new KeyboardBindingsObjectMother();

    transformTags = function(){
      documentFragmentWalker = new Selection.NodeWalker(documentFragment);
      objectMother.kb.transformTags(documentFragmentWalker);
    };

    objectMother.assignTagsContainer();

    setupCodeSample();
  });

  afterEach(function(){
    objectMother.deleteTagsContainer();
  });

  describe('when tags contain the tag id', function(){
    beforeEach(function(){
      objectMother.kb.tags["1"] = {};
    });
    afterEach(function(){
      delete objectMother.kb.tags["1"];
    });
    it('replaces tag pair content with inner content', function(){
      // arrange
      // act
      transformTags();
      // assert
      assert(!tagPairFoundInDocumentFragment(), 'there are no tag containers in document fragment');
    });
    it('moves start tags to the end tags collection', function(){
      // arrange
      // act
      transformTags();
      // assert
      assert.lengthOf(objectMother.kb.moveTagsToEnd, 1);

    });
    it('moves end tags to the start tags collection', function(){
      // arrange
      // act
      transformTags();
      // assert
      assert.lengthOf(objectMother.kb.moveTagsToFront, 1);
    });
  });

  function tagPairFoundInDocumentFragment(){
    var walker,
        foundTagContainer = false;
    walker = new Selection.NodeWalker(documentFragment).firstChild();

    do{
      if(walker.isTagPairContainer()){
        foundTagContainer = true;
      }
      walker = walker.next();
    }while(!walker.isNull());
    return foundTagContainer;
  }

  function setupCodeSample(){
    var sample,
        child;

    documentFragment = document.createDocumentFragment();
    sample = Helpers.stringToHTMLElement('<div><span class="ue-text">text</span>'+
    '<span class="ue-tag-wrapper" data-id="1" data-type="start-tag">'+
      '<span class="ue-tag ue-tag-start">cf</span>' +
      '&zwnj;'+
    '</span>' +
    '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="1">'+
        '<span class="ue-text">sample</span>' +
    '</div>' +
    '<span class="ue-tag-wrapper" data-id="1" data-type="end-tag">'+
        '<span class="ue-tag ue-tag-start">cf</span>' +
        '&zwnj;'+
    '</span></div>'
    );

    while(sample.childNodes.length > 0){
      child = sample.childNodes[0];
      documentFragment.appendChild(child);
    }
  }
});
},{"../../../assets/js/ue/Helpers":5,"../../../assets/js/ue/selection":34,"../../support/KeyboardBindingsObjectMother":100,"chai":46}],118:[function(require,module,exports){
/* File: MouseCtrlClickHandler_acceptance_test.js */
/* jshint undef: true, unused: true */
/* globals describe, it, beforeEach, afterEach */
'use strict';

var assert = require('chai').assert;
var h = require('../../../assets/js/ue/Helpers').stringToHTMLElement;
var MouseHandlerFixture = require('./MouseHandlersFixture');
var MouseCtrlClickHandler = require('../../../assets/js/ue/mouse/CtrlClickHandler');
var FakeEvent = require('../../support/FakeEvent');
var NodeWalker = require('../../../assets/js/ue/selection').NodeWalker;

describe('MouseCtrlClickHandler:acceptance', function () {
  var source = h('<div class="ue-source"/>'),
    target = h('<div class="ue-target"/>'),
    fixture,
    fixtureEl,
    clickedTag,
    targetNode,
    targetOffsetRangeStart = 2,
    targetOffsetRangeEnd = 5,
    selection,
    range,
    ctrlClickHandler,
    ev = new FakeEvent(),
    expectedTagInTarget;

  function tagPairFixtureSetup() {
    source.appendChild(fixture.sourceWithTagPair());
    target.appendChild(fixture.targetWithText());

    clickedTag = source.querySelector('.ue-tag-wrapper');
    targetNode = target.querySelector('.ue-text').childNodes[0];

    fixtureEl.appendChild(source);
    fixtureEl.appendChild(target);
    document.body.appendChild(fixtureEl);

    ctrlClickHandler = new MouseCtrlClickHandler();

    ev.setCurrentTarget(clickedTag);
    ev.setCtrlKey(true);
    ev.setLeftButtonPressed();
  }

  function placeholderFixtureSetup() {
    source.appendChild(fixture.sourceWithPlaceholder());
    target.appendChild(fixture.targetWithText());


    clickedTag = source.querySelector('.ue-tag-wrapper');
    targetNode = target.querySelector('.ue-text').childNodes[0];

    fixtureEl.appendChild(source);
    fixtureEl.appendChild(target);
    document.body.appendChild(fixtureEl);

    ctrlClickHandler = new MouseCtrlClickHandler();

    ev.setCurrentTarget(clickedTag);
    ev.setCtrlKey(true);
    ev.setLeftButtonPressed();
  }

  function rangeSelection() {
    selection = document.getSelection();
    range = document.createRange();
    // caret selection
    range.setStart(targetNode, targetOffsetRangeStart);
    range.setEnd(targetNode, targetOffsetRangeEnd);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function caretSelection() {
    selection = document.getSelection();
    range = document.createRange();
    // caret selection
    range.setStart(targetNode, targetOffsetRangeStart);
    range.setEnd(targetNode, targetOffsetRangeStart);

    selection.removeAllRanges();
    selection.addRange(range);
  }

  function documentCleanup() {
    document.body.removeChild(fixtureEl);
    source.innerHTML = '';
    target.innerHTML = '';
    fixture.innerHTML = '';
  }

  beforeEach(function () {
    fixture = new MouseHandlerFixture();
    fixtureEl = h('<div id="fixture"/>');
  });

  describe('tag pair copy behavior', function () {
    afterEach(function () {
      documentCleanup();
    });

    beforeEach(function () {
      tagPairFixtureSetup();
      rangeSelection();
    });

    it('copies selected start tag pair from source to target', function () {

      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelector('.ue-tag-wrapper');

      assert.equal(expectedTagInTarget.dataset.type, 'start-tag', 'start tag is moved in target segment');
    });

    it('removes .active css class from start tag', function () {
      clickedTag.firstChild.classList.add('active');

      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelector('.ue-tag-wrapper').firstChild;

      assert.isFalse(expectedTagInTarget.classList.contains('active'), '.active css class was removed from start tag');
    });

    it('changes the canCopy attribute to false on tag start', function () {
      var startTag;

      ctrlClickHandler.handle(ev);

      startTag = target.querySelector('.ue-tag-start').parentNode;
      assert.equal(startTag.dataset.tagCopy, 'false', 'tag copy is set to false');
    });

    it('changes the canCopy attribute to false on tag end', function () {
      var endTag;

      ctrlClickHandler.handle(ev);

      endTag = target.querySelector('.ue-tag-end').parentNode;
      assert.equal(endTag.dataset.tagCopy, 'false', 'tag copy is set to false');
    });

    it('copies selected end tag pair from source to target', function () {
      clickedTag = source.querySelectorAll('.ue-tag-wrapper').item(1);
      ev.setCurrentTarget(clickedTag);

      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelectorAll('.ue-tag-wrapper').item(1);

      assert.equal(expectedTagInTarget.dataset.type, 'end-tag', 'start tag is moved in target segment');
    });

    it('removes the .active css class from end-tag', function () {
      clickedTag = source.querySelectorAll('.ue-tag-wrapper').item(1);
      clickedTag.firstChild.classList.add('active');
      ev.setCurrentTarget(clickedTag);

      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelectorAll('.ue-tag-wrapper').item(1).firstChild;

      assert.isFalse(expectedTagInTarget.classList.contains('active'), '.active css class was removed');
    });
  });


  describe('placeholder copy behavior', function () {
    beforeEach(function () {

      placeholderFixtureSetup();

      rangeSelection();
    });

    afterEach(function () {
      documentCleanup();
    });

    it('copies the placeholder from source to target', function () {
      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelector('.ue-tag-wrapper');

      assert.equal(expectedTagInTarget.dataset.type, 'placeholder', 'start tag is moved in target segment');
    });

    it('removes the .active css class from the placeholder', function () {
      clickedTag.firstChild.classList.add('active');

      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelector('.ue-tag-wrapper').firstChild;

      assert.isFalse(expectedTagInTarget.classList.contains('active'), '.active css class was removed');
    });

    it('changes the tagCopy to false on placeholder', function () {
      ctrlClickHandler.handle(ev);

      expectedTagInTarget = target.querySelector('.ue-tag-wrapper');

      assert.equal(expectedTagInTarget.dataset.tagCopy, 'false', 'tagCopy has been changed to false');
    });

  });

  describe('placeholder caret position after copy', function () {
    var focusNode;

    beforeEach(function () {
      placeholderFixtureSetup();
      caretSelection();
    });

    afterEach(function () {
      documentCleanup();
    });

    it('places the cursor after the placeholder on the invisible character', function (doneAsync) {
      ctrlClickHandler.handle(ev);

      _.delay(function () {
        selection = document.getSelection();
        focusNode = new NodeWalker(selection.focusNode);
        assert.isTrue(focusNode.isInvisibleChar(), 'focus is set on invisible char');
        doneAsync();
      });
    });

    it('places the cursor inside the placeholder tag', function (doneAsync) {
      var parentNode;
      ctrlClickHandler.handle(ev);

      _.delay(function () {
        selection = document.getSelection();
        focusNode = new NodeWalker(selection.focusNode);
        parentNode = focusNode.parent();
        assert.isTrue(parentNode.isPlaceholder(), 'focus is inside placeholder');
        doneAsync();
      });
    });
  });

  describe('tag pair caret position after copy', function () {
    var focusNode,
        parentNode;

    beforeEach(function () {
      tagPairFixtureSetup();
      caretSelection();
    });

    afterEach(function () {
      documentCleanup();
    });

    it('places the cursor on the invisible character', function (doneAsync) {

      ctrlClickHandler.handle(ev);

      _.delay(function () {
        selection = document.getSelection();
        focusNode = new NodeWalker(selection.focusNode);
        assert.isTrue(focusNode.isInvisibleChar(), 'focus is set on invisible char');
        doneAsync();
      });
    });

    it('places the cursor inside the start tag', function (doneAsync) {

      ctrlClickHandler.handle(ev);

      _.delay(function () {
        selection = document.getSelection();
        focusNode = new NodeWalker(selection.focusNode);
        parentNode = focusNode.parent();
        assert.isTrue(parentNode.isStartTag(), 'invisible text node parent is start tag');
        doneAsync();
      });
    });
  });

  describe('tag pair content selection', function () {
    var focusNode,
        parentNode;

    beforeEach(function () {
      tagPairFixtureSetup();
      rangeSelection();
    });

    afterEach(function () {
      documentCleanup();
    });

    it('selects the inner content', function () {

      ctrlClickHandler.handle(ev);

      selection = document.getSelection();
      focusNode = new NodeWalker(selection.focusNode);
      parentNode = focusNode.parent();
      assert.isTrue(focusNode.isTextNode(), 'focus is set on text node');
      assert.isTrue(parentNode.isInlineContent(), 'focus is inside inline content');
    });

  });
});

},{"../../../assets/js/ue/Helpers":5,"../../../assets/js/ue/mouse/CtrlClickHandler":30,"../../../assets/js/ue/selection":34,"../../support/FakeEvent":95,"./MouseHandlersFixture":121,"chai":46}],119:[function(require,module,exports){
/* File: MouseCtrlClickHandler_test.js */
/* jshint undef: true, unused: true */
/* globals describe, beforeEach, it */
'use strict';
var MouseCtrlClickHandler = require('../../../assets/js/ue/Mouse').CtrlClickHandler;
var MouseHandlersFixture = require('./MouseHandlersFixture');
var assert = require('chai').assert;

describe('MouseCtrlClickHandler', function () {
  var ctrlClickHandler,
      fixture,
      html,
      siblingTag,
      startTagPair,
      endTagPair,
      placeholder,
      inlineContent,
      inlineContentClone,
      tagElements;

  beforeEach(function () {
    ctrlClickHandler = new MouseCtrlClickHandler();
    fixture = new MouseHandlersFixture();
  });

});

},{"../../../assets/js/ue/Mouse":11,"./MouseHandlersFixture":121,"chai":46}],120:[function(require,module,exports){
/* File: CtrlHoverHandler.js */
/* jshint undef: true, unused: true */
/* globals describe, beforeEach, it*/
'use strict';
var Mouse = require('../../../assets/js/ue/Mouse');
var FakeEvent = require('../../support/FakeEvent');

var assert = require('chai').assert;
var h = require('../../../assets/js/ue/Helpers').stringToHTMLElement;

describe('MouseCtrlHoverHandler', function () {
  var mouseEvent,
      currentTarget,
      child,
      mouseCtrlHoverHandler;

  describe('#mouseOver', function () {
    beforeEach(function () {
      currentTarget = h('<div class="ue-tag-wrapper"><span class="ue-tag"/></div>');
      child = currentTarget.firstChild;

      mouseEvent = new FakeEvent();
      mouseEvent.setCtrlKey(true);
      mouseEvent.setType('mouseover');

      mouseEvent.setCurrentTarget(currentTarget);

      mouseCtrlHoverHandler = new Mouse.CtrlHoverHandler();
    });

    it('adds the .active css class to currentTarget children', function () {
      mouseCtrlHoverHandler.mouseOver(mouseEvent);

      assert(child.classList.contains('active'), '.active class has been added to the current target child node');
    });

    describe('when ctrl is not pressed', function () {
      beforeEach(function () {
        mouseEvent.setCtrlKey(false);
      });

      it('does not add the .active css class to currentTarget children', function () {
        mouseCtrlHoverHandler.mouseOver(mouseEvent);

        assert.isFalse(child.classList.contains('active'), '.active class has been added to the current target child node');
      });
    });

    describe('when event.type is not mouseover', function () {
      beforeEach(function () {
        mouseEvent.setType('something-else');
      });

      it('does not add the .active css class to currentTarget children', function () {
        mouseCtrlHoverHandler.mouseOver(mouseEvent);

        assert.isFalse(child.classList.contains('active'), '.active class has been added to the current target child node');
      });
    });
  });

  describe('#mouseLeave', function () {
    beforeEach(function () {
      currentTarget = h('<div class="ue-tag-wrapper"><span class="ue-tag active"/></div>');
      child = currentTarget.firstChild;

      mouseEvent = new FakeEvent();
      mouseEvent.setCtrlKey(true);
      mouseEvent.setType('mouseleave');

      mouseEvent.setCurrentTarget(currentTarget);

      mouseCtrlHoverHandler = new Mouse.CtrlHoverHandler();
    });

    it('removes the .active css class from the current target child nodes', function () {
      mouseCtrlHoverHandler.mouseLeave(mouseEvent);

      assert.isFalse(child.classList.contains('active'), 'the .active class has been removed from the current target child node');
    });

    describe('when the event.type is not mouseleave', function () {
      beforeEach(function () {
        mouseEvent.setType('something-else');
      });
      it('does not remove the .active class', function () {
        mouseCtrlHoverHandler.mouseLeave(mouseEvent);

        assert(child.classList.contains('active'), 'the .active class has been preserved from the current target child node');
      });
    });
  });
});



},{"../../../assets/js/ue/Helpers":5,"../../../assets/js/ue/Mouse":11,"../../support/FakeEvent":95,"chai":46}],121:[function(require,module,exports){
/* File: MouseHandlersFixture.js */
/* jshint undef: true, unused: true */
'use strict';
var proto;
var h;

h = require('../../../assets/js/ue/Helpers').stringToHTMLElement;

function MouseHandlersFixture() {
}

proto = MouseHandlersFixture.prototype;

proto.sourceWithTagPair = function () {
  var result;

  result = h(
    '<div class="ue-segment" data-source-segment-number="3" data-source-puid="d5827fd9-db8b-4d05-9c53-8e0244c8b3bb" style="height: 27px;">' +
      '<div class="ue-inline-content">' +
        '<span class="ue-tag-wrapper" data-type="start-tag" data-tag-copy="true" data-id="19" data-metadata="undefined" data-can-hide="false">' +
          '<span class="ue-tag ue-tag-start" contenteditable="false">[start-tag]</span>‌' +
        '</span>' +
      '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="19" data-definitionid="5" data-metadata="undefined">' +
          '<span class="ue-text" data-type="text"> is an organized collection of </span>' +
          '<span class="ue-text" data-type="text">.</span>' +
      '</div>' +
      '<span class="ue-tag-wrapper" data-type="end-tag" data-tag-copy="true" data-id="19" data-metadata="undefined" data-can-hide="false">' +
        '<span class="ue-tag ue-tag-end" contenteditable="false">[end-tag]</span>‌' +
      '</span>' +
      '</div>' +
    '</div>'
  );

  return result;
};

proto.sourceWithPlaceholder = function () {
  var result;

  result = h(
      '<div class="ue-segment" data-source-segment-number="3" data-source-puid="d5827fd9-db8b-4d05-9c53-8e0244c8b3bb" style="height: 27px;">' +
        '<div class="ue-inline-content">' +
          '<span class="ue-tag-wrapper" data-type="placeholder" data-id="42" data-definitionid="9" data-metadata="8500022-14032959-2509131" data-tag-copy="true">' +
            '<span class="ue-tag" contenteditable="false">x</span>' +
          '‌</span>' +
        '</div>' +
      '</div>'
  );

  return result;

};

proto.targetWithText = function () {
  var sample;

  sample = h(
    '<div class="ue-segment ue-row-active" data-segment-number="2" data-puid="b52674d3-9dc4-4252-a821-38667613c042" style="height: 27px;">' +
      '‌<div class="ue-inline-content">' +
        '<span class="ue-text" data-type="text">Banco fornecaedores</span>' +
      '</div>' +
    '</div>'
  );

  return sample;
};

module.exports = MouseHandlersFixture;

},{"../../../assets/js/ue/Helpers":5}],122:[function(require,module,exports){
/* File: TagContentBuilder_test.js */
/* jshint undef: true, unused: true */
/* globals require, describe, it */

'use strict';

var TagContentBuilder = require('../../../assets/js/ue/renderer/TagContentBuilder');

var sinon = require('sinon');
var assert = require('chai').assert;

describe('TagContentBuilder', function () {
  var builder = new TagContentBuilder();
  var strategies = {
    test_strategy: function () { return true; }
  };

  describe('constructor', function () {
    it('should instantiate the new class', function () {
      assert.instanceOf(builder, TagContentBuilder, 'and builder will be a TagContentBuilder instance');
    });
  });
});
},{"../../../assets/js/ue/renderer/TagContentBuilder":33,"chai":46,"sinon":78}],123:[function(require,module,exports){
/* File: NodeWalker_test.js */
/* globals describe, it */
'use strict';

var assert = require('chai').assert;
var Helpers = require('../../../assets/js/ue/Helpers');
var h = Helpers.stringToHTMLElement;
var Tmpl = require('../../../assets/js/ue/Tmpl');
var Selection = require('../../../assets/js/ue/Selection');

describe('Selection.NodeWalker', function () {
  describe('#append( node )', function () {
    it('adds the given node as a child', function () {
      var nodeEl,
          carriageReturnNode,
          node;

      nodeEl = Helpers.stringToHTMLElement('<div/>');
      carriageReturnNode = Helpers.stringToHTMLElement('\n');
      node = new Selection.NodeWalker(nodeEl);

      node.append(carriageReturnNode);

      assert(carriageReturnNode.parentNode === nodeEl, 'carriageReturn node is a child of node');
    });
  });

  describe('#prepend( node )', function () {
    it('adds the given node as the first child', function () {
      var nodeEl = h('<div/>'),
          node = new Selection.NodeWalker(nodeEl),
          prependedNode1 = h('<span class="first"/>'),
          prependedNode2 = h('<span class="second"/>');

      node.prepend(prependedNode1);
      node.prepend(prependedNode2);

      assert.equal(node.firstChild().el, prependedNode2, 'second element has been inserted before the first');
      assert.equal(node.lastChild().el, prependedNode1, 'first element is at the end of the container');
    });
  });

  describe('#isInvisibleChar ()', function () {
    it('returns true when the the node is composed of the zero width non-joiner character', function () {
      var el,
          node,
          isInvisibleChar;

      el = Helpers.stringToHTMLElement(Tmpl.zwnj);
      node = new Selection.NodeWalker(el);
      isInvisibleChar = node.isInvisibleChar();

      assert.isTrue(isInvisibleChar, 'node is an invisible character');
    });
  });

  describe('#isInlineContent ()', function () {
    it('return true when the node has ue-inline-content', function () {
      var el,
          node;

      el = Helpers.stringToHTMLElement('<div class="ue-inline-content"/>');
      node = new Selection.NodeWalker(el);

      assert.isTrue(node.isInlineContent(), 'node is inline content');
    });
  });

  describe('#isElement (name)', function () {
    describe('when name is not provided', function () {
      it('only checks if the nodeType is Element', function () {
        var node = Helpers.stringToHTMLElement('<br/>');
        var nodeWalker = new Selection.NodeWalker(node);
        var result;

        result = nodeWalker.isElement();

        assert.isTrue(result, 'node is reported as element');
      });
    });

    describe('when name is provided', function () {
      it('also checks the nodeName for a match', function () {
        var node = Helpers.stringToHTMLElement('<br/>');
        var nodeWalker = new Selection.NodeWalker(node);
        var result;

        result = nodeWalker.isElement("br");

        assert.isTrue(result, 'node is reported as element');
      });
    });

  });

  describe('#insertAfter', function () {
    it('inserts the specified HTML node after the current one', function () {
      var node = Helpers.stringToHTMLElement('<test/>');
      var insertedAfter = Helpers.stringToHTMLElement('<demo/>');
      var nodeWalker = new Selection.NodeWalker(node);

      nodeWalker.insertAfter(insertedAfter);

      assert.equal(nodeWalker.next().el, insertedAfter, 'the node has been inserted after');
    });

    it('inserts the specified NodeWalker node after the current one', function () {
      var node = Helpers.stringToHTMLElement('<test/>');
      var insertedAfter = Helpers.stringToHTMLElement('<demo/>');
      var nodeWalker = new Selection.NodeWalker(node);
      var insertedAfterNodeWalker = new Selection.NodeWalker(insertedAfter);

      nodeWalker.insertAfter(insertedAfterNodeWalker);

      assert(nodeWalker.next().equals(insertedAfterNodeWalker), 'the node has been inserted after');
    });
  });

  describe('#append', function () {
    it('appends a HTML node', function () {
      var node = Helpers.stringToHTMLElement('<test/>');
      var appendedNode = Helpers.stringToHTMLElement('<demo/>');
      var nodeWalker = new Selection.NodeWalker(node);

      nodeWalker.append(appendedNode);

      assert.equal(nodeWalker.firstChild().el, appendedNode, 'the node has been appended');
    });

    it('appends a NodeWalker node', function () {

      var node = Helpers.stringToHTMLElement('<test/>');
      var appendedNode = Helpers.stringToHTMLElement('<demo/>');
      var nodeWalker = new Selection.NodeWalker(node);
      var appendedNodeWalker = new Selection.NodeWalker(appendedNode);

      nodeWalker.append(appendedNodeWalker);

      assert(nodeWalker.firstChild().equals(appendedNodeWalker), 'the node has been appended');
    });
  });

  describe('#textContent', function () {
    it('returns the textContent of the node', function () {
      var exampleNode = Helpers.stringToHTMLElement('<test>text</test>');
      var nodeWalker = new Selection.NodeWalker(exampleNode);

      assert.equal('text', nodeWalker.textContent());
    });
  });

  describe('#forEachChild( callback(NodeWalker) )', function () {
    it('iterates through all childNodes and passes the child as a reference to the callback', function () {
      var container = h('<container><node1></node1>' +
        '<node2></node2>' +
        '<node3><node4/></node3>' +
        '</container>'),
        walker = new Selection.NodeWalker(container),
        collectedChildren = [];

      walker.forEachChild(function (childWalker) {
        collectedChildren.push(childWalker);
      });

      assert.equal(3, collectedChildren.length, 'all children have been given');
    });
  });

});
},{"../../../assets/js/ue/Helpers":5,"../../../assets/js/ue/Selection":18,"../../../assets/js/ue/Tmpl":21,"chai":46}],124:[function(require,module,exports){
/* File: SelectionContext_test.js */
/* jshint undef: true, unused: true */
/* globals describe, it, beforeEach, afterEach */
'use strict';
var assert = require('chai').assert;
var SelectionContextObjectMother = require('../../support/SelectionContextObjectMother');
var Selection = require('../../../assets/js/ue/selection');
var FakeNode = require('../../support/FakeNode');

describe('SelectionContext', function () {
  var selectionContext,
      selection,
      objectMother,
      htmlFragment;
  beforeEach(function () {
    objectMother = new SelectionContextObjectMother();

    objectMother.stubSelection();

    selectionContext = new Selection.SelectionContext();
    htmlFragment = document.createDocumentFragment();
  });

  afterEach(function () {
    objectMother.restoreSelection();
  });

  it('calls document#getSelection', function () {
    assert(document.getSelection.called, 'document#getSelection was expected to be called');
  });

  it('assigns selection instance', function () {
    assert.isNotNull(selectionContext.selection, 'selection instance should have been assigned');
  });

  it('assigns range instance', function () {
    assert.isNotNull(selectionContext.range, 'range instance should have been assigned');
  });

  it('assigns focusNode and focusOffset', function () {
    assert.isNotNull(selectionContext.focusNode, 'focusNode should have been assigned');
    assert.equal(selectionContext.focusOffset, 0);
  });

  it('assigns range properties', function () {
    assert.isNotNull(selectionContext.commonAncestorContainer);
    assert.isNotNull(selectionContext.startContainer);
    assert.isNotNull(selectionContext.endContainer);
    assert.equal(selectionContext.startOffset, objectMother.fakeRange.startOffset);
    assert.equal(selectionContext.endOffset, objectMother.fakeRange.endOffset);
  });

  describe('when focusNode#parentNode is null', function () {
    it('assigns false to hasFocusNodeParent ', function () {
      assert.isFalse(selectionContext.hasFocusNodeParent);
    });

    it('does not assign to focusNodeParent', function () {
      assert.isUndefined(selectionContext.focusNodeParent);
    });
  });

  describe('when focusNode#parentNode is not null', function () {
    beforeEach(function () {
      objectMother.defineFocusNodeParent();
      selectionContext = new Selection.SelectionContext();
    });

    it('assigns true to hasFocusNodeParent', function () {
      assert.isTrue(selectionContext.hasFocusNodeParent);
    });

    it('assigns focusNodeParent', function () {
      assert.isNotNull(selectionContext.focusNodeParent);
    });

  });

  describe('focusNode, startContainer, endContainer have nodeType different from TextNodeType(value: 3)', function () {
    it('sets isFocusTextNode to false', function () {
      assert.isFalse(selectionContext.isFocusTextNode);
    });

    it('sets isStartContainerTextNode to false', function () {
      assert.isFalse(selectionContext.isStartContainerTextNode);
    });

    it('sets isEndContainerTextNode to false', function () {
      assert.isFalse(selectionContext.isEndContainerTextNode);
    });
  });

  describe('focusNode, startContainer, endContainer have nodeType TextNode(value:3)', function () {
    beforeEach(function () {
      objectMother.assignTextNodes();
      selectionContext = new Selection.SelectionContext();
    });
    it('sets isFocusTextNode to false', function () {
      assert.isTrue(selectionContext.isFocusTextNode);
    });

    it('sets isStartContainerTextNode to false', function () {
      assert.isTrue(selectionContext.isStartContainerTextNode);
    });

    it('sets isEndContainerTextNode to false', function () {
      assert.isTrue(selectionContext.isEndContainerTextNode);
    });
  });

  describe('#isCollapsed', function () {
    describe('when range is not collapsed', function () {
      beforeEach(function () {
        objectMother.setRangeCollapsed(false);
        selectionContext = new Selection.SelectionContext();
      });

      it('returns false', function () {
        assert.isFalse(selectionContext.isCollapsed());
      });
    });

    describe('when range is collapsed', function () {
      beforeEach(function () {
        objectMother.setRangeCollapsed(true);
        selectionContext = new Selection.SelectionContext();
      });

      it('returns true', function () {
        assert.isTrue(selectionContext.isCollapsed());
      });
    });
  });

  describe('#cloneContents', function () {
    it('calls range#cloneContents', function () {
      selectionContext.cloneContents();

      assert(selectionContext.range.cloneContents.called, 'range#cloneContents was not called');
    });
  });

  describe('#deleteContents', function () {
    it('calls range#deleteContents', function () {
      selectionContext.deleteContents();

      assert(selectionContext.range.deleteContents.called, 'range#deleteContents was not called');
    });
  });

  describe('#insertNode', function () {
    it('calls range#insertNode', function () {
      selectionContext.insertNode(htmlFragment);

      assert(selectionContext.range.insertNode.called, 'range#insertNode was called');
    });
  });

  describe('#hasCommonAncestorClass', function () {
    it('checks the commonAncestorContainer to see if it has the given class', function () {
      selectionContext.commonAncestorContainer = new FakeNode().withClass('ue-editable');

      assert.isTrue(selectionContext.hasCommonAncestorClass('ue-editable'));
    });

    it("returns false when commonAncestorContainer doesn't have the provided className", function () {
      selectionContext.commonAncestorContainer = new FakeNode().withClass('ue-inline-content');

      assert.isFalse(selectionContext.hasCommonAncestorClass('ue-editable'));
    });
  });

});

},{"../../../assets/js/ue/selection":34,"../../support/FakeNode":96,"../../support/SelectionContextObjectMother":102,"chai":46}],125:[function(require,module,exports){
/* File: MouseCtrlClickHandler_test.js */
/* jshint undef: true, unused: true */
/* globals describe, beforeEach, it */
'use strict';
var h = require('../../../assets/js/ue/Helpers').stringToHTMLElement,
    assert = require('chai').assert,
    NodeWalker = require('../../../assets/js/ue/selection').NodeWalker,
    TagPair = require('../../../assets/js/ue/selection').TagPair;


describe('TagPair', function () {
  var startTag,
      inlineContent,
      endTag,
      segmentContent,
      segment,
      tagPair,
      tagElements,
      placeholder,
      tagStructure;

  beforeEach(function () {
    segment = h(
        '<div class="ue-segment" data-source-segment-number="3" data-source-puid="d5827fd9-db8b-4d05-9c53-8e0244c8b3bb" style="height: 27px;">' +
          '<div class="ue-inline-content">' +
            '<span class="ue-tag-wrapper" data-type="start-tag" data-tag-copy="true" data-id="19" data-metadata="undefined" data-can-hide="false">' +
              '<span class="ue-tag ue-tag-start" contenteditable="false">[start-tag]</span>‌' +
            '</span>' +
            '<div class="ue-inline-content ue-tagpair-content" data-type="tagpair" data-id="19" data-definitionid="5" data-metadata="undefined">' +
              '<span class="ue-text" data-type="text"> is an organized collection of </span>' +
              '<span class="ue-text" data-type="text">.</span>' +
            '</div>' +
            '<span class="ue-tag-wrapper" data-type="end-tag" data-tag-copy="true" data-id="19" data-metadata="undefined" data-can-hide="false">' +
              '<span class="ue-tag ue-tag-end" contenteditable="false">[end-tag]</span>‌' +
            '</span>' +
            '<span class="ue-tag-wrapper" data-type="placeholder" data-id="42" data-definitionid="9" data-metadata="8500022-14032959-2509131" data-tag-copy="true">' +
              '<span class="ue-tag" contenteditable="false">x</span>' +
            '‌</span>' +
          '</div>' +
        '</div>'
    );
    segmentContent = segment.firstChild;
    startTag = segmentContent.firstChild;
    inlineContent = segmentContent.childNodes[1];
    endTag = segmentContent.childNodes[2];
    placeholder = segmentContent.childNodes[3];
  });

  it('creates a valid instance, from start-tag', function () {
    tagPair = new TagPair(startTag);

    assert(tagPair.isValid(), 'valid tag pair created');
  });

  it('creates a valid instance, from inlineContent', function () {
    tagPair = new TagPair(inlineContent);

    assert(tagPair.isValid(), 'valid tag pair created');
  });

  it('creates a valid instance, from end-tag', function () {
    tagPair = new TagPair(endTag);

    assert(tagPair.isValid(), 'valid tag pair created');
  });

  it('creates a valid instance, from a node walker', function () {
    tagPair = new TagPair(new NodeWalker(startTag));

    assert(tagPair.isValid(), 'valid tag pair created');
  });

  it('can\'t create a valid instance from placeholder', function () {
    tagPair = new TagPair(placeholder);

    assert.isFalse(tagPair.isValid(), 'valid tag pair can\'t be created from placeholder');
  });

  describe('#cloneStructure', function () {
    it('clones all the tags, and returns a documentFragment with the tags', function () {
      tagPair = new TagPair(inlineContent);

      tagStructure = tagPair.cloneStructure();
      assert.isNotNull(tagStructure.childNodes[0], 'startTagEl is assigned to');
      assert.isNotNull(tagStructure.childNodes[1], 'inlineContentEl is assigned to');
      assert.isNotNull(tagStructure.childNodes[2], 'endTagEl is assigned to');
    });

    it('does not keep the inline content', function () {
      tagPair = new TagPair(inlineContent);

      tagStructure = tagPair.cloneStructure();

      assert.equal(0, tagStructure.childNodes[1].childNodes.length, 'valid tag pair clone was created');
    });
  });

  describe('#toArray', function () {
    tagPair = new TagPair(startTag);

    tagElements = tagPair.toArray();

    assert.lengthOf(tagElements, 3, 'three elements are returned');
    assert(tagPair.startTagEl === tagElements[0], 'first element is start tag');
    assert(tagPair.inlineContentEl === tagElements[1], 'second element is start tag');
    assert(tagPair.endTagEl === tagElements[2], 'third element is start tag');
  });
});

},{"../../../assets/js/ue/Helpers":5,"../../../assets/js/ue/selection":34,"chai":46}]},{},[1,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125])