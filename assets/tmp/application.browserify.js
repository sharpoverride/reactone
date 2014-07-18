!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),(f.SDL||(f.SDL={})).UE=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/* File: application.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

module.exports = _dereq_('./ue/UE.js');
},{"./ue/UE.js":22}],2:[function(_dereq_,module,exports){
/* File: CommandManager.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var Commands = _dereq_('./commands/EditorCommands');

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
},{"./commands/EditorCommands":23}],3:[function(_dereq_,module,exports){
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
var config = _dereq_('./config');
var Helpers = _dereq_('./Helpers');

var Storage = _dereq_('./Storage');
var MarkupDataFactory = _dereq_('./MarkupDataFactory');
var TranslationOrigin = _dereq_('./TranslationOrigin');
var Mediator = _dereq_('./Mediator');

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

},{"./Helpers":5,"./MarkupDataFactory":9,"./Mediator":10,"./Storage":19,"./TranslationOrigin":21,"./config":24}],4:[function(_dereq_,module,exports){
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

var config = _dereq_('./config');
var Helpers = _dereq_('./Helpers');
var DataProvider = _dereq_('./DataProvider');
var Paragraphs = _dereq_('./Paragraphs');



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
},{"./DataProvider":3,"./Helpers":5,"./Paragraphs":13,"./config":24}],5:[function(_dereq_,module,exports){
/* File: Documents.js */
/* jshint undef: true, unused: true */
/* globals require, module, Handlebars */
'use strict';

var config = _dereq_('./config');

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
},{"./config":24}],6:[function(_dereq_,module,exports){
/* File: Keyboard.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var shiftEnterHandler = _dereq_('./keyboard/ShiftEnterHandler');
var segmentUnderCurrentSelection = _dereq_('./keyboard/SegmentUnderCurrentSelection');

module.exports = {
  ShiftEnterHandler: shiftEnterHandler,
  SegmentUnderCurrentSelection: segmentUnderCurrentSelection
};
},{"./keyboard/SegmentUnderCurrentSelection":26,"./keyboard/ShiftEnterHandler":27}],7:[function(_dereq_,module,exports){
/* File: KeyboardBingings.js */
/* jshint undef: true, unused: true */
/* globals $, _, require, module */
'use strict';

var dataProvider = _dereq_('./DataProvider');
var segmentWatcher = _dereq_('./SegmentsWatcher');
var Mediator = _dereq_('./Mediator');
var tmpl = _dereq_('./Tmpl');
var helpers = _dereq_('./Helpers');

var Segment = _dereq_('./Segment');
var Selection = _dereq_('./Selection');
var Keyboard = _dereq_('./Keyboard');
var Mouse = _dereq_('./Mouse');
var CommandManager = _dereq_('./CommandManager');

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
},{"./CommandManager":2,"./DataProvider":3,"./Helpers":5,"./Keyboard":6,"./Mediator":10,"./Mouse":11,"./Segment":14,"./SegmentsWatcher":16,"./Selection":17,"./Tmpl":20}],8:[function(_dereq_,module,exports){
/* File: Layout.js */
/* jshint undef: true, unused: true */
/* globals _, require, module */

'use strict';

var Helpers = _dereq_('./Helpers');
var Tmpl = _dereq_('./Tmpl');
var Mediator = _dereq_('./Mediator');
var RibbonMenuCommands = _dereq_('./layout/RibbonMenuCommands');

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
},{"./Helpers":5,"./Mediator":10,"./Tmpl":20,"./layout/RibbonMenuCommands":28}],9:[function(_dereq_,module,exports){
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
    dataProvider = dataProvider || _dereq_('./DataProvider');
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
},{"./DataProvider":3}],10:[function(_dereq_,module,exports){
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



var EventEmitter = _dereq_('events').EventEmitter,
    Mediator = new EventEmitter();

// Method aliases
Mediator.publish = Mediator.emit;
Mediator.subscribe = Mediator.on;
Mediator.unsubscribe = Mediator.removeListener;
Mediator.subscribe_once = Mediator.once;
// Mediator.subscribe_recoup = events.recoup;

module.exports = Mediator;
},{"events":37}],11:[function(_dereq_,module,exports){
/* File: Mouse.js */
'use strict';
var CtrlHoverHandler = _dereq_('./mouse/CtrlHoverHandler');
var CtrlClickHandler = _dereq_('./mouse/CtrlClickHandler');

module.exports = {
  CtrlHoverHandler: CtrlHoverHandler,
  CtrlClickHandler: CtrlClickHandler
};
},{"./mouse/CtrlClickHandler":29,"./mouse/CtrlHoverHandler":30}],12:[function(_dereq_,module,exports){
/* File: NodeWrapper.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var Helpers = _dereq_('./Helpers');
var DataProvider = _dereq_('./DataProvider');
var TranslationOrigin = _dereq_('./TranslationOrigin');

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
},{"./DataProvider":3,"./Helpers":5,"./TranslationOrigin":21}],13:[function(_dereq_,module,exports){
/* File: Paragraphs.js */
/* jshint undef: true, unused: true */
/* globals $, require, module, Event */
'use strict';

/**
 *  Paragraphs module
 */

var DataProvider = _dereq_('./DataProvider');
var SegmentsWatcher = _dereq_('./SegmentsWatcher');
var SideBySideParagraphUnitsRenderer = _dereq_('./SideBySideParagraphUnitsRenderer');
var KeyboardBindings = _dereq_('./KeyboardBindings');

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
},{"./DataProvider":3,"./KeyboardBindings":7,"./SegmentsWatcher":16,"./SideBySideParagraphUnitsRenderer":18}],14:[function(_dereq_,module,exports){
/* File: Segment.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var DataProvider = _dereq_('./DataProvider');
var TranslationOrigin = _dereq_('./TranslationOrigin');

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
},{"./DataProvider":3,"./TranslationOrigin":21}],15:[function(_dereq_,module,exports){
/* File: SegmentStatusUpdater.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var Mediator = _dereq_('./Mediator');
var DataProvider = _dereq_('./DataProvider');
var Segment = _dereq_('./Segment');
var SegmentsWatcher = _dereq_('./SegmentsWatcher');
var SideBySideParagraphUnitsRenderer = _dereq_('./SideBySideParagraphUnitsRenderer');

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
},{"./DataProvider":3,"./Mediator":10,"./Segment":14,"./SegmentsWatcher":16,"./SideBySideParagraphUnitsRenderer":18}],16:[function(_dereq_,module,exports){
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
},{}],17:[function(_dereq_,module,exports){
/* File: Selection.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var nodeWalker = _dereq_('./selection/NodeWalker');
var tagPair = _dereq_('./selection/TagPair');
var selectionContext = _dereq_('./selection/SelectionContext');


module.exports = {
  NodeWalker: nodeWalker,
  SelectionContext: selectionContext,
  TagPair: tagPair
};
},{"./selection/NodeWalker":34,"./selection/SelectionContext":35,"./selection/TagPair":36}],18:[function(_dereq_,module,exports){
/* File: SideBySideParagraphUnitsRenderer.js */
/* jshint undef: true, unused: true */
/* globals _, console, require, module */
'use strict';

var config = _dereq_('./config');
var Helpers = _dereq_('./Helpers');
var Tmpl = _dereq_('./Tmpl');
var SegmentsWatcher = _dereq_('./SegmentsWatcher');
var NodeWrapper = _dereq_('./NodeWrapper');
var TagContentBuilder = _dereq_('./renderer/TagContentBuilder');
var StylesMap = _dereq_('./renderer/StylesMap');

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
},{"./Helpers":5,"./NodeWrapper":12,"./SegmentsWatcher":16,"./Tmpl":20,"./config":24,"./renderer/StylesMap":31,"./renderer/TagContentBuilder":32}],19:[function(_dereq_,module,exports){
/* File: Storage.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var config = _dereq_('./config');
var Mediator = _dereq_('./Mediator');

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
},{"./Mediator":10,"./config":24}],20:[function(_dereq_,module,exports){
/* File: Tmpl.js */
/* jshint undef: true, unused: true */
/* globals $, module */
'use strict';
var h = _dereq_ ('./Helpers').stringToHTMLElement;

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
},{"./Helpers":5}],21:[function(_dereq_,module,exports){
/* File: TranslationOrigin.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var Helpers = _dereq_('./Helpers');

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
},{"./Helpers":5}],22:[function(_dereq_,module,exports){
/* File: ue.js */
/* jshint undef: true, unused: true */
/* globals $, require, module */

'use strict';

var config = _dereq_('./config');
var DataProvider = _dereq_('./DataProvider');
var Documents = _dereq_('./Documents');
var Layout = _dereq_('./Layout');
var CommandManager = _dereq_('./CommandManager');
var SegmentStatusUpdater = _dereq_('./SegmentStatusUpdater');


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
},{"./CommandManager":2,"./DataProvider":3,"./Documents":4,"./Layout":8,"./SegmentStatusUpdater":15,"./config":24}],23:[function(_dereq_,module,exports){
/* File: EditorCommands.js */
/* jshint undef: true, unused: true */
/* globals require, module */

'use strict';

var config = _dereq_('../config');

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
},{"../config":24}],24:[function(_dereq_,module,exports){
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
},{}],25:[function(_dereq_,module,exports){
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
},{}],26:[function(_dereq_,module,exports){
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
},{}],27:[function(_dereq_,module,exports){
/* File: ShiftEnterHandler.js */
/* jshint undef: true, unused: true */
/* globals require, module */
"use strict";

var Helpers = _dereq_('../Helpers');
var SegmentsWatcher = _dereq_('../SegmentsWatcher');
var KeyboardBindings = _dereq_('../KeyboardBindings');
var Keys = _dereq_('./Keys');
var Selection = _dereq_('../selection');

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
},{"../Helpers":5,"../KeyboardBindings":7,"../SegmentsWatcher":16,"../selection":33,"./Keys":25}],28:[function(_dereq_,module,exports){
/* File: RibbonMenuCommands.js */
/* jshint undef: true, unused: true */
/* globals $, require, module */

'use strict';

var config = _dereq_('../config');
var Mediator = _dereq_('../Mediator');
var CommandManager = _dereq_('../CommandManager');

var Storage = _dereq_('../Storage');
var DataProvider = _dereq_('../DataProvider');
var Paragraphs = _dereq_('../Paragraphs');

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
},{"../CommandManager":2,"../DataProvider":3,"../Mediator":10,"../Paragraphs":13,"../Storage":19,"../config":24}],29:[function(_dereq_,module,exports){
/* File: CtrlClickHandler.js */
/* jshint undef: true, unused: true */
/* globals _ */
'use strict';
var helpers = _dereq_('../Helpers');
var dataProvider = _dereq_('../DataProvider');

var Mediator = _dereq_('../Mediator');
var Segment = _dereq_('../Segment');
var Keyboard = _dereq_('../Keyboard');
var NodeWalker = _dereq_('../selection').NodeWalker;
var TagPair = _dereq_('../selection').TagPair;
var SelectionContext = _dereq_('../selection').SelectionContext;

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
},{"../DataProvider":3,"../Helpers":5,"../Keyboard":6,"../Mediator":10,"../Segment":14,"../selection":33}],30:[function(_dereq_,module,exports){
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
},{}],31:[function(_dereq_,module,exports){
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
},{}],32:[function(_dereq_,module,exports){
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
},{}],33:[function(_dereq_,module,exports){
module.exports=_dereq_(17)
},{"./selection/NodeWalker":34,"./selection/SelectionContext":35,"./selection/TagPair":36}],34:[function(_dereq_,module,exports){
/* File: NodeWalker.js */
/* jshint undef: true, unused: true */
/* globals $, module, require */
'use strict';

var Tmpl = _dereq_('../Tmpl');

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
},{"../Tmpl":20}],35:[function(_dereq_,module,exports){
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
},{}],36:[function(_dereq_,module,exports){
/* File: MouseCtrlClickHandler_test.js */
/* jshint undef: true, unused: true */
'use strict';
var NodeWalker = _dereq_('./NodeWalker');

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

},{"./NodeWalker":34}],37:[function(_dereq_,module,exports){
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

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyJkOlxceGFtcHBcXGh0ZG9jc1xcdW5pdmVyc2FsLWVkaXRvci13ZWJcXG5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy9hcHBsaWNhdGlvbi5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvQ29tbWFuZE1hbmFnZXIuanMiLCJkOi94YW1wcC9odGRvY3MvdW5pdmVyc2FsLWVkaXRvci13ZWIvYXNzZXRzL2pzL3VlL0RhdGFQcm92aWRlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvRG9jdW1lbnRzLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9IZWxwZXJzLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9LZXlib2FyZC5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvS2V5Ym9hcmRCaW5kaW5ncy5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvTGF5b3V0LmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9NYXJrdXBEYXRhRmFjdG9yeS5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvTWVkaWF0b3IuanMiLCJkOi94YW1wcC9odGRvY3MvdW5pdmVyc2FsLWVkaXRvci13ZWIvYXNzZXRzL2pzL3VlL01vdXNlLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9Ob2RlV3JhcHBlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvUGFyYWdyYXBocy5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvU2VnbWVudC5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvU2VnbWVudFN0YXR1c1VwZGF0ZXIuanMiLCJkOi94YW1wcC9odGRvY3MvdW5pdmVyc2FsLWVkaXRvci13ZWIvYXNzZXRzL2pzL3VlL1NlZ21lbnRzV2F0Y2hlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvU2VsZWN0aW9uLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9TaWRlQnlTaWRlUGFyYWdyYXBoVW5pdHNSZW5kZXJlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvU3RvcmFnZS5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvVG1wbC5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvVHJhbnNsYXRpb25PcmlnaW4uanMiLCJkOi94YW1wcC9odGRvY3MvdW5pdmVyc2FsLWVkaXRvci13ZWIvYXNzZXRzL2pzL3VlL1VFLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9jb21tYW5kcy9FZGl0b3JDb21tYW5kcy5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvY29uZmlnLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9rZXlib2FyZC9LZXlzLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9rZXlib2FyZC9TZWdtZW50VW5kZXJDdXJyZW50U2VsZWN0aW9uLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9rZXlib2FyZC9TaGlmdEVudGVySGFuZGxlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvbGF5b3V0L1JpYmJvbk1lbnVDb21tYW5kcy5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvbW91c2UvQ3RybENsaWNrSGFuZGxlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvbW91c2UvQ3RybEhvdmVySGFuZGxlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvcmVuZGVyZXIvU3R5bGVzTWFwLmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9yZW5kZXJlci9UYWdDb250ZW50QnVpbGRlci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9hc3NldHMvanMvdWUvc2VsZWN0aW9uL05vZGVXYWxrZXIuanMiLCJkOi94YW1wcC9odGRvY3MvdW5pdmVyc2FsLWVkaXRvci13ZWIvYXNzZXRzL2pzL3VlL3NlbGVjdGlvbi9TZWxlY3Rpb25Db250ZXh0LmpzIiwiZDoveGFtcHAvaHRkb2NzL3VuaXZlcnNhbC1lZGl0b3Itd2ViL2Fzc2V0cy9qcy91ZS9zZWxlY3Rpb24vVGFnUGFpci5qcyIsImQ6L3hhbXBwL2h0ZG9jcy91bml2ZXJzYWwtZWRpdG9yLXdlYi9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9pQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4VUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFPQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKiBGaWxlOiBhcHBsaWNhdGlvbi5qcyAqL1xuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cbi8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3VlL1VFLmpzJyk7IiwiLyogRmlsZTogQ29tbWFuZE1hbmFnZXIuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cclxuXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBDb21tYW5kcyA9IHJlcXVpcmUoJy4vY29tbWFuZHMvRWRpdG9yQ29tbWFuZHMnKTtcclxuXHJcbmZ1bmN0aW9uIENvbW1hbmRNYW5hZ2VyKG9wdGlvbnMpIHtcclxuICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zIHx8IG51bGw7XHJcbiAgdGhpcy5jb21tYW5kcyA9IENvbW1hbmRzIHx8IG51bGw7XHJcbn1cclxuXHJcbnZhciBwcm90byA9IENvbW1hbmRNYW5hZ2VyLnByb3RvdHlwZTtcclxuXHJcbi8qKlxyXG4gKiBFeHNjdXRlcyBjb21tYW5kcyBmcm9tIHRoZSBkZWZhdWx0IGNvbW1hbmQgb2JqZWN0XHJcbiAqIG9yIGNvbW1hbmRzIGFkZGVkIG9uIHRoZSBmbHlcclxuICpcclxuICogQHBhcmFtICB7U3RyaW5nfSBjb21tYW5kIC0gb2JqZWN0IHByb3BlcnR5IHJlcHJlc2VudGluZyBhIGNvbW1hbmRcclxuICogQHBhcmFtICB7QW55fSBhcmdzXHJcbiAqL1xyXG5wcm90by5leGVjdXRlID0gZnVuY3Rpb24gKGNvbW1hbmQsIGFyZ3MpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBjbWRzID0gbWUuY29tbWFuZHM7XHJcblxyXG4gIC8vIEV4aXQsIG5vdGhpbmcgdG8gZXhlY3V0ZSBvciBjb21tYW5kIG5vdCBhdmFpbGFibGVcclxuICBpZiAoIWNvbW1hbmQgfHwgIWNtZHNbY29tbWFuZF0gfHwgKCFjbWRzW2NvbW1hbmRdLmhhc093blByb3BlcnR5KCdoYW5kbGUnKSAmJiAhKHR5cGVvZiBjbWRzW2NvbW1hbmRdLmhhbmRsZSA9PT0gJ2Z1bmN0aW9uJykpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAodHlwZW9mIGNvbW1hbmQgPT09ICdzdHJpbmcnKSB7XHJcbiAgICByZXR1cm4gY21kc1tjb21tYW5kXS5oYW5kbGUuY2FsbChtZSwgYXJncyB8fCBudWxsKTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuXHJcbi8qKlxyXG4gKiBEeW5hbWljYWxseSBhZGRzIGNvbW1hbmRzIHRvIHRoZSBjb21tYW5kcyBvYmplY3RcclxuICpcclxuICogQHBhcmFtIHtPYmplY3R9IGNvbW1hbmRzTGlzdFxyXG4gKi9cclxucHJvdG8uYWRkQ29tbWFuZHMgPSBmdW5jdGlvbiAoY29tbWFuZHNMaXN0KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgY29tbWFuZHMgPSBtZS5jb21tYW5kcyxcclxuICAgICAgY29tbWFuZDtcclxuXHJcbiAgZm9yIChjb21tYW5kIGluIGNvbW1hbmRzTGlzdCkge1xyXG4gICAgaWYgKGNvbW1hbmRzTGlzdC5oYXNPd25Qcm9wZXJ0eShjb21tYW5kKSkge1xyXG4gICAgICBjb21tYW5kc1tjb21tYW5kXSA9IGNvbW1hbmRzTGlzdFtjb21tYW5kXTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogRGVsZXRlIGNvbW1hbmRzIGZyb20gdGhlIGNvbW1hbmRzIG9iamVjdFxyXG4gKi9cclxucHJvdG8uZGVsZXRlQ29tbWFuZHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgY29tbWFuZHMgPSBtZS5jb21tYW5kcyxcclxuICAgICAgY29tbWFuZHNMaXN0ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcclxuXHJcbiAgY29tbWFuZHNMaXN0LmZvckVhY2goZnVuY3Rpb24gKGNvbW1hbmQpIHtcclxuICAgIGRlbGV0ZSBjb21tYW5kc1tjb21tYW5kXTtcclxuICB9KTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29tbWFuZE1hbmFnZXI7IiwiLyogRmlsZTogRGF0YVByb3ZpZGVyLmpzICovXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERhdGEgcHJvdmlkZXIgbW9kdWxlXG4gKlxuICogUHJvdmlkZXMgZGF0YSBmb3IgdGhlIGFwcGxpY2F0aW9uJ3MgbW9kdWxlcy4gQ3JlYXRlcyBhbiBpbnRlcmZhY2UgdG8gY29tbXVuaWNhdGUgd2l0aFxuICogdGhlIFN0b3JhZ2UuIFJlc3BvbnNpYmxlIGZvciBjcmVhdGluZyB1cGRhdGUgZnJhZ21lbnRzIGJ5IGV4dHJhY3RpbmcgdGhlIHNlZ21lbnRzIGZvciBhIG5vZGUuXG4gKi9cbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xudmFyIEhlbHBlcnMgPSByZXF1aXJlKCcuL0hlbHBlcnMnKTtcblxudmFyIFN0b3JhZ2UgPSByZXF1aXJlKCcuL1N0b3JhZ2UnKTtcbnZhciBNYXJrdXBEYXRhRmFjdG9yeSA9IHJlcXVpcmUoJy4vTWFya3VwRGF0YUZhY3RvcnknKTtcbnZhciBUcmFuc2xhdGlvbk9yaWdpbiA9IHJlcXVpcmUoJy4vVHJhbnNsYXRpb25PcmlnaW4nKTtcbnZhciBNZWRpYXRvciA9IHJlcXVpcmUoJy4vTWVkaWF0b3InKTtcblxudmFyIERhdGFQcm92aWRlciA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBzdG9yYWdlID0gU3RvcmFnZVtjb25maWcuc3RvcmFnZV0uZ2V0SW5zdGFuY2UoKSxcbiAgICAgIGNyZWF0ZU1hcmt1cERhdGEgPSBNYXJrdXBEYXRhRmFjdG9yeS5jcmVhdGUsXG4gICAgICB0cmFuc09yaWdpbiA9IFRyYW5zbGF0aW9uT3JpZ2luLFxuICAgICAgX3JhbmQgPSBIZWxwZXJzLl9yYW5kO1xuXG5cbiAgZnVuY3Rpb24gVXBkYXRlRnJhZ21lbnQgKHBhcmFncmFwaElkLCBzZWdtZW50SWQsIGNoaWxkcmVuLCBpc1RhcmdldCwgZGF0YSkge1xuICAgIHRoaXMudHlwZSA9ICdVUERBVEUnO1xuICAgIHRoaXMucGFyYWdyYXBoVW5pdFVVSUQgPSBwYXJhZ3JhcGhJZDtcbiAgICB0aGlzLnNlZ21lbnQgPSB7fTtcbiAgICB0aGlzLnNlZ21lbnQuaWQgPSBzZWdtZW50SWQ7XG4gICAgdGhpcy5zZWdtZW50LmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW107XG4gICAgdGhpcy5zZWdtZW50LnR5cGUgPSAnc2VnbWVudCc7XG4gICAgdGhpcy5zZWdtZW50LnRyYW5zbGF0aW9uT3JpZ2luID0gKGRhdGEpID8gZGF0YS50cmFuc2xhdGlvbk9yaWdpbiA6IHt9O1xuICAgIHRoaXMuc2VnbWVudC5zZWdtZW50TnVtYmVyID0gKGRhdGEpID8gZGF0YS5zZWdtZW50TnVtYmVyIDogMDtcbiAgICB0aGlzLnNlZ21lbnQuY29uZmlybWF0aW9uTGV2ZWwgPSAoZGF0YSkgPyBkYXRhLmNvbmZpcm1hdGlvbkxldmVsIDogJyc7XG4gICAgdGhpcy5zZWdtZW50LmlzTG9ja2VkID0gKGRhdGEpID8gZGF0YS5pc0xvY2tlZCA6IGZhbHNlO1xuICAgIHRoaXMuaXNUYXJnZXQgPSBpc1RhcmdldCB8fCB0cnVlO1xuICB9XG5cblxuICBVcGRhdGVGcmFnbWVudC5wcm90b3R5cGUuYWRkQ2hpbGRyZW4gPSBmdW5jdGlvbiAoY2hpbGRyZW4pIHtcbiAgICBpZiAoY2hpbGRyZW4uaW5zdGFuY2VPZignQXJyYXknKSkge1xuICAgICAgdGhpcy5zZWdtZW50LmNoaWxkcmVuLmNvbmNhdChjaGlsZHJlbik7XG5cbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLnNlZ21lbnQuY2hpbGRyZW4ucHVzaChjaGlsZHJlbik7XG4gIH07XG5cblxuICAvKipcbiAgICogUHJlcGFyZSBjaGlsZHJlbiB0byBiZSBhZGRlZCB0byB0aGVcbiAgICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IHNlZ21lbnQgY2hpbGRyZW5cbiAgICovXG4gIGZ1bmN0aW9uIHByZXBhcmVOb2RlIChlbGVtZW50KSB7XG4gICAgdmFyIG5vZGVzID0gZWxlbWVudC5jaGlsZHJlbixcbiAgICAgICAgY2hpbGRyZW4gPSBbXSxcbiAgICAgICAgaSA9IDAsXG4gICAgICAgIGwgPSBub2Rlcy5sZW5ndGg7XG5cbiAgICBmb3IgKDsgaSA8IGw7IGkrKykge1xuXG4gICAgICBpZiAobm9kZXNbaV0uZGF0YXNldC50eXBlID09PSAndGV4dCcpIHtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChjcmVhdGVNYXJrdXBEYXRhKHtcbiAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgaWQ6IG5vZGVzW2ldLmRhdGFzZXQuaWQsXG4gICAgICAgICAgdGV4dDogbm9kZXNbaV0udGV4dENvbnRlbnQsXG4gICAgICAgICAgbWV0YWRhdGE6IG5vZGVzW2ldLmRhdGFzZXQubWV0YWRhdGFcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZXNbaV0ubm9kZVR5cGUgPT09IDEgJiYgbm9kZXNbaV0ubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gXCJiclwiKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goY3JlYXRlTWFya3VwRGF0YSh7XG4gICAgICAgICAgdHlwZTogJ3RleHQnLFxuICAgICAgICAgIHRleHQ6ICdcXHJcXG4nXG4gICAgICAgIH0pKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5vZGVzW2ldLmRhdGFzZXQudHlwZSA9PT0gJ3RhZ3BhaXInKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goY3JlYXRlTWFya3VwRGF0YSh7XG4gICAgICAgICAgdHlwZTogJ3RhZ1BhaXInLFxuICAgICAgICAgIGlkOiBub2Rlc1tpXS5kYXRhc2V0LmlkLFxuICAgICAgICAgIGNoaWxkcmVuOiBwcmVwYXJlTm9kZShub2Rlc1tpXSksXG4gICAgICAgICAgbWV0YWRhdGE6IG5vZGVzW2ldLmRhdGFzZXQubWV0YWRhdGEsXG4gICAgICAgICAgdGFnUGFpckRlZmluaXRpb25JZDogbm9kZXNbaV0uZGF0YXNldC5kZWZpbml0aW9uaWRcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZXNbaV0uZGF0YXNldC50eXBlID09PSAnbG9ja2VkJykge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGNyZWF0ZU1hcmt1cERhdGEoe1xuICAgICAgICAgIHR5cGU6ICdsb2NrZWQnLFxuICAgICAgICAgIGNoaWxkcmVuOiBwcmVwYXJlTm9kZShub2Rlc1tpXSlcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZXNbaV0uZGF0YXNldC50eXBlID09PSAncGxhY2Vob2xkZXInKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goY3JlYXRlTWFya3VwRGF0YSh7XG4gICAgICAgICAgdHlwZTogJ3BsYWNlaG9sZGVyVGFnJyxcbiAgICAgICAgICBpZDogbm9kZXNbaV0uZGF0YXNldC5pZCxcbiAgICAgICAgICBtZXRhZGF0YTogbm9kZXNbaV0uZGF0YXNldC5tZXRhZGF0YSxcbiAgICAgICAgICBwbGFjZWhvbGRlclRhZ0RlZmluaXRpb25JZDogbm9kZXNbaV0uZGF0YXNldC5kZWZpbml0aW9uaWRcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBjaGlsZHJlbjtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIFByZXBhcmUgc2VnbWVudCBkYXRhIHRvIGJlIHNlbnQgYmFjayB0byB0aGUgc2VydmVyXG4gICAqIEBwYXJhbSAge3NlZ21lbnRFbH0gY3VycmVudCBzZWdtZW50IGVsZW1lbnRcbiAgICogQHJldHVybiB7T2JqZWN0fSAgICB1cGRhdGVkIGZyYWdtZW50IG9iamVjdFxuICAgKi9cbiAgZnVuY3Rpb24gcHJlcGFyZVNlZ21lbnQgKHNlZ21lbnRFbCkge1xuICAgIHZhciBzZWdtZW50SW5uZXJFbGVtZW50ID0gc2VnbWVudEVsLmNoaWxkcmVuWzBdLFxuICAgICAgICBub2RlcyA9IHNlZ21lbnRJbm5lckVsZW1lbnQuY2hpbGRyZW4sXG4gICAgICAgIGNoaWxkcmVuID0gW10sXG4gICAgICAgIGkgPSAwLFxuICAgICAgICBsID0gbm9kZXMubGVuZ3RoLFxuICAgICAgICBvdGhlclNlZ21lbnREYXRhID0ge307XG5cblxuICAgIGZvciAoOyBpIDwgbDsgaSsrKSB7XG5cbiAgICAgIGlmIChub2Rlc1tpXS5kYXRhc2V0LnR5cGUgPT09ICd0ZXh0Jykge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGNyZWF0ZU1hcmt1cERhdGEoe1xuICAgICAgICAgIHRleHQ6IG5vZGVzW2ldLnRleHRDb250ZW50LFxuICAgICAgICAgIHR5cGU6ICd0ZXh0JyxcbiAgICAgICAgICBtZXRhZGF0YTogbm9kZXNbaV0uZGF0YXNldC5tZXRhZGF0YVxuICAgICAgICB9KSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChub2Rlc1tpXS5ub2RlVHlwZSA9PT0gMSAmJiBub2Rlc1tpXS5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSBcImJyXCIpIHtcbiAgICAgICAgY2hpbGRyZW4ucHVzaChjcmVhdGVNYXJrdXBEYXRhKHtcbiAgICAgICAgICB0eXBlOiAndGV4dCcsXG4gICAgICAgICAgdGV4dDogJ1xcclxcbidcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZXNbaV0uZGF0YXNldC50eXBlID09PSAndGFncGFpcicpIHtcbiAgICAgICAgLy9HZXQgdGFnLWNvbnRlbnQgZnJvbSB0YWctcGFpciBub2RlXG4gICAgICAgIHZhciB0YWdDb250ZW50ID0gbm9kZXNbaV07XG5cbiAgICAgICAgLy9jcmVhdGUgYSBuZXcgdGFnLXBhaXIgbWFya3VwZGF0YVxuICAgICAgICBjaGlsZHJlbi5wdXNoKGNyZWF0ZU1hcmt1cERhdGEoe1xuICAgICAgICAgIHR5cGU6ICd0YWdQYWlyJyxcbiAgICAgICAgICBpZDogbm9kZXNbaV0uZGF0YXNldC5pZCxcbiAgICAgICAgICBjaGlsZHJlbjogcHJlcGFyZU5vZGUodGFnQ29udGVudCksXG4gICAgICAgICAgbWV0YWRhdGE6IG5vZGVzW2ldLmRhdGFzZXQubWV0YWRhdGEsXG4gICAgICAgICAgdGFnUGFpckRlZmluaXRpb25JZDogbm9kZXNbaV0uZGF0YXNldC5kZWZpbml0aW9uaWRcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZXNbaV0uZGF0YXNldC50eXBlID09PSAnbG9ja2VkJykge1xuICAgICAgICBjaGlsZHJlbi5wdXNoKGNyZWF0ZU1hcmt1cERhdGEoe1xuICAgICAgICAgIHR5cGU6ICdsb2NrZWQnLFxuICAgICAgICAgIGNoaWxkcmVuOiBwcmVwYXJlTm9kZShub2Rlc1tpXSlcbiAgICAgICAgfSkpO1xuICAgICAgfVxuXG4gICAgICBpZiAobm9kZXNbaV0uZGF0YXNldC50eXBlID09PSAncGxhY2Vob2xkZXInKSB7XG4gICAgICAgIGNoaWxkcmVuLnB1c2goY3JlYXRlTWFya3VwRGF0YSh7XG4gICAgICAgICAgdHlwZTogJ3BsYWNlaG9sZGVyVGFnJyxcbiAgICAgICAgICBpZDogbm9kZXNbaV0uZGF0YXNldC5pZCxcbiAgICAgICAgICBtZXRhZGF0YTogbm9kZXNbaV0uZGF0YXNldC5tZXRhZGF0YSxcbiAgICAgICAgICBwbGFjZWhvbGRlclRhZ0RlZmluaXRpb25JZDogbm9kZXNbaV0uZGF0YXNldC5kZWZpbml0aW9uaWRcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBzZWdtZW50RGF0YSA9IHNlZ21lbnRFbC5kYXRhc2V0O1xuICAgIHZhciBzZWdtZW50TnVtYmVyID0gc2VnbWVudERhdGEuc2VnbWVudE51bWJlcjtcbiAgICB2YXIgc2VnbWVudCA9IERhdGFQcm92aWRlci5zZWdtZW50c01hcFtzZWdtZW50TnVtYmVyXTtcblxuICAgIC8vIG90aGVyIHNlZ21lbnQgZGF0YVxuICAgIG90aGVyU2VnbWVudERhdGEgPSB7XG4gICAgICB0cmFuc2xhdGlvbk9yaWdpbjogdHJhbnNPcmlnaW4ub3JpZ2luYWxGb3JtYXQoc2VnbWVudC50cmFuc2xhdGlvbm9yaWdpbiksXG4gICAgICBjb25maXJtYXRpb25MZXZlbDogZm9ybWF0Q29uZmlybWF0aW9uTGV2ZWwoc2VnbWVudC5jb25maXJtYXRpb25sZXZlbCksXG4gICAgICBzZWdtZW50TnVtYmVyOiBzZWdtZW50TnVtYmVyLFxuICAgICAgaXNMb2NrZWQ6IHNlZ21lbnREYXRhLmlzTG9ja2VkID8gc2VnbWVudERhdGEuaXNMb2NrZWQgOiBmYWxzZVxuICAgIH07XG5cbiAgICByZXR1cm4gbmV3IFVwZGF0ZUZyYWdtZW50KHNlZ21lbnRFbC5kYXRhc2V0LnB1aWQsIHNlZ21lbnRFbC5kYXRhc2V0LnNlZ21lbnROdW1iZXIsIGNoaWxkcmVuLCB0cnVlLCBvdGhlclNlZ21lbnREYXRhKTtcbiAgfVxuXG5cbiAgZnVuY3Rpb24gZm9ybWF0Q29uZmlybWF0aW9uTGV2ZWwgKHZhbHVlKSB7XG4gICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgY2FzZSAnbm90LXRyYW5zbGF0ZWQnOlxuICAgICAgICByZXR1cm4gJ05vdFRyYW5zbGF0ZWQnO1xuICAgICAgY2FzZSAnYXBwcm92ZWQtc2lnbi1vZmYnOlxuICAgICAgICByZXR1cm4gJ0FwcHJvdmVkU2lnbk9mZic7XG4gICAgICBjYXNlICdhcHByb3ZlZC10cmFuc2xhdGlvbic6XG4gICAgICAgIHJldHVybiAnQXBwcm92ZWRUcmFuc2xhdGlvbic7XG4gICAgICBjYXNlICdkcmFmdCc6XG4gICAgICAgIHJldHVybiAnRHJhZnQnO1xuICAgICAgY2FzZSAncmVqZWN0ZWQtc2lnbi1vZmYnOlxuICAgICAgICByZXR1cm4gJ1JlamVjdGVkU2lnbk9mZic7XG4gICAgICBjYXNlICdyZWplY3RlZC10cmFuc2xhdGlvbic6XG4gICAgICAgIHJldHVybiAnUmVqZWN0ZWRUcmFuc2xhdGlvbic7XG4gICAgICBjYXNlICd0cmFuc2xhdGVkJzpcbiAgICAgICAgcmV0dXJuICdUcmFuc2xhdGVkJztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiAnTm90VHJhbnNsYXRlZCc7XG4gICAgfVxuICB9XG5cblxuICBmdW5jdGlvbiBjcmVhdGVEZWZpbml0aW9uTWFwIChkYXRhKSB7XG4gICAgdmFyIG1hcCA9IHt9O1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBkYXRhLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgbWFwW2RhdGFbaV0uaWRdID0gZGF0YVtpXTtcbiAgICB9XG5cbiAgICByZXR1cm4gbWFwO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzZWdtZW50c01hcDoge30sXG4gICAgc2VnbWVudHNNYXBMZW5ndGg6IDAsXG4gICAgc2F2ZVF1ZXVlOiB7fSxcbiAgICBtZXRhZGF0YU1hcDoge30sXG5cbiAgICBjYWNoZU1ldGFkYXRhOiBmdW5jdGlvbiAobWV0YWRhdGEpIHtcbiAgICAgIHZhciBrZXkgPSBfcmFuZCgpICsgJy0nICsgX3JhbmQoKSArICctJyArIF9yYW5kKCk7XG4gICAgICB0aGlzLm1ldGFkYXRhTWFwW2tleV0gPSBtZXRhZGF0YTtcblxuICAgICAgcmV0dXJuIGtleTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBBZGQgdG8gc2F2ZSBxdWV1ZSB0aGUgdXNlciBhY3Rpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7U3RyaW5nfSBzZWdtZW50SWQgLSBpZCBvZiBzZWdtZW50XG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhcmFncmFwaElkIC0gaWQgb2YgcGFyYWdyYXBoIHVuaXRcbiAgICAgKiBAcGFyYW0ge09iamVjdHxET01ub2RlfSBodG1sIC0gaHRtbCBjb250ZW50IG9mIHRoZSBET00gbm9kZVxuICAgICAqL1xuICAgIGFkZFNhdmVRdWV1ZTogZnVuY3Rpb24gKHNlZ21lbnRJZCwgcGFyYWdyYXBoSWQsIGh0bWwpIHtcbiAgICAgIHRoaXMuc2F2ZVF1ZXVlW3BhcmFncmFwaElkXSA9IHtcbiAgICAgICAgc2VnbWVudElkOiBzZWdtZW50SWQsXG4gICAgICAgIGh0bWw6IGh0bWxcbiAgICAgIH07XG4gICAgfSxcblxuXG4gICAgc2F2ZUFsbENoYW5nZXM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBxID0gdGhpcy5zYXZlUXVldWUsXG4gICAgICAgICAgc2VnbWVudHMgPSBbXSxcbiAgICAgICAgICBwcm9taXNlID0gc3RvcmFnZS5zYXZlT3BlcmF0aW9uKHNlZ21lbnRzKTtcblxuICAgICAgZm9yICh2YXIgaSBpbiBxKSB7XG4gICAgICAgIHNlZ21lbnRzLnB1c2gocHJlcGFyZVNlZ21lbnQocVtpXS5odG1sKSk7XG4gICAgICB9XG5cbiAgICAgIHByb21pc2UuZG9uZShmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnU2F2ZWQgc3VjY2Vzc2Z1bGx5Jyk7XG4gICAgICB9KS5mYWlsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3Igc2F2aW5nJyk7XG4gICAgICB9KTtcbiAgICB9LFxuXG5cbiAgICBzYXZlU2VnbWVudENoYW5nZTogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIHZhciBzZWdtZW50cyA9IFtwcmVwYXJlU2VnbWVudChkYXRhLmVsLCBkYXRhLm90aGVyU2VnbWVudERhdGEpXSxcbiAgICAgICAgICBwcm9taXNlID0gc3RvcmFnZS5zYXZlT3BlcmF0aW9uKHNlZ21lbnRzKTtcblxuICAgICAgcHJvbWlzZS5kb25lKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc29sZS5pbmZvKCdTYXZlZCBzdWNjZXNzZnVsbHknKTtcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzYXZpbmcnKTtcbiAgICAgIH0pO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIFJldHVybnMgdGhlIGN1cnJlbnQgZG9jdW1lbnRcbiAgICAgKlxuICAgICAqIEBwYXJhbTogIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKiBAcmV0dXJuOiB7T2JqZWN0fSBkb2N1bWVudFxuICAgICAqL1xuICAgIGdldEN1cnJlbnREb2N1bWVudDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgc3RvcmFnZS5jdXJyZW50RG9jdW1lbnQpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc3RvcmFnZS5jdXJyZW50RG9jdW1lbnQ7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogU2V0IHRoZSBjdXJyZW50IGRvY3VtZW50XG4gICAgICpcbiAgICAgKiBAcGFyYW06IHtTdHJpbmd9IGlkIC0gZG9jdW1lbnQgaWRcbiAgICAgKiBAcGFyYW06IHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICAvLyBUT0RPOiBUbyBiZSByZWZhY3RvcmVkIHdoZW4gaXQgcHJvdmVzIGV2ZW4gbW9yZSBwYWluZnVsXG4gICAgc2V0Q3VycmVudERvY3VtZW50OiBmdW5jdGlvbiAoaWQsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzLCBpbmRleCwgbWFwO1xuXG4gICAgICAvLyBJbmplY3QgY3VycmVudCBkb2N1bWVudFxuICAgICAgc3RvcmFnZS5nZXREb2N1bWVudChpZCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuXG4gICAgICAgIG1lLmluaXREYXRhKGlkLCBkYXRhKTtcblxuICAgICAgICBtYXAgPSBmdW5jdGlvbiAoZXJyLCBza2VsZXRvbikge1xuXG4gICAgICAgICAgbWUubWFwU2tlbGV0b25EYXRhKHNrZWxldG9uKTtcblxuICAgICAgICAgIGlmICgoK2luZGV4ICsgMSkgPT09IG1lLmZpbGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHN0b3JhZ2UuY3VycmVudERvY3VtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgZm9yICh2YXIgaW5kZXggaW4gbWUuZmlsZXMpIHtcbiAgICAgICAgICBzdG9yYWdlLmdldFNrZWxldG9uKG1lLmZpbGVzW2luZGV4XS5pZCwgbWFwKTtcbiAgICAgICAgfVxuXG4gICAgICB9KTtcbiAgICB9LFxuXG4gICAgaW5pdERhdGE6IGZ1bmN0aW9uIChpZCwgZGF0YSkge1xuICAgICAgdGhpcy5maWxlcyA9IGRhdGEuZmlsZXM7XG4gICAgICBzdG9yYWdlLmN1cnJlbnREb2N1bWVudC5pZCA9IGlkO1xuICAgIH0sXG5cbiAgICBtYXBTa2VsZXRvbkRhdGE6IGZ1bmN0aW9uIChza2VsZXRvbikge1xuICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgbWUudGFnUGFpck1hcCA9IGNyZWF0ZURlZmluaXRpb25NYXAoc2tlbGV0b24udGFnUGFpckRlZmluaXRpb25zKTtcbiAgICAgIG1lLmZvcm1hdGluZ0dyb3VwTWFwID0gY3JlYXRlRGVmaW5pdGlvbk1hcChza2VsZXRvbi5mb3JtYXR0aW5nR3JvdXBzKTtcbiAgICAgIG1lLnBsYWNlaG9sZGVyTWFwID0gY3JlYXRlRGVmaW5pdGlvbk1hcChza2VsZXRvbi5wbGFjZWhvbGRlclRhZ0RlZmluaXRpb25zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IFBhcmFncmFwaCBmcm9tIHN0b3JhZ2VcbiAgICAgKlxuICAgICAqIEBwYXJhbToge1N0cmluZ30gaWRcbiAgICAgKiBAcGFyYW06IHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgKi9cbiAgICBnZXRQYXJhZ3JhcGg6IGZ1bmN0aW9uIChpZCwgY2FsbGJhY2spIHtcbiAgICAgIGlmICghaWQgJiYgY2FsbGJhY2spIHtcbiAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG4gICAgICB9XG5cbiAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICBzdG9yYWdlLmdldFBhcmFncmFwaChpZCwgY2FsbGJhY2spO1xuICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIEdldCB0aGUgbmV4dCBzZXQgb2YgcGFyYWdyYXBocyBvZiB0aGUgY3VycmVudCBkb2N1bWVudFxuICAgICAqXG4gICAgICogQHBhcmFtOiB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgZ2V0TmV4dFBhcmFncmFwaHM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgc3RvcmFnZS5nZXROZXh0UGFyYWdyYXBocyhjYWxsYmFjayk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBwYXJhZ3JhcGhzIGZyb20gc3RvcmFnZVxuICAgICAqXG4gICAgICogQHBhcmFtOiB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICovXG4gICAgZ2V0UGFyYWdyYXBoczogZnVuY3Rpb24gKGRvY3VtZW50SWQsIGNhbGxiYWNrLCBsaW1pdCwgb2Zmc2V0KSB7XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHN0b3JhZ2UuZ2V0UGFyYWdyYXBocyhkb2N1bWVudElkLCBjYWxsYmFjaywgbGltaXQsIG9mZnNldCk7XG4gICAgICB9XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBkb2N1bWVudHNcbiAgICAgKlxuICAgICAqIEBwYXJhbToge0Z1bmN0aW9ufSBjYWxsYmFja1xuICAgICAqL1xuICAgIGdldERvY3VtZW50czogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICBpZiAodHlwZW9mIGNhbGxiYWNrID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHN0b3JhZ2UuZ2V0RG9jdW1lbnRzKGNhbGxiYWNrKTtcbiAgICAgIH1cbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIG9uZSBkb2N1bWVudCBmcm9tIHRoZSBsaXN0IG9mIGRvY3VtZW50c1xuICAgICAqIEBwYXJhbSAge1N0cmluZ30gaWRcbiAgICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAgICovXG4gICAgZ2V0RG9jdW1lbnRJbmZvOiBmdW5jdGlvbiAoaWQpIHtcbiAgICAgIHJldHVybiBzdG9yYWdlLmRvY3VtZW50cy5maWx0ZXIoZnVuY3Rpb24gKGRvYykge1xuICAgICAgICByZXR1cm4gZG9jLmlkID09PSBpZDtcbiAgICAgIH0pWzBdO1xuICAgIH0sXG5cblxuICAgIGdldFNlZ21lbnRCeVNlZ21lbnROdW1iZXI6IGZ1bmN0aW9uIChzZWdtZW50TnVtYmVyKSB7XG4gICAgICByZXR1cm4gdGhpcy5zZWdtZW50c01hcFtzZWdtZW50TnVtYmVyXTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBCaW5kcyBoYW5kbGVycyBmb3Igc2F2aW5nIHRoZSBjaGFuZ2VzXG4gICAgICovXG4gICAgYmluZEhhbmRsZXJzOiBmdW5jdGlvbiAoKSB7XG4gICAgICB2YXIgbWUgPSB0aGlzLFxuICAgICAgICAgIGNoYW5nZXMgPSB7fTtcblxuICAgICAgTWVkaWF0b3Iuc3Vic2NyaWJlKFxuICAgICAgICAnc2VnbWVudDpzdGFydC1lZGl0JywgLy8gRmlyZWQgYnkgbWFya0N1cnJlbnRTZWdtZW50KCkgaW4gS2V5Ym9hcmRCaW5kaW5nc1xuICAgICAgICBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgIGNoYW5nZXNbZGF0YS5zZWdtZW50TnVtYmVyXSA9IHtcbiAgICAgICAgICAgIHN0YXR1czogZGF0YS5vdGhlclNlZ21lbnREYXRhLmNvbmZpcm1hdGlvbmxldmVsLFxuICAgICAgICAgICAgaHRtbDogZGF0YS5lbC5pbm5lckhUTUxcbiAgICAgICAgICB9O1xuICAgICAgICB9KTtcblxuICAgICAgTWVkaWF0b3Iuc3Vic2NyaWJlKFxuICAgICAgICAnc2VnbWVudDplbmQtZWRpdCcsIC8vIEZpcmVkIGJ5IG1hcmtDdXJyZW50U2VnbWVudCgpIGluIEtleWJvYXJkQmluZGluZ3NcbiAgICAgICAgZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICB2YXIgaHRtbCA9IGRhdGEuZWwuaW5uZXJIVE1MLFxuICAgICAgICAgICAgICBzdGF0dXMgPSBkYXRhLm90aGVyU2VnbWVudERhdGEuY29uZmlybWF0aW9ubGV2ZWwsXG4gICAgICAgICAgICAgIG9yaWdpbmFsID0gY2hhbmdlc1tkYXRhLnNlZ21lbnROdW1iZXJdO1xuXG4gICAgICAgICAgaWYgKGh0bWwgIT09IG9yaWdpbmFsLmh0bWwgfHwgc3RhdHVzICE9PSBvcmlnaW5hbC5zdGF0dXMpIHtcbiAgICAgICAgICAgIG1lLnNhdmVTZWdtZW50Q2hhbmdlKGRhdGEpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuYmluZEhhbmRsZXJzKCk7XG4gICAgfVxuICB9O1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRhUHJvdmlkZXI7XG4iLCIvKiBGaWxlOiBEb2N1bWVudHMuanMgKi9cbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXG4vKiBnbG9iYWxzIHJlcXVpcmUsIG1vZHVsZSAqL1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERvY3VtZW50cyBtb2R1bGVcbiAqXG4gKiBEaXNwbGF5cyBhbGwgZG9jdW1lbnRzIGZyb20gdGhlIHN0b3JhZ2UsIGF0dGFjaGVzIGV2ZW50IGhhbmRsZXJzIHRvIHRoZVxuICogZG9jdW1lbnRzIGZvciBvcGVuaW5nIHRoZW1cbiAqXG4gKi9cblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG52YXIgSGVscGVycyA9IHJlcXVpcmUoJy4vSGVscGVycycpO1xudmFyIERhdGFQcm92aWRlciA9IHJlcXVpcmUoJy4vRGF0YVByb3ZpZGVyJyk7XG52YXIgUGFyYWdyYXBocyA9IHJlcXVpcmUoJy4vUGFyYWdyYXBocycpO1xuXG5cblxudmFyIERvY3VtZW50cyA9IChmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIGRhdGFQcm92aWRlciA9IERhdGFQcm92aWRlcjtcblxuICAvLyBOb3QgdXNlZD9cbiAgLy8gZnVuY3Rpb24gY3JlYXRlTm9kZSh0YWcsIGNvbnRlbnQsIGNsYXNzTmFtZSwgc3R5bGUpIHtcbiAgLy8gICB2YXIgZWxtID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWcpO1xuICAvLyAgIGlmIChjbGFzc05hbWUpIHtcbiAgLy8gICAgIGVsbS5jbGFzc05hbWUgPSBjbGFzc05hbWU7XG4gIC8vICAgfVxuXG4gIC8vICAgaWYgKHN0eWxlKSB7XG4gIC8vICAgICBlbG0uc3R5bGUuY3NzVGV4dCA9IHN0eWxlO1xuICAvLyAgIH1cblxuICAvLyAgIGlmICh0eXBlb2YgKGNvbnRlbnQpID09PSAnc3RyaW5nJykge1xuICAvLyAgICAgYWRkVGV4dChlbG0sIGNvbnRlbnQpO1xuICAvLyAgIH1cblxuICAvLyAgIGlmIChjb250ZW50ICYmIGNvbnRlbnQubm9kZU5hbWUpIHtcbiAgLy8gICAgIGVsbS5hcHBlbmRDaGlsZChjb250ZW50KTtcbiAgLy8gICB9XG5cbiAgLy8gICByZXR1cm4gZWxtO1xuICAvLyB9XG5cbiAgLy8gZnVuY3Rpb24gYWRkVGV4dChlbG0sIHRleHQpIHtcbiAgLy8gICBlbG0uaW5uZXJIVE1MID0gdGV4dDtcbiAgLy8gfVxuXG4gIHJldHVybiB7XG5cbiAgICAvKlxuICAgICAgVGhlIGxpc3Qgb2YgZG9jdW1lbnRzXG4gICAgKi9cbiAgICBkb2N1bWVudHM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogT3BlbiBhIGRvY3VtZW50IGluIHRoZSB2aWV3XG4gICAgICpcbiAgICAgKi9cbiAgICBvcGVuRG9jdW1lbnQ6IGZ1bmN0aW9uIChpZCkge1xuICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgZGF0YVByb3ZpZGVyLnNldEN1cnJlbnREb2N1bWVudChpZCwgZnVuY3Rpb24gKGVyciwgZG9jKSB7XG4gICAgICAgIFBhcmFncmFwaHMucmVuZGVyRmlyc3RQYXJhZ3JhcGhzKCk7XG4gICAgICAgIG1lLnNob3dEb2N1bWVudEluZm8oZG9jLmRhdGEpO1xuICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgc2hvd0RvY3VtZW50SW5mbzogZnVuY3Rpb24gKGRvYykge1xuICAgICAgdmFyIGVsZW1lbnRzID0gWycudWUtdHJhbnNsYXRpb24taW5mb3JtYXRpb24nXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZWxlbWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGVsID0gJChlbGVtZW50c1tpXSk7XG4gICAgICAgIGVsLmh0bWwoSGVscGVycy50ZW1wbGF0ZShlbC5kYXRhKCd0bXBsJyksIGRvYykpO1xuICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgYWxsIHRoZSBkb2N1bWVudHNcbiAgICAgKlxuICAgICAqL1xuICAgIHJlbmRlckRvY3VtZW50czogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyICRkb2N1bWVudHNMaXN0ID0gdGhpcy4kZG9jdW1lbnRzTGlzdCwgbWUgPSB0aGlzO1xuICAgICAgRGF0YVByb3ZpZGVyLmdldERvY3VtZW50cyhmdW5jdGlvbiAoZXJyLCBkb2N1bWVudHMpIHtcbiAgICAgICAgdmFyIHJldmVyc2VEb2NzID0gZG9jdW1lbnRzLnJldmVyc2UoKTtcbiAgICAgICAgbWUuZG9jdW1lbnRzID0gcmV2ZXJzZURvY3M7XG4gICAgICAgICRkb2N1bWVudHNMaXN0Lmh0bWwoXG4gICAgICAgICAgSGVscGVycy50ZW1wbGF0ZSgndG1wbC1kb2N1bWVudHMtbGlzdCcsIHsgZG9jdW1lbnRzOiByZXZlcnNlRG9jcyB9KVxuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSxcblxuICAgIHNob3dEb2N1bWVudExpc3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHRoaXMuJGRvY3VtZW50c0xpc3Quc2xpZGVEb3duKCk7XG4gICAgICAkKCcuZG9jdW1lbnRzLWNvbnRyb2wnKS5hZGRDbGFzcygnc2xpZGV1cCcpO1xuICAgICAgdGhpcy4kZWRpdG9yLmFkZENsYXNzKCdmYWRlZCcpO1xuICAgIH0sXG5cbiAgICBoaWRlRG9jdW1lbnRMaXN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLiRkb2N1bWVudHNMaXN0LnNsaWRlVXAoKTtcbiAgICAgICQoJy5kb2N1bWVudHMtY29udHJvbCcpLnJlbW92ZUNsYXNzKCdzbGlkZXVwJyk7XG4gICAgICB0aGlzLiRlZGl0b3IucmVtb3ZlQ2xhc3MoJ2hpZGRlbiBmYWRlZCcpO1xuICAgIH0sXG5cbiAgICBiaW5kSGFuZGxlcnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgIHRoaXMuJGJvZHkub24oJ2NsaWNrLm9wZW5Eb2MnLCAnW2RhdGEtYWN0aW9uPVwib3Blbi1kb2N1bWVudFwiXScsXG4gICAgICAgIGNvbmZpZy5mdWxsTW9kZSA/XG4gICAgICAgICAgZnVuY3Rpb24gKCkgeyAvLyBhcmcgd2FzICdldmVudCcgLSBub3QgdXNlZFxuICAgICAgICAgICAgdmFyICR0aGlzID0gJCh0aGlzKTtcblxuICAgICAgICAgICAgJCgnLmRvY3VtZW50cy1jb250cm9sJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgbWUub3BlbkRvY3VtZW50KCR0aGlzLmRhdGEoJ2lkJykpO1xuICAgICAgICAgICAgbWUuaGlkZURvY3VtZW50TGlzdCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfSA6XG4gICAgICAgICAgZnVuY3Rpb24gKCkgeyAvLyBhcmcgd2FzICdldmVudCcgLSBub3QgdXNlZFxuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gY29uZmlnLmJhc2VVcmwgKyAnL3Nob3cvJyArIHRoaXMuZGF0YXNldC5pZDtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICB0aGlzLiRib2R5Lm9uKCdjbGljay5zaG93RG9jcycsICdbZGF0YS1hY3Rpb249XCJzaG93LWRvY3VtZW50cy1saXN0XCJdJywgZnVuY3Rpb24gKCkgeyAvLyBhcmcgd2FzICdldmVudCcgLSBub3QgdXNlZFxuICAgICAgICBtZS5zaG93RG9jdW1lbnRMaXN0KCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLiRib2R5Lm9uKCdjbGljay5oaWRlRG9jcycsICdbZGF0YS1hY3Rpb249XCJoaWRlLWRvY3VtZW50cy1saXN0XCJdJywgZnVuY3Rpb24gKCkgeyAvLyBhcmcgd2FzICdldmVudCcgLSBub3QgdXNlZFxuICAgICAgICBtZS5oaWRlRG9jdW1lbnRMaXN0KCk7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0pO1xuICAgIH0sXG5cbiAgICBpbml0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLiRib2R5ID0gJCgnYm9keScpO1xuICAgICAgdGhpcy4kZG9jdW1lbnRzTGlzdCA9IHRoaXMuJGJvZHkuZmluZCgnI2RvY3VtZW50cy1saXN0Jyk7XG4gICAgICB0aGlzLiRlZGl0b3IgPSAkKCcuZWRpdG9yLXdyYXBwZXInKTtcblxuICAgICAgdmFyIHJvb3QgPSBjb25maWcuYmFzZVVybCArICcvJztcbiAgICAgIGlmICh3aW5kb3cubG9jYXRpb24uaHJlZiA9PT0gcm9vdCB8fCB3aW5kb3cubG9jYXRpb24uaGFzaCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLnJlbmRlckRvY3VtZW50cygpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmJpbmRIYW5kbGVycygpO1xuXG4gICAgICBpZiAoIWNvbmZpZy5mdWxsTW9kZSAmJiAhY29uZmlnLm9ubHlEb2NzKSB7XG4gICAgICAgIHRoaXMuJGRvY3VtZW50c0xpc3QuY3NzKHtkaXNwbGF5OiAnbm9uZSd9KTtcbiAgICAgICAgdGhpcy5vcGVuRG9jdW1lbnQoSGVscGVycy5wYXJhbXNGcm9tVXJsKCcvZG9jdW1lbnQvOmlkJywgd2luZG93LmxvY2F0aW9uLmhyZWYpWzBdKTtcbiAgICAgICAgJCgnLmRvY3VtZW50cy1jb250cm9sJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy4kZWRpdG9yLmFkZENsYXNzKCdoaWRkZW4nKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERvY3VtZW50czsiLCIvKiBGaWxlOiBEb2N1bWVudHMuanMgKi9cbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXG4vKiBnbG9iYWxzIHJlcXVpcmUsIG1vZHVsZSwgSGFuZGxlYmFycyAqL1xuJ3VzZSBzdHJpY3QnO1xuXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKTtcblxudmFyIEhlbHBlcnMgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgcm9vdCAgICAgICAgICA9IGNvbmZpZy5iYXNlVXJsLFxuICAgICAgb3B0aW9uYWxQYXJhbSA9IC9cXCgoLio/KVxcKS9nLFxuICAgICAgbmFtZWRQYXJhbSAgICA9IC8oXFwoXFw/KT86XFx3Ky9nLFxuICAgICAgc3BsYXRQYXJhbSAgICA9IC9cXCpcXHcrL2csXG4gICAgICBlc2NhcGVSZWdFeHAgID0gL1tcXC17fVxcW1xcXSs/LixcXFxcXFxeJHwjXFxzXS9nO1xuXG4gIHZhciBURU1QTEFURVMgPSB7fTtcblxuICBIYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZkNvbmQnLCBmdW5jdGlvbiAodjEsIHYyLCBvcHRpb25zKSB7XG4gICAgaWYgKHYxID09PSB2Mikge1xuICAgICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gICAgfVxuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gIH0pO1xuXG4gIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3doaWNoZXZlcicsIGZ1bmN0aW9uICgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIGlmIChhcmd1bWVudHNbaV0pIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50c1tpXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gJyc7XG4gIH0pO1xuXG4gIEhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3RvTGFuZ3VhZ2VDb2RlTG93ZXJDYXNlJywgZnVuY3Rpb24gKHN0cikge1xuICAgIHZhciBtaW5pbXVtTGFuZ3VhZ2VDb2RlTGVuZ3RoID0gMixcbiAgICAgICAgc3RhbmRhcnNJc29MZW5ndGggPSA1O1xuXG4gICAgaWYgKHN0ci5sZW5ndGggPCBtaW5pbXVtTGFuZ3VhZ2VDb2RlTGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgaWYgKHN0ci5sZW5ndGggPT09IG1pbmltdW1MYW5ndWFnZUNvZGVMZW5ndGgpIHtcbiAgICAgIHJldHVybiBzdHIudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoc3RyLmxlbmd0aCA9PT0gc3RhbmRhcnNJc29MZW5ndGgpIHtcbiAgICAgIHN0ciA9IHN0ci5zdWJzdHJpbmcoMykudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3RyO1xuICB9KTtcblxuICBmdW5jdGlvbiBfcm91dGVUb1JlZ0V4cChyb3V0ZSkge1xuICAgIHJvdXRlID0gcm91dGUucmVwbGFjZShlc2NhcGVSZWdFeHAsICdcXFxcJCYnKS5yZXBsYWNlKG9wdGlvbmFsUGFyYW0sICcoPzokMSk/JylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UobmFtZWRQYXJhbSwgZnVuY3Rpb24gKG1hdGNoLCBvcHRpb25hbCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gb3B0aW9uYWwgPyBtYXRjaCA6ICcoW15cXC9dKyknO1xuICAgICAgICAgICAgICAgICAgfSkucmVwbGFjZShzcGxhdFBhcmFtLCAnKC4qPyknKTtcblxuICAgIHJldHVybiBuZXcgUmVnRXhwKCdeJyArIHJvdXRlICsgJyQnKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIF9leHRyYWN0UGFyYW1ldGVycyhyb3V0ZSwgZnJhZ21lbnQpIHtcbiAgICB2YXIgcmVzdWx0ID0gcm91dGUuZXhlYyhmcmFnbWVudCk7XG4gICAgcmV0dXJuIHJlc3VsdC5zbGljZSgxKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZWNvbXBpbGVUZW1wbGF0ZSh0ZW1wbGF0ZU5hbWUsIGlzUGFydGlhbCkge1xuICAgIHZhciBlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRlbXBsYXRlTmFtZSk7XG4gICAgdmFyIHN0ciA9IGVsLmlubmVySFRNTCxcbiAgICAgICAgcGFydGlhbHMgPSAoZWwuZGF0YXNldC5wYXJ0aWFscyB8fCAnJykuc3BsaXQoL1xccysvKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFydGlhbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmIChwYXJ0aWFsc1tpXSkge1xuICAgICAgICBwcmVjb21waWxlVGVtcGxhdGUocGFydGlhbHNbaV0sIHRydWUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChpc1BhcnRpYWwpIHtcbiAgICAgIEhhbmRsZWJhcnMucGFydGlhbHNbdGVtcGxhdGVOYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShzdHIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBURU1QTEFURVNbdGVtcGxhdGVOYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShzdHIpO1xuICAgIH1cbiAgfVxuXG5cbiAgZnVuY3Rpb24ga2V5Q29kZVRvU3RyaW5nKGtleUNvZGUpIHtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShrZXlDb2RlKS50b0xvd2VyQ2FzZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbnZlcnRzIGRvY3VtZW50IGZyYWdtZW50IHRvIGh0bWwgc3RyaW5nXG4gICAqIEBwYXJhbSAge0RvY3VtZW50RnJhZ21lbnR9XG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG4gIGZ1bmN0aW9uIGZyYWdtZW50VG9TdHJpbmcoZnJhZ21lbnQpIHtcbiAgICB2YXIgZWxlbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLFxuICAgICAgICBzdHJpbmcgPSAnJztcblxuICAgIGlmIChmcmFnbWVudCAmJiBmcmFnbWVudC5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICAgIGVsZW0uYXBwZW5kQ2hpbGQoZnJhZ21lbnQuY2xvbmVOb2RlKHRydWUpKTtcbiAgICAgIHN0cmluZyA9IGVsZW0uaW5uZXJIVE1MO1xuICAgIH1cblxuICAgIHJldHVybiBzdHJpbmc7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBDcmVhdGVzIGEgZG9jdW1lbnRGcmFnbWVudCBmcm9tIGEgSFRNTCBTcmluZ1xuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGVsZW0gSFRNTCBzdHJpbmcgJzxkaWMgY2xhc3M9XCJzb21lXCI+PC9kaXY+J1xuICAgKiBAcmV0dXJuIHtEb2N1bWVudEZyYWdtZW50fVxuICAgKi9cbiAgZnVuY3Rpb24gc3RyaW5nVG9IVE1MRWxlbWVudChlbGVtKSB7XG4gICAgdmFyIGRvYyA9IGRvY3VtZW50LFxuICAgICAgICBkaXYgPSBkb2MuY3JlYXRlRWxlbWVudCgnZGl2JyksXG4gICAgICAgIGZyYWdtZW50ID0gZG9jLmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIGRpdi5pbm5lckhUTUwgPSBlbGVtO1xuXG4gICAgcmV0dXJuIGZyYWdtZW50LmFwcGVuZENoaWxkKGRpdi5maXJzdENoaWxkKTtcbiAgfVxuXG5cblxuICAvKipcbiAgICogUmV0dXJucyB0cnVlIGlmIGVsZW1lbnQgaGFzIHBhcmVudCB3aXRoIGdpdmVuIGNsYXNzIG5hbWVcbiAgICogQHBhcmFtICB7SFRNTE5vZGV9IGVsZW1cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgIHBhcmVudENsYXNzXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqL1xuICBmdW5jdGlvbiBoYXNQYXJlbnQoZWxlbSwgcGFyZW50Q2xhc3MpIHtcbiAgICB3aGlsZSAoZWxlbSAmJiBlbGVtLm5vZGVUeXBlICE9PSA5ICYmIChlbGVtLm5vZGVUeXBlICE9PSAxIHx8ICFoYXNDbGFzcyhlbGVtLCBwYXJlbnRDbGFzcykpKSB7XG4gICAgICBlbGVtID0gZWxlbS5wYXJlbnROb2RlO1xuXG4gICAgICBpZiAoZWxlbSAmJiBlbGVtLm5vZGVUeXBlID09PSAxICYmIGhhc0NsYXNzKGVsZW0sIHBhcmVudENsYXNzKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBSZXR1cm5zIHRydWUgaWYgYW4gZWxlbWVudCBoYXMgYSBnaXZlbiBjbGFzc1xuICAgKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gIGVsZW1cbiAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICBjbGFzc05hbWVcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICovXG4gIGZ1bmN0aW9uIGhhc0NsYXNzKGVsZW0sIGNsYXNzTmFtZSkge1xuICAgIHJldHVybiBlbGVtLmNsYXNzTmFtZS5yZXBsYWNlKC9bXFx0XFxyXFxuXFxmXS9nLCAnICcpLmluZGV4T2YoY2xhc3NOYW1lKSA+PSAwO1xuICB9XG5cblxuICAvKipcbiAgICogRXNjYXBlcyBhIEhUTUwgc3RyaW5nXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaHRtbCAtIEhUTUwgc3RyaW5nXG4gICAqIEByZXR1cm4ge1N0cmluZ30gcmV0dXJucyBlc2NhcGVkIEhUTUwgc3RyaW5nXG4gICAqL1xuICBmdW5jdGlvbiBlc2NhcGVIVE1MKGh0bWwpIHtcbiAgICB2YXIgbWFwID0ge1xuICAgICAgJyYnICA6ICcmYW1wOycsXG4gICAgICAnPCcgIDogJyZsdDsnLFxuICAgICAgJz4nICA6ICcmZ3Q7JyxcbiAgICAgICdcIicgIDogJyZxdW90OycsXG4gICAgICAnXFwnJyA6ICcmI3gyNzsnLFxuICAgICAgJy8nICA6ICcmI3gyRjsnLFxuICAgIH07XG5cbiAgICByZXR1cm4gU3RyaW5nKGh0bWwpLnJlcGxhY2UoL1smPD5cIidcXC9dL2csIGZ1bmN0aW9uIChzdHIpIHtcbiAgICAgIHJldHVybiBtYXBbc3RyXTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcGFyYW1zRnJvbVVybDogZnVuY3Rpb24gKHBvbGljeSwgdXJsKSB7XG4gICAgICBwb2xpY3kgPSBfcm91dGVUb1JlZ0V4cChwb2xpY3kpO1xuICAgICAgdXJsID0gdXJsLnN1YnN0cihyb290Lmxlbmd0aCk7XG5cbiAgICAgIHJldHVybiBfZXh0cmFjdFBhcmFtZXRlcnMocG9saWN5LCB1cmwpO1xuICAgIH0sXG5cbiAgICBfcmFuZDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHBhcnNlSW50KE1hdGgucmFuZG9tKCkgKiAweEZGRkZGRiwgMTApO1xuICAgIH0sXG5cbiAgICBfZXh0ZW5kOiBmdW5jdGlvbiAoZGVzdGluYXRpb24sIHNvdXJjZSkge1xuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gc291cmNlKSB7XG4gICAgICAgIGlmIChkZXN0aW5hdGlvbltwcm9wZXJ0eV0gJiYgKHR5cGVvZihkZXN0aW5hdGlvbltwcm9wZXJ0eV0pID09PSAnb2JqZWN0JykgJiZcbiAgICAgICAgICAgKGRlc3RpbmF0aW9uW3Byb3BlcnR5XS50b1N0cmluZygpID09PSAnW29iamVjdCBPYmplY3RdJykgJiYgc291cmNlW3Byb3BlcnR5XSkge1xuICAgICAgICAgIHRoaXMuX2V4dGVuZChkZXN0aW5hdGlvbltwcm9wZXJ0eV0sIHNvdXJjZVtwcm9wZXJ0eV0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlc3RpbmF0aW9uW3Byb3BlcnR5XSA9IHNvdXJjZVtwcm9wZXJ0eV07XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRlc3RpbmF0aW9uO1xuICAgIH0sXG5cbiAgICBjb25zdHJ1Y3RvcjogZnVuY3Rpb24gKHByb3RvdHlwZSkge1xuICAgICAgZnVuY3Rpb24gbWl4aW4ob2JqLCBhdHRyKSB7XG4gICAgICAgIGZvciAodmFyIGkgaW4gYXR0cikge1xuICAgICAgICAgIG9ialtpXSA9IGF0dHJbaV07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHZhciBjID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5pbml0KSB7XG4gICAgICAgICAgdGhpcy5pbml0LmFwcGx5KHRoaXMsIEFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShhcmd1bWVudHMpKTtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIG1peGluKGMucHJvdG90eXBlLCBwcm90b3R5cGUpO1xuICAgICAgcmV0dXJuIGM7XG4gICAgfSxcblxuICAgIHRlbXBsYXRlOiBmdW5jdGlvbiAodGVtcGxhdGVOYW1lLCBkYXRhKSB7XG4gICAgICBpZiAoIVRFTVBMQVRFU1t0ZW1wbGF0ZU5hbWVdKSB7XG4gICAgICAgIHByZWNvbXBpbGVUZW1wbGF0ZSh0ZW1wbGF0ZU5hbWUpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gVEVNUExBVEVTW3RlbXBsYXRlTmFtZV0oZGF0YSk7XG4gICAgfSxcblxuICAgIGtleUNvZGVUb1N0cmluZzoga2V5Q29kZVRvU3RyaW5nLFxuICAgIGZyYWdtZW50VG9TdHJpbmc6IGZyYWdtZW50VG9TdHJpbmcsXG4gICAgaGFzUGFyZW50OiBoYXNQYXJlbnQsXG4gICAgaGFzQ2xhc3M6IGhhc0NsYXNzLFxuICAgIHN0cmluZ1RvSFRNTEVsZW1lbnQ6IHN0cmluZ1RvSFRNTEVsZW1lbnQsXG4gICAgZXNjYXBlSFRNTDogZXNjYXBlSFRNTFxuICB9O1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSBIZWxwZXJzOyIsIi8qIEZpbGU6IEtleWJvYXJkLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG52YXIgc2hpZnRFbnRlckhhbmRsZXIgPSByZXF1aXJlKCcuL2tleWJvYXJkL1NoaWZ0RW50ZXJIYW5kbGVyJyk7XHJcbnZhciBzZWdtZW50VW5kZXJDdXJyZW50U2VsZWN0aW9uID0gcmVxdWlyZSgnLi9rZXlib2FyZC9TZWdtZW50VW5kZXJDdXJyZW50U2VsZWN0aW9uJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBTaGlmdEVudGVySGFuZGxlcjogc2hpZnRFbnRlckhhbmRsZXIsXHJcbiAgU2VnbWVudFVuZGVyQ3VycmVudFNlbGVjdGlvbjogc2VnbWVudFVuZGVyQ3VycmVudFNlbGVjdGlvblxyXG59OyIsIi8qIEZpbGU6IEtleWJvYXJkQmluZ2luZ3MuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyAkLCBfLCByZXF1aXJlLCBtb2R1bGUgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIGRhdGFQcm92aWRlciA9IHJlcXVpcmUoJy4vRGF0YVByb3ZpZGVyJyk7XHJcbnZhciBzZWdtZW50V2F0Y2hlciA9IHJlcXVpcmUoJy4vU2VnbWVudHNXYXRjaGVyJyk7XHJcbnZhciBNZWRpYXRvciA9IHJlcXVpcmUoJy4vTWVkaWF0b3InKTtcclxudmFyIHRtcGwgPSByZXF1aXJlKCcuL1RtcGwnKTtcclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuL0hlbHBlcnMnKTtcclxuXHJcbnZhciBTZWdtZW50ID0gcmVxdWlyZSgnLi9TZWdtZW50Jyk7XHJcbnZhciBTZWxlY3Rpb24gPSByZXF1aXJlKCcuL1NlbGVjdGlvbicpO1xyXG52YXIgS2V5Ym9hcmQgPSByZXF1aXJlKCcuL0tleWJvYXJkJyk7XHJcbnZhciBNb3VzZSA9IHJlcXVpcmUoJy4vTW91c2UnKTtcclxudmFyIENvbW1hbmRNYW5hZ2VyID0gcmVxdWlyZSgnLi9Db21tYW5kTWFuYWdlcicpO1xyXG5cclxudmFyIEtleWJvYXJkQmluZGluZ3MgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuICBtZS50YXJnZXQgPSB0YXJnZXQ7XHJcbn07XHJcblxyXG52YXIgcHJvdG8gPSBLZXlib2FyZEJpbmRpbmdzLnByb3RvdHlwZSA9IHtcclxuICAvLyBLZXlib2FyZCBrZXlzXHJcbiAga2V5VGFiOiA5LFxyXG4gIGtleUJhY2tzcGFjZTogOCxcclxuICBrZXlFbnRlcjogMTMsXHJcbiAga2V5U3BhY2U6IDMyLFxyXG5cclxuICBrZXlQYWdlVXA6IDMzLFxyXG4gIGtleVBhZ2VEb3duOiAzNCxcclxuICBrZXlFbmQ6IDM1LFxyXG4gIGtleUhvbWU6IDM2LFxyXG4gIGtleUluc2VydDogNDUsXHJcbiAga2V5RGVsZXRlOiA0NixcclxuXHJcbiAga2V5TGVmdEFycm93OiAzNyxcclxuICBrZXlVcEFycm93OiAzOCxcclxuICBrZXlSaWdodEFycm93OiAzOSxcclxuICBrZXlEb3duQXJyb3c6IDQwLFxyXG5cclxuICBrZXlTaGlmdDogMTYsXHJcbiAga2V5Q3RybDogMTcsXHJcbiAga2V5QWx0OiAxOCxcclxuICBrZXlFc2M6IDI3LFxyXG5cclxuICBrZXlDYXBzTG9jazogMjAsXHJcbiAga2V5TnVtTG9jazogMTQ0LFxyXG4gIGtleVNjcm9sbExvY2s6IDE0NSxcclxuXHJcbiAga2V5RjE6IDExMixcclxuICBrZXlGMjogMTEzLFxyXG4gIGtleUYzOiAxMTQsXHJcbiAga2V5RjQ6IDExNSxcclxuICBrZXlGNTogMTE2LFxyXG4gIGtleUY2OiAxMTcsXHJcbiAga2V5Rjc6IDExOCxcclxuICBrZXlGODogMTE5LFxyXG4gIGtleUY5OiAxMjAsXHJcbiAga2V5RjEwOiAxMjEsXHJcbiAga2V5RjExOiAxMjIsXHJcbiAga2V5RjEyOiAxMjNcclxufTtcclxuXHJcbnByb3RvLmlnbm9yZWRLZXlzID0gW1xyXG4gIHByb3RvLmtleUxlZnRBcnJvdyxcclxuICBwcm90by5rZXlVcEFycm93LFxyXG4gIHByb3RvLmtleVJpZ2h0QXJyb3csXHJcbiAgcHJvdG8ua2V5RG93bkFycm93LFxyXG4gIHByb3RvLmtleUNhcHNMb2NrLFxyXG4gIHByb3RvLmtleVNjcm9sbExvY2ssXHJcbiAgcHJvdG8ua2V5TnVtTG9jayxcclxuICBwcm90by5rZXlBbHQsXHJcbiAgcHJvdG8ua2V5Q3RybCxcclxuICBwcm90by5rZXlTaGlmdCxcclxuICBwcm90by5rZXlQYWdlVXAsXHJcbiAgcHJvdG8ua2V5UGFnZURvd24sXHJcbiAgcHJvdG8ua2V5SG9tZSxcclxuICBwcm90by5rZXlFbmQsXHJcbiAgcHJvdG8ua2V5RW50ZXIsXHJcbiAgcHJvdG8ua2V5RXNjLFxyXG4gIHByb3RvLmtleUluc2VydCxcclxuICBwcm90by5rZXlGMSxcclxuICBwcm90by5rZXlGMixcclxuICBwcm90by5rZXlGMyxcclxuICBwcm90by5rZXlGNCxcclxuICBwcm90by5rZXlGNSxcclxuICBwcm90by5rZXlGNixcclxuICBwcm90by5rZXlGNyxcclxuICBwcm90by5rZXlGOCxcclxuICBwcm90by5rZXlGOSxcclxuICBwcm90by5rZXlGMTAsXHJcbiAgcHJvdG8ua2V5RjExLFxyXG4gIHByb3RvLmtleUYxMlxyXG5dO1xyXG5cclxucHJvdG8uYWxsb3dlZEtleXNJbkxvY2tlZENvbnRlbnQgPSB7XHJcbiAgMzM6ICdQYWdlVXAnLFxyXG4gIDM0OiAnUGFnZURvd24nLFxyXG4gIDM1OiAnRW5kJyxcclxuICAzNjogJ0hvbWUnLFxyXG4gIDM3OiAnTGVmdCcsXHJcbiAgMzg6ICdVcCcsXHJcbiAgMzk6ICdSaWdodCcsXHJcbiAgNDA6ICdEb3duJyxcclxuXHJcbiAgMTEyOiAnRjEnLFxyXG4gIDExMzogJ0YyJyxcclxuICAxMTQ6ICdGMycsXHJcbiAgMTE1OiAnRjQnLFxyXG4gIDExNjogJ0Y1JyxcclxuICAxMTc6ICdGNicsXHJcbiAgMTE4OiAnRjcnLFxyXG4gIDExOTogJ0Y4JyxcclxuICAxMjA6ICdGOScsXHJcbiAgMTIxOiAnRjEwJyxcclxuICAxMjI6ICdGMTEnLFxyXG4gIDEyMzogJ0YxMidcclxufTtcclxuXHJcbnByb3RvLnRleHROb2RlVHlwZSA9IDM7XHJcbnByb3RvLmVsZW1lbnROb2RlVHlwZSA9IDE7XHJcbnByb3RvLmN1cnJlbnRTZWxlY3Rpb24gPSBudWxsO1xyXG5wcm90by5jdXJyZW50RWxlbWVudElzTG9ja2VkID0gZmFsc2U7XHJcblxyXG5wcm90by5iaW5kID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIG1lLnRhcmdldC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuZGlzYWJsZUVudGVyS2V5KGV2KTsgfSk7XHJcbiAgbWUudGFyZ2V0Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBtZS5kaXNhYmxlQmFja3NwYWNlQXRTdGFydE9mU2VnbWVudChldik7IH0pO1xyXG4gIG1lLnRhcmdldC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuZGlzYWJsZURlbGV0ZUF0RW5kT2ZTZWdtZW50KGV2KTsgfSk7XHJcbiAgbWUudGFyZ2V0Lm9uKCdrZXlkb3duJywgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBtZS5oYW5kbGVCYWNrc3BhY2VBY3Rpb24oZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIG1lLmhhbmRsZURlbGV0ZUFjdGlvbihldik7IH0pO1xyXG4gIG1lLnRhcmdldC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuaGFuZGxlUmVtb3ZlT25TZWxlY3Rpb24oZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIG1lLnByZXZlbnRUYWdzUmVtb3ZhbChldik7IH0pO1xyXG4gIG1lLnRhcmdldC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUudG9nZ2xlU2VnbWVudExvY2tTdGF0ZShldik7IH0pO1xyXG4gIG1lLnRhcmdldC5vbigna2V5ZG93bicsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuaGFuZGxlQ2xlYXJUYWdzU2hvcnRjdXRQcmV2ZW50c0RlZmF1bHQoZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ2tleWRvd24nLCBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIG1lLmhhbmRsZVRhYktleShldik7IH0pO1xyXG5cclxuICAvLyBUcmlnZ2VyIG1vdXNldXAgJiBrZXlkb3duIGV2ZW50cyBpbiBsb2NrZWQgY29udGVudCB0byBtYWtlIHN1cmUgd2Ugc3RvcCBlZGl0aW5nXHJcbiAgbWUudGFyZ2V0Lm9uKCdtb3VzZXVwJywgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBtZS5oYW5kbGVDcm9zc1NlZ21lbnRTZWxlY3Rpb24oZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ2tleWRvd24gbW91c2V1cCcsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuZGlzYWJsZUVkaXRpbmcoZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ21vdXNldXAnLCBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIG1lLm1hcmtDdXJyZW50U2VnbWVudChldik7IH0pO1xyXG5cclxuICBtZS50YXJnZXQub24oJ2tleXVwJywgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBtZS5oYW5kbGVDYXJldFBvc2l0aW9uKGV2KTsgfSk7XHJcbiAgbWUudGFyZ2V0Lm9uKCdrZXl1cCcsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUubWFya0N1cnJlbnRTZWdtZW50KGV2KTsgfSk7XHJcbiAgbWUudGFyZ2V0Lm9uKCdrZXl1cCcsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuY2hhbmdlU3RhdHVzVG9EcmFmdChldik7IH0pO1xyXG4gIG1lLnRhcmdldC5vbigna2V5dXAnLCBmdW5jdGlvbiAoZXYpIHsgcmV0dXJuIG1lLmNoYW5nZVN0YXR1c1RvQ29uZmlybWVkKGV2KTsgfSk7XHJcbiAgbWUudGFyZ2V0Lm9uKCdrZXl1cCcsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUuaGFuZGxlTWlzc2luZ1RleHRDb250YWluZXIoZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ2tleXVwJywgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBtZS5oYW5kbGVDbGVhclRhZ3MoZXYpOyB9KTtcclxuICBtZS50YXJnZXQub24oJ2tleXVwJywgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBuZXcgS2V5Ym9hcmQuU2hpZnRFbnRlckhhbmRsZXIoZXYpOyB9KTtcclxuXHJcbiAgbWUudGFyZ2V0Lm9uKCdrZXl1cCBwYXN0ZScsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbWUucmVzaXplQ29udGFpbmVyKGV2KTsgfSk7XHJcbiAgbWUudGFyZ2V0Lm9uKCdwYXN0ZScsIGZ1bmN0aW9uIChldikgeyByZXR1cm4gKG5ldyBDb21tYW5kTWFuYWdlcigpKS5leGVjdXRlKCdwYXN0ZScsIGV2KTsgfSk7XHJcblxyXG4gIC8vIEhhbmRlbCBDVFJMK0NMSUNLIG9uIHRhZ3NcclxuICBtZS50YXJnZXQub24oJ21vdXNlZG93bicsICdbZGF0YS10YWctY29weT1cInRydWVcIl0nLFxyXG4gICAgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBuZXcgTW91c2UuQ3RybENsaWNrSGFuZGxlcigpLmhhbmRsZShldik7IH0pO1xyXG5cclxuICBtZS50YXJnZXQub24oJ21vdXNlb3ZlcicsICdbZGF0YS10YWctY29weT1cInRydWVcIl0nLFxyXG4gICAgZnVuY3Rpb24gKGV2KSB7IHJldHVybiBuZXcgTW91c2UuQ3RybEhvdmVySGFuZGxlcigpLm1vdXNlT3Zlcihldik7IH0pO1xyXG5cclxuICBtZS50YXJnZXQub24oJ21vdXNlbGVhdmUnLCAnW2RhdGEtdGFnLWNvcHk9XCJ0cnVlXCJdJyxcclxuICAgIGZ1bmN0aW9uIChldikgeyByZXR1cm4gbmV3IE1vdXNlLkN0cmxIb3ZlckhhbmRsZXIoKS5tb3VzZUxlYXZlKGV2KTsgfSk7XHJcbn07XHJcblxyXG4vLyBUT0RPIG9uY2UgS2V5Ym9hcmRCaW5kaW5ncyBpcyByZWZhY3RvcmVkIHRoaXMgY2FuIGJlIHJlbW92ZWRcclxuLy8gU2VnbWVudFVuZGVyQ3VycmVudFNlbGVjdGlvbiBoYXMgYmVlbiBtb3ZlZCB0byBpdCdzIG93biBtb2R1bGVcclxucHJvdG8uX3NlZ21lbnRVbmRlckN1cnJlbnRTZWxlY3Rpb24gPSBLZXlib2FyZC5TZWdtZW50VW5kZXJDdXJyZW50U2VsZWN0aW9uO1xyXG5cclxuXHJcbnByb3RvLmRpc2FibGVFbnRlcktleSA9IGZ1bmN0aW9uIChldikge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIGlmIChldi5zaGlmdEtleSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKGV2LmtleUNvZGUgPT09IG1lLmtleUVudGVyKSB7XHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLmRpc2FibGVCYWNrc3BhY2VBdFN0YXJ0T2ZTZWdtZW50ID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuICB2YXIgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCk7XHJcbiAgdmFyIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcbiAgdmFyIHNlZ21lbnRFbDtcclxuXHJcbiAgaWYgKGV2LmtleUNvZGUgIT09IG1lLmtleUJhY2tzcGFjZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFtZS5faXNJbnZpc2libGVDaGFyKGZvY3VzTm9kZSkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHNlZ21lbnRFbCA9ICQoZm9jdXNOb2RlLnBhcmVudE5vZGUpO1xyXG5cclxuICBpZiAoZm9jdXNOb2RlLnByZXZpb3VzU2libGluZyA9PT0gbnVsbCAmJlxyXG4gICAgICBzZWdtZW50RWwuaGFzQ2xhc3MoJ3VlLXNlZ21lbnQnKSkge1xyXG4gICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuICB9XHJcbn07XHJcblxyXG5wcm90by5kaXNhYmxlRGVsZXRlQXRFbmRPZlNlZ21lbnQgPSBmdW5jdGlvbiAoZXYpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKSxcclxuICAgICAgZm9jdXNOb2RlLFxyXG4gICAgICBmb2N1c09mZnNldDtcclxuXHJcbiAgaWYgKCFzZWxlY3Rpb24uaXNDb2xsYXBzZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChldi5rZXlDb2RlICE9PSBtZS5rZXlEZWxldGUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcbiAgZm9jdXNPZmZzZXQgPSBzZWxlY3Rpb24uZm9jdXNPZmZzZXQ7XHJcblxyXG4gIGlmIChmb2N1c05vZGUgPT09IG51bGwpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChmb2N1c05vZGUubmV4dFNpYmxpbmcgPT09IG51bGwgJiZcclxuICAgICAgZm9jdXNOb2RlLmxlbmd0aCA9PT0gZm9jdXNPZmZzZXQgJiZcclxuICAgICAgbWUuaXNMYXN0SW5TZWdtZW50KGZvY3VzTm9kZSkpIHtcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8uaXNMYXN0SW5TZWdtZW50ID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgcGFyZW50RWwsXHJcbiAgICAgIG5vZGVFbCxcclxuICAgICAgYXRJbmRleCxcclxuICAgICAgbnVtYmVyT2ZDaGlsZHJlbjtcclxuXHJcbiAgbm9kZUVsID0gJChub2RlKTtcclxuICBwYXJlbnRFbCA9IG5vZGVFbC5wYXJlbnQoKTtcclxuXHJcbiAgd2hpbGUgKCFwYXJlbnRFbC5oYXNDbGFzcygndWUtaW5saW5lLWNvbnRlbnQnKSkge1xyXG4gICAgbm9kZUVsID0gcGFyZW50RWw7XHJcbiAgICBwYXJlbnRFbCA9IG5vZGVFbC5wYXJlbnQoKTtcclxuICB9XHJcblxyXG4gIGF0SW5kZXggPSBub2RlRWwuaW5kZXgoKSArIDE7XHJcbiAgbnVtYmVyT2ZDaGlsZHJlbiA9IHBhcmVudEVsLmNoaWxkcmVuKCkubGVuZ3RoO1xyXG5cclxuICByZXR1cm4gYXRJbmRleCA9PT0gbnVtYmVyT2ZDaGlsZHJlbjtcclxufTtcclxuXHJcbnByb3RvLmhhbmRsZUJhY2tzcGFjZUFjdGlvbiA9IGZ1bmN0aW9uIChldikge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHNlbGVjdGlvbiA9IGRvY3VtZW50LmdldFNlbGVjdGlvbigpLFxyXG4gICAgICBmb2N1c05vZGUgPSBzZWxlY3Rpb24uZm9jdXNOb2RlLFxyXG4gICAgICBmb2N1c09mZnNldCA9IHNlbGVjdGlvbi5mb2N1c09mZnNldCxcclxuICAgICAgcHJldmlvdXNTaWJsaW5nLFxyXG4gICAgICBpbmxpbmVFbGVtZW50LFxyXG4gICAgICB0YWcsXHJcbiAgICAgIGlzU3RhcnRUYWc7XHJcblxyXG4gIGlmICghc2VsZWN0aW9uLmlzQ29sbGFwc2VkKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoZm9jdXNOb2RlID09PSBudWxsKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoJChmb2N1c05vZGUpLmhhc0NsYXNzKCd1ZS10YWdwYWlyLWNvbnRlbnQnKSAmJiBmb2N1c09mZnNldCA9PT0gMCkge1xyXG4gICAgc2VsZWN0aW9uLm1vZGlmeSgnbW92ZScsICdiYWNrd2FyZCcsICdjaGFyYWN0ZXInKTtcclxuICAgIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcbiAgICBmb2N1c09mZnNldCA9IHNlbGVjdGlvbi5mb2N1c09mZnNldDtcclxuICB9XHJcblxyXG4gIGlmICghbWUuX2lzSW52aXNpYmxlQ2hhcihmb2N1c05vZGUpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpbmxpbmVFbGVtZW50ID0gZm9jdXNOb2RlLnBhcmVudE5vZGU7XHJcbiAgdGFnID0gZm9jdXNOb2RlLnByZXZpb3VzU2libGluZztcclxuXHJcbiAgaWYgKGV2LmtleUNvZGUgIT09IG1lLmtleUJhY2tzcGFjZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlubGluZUVsZW1lbnQgPT09IG51bGwpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmICgkKGlubGluZUVsZW1lbnQpLmhhc0NsYXNzKCd1ZS1zZWdtZW50JykpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChmb2N1c09mZnNldCA9PT0gMCkge1xyXG4gICAgc2VsZWN0aW9uLm1vZGlmeSgnbW92ZScsICdmb3J3YXJkJywgJ2NoYXJhY3RlcicpO1xyXG4gIH1cclxuXHJcbiAgaXNTdGFydFRhZyA9ICQodGFnKS5oYXNDbGFzcygndWUtdGFnLXN0YXJ0Jyk7XHJcblxyXG4gIGlmIChpc1N0YXJ0VGFnKSB7XHJcbiAgICB2YXIgdWVUYWdXcmFwcGVyID0gaW5saW5lRWxlbWVudDtcclxuICAgIHByZXZpb3VzU2libGluZyA9IHVlVGFnV3JhcHBlci5wcmV2aW91c1NpYmxpbmc7XHJcblxyXG4gICAgdmFyIHBhcmVudElzQW5vdGhlclRhZyA9ICQodWVUYWdXcmFwcGVyLnBhcmVudE5vZGUpLmhhc0NsYXNzKCd1ZS10YWdwYWlyLWNvbnRlbnQnKTtcclxuICAgIGlmIChwYXJlbnRJc0Fub3RoZXJUYWcpIHtcclxuICAgICAgdmFyIHVlVGFnUGFpckNvbnRlbnQgPSB1ZVRhZ1dyYXBwZXIucGFyZW50Tm9kZTtcclxuICAgICAgcHJldmlvdXNTaWJsaW5nID0gdWVUYWdQYWlyQ29udGVudC5wcmV2aW91c1NpYmxpbmc7XHJcbiAgICB9XHJcblxyXG4gIH0gZWxzZSB7XHJcbiAgICBwcmV2aW91c1NpYmxpbmcgPSBpbmxpbmVFbGVtZW50LnByZXZpb3VzU2libGluZy5sYXN0Q2hpbGQ7XHJcbiAgfVxyXG5cclxuICBtZS5fcmVtb3ZlSW5saW5lKGlubGluZUVsZW1lbnQsIGV2KTtcclxuXHJcbiAgaWYgKHByZXZpb3VzU2libGluZyA9PT0gbnVsbCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcclxuXHJcbiAgcmFuZ2Uuc2V0U3RhcnRBZnRlcihwcmV2aW91c1NpYmxpbmcpO1xyXG5cclxuICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcbiAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuXHJcbiAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbn07XHJcblxyXG5cclxucHJvdG8uaGFuZGxlRGVsZXRlQWN0aW9uID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCksXHJcbiAgICAgIGZvY3VzTm9kZSxcclxuICAgICAgZm9jdXNOb2RlUGFyZW50LFxyXG4gICAgICBmb2N1c09mZnNldCxcclxuICAgICAgbmV4dFNpYmxpbmcsXHJcbiAgICAgIHVlVGV4dFBhcmVudEVsLFxyXG4gICAgICBpc05leHRTaWJsaW5nVGFnLFxyXG4gICAgICBpc05leHRTaWJsaW5nVGFnSGlkZGVuLFxyXG4gICAgICBpc0ZvY3VzT25UZXh0LFxyXG4gICAgICBpc0F0RW5kT2ZUZXh0Tm9kZSxcclxuICAgICAgaXNGb2N1c0luc2lkZVN0YXJ0VGFnLFxyXG4gICAgICBpc0ZvY3VzT25JbnZpc2libGVDaGFyLFxyXG4gICAgICBpc0ZvY3VzSW5zaWRlUHJldmlvdXNUYWcsXHJcbiAgICAgIGlzRm9jdXNBdFN0YXJ0T2ZTZWdtZW50LFxyXG4gICAgICBzZWxlY3Rpb25SYW5nZVBvc2l0aW9uLFxyXG4gICAgICByYW5nZTtcclxuXHJcbiAgaWYgKCFzZWxlY3Rpb24uaXNDb2xsYXBzZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChldi5rZXlDb2RlICE9PSBtZS5rZXlEZWxldGUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcbiAgZm9jdXNOb2RlUGFyZW50ID0gZm9jdXNOb2RlLnBhcmVudE5vZGU7XHJcbiAgZm9jdXNPZmZzZXQgPSBzZWxlY3Rpb24uZm9jdXNPZmZzZXQ7XHJcblxyXG4gIGlzRm9jdXNPblRleHQgPSBmb2N1c05vZGUubm9kZVR5cGUgPT09IG1lLnRleHROb2RlVHlwZTtcclxuICBpc0F0RW5kT2ZUZXh0Tm9kZSA9IGZvY3VzT2Zmc2V0ID09PSBmb2N1c05vZGUubGVuZ3RoO1xyXG4gIGlzRm9jdXNPbkludmlzaWJsZUNoYXIgPSBtZS5faXNJbnZpc2libGVDaGFyKGZvY3VzTm9kZSk7XHJcbiAgaXNGb2N1c0luc2lkZVN0YXJ0VGFnID0gaXNGb2N1c09uSW52aXNpYmxlQ2hhciAmJiAkKGZvY3VzTm9kZS5wcmV2aW91c1NpYmxpbmcpLmhhc0NsYXNzKCd1ZS10YWctc3RhcnQnKTtcclxuICBpc0ZvY3VzSW5zaWRlUHJldmlvdXNUYWcgPSBpc0ZvY3VzT25JbnZpc2libGVDaGFyICYmICQoZm9jdXNOb2RlLnByZXZpb3VzU2libGluZykuaGFzQ2xhc3MoJ3VlLXRhZycpO1xyXG4gIGlzRm9jdXNBdFN0YXJ0T2ZTZWdtZW50ID0gaXNGb2N1c09uSW52aXNpYmxlQ2hhciAmJiAkKGZvY3VzTm9kZSkuaW5kZXgoKSA9PT0gMDtcclxuXHJcbiAgbmV4dFNpYmxpbmcgPSBmb2N1c05vZGUubmV4dFNpYmxpbmc7XHJcblxyXG4gIGlmIChpc0ZvY3VzT25JbnZpc2libGVDaGFyICYmIGZvY3VzT2Zmc2V0ID09PSAwKSB7XHJcbiAgICBzZWxlY3Rpb24ubW9kaWZ5KCdtb3ZlJywgJ2ZvcndhcmQnLCAnY2hhcmFjdGVyJyk7XHJcbiAgfVxyXG5cclxuICBpZiAoaXNGb2N1c09uVGV4dCAmJiAhaXNGb2N1c09uSW52aXNpYmxlQ2hhcikge1xyXG4gICAgaWYgKCFpc0F0RW5kT2ZUZXh0Tm9kZSkge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdWVUZXh0UGFyZW50RWwgPSAkKGZvY3VzTm9kZVBhcmVudCk7XHJcblxyXG4gICAgaWYgKHVlVGV4dFBhcmVudEVsLmhhc0NsYXNzKCd1ZS10ZXh0JykpIHsgLy8gd2UgYXJlIGluIHRleHQgYmVmb3JlIHN0YXJ0IHRhZ1xyXG4gICAgICBuZXh0U2libGluZyA9IGZvY3VzTm9kZS5wYXJlbnROb2RlLm5leHRTaWJsaW5nOyAvLyB1ZS10YWctd3JhcHBlciBmb3Igc3RhcnQgdGFnXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aHJvdyAndW5leHBlY3RlZCBjYXNlIHdoZXJlIHNlbGVjdGlvbiBpcyB0ZXh0LCBidXQgaXMgbm90IGNvbnRhaW5lZCBpbiBhIHRleHQgbm9kZSc7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gd2UgYXJlIGluIHRleHQgaW5zaWRlIGEgdGFnIHBhaXJcclxuICAgIGlmIChuZXh0U2libGluZyA9PT0gbnVsbCAmJiAkKGZvY3VzTm9kZVBhcmVudC5wYXJlbnROb2RlKS5oYXNDbGFzcygndWUtdGFncGFpci1jb250ZW50JykpIHtcclxuICAgICAgbmV4dFNpYmxpbmcgPSBmb2N1c05vZGVQYXJlbnQucGFyZW50Tm9kZS5uZXh0U2libGluZzsgLy8gdWUtdGFnLXdyYXBwZXIgZm9yIGVuZCB0YWdcclxuICAgICAgc2VsZWN0aW9uUmFuZ2VQb3NpdGlvbiA9IG5leHRTaWJsaW5nLm5leHRTaWJsaW5nOyAvLyB3aGF0IGNvbWVzIGFmdGVyIHRoZSBlbmQtdGFnXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAoaXNGb2N1c0luc2lkZVN0YXJ0VGFnKSB7XHJcbiAgICB2YXIgY29udGVudEV4aXN0cyA9IGZvY3VzTm9kZVBhcmVudC5uZXh0U2libGluZy5maXJzdENoaWxkO1xyXG5cclxuICAgIGlmIChjb250ZW50RXhpc3RzKSB7XHJcblxyXG4gICAgICBpZiAoJChjb250ZW50RXhpc3RzKS5oYXNDbGFzcygndWUtdGV4dCcpKSB7XHJcbiAgICAgICAgLy8gcG9zaXRpb24gY3Vyc29yIGFuZCBsZXQgdGhlIGRlZmF1bHQgYmVoYXZpb3JcclxuICAgICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICAgICAgcmFuZ2Uuc2V0U3RhcnRCZWZvcmUoY29udGVudEV4aXN0cyk7XHJcblxyXG4gICAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICAgICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UpO1xyXG5cclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICgkKGNvbnRlbnRFeGlzdHMpLmhhc0NsYXNzKCd1ZS10YWctd3JhcHBlcicpKSB7XHJcbiAgICAgICAgbmV4dFNpYmxpbmcgPSBjb250ZW50RXhpc3RzO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSBlbHNlIHsgLy8gd2UgZGVsZXRlIHRoZSBjdXJyZW50IHRhZ1xyXG4gICAgICBuZXh0U2libGluZyA9IGZvY3VzTm9kZVBhcmVudDtcclxuICAgIH1cclxuXHJcbiAgfSBlbHNlIGlmIChpc0ZvY3VzSW5zaWRlUHJldmlvdXNUYWcpIHtcclxuICAgIG5leHRTaWJsaW5nID0gZm9jdXNOb2RlUGFyZW50Lm5leHRTaWJsaW5nO1xyXG4gIH0gZWxzZSBpZiAoaXNGb2N1c0F0U3RhcnRPZlNlZ21lbnQpIHtcclxuICAgIG5leHRTaWJsaW5nID0gZm9jdXNOb2RlLm5leHRTaWJsaW5nLmZpcnN0Q2hpbGQ7XHJcbiAgfVxyXG5cclxuICBpc05leHRTaWJsaW5nVGFnID0gJChuZXh0U2libGluZykuaGFzQ2xhc3MoJ3VlLXRhZy13cmFwcGVyJyk7XHJcbiAgaXNOZXh0U2libGluZ1RhZ0hpZGRlbiA9IGlzTmV4dFNpYmxpbmdUYWcgJiYgJChuZXh0U2libGluZykuaGFzQ2xhc3MoJ2hpZGUnKTtcclxuXHJcbiAgaWYgKGlzTmV4dFNpYmxpbmdUYWdIaWRkZW4pIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChpc05leHRTaWJsaW5nVGFnKSB7XHJcbiAgICBtZS5fcmVtb3ZlSW5saW5lKG5leHRTaWJsaW5nLCBldik7XHJcbiAgfVxyXG5cclxuICBpZiAoc2VsZWN0aW9uUmFuZ2VQb3NpdGlvbikge1xyXG4gICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xyXG4gICAgcmFuZ2Uuc2V0U3RhcnRCZWZvcmUoc2VsZWN0aW9uUmFuZ2VQb3NpdGlvbik7XHJcblxyXG4gICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xyXG4gICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuICB9XHJcbn07XHJcblxyXG5wcm90by5fcmVtb3ZlSW5saW5lID0gZnVuY3Rpb24gKGlubGluZUVsZW1lbnQsIGV2KSB7XHJcbiAgdmFyIHRhZ1BhaXJJZCxcclxuICAgICAgdGFnUGFpckNvbnRlbnQsXHJcbiAgICAgIHRhZ1BhaXJDb250ZW50RWwsXHJcbiAgICAgIGlzRW5kVGFnUGFpcixcclxuICAgICAgaXNTdGFydFRhZ1BhaXIsXHJcbiAgICAgIGlzVGFnUGFpcixcclxuICAgICAgaXNQbGFjZWhvbGRlcjtcclxuXHJcbiAgaXNQbGFjZWhvbGRlciA9IGlubGluZUVsZW1lbnQuZGF0YXNldC50eXBlID09PSAncGxhY2Vob2xkZXInO1xyXG4gIGlzRW5kVGFnUGFpciA9IGlubGluZUVsZW1lbnQuZGF0YXNldC50eXBlID09PSAnZW5kLXRhZyc7XHJcbiAgaXNTdGFydFRhZ1BhaXIgPSBpbmxpbmVFbGVtZW50LmRhdGFzZXQudHlwZSA9PT0gJ3N0YXJ0LXRhZyc7XHJcbiAgaXNUYWdQYWlyID0gaXNTdGFydFRhZ1BhaXIgfHwgaXNFbmRUYWdQYWlyO1xyXG5cclxuICBpZiAoaXNQbGFjZWhvbGRlcikge1xyXG4gICAgaW5saW5lRWxlbWVudC5yZW1vdmUoKTtcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKCFpc1RhZ1BhaXIpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChpc0VuZFRhZ1BhaXIpIHtcclxuICAgIHRhZ1BhaXJDb250ZW50ID0gaW5saW5lRWxlbWVudC5wcmV2aW91c1NpYmxpbmc7XHJcbiAgICB0YWdQYWlySWQgPSB0YWdQYWlyQ29udGVudC5kYXRhc2V0LmlkO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlzU3RhcnRUYWdQYWlyKSB7XHJcbiAgICB0YWdQYWlyQ29udGVudCA9ICBpbmxpbmVFbGVtZW50Lm5leHRTaWJsaW5nO1xyXG4gICAgdGFnUGFpcklkID0gdGFnUGFpckNvbnRlbnQuZGF0YXNldC5pZDtcclxuICB9XHJcblxyXG4gIGlmIChpc1RhZ1BhaXIpIHtcclxuICAgIHNlZ21lbnRXYXRjaGVyLnJlbW92ZVRhZ1BhaXIodGFnUGFpcklkKTtcclxuICAgIHRhZ1BhaXJDb250ZW50RWwgPSAkKHRhZ1BhaXJDb250ZW50KTtcclxuICAgIHRhZ1BhaXJDb250ZW50RWwucmVwbGFjZVdpdGgodGFnUGFpckNvbnRlbnRFbC5jaGlsZHJlbigpKTtcclxuXHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLmhhbmRsZVJlbW92ZU9uU2VsZWN0aW9uID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCksXHJcbiAgICAgIHJhbmdlLFxyXG4gICAgICBjdXJyZW50UmFuZ2UsXHJcbiAgICAgIHJhbmdlQ29udGVudCxcclxuICAgICAgY29tbW9uQW5jZXN0b3JDb250YWluZXIsXHJcbiAgICAgIHN0YXJ0Q29udGFpbmVyO1xyXG5cclxuICBpZiAoc2VsZWN0aW9uLmdldFJhbmdlQXQoMCkuY29sbGFwc2VkKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoZXYua2V5Q29kZSAhPT0gbWUua2V5RGVsZXRlICYmIGV2LmtleUNvZGUgIT09IG1lLmtleUJhY2tzcGFjZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKG1lLmlzQ3Jvc3NTZWdtZW50U2VsZWN0aW9uKCkpIHtcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICByYW5nZSA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApO1xyXG4gIHJhbmdlQ29udGVudCA9IHJhbmdlLmNsb25lQ29udGVudHMoKTtcclxuXHJcbiAgaWYgKHJhbmdlQ29udGVudC5maXJzdENoaWxkID09PSByYW5nZUNvbnRlbnQubGFzdENoaWxkICYmXHJcbiAgICAgIHJhbmdlQ29udGVudC5maXJzdENoaWxkLm5vZGVUeXBlID09PSBtZS50ZXh0Tm9kZVR5cGUpIHtcclxuXHJcbiAgICByZXR1cm47Ly8gYWxsb3cgZGVmYXVsdCBkZWxldGUgYWN0aW9uXHJcbiAgfVxyXG5cclxuICBtZS5jbGVhbnVwU3RyYXRlZ3kocmFuZ2VDb250ZW50KTtcclxuXHJcblxyXG4gIGN1cnJlbnRSYW5nZSA9IHNlbGVjdGlvbi5nZXRSYW5nZUF0KDApO1xyXG4gIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gY3VycmVudFJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyO1xyXG4gIHN0YXJ0Q29udGFpbmVyID0gY3VycmVudFJhbmdlLnN0YXJ0Q29udGFpbmVyO1xyXG5cclxuICByYW5nZS5kZWxldGVDb250ZW50cygpO1xyXG5cclxuICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgcmFuZ2Uuc2VsZWN0Tm9kZShzdGFydENvbnRhaW5lcik7XHJcbiAgcmFuZ2UuY29sbGFwc2UoKTtcclxuXHJcbiAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xyXG4gIHNlbGVjdGlvbi5hZGRSYW5nZShyYW5nZSk7XHJcblxyXG4gIG1lLmluc2VydFJhbmdlQ29udGVudChyYW5nZUNvbnRlbnQsIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKTtcclxuXHJcbiAgZXYucHJldmVudERlZmF1bHQoKTtcclxufTtcclxuXHJcbnByb3RvLmlzQ3Jvc3NTZWdtZW50U2VsZWN0aW9uID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBzZWxlY3Rpb24gPSBuZXcgU2VsZWN0aW9uLlNlbGVjdGlvbkNvbnRleHQoKSxcclxuICAgICAgcmVzdWx0O1xyXG5cclxuICByZXN1bHQgPSBzZWxlY3Rpb24uaGFzQ29tbW9uQW5jZXN0b3JDbGFzcygndWUtZWRpdGFibGUnKTtcclxuXHJcbiAgcmV0dXJuIHJlc3VsdDtcclxufTtcclxuXHJcbnByb3RvLmNsZWFudXBTdHJhdGVneSA9IGZ1bmN0aW9uIChjb250YWluZXIpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBtZS5yZW1vdmVFbGVtZW50UXVldWUgPSBbXTtcclxuICBtZS5fY2xlYW51cChjb250YWluZXIpO1xyXG4gIG1lLnJlbW92ZUVsZW1lbnRRdWV1ZS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICBpdGVtLnJlbW92ZSgpO1xyXG4gIH0pO1xyXG5cclxuICBtZS5yZW1vdmVFbGVtZW50UXVldWUgPSBudWxsO1xyXG59O1xyXG5cclxucHJvdG8uX2NsZWFudXAgPSBmdW5jdGlvbiAoY29udGFpbmVyKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgaSA9IDAsXHJcbiAgICAgIGVsO1xyXG5cclxuICBmb3IgKDsgaSA8IGNvbnRhaW5lci5jaGlsZE5vZGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICBlbCA9IGNvbnRhaW5lci5jaGlsZE5vZGVzW2ldO1xyXG5cclxuICAgIG1lLnJlbW92ZVRleHQoZWwpO1xyXG4gICAgbWUucmVtb3ZlUGFpcmVkVGFncyhlbCwgY29udGFpbmVyKTtcclxuICAgIG1lLmNsZWFuVGFnUGFpckNvbnRhaW5lcihlbCk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8ucmVtb3ZlVGV4dCA9IGZ1bmN0aW9uIChlbCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgICRlbCA9ICQoZWwpO1xyXG5cclxuICBpZiAoJGVsLmhhc0NsYXNzKCd1ZS10ZXh0JykpIHtcclxuICAgIG1lLnJlbW92ZUVsZW1lbnRRdWV1ZS5wdXNoKCRlbCk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8ucmVtb3ZlUGFpcmVkVGFncyA9IGZ1bmN0aW9uIChlbCwgY29udGFpbmVyKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgJGVsID0gJChlbCk7XHJcblxyXG4gIGlmIChlbC5kYXRhc2V0LnR5cGUgIT09ICdzdGFydC10YWcnKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgaWQgPSBlbC5kYXRhc2V0LmlkO1xyXG4gIHZhciBtYXRjaGVkRW5kVGFnID0gXyhjb250YWluZXIuY2hpbGROb2RlcykuZmluZChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgdmFyIGlzVGFnV3JhcHBlciA9ICQoaXRlbSkuaGFzQ2xhc3MoJ3VlLXRhZy13cmFwcGVyJyksXHJcblxyXG4gICAgaXNIaWRkZW4gPSBpc1RhZ1dyYXBwZXIgJiYgJChpdGVtKS5oYXNDbGFzcygnaGlkZScpLFxyXG4gICAgZGF0YXNldCA9IGl0ZW0uZGF0YXNldCB8fCB7fSxcclxuICAgIGlzRW5kVGFnLFxyXG4gICAgaGFzTWF0Y2hpbmdJZCxcclxuICAgIGlzT2s7XHJcblxyXG4gICAgaXNFbmRUYWcgPSBkYXRhc2V0LnR5cGUgPT09ICdlbmQtdGFnJztcclxuICAgIGhhc01hdGNoaW5nSWQgPSBkYXRhc2V0LmlkID09PSBpZDtcclxuXHJcbiAgICBpc09rID0gaXNUYWdXcmFwcGVyICYmICFpc0hpZGRlbiAmJiBpc0VuZFRhZyAmJiBoYXNNYXRjaGluZ0lkO1xyXG5cclxuICAgIGlmIChpc09rKSB7XHJcbiAgICAgIHJldHVybiBpdGVtO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG4gIH0pO1xyXG5cclxuICB2YXIgbWF0Y2hlZFRhZ1BhaXIgPSBfKGNvbnRhaW5lci5jaGlsZE5vZGVzKS5maW5kKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICB2YXIgaXNUYWdQYWlyQ29udGFpbmVyID0gJChpdGVtKS5oYXNDbGFzcygndWUtdGFncGFpci1jb250ZW50JyksXHJcbiAgICBkYXRhc2V0ID0gaXRlbS5kYXRhc2V0IHx8IHt9LFxyXG4gICAgaXNUYWdQYWlyLFxyXG4gICAgaGFzTWF0Y2hpbmdJZCxcclxuICAgIGlzT2s7XHJcblxyXG4gICAgaXNUYWdQYWlyID0gZGF0YXNldC50eXBlID09PSAndGFncGFpcic7XHJcbiAgICBoYXNNYXRjaGluZ0lkID0gZGF0YXNldC5pZCA9PT0gaWQ7XHJcblxyXG4gICAgaXNPayA9ICBpc1RhZ1BhaXJDb250YWluZXIgJiYgaXNUYWdQYWlyICYmIGhhc01hdGNoaW5nSWQ7XHJcblxyXG4gICAgaWYgKGlzT2spIHtcclxuICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuO1xyXG4gIH0pO1xyXG5cclxuICBpZiAobWF0Y2hlZEVuZFRhZyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICBtZS5yZW1vdmVFbGVtZW50UXVldWUucHVzaCgkZWwpO1xyXG4gICAgbWUucmVtb3ZlRWxlbWVudFF1ZXVlLnB1c2goJChtYXRjaGVkRW5kVGFnKSk7XHJcbiAgICBtZS5yZW1vdmVFbGVtZW50UXVldWUucHVzaCgkKG1hdGNoZWRUYWdQYWlyKSk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8uY2xlYW5UYWdQYWlyQ29udGFpbmVyID0gZnVuY3Rpb24gKGVsKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgaXNUYWdQYWlyID0gJChlbCkuaGFzQ2xhc3MoJ3VlLXRhZ3BhaXItY29udGVudCcpO1xyXG5cclxuICBpZiAoIWlzVGFnUGFpcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgbWUuX2NsZWFudXAoZWwpO1xyXG59O1xyXG5cclxucHJvdG8uaW5zZXJ0UmFuZ2VDb250ZW50ID0gZnVuY3Rpb24gKHJhbmdlQ29udGVudCwgY29tbW9uQW5jZXN0b3JDb250YWluZXIpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKSxcclxuICAgICAgZm9jdXNOb2RlLFxyXG4gICAgICBjaGlsZE5vZGUsXHJcbiAgICAgIG5leHRTaWJsaW5nLFxyXG4gICAgICBhaGVhZFNpYmxpbmc7XHJcblxyXG4gIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcblxyXG4gIGlmIChyYW5nZUNvbnRlbnQuY2hpbGROb2Rlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChmb2N1c05vZGUgPT09IG51bGwpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIGFkZCBjb250ZW50IGJhY2tcclxuICB3aGlsZSAoZm9jdXNOb2RlLnBhcmVudE5vZGUgIT09IGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyKSB7XHJcbiAgICBmb2N1c05vZGUgPSBmb2N1c05vZGUucGFyZW50Tm9kZTtcclxuICB9XHJcblxyXG4gIGNoaWxkTm9kZSA9IHJhbmdlQ29udGVudC5jaGlsZE5vZGVzWzBdO1xyXG5cclxuICB2YXIgZmlyc3RDaGlsZEVsID0gJChjaGlsZE5vZGUpO1xyXG4gIGlmIChmaXJzdENoaWxkRWwuaGFzQ2xhc3MoJ3VlLXRhZy13cmFwcGVyJykpIHtcclxuICAgIC8vIHNpbXBsZSBjYXNlLCBqdXN0IGFkZCB0aGUgY29udGVudCBiYWNrXHJcbiAgICAkKGZvY3VzTm9kZSkuYWZ0ZXIoZmlyc3RDaGlsZEVsWzBdKTtcclxuICAgIG5leHRTaWJsaW5nID0gZm9jdXNOb2RlLm5leHRTaWJsaW5nO1xyXG4gIH0gZWxzZSBpZiAobWUuX25lZWRUb01lcmdlQ29udGFpbmVycyhjaGlsZE5vZGUsIGZvY3VzTm9kZSkpIHtcclxuICAgIG1lLm1lcmdlQ29udGVudEF0RW5kT2YoY2hpbGROb2RlLCBmb2N1c05vZGUpO1xyXG4gICAgbmV4dFNpYmxpbmcgPSBmb2N1c05vZGU7XHJcbiAgfVxyXG5cclxuICB3aGlsZSAocmFuZ2VDb250ZW50LmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xyXG4gICAgY2hpbGROb2RlID0gcmFuZ2VDb250ZW50LmNoaWxkTm9kZXNbMF07XHJcbiAgICBhaGVhZFNpYmxpbmcgPSBuZXh0U2libGluZy5uZXh0U2libGluZztcclxuXHJcbiAgICBpZiAobWUuX25lZWRUb01lcmdlQ29udGFpbmVycyhjaGlsZE5vZGUsIGFoZWFkU2libGluZykpIHtcclxuICAgICAgbWUubWVyZ2VDb250ZW50QWhlYWRPZihjaGlsZE5vZGUsIGFoZWFkU2libGluZyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAkKG5leHRTaWJsaW5nKS5hZnRlcihjaGlsZE5vZGUpO1xyXG4gICAgICBuZXh0U2libGluZyA9IGNoaWxkTm9kZTtcclxuICAgIH1cclxuICB9XHJcblxyXG59O1xyXG5cclxucHJvdG8uX25lZWRUb01lcmdlQ29udGFpbmVycyA9IGZ1bmN0aW9uIChjaGlsZE5vZGUsIGFoZWFkU2libGluZykge1xyXG4gIHZhciBpc0NoaWxkTm9kZVRhZ0NvbnRhaW5lcixcclxuICAgICAgaXNBaGVhZFNpYmlsaW5nVGFnQ29udGFpbmVyLFxyXG4gICAgICBjaGlsZE5vZGVUYWdJZCxcclxuICAgICAgYWhlYWRTaWJsaW5nVGFnSWQsXHJcbiAgICAgIGlzTWVyZ2VOZWVkZWQ7XHJcblxyXG4gIGlzQ2hpbGROb2RlVGFnQ29udGFpbmVyID0gJChjaGlsZE5vZGUpLmhhc0NsYXNzKCd1ZS10YWdwYWlyLWNvbnRlbnQnKTtcclxuICBpc0FoZWFkU2liaWxpbmdUYWdDb250YWluZXIgPSAkKGFoZWFkU2libGluZykuaGFzQ2xhc3MoJ3VlLXRhZ3BhaXItY29udGVudCcpO1xyXG5cclxuICBpZiAoIWlzQ2hpbGROb2RlVGFnQ29udGFpbmVyKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBpZiAoIWlzQWhlYWRTaWJpbGluZ1RhZ0NvbnRhaW5lcikge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgY2hpbGROb2RlVGFnSWQgPSBjaGlsZE5vZGUuZGF0YXNldC5pZDtcclxuICBhaGVhZFNpYmxpbmdUYWdJZCA9IGFoZWFkU2libGluZy5kYXRhc2V0LmlkO1xyXG5cclxuICBpc01lcmdlTmVlZGVkID0gY2hpbGROb2RlVGFnSWQgPT09IGFoZWFkU2libGluZ1RhZ0lkO1xyXG5cclxuICByZXR1cm4gaXNNZXJnZU5lZWRlZDtcclxufTtcclxuXHJcbnByb3RvLm1lcmdlQ29udGVudEFoZWFkT2YgPSBmdW5jdGlvbiAoY2hpbGROb2RlLCBhaGVhZFNpYmxpbmcpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBwb3NpdGlvbkVsO1xyXG5cclxuICBwb3NpdGlvbkVsID0gJChjaGlsZE5vZGUuY2hpbGROb2Rlc1swXSk7XHJcbiAgcG9zaXRpb25FbC5wcmVwZW5kVG8oYWhlYWRTaWJsaW5nKTtcclxuXHJcbiAgbWUubW92ZUNvbnRlbnRzKGNoaWxkTm9kZSwgcG9zaXRpb25FbCk7XHJcblxyXG4gICQoY2hpbGROb2RlKS5yZW1vdmUoKTtcclxufTtcclxuXHJcbnByb3RvLm1lcmdlQ29udGVudEF0RW5kT2YgPSBmdW5jdGlvbiAoY2hpbGROb2RlLCBwcmV2aW91c1NpYmxpbmcpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBwb3NpdGlvbkVsO1xyXG5cclxuICBwb3NpdGlvbkVsID0gJChjaGlsZE5vZGUuY2hpbGROb2Rlc1swXSk7XHJcbiAgcG9zaXRpb25FbC5hcHBlbmRUbyhwcmV2aW91c1NpYmxpbmcpO1xyXG5cclxuICBtZS5tb3ZlQ29udGVudHMoY2hpbGROb2RlLCBwb3NpdGlvbkVsKTtcclxuXHJcbiAgJChjaGlsZE5vZGUpLnJlbW92ZSgpO1xyXG59O1xyXG5cclxucHJvdG8ubW92ZUNvbnRlbnRzID0gZnVuY3Rpb24gKGZyb21Ob2RlLCBhZnRlclBvc2l0aW9uRWwpIHtcclxuICB2YXIgcG9zaXRpb25FbCA9IGFmdGVyUG9zaXRpb25FbCxcclxuICAgICAgY2hpbGROb2RlID0gZnJvbU5vZGUsXHJcbiAgICAgIGN1cnJlbnROb2RlO1xyXG5cclxuICB3aGlsZSAoY2hpbGROb2RlLmNoaWxkTm9kZXMubGVuZ3RoID4gMCkge1xyXG4gICAgY3VycmVudE5vZGUgPSBjaGlsZE5vZGUuY2hpbGROb2Rlc1swXTtcclxuICAgIHBvc2l0aW9uRWwuYWZ0ZXIoY3VycmVudE5vZGUpO1xyXG4gICAgcG9zaXRpb25FbCA9ICQoY3VycmVudE5vZGUpO1xyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLnByZXZlbnRUYWdzUmVtb3ZhbCA9IGZ1bmN0aW9uIChldikge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHNlbGVjdGlvbiA9IGRvY3VtZW50LmdldFNlbGVjdGlvbigpLFxyXG4gICAgICB0ZXh0Tm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGUsXHJcbiAgICAgIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGUsXHJcbiAgICAgIGZvY3VzT2Zmc2V0ID0gc2VsZWN0aW9uLmZvY3VzT2Zmc2V0LFxyXG4gICAgICBmb2N1c05vZGVMZW5ndGgsXHJcbiAgICAgIGlzS2V5QmFja3NwYWNlID0gZXYua2V5Q29kZSA9PT0gbWUua2V5QmFja3NwYWNlLFxyXG4gICAgICBpc0tleURlbGV0ZSA9IGV2LmtleUNvZGUgPT09IG1lLmtleURlbGV0ZSxcclxuICAgICAgc2luZ2xlQ2hhcmFjdGVyID0gMTtcclxuXHJcbiAgaWYgKCFzZWxlY3Rpb24uaXNDb2xsYXBzZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChmb2N1c05vZGUgPT09IG51bGwpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmICghaXNLZXlEZWxldGUgJiYgIWlzS2V5QmFja3NwYWNlKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoZm9jdXNOb2RlLm5vZGVUeXBlID09PSBtZS50ZXh0Tm9kZVR5cGUpIHtcclxuICAgIC8vIEZpcmVmb3ggcG9zaXRpb24gZml4XHJcbiAgICBpZiAoZm9jdXNPZmZzZXQgPT09IDAgJiYgaXNLZXlCYWNrc3BhY2UpIHtcclxuICAgICAgbWUuZml4RmlyZWZveFBvc2l0aW9uWmVybygpO1xyXG4gICAgICBmb2N1c05vZGUgPSBzZWxlY3Rpb24uZm9jdXNOb2RlO1xyXG4gICAgICBmb2N1c09mZnNldCA9IHNlbGVjdGlvbi5mb2N1c09mZnNldDtcclxuICAgIH1cclxuXHJcbiAgICBmb2N1c05vZGVMZW5ndGggPSBmb2N1c05vZGUubGVuZ3RoO1xyXG4gICAgZm9jdXNOb2RlID0gZm9jdXNOb2RlLnBhcmVudE5vZGU7XHJcbiAgfVxyXG5cclxuICB2YXIgaXNBdEVuZCA9IGZvY3VzT2Zmc2V0ID09PSBmb2N1c05vZGVMZW5ndGg7XHJcbiAgdmFyIGlzQXRTdGFydCA9IGZvY3VzT2Zmc2V0ID09PSBzaW5nbGVDaGFyYWN0ZXI7XHJcbiAgdmFyIGlzQXRMYXN0Q2hhcmFjdGVyID0gKCFpc0F0RW5kICYmIChmb2N1c09mZnNldCArIHNpbmdsZUNoYXJhY3RlcikpID09PSBmb2N1c05vZGVMZW5ndGg7XHJcblxyXG4gIHZhciBpc0ZvY3VzT25UZXh0LFxyXG4gICAgICBpc05leHRTaWJsaW5nVGFnLFxyXG4gICAgICBpc1ByZXZpb3VzU2liaWxpbmdUYWcsXHJcbiAgICAgIGlzQ3VycmVudENvbnRhaW5lclRhZ1BhaXJDb250ZW50LFxyXG4gICAgICBpc1BhcmVudFRhZ0NvbnRhaW5lcixcclxuICAgICAgdWVUYWdXcmFwcGVyLFxyXG4gICAgICByYW5nZTtcclxuXHJcbiAgaXNGb2N1c09uVGV4dCA9ICQoZm9jdXNOb2RlKS5oYXNDbGFzcygndWUtdGV4dCcpO1xyXG4gIC8vIGlzUGFyZW50VGFnQ29udGFpbmVyIHNob3VsZCBiZSB0cnVlIGluIGZpcmVmb3hcclxuICBpc1BhcmVudFRhZ0NvbnRhaW5lciA9ICQoZm9jdXNOb2RlLnBhcmVudE5vZGUpLmhhc0NsYXNzKCd1ZS10YWdwYWlyLWNvbnRlbnQnKTtcclxuXHJcbiAgdmFyIG5leHRTaWJsaW5nID0gZm9jdXNOb2RlLm5leHRTaWJsaW5nO1xyXG4gIHZhciBwcmV2aW91c1NpYmxpbmcgPSBmb2N1c05vZGUucHJldmlvdXNTaWJsaW5nO1xyXG4gIHZhciBmb2N1c05vZGVQYXJlbnQgPSBmb2N1c05vZGUucGFyZW50Tm9kZTtcclxuXHJcbiAgaXNOZXh0U2libGluZ1RhZyA9ICQobmV4dFNpYmxpbmcpLmhhc0NsYXNzKCd1ZS10YWctd3JhcHBlcicpO1xyXG4gIGlzUHJldmlvdXNTaWJpbGluZ1RhZyA9ICQocHJldmlvdXNTaWJsaW5nKS5oYXNDbGFzcygndWUtdGFnLXdyYXBwZXInKTtcclxuICBpc0N1cnJlbnRDb250YWluZXJUYWdQYWlyQ29udGVudCA9ICQoZm9jdXNOb2RlUGFyZW50KS5oYXNDbGFzcygndWUtdGFncGFpci1jb250ZW50Jyk7XHJcblxyXG4gIGlmICghaXNBdFN0YXJ0ICYmICFpc0F0RW5kICYmICFpc0F0TGFzdENoYXJhY3RlciB8fCAhaXNGb2N1c09uVGV4dCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKGlzUHJldmlvdXNTaWJpbGluZ1RhZyB8fCBpc05leHRTaWJsaW5nVGFnIHx8IGlzQ3VycmVudENvbnRhaW5lclRhZ1BhaXJDb250ZW50KSB7XHJcbiAgICBpZiAoaXNLZXlCYWNrc3BhY2UpIHtcclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICAgICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xyXG4gICAgICByYW5nZS5zZXRTdGFydCh0ZXh0Tm9kZSwgKGZvY3VzT2Zmc2V0IC0gc2luZ2xlQ2hhcmFjdGVyKSk7XHJcbiAgICAgIHJhbmdlLnNldEVuZCh0ZXh0Tm9kZSwgZm9jdXNPZmZzZXQpO1xyXG5cclxuICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuICAgICAgcmFuZ2UuZGVsZXRlQ29udGVudHMoKTtcclxuXHJcbiAgICAgIC8vIHBvc2l0aW9uXHJcbiAgICAgIGlmIChpc0F0U3RhcnQpIHtcclxuICAgICAgICB2YXIgbW92ZURpcmVjdGlvbiA9IGlzS2V5QmFja3NwYWNlID8gJ2JhY2t3YXJkJyA6ICdmb3J3YXJkJztcclxuICAgICAgICBzZWxlY3Rpb24ubW9kaWZ5KCdtb3ZlJywgbW92ZURpcmVjdGlvbiwgJ2NoYXJhY3RlcicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGlzS2V5RGVsZXRlICYmIGlzTmV4dFNpYmxpbmdUYWcpIHtcclxuICAgICAgdmFyIHRhZ1BhaXJDb250ZW50ID0gbmV4dFNpYmxpbmcubmV4dFNpYmxpbmc7XHJcbiAgICAgIHZhciBpc1RhZ1BhaXJDb250YWluZXIgPSAkKHRhZ1BhaXJDb250ZW50KS5oYXNDbGFzcygndWUtdGFncGFpci1jb250ZW50Jyk7XHJcblxyXG4gICAgICBpZiAoaXNBdExhc3RDaGFyYWN0ZXIpIHtcclxuICAgICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgICAvLyByZW1vdmUgZnJvbSB0aGUgbmV4dCB0ZXh0IG5vZGVcclxuICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcbiAgICAgICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xyXG4gICAgICAgIHJhbmdlLnNldFN0YXJ0KHRleHROb2RlLCBmb2N1c09mZnNldCk7XHJcbiAgICAgICAgcmFuZ2Uuc2V0RW5kKHRleHROb2RlLCBmb2N1c09mZnNldCArIHNpbmdsZUNoYXJhY3Rlcik7XHJcbiAgICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuICAgICAgICByYW5nZS5kZWxldGVDb250ZW50cygpO1xyXG5cclxuICAgICAgICAvLyBzZXQgc2VsZWN0aW9uIHBvc2l0aW9uIHRvIHN0YXJ0IG9mIHRleHQgbm9kZVxyXG4gICAgICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICAgICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICAgICAgcmFuZ2Uuc2V0U3RhcnQodGV4dE5vZGUsIGZvY3VzT2Zmc2V0KTtcclxuICAgICAgICByYW5nZS5zZXRFbmQodGV4dE5vZGUsIGZvY3VzT2Zmc2V0KTtcclxuICAgICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaXNBdEVuZCkge1xyXG4gICAgICAgIGlmIChpc1RhZ1BhaXJDb250YWluZXIpIHtcclxuICAgICAgICAgIHZhciB1ZVRleHQgPSB0YWdQYWlyQ29udGVudC5maXJzdENoaWxkO1xyXG4gICAgICAgICAgdGV4dE5vZGUgPSB1ZVRleHQuZmlyc3RDaGlsZDtcclxuXHJcbiAgICAgICAgICBpZiAodGV4dE5vZGUubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIC8vIG1vdmUgdG8gbmV4dCBzaWJsaW5nXHJcbiAgICAgICAgICAgIHVlVGFnV3JhcHBlciA9IHRhZ1BhaXJDb250ZW50Lm5leHRTaWJsaW5nO1xyXG4gICAgICAgICAgICB1ZVRleHQgPSB1ZVRhZ1dyYXBwZXIubmV4dFNpYmxpbmc7XHJcblxyXG4gICAgICAgICAgICBpZiAodWVUZXh0ID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0ZXh0Tm9kZSA9IHVlVGV4dC5maXJzdENoaWxkO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgICAgICAgLy8gcmVtb3ZlIGZyb20gdGhlIG5leHQgdGV4dCBub2RlXHJcbiAgICAgICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcbiAgICAgICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICAgICAgICByYW5nZS5zZXRTdGFydCh0ZXh0Tm9kZSwgMCk7XHJcbiAgICAgICAgICByYW5nZS5zZXRFbmQodGV4dE5vZGUsIDEpO1xyXG4gICAgICAgICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuICAgICAgICAgIHJhbmdlLmRlbGV0ZUNvbnRlbnRzKCk7XHJcblxyXG4gICAgICAgICAgLy8gc2V0IHNlbGVjdGlvbiBwb3NpdGlvbiB0byBzdGFydCBvZiB0ZXh0IG5vZGVcclxuICAgICAgICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcclxuICAgICAgICAgIHJhbmdlLnNldFN0YXJ0KHRleHROb2RlLCAwKTtcclxuICAgICAgICAgIHJhbmdlLnNldEVuZCh0ZXh0Tm9kZSwgMCk7XHJcbiAgICAgICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGlzS2V5RGVsZXRlICYmIGlzUGFyZW50VGFnQ29udGFpbmVyKSB7XHJcbiAgICAvLyB0aGlzIGlzIGZpcmVmb3gsIGhlIHB1dHMgdGhlIHNlbGVjdGlvbiB3aXRoaW4gdGhlIHRleHQgbm9kZVxyXG4gICAgLy8gdW5saWtlIHRoZSBjdXJyZW50IGNocm9tZSBpbXBsZW1lbnRhdGlvblxyXG5cclxuICAgIC8vIHJlbW92ZSB0ZXh0Tm9kZSBjb250ZW50XHJcbiAgICB2YXIgaXNSZW1vdmluZ0Zyb21DdXJyZW50VGFnQ29udGFpbmVyID0gZm9jdXNPZmZzZXQgKyBzaW5nbGVDaGFyYWN0ZXIgPT09IGZvY3VzTm9kZUxlbmd0aDtcclxuICAgIGlmIChpc1JlbW92aW5nRnJvbUN1cnJlbnRUYWdDb250YWluZXIpIHtcclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcclxuICAgICAgcmFuZ2Uuc2V0U3RhcnQodGV4dE5vZGUsIGZvY3VzT2Zmc2V0KTtcclxuICAgICAgcmFuZ2Uuc2V0RW5kKHRleHROb2RlLCAoZm9jdXNPZmZzZXQgKyBzaW5nbGVDaGFyYWN0ZXIpKTtcclxuICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xyXG4gICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UpO1xyXG4gICAgICByYW5nZS5kZWxldGVDb250ZW50cygpO1xyXG4gICAgfVxyXG4gICAgLy8gbW92ZSBzZWxlY3Rpb24gdG8gbmV4dCBzaWJsaW5nXHJcbiAgICBuZXh0U2libGluZyA9IGZvY3VzTm9kZVBhcmVudDtcclxuICAgIGRvIHtcclxuICAgICAgbmV4dFNpYmxpbmcgPSBuZXh0U2libGluZy5uZXh0U2libGluZztcclxuICAgIH0gd2hpbGUgKG5leHRTaWJsaW5nICE9PSBudWxsICYmICQobmV4dFNpYmxpbmcpLmhhc0NsYXNzKCd1ZS10YWctd3JhcHBlcicpKTtcclxuXHJcbiAgICB0ZXh0Tm9kZSA9IG5leHRTaWJsaW5nO1xyXG4gICAgZG8ge1xyXG4gICAgICB0ZXh0Tm9kZSA9IHRleHROb2RlLmZpcnN0Q2hpbGQ7XHJcbiAgICB9IHdoaWxlICh0ZXh0Tm9kZSAhPT0gbnVsbCAmJiB0ZXh0Tm9kZS5ub2RlVHlwZSAhPT0gbWUudGV4dE5vZGVUeXBlKTtcclxuXHJcbiAgICBpZiAoIWlzUmVtb3ZpbmdGcm9tQ3VycmVudFRhZ0NvbnRhaW5lcikge1xyXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICAgIHJhbmdlLnNldFN0YXJ0KHRleHROb2RlLCAwKTtcclxuICAgICAgcmFuZ2Uuc2V0RW5kKHRleHROb2RlLCBzaW5nbGVDaGFyYWN0ZXIpO1xyXG4gICAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcbiAgICAgIHNlbGVjdGlvbi5hZGRSYW5nZShyYW5nZSk7XHJcbiAgICAgIHJhbmdlLmRlbGV0ZUNvbnRlbnRzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xyXG4gICAgcmFuZ2Uuc2V0U3RhcnQodGV4dE5vZGUsIDApO1xyXG4gICAgcmFuZ2Uuc2V0RW5kKHRleHROb2RlLCAwKTtcclxuICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICAgIHNlbGVjdGlvbi5hZGRSYW5nZShyYW5nZSk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8uZml4RmlyZWZveFBvc2l0aW9uWmVybyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCksXHJcbiAgICAgIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGUsXHJcbiAgICAgIHVlVGV4dCwgdWVUYWcsIHVlVGFnQ29udGFpbmVyLFxyXG4gICAgICByYW5nZTtcclxuXHJcbiAgdWVUZXh0ID0gZm9jdXNOb2RlLnBhcmVudE5vZGU7XHJcbiAgdWVUYWcgPSB1ZVRleHQucHJldmlvdXNTaWJsaW5nO1xyXG5cclxuICBpZiAoJCh1ZVRhZykuaGFzQ2xhc3MoJ3VlLXRhZy13cmFwcGVyJykpIHtcclxuICAgIHVlVGFnQ29udGFpbmVyID0gdWVUYWcucHJldmlvdXNTaWJsaW5nO1xyXG5cclxuICAgIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcclxuICAgIHJhbmdlLnNlbGVjdE5vZGUodWVUYWdDb250YWluZXIubGFzdENoaWxkKTtcclxuICAgIHJhbmdlLmNvbGxhcHNlKCk7XHJcblxyXG4gICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xyXG4gICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuICB9XHJcbn07XHJcblxyXG5wcm90by5oYW5kbGVDbGVhclRhZ3NTaG9ydGN1dFByZXZlbnRzRGVmYXVsdCA9IGZ1bmN0aW9uIChldikge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICBzZWxlY3Rpb24gPSBuZXcgU2VsZWN0aW9uLlNlbGVjdGlvbkNvbnRleHQoKSxcclxuICAgIGlzQ3RybFByZXNzZWQgPSBldi5jdHJsS2V5LFxyXG4gICAgaXNTcGFjZUtleVByZXNzZWQgPSBldi5rZXlDb2RlID09PSBtZS5rZXlTcGFjZSxcclxuICAgIGlzQ2xlYXJUYWdzQ29tbWFuZFByZXNzZWQgPSBpc0N0cmxQcmVzc2VkICYmIGlzU3BhY2VLZXlQcmVzc2VkO1xyXG5cclxuICBpZiAobWUuaXNDcm9zc1NlZ21lbnRTZWxlY3Rpb24oKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoIWlzQ2xlYXJUYWdzQ29tbWFuZFByZXNzZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbn07XHJcblxyXG5wcm90by5oYW5kbGVDbGVhclRhZ3MgPSBmdW5jdGlvbiAoZXYpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBzZWxlY3Rpb24gPSBuZXcgU2VsZWN0aW9uLlNlbGVjdGlvbkNvbnRleHQoKSxcclxuICAgICAgaXNDdHJsUHJlc3NlZCA9IGV2LmN0cmxLZXksXHJcbiAgICAgIGlzU3BhY2VLZXlQcmVzc2VkID0gZXYua2V5Q29kZSA9PT0gbWUua2V5U3BhY2UsXHJcbiAgICAgIGlzQ2xlYXJUYWdzQ29tbWFuZFByZXNzZWQgPSBpc0N0cmxQcmVzc2VkICYmIGlzU3BhY2VLZXlQcmVzc2VkO1xyXG5cclxuICBpZiAobWUuaXNDcm9zc1NlZ21lbnRTZWxlY3Rpb24oKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNlbGVjdGlvbi5pc0NvbGxhcHNlZCgpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAoIWlzQ2xlYXJUYWdzQ29tbWFuZFByZXNzZWQpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIG1lLnRhZ3MgPSB7fTtcclxuICBtZS5zdG9yZWRFdmVudCA9IGV2O1xyXG5cclxuICB2YXIgY29tbW9uQW5jZXN0b3JDb250YWluZXIgPSBzZWxlY3Rpb24uY29tbW9uQW5jZXN0b3JDb250YWluZXIsXHJcbiAgICAgIHN0YXJ0Q29udGFpbmVyID0gc2VsZWN0aW9uLnN0YXJ0Q29udGFpbmVyLFxyXG4gICAgICBlbmRDb250YWluZXIgPSBzZWxlY3Rpb24uZW5kQ29udGFpbmVyO1xyXG4gIGlmIChjb21tb25BbmNlc3RvckNvbnRhaW5lciA9PT0gc3RhcnRDb250YWluZXIgJiYgY29tbW9uQW5jZXN0b3JDb250YWluZXIgPT09IGVuZENvbnRhaW5lcikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICAvLyBUT0RPIHNlZSBhYm91dCBlZGdlIGNhc2VzIHdoZXJlIHRoZSBzdGFydENvbnRhaW5lciBhbmQgZW5kQ29udGFpbmVyIGFyZSBsZWZ0IHdpdGggbm8gY29udGVudFxyXG4gIC8vIGlmIHNlbGVjdGlvbiBhdCBzdGFydCBpcyAwIG1heWJlIHRoZSB0YWdwYWlyIHN0YXJ0IHNob3VsZCBhdXRvbWF0aWNhbGx5IGJlIGluY2x1ZGVkIHdpdGggdGhlIHNlbGVjdGlvblxyXG4gIC8vIGlmIHNlbGVjdGlvbiBhdCBlbmQgaXMgZnVsbCBjb250YWluZXIgbGVuZ3RoIG1heWJlIHRoZSB0YWdwYWlyIGVuZCBzaG91bGQgYXV0b21hdGljYWxseSBiZSBpbmNsdWRlZCB3aXRoIHRoZSBzZWxlY3Rpb25cclxuXHJcbiAgdmFyIG5vZGVXYWxrZXIgPSBuZXcgU2VsZWN0aW9uLk5vZGVXYWxrZXIoc3RhcnRDb250YWluZXIpO1xyXG4gIHZhciBlbmQgPSBuZXcgU2VsZWN0aW9uLk5vZGVXYWxrZXIoZW5kQ29udGFpbmVyKTtcclxuXHJcbiAgaWYgKGVuZC5pc1RleHROb2RlKCkpIHtcclxuICAgIGVuZCA9IGVuZC5wYXJlbnQoKTtcclxuICB9XHJcblxyXG4gIHdoaWxlICghbm9kZVdhbGtlci5pc051bGwoKSAmJiAhbm9kZVdhbGtlci5pc1dyYXBwZXJGb3IoY29tbW9uQW5jZXN0b3JDb250YWluZXIpKSB7XHJcbiAgICBtZS5pZGVudGlmeVRhZ3NJbkNvbnRhaW5lcihub2RlV2Fsa2VyLCBlbmQpO1xyXG4gICAgbm9kZVdhbGtlciA9IG5vZGVXYWxrZXIucGFyZW50KCk7XHJcbiAgfVxyXG5cclxuICB2YXIgZG9jdW1lbnRGcmFnbWVudENvbnRhaW5lciA9IG5ldyBTZWxlY3Rpb24uTm9kZVdhbGtlcihzZWxlY3Rpb24uY2xvbmVDb250ZW50cygpKTtcclxuXHJcbiAgbWUubW92ZVRhZ3NUb0Zyb250ID0gW107XHJcbiAgbWUubW92ZVRhZ3NUb0VuZCA9IFtdO1xyXG5cclxuICBtZS50cmFuc2Zvcm1UYWdzKGRvY3VtZW50RnJhZ21lbnRDb250YWluZXIpO1xyXG5cclxuICBtZS5tb3ZlVGFnc1RvRnJvbnQuZm9yRWFjaChmdW5jdGlvbiAodGFnKSB7XHJcbiAgICB0YWcucmVtb3ZlKCk7XHJcbiAgfSk7XHJcbiAgbWUubW92ZVRhZ3NUb0VuZC5mb3JFYWNoKGZ1bmN0aW9uICh0YWcpIHtcclxuICAgIHRhZy5yZW1vdmUoKTtcclxuICB9KTtcclxuXHJcbiAgdmFyIG5lZWRzVG9Nb3ZlVGFncyA9ICBtZS5tb3ZlVGFnc1RvRnJvbnQubGVuZ3RoID4gMCB8fCBtZS5tb3ZlVGFnc1RvRW5kLmxlbmd0aCA+IDA7XHJcbiAgaWYgKCFuZWVkc1RvTW92ZVRhZ3MpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHNlbGVjdGlvbi5kZWxldGVDb250ZW50cygpO1xyXG5cclxuICB2YXIgcGF0Y2ggPSBuZXcgU2VsZWN0aW9uLk5vZGVXYWxrZXIoc3RhcnRDb250YWluZXIpO1xyXG4gIGlmIChwYXRjaC5pc1RleHROb2RlKCkpIHtcclxuICAgIHBhdGNoID0gcGF0Y2gucGFyZW50KCk7XHJcbiAgfVxyXG5cclxuICB2YXIgbGFzdEVuZFRhZyA9IHBhdGNoO1xyXG4gIHdoaWxlIChwYXRjaC5wYXJlbnQoKS5pc1RhZ1BhaXJDb250YWluZXIoKSkge1xyXG4gICAgcGF0Y2ggPSBwYXRjaC5wYXJlbnQoKTtcclxuICAgIGlmIChtZS5tb3ZlVGFnc1RvRnJvbnQubGVuZ3RoID4gMCkge1xyXG4gICAgICBsYXN0RW5kVGFnID0gbWUubW92ZVRhZ3NUb0Zyb250LnNoaWZ0KCk7XHJcbiAgICAgIHBhdGNoLmluc2VydEFmdGVyKGxhc3RFbmRUYWcpO1xyXG4gICAgfVxyXG4gIH1cclxuICBsYXN0RW5kVGFnLmluc2VydEFmdGVyKGRvY3VtZW50RnJhZ21lbnRDb250YWluZXIpO1xyXG5cclxuICBwYXRjaCA9IG5ldyBTZWxlY3Rpb24uTm9kZVdhbGtlcihlbmRDb250YWluZXIpO1xyXG4gIGlmIChwYXRjaC5pc1RleHROb2RlKCkpIHtcclxuICAgIHBhdGNoID0gcGF0Y2gucGFyZW50KCk7XHJcbiAgfVxyXG5cclxuICB3aGlsZSAoIXBhdGNoLmlzTnVsbCgpICYmIHBhdGNoLnBhcmVudCgpLmlzVGFnUGFpckNvbnRhaW5lcigpKSB7XHJcbiAgICBwYXRjaCA9IHBhdGNoLnBhcmVudCgpO1xyXG5cclxuICAgIGlmIChtZS5tb3ZlVGFnc1RvRW5kLmxlbmd0aCA+IDApIHtcclxuICAgICAgcGF0Y2guaW5zZXJ0QmVmb3JlKG1lLm1vdmVUYWdzVG9FbmQucG9wKCkpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbWUubW92ZVRhZ3NUb0Zyb250ID0gbnVsbDtcclxuICBtZS5tb3ZlVGFnc1RvRW5kID0gbnVsbDtcclxuICBtZS50YWdzID0gbnVsbDtcclxuICBtZS5zdG9yZWRFdmVudCA9IG51bGw7XHJcbn07XHJcblxyXG5wcm90by5pZGVudGlmeVRhZ3NJbkNvbnRhaW5lciA9IGZ1bmN0aW9uIChub2RlV2Fsa2VyLCBlbmQpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICB0YWdJZDtcclxuXHJcbiAgbWUuZW5kQ29udGFpbmVyUmVhY2hlZCA9IGZhbHNlO1xyXG5cclxuICBkbyB7XHJcbiAgICBpZiAobm9kZVdhbGtlci5lcXVhbHMoZW5kKSkge1xyXG4gICAgICBtZS5lbmRDb250YWluZXJSZWFjaGVkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZVdhbGtlci5pc1RhZ1BhaXJDb250YWluZXIoKSkge1xyXG4gICAgICBub2RlV2Fsa2VyID0gbm9kZVdhbGtlci5maXJzdENoaWxkKCk7XHJcbiAgICAgIG1lLmlkZW50aWZ5VGFnc0luQ29udGFpbmVyKG5vZGVXYWxrZXIsIGVuZCk7XHJcbiAgICAgIG5vZGVXYWxrZXIgPSBub2RlV2Fsa2VyLnBhcmVudCgpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlV2Fsa2VyLmlzU3RhcnRUYWcoKSAmJiBub2RlV2Fsa2VyLmNhbkhpZGUoKSkge1xyXG4gICAgICB0YWdJZCA9IG5vZGVXYWxrZXIudGFnSWQoKTtcclxuICAgICAgbWUudGFnc1t0YWdJZF0gPSB7c3RhcnRUYWc6IG5vZGVXYWxrZXIsXHJcbiAgICAgICAgZW5kVGFnOiBudWxsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vZGVXYWxrZXIuaXNFbmRUYWcoKSAmJiBub2RlV2Fsa2VyLmNhbkhpZGUoKSkge1xyXG4gICAgICB0YWdJZCA9IG5vZGVXYWxrZXIudGFnSWQoKTtcclxuICAgICAgbWUudGFnc1t0YWdJZF0gPSBtZS50YWdzW3RhZ0lkXSB8fCB7c3RhcnRUYWc6IG51bGwsIGVuZFRhZzogbnVsbCB9O1xyXG4gICAgICBtZS50YWdzW3RhZ0lkXS5lbmRUYWcgPSBub2RlV2Fsa2VyO1xyXG5cclxuICAgICAgaWYgKG1lLnRhZ3NbdGFnSWRdLnN0YXJ0VGFnICE9PSBudWxsKSB7XHJcbiAgICAgICAgbWUuX3JlbW92ZUlubGluZShub2RlV2Fsa2VyLmVsLCBtZS5zdG9yZWRFdmVudCk7XHJcblxyXG4gICAgICAgIGRlbGV0ZSBtZS50YWdzW3RhZ0lkXTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG5vZGVXYWxrZXIgPSBub2RlV2Fsa2VyLm5leHQoKTtcclxuXHJcbiAgfSB3aGlsZSAoIW5vZGVXYWxrZXIuaXNOdWxsKCkgJiYgIW1lLmVuZENvbnRhaW5lclJlYWNoZWQpO1xyXG5cclxuICBub2RlV2Fsa2VyLnJldHVyblRvUHJldmlvdXMoKTtcclxufTtcclxuXHJcbnByb3RvLnRyYW5zZm9ybVRhZ3MgPSBmdW5jdGlvbiAoY29udGFpbmVyKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgaXNJblRhZ3MsXHJcbiAgICAgIG5vZGVXYWxrZXI7XHJcblxyXG4gIGlmICghY29udGFpbmVyLmhhc0NoaWxkcmVuKCkpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIG5vZGVXYWxrZXIgPSBjb250YWluZXIuZmlyc3RDaGlsZCgpO1xyXG4gIGRvIHtcclxuICAgIGlzSW5UYWdzID0gbm9kZVdhbGtlci50YWdJZCgpIGluIG1lLnRhZ3M7XHJcbiAgICBpZiAobm9kZVdhbGtlci5pc1RhZ1BhaXJDb250YWluZXIoKSAmJiBpc0luVGFncykge1xyXG4gICAgICB2YXIgdGFncGFpciA9IG5vZGVXYWxrZXI7XHJcblxyXG4gICAgICBtZS50cmFuc2Zvcm1UYWdzKHRhZ3BhaXIpO1xyXG4gICAgICBub2RlV2Fsa2VyID0gbm9kZVdhbGtlci5uZXh0KCk7XHJcbiAgICAgIHRhZ3BhaXIucmVwbGFjZVdpdGhJbm5lckNvbnRlbnQoKTtcclxuXHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlV2Fsa2VyLmlzU3RhcnRUYWcoKSAmJiBpc0luVGFncykge1xyXG4gICAgICBtZS5tb3ZlVGFnc1RvRW5kLnB1c2gobm9kZVdhbGtlcik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vZGVXYWxrZXIuaXNFbmRUYWcoKSAmJiBpc0luVGFncykge1xyXG4gICAgICBtZS5tb3ZlVGFnc1RvRnJvbnQucHVzaChub2RlV2Fsa2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBub2RlV2Fsa2VyID0gbm9kZVdhbGtlci5uZXh0KCk7XHJcbiAgfSB3aGlsZSAoIW5vZGVXYWxrZXIuaXNOdWxsKCkpO1xyXG59O1xyXG5cclxuXHJcbnByb3RvLmhhbmRsZU1pc3NpbmdUZXh0Q29udGFpbmVyID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VsZWN0aW9uLFxyXG4gICAgICBmb2N1c05vZGUsXHJcbiAgICAgIHRleHRDb250ZW50LFxyXG4gICAgICB6ZXJvV2lkdGhDaGFySW5kZXgsXHJcbiAgICAgIHRleHRCZWZvcmUsXHJcbiAgICAgIHRleHRBZnRlcixcclxuICAgICAgdGV4dEVsLFxyXG4gICAgICBpc0luU2VnbWVudCxcclxuICAgICAgY29udGFpbmVyRWwsXHJcbiAgICAgIGN1cnJlbnRUZXh0LFxyXG4gICAgICB1ZVRhZ1dyYXBwZXIsXHJcbiAgICAgIHJhbmdlO1xyXG5cclxuICBpZiAobWUuaWdub3JlZEtleXMuaW5kZXhPZihldi5rZXlDb2RlKSAhPT0gLTEpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlmIChldi5rZXlDb2RlID09PSBtZS5rZXlEZWxldGUgfHwgZXYua2V5Q29kZSA9PT0gbWUua2V5QmFja3NwYWNlKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKSB8fCB7fTtcclxuICBmb2N1c05vZGUgPSBzZWxlY3Rpb24uZm9jdXNOb2RlO1xyXG5cclxuICBpZiAoZm9jdXNOb2RlID09PSB1bmRlZmluZWQgfHwgZm9jdXNOb2RlID09PSBudWxsKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB0ZXh0Q29udGVudCA9IGZvY3VzTm9kZS50ZXh0Q29udGVudDtcclxuICB6ZXJvV2lkdGhDaGFySW5kZXggPSB0ZXh0Q29udGVudC5pbmRleE9mKFN0cmluZy5mcm9tQ2hhckNvZGUodG1wbC56ZXJvV2lkdGhOb25Kb2luZXJDaGFyQ29kZSkpO1xyXG5cclxuICBpZiAoemVyb1dpZHRoQ2hhckluZGV4ID4gLTEpIHtcclxuICAgIHRleHRCZWZvcmUgPSB0ZXh0Q29udGVudC5zdWJzdHJpbmcoMCwgemVyb1dpZHRoQ2hhckluZGV4KTtcclxuICAgIHRleHRBZnRlciA9IHRleHRDb250ZW50LnN1YnN0cmluZyh6ZXJvV2lkdGhDaGFySW5kZXggKyAxKTtcclxuXHJcbiAgICB0ZXh0RWwgPSAkKHRtcGwudGV4dCkuYXBwZW5kKHRleHRCZWZvcmUpLmFwcGVuZCh0ZXh0QWZ0ZXIpO1xyXG4gICAgdGV4dEVsWzBdLmRhdGFzZXQudHlwZSA9ICd0ZXh0JztcclxuXHJcbiAgICBpc0luU2VnbWVudCA9ICQoZm9jdXNOb2RlLnBhcmVudE5vZGUpLmhhc0NsYXNzKCd1ZS1zZWdtZW50Jyk7XHJcblxyXG4gICAgaWYgKGlzSW5TZWdtZW50KSB7XHJcbiAgICAgICQoZm9jdXNOb2RlLm5leHRTaWJsaW5nKS5wcmVwZW5kKHRleHRFbCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb250YWluZXJFbCA9ICQoZm9jdXNOb2RlLnBhcmVudE5vZGUpO1xyXG5cclxuICAgICAgaWYgKGNvbnRhaW5lckVsLmhhc0NsYXNzKCd1ZS10ZXh0JykpIHtcclxuICAgICAgICBjdXJyZW50VGV4dCA9IGNvbnRhaW5lckVsLnRleHQoKTtcclxuICAgICAgICBjb250YWluZXJFbC5odG1sKHRleHRFbC50ZXh0KCkgKyBjdXJyZW50VGV4dCk7XHJcbiAgICAgIH0gZWxzZSBpZiAoY29udGFpbmVyRWwuaGFzQ2xhc3MoJ3VlLWlubGluZS1jb250ZW50JykpIHtcclxuICAgICAgICBjb250YWluZXJFbC5hcHBlbmQodGV4dEVsKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB1ZVRhZ1dyYXBwZXIgPSAkKGZvY3VzTm9kZSkucGFyZW50KCk7XHJcbiAgICAgICAgdWVUYWdXcmFwcGVyLmFmdGVyKHRleHRFbCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAkKGZvY3VzTm9kZSkucmVwbGFjZVdpdGgodG1wbC56d25qKTtcclxuXHJcbiAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICByYW5nZS5zZWxlY3ROb2RlKHRleHRFbFswXSk7XHJcbiAgICByYW5nZS5jb2xsYXBzZSgpO1xyXG5cclxuICAgIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICAgIHNlbGVjdGlvbi5hZGRSYW5nZShyYW5nZSk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8uX2hhc0lubGluZUNvbnRlbnRQYXJlbnQgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBoYXNJbmxpbmVDb250ZW50UGFyZW50ID0gJChub2RlLnBhcmVudE5vZGUpLmhhc0NsYXNzKCd1ZS1pbmxpbmUtY29udGVudCcpO1xyXG5cclxuICByZXR1cm4gaGFzSW5saW5lQ29udGVudFBhcmVudDtcclxufTtcclxuXHJcbnByb3RvLl9wb3NpdGlvbkluUGFyZW50ID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgcGFyZW50ID0gbm9kZS5wYXJlbnROb2RlLFxyXG4gICAgICBwb3NpdGlvbiA9IHBhcmVudC5jaGlsZHJlbi5pbmRleE9mKG5vZGUpO1xyXG5cclxuICByZXR1cm4gcG9zaXRpb247XHJcbn07XHJcblxyXG5wcm90by5yZXNpemVDb250YWluZXIgPSBmdW5jdGlvbiAoZXYpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG4gIHZhciBlbnRlcklzUHJlc3NlZCA9IChldi5rZXlDb2RlID09PSBtZS5rZXlFbnRlcik7XHJcblxyXG4gIGlmICghKGV2LnNoaWZ0S2V5ICYmIGVudGVySXNQcmVzc2VkKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgc2VnbWVudFdhdGNoZXIucmVzaXplKG1lLmN1cnJlbnRTZWdtZW50TnVtYmVyKTtcclxufTtcclxuXHJcbnByb3RvLm1hcmtDdXJyZW50U2VnbWVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICB2YXIgcHJldmlvdXNTZWdtZW50TnVtYmVyID0gbWUuY3VycmVudFNlZ21lbnROdW1iZXI7XHJcbiAgdmFyIHByZXZpb3VzU2VnbWVudEVsID0gbWUuY3VycmVudFNlZ21lbnRFbDtcclxuXHJcbiAgdmFyIGN1cnJlbnRTZWdtZW50U2VsZWN0aW9uID0gbWUuX3NlZ21lbnRVbmRlckN1cnJlbnRTZWxlY3Rpb24oKTtcclxuXHJcbiAgbWUuY3VycmVudFNlZ21lbnROdW1iZXIgPSBjdXJyZW50U2VnbWVudFNlbGVjdGlvbi5zZWdtZW50TnVtYmVyO1xyXG4gIG1lLmN1cnJlbnRTZWdtZW50RWwgPSBjdXJyZW50U2VnbWVudFNlbGVjdGlvbi5zZWdtZW50RWw7XHJcblxyXG4gIHNlZ21lbnRXYXRjaGVyLm1hcmtDb250YWluZXJBc0luYWN0aXZlKHByZXZpb3VzU2VnbWVudE51bWJlcik7XHJcbiAgc2VnbWVudFdhdGNoZXIubWFya0NvbnRhaW5lckFzQWN0aXZlKG1lLmN1cnJlbnRTZWdtZW50TnVtYmVyKTtcclxuXHJcbiAgaWYgKG1lLmN1cnJlbnRTZWdtZW50TnVtYmVyICE9PSB1bmRlZmluZWQgJiZcclxuICAgIG1lLmN1cnJlbnRTZWdtZW50RWwgIT09IHVuZGVmaW5lZCAmJlxyXG4gICAgbWUuY3VycmVudFNlZ21lbnROdW1iZXIgIT09IHByZXZpb3VzU2VnbWVudE51bWJlcikge1xyXG5cclxuICAgIHZhciBjdXJyZW50RGF0YXNldCA9IG1lLmN1cnJlbnRTZWdtZW50RWwuZGF0YXNldDtcclxuXHJcbiAgICBNZWRpYXRvci5wdWJsaXNoKCdzZWdtZW50OnN0YXJ0LWVkaXQnLCB7XHJcbiAgICAgIGVsOiBtZS5jdXJyZW50U2VnbWVudEVsLFxyXG4gICAgICBzZWdtZW50TnVtYmVyOiBjdXJyZW50RGF0YXNldC5zZWdtZW50TnVtYmVyLFxyXG4gICAgICBvdGhlclNlZ21lbnREYXRhOiBkYXRhUHJvdmlkZXIuZ2V0U2VnbWVudEJ5U2VnbWVudE51bWJlcihtZS5jdXJyZW50U2VnbWVudE51bWJlcilcclxuICAgIH0pO1xyXG5cclxuICB9XHJcblxyXG4gIGlmIChwcmV2aW91c1NlZ21lbnROdW1iZXIgIT09IG1lLmN1cnJlbnRTZWdtZW50TnVtYmVyICYmXHJcbiAgICAgIHByZXZpb3VzU2VnbWVudEVsICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHZhciBwcmV2aW91c0RhdGFzZXQgPSBwcmV2aW91c1NlZ21lbnRFbC5kYXRhc2V0O1xyXG5cclxuICAgIE1lZGlhdG9yLnB1Ymxpc2goJ3NlZ21lbnQ6ZW5kLWVkaXQnLCB7XHJcbiAgICAgIGVsOiBwcmV2aW91c1NlZ21lbnRFbCxcclxuICAgICAgc2VnbWVudE51bWJlcjogcHJldmlvdXNEYXRhc2V0LnNlZ21lbnROdW1iZXIsXHJcbiAgICAgIG90aGVyU2VnbWVudERhdGE6IGRhdGFQcm92aWRlci5nZXRTZWdtZW50QnlTZWdtZW50TnVtYmVyKHByZXZpb3VzU2VnbWVudE51bWJlcilcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLmNoYW5nZVN0YXR1c1RvRHJhZnQgPSBmdW5jdGlvbiAoZXYpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBpc1NoaWZ0RW50ZXJQcmVzc2VkLFxyXG4gICAgICBzZWdtZW50LFxyXG4gICAgICBzZWdtZW50RGF0YTtcclxuXHJcbiAgaXNTaGlmdEVudGVyUHJlc3NlZCA9IChldi5zaGlmdEtleSAmJiBldi5rZXlDb2RlID09PSBtZS5rZXlFbnRlcik7XHJcblxyXG4gIGlmICghaXNTaGlmdEVudGVyUHJlc3NlZCAmJiBtZS5pZ25vcmVkS2V5cy5pbmRleE9mKGV2LmtleUNvZGUpICE9PSAtMSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgc2VnbWVudERhdGEgPSBkYXRhUHJvdmlkZXIuZ2V0U2VnbWVudEJ5U2VnbWVudE51bWJlcihtZS5jdXJyZW50U2VnbWVudE51bWJlcik7XHJcbiAgc2VnbWVudCA9IG5ldyBTZWdtZW50KHNlZ21lbnREYXRhKTtcclxuXHJcbiAgaWYgKCghZXYuY3RybEtleSB8fCAhZXYubWV0YUtleSkgJiYgaGVscGVycy5rZXlDb2RlVG9TdHJpbmcoZXYud2hpY2gpICE9PSAnbCcpIHtcclxuICAgIHNlZ21lbnQuY2hhbmdlVG9EcmFmdCgpO1xyXG4gIH1cclxuXHJcblxyXG4gIE1lZGlhdG9yLnB1Ymxpc2goJ3NlZ21lbnQ6Y29uZmlybWF0aW9uTGV2ZWxDaGFuZ2VkJywgc2VnbWVudERhdGEpO1xyXG59O1xyXG5cclxuXHJcbnByb3RvLmNoYW5nZVN0YXR1c1RvQ29uZmlybWVkID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuICB2YXIgaXNDdHJsRW50ZXJQcmVzc2VkID0gZXYuY3RybEtleSAmJiAoZXYua2V5Q29kZSA9PT0gbWUua2V5RW50ZXIpO1xyXG5cclxuICBpZiAoIWlzQ3RybEVudGVyUHJlc3NlZCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNlZ21lbnQgPSBkYXRhUHJvdmlkZXIuZ2V0U2VnbWVudEJ5U2VnbWVudE51bWJlcihtZS5jdXJyZW50U2VnbWVudE51bWJlcik7XHJcblxyXG4gIGlmIChzZWdtZW50LmNvbmZpcm1hdGlvbmxldmVsICE9PSAndHJhbnNsYXRlZCcpIHtcclxuICAgIHNlZ21lbnQuY29uZmlybWF0aW9ubGV2ZWwgPSAndHJhbnNsYXRlZCc7XHJcbiAgICBNZWRpYXRvci5wdWJsaXNoKCdzZWdtZW50OmNvbmZpcm1hdGlvbkxldmVsQ2hhbmdlZCcsIHNlZ21lbnQpO1xyXG4gICAgTWVkaWF0b3IucHVibGlzaCgnc2VnbWVudDpqdW1wVG9OZXh0VW5Db25maXJtZWQnLCBzZWdtZW50KTtcclxuICB9XHJcbn07XHJcblxyXG5wcm90by5oYW5kbGVDYXJldFBvc2l0aW9uID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgYXJyb3dLZXlQcmVzc2VkID0gbWUuaXNBcnJvd0tleShldi5rZXlDb2RlKSxcclxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCksXHJcbiAgICAgIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGUsXHJcbiAgICAgIGZvY3VzT2Zmc2V0ID0gc2VsZWN0aW9uLmZvY3VzT2Zmc2V0LFxyXG4gICAgICBtb3ZlbWVudEtleXMgPSBbbWUua2V5TGVmdEFycm93LCBtZS5rZXlSaWdodEFycm93XSxcclxuICAgICAgaW5kZXhPZk1vdmVtZW50S2V5cyA9IG1vdmVtZW50S2V5cy5pbmRleE9mKGV2LmtleUNvZGUpO1xyXG5cclxuICBpZiAoc2VsZWN0aW9uID09PSBudWxsIHx8IGZvY3VzTm9kZSA9PT0gbnVsbCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgaWYgKGluZGV4T2ZNb3ZlbWVudEtleXMgPT09IC0xKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICB2YXIgaXNUZXh0Tm9kZSA9IGZvY3VzTm9kZS5ub2RlVHlwZSA9PT0gbWUudGV4dE5vZGVUeXBlO1xyXG5cclxuICB2YXIgaXNNb3ZpbmdGb3J3YXJkID0gZXYua2V5Q29kZSA9PT0gbWUua2V5UmlnaHRBcnJvdztcclxuICB2YXIgbW92ZURpcmVjdGlvbiA9IGlzTW92aW5nRm9yd2FyZCA/ICdmb3J3YXJkJyA6ICdiYWNrd2FyZCc7XHJcblxyXG4gIGlmIChpc1RleHROb2RlICYmIChtZS5faXNJbnZpc2libGVDaGFyKGZvY3VzTm9kZSkpKSB7XHJcbiAgICBpZiAoZXYua2V5Q29kZSA9PT0gbWUua2V5TGVmdEFycm93KSB7XHJcbiAgICAgIHNlbGVjdGlvbi5tb2RpZnkoJ21vdmUnLCAnYmFja3dhcmQnLCAnY2hhcmFjdGVyJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGV2LmtleUNvZGUgPT09IG1lLmtleVJpZ2h0QXJyb3cpIHtcclxuICAgICAgc2VsZWN0aW9uLm1vZGlmeSgnbW92ZScsICdmb3J3YXJkJywgJ2NoYXJhY3RlcicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKGZvY3VzTm9kZS5ub2RlVHlwZSA9PT0gbWUuZWxlbWVudE5vZGVUeXBlKSB7XHJcbiAgICBzZWxlY3Rpb24ubW9kaWZ5KCdtb3ZlJywgJ2ZvcndhcmQnLCAnY2hhcmFjdGVyJyk7XHJcbiAgfVxyXG5cclxuICB3aGlsZSAobWUuX2lzSW5zaWRlVGFnKHNlbGVjdGlvbi5mb2N1c05vZGUpKSB7XHJcbiAgICBzZWxlY3Rpb24ubW9kaWZ5KCdtb3ZlJywgbW92ZURpcmVjdGlvbiwgJ2NoYXJhY3RlcicpO1xyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLl9pc0ludmlzaWJsZUNoYXIgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciB0ZXh0Q29udGVudCA9IG5vZGUudGV4dENvbnRlbnQsXHJcbiAgICAgIGlzSW52aXNpYmxlQ2hhciA9IHRleHRDb250ZW50Lmxlbmd0aCA9PT0gMSAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXh0Q29udGVudC5jaGFyQ29kZUF0KDApID09PSB0bXBsLnplcm9XaWR0aE5vbkpvaW5lckNoYXJDb2RlO1xyXG5cclxuICByZXR1cm4gaXNJbnZpc2libGVDaGFyO1xyXG59O1xyXG5cclxucHJvdG8uX2lzSW5zaWRlVGFnID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgaXNUYWc7XHJcblxyXG4gIGlmIChub2RlLnBhcmVudE5vZGUgPT09IG51bGwpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIGlzVGFnID0gJChub2RlLnBhcmVudE5vZGUpLmhhc0NsYXNzKCd1ZS10YWcnKTtcclxuXHJcbiAgcmV0dXJuIGlzVGFnO1xyXG59O1xyXG5cclxucHJvdG8uaXNBcnJvd0tleSA9IGZ1bmN0aW9uIChrZXlDb2RlKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgcmV0dXJuIGtleUNvZGUgPT09IG1lLmtleVVwQXJyb3cgfHxcclxuICAgICAgICAga2V5Q29kZSA9PT0gbWUua2V5RG93bkFycm93IHx8XHJcbiAgICAgICAgIGtleUNvZGUgPT09IG1lLmtleUxlZnRBcnJvdyB8fFxyXG4gICAgICAgICBrZXlDb2RlID09PSBtZS5rZXlSaWdodEFycm93O1xyXG59O1xyXG5cclxuXHJcblxyXG4vKipcclxuICogTG9jayBjdXJyZW50IHNlZ21lbnQgb24gQ1RSTCtsXHJcbiAqIEBwYXJhbSAge0V2ZW50T2JqZWN0fSBldlxyXG4gKi9cclxucHJvdG8udG9nZ2xlU2VnbWVudExvY2tTdGF0ZSA9IGZ1bmN0aW9uIChldikge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGNoYXJLZXkgPSBoZWxwZXJzLmtleUNvZGVUb1N0cmluZyhldi53aGljaCksXHJcbiAgICAgIHNlZ21lbnQgPSBtZS5fc2VnbWVudFVuZGVyQ3VycmVudFNlbGVjdGlvbigpLFxyXG4gICAgICBzZWdtZW50RGF0YSA9IGRhdGFQcm92aWRlci5nZXRTZWdtZW50QnlTZWdtZW50TnVtYmVyKG1lLmN1cnJlbnRTZWdtZW50TnVtYmVyKSxcclxuICAgICAgc2VnbWVudEVsID0gc2VnbWVudC5zZWdtZW50RWwsXHJcbiAgICAgIGlzTG9ja2VkU2VnbWVudCxcclxuICAgICAgc291cmNlUmVsO1xyXG5cclxuICBpZiAoKGV2LmN0cmxLZXkgfHwgZXYubWV0YUtleSkgJiYgY2hhcktleSA9PT0gJ2wnKSB7XHJcbiAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgIGlzTG9ja2VkU2VnbWVudCA9IHNlZ21lbnREYXRhLmlzTG9ja2VkIHx8IGZhbHNlOyAvL2hlbHBlcnMuaGFzQ2xhc3Moc2VnbWVudEVsLCAndWUtc2VnbWVudC1sb2NrZWQnKTtcclxuICAgIHNvdXJjZVJlbCA9ICQoJ1tkYXRhLXNvdXJjZS1zZWdtZW50LW51bWJlcj1cIicgKyBzZWdtZW50LnNlZ21lbnROdW1iZXIgKyAnXCJdJylbMF07XHJcblxyXG4gICAgaWYgKGlzTG9ja2VkU2VnbWVudCkge1xyXG4gICAgICAvLyBVbi1sb2NrIHNlZ21lbnQgYW5kIHB1Ymxpc2ggdW5sb2NrIGV2ZW50XHJcbiAgICAgIFtzZWdtZW50RWwsIHNvdXJjZVJlbF0uZm9yRWFjaChmdW5jdGlvbiAoZWxlbSkge1xyXG4gICAgICAgIGVsZW0uY2xhc3NMaXN0LnJlbW92ZSgndWUtc2VnbWVudC1sb2NrZWQnKTtcclxuICAgICAgICBlbGVtLmRhdGFzZXQuaXNMb2NrZWQgPSBmYWxzZTtcclxuICAgICAgICBzZWdtZW50RGF0YS5pc0xvY2tlZCA9IGZhbHNlO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIE1lZGlhdG9yLnB1Ymxpc2goJ3NlZ21lbnQ6dW5sb2NrJywgc2VnbWVudERhdGEpO1xyXG5cclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE1hcmsgc2VnbWVudCBhcyBsb2NrZWQgYW5kIHB1Ymxpc2ggbG9jayBldmVudFxyXG4gICAgW3NlZ21lbnRFbCwgc291cmNlUmVsXS5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtKSB7XHJcbiAgICAgIGVsZW0uY2xhc3NMaXN0LmFkZCgndWUtc2VnbWVudC1sb2NrZWQnKTtcclxuICAgICAgZWxlbS5kYXRhc2V0LmlzTG9ja2VkID0gdHJ1ZTtcclxuICAgICAgc2VnbWVudERhdGEuaXNMb2NrZWQgPSB0cnVlO1xyXG4gICAgfSk7XHJcblxyXG4gICAgTWVkaWF0b3IucHVibGlzaCgnc2VnbWVudDpsb2NrJywgc2VnbWVudERhdGEpO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG4vKipcclxuICogSW5zZXJ0IHRhYiBvbiBUQUIga2V5cHJlc3NcclxuICogQHBhcmFtICB7RXZlbnR9IGV2XHJcbiAqL1xyXG5wcm90by5pbnNlcnRUYWIgPSBmdW5jdGlvbiAoc2VsZWN0aW9uKSB7XHJcbiAgdmFyIHRhYiA9IHRtcGwua2V5VGFiLnVuaWNvZGUsXHJcbiAgICAgIHRleHROb2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGFiKSxcclxuICAgICAgcmFuZ2U7XHJcblxyXG4gIGlmICghc2VsZWN0aW9uLmFuY2hvck5vZGUpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHJhbmdlID0gc2VsZWN0aW9uLmdldFJhbmdlQXQoMCk7XHJcblxyXG5cclxuICBpZiAoc2VsZWN0aW9uLmlzQ29sbGFwc2VkKSB7XHJcbiAgICByYW5nZS5pbnNlcnROb2RlKHRleHROb2RlKTtcclxuICB9XHJcblxyXG4gIGlmICghc2VsZWN0aW9uLmlzQ29sbGFwc2VkKSB7XHJcbiAgICByYW5nZS5kZWxldGVDb250ZW50cygpO1xyXG4gICAgcmFuZ2UuaW5zZXJ0Tm9kZSh0ZXh0Tm9kZSk7XHJcbiAgfVxyXG5cclxuXHJcbiAgLy8gTW92ZSBjdXJzb3IgYWZ0ZXIgaW5zZXJ0ZWQgdGFiXHJcbiAgcmFuZ2Uuc2V0U3RhcnRBZnRlcih0ZXh0Tm9kZSk7XHJcbiAgcmFuZ2Uuc2V0RW5kQWZ0ZXIodGV4dE5vZGUpO1xyXG5cclxuICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcbiAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxufTtcclxuXHJcblxyXG4vKipcclxuICogSGFuZGVsIFRBQiBrZXlzIHByZXNzXHJcbiAqIEBwYXJhbSAge09iamVjdH0gZXYgW2Rlc2NyaXB0aW9uXVxyXG4gKi9cclxucHJvdG8uaGFuZGxlVGFiS2V5ID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCk7XHJcblxyXG4gIGlmIChldi5rZXlDb2RlID09PSBtZS5rZXlUYWIpIHtcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgLy8gSWYgbG9ja2VkIHNlZ21lbnQgb3IgbG9ja2VkIGNvbnRlbnRcclxuICAgIC8vIHN0b3AgaW5zZXJ0aW5nIHRhYnNcclxuICAgIGlmIChtZS5jdXJyZW50RWxlbWVudElzTG9ja2VkKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBtZS5pbnNlcnRUYWIoc2VsZWN0aW9uKTtcclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIERpc2FibGVzIGVkaXR0aW5nIGluIGEgbG9ja2VkIHNlZ21lbnQgb3IgYSBsb2NrZWQgY29udGVudFxyXG4gKiBAcGFyYW0gIHtPYmplY3R9IGV2XHJcbiAqL1xyXG5wcm90by5kaXNhYmxlRWRpdGluZyA9IGZ1bmN0aW9uIChldikge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGN1cnJlbnRTZWdtZW50ID0gbWUuX3NlZ21lbnRVbmRlckN1cnJlbnRTZWxlY3Rpb24oKSxcclxuICAgICAgc2VsZWN0aW9uQ29udGV4dCA9IG5ldyBTZWxlY3Rpb24uU2VsZWN0aW9uQ29udGV4dCgpLFxyXG4gICAgICBzZWxlY3Rpb24gPSBzZWxlY3Rpb25Db250ZXh0LnNlbGVjdGlvbixcclxuICAgICAgbm9kZVdhbGtlciA9IG5ldyBTZWxlY3Rpb24uTm9kZVdhbGtlcihldi50YXJnZXQpLFxyXG4gICAgICBpc0ludmlzaWJsZUNoYXIgPSBub2RlV2Fsa2VyLmlzSW52aXNpYmxlQ2hhcigpLFxyXG4gICAgICBpc1NlZ21lbnQgPSBub2RlV2Fsa2VyLmlzU2VnbWVudCgpLFxyXG4gICAgICBzZWdtZW50RGF0YSwgZWxlbSwgcmFuZ2U7XHJcblxyXG4gIC8vIE1ha2Ugc3VyZSB0aGlzIGlzIGZhbHNlIGJ5IGRlZmF1bHRcclxuICBtZS5jdXJyZW50RWxlbWVudElzTG9ja2VkID0gZmFsc2U7XHJcblxyXG4gIC8vIElzIGxvY2tlZCBjb250ZW50XHJcbiAgaWYgKHNlbGVjdGlvbi5hbmNob3JOb2RlKSB7XHJcbiAgICBlbGVtID0gc2VsZWN0aW9uQ29udGV4dC5jb21tb25BbmNlc3RvckNvbnRhaW5lcjtcclxuICB9XHJcblxyXG4gIGlmIChpc1NlZ21lbnQgJiYgc2VsZWN0aW9uQ29udGV4dC5pc0NvbGxhcHNlZCgpKSB7XHJcbiAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICByYW5nZS5zZWxlY3ROb2RlKG5vZGVXYWxrZXIuZmlyc3RDaGlsZCgpLmVsLm5leHRTaWJsaW5nKTtcclxuXHJcbiAgICBzZWxlY3Rpb24ucmVtb3ZlQWxsUmFuZ2VzKCk7XHJcbiAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UpO1xyXG4gICAgcmFuZ2UuY29sbGFwc2UodHJ1ZSk7XHJcbiAgfVxyXG5cclxuICAvLyBJcyBjdXJzb3IgaW4gYSBsb2NrZWQgc2VnbWVudCBvciBjb250ZW50P1xyXG4gIGlmIChjdXJyZW50U2VnbWVudC5zZWdtZW50RWwuZGF0YXNldC5pc0xvY2tlZCB8fCBoZWxwZXJzLmhhc1BhcmVudChlbGVtLnBhcmVudE5vZGUsICd1ZS1sb2NrZWQtY29udGVudCcpKSB7XHJcbiAgICBtZS5jdXJyZW50RWxlbWVudElzTG9ja2VkID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIGlmIChtZS5jdXJyZW50RWxlbWVudElzTG9ja2VkKSB7XHJcbiAgICAvLyBQcmV2ZW50IHVzZXIgdG8gZWRpdCBsb2NrZWQgc2VnbWVudCBvciBjb250ZW50XHJcbiAgICBpZiAoIShldi5rZXlDb2RlIGluIG1lLmFsbG93ZWRLZXlzSW5Mb2NrZWRDb250ZW50KSkge1xyXG4gICAgICBldi5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgICAgc2VnbWVudERhdGEgPSBkYXRhUHJvdmlkZXIuZ2V0U2VnbWVudEJ5U2VnbWVudE51bWJlcihjdXJyZW50U2VnbWVudC5zZWdtZW50TnVtYmVyKTtcclxuXHJcbiAgICAgIC8vIFByZXZlbnQgc2VnbWVudCBzdGF0dXMgY2hhbmdlXHJcbiAgICAgIHNlZ21lbnREYXRhLnN0b3BFZGl0aW5nID0gbWUuY3VycmVudEVsZW1lbnRJc0xvY2tlZDtcclxuICAgICAgTWVkaWF0b3IucHVibGlzaCgnc2VnbWVudDpzdG9wRWRpdGluZ0luTG9ja2VkQ29udGVudCcsIHNlZ21lbnREYXRhKTtcclxuXHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIEhhbmRsZXMgY3Jvc3Mgc2VnbWVudHMgc2VsZWN0aW9uXHJcbiAqIFRPRE86IGV4dGVuZCBpdCBmb3IgbW91c2UgZHJhZyBzZWxlY3Rpb24gb3Iga2V5Ym9hcmQgc2VsZWN0aW9uP1xyXG4gKi9cclxucHJvdG8uaGFuZGxlQ3Jvc3NTZWdtZW50U2VsZWN0aW9uID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIHRleHRDb250ZW50ID0gZXYudGFyZ2V0LnRleHRDb250ZW50LFxyXG4gICAgICBzZWxlY3Rpb25Db250ZXh0ID0gbmV3IFNlbGVjdGlvbi5TZWxlY3Rpb25Db250ZXh0KCksXHJcbiAgICAgIHNlbGVjdGlvbiA9IHNlbGVjdGlvbkNvbnRleHQuc2VsZWN0aW9uLFxyXG4gICAgICBpc0ludmlzaWJsZUNoYXIgPSAobmV3IFNlbGVjdGlvbi5Ob2RlV2Fsa2VyKGV2LnRhcmdldCkpLmlzSW52aXNpYmxlQ2hhcigpLFxyXG4gICAgICByYW5nZTtcclxuXHJcbiAgLy8gSWYgZGJsY2xpY2sgb3IgdHJpcGxlY2xpY2sgYW5kIHNlZ21lbnQgaXMgZW1wdHlcclxuICAvLyAocmVsaWVzIG9uIFplcm8gV2lkdGggTm9uLUpvaW5lciwgdG8gYmUgY2hhbmdlZCBpZiBpdCB3aWxsIGJlIHJlbW92ZWQpXHJcbiAgaWYgKGV2Lm9yaWdpbmFsRXZlbnQuZGV0YWlsID49IDIgJiYgaXNJbnZpc2libGVDaGFyKSB7XHJcbiAgICByYW5nZSA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XHJcbiAgICByYW5nZS5zZWxlY3ROb2RlKGV2LnRhcmdldC5jaGlsZHJlblswXSk7XHJcblxyXG4gICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xyXG4gICAgc2VsZWN0aW9uLmFkZFJhbmdlKHJhbmdlKTtcclxuICAgIHJhbmdlLmNvbGxhcHNlKHRydWUpO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gS2V5Ym9hcmRCaW5kaW5nczsiLCIvKiBGaWxlOiBMYXlvdXQuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyBfLCByZXF1aXJlLCBtb2R1bGUgKi9cclxuXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBIZWxwZXJzID0gcmVxdWlyZSgnLi9IZWxwZXJzJyk7XHJcbnZhciBUbXBsID0gcmVxdWlyZSgnLi9UbXBsJyk7XHJcbnZhciBNZWRpYXRvciA9IHJlcXVpcmUoJy4vTWVkaWF0b3InKTtcclxudmFyIFJpYmJvbk1lbnVDb21tYW5kcyA9IHJlcXVpcmUoJy4vbGF5b3V0L1JpYmJvbk1lbnVDb21tYW5kcycpO1xyXG5cclxudmFyIGRpc3BsYXlTYXZpbmdJbmZvcm1hdGlvbiA9IGZ1bmN0aW9uICh0eXBlKSB7XHJcbiAgdmFyIGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCd1ZS1zdGF0dXMtaW5mb3JtYXRpb24nKS5pdGVtKDApLFxyXG4gICAgICBjaGlsZHJlbiA9IGVsZW0gPyBlbGVtLmNoaWxkTm9kZXMgOiBudWxsLFxyXG4gICAgICB0bXBsID0gVG1wbC5maWxlU3RhdHVzLFxyXG4gICAgICBzdHJpbmdUb0hUTUxFbGVtZW50ID0gSGVscGVycy5zdHJpbmdUb0hUTUxFbGVtZW50LFxyXG4gICAgICBpID0gMCwgbGVuLCBwcmVwYXJlTWVzc2FnZTtcclxuXHJcbiAgLy8gRXhpdCBpZiBlbGVtZW50IGlzIG5vIHByZXNlbnRcclxuICBpZiAoZWxlbSA9PT0gdW5kZWZpbmVkIHx8IGVsZW0gPT09IG51bGwpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIC8vIFJlbW92ZSBleGlzdGluZyBtZXNzYWdlc1xyXG4gIGlmIChjaGlsZHJlbi5sZW5ndGgpIHtcclxuICAgIGxlbiA9IGNoaWxkcmVuLmxlbmd0aDtcclxuXHJcbiAgICBmb3IgKDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgIGVsZW0ucmVtb3ZlQ2hpbGQoY2hpbGRyZW5baV0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gRGlzcGxheSBtZXNzYWdlcyB1dGlsaXR5IGZ1bmN0aW9uXHJcbiAgcHJlcGFyZU1lc3NhZ2UgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgcmV0dXJuIGVsZW0uYXBwZW5kQ2hpbGQoc3RyaW5nVG9IVE1MRWxlbWVudChfLnRlbXBsYXRlKHRtcGwsIHtzdGF0dXM6IG1lc3NhZ2V9KSkpO1xyXG4gIH1cclxuXHJcbiAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICBjYXNlICdiZWZvcmUnOlxyXG4gICAgICBwcmVwYXJlTWVzc2FnZSgnU2F2aW5nIGNoYW5nZXMuLi4nKTtcclxuICAgICAgYnJlYWs7XHJcblxyXG4gICAgY2FzZSAnYWZ0ZXInOlxyXG4gICAgICBwcmVwYXJlTWVzc2FnZSgnQWxsIGNoYW5nZXMgc2F2ZWQnKTtcclxuICAgICAgYnJlYWs7XHJcblxyXG4gICAgY2FzZSAnZmFpbGVkJzpcclxuICAgICAgcHJlcGFyZU1lc3NhZ2UoJ1NhdmluZyBmYWlsZWQnKTtcclxuICAgICAgYnJlYWs7XHJcbiAgfVxyXG59O1xyXG5cclxudmFyIGJlZm9yZVNhdmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIGRpc3BsYXlTYXZpbmdJbmZvcm1hdGlvbignYmVmb3JlJyk7XHJcbn07XHJcblxyXG52YXIgYWZ0ZXJTYXZlID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiBkaXNwbGF5U2F2aW5nSW5mb3JtYXRpb24oJ2FmdGVyJyk7XHJcbn07XHJcblxyXG52YXIgZmFpbGVkU2F2ZSA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gZGlzcGxheVNhdmluZ0luZm9ybWF0aW9uKCdmYWlsZWQnKTtcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBpbml0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAkKGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gVE8gRE86IFJlLWZhY3RvciB0aGlzIHBhcnQgd2hpY2ggZGVhbHMgd2l0aFxyXG4gICAgICAvLyAgICAgICAgZWRpdG9yIGNvbHVtbnMgcmVzaXplXHJcbiAgICAgICQod2luZG93KS5vbignbG9hZCByZXNpemUnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHdyYXBwZXIgPSAkKCcud3JhcHBlcicpLFxyXG4gICAgICAgICAgICB3ZXN0ID0gJCgnLndyYXBwZXItd2VzdCcpLFxyXG4gICAgICAgICAgICBlYXN0ID0gJCgnLndyYXBwZXItZWFzdCcpLFxyXG4gICAgICAgICAgICBsaW5lTnVtYmVycyA9ICQoJy51ZS1ndXR0ZXInKSxcclxuICAgICAgICAgICAgc3RhdHVzID0gJCgnLnVlLXN0YXR1cycpLFxyXG4gICAgICAgICAgICB0b3BIZWlnaHQgPSAkKCcubmF2YmFyJykub3V0ZXJIZWlnaHQoKSxcclxuICAgICAgICAgICAgcmliYm9uSGVpZ2h0ID0gJCgnLm5hdi1yaWJib24nKS5vdXRlckhlaWdodCgpLFxyXG4gICAgICAgICAgICB3aW5kb3dIZWlnaHQgPSAkKHdpbmRvdykuaGVpZ2h0KCksXHJcbiAgICAgICAgICAgIHN0YXR1c0JhckhlaWdodCA9ICQoJy5zdGF0dXMtYmFyJykub3V0ZXJIZWlnaHQoKSxcclxuICAgICAgICAgICAgY29sSGVpZ2h0O1xyXG5cclxuICAgICAgICBpZiAod2VzdC5sZW5ndGggfHwgZWFzdC5sZW5ndGgpIHtcclxuICAgICAgICAgIGNvbEhlaWdodCA9IHdpbmRvd0hlaWdodCAtICh0b3BIZWlnaHQgKyByaWJib25IZWlnaHQgKyBzdGF0dXNCYXJIZWlnaHQpO1xyXG5cclxuICAgICAgICAgIHdyYXBwZXIuaGVpZ2h0KGNvbEhlaWdodCk7XHJcbiAgICAgICAgICB3ZXN0LmNzcygnbWluLWhlaWdodCcsIGNvbEhlaWdodCArICdweCcpO1xyXG4gICAgICAgICAgZWFzdC5jc3MoJ21pbi1oZWlnaHQnLCBjb2xIZWlnaHQgKyAncHgnKTtcclxuICAgICAgICAgIGxpbmVOdW1iZXJzLmNzcygnbWluLWhlaWdodCcsIGNvbEhlaWdodCArICdweCcpO1xyXG4gICAgICAgICAgc3RhdHVzLmNzcygnbWluLWhlaWdodCcsIGNvbEhlaWdodCArICdweCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBTaWRlYmFyIHNob3cvaGlkZVxyXG4gICAgICAkKCcuYnRuLW1lbnUnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIHNpZGViYXJFbCA9ICQoJy5zaWRlYmFyJyk7XHJcblxyXG4gICAgICAgICQodGhpcykudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgICAgIGlmIChzaWRlYmFyRWwubGVuZ3RoKSB7XHJcbiAgICAgICAgICBzaWRlYmFyRWwudG9nZ2xlQ2xhc3MoJ29wZW4nKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgIH0pO1xyXG5cclxuICAgIE1lZGlhdG9yLnN1YnNjcmliZSgnc2F2ZTpiZWZvcmUnLCBiZWZvcmVTYXZlKTtcclxuICAgIE1lZGlhdG9yLnN1YnNjcmliZSgnc2F2ZTpkb25lJywgYWZ0ZXJTYXZlKTtcclxuICAgIE1lZGlhdG9yLnN1YnNjcmliZSgnc2F2ZTpmYWlsJywgZmFpbGVkU2F2ZSk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSB0aGUgcmliYm9uIG1lbnUgY29tbWFuZHNcclxuICAgIFJpYmJvbk1lbnVDb21tYW5kcy5pbml0KCk7XHJcbiAgfVxyXG59OyIsIi8qIEZpbGU6IE1hcmt1cERhdGFGYWN0b3J5LmpzICovXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIE1hcmt1cERhdGFGYWN0b3J5ID0gZnVuY3Rpb24gKCkge1xuICB2YXIgbWUgPSB0aGlzO1xuICB2YXIgZGF0YVByb3ZpZGVyID0gbnVsbDtcblxuICB2YXIgTWFya3VwRGF0YVNjaGVtYSA9IHtcbiAgICBpZDogeyB0eXBlOiBTdHJpbmcgfSxcbiAgICB0eXBlOiB7IHR5cGU6IFN0cmluZyB9LFxuICAgIG1ldGFkYXRhOiB7IHR5cGU6IE9iamVjdCB9XG4gIH07XG5cbiAgdmFyIE1rQ29udGFpbmVyU2NoZW1hID0ge1xuICAgIGNoaWxkcmVuOiB7IHR5cGU6IEFycmF5LCByZXF1aXJlZDogdHJ1ZSwgZGVmYXVsdHM6IFtdIH1cbiAgfTtcblxuICB2YXIgTWtTZWdtZW50U2NoZW1hID0ge1xuICAgIHNlZ21lbnROdW1iZXI6IHsgdHlwZTogU3RyaW5nIH0sXG4gICAgaXNMb2NrZWQ6IHsgdHlwZTogQm9vbGVhbiB9LFxuICAgIGNvbmZpcm1hdGlvbkxldmVsOiB7IHR5cGU6IFN0cmluZyB9LFxuICAgIHRyYW5zbGF0aW9uT3JpZ2luOiB7IHR5cGU6IE9iamVjdCB9XG4gIH07XG5cbiAgdmFyIE1rVGFncGFpclNjaGVtYSA9IHtcbiAgICB0YWdQYWlyRGVmaW5pdGlvbklkOiB7IHR5cGU6IFN0cmluZyB9LFxuICAgIGNhbkhpZGU6IHsgdHlwZTogQm9vbGVhbiB9XG4gIH07XG5cbiAgdmFyIE1rUGxhY2Vob2xkZXJTY2hlbWEgPSB7XG4gICAgcGxhY2Vob2xkZXJUYWdEZWZpbml0aW9uSWQ6IHsgdHlwZTogU3RyaW5nIH1cbiAgfTtcblxuICB2YXIgTWtMb2NrZWRDb250ZW50U2NoZW1hID0ge1xuICAgIGNoaWxkcmVuOiB7IHR5cGU6IEFycmF5IH1cbiAgfTtcblxuICB2YXIgTWtUZXh0U2NoZW1hID0ge1xuICAgIHRleHQ6IHsgdHlwZTogU3RyaW5nIH1cbiAgfTtcblxuICBmdW5jdGlvbiBNYXJrdXBEYXRhKG9wdGlvbnMpIHtcbiAgICBkYXRhUHJvdmlkZXIgPSBkYXRhUHJvdmlkZXIgfHwgcmVxdWlyZSgnLi9EYXRhUHJvdmlkZXInKTtcbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBNYXJrdXBEYXRhU2NoZW1hKSB7XG4gICAgICBpZiAob3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgdGhpc1twcm9wZXJ0eV0gPSBvcHRpb25zW3Byb3BlcnR5XTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFvcHRpb25zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSAmJiBNYXJrdXBEYXRhU2NoZW1hW3Byb3BlcnR5XVsncmVxdWlyZWQnXSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IE1hcmt1cERhdGFTY2hlbWFbcHJvcGVydHldWydkZWZhdWx0cyddO1xuICAgICAgfVxuXG4gICAgICBpZiAob3B0aW9ucy5tZXRhZGF0YSAmJiB0eXBlb2Ygb3B0aW9ucy5tZXRhZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgb3B0aW9ucy5tZXRhZGF0YSA9IGRhdGFQcm92aWRlci5tZXRhZGF0YU1hcFtvcHRpb25zLm1ldGFkYXRhXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBNa0NvbnRhaW5lcihvcHRpb25zKSB7XG4gICAgLy8gSW52b2tlIHRoZSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yIG9uIHRoZSBuZXcgb2JqZWN0XG4gICAgTWFya3VwRGF0YS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gTWtDb250YWluZXJTY2hlbWEpIHtcbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IG9wdGlvbnNbcHJvcGVydHldO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpICYmIE1rQ29udGFpbmVyU2NoZW1hW3Byb3BlcnR5XVsncmVxdWlyZWQnXSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IE1rQ29udGFpbmVyU2NoZW1hW3Byb3BlcnR5XVsnZGVmYXVsdHMnXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBNa1NlZ21lbnQob3B0aW9ucykge1xuICAgIC8vIEludm9rZSB0aGUgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvciBvbiB0aGUgbmV3IG9iamVjdFxuICAgIE1rQ29udGFpbmVyLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBNa1NlZ21lbnRTY2hlbWEpIHtcbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IG9wdGlvbnNbcHJvcGVydHldO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpICYmIE1rU2VnbWVudFNjaGVtYVtwcm9wZXJ0eV1bJ3JlcXVpcmVkJ10pIHtcbiAgICAgICAgdGhpc1twcm9wZXJ0eV0gPSBNa1NlZ21lbnRTY2hlbWFbcHJvcGVydHldWydkZWZhdWx0cyddO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIE1rVGFncGFpcihvcHRpb25zKSB7XG4gICAgLy8gSW52b2tlIHRoZSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yIG9uIHRoZSBuZXcgb2JqZWN0XG4gICAgTWtDb250YWluZXIuY2FsbCh0aGlzLCBvcHRpb25zKTtcblxuICAgIGZvciAodmFyIHByb3BlcnR5IGluIE1rVGFncGFpclNjaGVtYSkge1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgIHRoaXNbcHJvcGVydHldID0gb3B0aW9uc1twcm9wZXJ0eV07XG4gICAgICB9XG5cbiAgICAgIGlmICghb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkgJiYgTWtUYWdwYWlyU2NoZW1hW3Byb3BlcnR5XVsncmVxdWlyZWQnXSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IE1rVGFncGFpclNjaGVtYVtwcm9wZXJ0eV1bJ2RlZmF1bHRzJ107XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gTWtQbGFjZWhvbGRlcihvcHRpb25zKSB7XG4gICAgLy8gSW52b2tlIHRoZSBzdXBlcmNsYXNzIGNvbnN0cnVjdG9yIG9uIHRoZSBuZXcgb2JqZWN0XG4gICAgTWFya3VwRGF0YS5jYWxsKHRoaXMsIG9wdGlvbnMpO1xuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gTWtQbGFjZWhvbGRlclNjaGVtYSkge1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgIHRoaXNbcHJvcGVydHldID0gb3B0aW9uc1twcm9wZXJ0eV07XG4gICAgICB9XG5cbiAgICAgIGlmICghb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkgJiYgTWtQbGFjZWhvbGRlclNjaGVtYVtwcm9wZXJ0eV1bJ3JlcXVpcmVkJ10pIHtcbiAgICAgICAgdGhpc1twcm9wZXJ0eV0gPSBNa1BsYWNlaG9sZGVyU2NoZW1hW3Byb3BlcnR5XVsnZGVmYXVsdHMnXTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBNa0xvY2tlZENvbnRlbnQob3B0aW9ucykge1xuICAgIC8vIEludm9rZSB0aGUgc3VwZXJjbGFzcyBjb25zdHJ1Y3RvciBvbiB0aGUgbmV3IG9iamVjdFxuICAgIE1rQ29udGFpbmVyLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cblxuICAgIGZvciAodmFyIHByb3BlcnR5IGluIE1rTG9ja2VkQ29udGVudFNjaGVtYSkge1xuICAgICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpKSB7XG4gICAgICAgIHRoaXNbcHJvcGVydHldID0gb3B0aW9uc1twcm9wZXJ0eV07XG4gICAgICB9XG5cbiAgICAgIGlmICghb3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkgJiYgTWtMb2NrZWRDb250ZW50U2NoZW1hW3Byb3BlcnR5XVsncmVxdWlyZWQnXSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IE1rTG9ja2VkQ29udGVudFNjaGVtYVtwcm9wZXJ0eV1bJ2RlZmF1bHRzJ107XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gTWtUZXh0KG9wdGlvbnMpIHtcbiAgICAvLyBJbnZva2UgdGhlIHN1cGVyY2xhc3MgY29uc3RydWN0b3Igb24gdGhlIG5ldyBvYmplY3RcbiAgICBNYXJrdXBEYXRhLmNhbGwodGhpcywgb3B0aW9ucyk7XG5cbiAgICBmb3IgKHZhciBwcm9wZXJ0eSBpbiBNa1RleHRTY2hlbWEpIHtcbiAgICAgIGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KHByb3BlcnR5KSkge1xuICAgICAgICB0aGlzW3Byb3BlcnR5XSA9IG9wdGlvbnNbcHJvcGVydHldO1xuICAgICAgfVxuXG4gICAgICBpZiAoIW9wdGlvbnMuaGFzT3duUHJvcGVydHkocHJvcGVydHkpICYmIE1rVGV4dFNjaGVtYVtwcm9wZXJ0eV1bJ3JlcXVpcmVkJ10pIHtcbiAgICAgICAgdGhpc1twcm9wZXJ0eV0gPSBNa1RleHRTY2hlbWFbcHJvcGVydHldWydkZWZhdWx0cyddO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY3JlYXRlOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgLy9kZWxldGUgcHJvcGVydHkgdGhhdCBkb2VzIG5vdCBleGlzdFxuICAgICAgZm9yICh2YXIgcHJvcGVydHkgaW4gZGF0YSkge1xuICAgICAgICBpZiAoZGF0YS5oYXNPd25Qcm9wZXJ0eShwcm9wZXJ0eSkpIHtcbiAgICAgICAgICBpZiAoZGF0YVtwcm9wZXJ0eV0gPT09IG51bGwgfHwgZGF0YVtwcm9wZXJ0eV0gPT09ICcnIHx8IGRhdGFbcHJvcGVydHldID09PSAndW5kZWZpbmVkJyB8fCAodHlwZW9mIGRhdGFbcHJvcGVydHldID09PSAndW5kZWZpbmVkJykpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBkYXRhW3Byb3BlcnR5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy9kZXRlcm1pbmUgY2xhc3MgdHlwZVxuICAgICAgaWYgKGRhdGEudHlwZSA9PT0gJ3NlZ21lbnQnKSB7XG4gICAgICAgIG1lLm1hcmt1cGRhdGFDbGFzcyA9IE1rU2VnbWVudDtcbiAgICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSAndGFnUGFpcicpIHtcbiAgICAgICAgbWUubWFya3VwZGF0YUNsYXNzID0gTWtUYWdwYWlyO1xuICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09ICdwbGFjZWhvbGRlclRhZycpIHtcbiAgICAgICAgbWUubWFya3VwZGF0YUNsYXNzID0gTWtQbGFjZWhvbGRlcjtcbiAgICAgIH0gZWxzZSBpZiAoZGF0YS50eXBlID09PSAndGV4dCcpIHtcbiAgICAgICAgbWUubWFya3VwZGF0YUNsYXNzID0gTWtUZXh0O1xuICAgICAgfSBlbHNlIGlmIChkYXRhLnR5cGUgPT09ICdsb2NrZWQnKSB7XG4gICAgICAgIG1lLm1hcmt1cGRhdGFDbGFzcyA9IE1rTG9ja2VkQ29udGVudDtcbiAgICAgIH1cblxuICAgICAgLy9jcmVhdGUgbmV3IG1hcmt1cGRhdGFcbiAgICAgIHJldHVybiBuZXcgbWUubWFya3VwZGF0YUNsYXNzKGRhdGEpO1xuICAgIH1cbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IE1hcmt1cERhdGFGYWN0b3J5KCk7IiwiLyogRmlsZTogTWVkaWF0b3IuanMgKi9cbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXG4vKiBnbG9iYWxzIG1vZHVsZSwgcHVic3ViICovXG4ndXNlIHN0cmljdCc7XG5cbi8vIHZhciBNZWRpYXRvciA9IHt9LFxuLy8gICAgIG1lZGlhdG9yID0gbmV3IHB1YnN1YigpO1xuXG4vLyAvLyBNZXRob2QgYWxpYXNlc1xuLy8gTWVkaWF0b3IucHVibGlzaCA9IG1lZGlhdG9yLnB1Yjtcbi8vIE1lZGlhdG9yLnN1YnNjcmliZSA9IG1lZGlhdG9yLnN1Yjtcbi8vIE1lZGlhdG9yLnVuc3Vic2NyaWJlID0gbWVkaWF0b3IudW5zdWI7XG4vLyBNZWRpYXRvci5zdWJzY3JpYmVfb25jZSA9IG1lZGlhdG9yLm9uY2U7XG4vLyBNZWRpYXRvci5zdWJzY3JpYmVfcmVjb3VwID0gbWVkaWF0b3IucmVjb3VwO1xuXG5cblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcixcbiAgICBNZWRpYXRvciA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuLy8gTWV0aG9kIGFsaWFzZXNcbk1lZGlhdG9yLnB1Ymxpc2ggPSBNZWRpYXRvci5lbWl0O1xuTWVkaWF0b3Iuc3Vic2NyaWJlID0gTWVkaWF0b3Iub247XG5NZWRpYXRvci51bnN1YnNjcmliZSA9IE1lZGlhdG9yLnJlbW92ZUxpc3RlbmVyO1xuTWVkaWF0b3Iuc3Vic2NyaWJlX29uY2UgPSBNZWRpYXRvci5vbmNlO1xuLy8gTWVkaWF0b3Iuc3Vic2NyaWJlX3JlY291cCA9IGV2ZW50cy5yZWNvdXA7XG5cbm1vZHVsZS5leHBvcnRzID0gTWVkaWF0b3I7IiwiLyogRmlsZTogTW91c2UuanMgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG52YXIgQ3RybEhvdmVySGFuZGxlciA9IHJlcXVpcmUoJy4vbW91c2UvQ3RybEhvdmVySGFuZGxlcicpO1xyXG52YXIgQ3RybENsaWNrSGFuZGxlciA9IHJlcXVpcmUoJy4vbW91c2UvQ3RybENsaWNrSGFuZGxlcicpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgQ3RybEhvdmVySGFuZGxlcjogQ3RybEhvdmVySGFuZGxlcixcclxuICBDdHJsQ2xpY2tIYW5kbGVyOiBDdHJsQ2xpY2tIYW5kbGVyXHJcbn07IiwiLyogRmlsZTogTm9kZVdyYXBwZXIuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIEhlbHBlcnMgPSByZXF1aXJlKCcuL0hlbHBlcnMnKTtcclxudmFyIERhdGFQcm92aWRlciA9IHJlcXVpcmUoJy4vRGF0YVByb3ZpZGVyJyk7XHJcbnZhciBUcmFuc2xhdGlvbk9yaWdpbiA9IHJlcXVpcmUoJy4vVHJhbnNsYXRpb25PcmlnaW4nKTtcclxuXHJcbnZhciBkZWY7XHJcblxyXG52YXIgc3RhdHVzSWNvbkNsYXNzID0ge1xyXG4gICAgJ05vdFRyYW5zbGF0ZWQnOiAnbm90LXRyYW5zbGF0ZWQnLFxyXG4gICAgJ0FwcHJvdmVkU2lnbk9mZic6ICdhcHByb3ZlZC1zaWduLW9mZicsXHJcbiAgICAnQXBwcm92ZWRUcmFuc2xhdGlvbic6ICdhcHByb3ZlZC10cmFuc2xhdGlvbicsXHJcbiAgICAnRHJhZnQnOiAnZHJhZnQnLFxyXG4gICAgJ1JlamVjdGVkU2lnbk9mZic6ICdyZWplY3RlZC1zaWduLW9mZicsXHJcbiAgICAnUmVqZWN0ZWRUcmFuc2xhdGlvbic6ICdyZWplY3RlZC10cmFuc2xhdGlvbicsXHJcbiAgICAnVHJhbnNsYXRlZCc6ICd0cmFuc2xhdGVkJ1xyXG4gIH07XHJcblxyXG52YXIgdHJhbnNsYXRpb25PcmlnaW5DbGFzcyA9IHtcclxuICAgICdpdCc6ICd0cmFuc3BhcmVudCcsXHJcbiAgICAnYXQnOiAnYmx1ZScsXHJcbiAgICAncG0nOiAnZ3JheScsXHJcbiAgICAnYXAnOiAneWVsbG93JyxcclxuICAgICdjbSc6ICdncmVlbidcclxuICB9O1xyXG5cclxuXHJcbnZhciBOb2RlV3JhcHBlciA9IEhlbHBlcnMuY29uc3RydWN0b3Ioe1xyXG4gIF9leHRlbmQ6IEhlbHBlcnMuX2V4dGVuZCxcclxuXHJcbiAgaW5pdDogZnVuY3Rpb24gKGF0dHJzLCBwYXJlbnQpIHtcclxuICAgIHRoaXMuX2F0dHJzID0gYXR0cnM7XHJcbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICB0aGlzLl9leHRlbmQodGhpcywgYXR0cnMpO1xyXG5cclxuICAgIGlmICghdGhpcy50eXBlKSB7XHJcbiAgICAgIHRoaXMudHlwZSA9ICdwYXJhZ3JhcGgtdW5pdCc7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMubWV0YWRhdGEpIHtcclxuICAgICAgdGhpcy5tZXRhZGF0YSA9IERhdGFQcm92aWRlci5jYWNoZU1ldGFkYXRhKHRoaXMubWV0YWRhdGEpO1xyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaCAodGhpcy50eXBlKSB7XHJcblxyXG4gICAgICBjYXNlICd0YWdQYWlyJzpcclxuICAgICAgICBkZWYgPSB0aGlzLl9leHRlbmQoe30sIERhdGFQcm92aWRlci50YWdQYWlyTWFwW3RoaXMudGFnUGFpckRlZmluaXRpb25JZF0pO1xyXG4gICAgICAgIGRlZi5wbWV0YWRhdGEgPSBkZWYubWV0YWRhdGE7XHJcbiAgICAgICAgZGVsZXRlIGRlZi5tZXRhZGF0YTsgLy8gbWFrZSBzdXJlIHdlIGRvbnQnIG92ZXJ3cml0ZSBvdXIgbWV0YWRhdGFcclxuICAgICAgICBkZWxldGUgZGVmLmlkOyAvLyBtYWtlIHN1cmUgd2UgZG9uJ3Qgb3ZlcndyaXRlIG91ciBpZFxyXG4gICAgICAgIHRoaXMuX2V4dGVuZCh0aGlzLCBkZWYpO1xyXG5cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3BsYWNlaG9sZGVyVGFnJzpcclxuICAgICAgICBkZWYgPSB0aGlzLl9leHRlbmQoe30sIERhdGFQcm92aWRlci5wbGFjZWhvbGRlck1hcFt0aGlzLnBsYWNlaG9sZGVyVGFnRGVmaW5pdGlvbklkXSk7XHJcbiAgICAgICAgZGVmLnBtZXRhZGF0YSA9IGRlZi5tZXRhZGF0YTtcclxuICAgICAgICBkZWxldGUgZGVmLm1ldGFkYXRhOyAvLyBtYWtlIHN1cmUgd2UgZG9udCcgb3ZlcndyaXRlIG91ciBtZXRhZGF0YVxyXG4gICAgICAgIGRlbGV0ZSBkZWYuaWQ7IC8vIG1ha2Ugc3VyZSB3ZSBkb24ndCBvdmVyd3JpdGUgb3VyIGlkXHJcbiAgICAgICAgdGhpcy5fZXh0ZW5kKHRoaXMsIGRlZik7XHJcblxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAnc2VnbWVudCc6XHJcbiAgICAgICAgaWYgKCF0aGlzLnRyYW5zbGF0aW9uT3JpZ2luKSB7XHJcbiAgICAgICAgICB0aGlzLnRyYW5zbGF0aW9uT3JpZ2luID0gVHJhbnNsYXRpb25PcmlnaW4uY3JlYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBEYXRhUHJvdmlkZXIuc2VnbWVudHNNYXBbdGhpcy5zZWdtZW50TnVtYmVyXSA9IHtcclxuICAgICAgICAgICdvcmRlcm51bWJlcicgOiB0aGlzLnNlZ21lbnROdW1iZXIsXHJcbiAgICAgICAgICAnaXNMb2NrZWQnIDogdGhpcy5pc0xvY2tlZCB8fCBmYWxzZSxcclxuICAgICAgICAgICdjb25maXJtYXRpb25sZXZlbCc6IHN0YXR1c0ljb25DbGFzc1t0aGlzLmNvbmZpcm1hdGlvbkxldmVsXSB8fCAnbm90LXRyYW5zbGF0ZWQnLFxyXG4gICAgICAgICAgJ3RyYW5zbGF0aW9ub3JpZ2luJzogdGhpcy50cmFuc2xhdGlvbk9yaWdpblxyXG4gICAgICAgIH07XHJcbiAgICAgICAgRGF0YVByb3ZpZGVyLnNlZ21lbnRzTWFwTGVuZ3RoKys7XHJcblxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgY2FzZSAndGV4dCc6XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdsb2NrZWQnOlxyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnNvdXJjZSkge1xyXG4gICAgICB0aGlzLnNvdXJjZSA9IG5ldyBOb2RlV3JhcHBlcih0aGlzLnNvdXJjZSwgdGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMudGFyZ2V0KSB7XHJcbiAgICAgIHRoaXMudGFyZ2V0ID0gbmV3IE5vZGVXcmFwcGVyKHRoaXMudGFyZ2V0LCB0aGlzKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQgfHwgbnVsbDtcclxuXHJcblxyXG4gICAgaWYgKHRoaXMuY2hpbGRyZW4pIHtcclxuICAgICAgdGhpcy5jaGlsZHJlbiA9IHRoaXMuY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xyXG4gICAgICAgIHJldHVybiBuZXcgTm9kZVdyYXBwZXIoY2hpbGQsIHRoaXMpO1xyXG4gICAgICB9LCB0aGlzKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gUHJlcGFyZSBmb3JtYXR0aW5nXHJcbiAgICBpZiAodGhpcy5mb3JtYXR0aW5nR3JvdXBJZCkge1xyXG4gICAgICB0aGlzLmZvcm1hdHRpbmdHcm91cCA9IHRoaXMuX2V4dGVuZCh0aGlzLmZvcm1hdHRpbmdHcm91cCB8fCB7fSwgRGF0YVByb3ZpZGVyLmZvcm1hdGluZ0dyb3VwTWFwW3RoaXMuZm9ybWF0dGluZ0dyb3VwSWRdKTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICBjb250YWluc1NlZ21lbnQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmlzU2VnbWVudCgpIHx8ICh0aGlzLmNoaWxkcmVuICYmIHRoaXMuY2hpbGRyZW4uZmlsdGVyKGZ1bmN0aW9uIChjaGlsZCkge1xyXG4gICAgICByZXR1cm4gY2hpbGQuY29udGFpbnNTZWdtZW50KCk7XHJcbiAgICB9KS5sZW5ndGgpO1xyXG4gIH0sXHJcblxyXG4gIGlzU2VnbWVudDogZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ3NlZ21lbnQnIHx8ICh0aGlzLl9wYXJlbnQgJiYgdGhpcy5fcGFyZW50LmlzU2VnbWVudCgpKTtcclxuICB9LFxyXG5cclxuICBtZXRhZGF0YVRleHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLm1ldGFkYXRhID8gSlNPTi5zdHJpbmdpZnkodGhpcy5tZXRhZGF0YSkgOiAnJztcclxuICB9LFxyXG5cclxuICBzdWJjb250ZW50VGV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMubG9jYWxpemFibGVTdWJDb250ZW50TGlzdCA/IEpTT04uc3RyaW5naWZ5KHRoaXMubG9jYWxpemFibGVTdWJDb250ZW50TGlzdCkgOiAnJztcclxuICB9LFxyXG5cclxuICB0cmFuc2xhdGlvbk9yaWdpblRleHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLnRyYW5zbGF0aW9uT3JpZ2luID8gSlNPTi5zdHJpbmdpZnkodGhpcy50cmFuc2xhdGlvbk9yaWdpbikgOiAnJztcclxuICB9LFxyXG5cclxuICBzdGF0dXNJY29uOiBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gRGF0YVByb3ZpZGVyLnNlZ21lbnRzTWFwW3RoaXMuc2VnbWVudE51bWJlcl0uY29uZmlybWF0aW9ubGV2ZWwgfHwgJ25vdC10cmFuc2xhdGVkJztcclxuICB9LFxyXG5cclxuICBkaXNwbGF5T3JpZ2luSWNvbjogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHRyYW5zbGF0aW9uT3JpZ2luID0gRGF0YVByb3ZpZGVyLnNlZ21lbnRzTWFwW3RoaXMuc2VnbWVudE51bWJlcl0udHJhbnNsYXRpb25vcmlnaW47XHJcblxyXG4gICAgaWYgKCF0cmFuc2xhdGlvbk9yaWdpbiB8fCAhdHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luVHlwZSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGxhc3RUeXBlID0gKHRyYW5zbGF0aW9uT3JpZ2luLm9yaWdpbkJlZm9yZUFkYXB0YXRpb24pID8gdHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luQmVmb3JlQWRhcHRhdGlvbi5vcmlnaW5UeXBlIDogbnVsbDtcclxuICAgIHZhciBvcmlnaW5UeXBlcyA9IHsnaW50ZXJhY3RpdmUnOiB0cnVlLCAnc291cmNlJzogdHJ1ZX07XHJcblxyXG4gICAgaWYgKG9yaWdpblR5cGVzW3RyYW5zbGF0aW9uT3JpZ2luLm9yaWdpblR5cGVdICYmXHJcbiAgICAgICAgdHJhbnNsYXRpb25PcmlnaW4ubWF0Y2hQZXJjZW50ID09PSAwICYmXHJcbiAgICAgICAgKHRyYW5zbGF0aW9uT3JpZ2luLm9yaWdpbkJlZm9yZUFkYXB0YXRpb24gPT09IG51bGwgfHxcclxuICAgICAgICAgbGFzdFR5cGUgPT09IG51bGwgfHwgb3JpZ2luVHlwZXNbbGFzdFR5cGVdKSkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSxcclxuXHJcbiAgb3JpZ2luQ2xhc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB0cmFuc2xhdGlvbk9yaWdpbiA9IERhdGFQcm92aWRlci5zZWdtZW50c01hcFt0aGlzLnNlZ21lbnROdW1iZXJdLnRyYW5zbGF0aW9ub3JpZ2luLFxyXG4gICAgICAgIHR5cGUgPSBUcmFuc2xhdGlvbk9yaWdpbi5vcmlnaW5UeXBlKHRyYW5zbGF0aW9uT3JpZ2luKSxcclxuICAgICAgICBjbGFzc05hbWUgPSB0cmFuc2xhdGlvbk9yaWdpbkNsYXNzW3R5cGVdO1xyXG5cclxuICAgIGlmIChjbGFzc05hbWUpIHtcclxuICAgICAgcmV0dXJuIGNsYXNzTmFtZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJhbnNsYXRpb25PcmlnaW4ubWF0Y2hQZXJjZW50IDwgMTAwID8gJ3llbGxvdycgOiAnZ3JlZW4nO1xyXG4gIH0sXHJcblxyXG4gIG9yaWdpblRleHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciB0ID0gRGF0YVByb3ZpZGVyLnNlZ21lbnRzTWFwW3RoaXMuc2VnbWVudE51bWJlcl0udHJhbnNsYXRpb25vcmlnaW47XHJcbiAgICB2YXIgdHlwZSA9IFRyYW5zbGF0aW9uT3JpZ2luLm9yaWdpblR5cGUodCk7XHJcbiAgICB2YXIgcGVyY2VudCA9IHQubWF0Y2hQZXJjZW50O1xyXG5cclxuICAgIC8vbG9vayBmb3IgdGhlIGZpcnN0IG9yaWdpbiBUeXBlXHJcbiAgICBpZiAodC5vcmlnaW5CZWZvcmVBZGFwdGF0aW9uICE9PSBudWxsICYmIHR5cGUgPT09ICdpdCcpIHtcclxuICAgICAgdmFyIGxhc3QgPSB0Lm9yaWdpbkJlZm9yZUFkYXB0YXRpb247XHJcbiAgICAgIHR5cGUgPSBUcmFuc2xhdGlvbk9yaWdpbi5vcmlnaW5UeXBlKGxhc3QpO1xyXG4gICAgICBwZXJjZW50ID0gbGFzdC5tYXRjaFBlcmNlbnQ7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHNJY29uID0gJyc7XHJcbiAgICB2YXIgcGVyY2VudFR5cGVzID0geydmbSc6IHRydWUsICdlbSc6IHRydWUsICd0bSc6IHRydWUsICdpdCc6IHRydWUsICdhcCc6IHRydWUgfTtcclxuXHJcbiAgICBpZiAocGVyY2VudFR5cGVzW3R5cGVdKSB7XHJcbiAgICAgIHNJY29uID0gcGVyY2VudCArICclJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNJY29uID0gdHlwZS50b1VwcGVyQ2FzZSgpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHNJY29uO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBzZWdtZW50IGxvY2tlZCBzdGF0ZVxyXG4gICAqL1xyXG4gIGlzTG9ja2VkU2VnbWVudDogZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIERhdGFQcm92aWRlci5zZWdtZW50c01hcFt0aGlzLnNlZ21lbnROdW1iZXJdLmlzTG9ja2VkIHx8IGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIHNlZ21lbnRJbmZvOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VnbSA9IERhdGFQcm92aWRlci5zZWdtZW50c01hcFt0aGlzLnNlZ21lbnROdW1iZXJdO1xyXG5cclxuICAgIGlmIChzZWdtID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBUcmFuc2xhdGlvbk9yaWdpbi50cmFuc2xhdGlvbkluZm8oc2VnbSk7XHJcbiAgfSxcclxuXHJcbiAgcHVpZDogZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKHRoaXMudHlwZSA9PT0gJ3BhcmFncmFwaC11bml0Jykge1xyXG4gICAgICByZXR1cm4gdGhpcy5pZDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5fcGFyZW50KSB7XHJcbiAgICAgIHJldHVybiB0aGlzLl9wYXJlbnQucHVpZCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG4gIH0sXHJcblxyXG4gIGNoaWxkU2VnbWVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0aGlzLmNoaWxkcmVuID8gdGhpcy5jaGlsZHJlbi5maWx0ZXIoZnVuY3Rpb24gKGl0ZW0pIHtcclxuICAgICAgcmV0dXJuIGl0ZW0uY29udGFpbnNTZWdtZW50KCk7XHJcbiAgICB9KSA6IFtdO1xyXG4gIH0sXHJcblxyXG4gIHNlZ21lbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VnbWVudHMgPSBbXSxcclxuICAgICAgICBpID0gMDtcclxuICAgIGlmICh0aGlzLnR5cGUgPT09ICdwYXJhZ3JhcGgtdW5pdCcpIHtcclxuICAgICAgdmFyIHNvdXJjZVNlZ21lbnRzID0gdGhpcy5zb3VyY2Uuc2VnbWVudHMoKTtcclxuICAgICAgdmFyIHRhcmdldFNlZ21lbnRzID0gdGhpcy50YXJnZXQuc2VnbWVudHMoKTtcclxuICAgICAgZm9yIChpID0gMDsgaSA8IHNvdXJjZVNlZ21lbnRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgc2VnbWVudHMucHVzaCh7XHJcbiAgICAgICAgICBwdWlkOiB0aGlzLmlkLFxyXG4gICAgICAgICAgc291cmNlOiBzb3VyY2VTZWdtZW50c1tpXSxcclxuICAgICAgICAgIHRhcmdldDogdGFyZ2V0U2VnbWVudHNbaV1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdmFyIGNoaWxkcmVuID0gdGhpcy5jaGlsZFNlZ21lbnRzKCk7XHJcblxyXG4gICAgICBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcclxuXHJcbiAgICAgICAgaWYgKGNoaWxkcmVuW2ldLnR5cGUgPT09ICdzZWdtZW50Jykge1xyXG4gICAgICAgICAgc2VnbWVudHMucHVzaChjaGlsZHJlbltpXSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICB2YXIgcyA9IGNoaWxkcmVuW2ldLnNlZ21lbnRzKCkubWFwKGZ1bmN0aW9uIChzZWdtZW50KSB7XHJcbiAgICAgICAgICAgIHZhciBmbGF0ID0gdGhpcy5jbG9uZSgpO1xyXG4gICAgICAgICAgICBmbGF0LmNoaWxkcmVuID0gW3NlZ21lbnRdO1xyXG4gICAgICAgICAgICByZXR1cm4gZmxhdDtcclxuICAgICAgICAgIH0sIGNoaWxkcmVuW2ldKTtcclxuXHJcbiAgICAgICAgICBzZWdtZW50cyA9IHNlZ21lbnRzLmNvbmNhdChzKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBzZWdtZW50cztcclxuICB9LFxyXG5cclxuICBjbG9uZTogZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIG5ldyBOb2RlV3JhcHBlcih0aGlzLl9hdHRycywgdGhpcy5fcGFyZW50KTtcclxuICB9LFxyXG5cclxuICBzaG93VGFnczogZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRoaXMudHlwZSA9PT0gJ3RhZ1BhaXInICYmIHRoaXMuY2FuSGlkZSA9PT0gZmFsc2UgJiYgdGhpcy5pc1NlZ21lbnQoKTtcclxuICB9LFxyXG5cclxuICBxdWVyeTogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICB2YXIgcmVzID0gW107XHJcbiAgICBpZiAoY2FsbGJhY2sodGhpcykpIHtcclxuICAgICAgcmVzLnB1c2godGhpcyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuY2hpbGRyZW4gJiYgdGhpcy5jaGlsZHJlbi5sZW5ndGgpIHtcclxuICAgICAgdmFyIGNoaWxkX3JlcyA9IHRoaXMuY2hpbGRyZW4ubWFwKGZ1bmN0aW9uIChjaGlsZCkge1xyXG4gICAgICAgIHJldHVybiBjaGlsZC5xdWVyeShjYWxsYmFjayk7XHJcbiAgICAgIH0pO1xyXG4gICAgICByZXMgPSBBcnJheS5wcm90b3R5cGUuY29uY2F0LmFwcGx5KHJlcywgY2hpbGRfcmVzKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzO1xyXG4gIH1cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGVXcmFwcGVyOyIsIi8qIEZpbGU6IFBhcmFncmFwaHMuanMgKi9cbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXG4vKiBnbG9iYWxzICQsIHJlcXVpcmUsIG1vZHVsZSwgRXZlbnQgKi9cbid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiAgUGFyYWdyYXBocyBtb2R1bGVcbiAqL1xuXG52YXIgRGF0YVByb3ZpZGVyID0gcmVxdWlyZSgnLi9EYXRhUHJvdmlkZXInKTtcbnZhciBTZWdtZW50c1dhdGNoZXIgPSByZXF1aXJlKCcuL1NlZ21lbnRzV2F0Y2hlcicpO1xudmFyIFNpZGVCeVNpZGVQYXJhZ3JhcGhVbml0c1JlbmRlcmVyID0gcmVxdWlyZSgnLi9TaWRlQnlTaWRlUGFyYWdyYXBoVW5pdHNSZW5kZXJlcicpO1xudmFyIEtleWJvYXJkQmluZGluZ3MgPSByZXF1aXJlKCcuL0tleWJvYXJkQmluZGluZ3MnKTtcblxuLyoqXG4gKiBQYXJhZ3JhcGhzIG1vZHVsZVxuICogRGlzcGxheXMgYWxsIFBhcmFncmFwaHMgZnJvbSB0aGUgc3RvcmFnZSwgYXR0YWNoZXMgZXZlbnQgaGFuZGxlcnNcbiAqL1xudmFyIFBhcmFncmFwaHMgPSAoZnVuY3Rpb24gKCkge1xuICB2YXIgZGF0YVByb3ZpZGVyID0gRGF0YVByb3ZpZGVyLFxuICAgICAgc2VnbWVudHNXYXRjaGVyID0gU2VnbWVudHNXYXRjaGVyLFxuICAgICAgZm9ybWF0dGluZ01hcCxcbiAgICAgIHN0YXR1c0ljb25DbGFzcyxcbiAgICAgIHRyYW5zbGF0aW9uT3JpZ2luQ2xhc3M7XG5cbiAgZm9ybWF0dGluZ01hcCA9IHtcbiAgICAnQm9sZCcgOiAnZm9udC13ZWlnaHQ6IGJvbGQnLFxuICAgICdJdGFsaWMnIDogJ2ZvbnQtc3R5bGU6IGl0YWxpYycsXG4gICAgJ1VuZGVybGluZScgOiAndGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmUnLFxuICAgICdUZXh0Q29sb3InIDogJ2NvbG9yOiByZ2Ioe3tzfX0pJyxcbiAgICAnRm9udE5hbWUnIDogJ2ZvbnQtZmFtaWx5OiB7e3N9fScsXG4gICAgJ0ZvbnRTaXplJyA6ICdmb250LXNpemU6IHt7c319cHgnXG4gIH07XG5cbiAgc3RhdHVzSWNvbkNsYXNzID0ge1xuICAgICdOb3RUcmFuc2xhdGVkJzogJ25vdC10cmFuc2xhdGVkJyxcbiAgICAnQXBwcm92ZWRTaWduT2ZmJzogJ2FwcHJvdmVkLXNpZ24tb2ZmJyxcbiAgICAnQXBwcm92ZWRUcmFuc2xhdGlvbic6ICdhcHByb3ZlZC10cmFuc2xhdGlvbicsXG4gICAgJ0RyYWZ0JzogJ2RyYWZ0JyxcbiAgICAnUmVqZWN0ZWRTaWduT2ZmJzogJ3JlamVjdGVkLXNpZ24tb2ZmJyxcbiAgICAnUmVqZWN0ZWRUcmFuc2xhdGlvbic6ICdyZWplY3RlZC10cmFuc2xhdGlvbicsXG4gICAgJ1RyYW5zbGF0ZWQnOiAndHJhbnNsYXRlZCdcbiAgfTtcblxuICB0cmFuc2xhdGlvbk9yaWdpbkNsYXNzID0ge1xuICAgICdpdCc6ICd0cmFuc3BhcmVudCcsXG4gICAgJ2F0JzogJ2JsdWUnLFxuICAgICdwbSc6ICdncmF5JyxcbiAgICAnYXAnOiAneWVsbG93JyxcbiAgICAnY20nOiAnZ3JlZW4nXG4gIH07XG5cblxuICAvKipcbiAgICogRXh0cmFjdCBzZWdtZW50IGRhdGEgZnJvbSBET01cbiAgICogQHBhcmFtIHtET01FbGVtZW50fSBlbCAtIGFuIGVsZW1lbnQgcmVwcmVzZW50aW5nIGEgc2VnbWVudFxuICAgKi9cbiAgZnVuY3Rpb24gc2VnbWVudERhdGEoZWwpIHtcbiAgICB2YXIgZGF0YSA9IGVsLmRhdGFzZXQsXG4gICAgICAgIG90aGVyU2VnbWVudERhdGEgPSBkYXRhUHJvdmlkZXIuc2VnbWVudHNNYXBbZGF0YS5vcmRlcm51bWJlcl07XG5cbiAgICByZXR1cm4ge1xuICAgICAgaWQ6ICAgICAgICAgICAgICAgZGF0YS5pZCxcbiAgICAgIHB1aWQ6ICAgICAgICAgICAgIGRhdGEucHVpZCxcbiAgICAgIGVsOiAgICAgICAgICAgICAgIGVsLFxuICAgICAgb3RoZXJTZWdtZW50RGF0YTogb3RoZXJTZWdtZW50RGF0YVxuICAgIH07XG4gIH1cblxuICByZXR1cm4ge1xuICAgICAvKipcbiAgICAgKiBSZW5kZXIgdGhlIGZpcnN0IHNldCBvZiBwYXJhZ3JhcGggdW5pdHNcbiAgICAgKi9cbiAgICByZW5kZXJGaXJzdFBhcmFncmFwaHM6IGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtZSA9IHRoaXM7XG4gICAgICB2YXIgY0RvYyA9IGRhdGFQcm92aWRlci5nZXRDdXJyZW50RG9jdW1lbnQoKTtcbiAgICAgIHZhciBwT2Zmc2V0ID0gMDtcbiAgICAgIHZhciBwTGltaXQgPSBjRG9jLnBhcmFncmFwaENvdW50O1xuXG4gICAgICBkYXRhUHJvdmlkZXIuZ2V0UGFyYWdyYXBocyhjRG9jLmlkLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG5cbiAgICAgICAgdmFyIGVkaXRvckJvZHkgPSAkKCcjZWRpdG9yLWJvZHknKTtcbiAgICAgICAgZWRpdG9yQm9keS5odG1sKCcnKTtcblxuICAgICAgICBtZS5fcmVuZGVyUGFyYWdyYXBocyhkYXRhLCBjRG9jKTtcbiAgICAgIH0sIHBMaW1pdCwgcE9mZnNldCk7XG4gICAgfSxcblxuICAgIF9yZW5kZXJQYXJhZ3JhcGhzOiBmdW5jdGlvbiAocGFyYWdyYXBocywgY3VycmVudERvY3VtZW50KSB7XG4gICAgICB2YXIgc2lkZUJ5U2lkZVJlbmRlcmVyID0gbmV3IFNpZGVCeVNpZGVQYXJhZ3JhcGhVbml0c1JlbmRlcmVyKHBhcmFncmFwaHMsIGN1cnJlbnREb2N1bWVudCksXG4gICAgICAgICAgZWRpdG9yQm9keUVsLCBrZXlib2FyZEJpbmRpbmdzLCBzb3VyY2VLZXlzQmluZDtcblxuICAgICAgc2lkZUJ5U2lkZVJlbmRlcmVyLnJlbmRlcigpO1xuXG4gICAgICBlZGl0b3JCb2R5RWwgPSAkKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdlZGl0b3ItYm9keScpKTtcbiAgICAgIGVkaXRvckJvZHlFbC5hcHBlbmQoc2lkZUJ5U2lkZVJlbmRlcmVyLnNvdXJjZVNlY3Rpb25FbCk7XG4gICAgICBlZGl0b3JCb2R5RWwuYXBwZW5kKHNpZGVCeVNpZGVSZW5kZXJlci50YXJnZXRTZWN0aW9uRWwpO1xuXG4gICAgICBrZXlib2FyZEJpbmRpbmdzID0gbmV3IEtleWJvYXJkQmluZGluZ3Moc2lkZUJ5U2lkZVJlbmRlcmVyLnRhcmdldEVkaXRhYmxlQ29sdW1uKTtcbiAgICAgIGtleWJvYXJkQmluZGluZ3MuYmluZCgpO1xuXG4gICAgICBzb3VyY2VLZXlzQmluZCA9IG5ldyBLZXlib2FyZEJpbmRpbmdzKHNpZGVCeVNpZGVSZW5kZXJlci5zb3VyY2VDb2x1bW5zKTtcbiAgICAgIHNvdXJjZUtleXNCaW5kLmJpbmQoKTtcblxuICAgICAgLy8gVHJpZ2dlciB3aW5kb3cgcmVzaXplIHRvIG1ha2Ugc3VyZVxuICAgICAgLy8gdGhlIGxheW91dCByZXNpemVzIHRvIGZ1bGwgcGFnZSBoZWlnaHRcbiAgICAgIC8vIFVTRSBNRURJQVRPUiBUTyBUUklHR0VSIFRISVMgRVZFTlRcbiAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgncmVzaXplJykpO1xuXG4gICAgICBzZWdtZW50c1dhdGNoZXIucmVzaXplQ29udGFpbmVycygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIG1vcmUgcGFyYWdyYXBoIHVuaXRzIGludG8gdGhlIHZpZXdcbiAgICAgKlxuICAgICAqL1xuICAgIGxvYWRNb3JlUGFyYWdyYXBoczogZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgZGF0YVByb3ZpZGVyLmdldE5leHRQYXJhZ3JhcGhzKGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgbWUucmVuZGVyUGFyYWdyYXBocyhkYXRhKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyYWdyYXBoczsiLCIvKiBGaWxlOiBTZWdtZW50LmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG52YXIgRGF0YVByb3ZpZGVyID0gcmVxdWlyZSgnLi9EYXRhUHJvdmlkZXInKTtcclxudmFyIFRyYW5zbGF0aW9uT3JpZ2luID0gcmVxdWlyZSgnLi9UcmFuc2xhdGlvbk9yaWdpbicpO1xyXG5cclxudmFyIHRyYW5zbGF0aW9uT3JpZ2luQ2xhc3MgPSB7XHJcbiAgJ2l0JzogJ3RyYW5zcGFyZW50JyxcclxuICAnYXQnOiAnYmx1ZScsXHJcbiAgJ3BtJzogJ2dyYXknLFxyXG4gICdhcCc6ICd5ZWxsb3cnLFxyXG4gICdjbSc6ICdncmVlbidcclxufTtcclxuXHJcbnZhciBkYXRhUHJvdmlkZXIgPSBEYXRhUHJvdmlkZXI7XHJcbnZhciB0cmFuc2xhdGlvbk9yaWdpblByb3ZpZGVyID0gVHJhbnNsYXRpb25PcmlnaW47XHJcblxyXG52YXIgU2VnbWVudCA9IGZ1bmN0aW9uIChpbml0aWFsaXplcikge1xyXG4gIGlmIChpbml0aWFsaXplcikge1xyXG4gICAgdGhpcy5zZWdtZW50TnVtYmVyID0gaW5pdGlhbGl6ZXIub3JkZXJudW1iZXI7XHJcbiAgfVxyXG5cclxuICB0aGlzLnNlZ21lbnREYXRhID0gZGF0YVByb3ZpZGVyLmdldFNlZ21lbnRCeVNlZ21lbnROdW1iZXIodGhpcy5zZWdtZW50TnVtYmVyKTtcclxufTtcclxuXHJcbnZhciBwcm90byA9IFNlZ21lbnQucHJvdG90eXBlO1xyXG5cclxucHJvdG8uZGlzcGxheU9yaWdpbkljb24gPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgbGFzdFR5cGUsXHJcbiAgICAgIG9yaWdpblR5cGVzLFxyXG4gICAgICB0cmFuc2xhdGlvbk9yaWdpbiA9IG1lLnNlZ21lbnREYXRhLnRyYW5zbGF0aW9ub3JpZ2luO1xyXG5cclxuICBpZiAoIXRyYW5zbGF0aW9uT3JpZ2luIHx8ICF0cmFuc2xhdGlvbk9yaWdpbi5vcmlnaW5UeXBlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBsYXN0VHlwZSA9ICh0cmFuc2xhdGlvbk9yaWdpbi5vcmlnaW5CZWZvcmVBZGFwdGF0aW9uKSA/IHRyYW5zbGF0aW9uT3JpZ2luLm9yaWdpbkJlZm9yZUFkYXB0YXRpb24ub3JpZ2luVHlwZSA6IG51bGw7XHJcbiAgb3JpZ2luVHlwZXMgPSB7J2ludGVyYWN0aXZlJzogdHJ1ZSwgJ3NvdXJjZSc6IHRydWV9O1xyXG5cclxuICBpZiAob3JpZ2luVHlwZXNbdHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luVHlwZV0gJiZcclxuICAgICAgdHJhbnNsYXRpb25PcmlnaW4ubWF0Y2hQZXJjZW50ID09PSAwICYmXHJcbiAgICAgICh0cmFuc2xhdGlvbk9yaWdpbi5vcmlnaW5CZWZvcmVBZGFwdGF0aW9uID09PSBudWxsIHx8XHJcbiAgICAgIGxhc3RUeXBlID09PSBudWxsIHx8IG9yaWdpblR5cGVzW2xhc3RUeXBlXSkpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiB0cnVlO1xyXG59O1xyXG5cclxucHJvdG8ub3JpZ2luQ2xhc3MgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgdHJhbnNsYXRpb25PcmlnaW4gPSBtZS5zZWdtZW50RGF0YS50cmFuc2xhdGlvbm9yaWdpbixcclxuICAgICAgdHlwZSA9IFRyYW5zbGF0aW9uT3JpZ2luLm9yaWdpblR5cGUodHJhbnNsYXRpb25PcmlnaW4pLFxyXG4gICAgICBjbGFzc05hbWUgPSB0cmFuc2xhdGlvbk9yaWdpbkNsYXNzW3R5cGVdO1xyXG5cclxuICBpZiAoY2xhc3NOYW1lKSB7XHJcbiAgICByZXR1cm4gY2xhc3NOYW1lO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHRyYW5zbGF0aW9uT3JpZ2luLm1hdGNoUGVyY2VudCA8IDEwMCA/ICd5ZWxsb3cnIDogJ2dyZWVuJztcclxufTtcclxuXHJcbnByb3RvLm9yaWdpblRleHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgdmFyIHQgPSBtZS5zZWdtZW50RGF0YS50cmFuc2xhdGlvbm9yaWdpbjtcclxuICB2YXIgdHlwZSA9IHRyYW5zbGF0aW9uT3JpZ2luUHJvdmlkZXIub3JpZ2luVHlwZSh0KTtcclxuICB2YXIgcGVyY2VudCA9IHQubWF0Y2hQZXJjZW50O1xyXG5cclxuICAvL2xvb2sgZm9yIHRoZSBmaXJzdCBvcmlnaW4gVHlwZVxyXG4gIGlmICh0Lm9yaWdpbkJlZm9yZUFkYXB0YXRpb24gIT09IG51bGwgJiYgdHlwZSA9PT0gJ2l0Jykge1xyXG4gICAgdmFyIGxhc3QgPSB0Lm9yaWdpbkJlZm9yZUFkYXB0YXRpb247XHJcbiAgICB0eXBlID0gVHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luVHlwZShsYXN0KTtcclxuICAgIHBlcmNlbnQgPSBsYXN0Lm1hdGNoUGVyY2VudDtcclxuICB9XHJcblxyXG4gIHZhciBzSWNvbiA9ICcnO1xyXG4gIHZhciBwZXJjZW50VHlwZXMgPSB7J2ZtJzogdHJ1ZSwgJ2VtJzogdHJ1ZSwgJ3RtJzogdHJ1ZSwgJ2l0JzogdHJ1ZSwgJ2FwJzogdHJ1ZSB9O1xyXG5cclxuICBpZiAocGVyY2VudFR5cGVzW3R5cGVdKSB7XHJcbiAgICBzSWNvbiA9IHBlcmNlbnQgKyAnJSc7XHJcbiAgfSBlbHNlIHtcclxuICAgIHNJY29uID0gdHlwZS50b1VwcGVyQ2FzZSgpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHNJY29uO1xyXG59O1xyXG5cclxucHJvdG8uc2VnbWVudEluZm8gPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgaWYgKG1lLnNlZ21lbnREYXRhID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiAnJztcclxuICB9XHJcblxyXG4gIHJldHVybiB0cmFuc2xhdGlvbk9yaWdpblByb3ZpZGVyLnRyYW5zbGF0aW9uSW5mbyhtZS5zZWdtZW50RGF0YSk7XHJcbn07XHJcblxyXG5wcm90by5zdGF0dXNJY29uID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLnNlZ21lbnREYXRhLmNvbmZpcm1hdGlvbmxldmVsIHx8ICdub3QtdHJhbnNsYXRlZCc7XHJcbn07XHJcblxyXG5wcm90by5pc0xvY2tlZFNlZ21lbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHRoaXMuc2VnbWVudERhdGEuaXNMb2NrZWQ7XHJcbn07XHJcblxyXG5wcm90by5pc0NvbmZpcm1lZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgY29uZmlybWVkTGV2ZWxzID0gW1xyXG4gICAgJ3RyYW5zbGF0ZWQnLFxyXG4gICAgJ2FwcHJvdmVkLXRyYW5zbGF0aW9uJyxcclxuICAgICdhcHByb3ZlZC1zaWduLW9mZidcclxuICBdO1xyXG5cclxuICB2YXIgaXNDb25maXJtZWQgPSBjb25maXJtZWRMZXZlbHMuaW5kZXhPZih0aGlzLnNlZ21lbnREYXRhLmNvbmZpcm1hdGlvbmxldmVsKSAhPT0gLTE7XHJcblxyXG4gIHJldHVybiBpc0NvbmZpcm1lZDtcclxufTtcclxuXHJcbnByb3RvLmNoYW5nZVRvRHJhZnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgdHJhbnNsYXRpb25PcmlnaW47XHJcblxyXG4gIG1lLnNlZ21lbnREYXRhLmNvbmZpcm1hdGlvbmxldmVsID0gJ2RyYWZ0JztcclxuICB0cmFuc2xhdGlvbk9yaWdpbiA9IG1lLnNlZ21lbnREYXRhLnRyYW5zbGF0aW9ub3JpZ2luO1xyXG5cclxuICBpZiAodHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luVHlwZSAhPT0gJ2ludGVyYWN0aXZlJykge1xyXG4gICAgdHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luQmVmb3JlQWRhcHRhdGlvbiA9IHRyYW5zbGF0aW9uT3JpZ2luUHJvdmlkZXIuY2xvbmUodHJhbnNsYXRpb25PcmlnaW4pO1xyXG4gICAgdHJhbnNsYXRpb25PcmlnaW4ub3JpZ2luVHlwZSA9ICdpbnRlcmFjdGl2ZSc7XHJcbiAgfVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWdtZW50OyIsIi8qIEZpbGU6IFNlZ21lbnRTdGF0dXNVcGRhdGVyLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG52YXIgTWVkaWF0b3IgPSByZXF1aXJlKCcuL01lZGlhdG9yJyk7XHJcbnZhciBEYXRhUHJvdmlkZXIgPSByZXF1aXJlKCcuL0RhdGFQcm92aWRlcicpO1xyXG52YXIgU2VnbWVudCA9IHJlcXVpcmUoJy4vU2VnbWVudCcpO1xyXG52YXIgU2VnbWVudHNXYXRjaGVyID0gcmVxdWlyZSgnLi9TZWdtZW50c1dhdGNoZXInKTtcclxudmFyIFNpZGVCeVNpZGVQYXJhZ3JhcGhVbml0c1JlbmRlcmVyID0gcmVxdWlyZSgnLi9TaWRlQnlTaWRlUGFyYWdyYXBoVW5pdHNSZW5kZXJlcicpO1xyXG5cclxudmFyIHJlbmRlcmVyID0gbmV3IFNpZGVCeVNpZGVQYXJhZ3JhcGhVbml0c1JlbmRlcmVyKCk7XHJcblxyXG5mdW5jdGlvbiBzZWdtZW50U3RhdHVzVXBkYXRlIChzZWdtZW50RGF0YSkge1xyXG4gIHZhciBzZWdtZW50LFxyXG4gICAgICBzdGF0dXMsXHJcbiAgICAgIHNlZ21lbnRDb250YWluZXI7XHJcblxyXG4gIC8vIFN0b3AgY2hhbmdpbmcgdGhlIHN0YXR1cyB3aGVuIGN1cnNvciBpc1xyXG4gIC8vIGluIGxvY2tlZCBzZWdtZW50IG9yIGxvY2tlZCBjb250ZW50XHJcbiAgaWYgKHNlZ21lbnREYXRhLnN0b3BFZGl0aW5nKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBzZWdtZW50ID0gbmV3IFNlZ21lbnQoc2VnbWVudERhdGEpO1xyXG4gIHN0YXR1cyA9IHJlbmRlcmVyLnJlbmRlclN0YXR1cyhzZWdtZW50KTtcclxuICBzZWdtZW50Q29udGFpbmVyID0gU2VnbWVudHNXYXRjaGVyLmdldENvbnRhaW5lckJ5U2VnbWVudE51bWJlcihzZWdtZW50LnNlZ21lbnROdW1iZXIpO1xyXG5cclxuICBzZWdtZW50Q29udGFpbmVyLnJlcGxhY2VTdGF0dXNFbChzdGF0dXMpO1xyXG4gIFNlZ21lbnRzV2F0Y2hlci5yZXNpemUoc2VnbWVudC5zZWdtZW50TnVtYmVyKTtcclxuICBTZWdtZW50c1dhdGNoZXIubWFya0NvbnRhaW5lckFzQWN0aXZlKHNlZ21lbnQuc2VnbWVudE51bWJlcik7XHJcbn07XHJcblxyXG5mdW5jdGlvbiBqdW1wVG9OZXh0VW5Db25maXJtZWRTZWdtZW50IChzZWdtZW50RGF0YSkge1xyXG4gIHZhciBpbml0aWFsU2VnbWVudCxcclxuICAgICAgc2VnbWVudDtcclxuXHJcbiAgaW5pdGlhbFNlZ21lbnQgPSBzZWdtZW50ID0gbmV3IFNlZ21lbnQoc2VnbWVudERhdGEpO1xyXG5cclxuICBkbyB7XHJcbiAgICB2YXIgbmV4dFNlZ21lbnREYXRhID0gRGF0YVByb3ZpZGVyLmdldFNlZ21lbnRCeVNlZ21lbnROdW1iZXIoK3NlZ21lbnQuc2VnbWVudE51bWJlciArIDEpO1xyXG4gICAgc2VnbWVudCA9IG51bGw7XHJcblxyXG4gICAgaWYgKG5leHRTZWdtZW50RGF0YSkge1xyXG4gICAgICBzZWdtZW50ID0gbmV3IFNlZ21lbnQobmV4dFNlZ21lbnREYXRhKTtcclxuICAgIH1cclxuXHJcbiAgfSB3aGlsZSAoc2VnbWVudCAhPT0gbnVsbCAmJiBzZWdtZW50LmlzQ29uZmlybWVkKCkpO1xyXG5cclxuICBpZiAoc2VnbWVudCA9PT0gbnVsbCkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgU2VnbWVudHNXYXRjaGVyLm1hcmtDb250YWluZXJBc0luYWN0aXZlKGluaXRpYWxTZWdtZW50LnNlZ21lbnROdW1iZXIpO1xyXG4gIFNlZ21lbnRzV2F0Y2hlci5tYXJrQ29udGFpbmVyQXNBY3RpdmUoc2VnbWVudC5zZWdtZW50TnVtYmVyKTtcclxuICBTZWdtZW50c1dhdGNoZXIuZm9jdXNUYXJnZXQoc2VnbWVudC5zZWdtZW50TnVtYmVyKTtcclxufTtcclxuXHJcbnZhciBTZWdtZW50U3RhdHVzVXBkYXRlciA9IGZ1bmN0aW9uICgpIHtcclxuICBNZWRpYXRvci5zdWJzY3JpYmUoJ3NlZ21lbnQ6Y29uZmlybWF0aW9uTGV2ZWxDaGFuZ2VkJywgc2VnbWVudFN0YXR1c1VwZGF0ZSk7XHJcbiAgTWVkaWF0b3Iuc3Vic2NyaWJlKCdzZWdtZW50Omp1bXBUb05leHRVbkNvbmZpcm1lZCcsIGp1bXBUb05leHRVbkNvbmZpcm1lZFNlZ21lbnQpO1xyXG5cclxuICBNZWRpYXRvci5zdWJzY3JpYmUoJ3NlZ21lbnQ6bG9jaycsIHNlZ21lbnRTdGF0dXNVcGRhdGUpO1xyXG4gIE1lZGlhdG9yLnN1YnNjcmliZSgnc2VnbWVudDp1bmxvY2snLCBzZWdtZW50U3RhdHVzVXBkYXRlKTtcclxuXHJcbiAgTWVkaWF0b3Iuc3Vic2NyaWJlKCdzZWdtZW50OnN0b3BFZGl0aW5nSW5Mb2NrZWRDb250ZW50Jywgc2VnbWVudFN0YXR1c1VwZGF0ZSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFNlZ21lbnRTdGF0dXNVcGRhdGVyKCk7IiwiLyogRmlsZTogU2VnbWVudFdhdGNoZXIuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyAkLCBfLCBtb2R1bGUgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFNlZ21lbnRzV2F0Y2hlciA9IChmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIHJlc2l6ZUNhbGxzLFxyXG4gICAgICBncm91cHMgPSB7fSxcclxuICAgICAgdGFnUGFpcnMgPSB7fSxcclxuICAgICAgY3VycmVudENvbnRhaW5lciA9IHt9O1xyXG5cclxuICBmdW5jdGlvbiBzZWdtZW50Q29udGFpbmVyKCkge1xyXG4gICAgdGhpcy5zb3VyY2VFbCA9IG51bGw7XHJcbiAgICB0aGlzLnRhcmdldEVsID0gbnVsbDtcclxuICAgIHRoaXMuc3RhdHVzRWwgPSBudWxsO1xyXG5cclxuICAgIHRoaXMuc291cmNlSW5saW5lQ29udGVudEVsID0gbnVsbDtcclxuICAgIHRoaXMudGFyZ2V0SW5saW5lQ29udGVudEVsID0gbnVsbDtcclxuICAgIHRoaXMubGlua2VkRWxlbWVudHMgPSBbXTtcclxuXHJcbiAgICB0aGlzLmlzSGVpZ2h0Q29tcHV0ZWQgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIHNlZ21lbnRDb250YWluZXIucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgdGhpcy5saW5rZWRFbGVtZW50cy5wdXNoKGl0ZW0pO1xyXG4gIH07XHJcblxyXG4gIHNlZ21lbnRDb250YWluZXIucHJvdG90eXBlLnJlcGxhY2VTdGF0dXNFbCA9IGZ1bmN0aW9uIChzdGF0dXNFbCkge1xyXG4gICAgdmFyIG1lID0gdGhpcztcclxuICAgIHZhciBzdGF0dXNQb3NpdGlvbiA9IG1lLmxpbmtlZEVsZW1lbnRzLmluZGV4T2YobWUuc3RhdHVzRWwpO1xyXG4gICAgaWYgKHN0YXR1c1Bvc2l0aW9uID09PSAtMSkge1xyXG4gICAgICB0aHJvdyAnSW52YWxpZCBzdGF0ZSwgbGlua2VkRWxlbWVudCBkb2VzIG5vdCBleGlzdCc7XHJcbiAgICB9XHJcblxyXG4gICAgbWUuc3RhdHVzRWwucmVwbGFjZVdpdGgoc3RhdHVzRWwpO1xyXG4gICAgbWUuc3RhdHVzRWwgPSBzdGF0dXNFbDtcclxuXHJcbiAgICBtZS5saW5rZWRFbGVtZW50c1tzdGF0dXNQb3NpdGlvbl0gPSBtZS5zdGF0dXNFbDtcclxuICB9O1xyXG5cclxuICBmdW5jdGlvbiBfcmVzaXplQ29udGFpbmVyKGNvbnRhaW5lcikge1xyXG4gICAgdmFyIE1JTl9IRUlHSFQgPSAyNyxcclxuICAgICAgICBzb3VyY2VJbmxpbmVDb250ZW50ID0gY29udGFpbmVyLnNvdXJjZUlubGluZUNvbnRlbnRFbCB8fCAkKGNvbnRhaW5lci5zb3VyY2VFbFswXS5maXJzdENoaWxkKSwgLy8kKCc6Zmlyc3QtY2hpbGQnLCBjb250YWluZXIuc291cmNlRWwpLFxyXG4gICAgICAgIHRhcmdldElubGluZUNvbnRlbnQgPSBjb250YWluZXIudGFyZ2V0SW5saW5lQ29udGVudEVsIHx8ICQoY29udGFpbmVyLnRhcmdldEVsWzBdLmZpcnN0Q2hpbGQpLCAvLyQoJzpmaXJzdC1jaGlsZCcsIGNvbnRhaW5lci50YXJnZXRFbCksXHJcbiAgICAgICAgc291cmNlSGVpZ2h0ID0gcGFyc2VJbnQoc291cmNlSW5saW5lQ29udGVudC5jc3MoJ2hlaWdodCcpLCAxMCksXHJcbiAgICAgICAgdGFyZ2V0SGVpZ2h0ID0gcGFyc2VJbnQodGFyZ2V0SW5saW5lQ29udGVudC5jc3MoJ2hlaWdodCcpLCAxMCksXHJcbiAgICAgICAgbWF4SGVpZ2h0ID0gTWF0aC5tYXgoc291cmNlSGVpZ2h0LCB0YXJnZXRIZWlnaHQpLFxyXG4gICAgICAgIHRhcmdldGVkSGVpZ2h0ID0gTWF0aC5tYXgoTUlOX0hFSUdIVCwgbWF4SGVpZ2h0KTtcclxuXHJcbiAgICBjb250YWluZXIubGlua2VkRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG4gICAgICBpdGVtLmNzcygnaGVpZ2h0JywgdGFyZ2V0ZWRIZWlnaHQgKyAncHgnKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcmVzaXplQ2FsbHMgPSAwO1xyXG5cclxuICB3aW5kb3cub25yZXNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICBTZWdtZW50c1dhdGNoZXIucmVzaXplQ29udGFpbmVycygpO1xyXG4gIH07XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZXNpemVDYWxsczogMCxcclxuICAgIC8qXHJcbiAgICAqIEBlbGVtZW50R3JvdXAgLSBsaXN0IG9mIGVsZW1lbnRzIHRoYXQgbXVzdCBoYXZlIHRoZSBzYW1lIGhlaWdodFxyXG4gICAgKi9cclxuICAgIHdhdGNoU2VnbWVudDogZnVuY3Rpb24gKHNlZ21lbnROdW1iZXIpIHtcclxuICAgICAgaWYgKGdyb3Vwc1tzZWdtZW50TnVtYmVyXSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZ3JvdXBzW3NlZ21lbnROdW1iZXJdID0gbmV3IHNlZ21lbnRDb250YWluZXIoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY3VycmVudENvbnRhaW5lciA9IGdyb3Vwc1tzZWdtZW50TnVtYmVyXTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuXHJcbiAgICBncm91cEFkZDogZnVuY3Rpb24gKGVsZW1lbnQpIHtcclxuICAgICAgY3VycmVudENvbnRhaW5lci5wdXNoKGVsZW1lbnQpO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIHNldFNvdXJjZTogZnVuY3Rpb24gKHNvdXJjZUVsKSB7XHJcbiAgICAgIGN1cnJlbnRDb250YWluZXIuc291cmNlRWwgPSBzb3VyY2VFbDtcclxuICAgICAgdGhpcy5ncm91cEFkZChzb3VyY2VFbCk7XHJcblxyXG4gICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcblxyXG4gICAgc2V0U3RhdHVzOiBmdW5jdGlvbiAoc3RhdHVzRWwpIHtcclxuICAgICAgY3VycmVudENvbnRhaW5lci5zdGF0dXNFbCA9IHN0YXR1c0VsO1xyXG4gICAgICB0aGlzLmdyb3VwQWRkKHN0YXR1c0VsKTtcclxuXHJcbiAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuXHJcbiAgICBzZXRUYXJnZXQ6IGZ1bmN0aW9uICh0YXJnZXRFbCkge1xyXG4gICAgICBjdXJyZW50Q29udGFpbmVyLnRhcmdldEVsID0gdGFyZ2V0RWw7XHJcbiAgICAgIHRoaXMuZ3JvdXBBZGQodGFyZ2V0RWwpO1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIGFkZFRhZ1BhaXI6IGZ1bmN0aW9uICh0YWdQYWlySWQsIHRhZ1BhaXJFbGVtZW50cykge1xyXG4gICAgICB0YWdQYWlyc1t0YWdQYWlySWRdID0gdGFnUGFpckVsZW1lbnRzO1xyXG4gICAgfSxcclxuXHJcbiAgICByZW1vdmVUYWdQYWlyOiBmdW5jdGlvbiAodGFnUGFpcklkKSB7XHJcbiAgICAgIHZhciBleGlzdHMgPSB0YWdQYWlySWQgaW4gdGFnUGFpcnMsXHJcbiAgICAgICAgICBlbGVtZW50O1xyXG5cclxuICAgICAgaWYgKCFleGlzdHMpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRhZ1BhaXJzW3RhZ1BhaXJJZF0uZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xyXG4gICAgICAgIGVsZW1lbnQucmVtb3ZlKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICByZXNpemVDb250YWluZXJzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIF8oZ3JvdXBzKS5mb3JPd24oX3Jlc2l6ZUNvbnRhaW5lcik7XHJcblxyXG4gICAgICBpZiAodGhpcy5yZXNpemVDYWxscyA8IDMpIHtcclxuICAgICAgICB3aW5kb3cuc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBTZWdtZW50c1dhdGNoZXIucmVzaXplQ29udGFpbmVycygpO1xyXG4gICAgICAgIH0sIDUwMCk7XHJcbiAgICAgICAgdGhpcy5yZXNpemVDYWxscysrO1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHJlc2l6ZTogZnVuY3Rpb24gKGNvbnRhaW5lcklkKSB7XHJcbiAgICAgIF9yZXNpemVDb250YWluZXIoZ3JvdXBzW2NvbnRhaW5lcklkXSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGdldENvbnRhaW5lckJ5U2VnbWVudE51bWJlcjogZnVuY3Rpb24gKHNlZ21lbnROdW1iZXIpIHtcclxuICAgICAgcmV0dXJuIGdyb3Vwc1tzZWdtZW50TnVtYmVyXTtcclxuICAgIH0sXHJcblxyXG4gICAgbWFya0NvbnRhaW5lckFzQWN0aXZlOiBmdW5jdGlvbiAoc2VnbWVudE51bWJlcikge1xyXG4gICAgICB2YXIgY29udGFpbmVyID0gdGhpcy5nZXRDb250YWluZXJCeVNlZ21lbnROdW1iZXIoc2VnbWVudE51bWJlcik7XHJcblxyXG4gICAgICBpZiAoY29udGFpbmVyID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnRhaW5lci5saW5rZWRFbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChsaW5rZWRFbCkge1xyXG4gICAgICAgIGxpbmtlZEVsLmFkZENsYXNzKCd1ZS1yb3ctYWN0aXZlJyk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSxcclxuXHJcbiAgICBtYXJrQ29udGFpbmVyQXNJbmFjdGl2ZTogZnVuY3Rpb24gKHNlZ21lbnROdW1iZXIpIHtcclxuICAgICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuZ2V0Q29udGFpbmVyQnlTZWdtZW50TnVtYmVyKHNlZ21lbnROdW1iZXIpO1xyXG5cclxuICAgICAgaWYgKGNvbnRhaW5lciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb250YWluZXIubGlua2VkRWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAobGlua2VkRWwpIHtcclxuICAgICAgICBsaW5rZWRFbC5yZW1vdmVDbGFzcygndWUtcm93LWFjdGl2ZScpO1xyXG4gICAgICB9KTtcclxuICAgIH0sXHJcblxyXG4gICAgZm9jdXNUYXJnZXQ6IGZ1bmN0aW9uIChzZWdtZW50TnVtYmVyKSB7XHJcbiAgICAgIHZhciBjb250YWluZXIgPSB0aGlzLmdldENvbnRhaW5lckJ5U2VnbWVudE51bWJlcihzZWdtZW50TnVtYmVyKTtcclxuICAgICAgdmFyIHJhbmdlID0gZG9jdW1lbnQuY3JlYXRlUmFuZ2UoKTtcclxuICAgICAgcmFuZ2Uuc2V0U3RhcnRCZWZvcmUoY29udGFpbmVyLnRhcmdldEVsWzBdKTtcclxuXHJcbiAgICAgIHZhciBzZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKTtcclxuICAgICAgc2VsZWN0aW9uLnJlbW92ZUFsbFJhbmdlcygpO1xyXG4gICAgICBzZWxlY3Rpb24uYWRkUmFuZ2UocmFuZ2UpO1xyXG4gICAgICByYW5nZS5jb2xsYXBzZSgpO1xyXG4gICAgfSxcclxuXHJcbiAgICBnZXRUYXJnZXRFbDogZnVuY3Rpb24gKHNlZ21lbnROdW1iZXIpIHtcclxuICAgICAgdmFyIGNvbnRhaW5lciA9IHRoaXMuZ2V0Q29udGFpbmVyQnlTZWdtZW50TnVtYmVyKHNlZ21lbnROdW1iZXIpLFxyXG4gICAgICAgIHRhcmdldEVsO1xyXG5cclxuICAgICAgaWYgKGNvbnRhaW5lciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRhcmdldEVsID0gY29udGFpbmVyLnRhcmdldEVsO1xyXG5cclxuICAgICAgcmV0dXJuIHRhcmdldEVsO1xyXG4gICAgfSxcclxuXHJcbiAgICBkZXN0cm95OiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgfVxyXG5cclxuICB9O1xyXG5cclxufSkoKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VnbWVudHNXYXRjaGVyOyIsIi8qIEZpbGU6IFNlbGVjdGlvbi5qcyAqL1xyXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xyXG4vKiBnbG9iYWxzIHJlcXVpcmUsIG1vZHVsZSAqL1xyXG5cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIG5vZGVXYWxrZXIgPSByZXF1aXJlKCcuL3NlbGVjdGlvbi9Ob2RlV2Fsa2VyJyk7XHJcbnZhciB0YWdQYWlyID0gcmVxdWlyZSgnLi9zZWxlY3Rpb24vVGFnUGFpcicpO1xyXG52YXIgc2VsZWN0aW9uQ29udGV4dCA9IHJlcXVpcmUoJy4vc2VsZWN0aW9uL1NlbGVjdGlvbkNvbnRleHQnKTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBOb2RlV2Fsa2VyOiBub2RlV2Fsa2VyLFxyXG4gIFNlbGVjdGlvbkNvbnRleHQ6IHNlbGVjdGlvbkNvbnRleHQsXHJcbiAgVGFnUGFpcjogdGFnUGFpclxyXG59OyIsIi8qIEZpbGU6IFNpZGVCeVNpZGVQYXJhZ3JhcGhVbml0c1JlbmRlcmVyLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgXywgY29uc29sZSwgcmVxdWlyZSwgbW9kdWxlICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xyXG52YXIgSGVscGVycyA9IHJlcXVpcmUoJy4vSGVscGVycycpO1xyXG52YXIgVG1wbCA9IHJlcXVpcmUoJy4vVG1wbCcpO1xyXG52YXIgU2VnbWVudHNXYXRjaGVyID0gcmVxdWlyZSgnLi9TZWdtZW50c1dhdGNoZXInKTtcclxudmFyIE5vZGVXcmFwcGVyID0gcmVxdWlyZSgnLi9Ob2RlV3JhcHBlcicpO1xyXG52YXIgVGFnQ29udGVudEJ1aWxkZXIgPSByZXF1aXJlKCcuL3JlbmRlcmVyL1RhZ0NvbnRlbnRCdWlsZGVyJyk7XHJcbnZhciBTdHlsZXNNYXAgPSByZXF1aXJlKCcuL3JlbmRlcmVyL1N0eWxlc01hcCcpO1xyXG5cclxudmFyIFNpZGVCeVNpZGVQYXJhZ3JhcGhVbml0c1JlbmRlcmVyID0gZnVuY3Rpb24gKHBhcmFncmFwaHMsIHVlRG9jdW1lbnQpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBtZS5wYXJhZ3JhcGhzID0gcGFyYWdyYXBocztcclxuICBtZS51ZURvY3VtZW50ID0gdWVEb2N1bWVudDtcclxuXHJcbiAgbWUudG1wbCA9IFRtcGw7XHJcbiAgbWUuc2VnbWVudHNXYXRjaGVyID0gU2VnbWVudHNXYXRjaGVyO1xyXG5cclxuICBtZS5zb3VyY2VTZWN0aW9uRWwgPSAkKG1lLnRtcGwuc291cmNlU2VjdGlvbik7XHJcbiAgbWUudGFyZ2V0U2VjdGlvbkVsID0gJChtZS50bXBsLnRhcmdldFNlY3Rpb24pO1xyXG5cclxuICBtZS5zZWdtZW50TnVtYmVycyA9ICQobWUudG1wbC5ndXR0ZXJDb2x1bW4pO1xyXG4gIG1lLnNvdXJjZUNvbHVtbnMgPSAkKG1lLnRtcGwuc291cmNlQ29sdW1uKTtcclxuICBtZS5zZWdtZW50U3RhdHVzID0gJChtZS50bXBsLnN0YXR1c0NvbHVtbik7XHJcbiAgbWUudGFyZ2V0Q29sdW1ucyA9ICQobWUudG1wbC50YXJnZXRDb2x1bW4pO1xyXG5cclxuICBtZS5zb3VyY2VFZGl0YWJsZUNvbHVtbiA9ICQobWUudG1wbC5lZGl0YWJsZUZhbHNlKTtcclxuICBtZS50YXJnZXRFZGl0YWJsZUNvbHVtbiA9ICQobWUudG1wbC5lZGl0YWJsZVRydWUpO1xyXG5cclxuICBtZS5maWxlU3RhcnQgPSAkKG1lLnRtcGwuZmlsZVRhZ1N0YXJ0KTtcclxuICBtZS5maWxlRW5kID0gJChtZS50bXBsLmZpbGVUYWdFbmQpO1xyXG5cclxuICBtZS5pc1RhZ0NvcHlBbGxvd2VkID0gZmFsc2U7XHJcblxyXG59O1xyXG5cclxudmFyIHJlbmRlcmVyID0gU2lkZUJ5U2lkZVBhcmFncmFwaFVuaXRzUmVuZGVyZXI7XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIG1lLmFzc2lnbkVkaXRhYmxlQ29sdW1uc0xhbmcoKTtcclxuICBtZS5hc3NpZ25Eb2N1bWVudE5hbWUoKTtcclxuICBtZS5hcHBlbmRTdHJ1Y3R1cmUoKTtcclxuICBtZS5hcHBlbmRGaWxlU3RhcnQoKTtcclxuICBtZS5hcHBlbmRFZGl0YWJsZUNvbHVtbnMoKTtcclxuICBtZS5wcm9jZXNzUGFyYWdyYXBocygpO1xyXG4gIG1lLmFwcGVuZEZpbGVFbmQoKTtcclxufTtcclxuXHJcblxyXG4vKipcclxuICogQWRkIGxhbmcgYXR0cmlidXRlIHRvIGNvbnRlbnQgZWRpdGFibGUgZWxlbWVudHNcclxuICovXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5hc3NpZ25FZGl0YWJsZUNvbHVtbnNMYW5nID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGRvY0RhdGEgPSBtZS51ZURvY3VtZW50LmRhdGEsXHJcbiAgY29sdW1ucyA9IHtcclxuICAgIHNvdXJjZTogbWUuc291cmNlQ29sdW1ucyxcclxuICAgIHRhcmdldDogbWUudGFyZ2V0Q29sdW1uc1xyXG4gIH07XHJcblxyXG4gIF8uZm9yRWFjaChjb2x1bW5zLCBmdW5jdGlvbiAoY29sdW1uLCBjb2x1bW5OYW1lKSB7XHJcbiAgICBjb2x1bW4ucHJvcCgnbGFuZycsXHJcbiAgICAgIGRvY0RhdGFbY29sdW1uTmFtZSArICdMYW5ndWFnZUNvZGUnXSk7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUuYXNzaWduRG9jdW1lbnROYW1lID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcbiAgW21lLmZpbGVTdGFydCwgbWUuZmlsZUVuZF0uZm9yRWFjaChmdW5jdGlvbiAoZmlsZVRhZykge1xyXG4gICAgZmlsZVRhZ1swXS5maXJzdENoaWxkLmRhdGFzZXQuZGlzcGxheUNvbnRlbnQgPSBtZS51ZURvY3VtZW50LmRhdGEubmFtZTtcclxuICB9KTtcclxufTtcclxuXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5hcHBlbmRTdHJ1Y3R1cmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgbWUuc291cmNlU2VjdGlvbkVsLmFwcGVuZChtZS5zZWdtZW50TnVtYmVycyk7XHJcbiAgbWUuc291cmNlU2VjdGlvbkVsLmFwcGVuZChtZS5zb3VyY2VDb2x1bW5zKTtcclxuICBtZS50YXJnZXRTZWN0aW9uRWwuYXBwZW5kKG1lLnNlZ21lbnRTdGF0dXMpO1xyXG4gIG1lLnRhcmdldFNlY3Rpb25FbC5hcHBlbmQobWUudGFyZ2V0Q29sdW1ucyk7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUuYXBwZW5kRmlsZVN0YXJ0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIG1lLnNlZ21lbnROdW1iZXJzLmFwcGVuZCgkKG1lLnRtcGwuY2VsbCkuaHRtbChtZS50bXBsLnp3bmopKTtcclxuICBtZS5zb3VyY2VFZGl0YWJsZUNvbHVtbi5hcHBlbmQobWUuZmlsZVN0YXJ0KTtcclxuICBtZS5zZWdtZW50U3RhdHVzLmFwcGVuZCgkKG1lLnRtcGwuY2VsbCkuaHRtbChtZS50bXBsLnp3bmopKTtcclxuICBtZS50YXJnZXRFZGl0YWJsZUNvbHVtbi5hcHBlbmQobWUuZmlsZVN0YXJ0LmNsb25lKCkpO1xyXG59O1xyXG5cclxucmVuZGVyZXIucHJvdG90eXBlLmFwcGVuZEVkaXRhYmxlQ29sdW1ucyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBtZS5zb3VyY2VDb2x1bW5zLmFwcGVuZChtZS5zb3VyY2VFZGl0YWJsZUNvbHVtbik7XHJcbiAgbWUudGFyZ2V0Q29sdW1ucy5hcHBlbmQobWUudGFyZ2V0RWRpdGFibGVDb2x1bW4pO1xyXG59O1xyXG5cclxucmVuZGVyZXIucHJvdG90eXBlLnByb2Nlc3NQYXJhZ3JhcGhzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHBhcmFncmFwaFNlZ21lbnRzO1xyXG5cclxuICBtZS5wYXJhZ3JhcGhzLmZvckVhY2goZnVuY3Rpb24gKHBhcmFncmFwaEl0ZW0pIHtcclxuICAgIHBhcmFncmFwaFNlZ21lbnRzID0gbmV3IE5vZGVXcmFwcGVyKHBhcmFncmFwaEl0ZW0pLnNlZ21lbnRzKCk7XHJcbiAgICBtZS5yZW5kZXJTZWdtZW50cyhwYXJhZ3JhcGhTZWdtZW50cyk7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUucmVuZGVyU2VnbWVudHMgPSBmdW5jdGlvbiAocGFyYWdyYXBoU2VnbWVudHMpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBwYXJhZ3JhcGhTZWdtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChwYXJhZ3JhcGgpIHtcclxuICAgIG1lLnJlbmRlclNvdXJjZShwYXJhZ3JhcGguc291cmNlKTtcclxuICAgIG1lLnJlbmRlclRhcmdldChwYXJhZ3JhcGgudGFyZ2V0KTtcclxuICB9KTtcclxufTtcclxuXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJTb3VyY2UgPSBmdW5jdGlvbiAoc291cmNlKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VnbWVudCA9IHNvdXJjZSxcclxuICAgICAgc2VnbWVudERhdGEsIGZvcm1hdHRpbmcsIHNlZ21lbnROdW1iZXJFbCxcclxuICAgICAgc2VnbWVudFNvdXJjZUVsLCBzZWdtZW50U3RhdHVzRWw7XHJcblxyXG4gIG1lLmlzVGFnQ29weUFsbG93ZWQgPSB0cnVlO1xyXG5cclxuICBpZiAoc291cmNlLnR5cGUgPT09ICd0YWdQYWlyJykge1xyXG4gICAgc2VnbWVudERhdGEgPSBtZS5fZmluZFNlZ21lbnQoc291cmNlKTtcclxuICAgIHNlZ21lbnQgPSBzZWdtZW50RGF0YS5zZWdtZW50O1xyXG4gICAgZm9ybWF0dGluZyA9IHNlZ21lbnREYXRhLmZvcm1hdHRpbmcgfHwge307XHJcbiAgfVxyXG5cclxuICBtZS5zZWdtZW50c1dhdGNoZXIud2F0Y2hTZWdtZW50KHNlZ21lbnQuc2VnbWVudE51bWJlcik7XHJcblxyXG4gIHNlZ21lbnROdW1iZXJFbCA9IG1lLnJlbmRlclNlZ21lbnROdW1iZXIoc2VnbWVudCk7XHJcbiAgc2VnbWVudFNvdXJjZUVsID0gbWUucmVuZGVyU291cmNlU2VnbWVudChzZWdtZW50LCBmb3JtYXR0aW5nKTtcclxuICBzZWdtZW50U3RhdHVzRWwgPSBtZS5yZW5kZXJTdGF0dXMoc2VnbWVudCk7XHJcblxyXG4gIG1lLnNlZ21lbnROdW1iZXJzLmFwcGVuZChzZWdtZW50TnVtYmVyRWwpO1xyXG4gIG1lLnNvdXJjZUVkaXRhYmxlQ29sdW1uLmFwcGVuZChzZWdtZW50U291cmNlRWwpO1xyXG4gIG1lLnNlZ21lbnRTdGF0dXMuYXBwZW5kKHNlZ21lbnRTdGF0dXNFbCk7XHJcbiAgbWUuc2VnbWVudHNXYXRjaGVyLnNldFNvdXJjZShzZWdtZW50U291cmNlRWwpO1xyXG4gIG1lLnNlZ21lbnRzV2F0Y2hlci5ncm91cEFkZChzZWdtZW50TnVtYmVyRWwpO1xyXG4gIG1lLnNlZ21lbnRzV2F0Y2hlci5zZXRTdGF0dXMoc2VnbWVudFN0YXR1c0VsKTtcclxufTtcclxuXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5yZW5kZXJUYXJnZXQgPSBmdW5jdGlvbiAodGFyZ2V0KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VnbWVudCA9IHRhcmdldCxcclxuICAgICAgc2VnbWVudERhdGEsIGZvcm1hdHRpbmcsIHNlZ21lbnRUYXJnZXRFbDtcclxuXHJcbiAgbWUuaXNUYWdDb3B5QWxsb3dlZCA9IGZhbHNlO1xyXG5cclxuICBpZiAodGFyZ2V0LnR5cGUgPT09ICd0YWdQYWlyJykge1xyXG4gICAgc2VnbWVudERhdGEgPSBtZS5fZmluZFNlZ21lbnQodGFyZ2V0KTtcclxuICAgIHNlZ21lbnQgPSBzZWdtZW50RGF0YS5zZWdtZW50O1xyXG4gICAgZm9ybWF0dGluZyA9IHNlZ21lbnREYXRhLmZvcm1hdHRpbmcgfHwge307XHJcbiAgfVxyXG5cclxuICBtZS5zZWdtZW50c1dhdGNoZXIud2F0Y2hTZWdtZW50KHNlZ21lbnQuc2VnbWVudE51bWJlcik7XHJcbiAgc2VnbWVudFRhcmdldEVsID0gbWUucmVuZGVyVGFyZ2V0U2VnbWVudChzZWdtZW50LCBmb3JtYXR0aW5nKTtcclxuICBtZS50YXJnZXRFZGl0YWJsZUNvbHVtbi5hcHBlbmQoc2VnbWVudFRhcmdldEVsKTtcclxuICBtZS5zZWdtZW50c1dhdGNoZXIuc2V0VGFyZ2V0KHNlZ21lbnRUYXJnZXRFbCk7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUuX2ZpbmRTZWdtZW50ID0gZnVuY3Rpb24gKGNvbnRhaW5lcikge1xyXG4gIHZhciBzZWdtZW50ID0gY29udGFpbmVyLFxyXG4gICAgICBmb3JtYXR0aW5nID0gc2VnbWVudC5mb3JtYXR0aW5nR3JvdXAgfHwge307IC8vIGNhY2hlIHRhZ3BhaXIgZm9ybWF0dGluZ1xyXG5cclxuICB3aGlsZSAoc2VnbWVudCAhPT0gbnVsbCAmJiBzZWdtZW50LnR5cGUgPT09ICd0YWdQYWlyJykge1xyXG4gICAgaWYgKHNlZ21lbnQuY2hpbGRyZW4ubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHNlZ21lbnQgPSBzZWdtZW50LmNoaWxkcmVuWzBdO1xyXG4gIH1cclxuXHJcbiAgLy8gcmV0dXJuIHNlZ21lbnQgYW5kIHRhZ3BhaXIgZm9ybWF0dGluZ1xyXG4gIHJldHVybiB7XHJcbiAgICBzZWdtZW50OiBzZWdtZW50LFxyXG4gICAgZm9ybWF0dGluZzogZm9ybWF0dGluZ1xyXG4gIH07XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUucmVuZGVyU2VnbWVudE51bWJlciA9IGZ1bmN0aW9uIChzZWdtZW50KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VnbWVudE51bWJlckVsID0gJChtZS50bXBsLmNlbGwpO1xyXG5cclxuICBzZWdtZW50TnVtYmVyRWwuaHRtbChzZWdtZW50LnNlZ21lbnROdW1iZXIpO1xyXG5cclxuICByZXR1cm4gc2VnbWVudE51bWJlckVsO1xyXG59O1xyXG5cclxucmVuZGVyZXIucHJvdG90eXBlLnJlbmRlclNvdXJjZVNlZ21lbnQgPSBmdW5jdGlvbiAoc2VnbWVudCwgZm9ybWF0dGluZykge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHNlZ21lbnRTb3VyY2VFbCA9ICQobWUudG1wbC5zZWdtZW50KSxcclxuICAgICAgaW5saW5lQ29udGVudCA9IG1lLl9yZW5kZXJJbmxpbmVDb250ZW50KHNlZ21lbnQuY2hpbGRyZW4pLFxyXG4gICAgICBzb3VyY2VEYXRhc2V0O1xyXG5cclxuICAvLyBJZiBzZWdtZW50IGlzIGxvY2tlZCwgYWRkICd1ZS1sb2NrZWQnIGNsYXNzIHRvIHNlZ21lbnQgZWxlbWVudFxyXG4gIGlmIChzZWdtZW50LmlzTG9ja2VkKSB7XHJcbiAgICBzZWdtZW50U291cmNlRWxbMF0uY2xhc3NMaXN0LmFkZCgndWUtc2VnbWVudC1sb2NrZWQnKTtcclxuICAgIHNlZ21lbnRTb3VyY2VFbFswXS5kYXRhc2V0LmlzTG9ja2VkID0gc2VnbWVudC5pc0xvY2tlZDtcclxuICB9XHJcblxyXG4gIGlmIChmb3JtYXR0aW5nKSB7XHJcbiAgICBpbmxpbmVDb250ZW50WzBdLmRhdGFzZXQuc3R5bGUgPSBKU09OLnN0cmluZ2lmeShmb3JtYXR0aW5nLml0ZW1zKTtcclxuICAgIGlubGluZUNvbnRlbnRbMF0uc3R5bGUuY3NzVGV4dCA9IG1lLl9wcmVwYXJlRm9ybWF0dGluZyhmb3JtYXR0aW5nKTtcclxuICB9XHJcblxyXG4gIHNlZ21lbnRTb3VyY2VFbC5hcHBlbmQoaW5saW5lQ29udGVudCk7XHJcblxyXG4gIHNvdXJjZURhdGFzZXQgPSBzZWdtZW50U291cmNlRWxbMF0uZGF0YXNldDtcclxuICBzb3VyY2VEYXRhc2V0LnNvdXJjZVNlZ21lbnROdW1iZXIgPSBzZWdtZW50LnNlZ21lbnROdW1iZXI7XHJcbiAgc291cmNlRGF0YXNldC5zb3VyY2VQdWlkID0gc2VnbWVudC5wdWlkKCk7XHJcblxyXG4gIHJldHVybiBzZWdtZW50U291cmNlRWw7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUucmVuZGVyU3RhdHVzID0gZnVuY3Rpb24gKHNlZ21lbnQpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBzZWdtZW50U3RhdHVzRWwgPSAkKG1lLnRtcGwuY2VsbCksXHJcbiAgICAgIHNlZ21lbnRTdGF0dXNDb250ZW50ID0gbWUuX3JlbmRlclNlZ21lbnRTdGF0dXMoc2VnbWVudCk7XHJcblxyXG4gIHNlZ21lbnRTdGF0dXNFbC5hcHBlbmQoc2VnbWVudFN0YXR1c0NvbnRlbnQpO1xyXG4gIHNlZ21lbnRTdGF0dXNFbC5hdHRyKCd0aXRsZScsIHNlZ21lbnQuc2VnbWVudEluZm8oKSk7XHJcblxyXG4gIHJldHVybiBzZWdtZW50U3RhdHVzRWw7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUucmVuZGVyVGFyZ2V0U2VnbWVudCA9IGZ1bmN0aW9uIChzZWdtZW50LCBmb3JtYXR0aW5nKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VnbWVudFRhcmdldEVsID0gbWUudG1wbC50YXJnZXRTZWdtZW50QnVpbGRlcigpLFxyXG4gICAgICBpbmxpbmVDb250ZW50ID0gbWUuX3JlbmRlcklubGluZUNvbnRlbnQoc2VnbWVudC5jaGlsZHJlbiksXHJcbiAgICAgIHRhcmdldERhdGFzZXQ7XHJcblxyXG4gIC8vIElmIHNlZ21lbnQgaXMgbG9ja2VkLCBhZGQgJ3VlLXNlZ21lbnQtbG9ja2VkJyBjbGFzcyB0byBzZWdtZW50IGVsZW1lbnRcclxuICBpZiAoc2VnbWVudC5pc0xvY2tlZCkge1xyXG4gICAgc2VnbWVudFRhcmdldEVsWzBdLmNsYXNzTGlzdC5hZGQoJ3VlLXNlZ21lbnQtbG9ja2VkJyk7XHJcbiAgICBzZWdtZW50VGFyZ2V0RWxbMF0uZGF0YXNldC5pc0xvY2tlZCA9IHNlZ21lbnQuaXNMb2NrZWQ7XHJcbiAgICBzZWdtZW50VGFyZ2V0RWxbMF0uZGF0YXNldC5zZWdtZW50TnVtYmVyID0gc2VnbWVudC5zZWdtZW50TnVtYmVyO1xyXG4gIH1cclxuXHJcbiAgLy8gSWYgd2UgaGF2ZSBmb3JtYXRpbmcgYWRkIGl0IHRvIHRoZSBpbmxpbmUgY29udGVudFxyXG4gIGlmIChmb3JtYXR0aW5nKSB7XHJcbiAgICBpbmxpbmVDb250ZW50WzBdLmRhdGFzZXQuc3R5bGUgPSBKU09OLnN0cmluZ2lmeShmb3JtYXR0aW5nLml0ZW1zKTtcclxuICAgIGlubGluZUNvbnRlbnRbMF0uc3R5bGUuY3NzVGV4dCA9IG1lLl9wcmVwYXJlRm9ybWF0dGluZyhmb3JtYXR0aW5nKTtcclxuICB9XHJcblxyXG4gIC8vIEFkZCBaZXJvIFdpZHRoIE5vbi1Kb2luZXIgYXMgdGhlIGZpcnN0IGNoYXJhY3RlclxyXG4gIC8vIGluc2lkZSBmaXJzdCBcInVlLWlubGluZS1jb250ZW50XCIgY29udGFpbmVyXHJcbiAgaW5saW5lQ29udGVudC5wcmVwZW5kKG1lLnRtcGwuenduaik7XHJcbiAgc2VnbWVudFRhcmdldEVsLmFwcGVuZChpbmxpbmVDb250ZW50KTtcclxuXHJcbiAgdGFyZ2V0RGF0YXNldCA9IHNlZ21lbnRUYXJnZXRFbFswXS5kYXRhc2V0O1xyXG4gIHRhcmdldERhdGFzZXQuc2VnbWVudE51bWJlciA9IHNlZ21lbnQuc2VnbWVudE51bWJlcjtcclxuICB0YXJnZXREYXRhc2V0LnB1aWQgPSBzZWdtZW50LnB1aWQoKTtcclxuXHJcbiAgcmV0dXJuIHNlZ21lbnRUYXJnZXRFbDtcclxufTtcclxuXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5hcHBlbmRGaWxlRW5kID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIG1lLnNlZ21lbnROdW1iZXJzLmFwcGVuZCgkKG1lLnRtcGwuY2VsbCkuaHRtbChtZS50bXBsLnp3bmopKTtcclxuICBtZS5zb3VyY2VFZGl0YWJsZUNvbHVtbi5hcHBlbmQoJChtZS5maWxlRW5kKSk7XHJcbiAgbWUuc2VnbWVudFN0YXR1cy5hcHBlbmQoJChtZS50bXBsLmNlbGwpLmh0bWwobWUudG1wbC56d25qKSk7XHJcbiAgbWUudGFyZ2V0RWRpdGFibGVDb2x1bW4uYXBwZW5kKG1lLmZpbGVFbmQuY2xvbmUoKSk7XHJcbn07XHJcblxyXG5yZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlclNlZ21lbnRTdGF0dXMgPSBmdW5jdGlvbiAoc2VnbWVudCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGluZm8gPSBtZS5fcmVuZGVyU2VnbWVudFN0YXR1c0ljb24oc2VnbWVudCksXHJcbiAgICAgIG9yaWdpbiA9IG1lLl9yZW5kZXJTZWdtZW50T3JpZ2luKHNlZ21lbnQpLFxyXG4gICAgICBzdGF0dXMgPSBtZS5fcmVuZGVyU2VnbWVudFN0YXRlSWNvbihzZWdtZW50KTtcclxuXHJcbiAgcmV0dXJuIFsgaW5mbywgb3JpZ2luLCBzdGF0dXMgXTtcclxufTtcclxuXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyU2VnbWVudFN0YXR1c0ljb24gPSBmdW5jdGlvbiAoc2VnbWVudCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHN0YXR1c0ljb25FbCA9ICQoJzxpLz4nKS5hZGRDbGFzcygnc3RhdHVzLWljb24tJyArIHNlZ21lbnQuc3RhdHVzSWNvbigpKTtcclxuXHJcbiAgcmV0dXJuICQobWUudG1wbC5zdGF0dXNDb2x1bW5XcmFwcGVyKCdmaXJzdCcpKS5hcHBlbmQoc3RhdHVzSWNvbkVsKTtcclxufTtcclxuXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyU2VnbWVudE9yaWdpbiA9IGZ1bmN0aW9uIChzZWdtZW50KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VnbWVudE9yaWdpbkVsID0gJCgnPGRpdi8+Jyk7XHJcblxyXG4gIGlmIChzZWdtZW50LmRpc3BsYXlPcmlnaW5JY29uKCkpIHtcclxuICAgIHNlZ21lbnRPcmlnaW5FbCA9ICQoJzxkaXYgY2xhc3M9XCJ1ZS10cmFuc2xhdGlvbi1vcmlnaW4tJyArXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc2VnbWVudC5vcmlnaW5DbGFzcygpICsgJ1wiPicgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHNlZ21lbnQub3JpZ2luVGV4dCgpICsgJzwvZGl2PicpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICQobWUudG1wbC5zdGF0dXNDb2x1bW5XcmFwcGVyKCdzZWNvbmQnKSkuYXBwZW5kKHNlZ21lbnRPcmlnaW5FbCk7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVuZGVyIHN0YXR1cyB0aGlyZCBjb2x1bW4gaWNvblxyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHNlZ21lbnRcclxuICogQHJldHVybiB7QXJyYXl9ICBqUXVlcnkgd3JhcHBlZCBzZXRcclxuICovXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyU2VnbWVudFN0YXRlSWNvbiA9IGZ1bmN0aW9uIChzZWdtZW50KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgc2VnbWVudFN0YXRlRWwsXHJcbiAgICAgIGlzTG9ja2VkID0gc2VnbWVudC5pc0xvY2tlZFNlZ21lbnQoKTtcclxuXHJcbiAgaWYgKGlzTG9ja2VkKSB7XHJcbiAgICBzZWdtZW50U3RhdGVFbCA9ICQobWUudG1wbC5zdGF0dXNJY29uU2VnbWVudExvY2tlZCk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gJChtZS50bXBsLnN0YXR1c0NvbHVtbldyYXBwZXIoJ3RoaXJkJykpLmh0bWwoc2VnbWVudFN0YXRlRWwpO1xyXG59O1xyXG5cclxucmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJJbmxpbmVDb250ZW50ID0gZnVuY3Rpb24gKGNoaWxkcmVuKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgY29udGVudCA9IFtdLFxyXG4gICAgICBpbmxpbmVJdGVtcztcclxuXHJcbiAgaWYgKCFjaGlsZHJlbikge1xyXG4gICAgcmV0dXJuIGNvbnRlbnQ7XHJcbiAgfVxyXG5cclxuICBjaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uIChpbmxpbmUpIHtcclxuICAgIGlubGluZUl0ZW1zID0gbWUuX3JlbmRlcklubGluZShpbmxpbmUpO1xyXG4gICAgY29udGVudCA9IGNvbnRlbnQuY29uY2F0KGlubGluZUl0ZW1zKTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuICQobWUudG1wbC5pbmxpbmVDb250ZW50V3JhcHBlcikuYXBwZW5kKGNvbnRlbnQpO1xyXG59O1xyXG5cclxuXHJcbi8qKlxyXG4gKiBSZW5kZXIgdGV4dFxyXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRhdGFcclxuICogQHJldHVybiB7QXJyYXl9XHJcbiAqL1xyXG5yZW5kZXJlci5wcm90b3R5cGUuX3JlbmRlclRleHQgPSBmdW5jdGlvbiAoZGF0YSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHRtcGwgPSBtZS50bXBsLFxyXG4gICAgICBodG1sID0gSGVscGVycy5zdHJpbmdUb0hUTUxFbGVtZW50KHRtcGwudGV4dCksXHJcbiAgICAgIGh0bWxFbCA9ICQoaHRtbCk7XHJcblxyXG4gIGh0bWwuZGF0YXNldC50eXBlID0gJ3RleHQnO1xyXG4gIGh0bWxFbC5odG1sKGRhdGEudGV4dCk7XHJcblxyXG4gIHJldHVybiBbIGh0bWxFbCBdO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlbmRlciB0YWdzXHJcbiAqIEBwYXJhbSAge09iamVjdH0gZGF0YVxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICovXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyVGFnUGFpciA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgdGFnUGFpclN0YXJ0LFxyXG4gICAgICB0YWdQYWlyRW5kLFxyXG4gICAgICB0YWdQYWlyID0gW10sXHJcbiAgICAgIGlubGluZUNvbnRlbnQsXHJcbiAgICAgIGlubGluZUNvbnRlbnRFbCxcclxuICAgICAgdGFnUGFpclN0YXJ0Q29udGVudCxcclxuICAgICAgdGFnUGFpckVuZENvbnRlbnQsXHJcbiAgICAgIHRhZ1BhaXJDb250ZW50ID0gKG5ldyBUYWdDb250ZW50QnVpbGRlcihjb25maWcudGFnRGlzcGxheUNvbnRleHQudGFnRGlzcGxheU1vZGUpKS5idWlsZChkYXRhKSxcclxuICAgICAgZXNjYXBlSFRNTCA9IEhlbHBlcnMuZXNjYXBlSFRNTCxcclxuICAgICAgdGFnRGlzcGxheUNvbnRleHQgPSAoY29uZmlnLnRhZ0Rpc3BsYXlDb250ZXh0LnNob3dGb3JtYXR0aW5nID09PSBmYWxzZSk7XHJcblxyXG4gIGlmICh0eXBlb2YgdGFnUGFpckNvbnRlbnQgPT09ICdvYmplY3QnKSB7XHJcbiAgICB0YWdQYWlyU3RhcnRDb250ZW50ID0gdGFnUGFpckNvbnRlbnQudGFnU3RhcnQ7XHJcbiAgICB0YWdQYWlyRW5kQ29udGVudCA9IHRhZ1BhaXJDb250ZW50LnRhZ0VuZDtcclxuICB9IGVsc2Uge1xyXG4gICAgdGFnUGFpclN0YXJ0Q29udGVudCA9IHRhZ1BhaXJFbmRDb250ZW50ID0gdGFnUGFpckNvbnRlbnQ7XHJcbiAgfVxyXG5cclxuICAvLyBCdWlsZCBzdGFydCAmIGVuZCB0YWdcclxuICB0YWdQYWlyU3RhcnQgPSBtZS50bXBsLnRhZ1BhaXJTdGFydEJ1aWxkZXIoKTtcclxuICB0YWdQYWlyRW5kID0gbWUudG1wbC50YWdQYWlyRW5kQnVpbGRlcigpO1xyXG5cclxuICAvLyBUaGlzIG5lZWRzIHRvIGJlIGNoYW5nZWRcclxuICB0YWdQYWlyU3RhcnRbMF0uY2hpbGROb2Rlc1swXS5kYXRhc2V0LmRpc3BsYXlDb250ZW50ID0gdGFnUGFpclN0YXJ0Q29udGVudDtcclxuICB0YWdQYWlyRW5kWzBdLmNoaWxkTm9kZXNbMF0uZGF0YXNldC5kaXNwbGF5Q29udGVudCA9IHRhZ1BhaXJFbmRDb250ZW50O1xyXG5cclxuICAvLyBBZGQgZGF0YS0qIGF0dHJpYnV0ZXMgdG8gdGFncGFpclxyXG4gIHRhZ1BhaXJTdGFydFswXS5kYXRhc2V0LnRhZ0NvcHkgPSBtZS5pc1RhZ0NvcHlBbGxvd2VkO1xyXG4gIHRhZ1BhaXJFbmRbMF0uZGF0YXNldC50YWdDb3B5ID0gbWUuaXNUYWdDb3B5QWxsb3dlZDtcclxuXHJcbiAgdGFnUGFpclN0YXJ0WzBdLmRhdGFzZXQuaWQgPSBkYXRhLmlkO1xyXG4gIHRhZ1BhaXJFbmRbMF0uZGF0YXNldC5pZCA9IGRhdGEuaWQ7XHJcblxyXG4gIHRhZ1BhaXJTdGFydFswXS5kYXRhc2V0Lm1ldGFkYXRhID0gZGF0YS5tZXRhZGF0YTtcclxuICB0YWdQYWlyRW5kWzBdLmRhdGFzZXQubWV0YWRhdGEgPSBkYXRhLm1ldGFkYXRhO1xyXG5cclxuICAvLyBJZiB3ZSBoYXZlIGNhbkhpZGUgcHJvcGVydHksIGFkZCBpdCB0byB0aGUgdGFnc1xyXG4gIGlmIChkYXRhLmNhbkhpZGUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgdGFnUGFpclN0YXJ0WzBdLmRhdGFzZXQuY2FuSGlkZSA9IGRhdGEuY2FuSGlkZTtcclxuICAgIHRhZ1BhaXJFbmRbMF0uZGF0YXNldC5jYW5IaWRlID0gZGF0YS5jYW5IaWRlO1xyXG5cclxuICAgIGlmICh0YWdEaXNwbGF5Q29udGV4dCAmJiBkYXRhLmNhbkhpZGUpIHtcclxuICAgICAgdGFnUGFpclN0YXJ0WzBdLmNsYXNzTGlzdC5hZGQoJ2hpZGUnKTtcclxuICAgICAgdGFnUGFpckVuZFswXS5jbGFzc0xpc3QuYWRkKCdoaWRlJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0YWdQYWlyLnB1c2godGFnUGFpclN0YXJ0KTtcclxuXHJcbiAgaW5saW5lQ29udGVudCA9IG1lLl9yZW5kZXJJbmxpbmVDb250ZW50KGRhdGEuY2hpbGRyZW4pO1xyXG4gIGlubGluZUNvbnRlbnQuYWRkQ2xhc3MoJ3VlLXRhZ3BhaXItY29udGVudCcpO1xyXG5cclxuICBpbmxpbmVDb250ZW50RWwgPSBpbmxpbmVDb250ZW50WzBdO1xyXG4gIGlubGluZUNvbnRlbnRFbC5kYXRhc2V0LnR5cGUgPSAndGFncGFpcic7XHJcbiAgaW5saW5lQ29udGVudEVsLmRhdGFzZXQuaWQgPSBkYXRhLmlkO1xyXG4gIGlubGluZUNvbnRlbnRFbC5kYXRhc2V0LmRlZmluaXRpb25pZCA9IGRhdGEudGFnUGFpckRlZmluaXRpb25JZDtcclxuICBpbmxpbmVDb250ZW50RWwuZGF0YXNldC5tZXRhZGF0YSA9IGRhdGEubWV0YWRhdGE7XHJcblxyXG4gIHRhZ1BhaXJTdGFydFswXS5kYXRhc2V0LmlkID0gZGF0YS5pZDtcclxuICB0YWdQYWlyRW5kWzBdLmRhdGFzZXQuaWQgPSBkYXRhLmlkO1xyXG5cclxuICAvLyBSZWRlciBzdHlsZXMgaWYgd2UgaGF2ZSBhIGZvcm1hdHRpbmdHcm91cFxyXG4gIGlmIChkYXRhLmZvcm1hdHRpbmdHcm91cCkge1xyXG4gICAgaW5saW5lQ29udGVudFswXS5kYXRhc2V0LnN0eWxlID0gSlNPTi5zdHJpbmdpZnkoZGF0YS5mb3JtYXR0aW5nR3JvdXAuaXRlbXMpO1xyXG4gICAgaW5saW5lQ29udGVudFswXS5zdHlsZS5jc3NUZXh0ID0gbWUuX3ByZXBhcmVGb3JtYXR0aW5nKGRhdGEuZm9ybWF0dGluZ0dyb3VwKTtcclxuICB9XHJcblxyXG4gIHRhZ1BhaXIucHVzaChpbmxpbmVDb250ZW50KTtcclxuICB0YWdQYWlyLnB1c2godGFnUGFpckVuZCk7XHJcblxyXG4gIG1lLnNlZ21lbnRzV2F0Y2hlci5hZGRUYWdQYWlyKGRhdGEuaWQsIFt0YWdQYWlyU3RhcnQsIHRhZ1BhaXJFbmRdKTtcclxuXHJcbiAgcmV0dXJuIHRhZ1BhaXI7XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFJlbmRlciBwbGFjZWhvbGRlcnNcclxuICogQHBhcmFtICB7T2JqZWN0fSBkYXRhXHJcbiAqIEByZXR1cm4ge0FycmF5fVxyXG4gKi9cclxucmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJQbGFjZWhvbGRlciA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgdG1wbCA9IG1lLnRtcGwsXHJcbiAgICAgIHBsYWNlaG9sZGVyLFxyXG4gICAgICBwbGFjZWhvbGRlckVsLFxyXG4gICAgICBwbGFjZWhvbGRlckNvbnRlbnQgPSAobmV3IFRhZ0NvbnRlbnRCdWlsZGVyKGNvbmZpZy50YWdEaXNwbGF5Q29udGV4dC50YWdEaXNwbGF5TW9kZSkpLmJ1aWxkKGRhdGEpLFxyXG4gICAgICBlc2NhcGVIVE1MID0gSGVscGVycy5lc2NhcGVIVE1MO1xyXG5cclxuICAvLyBUaGlzIG5lZWRzIHRvIGJlIGNoYW5nZWRcclxuICBwbGFjZWhvbGRlciA9IG1lLnRtcGwucGxhY2Vob2xkZXJUYWdCdWlsZGVyKCk7XHJcbiAgcGxhY2Vob2xkZXJbMF0uY2hpbGROb2Rlc1swXS5kYXRhc2V0LmRpc3BsYXlDb250ZW50ID0gcGxhY2Vob2xkZXJDb250ZW50O1xyXG5cclxuICBwbGFjZWhvbGRlckVsID0gcGxhY2Vob2xkZXJbMF07XHJcbiAgcGxhY2Vob2xkZXJFbC5kYXRhc2V0LnR5cGUgPSAncGxhY2Vob2xkZXInO1xyXG4gIHBsYWNlaG9sZGVyRWwuZGF0YXNldC5pZCA9IGRhdGEuaWQ7XHJcbiAgcGxhY2Vob2xkZXJFbC5kYXRhc2V0LmRlZmluaXRpb25pZCA9IGRhdGEucGxhY2Vob2xkZXJUYWdEZWZpbml0aW9uSWQ7XHJcbiAgcGxhY2Vob2xkZXJFbC5kYXRhc2V0Lm1ldGFkYXRhID0gZGF0YS5tZXRhZGF0YTtcclxuICBwbGFjZWhvbGRlckVsLmRhdGFzZXQudGFnQ29weSA9IG1lLmlzVGFnQ29weUFsbG93ZWQ7XHJcblxyXG4gIHJldHVybiBbIHBsYWNlaG9sZGVyIF07XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFJlbmRlciBsb2NrZWQgY29udGVudCBpbnNpZGUgYSBzZWdtZW50XHJcbiAqIEBwYXJhbSAge09iamVjdH0gZGF0YVxyXG4gKiBAcmV0dXJuIHtBcnJheX1cclxuICovXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5fcmVuZGVyTG9ja2VkQ29udGVudCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgdG1wbCA9IG1lLnRtcGwsXHJcbiAgICAgIGxvY2tlZENvbnRlbnRTdGFydCxcclxuICAgICAgbG9ja2VkQ29udGVudEVuZCxcclxuICAgICAgbG9ja2VkSW5saW5lQ29udGVudDtcclxuXHJcbiAgaWYgKCFkYXRhKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBsb2NrZWRDb250ZW50U3RhcnQgPSB0bXBsLmxvY2tlZENvbnRlbnRTdGFydFRhZ0J1aWxkZXIoKTtcclxuICBsb2NrZWRDb250ZW50RW5kID0gdG1wbC5sb2NrZWRDb250ZW50RW5kVGFnQnVpbGRlcigpO1xyXG4gIGxvY2tlZElubGluZUNvbnRlbnQgPSBtZS5fcmVuZGVySW5saW5lQ29udGVudChkYXRhKTtcclxuXHJcbiAgbG9ja2VkSW5saW5lQ29udGVudFswXS5kYXRhc2V0LmlzTG9ja2VkID0gdHJ1ZTtcclxuICBsb2NrZWRJbmxpbmVDb250ZW50WzBdLmNsYXNzTGlzdC5hZGQoJ3VlLWxvY2tlZC1jb250ZW50Jyk7XHJcblxyXG4gIHJldHVybiBbXHJcbiAgICBsb2NrZWRDb250ZW50U3RhcnQsXHJcbiAgICBsb2NrZWRJbmxpbmVDb250ZW50LFxyXG4gICAgbG9ja2VkQ29udGVudEVuZFxyXG4gIF07XHJcbn07XHJcblxyXG5cclxucmVuZGVyZXIucHJvdG90eXBlLl9yZW5kZXJJbmxpbmUgPSBmdW5jdGlvbiAoaW5saW5lKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgLy8gUmVuZGVyIHRleHRcclxuICBpZiAoaW5saW5lLnR5cGUgPT09ICd0ZXh0Jykge1xyXG4gICAgcmV0dXJuIG1lLl9yZW5kZXJUZXh0KGlubGluZSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZW5kZXIgdGFncyBhbmQgaW5saW5lIGNvbnRlbnRcclxuICBpZiAoaW5saW5lLnR5cGUgPT09ICd0YWdQYWlyJykge1xyXG4gICAgcmV0dXJuIG1lLl9yZW5kZXJUYWdQYWlyKGlubGluZSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZW5kZXIgcGxhY2Vob2xkZXJzXHJcbiAgaWYgKGlubGluZS50eXBlID09PSAncGxhY2Vob2xkZXJUYWcnKSB7XHJcbiAgICByZXR1cm4gbWUuX3JlbmRlclBsYWNlaG9sZGVyKGlubGluZSk7XHJcbiAgfVxyXG5cclxuICAvLyBSZW5kZXIgbG9ja2VkIGNvbnRlbnQgaW5zaWRlIHNlZ21lbnRzXHJcbiAgaWYgKGlubGluZS50eXBlID09PSAnbG9ja2VkJykge1xyXG4gICAgcmV0dXJuIG1lLl9yZW5kZXJMb2NrZWRDb250ZW50KGlubGluZS5jaGlsZHJlbik7XHJcbiAgfVxyXG5cclxuICAvLyBPciByZXR1cm4gZW1wdHkgYXJyYXlcclxuICByZXR1cm4gW107XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIFByZXBhcmVzIHN0eWxlcyBmb3IgdGFncGFpciBmb3JtYXR0aW5nXHJcbiAqIEBwYXJhbSAge29iamVjdH0gZm9ybWF0dGluZ0dyb3VwXHJcbiAqIEByZXR1cm4ge3N0cmluZ31cclxuICovXHJcbnJlbmRlcmVyLnByb3RvdHlwZS5fcHJlcGFyZUZvcm1hdHRpbmcgPSBmdW5jdGlvbiAoZm9ybWF0dGluZ0dyb3VwKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgaXRlbXMgPSB7fSxcclxuICAgICAgc3R5bGVzTGlzdCA9IFtdO1xyXG5cclxuICBpZiAoZm9ybWF0dGluZ0dyb3VwKSB7XHJcbiAgICBpdGVtcyA9IGZvcm1hdHRpbmdHcm91cC5pdGVtcztcclxuXHJcbiAgICAvLyBJbnRlcmF0ZSBvdmVyIGZvcm1hdHRpbmcgaXRlbXNcclxuICAgIF8uZm9yRWFjaChpdGVtcywgZnVuY3Rpb24gKGl0ZW0sIGtleSkge1xyXG5cclxuICAgICAgLy8gR2V0IGFsbCBzdHlsZXMgZnJvbSBTdHlsZXNNYXAgYW5kIGJ1aWxkXHJcbiAgICAgIC8vIHRoZSBzdHJpbmcgZm9yIGlubGluZSBzdHlsZSBhdHRyaWJ1dGVcclxuICAgICAgaWYgKGtleSAmJiAoa2V5LnRvTG93ZXJDYXNlKCkgaW4gU3R5bGVzTWFwKSkge1xyXG4gICAgICAgIF8uZm9yRWFjaChTdHlsZXNNYXBba2V5LnRvTG93ZXJDYXNlKCldKGl0ZW1zW2tleV0pLCBmdW5jdGlvbiAoc3R5bGUsIHByb3BlcnR5KSB7XHJcbiAgICAgICAgICBzdHlsZXNMaXN0LnB1c2goW3Byb3BlcnR5LCBzdHlsZV0uam9pbignOicpKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBpZiB0aGUgc3R5bGUgZG9lc24ndCBleGlzdCBpbiB0aGUgU3R5bGVzTWFwLCBsb2cgYW4gZXJyb3JcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdcIicgKyBrZXkgKyAnXCIgZG9lcyBub3QgZXhpc3QgaW4gdGhlIHN0eWxlcyBtYXAnKTtcclxuICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHN0eWxlc0xpc3Quam9pbignOycpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTaWRlQnlTaWRlUGFyYWdyYXBoVW5pdHNSZW5kZXJlcjsiLCIvKiBGaWxlOiBTdG9yYWdlLmpzICovXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG52YXIgTWVkaWF0b3IgPSByZXF1aXJlKCcuL01lZGlhdG9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBTdG9yYWdlSW1wbGVtZW50YXRpb246IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGluc3RhbmNlID0gbnVsbCxcbiAgICAgICAgYmFzZV91cmwgPSBjb25maWcuYmFzZVVybDtcblxuICAgIHZhciBkZWZhdWx0cyA9IHtcbiAgICAgIGxpbWl0OiBjb25maWcuZGVmYXVsdExpbWl0IHx8IDUsXG4gICAgICBvZmZzZXQ6IGNvbmZpZy5kZWZhdWx0T2Zmc2V0IHx8IDBcbiAgICB9O1xuXG5cbiAgICAvKipcbiAgICAgKiBwcml2YXRlIHNlYXJjaCBmdW5jdGlvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtBcnJheX0gbGlzdFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmN0aW9uIGNoZWNrIGNvbnN0cmFpbnRzXG4gICAgICogQHJldHVybiB7TnVtYmVyfEl0ZW19IGluZGV4fGl0ZW1cbiAgICAgKi9cbiAgICBmdW5jdGlvbiBzZWFyY2gobGlzdCwgZm5jKSB7XG4gICAgICB2YXIgbGVuID0gbGlzdC5sZW5ndGg7XG5cbiAgICAgIGlmICghZm5jIHx8IHR5cGVvZihmbmMpICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH1cblxuICAgICAgaWYgKCFsaXN0IHx8ICFsZW4gfHwgbGVuIDwgMSkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgaWYgKGZuYyhsaXN0W2ldKSkge1xuICAgICAgICAgIHJldHVybiBsaXN0W2ldO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiAtMTtcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTaW5nbGUgZW50cnkgcG9pbnQgdG8gZ2V0IGRhdGFcbiAgICAgKlxuICAgICAqIEBkZXBlbmRlbmN5IGpRdWVyeVxuICAgICAqXG4gICAgICogQHBhcmFtIHtTdHJpbmd9ICAgIHVybFxuICAgICAqIEBwYXJhbSB7RnVuY3Rpb259ICBjYWxsYmFjayBzdWNjZXNzIGNhbGxiYWNrXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0RGF0YSh1cmwsIGNhbGxiYWNrKSB7XG4gICAgICB2YXIgYWN0aW9uID0gJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgdXJsOiBiYXNlX3VybCArIHVybCxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJ1xuICAgICAgfSk7XG5cbiAgICAgIGFjdGlvbi5kb25lKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGRhdGEpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzYXZlRGF0YSh1cmwsIGRhdGEpIHtcbiAgICAgIHZhciBwcm9taXNlID0gJC5EZWZlcnJlZCgpO1xuXG4gICAgICB2YXIgYWN0aW9uID0gJC5hamF4KHtcbiAgICAgICAgbWV0aG9kOiAnUFVUJyxcbiAgICAgICAgdXJsOiBiYXNlX3VybCArIHVybCxcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgZGF0YTogSlNPTi5zdHJpbmdpZnkoZGF0YSksXG4gICAgICAgIGRhdGFUeXBlOiAndGV4dCdcbiAgICAgIH0pO1xuXG4gICAgICBNZWRpYXRvci5wdWJsaXNoKCdzYXZlOmJlZm9yZScpO1xuXG4gICAgICBhY3Rpb24uZG9uZShmdW5jdGlvbiAoZGF0YSkge1xuXG4gICAgICAgIHByb21pc2UucmVzb2x2ZVdpdGgobnVsbCwgW2RhdGFdKTtcbiAgICAgICAgTWVkaWF0b3IucHVibGlzaCgnc2F2ZTpkb25lJyk7XG5cbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24gKCkge1xuXG4gICAgICAgIHByb21pc2UucmVqZWN0V2l0aChudWxsLCBbe1xuICAgICAgICAgIC8vIGVycm9yIG9iamVjdCBnb2VzIGhlcmVcbiAgICAgICAgfV0pO1xuXG4gICAgICAgIE1lZGlhdG9yLnB1Ymxpc2goJ3NhdmU6ZmFpbCcpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0KCkge1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBjdXJyZW50UGFyYWdyYXBoSW5kZXg6IDAsXG4gICAgICAgIGRvY3VtZW50czogW10sXG4gICAgICAgIHBhcmFncmFwaHM6IFtdLFxuICAgICAgICBjdXJyZW50RG9jdW1lbnQ6IHtcbiAgICAgICAgICBpZDogbnVsbCxcbiAgICAgICAgICBwYXJhZ3JhcGhDb3VudDogMCxcbiAgICAgICAgICBsb2FkZWRQYXJhZ3JhcGhzOiAwLFxuICAgICAgICAgIHNrZWxldG9uczogW11cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBhIHBhcmFncmFwaFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgICAgICovXG4gICAgICAgIGdldFBhcmFncmFwaDogZnVuY3Rpb24gKGlkLCBjYWxsYmFjaykge1xuICAgICAgICAgIGlmICghaWQpIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKHRydWUsIG51bGwpO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHBhcmFncmFwaFVuaXRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgbnVsbCk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAocGFyYWdyYXBoVW5pdHMubGVuZ3RoID09PSAxICYmIHBhcmFncmFwaFVuaXRzWzBdLmlkICE9PSBpZCkge1xuICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgbnVsbCk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB2YXIgaXRlbSA9IHNlYXJjaChwYXJhZ3JhcGhVbml0cywgZnVuY3Rpb24gKGl0ZW0pIHtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLmlkID09PSBpZDtcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vaWYgc2VhcmNoIHJldHVybiAtMVxuICAgICAgICAgIGlmICghfml0ZW0pIHtcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIG51bGwpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vcmV0dXJuIGZvdW5kIGl0ZW1cbiAgICAgICAgICBjYWxsYmFjayhudWxsLCBpdGVtKTtcbiAgICAgICAgfSxcblxuICAgICAgICBfZ2V0UGFyYWdyYXBoczogZnVuY3Rpb24gKGRvY3VtZW50SWQsIGNhbGxiYWNrLCBsaW1pdCwgb2Zmc2V0KSB7XG4gICAgICAgICAgLy9pZiB0aGVyZSBpcyBubyBsb2NhbCBkYXRhLCB0cnkgdG8gZ2V0IGRhdGEgZnJvbSB0aGUgc2VydmljZVxuICAgICAgICAgIGlmIChwYXJhZ3JhcGhVbml0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGdldERhdGEoJy9hcGkvcGFyYWdyYXBodW5pdHMnLCBjYWxsYmFjayk7XG5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvL2lmIGxpbWl0IG9mIG9mZnNldCBleGlzdHMgY3JlYXRlIHRoZSBxdWVyeSBzdHJpbmcgYW5kXG4gICAgICAgICAgLy9hc2sgdGhlIHNlcnZpY2UgZm9yIGRhdGFcbiAgICAgICAgICBpZiAoKHR5cGVvZiBsaW1pdCkgIT09ICd1bmRlZmluZWQnIHx8ICh0eXBlb2Ygb2Zmc2V0KSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIC8vY2hlY2sgaWYgbGltaXQgb3Igb2Zmc2V0IGFyZSBhIHZhbGlkIG51bWJlclxuICAgICAgICAgICAgaWYgKGlzTmFOKCtsaW1pdCkgfHwgaXNOYU4oK29mZnNldCkpIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2sodHJ1ZSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvL2NyZWF0ZSB0aGUgbGltaXQgYW5kIG9mZnNldCBxdWVyeSBzdHJpbmdzXG4gICAgICAgICAgICB2YXIgbCA9IChsaW1pdCkgPyAnP2xpbWl0PScgKyBsaW1pdCA6ICc/bGltaXQ9Mic7XG4gICAgICAgICAgICB2YXIgbyA9IChvZmZzZXQpID8gJyZvZmZzZXQ9JyArIG9mZnNldCA6ICcmb2Zmc2V0PTAnO1xuXG4gICAgICAgICAgICBnZXREYXRhKCcvYXBpL3BhcmFncmFwaHVuaXRzLycgKyBsICsgbywgY2FsbGJhY2spO1xuXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY2FsbGJhY2sobnVsbCwgcGFyYWdyYXBoVW5pdHMpO1xuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0cyBhbGwgcGFyYWdyYXBoIHVuaXRzIGZvciBhIHNwZWNpZmllZCBkb2N1bWVudFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gICAgZG9jdW1lbnRJZFxuICAgICAgICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSAgY2FsbGJhY2tcbiAgICAgICAgICogQHBhcmFtIHtOdW1iZXJ9ICAgIGxpbWl0XG4gICAgICAgICAqIEBwYXJhbSB7TnVtYmVyfSAgICBvZmZzZXRcbiAgICAgICAgICovXG4gICAgICAgIGdldFBhcmFncmFwaHM6IGZ1bmN0aW9uIChkb2N1bWVudElkLCBjYWxsYmFjaywgbGltaXQsIG9mZnNldCkge1xuICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICBtZS5jdXJyZW50RG9jdW1lbnQuaWQgPSBkb2N1bWVudElkO1xuXG4gICAgICAgICAgaWYgKCh0eXBlb2YgbGltaXQpICE9PSAndW5kZWZpbmVkJyB8fCAodHlwZW9mIG9mZnNldCkgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAvL3Nhbml0eSBjaGVja1xuICAgICAgICAgICAgaWYgKGlzTmFOKCtsaW1pdCkgfHwgaXNOYU4oK29mZnNldCkgfHwgbGltaXQgPT09IG51bGwgfHwgb2Zmc2V0ID09PSBudWxsKSB7XG4gICAgICAgICAgICAgIGNhbGxiYWNrKHRydWUpO1xuXG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZ2V0RGF0YSgnL2RvY3VtZW50LycgKyBkb2N1bWVudElkICsgJy9wYXJhZ3JhcGhzLycgKyBvZmZzZXQgKyAnLycgKyBsaW1pdCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgICBtZS5jdXJyZW50RG9jdW1lbnQubG9hZGVkUGFyYWdyYXBocyA9IG1lLmN1cnJlbnREb2N1bWVudC5sb2FkZWRQYXJhZ3JhcGhzICsgZGF0YS5sZW5ndGg7XG4gICAgICAgICAgICAgIG1lLnBhcmFncmFwaHMgPSBtZS5wYXJhZ3JhcGhzLmNvbmNhdChkYXRhKTtcblxuICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGdldERhdGEoJy9kb2N1bWVudC8nICsgZG9jdW1lbnRJZCArICcvcGFyYWdyYXBocy8nICsgZGVmYXVsdHMub2Zmc2V0ICsgJy8nICsgZGVmYXVsdHMubGltaXQsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIG1lLmN1cnJlbnREb2N1bWVudC5sb2FkZWRQYXJhZ3JhcGhzID0gbWUuY3VycmVudERvY3VtZW50LmxvYWRlZFBhcmFncmFwaHMgKyBkYXRhLmxlbmd0aDtcblxuICAgICAgICAgICAgbWUucGFyYWdyYXBocyA9IG1lLnBhcmFncmFwaHMuY29uY2F0KGRhdGEpO1xuXG4gICAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCBkYXRhKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgfSxcbiAgICAgICAgZ2V0TmV4dFBhcmFncmFwaDogZnVuY3Rpb24gKGNhbGxiYWNrKSB7XG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBnZXREYXRhKCcvYXBpL3BhcmFncmFwaHVuaXRzLz9hY3Rpb249bmV4dCcsIGNhbGxiYWNrKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGdldFByZXZQYXJhZ3JhcGg6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgZ2V0RGF0YSgnL2FwaS9wYXJhZ3JhcGh1bml0cy8/YWN0aW9uPXByZXYnLCBjYWxsYmFjayk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvKipcbiAgICAgICAgICogR2V0cyB0aGUgbmV4dCBzZXQgb2YgcGFyYWdyYXBoIHVuaXRzIGZyb20gdGhlIHN0b3JhZ2VcbiAgICAgICAgICpcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgICAgICovXG4gICAgICAgIGdldE5leHRQYXJhZ3JhcGhzOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcbiAgICAgICAgICB2YXIgbWUgPSB0aGlzLFxuICAgICAgICAgICAgICBkb2N1bWVudElkID0gbWUuY3VycmVudERvY3VtZW50LmlkO1xuXG4gICAgICAgICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgICAgICBnZXREYXRhKCcvZG9jdW1lbnQvJyArIGRvY3VtZW50SWQgKyAnL3BhcmFncmFwaHMvJyArIHRoaXMuY3VycmVudERvY3VtZW50LmxvYWRlZFBhcmFncmFwaHMgKyAnLycgKyBkZWZhdWx0cy5saW1pdCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgICBtZS5jdXJyZW50RG9jdW1lbnQubG9hZGVkUGFyYWdyYXBocyA9IG1lLmN1cnJlbnREb2N1bWVudC5sb2FkZWRQYXJhZ3JhcGhzICsgZGF0YS5sZW5ndGg7XG5cbiAgICAgICAgICAgICAgbWUucGFyYWdyYXBocyA9IG1lLnBhcmFncmFwaHMuY29uY2F0KGRhdGEpO1xuXG4gICAgICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLyoqXG4gICAgICAgICAqIEdldCBhIGxpc3Qgb2YgZG9jdW1lbnRzXG4gICAgICAgICAqXG4gICAgICAgICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gICAgICAgICAqL1xuICAgICAgICBnZXREb2N1bWVudHM6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuICAgICAgICAgIHZhciBtZSA9IHRoaXM7XG5cbiAgICAgICAgICBpZiAoY2FsbGJhY2spIHtcbiAgICAgICAgICAgIGdldERhdGEoJy9kb2N1bWVudHMnLCBmdW5jdGlvbiAoZXJyLCBkYXRhKSB7XG4gICAgICAgICAgICAgIC8vY2FjaGUgdGhlIGRvY3VtZW50c1xuICAgICAgICAgICAgICBtZS5kb2N1bWVudHMgPSBtZS5kb2N1bWVudHMuY29uY2F0KGRhdGEpO1xuXG4gICAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBHZXQgYSBkb2N1bWVudCBieSBpZFxuICAgICAgICAgKlxuICAgICAgICAgKiBAcGFyYW0ge1N0cmluZ30gaWRcbiAgICAgICAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2tcbiAgICAgICAgICovXG4gICAgICAgIGdldERvY3VtZW50OiBmdW5jdGlvbiAoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIG1lID0gdGhpcztcblxuICAgICAgICAgIGlmIChjYWxsYmFjaykge1xuICAgICAgICAgICAgZ2V0RGF0YSgnL2RvY3VtZW50LycgKyBpZCwgZnVuY3Rpb24gKGVyciwgZGF0YSkge1xuICAgICAgICAgICAgICAvL2NhY2hlIGRhdGEgcmVsYXRlZCB0byB0aGUgZG9jdW1lbnRcbiAgICAgICAgICAgICAgbWUuY3VycmVudERvY3VtZW50LmRhdGEgPSBkYXRhO1xuXG4gICAgICAgICAgICAgIC8vIGNvdW50IHRoZSBudW1iZXIgb2YgcGFyYWdyYXBoc1xuICAgICAgICAgICAgICB2YXIgbnJQYXJhZ3JhcGhzID0gMDtcbiAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBkYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICAgICAgLy9nZXQgdGhlIHJlZ3VsYXIgcGFyYWdyYXBoIHVuaXQgY291bnRcbiAgICAgICAgICAgICAgICBuclBhcmFncmFwaHMgKz0gZGF0YS5maWxlc1tpXS5wYXJhZ3JhcGhVbml0Q291bnQgLSBkYXRhLmZpbGVzW2ldLnN0cnVjdHVyZVBhcmFncmFwaFVuaXRDb3VudDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIG1lLmN1cnJlbnREb2N1bWVudC5wYXJhZ3JhcGhDb3VudCA9IG5yUGFyYWdyYXBocztcblxuICAgICAgICAgICAgICBjYWxsYmFjayhlcnIsIGRhdGEpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIHNhdmVPcGVyYXRpb246IGZ1bmN0aW9uIChvcGVyYXRpb25zKSB7IC8vIGFyZyAnY2FsbGJhY2snIG5ldmVyIHVzZWRcbiAgICAgICAgICByZXR1cm4gc2F2ZURhdGEoJy9vcGVyYXRpb24nLCB7XG4gICAgICAgICAgICAnYWN0aW9ucycgOiBvcGVyYXRpb25zXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgZ2V0U2tlbGV0b246IGZ1bmN0aW9uIChmaWxlSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgICAgdmFyIG1lID0gdGhpcztcbiAgICAgICAgICBpZiAoIWNhbGxiYWNrKSB7XG4gICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZ2V0RGF0YSgnL3NrZWxldG9uLycgKyBmaWxlSWQsIGZ1bmN0aW9uIChlcnIsIGRhdGEpIHtcbiAgICAgICAgICAgIG1lLmN1cnJlbnREb2N1bWVudC5za2VsZXRvbnMucHVzaChkYXRhKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKGVyciwgZGF0YSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0SW5zdGFuY2UoKSB7XG4gICAgICBpZiAoIWluc3RhbmNlKSB7XG4gICAgICAgIGluc3RhbmNlID0gaW5pdCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5zdGFuY2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGdldEluc3RhbmNlOiBnZXRJbnN0YW5jZSxcbiAgICAgIGc6IGdldEluc3RhbmNlXG4gICAgfTtcbiAgfSkoKVxufTsiLCIvKiBGaWxlOiBUbXBsLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgJCwgbW9kdWxlICovXHJcbid1c2Ugc3RyaWN0JztcclxudmFyIGggPSByZXF1aXJlICgnLi9IZWxwZXJzJykuc3RyaW5nVG9IVE1MRWxlbWVudDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIGZpbGVTdGF0dXM6ICc8c3BhbiBkYXRhLXR5cGU9XCJzdGF0dXMtbWVzc2FnZVwiPjwlPSBzdGF0dXMgJT48L3NwYW4+JyxcclxuXHJcbiAgc2VnbWVudDogJzxkaXYgY2xhc3M9XCJ1ZS1zZWdtZW50XCIvPicsXHJcbiAgY2VsbDogJzxkaXYgY2xhc3M9XCJ1ZS1jZWxsXCIvPicsXHJcbiAgc291cmNlU2VjdGlvbjogJzxzZWN0aW9uIGNsYXNzPVwiY29sLXhzLTYgd3JhcHBlci13ZXN0XCIvPicsXHJcbiAgdGFyZ2V0U2VjdGlvbjogJzxzZWN0aW9uIGNsYXNzPVwiY29sLXhzLTYgd3JhcHBlci1lYXN0XCIvPicsXHJcblxyXG4gIGd1dHRlckNvbHVtbjogJzxkaXYgY2xhc3M9XCJ1ZS1ndXR0ZXJcIi8+JyxcclxuICBzb3VyY2VDb2x1bW46ICc8ZGl2IGNsYXNzPVwidWUtc291cmNlXCIgc3BlbGxjaGVjaz1cImZhbHNlXCIvPicsXHJcbiAgc3RhdHVzQ29sdW1uOiAnPGRpdiBjbGFzcz1cInVlLXN0YXR1c1wiLz4nLFxyXG4gIHRhcmdldENvbHVtbjogJzxkaXYgY2xhc3M9XCJ1ZS10YXJnZXRcIiBzcGVsbGNoZWNrPVwidHJ1ZVwiLz4nLFxyXG5cclxuICBlZGl0YWJsZVRydWU6ICc8ZGl2IGNsYXNzPVwidWUtZWRpdGFibGVcIiBjb250ZW50ZWRpdGFibGU9XCJ0cnVlXCIvPicsXHJcbiAgZWRpdGFibGVGYWxzZTogJzxkaXYgY2xhc3M9XCJ1ZS1lZGl0YWJsZVwiIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIvPicsXHJcblxyXG4gIGZpbGVUYWdTdGFydDogJzxkaXYgY2xhc3M9XCJ1ZS1maWxlXCI+PHNwYW4gY2xhc3M9XCJ1ZS10YWcgdWUtdGFnLXN0YXJ0IHVlLXRhZy1maWxlXCI+PC9zcGFuPjwvZGl2PicsXHJcbiAgZmlsZVRhZ0VuZDogJzxkaXYgY2xhc3M9XCJ1ZS1maWxlXCI+PHNwYW4gY2xhc3M9XCJ1ZS10YWcgdWUtdGFnLWVuZCB1ZS10YWctZmlsZVwiPjwvc3Bhbj48L2Rpdj4nLFxyXG5cclxuICBmaWxlOiAnPGRpdiBjbGFzcz1cInVlLWVkaXRhYmxlXCIgY29udGVudGVkaXRhYmxlPVwidHJ1ZVwiLz4nLFxyXG5cclxuICB0YWdQYWlyU3RhcnQ6ICc8c3BhbiBjbGFzcz1cInVlLXRhZyB1ZS10YWctc3RhcnRcIiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiLz4nLFxyXG4gIHRhZ1BhaXJFbmQ6ICc8c3BhbiBjbGFzcz1cInVlLXRhZyB1ZS10YWctZW5kXCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIi8+JyxcclxuXHJcbiAgcGxhY2Vob2xkZXJUYWc6ICc8c3BhbiBjbGFzcz1cInVlLXRhZ1wiIGNvbnRlbnRlZGl0YWJsZT1cImZhbHNlXCIvPicsXHJcbiAgdGV4dDogJzxzcGFuIGNsYXNzPVwidWUtdGV4dFwiLz4nLFxyXG5cclxuICB0YWdMb2NrZWRTdGFydDogJzxzcGFuIGNsYXNzPVwidWUtdGFnIHVlLXRhZy1sb2NrZWQtc3RhcnRcIiBjb250ZW50ZWRpdGFibGU9XCJmYWxzZVwiLz4nLFxyXG4gIHRhZ0xvY2tlZEVuZDogJzxzcGFuIGNsYXNzPVwidWUtdGFnIHVlLXRhZy1sb2NrZWQtZW5kXCIgY29udGVudGVkaXRhYmxlPVwiZmFsc2VcIi8+JyxcclxuXHJcbiAgaW5saW5lQ29udGVudFdyYXBwZXI6ICc8ZGl2IGNsYXNzPVwidWUtaW5saW5lLWNvbnRlbnRcIj48L2Rpdj4nLFxyXG4gIGxvY2tlZENvbnRlbnRXcmFwcGVyOiAnPGRpdiBjbGFzcz1cInVlLWxvY2tlZC1jb250ZW50XCI+PC9kaXY+JyxcclxuXHJcbiAgdGFnV3JhcHBlcjogJzxzcGFuIGNsYXNzPVwidWUtdGFnLXdyYXBwZXJcIi8+JyxcclxuXHJcbiAgLy8gU3RhdHVzIGljb25zXHJcbiAgc3RhdHVzSWNvblNlZ21lbnRMb2NrZWQ6ICc8aSBjbGFzcz1cInN0YXR1cy1pY29uLXNlZ21lbnQtc3RhdGUtbG9rZWRcIi8+JyxcclxuXHJcbiAgLy8gQWN0aXZpdHkgaW5kaWNhdG9yXHJcbiAgLy8gVGhlIG1lc3NhZ2UgY2FuIGJlIGNoYW5nZWQgYnkgb3ZlcnJpZGluZ1xyXG4gIC8vIGRhdGEtYWN0aXZpdHktbWVzc2FnZSBhdHRyaWJ1dGVcclxuICBhY3Rpdml0eUluZGljYXRvcjpcclxuICAgICc8ZGl2IGNsYXNzPVwidWUtYWN0aXZpdHktaW5kaWNhdG9yLXdyYXBwZXJcIj4nICtcclxuICAgICAgJzxkaXYgY2xhc3M9XCJ1ZS1hY3Rpdml0eS1pbmRpY2F0b3JcIiBkYXRhLWFjdGl2aXR5LW1lc3NhZ2U9XCJMb2FkaW5nIC4uLlwiPicgK1xyXG4gICAgICAgICc8ZGl2IGNsYXNzPVwic3Bpbm5lclwiPjwvZGl2PicgK1xyXG4gICAgICAnPC9kaXY+JyArXHJcbiAgICAnPC9kaXY+JyxcclxuXHJcbiAgLy8gemVyb1dpZHRoTm9uSm9pbmVyIC0gaW52aXNpYmxlIGNoYXJhY3RlclxyXG4gIHp3bmo6ICcmenduajsnLFxyXG4gIHplcm9XaWR0aE5vbkpvaW5lckNoYXJDb2RlOiA4MjA0LFxyXG5cclxuXHJcbiAga2V5VGFiOiB7XHJcbiAgICBjaGFyQ29kZTogOSxcclxuICAgIHVuaWNvZGU6ICdcXHUwMDA5JyxcclxuICAgIGVudGl0eTogJyYjMDk7J1xyXG4gIH0sXHJcblxyXG4gIHN0YXR1c0NvbHVtbldyYXBwZXI6IGZ1bmN0aW9uIChvcmRlcikge1xyXG4gICAgcmV0dXJuICc8ZGl2IGNsYXNzPVwiY29sLScgKyBvcmRlciArICdcIi8+JztcclxuICB9LFxyXG5cclxuICB0YXJnZXRTZWdtZW50QnVpbGRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgICB0YXJnZXRTZWdtZW50O1xyXG5cclxuICAgIHRhcmdldFNlZ21lbnQgPSAkKG1lLnNlZ21lbnQpOy8vLmFwcGVuZChtZS56d25qKTtcclxuXHJcbiAgICByZXR1cm4gdGFyZ2V0U2VnbWVudDtcclxuICB9LFxyXG5cclxuICB0YWdQYWlyU3RhcnRCdWlsZGVyOiBmdW5jdGlvbiAoZGlzcGxheVRleHQpIHtcclxuICAgIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgICAgc3RhcnRUYWcsXHJcbiAgICAgICAgd3JhcHBlcjtcclxuXHJcbiAgICBzdGFydFRhZyA9ICQobWUudGFnUGFpclN0YXJ0KTtcclxuICAgIHN0YXJ0VGFnLmh0bWwoZGlzcGxheVRleHQpO1xyXG5cclxuICAgIHdyYXBwZXIgPSAkKG1lLnRhZ1dyYXBwZXIpLmFwcGVuZChzdGFydFRhZykuYXBwZW5kKG1lLnp3bmopO1xyXG4gICAgd3JhcHBlclswXS5kYXRhc2V0LnR5cGUgPSAnc3RhcnQtdGFnJztcclxuXHJcbiAgICByZXR1cm4gd3JhcHBlcjtcclxuICB9LFxyXG5cclxuICB0YWdQYWlyRW5kQnVpbGRlcjogZnVuY3Rpb24gKGRpc3BsYXlUZXh0KSB7XHJcbiAgICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICAgIGVuZFRhZyxcclxuICAgICAgICB3cmFwcGVyO1xyXG5cclxuICAgIGVuZFRhZyA9ICQobWUudGFnUGFpckVuZCk7XHJcbiAgICBlbmRUYWcuaHRtbChkaXNwbGF5VGV4dCk7XHJcblxyXG4gICAgd3JhcHBlciA9ICQobWUudGFnV3JhcHBlcikuYXBwZW5kKGVuZFRhZykuYXBwZW5kKG1lLnp3bmopO1xyXG4gICAgd3JhcHBlclswXS5kYXRhc2V0LnR5cGUgPSAnZW5kLXRhZyc7XHJcblxyXG4gICAgcmV0dXJuIHdyYXBwZXI7XHJcbiAgfSxcclxuXHJcbiAgcGxhY2Vob2xkZXJUYWdCdWlsZGVyOiBmdW5jdGlvbiAoZGlzcGxheVRleHQpIHtcclxuICAgIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgICAgcGxhY2Vob2xkZXIsXHJcbiAgICAgICAgd3JhcHBlcjtcclxuXHJcbiAgICBwbGFjZWhvbGRlciA9ICQobWUucGxhY2Vob2xkZXJUYWcpO1xyXG4gICAgcGxhY2Vob2xkZXIuaHRtbChkaXNwbGF5VGV4dCk7XHJcblxyXG4gICAgd3JhcHBlciA9ICQobWUudGFnV3JhcHBlcikuYXBwZW5kKHBsYWNlaG9sZGVyKS5hcHBlbmQobWUuenduaik7XHJcbiAgICB3cmFwcGVyWzBdLmRhdGFzZXQudHlwZSA9ICdwbGFjZWhvbGRlcic7XHJcblxyXG4gICAgcmV0dXJuIHdyYXBwZXI7XHJcbiAgfSxcclxuXHJcbiAgbG9ja2VkQ29udGVudFN0YXJ0VGFnQnVpbGRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgICBzdGFydFRhZyxcclxuICAgICAgICB3cmFwcGVyO1xyXG5cclxuICAgIHN0YXJ0VGFnID0gJChtZS50YWdMb2NrZWRTdGFydCk7XHJcbiAgICBzdGFydFRhZy5odG1sKG1lLnp3bmopO1xyXG5cclxuICAgIHdyYXBwZXIgPSAkKG1lLnRhZ1dyYXBwZXIpLmFwcGVuZChzdGFydFRhZykuYXBwZW5kKG1lLnp3bmopO1xyXG4gICAgd3JhcHBlclswXS5kYXRhc2V0LnR5cGUgPSAnc3RhcnQtdGFnJztcclxuXHJcbiAgICByZXR1cm4gd3JhcHBlcjtcclxuICB9LFxyXG5cclxuICBsb2NrZWRDb250ZW50RW5kVGFnQnVpbGRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgICBlbmRUYWcsXHJcbiAgICAgICAgd3JhcHBlcjtcclxuXHJcbiAgICBlbmRUYWcgPSAkKG1lLnRhZ0xvY2tlZEVuZCk7XHJcbiAgICBlbmRUYWcuaHRtbChtZS56d25qKTtcclxuXHJcbiAgICB3cmFwcGVyID0gJChtZS50YWdXcmFwcGVyKS5hcHBlbmQoZW5kVGFnKS5hcHBlbmQobWUuenduaik7XHJcbiAgICB3cmFwcGVyWzBdLmRhdGFzZXQudHlwZSA9ICdlbmQtdGFnJztcclxuXHJcbiAgICByZXR1cm4gd3JhcHBlcjtcclxuICB9LFxyXG5cclxuICBidWlsZFNlZ21lbnRJbmxpbmVDb250ZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICAgIGlubGluZUNvbnRlbnQgPSBoKG1lLmlubGluZUNvbnRlbnRXcmFwcGVyKTtcclxuXHJcbiAgICBpbmxpbmVDb250ZW50LmFwcGVuZENoaWxkKGgobWUuenduaikpO1xyXG5cclxuICAgIHJldHVybiBpbmxpbmVDb250ZW50O1xyXG4gIH1cclxufTsiLCIvKiBGaWxlOiBUcmFuc2xhdGlvbk9yaWdpbi5qcyAqL1xuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cbi8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBIZWxwZXJzID0gcmVxdWlyZSgnLi9IZWxwZXJzJyk7XG5cbnZhciBUcmFuc2xhdGlvbk9yaWdpbiA9IChmdW5jdGlvbiAoKSB7XG4gIHZhciBfX2V4dGVuZCA9IEhlbHBlcnMuX2V4dGVuZDtcblxuICB2YXIgdHJhbnNsYXRpb25PcmlnaW4gPSB7XG4gICAgbWV0YWRhdGEgOiAgICAgICAgICAgICAgICBudWxsLCAvLyBhcnJheSBvZiBPYmplY3RzID0ge25hbWUgOiBTdHJpbmcsIHZhbHVlIDogU3RyaW5nfVxuICAgIG9yaWdpblR5cGUgOiAgICAgICAgICAgICAgbnVsbCwgLy8gU3RyaW5nXG4gICAgb3JpZ2luU3lzdGVtOiAgICAgICAgICAgICBudWxsLFxuICAgIG1hdGNoUGVyY2VudDogICAgICAgICAgICAgMCwgICAgLy8gSW50XG4gICAgdGV4dENvbnRleHRNYXRjaExldmVsOiAgICBudWxsLFxuICAgIG9yaWdpbmFsVHJhbnNsYXRpb25IYXNoOiAgbnVsbCxcbiAgICBvcmlnaW5CZWZvcmVBZGFwdGF0aW9uOiAgIG51bGwsIC8vIHtvYmplY3QgLSB0cmFuc2xhdGlvbk9yaWdpbiB0eXBlIG9mIG9iamVjdH1cbiAgICBpc1N0cnVjdHVyZUNvbnRleHRNYXRjaDogIGZhbHNlIC8vIGJvb2xlYW5cbiAgfTtcblxuICAvLyBOb3QgdXNlZD9cbiAgLy8gdmFyIGZvcm1hdE9yaWdpblR5cGUgPSB7XG4gIC8vICAgJ2FsJzogICdhdXRvLWFsaWduZWQnLFxuICAvLyAgICdhcCc6ICAnYXV0by1wcm9wYWdhdGVkJyxcbiAgLy8gICAnYXQnOiAgJ210JyxcbiAgLy8gICAnbnQnOiAgJ25vdC10cmFuc2xhdGVkJyxcbiAgLy8gICAnc3JjJzogJ3NvdXJjZScsXG4gIC8vICAgJ3VuJzogICd1bmtub3duJ1xuICAvLyB9O1xuXG4gIHZhciBjb25maXJtYXRpb25MZXZlbFRleHQgPSB7XG4gICAgJ25vdC10cmFuc2xhdGVkJzogICAgICAgJ05vdCBUcmFuc2xhdGVkJyxcbiAgICAnTm90VHJhbnNsYXRlZCc6ICAgICAgICAnTm90IFRyYW5zbGF0ZWQnLFxuICAgICdhcHByb3ZlZC1zaWduLW9mZic6ICAgICdTaWduIE9mZicsXG4gICAgJ0FwcHJvdmVkU2lnbk9mZic6ICAgICAgJ1NpZ24gT2ZmJyxcbiAgICAnYXBwcm92ZWQtdHJhbnNsYXRpb24nOiAnVHJhbnNsYXRpb24gQXBwcm92ZWQnLFxuICAgICdBcHByb3ZlZFRyYW5zbGF0aW9uJzogICdUcmFuc2xhdGlvbiBBcHByb3ZlZCcsXG4gICAgJ2RyYWZ0JzogICAgICAgICAgICAgICAgJ0RyYWZ0JyxcbiAgICAnRHJhZnQnOiAgICAgICAgICAgICAgICAnRHJhZnQnLFxuICAgICdyZWplY3RlZC1zaWduLW9mZic6ICAgICdTaWduIE9mZiBSZWplY3RlZCcsXG4gICAgJ1JlamVjdGVkU2lnbk9mZic6ICAgICAgJ1NpZ24gT2ZmIFJlamVjdGVkJyxcbiAgICAncmVqZWN0ZWQtdHJhbnNsYXRpb24nOiAnVHJhbnNsYXRpb24gUmVqZWN0ZWQnLFxuICAgICdSZWplY3RlZFRyYW5zbGF0aW9uJzogICdUcmFuc2xhdGlvbiBSZWplY3RlZCcsXG4gICAgJ3RyYW5zbGF0ZWQnOiAgICAgICAgICAgJ1RyYW5zbGF0ZWQnLFxuICAgICdUcmFuc2xhdGVkJzogICAgICAgICAgICdUcmFuc2xhdGVkJ1xuICB9O1xuXG4gIHZhciBvcmlnaW5UZXh0ID0ge1xuICAgICdhbCc6ICAnQXV0by1hbGlnbmVkJyxcbiAgICAnYXAnOiAgJ0F1dG8tcHJvcGFnYXRlZCcsXG4gICAgJ2F0JzogICdBdXRvbWF0ZWQgVHJhbnNsYXRpb24nLFxuICAgICdjbSc6ICAnQ29udGV4dCBNYXRjaCcsXG4gICAgJ2VtJzogICdFeGFjdCBNYXRjaCcsXG4gICAgJ2ZtJzogICdGdXp6eSBNYXRjaCcsXG4gICAgJ2l0JzogICdJbnRlcmFjdGl2ZScsXG4gICAgJ250JzogICdOb3QgVHJhbnNsYXRlZCcsXG4gICAgJ3BtJzogICdQZXJmZWN0IE1hdGNoJyxcbiAgICAnc3JjJzogJ0NvcGllZCBGcm9tIFNvdXJjZScsXG4gICAgJ3RtJzogICdUcmFuc2xhdGlvbiBNZW1vcnknLFxuICAgICd1bic6ICAnVW5rbm93bidcbiAgfTtcblxuICBmdW5jdGlvbiB0cmFuc2xhdGlvbkRldGFpbHMoc2VnbWVudERhdGEpIHtcbiAgICB2YXIgaW5mbyA9ICdUcmFuc2xhdGlvbiBEZXRhaWxzOiAnICsgJ1xcclxcbicsXG4gICAgICAgIHN0YXR1cyA9IGNvbmZpcm1hdGlvbkxldmVsVGV4dFtzZWdtZW50RGF0YS5jb25maXJtYXRpb25sZXZlbF0gfHwgJ05vdCBUcmFuc2xhdGVkJyxcbiAgICAgICAgdHlwZSA9IFRyYW5zbGF0aW9uT3JpZ2luLm9yaWdpblR5cGUoc2VnbWVudERhdGEudHJhbnNsYXRpb25vcmlnaW4pO1xuXG4gICAgLy9hZGQgY29uZmlybWF0aW9uIGxldmVsIGluZm9cbiAgICBpbmZvICs9ICdTdGF0dXM6ICcgKyBzdGF0dXMgKyAnXFxyXFxuJztcblxuICAgIC8vYWRkIG9yaWdpbiBpbmZvXG4gICAgaW5mbyArPSAnT3JpZ2luOiAnICsgb3JpZ2luVGV4dFt0eXBlXSArICdcXHJcXG4nO1xuXG4gICAgLy9hZGQgb3JpZ2luIHN5c3RlbVxuICAgIGlmICh0eXBlICE9PSAnaXQnKSB7XG4gICAgICBpbmZvICs9ICdTeXN0ZW06ICcgKyBzZWdtZW50RGF0YS50cmFuc2xhdGlvbm9yaWdpbi5vcmlnaW5TeXN0ZW0gKyAnXFxyXFxuJztcbiAgICB9XG5cbiAgICAvL2FkZCBwZXJjZW50IGluZm9cbiAgICBpbmZvICs9ICdTY29yZTogJyArIHNlZ21lbnREYXRhLnRyYW5zbGF0aW9ub3JpZ2luLm1hdGNoUGVyY2VudCArICclJyArICdcXHJcXG4nO1xuXG4gICAgcmV0dXJuIGluZm87XG4gIH1cblxuICBmdW5jdGlvbiBiZWZvcmVJbnRlcmFjdGl2ZUVkaXRpbmcodE9iaikge1xuICAgIHZhciB0TyA9IHRPYmoub3JpZ2luQmVmb3JlQWRhcHRhdGlvbixcbiAgICAgICAgaW5mbywgdHlwZTtcblxuICAgIGlmICghaXNEaWZmZXJlbnQodE9iaiwgdE8pKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuXG4gICAgaW5mbyA9ICdCZWZvcmUgSW50ZXJhY3RpdmUgRWRpdGluZzogJyArICdcXHJcXG4nO1xuICAgIHR5cGUgPSBUcmFuc2xhdGlvbk9yaWdpbi5vcmlnaW5UeXBlKHRPKTtcblxuICAgIC8vYWRkIG9yaWdpbiBpbmZvXG4gICAgaW5mbyArPSAnT3JpZ2luOiAnICsgb3JpZ2luVGV4dFt0eXBlXSArICdcXHJcXG4nO1xuXG4gICAgLy9hZGQgb3JpZ2luIHN5c3RlbVxuICAgIGlmICh0Ty5vcmlnaW5TeXN0ZW0pIHtcbiAgICAgIGluZm8gKz0gJ1N5c3RlbTogJyArIHRPLm9yaWdpblN5c3RlbSArICdcXHJcXG4nO1xuICAgIH1cblxuICAgIC8vYWRkIHBlcmNlbnQgaW5mb1xuICAgIGluZm8gKz0gJ1Njb3JlOiAnICsgdE8ubWF0Y2hQZXJjZW50ICsgJyUnICsgJ1xcclxcbic7XG5cbiAgICByZXR1cm4gaW5mbztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzRGlmZmVyZW50KHRPLCBvcmlnaW5hbFRPKSB7XG4gICAgaWYgKCF0Ty5vcmlnaW5UeXBlIHx8ICFvcmlnaW5hbFRPIHx8ICFvcmlnaW5hbFRPLm9yaWdpblR5cGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAodE8ub3JpZ2luVHlwZSAhPT0gb3JpZ2luYWxUTy5vcmlnaW5UeXBlKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBpZiAodE8ubWF0Y2hQZXJjZW50ICE9PSBvcmlnaW5hbFRPLm1hdGNoUGVyY2VudCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgLy8gVE8gRE8gLSBub3QgZmluaXNoZWRcbiAgICAvL3RleHRDb250ZXh0TWF0Y2hMZXZlbCBjb25wYXJlXG5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGNyZWF0ZTogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uT3JpZ2luO1xuICAgIH0sXG5cbiAgICBvcmlnaW5hbEZvcm1hdDogZnVuY3Rpb24gKHRyT3JpZ2luKSB7XG4gICAgICB2YXIgY2xvbmVUck9yaWdpbiA9IF9fZXh0ZW5kKHt9LCB0ck9yaWdpbik7XG4gICAgICBkZWxldGUgY2xvbmVUck9yaWdpbi53YXNDaGFuZ2VkO1xuXG4gICAgICByZXR1cm4gY2xvbmVUck9yaWdpbjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xvbmUgfCBEdXBsaWNhdGUgdHJhbnNsYXRpb24gT3JpZ2luIE9iamVjdFxuICAgICAqL1xuICAgIGNsb25lOiBmdW5jdGlvbiAodHJPcmlnaW4pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1ldGFkYXRhIDogICAgICAgICAgICAgICB0ck9yaWdpbi5tZXRhZGF0YSxcbiAgICAgICAgb3JpZ2luVHlwZTogICAgICAgICAgICAgIHRyT3JpZ2luLm9yaWdpblR5cGUsXG4gICAgICAgIG9yaWdpblN5c3RlbTogICAgICAgICAgICB0ck9yaWdpbi5vcmlnaW5TeXN0ZW0sXG4gICAgICAgIG1hdGNoUGVyY2VudDogICAgICAgICAgICB0ck9yaWdpbi5tYXRjaFBlcmNlbnQsXG4gICAgICAgIHRleHRDb250ZXh0TWF0Y2hMZXZlbDogICB0ck9yaWdpbi50ZXh0Q29udGV4dE1hdGNoTGV2ZWwsXG4gICAgICAgIG9yaWdpbmFsVHJhbnNsYXRpb25IYXNoOiB0ck9yaWdpbi5vcmlnaW5hbFRyYW5zbGF0aW9uSGFzaCxcbiAgICAgICAgb3JpZ2luQmVmb3JlQWRhcHRhdGlvbjogIHRyT3JpZ2luLm9yaWdpbkJlZm9yZUFkYXB0YXRpb24sXG4gICAgICAgIGlzU3RydWN0dXJlQ29udGV4dE1hdGNoOiB0ck9yaWdpbi5pc1N0cnVjdHVyZUNvbnRleHRNYXRjaCxcbiAgICAgIH07XG4gICAgfSxcblxuICAgIHRyYW5zbGF0aW9uSW5mbzogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgIC8vdHJhbnNsYXRpb24gZGV0YWlsc1xuICAgICAgdmFyIGRldGFpbHMgPSB0cmFuc2xhdGlvbkRldGFpbHMoZGF0YSksXG4gICAgICAgICAgbW9yZURldGFpbHM7XG5cbiAgICAgIC8vYmVmb3JlIGludGVyYWN0aXZlIGVkaXRpbmcgZGV0YWlsc1xuICAgICAgaWYgKGRhdGEudHJhbnNsYXRpb25vcmlnaW4ub3JpZ2luQmVmb3JlQWRhcHRhdGlvbiAhPT0gbnVsbCkge1xuICAgICAgICBtb3JlRGV0YWlscyA9IGJlZm9yZUludGVyYWN0aXZlRWRpdGluZyhkYXRhLnRyYW5zbGF0aW9ub3JpZ2luLCBkYXRhLmNvbmZpcm1hdGlvbmxldmVsKTtcbiAgICAgICAgZGV0YWlscyArPSAobW9yZURldGFpbHMgIT09ICcnKSA/ICdcXHJcXG4nICsgbW9yZURldGFpbHMgOiAnJztcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGRldGFpbHM7XG4gICAgfSxcblxuICAgIG9yaWdpblR5cGUgOiBmdW5jdGlvbiAodHJhbnNsYXRpb25PYmopIHtcbiAgICAgIHZhciBzaG9ydE9yaWdpblR5cGUgPSAnaXQnO1xuXG4gICAgICBpZiAodHJhbnNsYXRpb25PYmogPT09IHVuZGVmaW5lZCB8fCB0cmFuc2xhdGlvbk9iaiA9PT0gW10gfHwgdHJhbnNsYXRpb25PYmogPT09IHt9KSB7XG4gICAgICAgIHJldHVybiBzaG9ydE9yaWdpblR5cGU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0cmFuc2xhdGlvbk9iai5vcmlnaW5UeXBlID09PSB1bmRlZmluZWQgfHwgdHJhbnNsYXRpb25PYmoub3JpZ2luVHlwZSA9PT0gbnVsbCB8fCB0cmFuc2xhdGlvbk9iai5vcmlnaW5UeXBlID09PSAnaW50ZXJhY3RpdmUnKSB7XG4gICAgICAgIHJldHVybiBzaG9ydE9yaWdpblR5cGU7XG4gICAgICB9XG5cbiAgICAgIC8vISEhISEgRG8gbm90IGNoYW5nZSBpZiBvcmRlciAhISEhIVxuICAgICAgaWYgKHRyYW5zbGF0aW9uT2JqLm1hdGNoUGVyY2VudCAhPT0gbnVsbCAmJiB0cmFuc2xhdGlvbk9iai5tYXRjaFBlcmNlbnQgPT09IDEwMCkgeyAgICAgIC8vRXhhY3QgTWF0Y2ggY2FzZVxuICAgICAgICBzaG9ydE9yaWdpblR5cGUgPSAnZW0nO1xuICAgICAgfSBlbHNlIGlmICh0cmFuc2xhdGlvbk9iai5tYXRjaFBlcmNlbnQgIT09IG51bGwgJiYgdHJhbnNsYXRpb25PYmoubWF0Y2hQZXJjZW50IDwgMTAwKSB7IC8vRnV6enkgTWF0Y2ggY2FzZVxuICAgICAgICBzaG9ydE9yaWdpblR5cGUgPSAnZm0nO1xuICAgICAgfVxuXG4gICAgICBzd2l0Y2ggKHRyYW5zbGF0aW9uT2JqLm9yaWdpblR5cGUpIHtcbiAgICAgICAgY2FzZSAndG0nOiAvL1RyYW5zbGF0aW9uIE1lbW9yeSBjYXNlXG4gICAgICAgICAgc2hvcnRPcmlnaW5UeXBlID0gJ3RtJztcblxuICAgICAgICAgIGlmICh0cmFuc2xhdGlvbk9iai50ZXh0Q29udGV4dE1hdGNoTGV2ZWwgIT09IG51bGwgJiYgdHJhbnNsYXRpb25PYmoudGV4dENvbnRleHRNYXRjaExldmVsLnRvTG93ZXJDYXNlKCkgPT09ICdzb3VyY2VhbmR0YXJnZXQnKSB7XG4gICAgICAgICAgICBzaG9ydE9yaWdpblR5cGUgPSAnY20nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdkb2N1bWVudC1tYXRjaCc6IC8vUGVyZmVjdCBNYXRjaCBjYXNlXG4gICAgICAgICAgaWYgKHRyYW5zbGF0aW9uT2JqLnRleHRDb250ZXh0TWF0Y2hMZXZlbCAhPT0gbnVsbCAmJiB0cmFuc2xhdGlvbk9iai50ZXh0Q29udGV4dE1hdGNoTGV2ZWwudG9Mb3dlckNhc2UoKSA9PT0gJ3NvdXJjZScpIHtcbiAgICAgICAgICAgIHNob3J0T3JpZ2luVHlwZSA9ICdwbSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ210JzogLy9BdXRvbWF0ZWQgVHJhbnNsYXRpb24gY2FzZVxuICAgICAgICAgIHNob3J0T3JpZ2luVHlwZSA9ICdhdCc7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAnc291cmNlJzogLy9Tb3VyY2UgY2FzZVxuICAgICAgICAgIHNob3J0T3JpZ2luVHlwZSA9ICdzcmMnO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2F1dG8tcHJvcGFnYXRlZCc6IC8vU291cmNlIGNhc2VcbiAgICAgICAgICBzaG9ydE9yaWdpblR5cGUgPSAnYXAnO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ25vdC10cmFuc2xhdGVkJzogLy9Ob3QgVHJhbnNsYXRlZCBjYXNlICEhISEhIE5PVCBUUkVBVEVEXG4gICAgICAgICAgc2hvcnRPcmlnaW5UeXBlID0gJ250JztcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICdhdXRvLWFsaWduZWQnOiAvL0F1dG8tYWxpZ25lZCBjYXNlICEhISEhIE5PVCBUUkVBVEVEXG4gICAgICAgICAgc2hvcnRPcmlnaW5UeXBlID0gJ2FsJztcbiAgICAgICAgICBicmVhaztcblxuICAgICAgICBjYXNlICd1bmtub3duJzogLy9Vbmtub3duIGNhc2UgISEhISEgTk9UIFRSRUFURURcbiAgICAgICAgICBzaG9ydE9yaWdpblR5cGUgPSAndW4nO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2hvcnRPcmlnaW5UeXBlO1xuICAgIH1cbiAgfTtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNsYXRpb25PcmlnaW47IiwiLyogRmlsZTogdWUuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyAkLCByZXF1aXJlLCBtb2R1bGUgKi9cclxuXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBjb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpO1xyXG52YXIgRGF0YVByb3ZpZGVyID0gcmVxdWlyZSgnLi9EYXRhUHJvdmlkZXInKTtcclxudmFyIERvY3VtZW50cyA9IHJlcXVpcmUoJy4vRG9jdW1lbnRzJyk7XHJcbnZhciBMYXlvdXQgPSByZXF1aXJlKCcuL0xheW91dCcpO1xyXG52YXIgQ29tbWFuZE1hbmFnZXIgPSByZXF1aXJlKCcuL0NvbW1hbmRNYW5hZ2VyJyk7XHJcbnZhciBTZWdtZW50U3RhdHVzVXBkYXRlciA9IHJlcXVpcmUoJy4vU2VnbWVudFN0YXR1c1VwZGF0ZXInKTtcclxuXHJcblxyXG52YXIgQXBwID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcclxuXHJcbi8vIFJlbmRlcmluZyBtb2R1bGVcclxudmFyIFZpZXdSZW5kZXJlciA9IChmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIHtcclxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgdGhpcy4kYm9keSA9ICQoJ2JvZHknKTtcclxuXHJcbiAgICAgIExheW91dC5pbml0KCk7XHJcbiAgICAgIERvY3VtZW50cy5pbml0KCk7XHJcbiAgICB9XHJcbiAgfTtcclxufSkoKTtcclxuXHJcbi8vIERlZmF1bHQgY29uZmlnXHJcbkFwcC5jb25maWcgPSBjb25maWc7XHJcblxyXG4vLyBEZWZhdWx0IGVudmlyb25tZW50XHJcbkFwcC5jb25maWcuZW52aXJvbm1lbnQgPSAnZGV2ZWxvcG1lbnQnO1xyXG5cclxuLy8gQXBwIGluaXRpYWxpemF0aW9uXHJcbkFwcC5pbml0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuXHJcbiAgLy8gTWVyZ2UgY29uZmlnIGlmIHRoZSBjYXNlXHJcbiAgaWYgKG9wdGlvbnMuY29uZmlnICYmICh0eXBlb2Ygb3B0aW9ucy5jb25maWcgPT09ICdvYmplY3QnKSkge1xyXG4gICAgZm9yICh2YXIga2V5IGluIG9wdGlvbnMuY29uZmlnKSB7XHJcbiAgICAgIGlmIChvcHRpb25zLmNvbmZpZy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgQXBwLmNvbmZpZ1trZXldID0gb3B0aW9ucy5jb25maWdba2V5XTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgRGF0YVByb3ZpZGVyLmluaXQoKTtcclxuICBWaWV3UmVuZGVyZXIuaW5pdCgpO1xyXG4gIERvY3VtZW50cy5vcGVuRG9jdW1lbnQob3B0aW9ucy5kb2MpO1xyXG59O1xyXG5cclxuLy8gRXhwb3NlIGNvbW1hbmQgbWFubmFnZXIgYXMgYW4gZXh0ZXJuYWwgQVBJXHJcbkFwcC5Db21tYW5kTWFuYWdlciA9IENvbW1hbmRNYW5hZ2VyOyIsIi8qIEZpbGU6IEVkaXRvckNvbW1hbmRzLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgcmVxdWlyZSwgbW9kdWxlICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XHJcblxyXG52YXIgY21kcyA9IHtcclxuICAncGFzdGUnOiB7XHJcbiAgICBoYW5kbGU6IGZ1bmN0aW9uIChldikge1xyXG4gICAgICB2YXIgdGV4dCxcclxuICAgICAgICAgIHJJbnZhbGlkQ2hhcnMgPSAvXFxyP1xcbi9nLFxyXG4gICAgICAgICAgaHRtbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKSxcclxuICAgICAgICAgIGNsaXBib2FyZCA9IChldi5vcmlnaW5hbEV2ZW50IHx8IGV2KS5jbGlwYm9hcmREYXRhO1xyXG5cclxuICAgICAgZXYucHJldmVudERlZmF1bHQoKTtcclxuXHJcbiAgICAgIGlmIChjbGlwYm9hcmQgPT09IHVuZGVmaW5lZCB8fCBjbGlwYm9hcmQgPT09IG51bGwpIHtcclxuICAgICAgICB0ZXh0ID0gd2luZG93LmNsaXBib2FyZERhdGEuZ2V0RGF0YSgndGV4dCcpIHx8ICcnO1xyXG5cclxuICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcclxuICAgICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UockludmFsaWRDaGFycywgJyAnKTtcclxuICAgICAgICAgIHdpbmRvdy5nZXRTZWxlY3Rpb24oKS5nZXRSYW5nZUF0KDApLmluc2VydE5vZGUoaHRtbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0ZXh0ID0gY2xpcGJvYXJkLmdldERhdGEoJ3RleHQvcGxhaW4nKSB8fCAnJztcclxuXHJcbiAgICAgICAgaWYgKHRleHQgIT09ICcnKSB7XHJcbiAgICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKHJJbnZhbGlkQ2hhcnMsICcgJyk7XHJcbiAgICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnaW5zZXJ0VGV4dCcsIGZhbHNlLCB0ZXh0KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGNtZHM7IiwiLyogRmlsZTogY29uZmlnLmpzICovXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xuLyogZ2xvYmFscyBtb2R1bGUgKi9cbid1c2Ugc3RyaWN0JztcblxudmFyIGNvbmZpZyA9IHtcbiAgZnVsbE1vZGU6IHRydWUsXG5cbiAgLy9zZXQgdGhlIHN0b3JhZ2UgaW1wbGVtZW50YXRpb24gbW9kdWxlXG4gIHN0b3JhZ2U6ICdTdG9yYWdlSW1wbGVtZW50YXRpb24nLFxuXG4gIC8vc2V0IGRpc3BsYXkgbGltaXQgb2YgcGFyYWdyYXBoIHVuaXRzXG4gIC8vZGVmYXVsdExpbWl0OiA1MCxcbiAgZGVmYXVsdExpbWl0OiAxMDAwLCAvL3RyeWluZyB0byBnZXQgbG9hZCBhbGwgcGFyYWdyYXBocyBpbiBmaWxlXG5cbiAgLy9zZXQgdGhlIGRlZmF1bHQgb2Zmc2V0IGZyb20gd2hlcmUgdG8gZ2V0IHBhcmFncmFwaCB1bml0c1xuICBkZWZhdWx0T2Zmc2V0OiAwLFxuXG4gIGJhc2VVcmw6ICdodHRwOi8vY2x1amVkaXRvcjAxOjgwODAvd3NlL2x1ZScsLy8naHR0cDovL2xvY2FsaG9zdDo4MDgwL2NlJyxcbiAgLy9hcGlVcmw6IFVFLmNvbmZpZy5iYXNlVXJsICsgJycsXG4gIGFwaVVybDogJ2h0dHA6Ly9jbHVqZWRpdG9yMDE6ODA4MC93c2UvbHVlJyxcblxuICB0YWdEaXNwbGF5Q29udGV4dDoge1xuICAgIC8vIERldGVybWluZXMgaG93IHRoZSB0YWcgcGFpcnMgd2lsbCBiZSBkaXNwbGF5ZWRcbiAgICAvL1xuICAgIC8vIE9wdGlvbnM6XG4gICAgLy8gICAgbm9uZSAgICAtIE5vIFRhZyBUZXh0XG4gICAgLy8gICAgcGFydGlhbCAtIFBhcnRpYWwgVGFnIFRleHRcbiAgICAvLyAgICBmdWxsICAgIC0gRnVsbCBUYWcgVGV4dFxuICAgIC8vICAgIGlkICAgICAgLSBUYWcgSWRcbiAgICAvL1xuICAgIC8vIFRoZSBkZWZhdWx0IGRpc3BsYXkgbW9kZSBpcyBQYXJ0aWFsIFRhZyBUZXh0XG4gICAgdGFnRGlzcGxheU1vZGU6ICdwYXJ0aWFsJyxcbiAgICBzaG93Rm9ybWF0dGluZzogZmFsc2VcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBjb25maWc7IiwiLyogRmlsZTogS2V5cy5qcyAqL1xyXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xyXG4vKiBnbG9iYWxzIG1vZHVsZSAqL1xyXG5cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIEZVTkNUSU9OX0tFWVMgPSB7XHJcbiAgLy8gS2V5Ym9hcmQga2V5c1xyXG4gIGtleVRhYjogOSxcclxuICBrZXlCYWNrc3BhY2U6IDgsXHJcbiAga2V5RW50ZXI6IDEzLFxyXG4gIGtleVNwYWNlOiAzMixcclxuXHJcbiAga2V5UGFnZVVwOiAzMyxcclxuICBrZXlQYWdlRG93bjogMzQsXHJcbiAga2V5RW5kOiAzNSxcclxuICBrZXlIb21lOiAzNixcclxuICBrZXlJbnNlcnQ6IDQ1LFxyXG4gIGtleURlbGV0ZTogNDYsXHJcblxyXG4gIGtleUxlZnRBcnJvdzogMzcsXHJcbiAga2V5VXBBcnJvdzogMzgsXHJcbiAga2V5UmlnaHRBcnJvdzogMzksXHJcbiAga2V5RG93bkFycm93OiA0MCxcclxuXHJcbiAga2V5U2hpZnQ6IDE2LFxyXG4gIGtleUN0cmw6IDE3LFxyXG4gIGtleUFsdDogMTgsXHJcbiAga2V5RXNjOiAyNyxcclxuXHJcbiAga2V5Q2Fwc0xvY2s6IDIwLFxyXG4gIGtleU51bUxvY2s6IDE0NCxcclxuICBrZXlTY3JvbGxMb2NrOiAxNDUsXHJcblxyXG4gIGtleUYxOiAxMTIsXHJcbiAga2V5RjI6IDExMyxcclxuICBrZXlGMzogMTE0LFxyXG4gIGtleUY0OiAxMTUsXHJcbiAga2V5RjU6IDExNixcclxuICBrZXlGNjogMTE3LFxyXG4gIGtleUY3OiAxMTgsXHJcbiAga2V5Rjg6IDExOSxcclxuICBrZXlGOTogMTIwLFxyXG4gIGtleUYxMDogMTIxLFxyXG4gIGtleUYxMTogMTIyLFxyXG4gIGtleUYxMjogMTIzXHJcbn07XHJcblxyXG52YXIgSUdOT1JFRF9LRVlTID0gW1xyXG4gIEZVTkNUSU9OX0tFWVMua2V5TGVmdEFycm93LFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5VXBBcnJvdyxcclxuICBGVU5DVElPTl9LRVlTLmtleVJpZ2h0QXJyb3csXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlEb3duQXJyb3csXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlDYXBzTG9jayxcclxuICBGVU5DVElPTl9LRVlTLmtleVNjcm9sbExvY2ssXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlOdW1Mb2NrLFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5QWx0LFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5Q3RybCxcclxuICBGVU5DVElPTl9LRVlTLmtleVNoaWZ0LFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5UGFnZVVwLFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5UGFnZURvd24sXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlIb21lLFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5RW5kLFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5RW50ZXIsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlFc2MsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlJbnNlcnQsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlGMSxcclxuICBGVU5DVElPTl9LRVlTLmtleUYyLFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5RjMsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlGNCxcclxuICBGVU5DVElPTl9LRVlTLmtleUY1LFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5RjYsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlGNyxcclxuICBGVU5DVElPTl9LRVlTLmtleUY4LFxyXG4gIEZVTkNUSU9OX0tFWVMua2V5RjksXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlGMTAsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlGMTEsXHJcbiAgRlVOQ1RJT05fS0VZUy5rZXlGMTJcclxuXTtcclxuXHJcbnZhciBBTExPV0VEX0lOX0xPQ0tFRF9DT05URU5UID0ge1xyXG4gIDMzOiAnUGFnZVVwJyxcclxuICAzNDogJ1BhZ2VEb3duJyxcclxuICAzNTogJ0VuZCcsXHJcbiAgMzY6ICdIb21lJyxcclxuICAzNzogJ0xlZnQnLFxyXG4gIDM4OiAnVXAnLFxyXG4gIDM5OiAnUmlnaHQnLFxyXG4gIDQwOiAnRG93bicsXHJcblxyXG4gIDExMjogJ0YxJyxcclxuICAxMTM6ICdGMicsXHJcbiAgMTE0OiAnRjMnLFxyXG4gIDExNTogJ0Y0JyxcclxuICAxMTY6ICdGNScsXHJcbiAgMTE3OiAnRjYnLFxyXG4gIDExODogJ0Y3JyxcclxuICAxMTk6ICdGOCcsXHJcbiAgMTIwOiAnRjknLFxyXG4gIDEyMTogJ0YxMCcsXHJcbiAgMTIyOiAnRjExJyxcclxuICAxMjM6ICdGMTInXHJcbn07XHJcblxyXG52YXIgS2V5cyA9IHtcclxuICBmdW5jdGlvbktleXM6IEZVTkNUSU9OX0tFWVMsXHJcbiAgaWdub3JlZEtleXM6IElHTk9SRURfS0VZUyxcclxuICBhbGxvd2VkS2V5c0luTG9ja2VkQ29udGVudDogQUxMT1dFRF9JTl9MT0NLRURfQ09OVEVOVFxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBLZXlzOyIsIi8qIEZpbGU6IFNlZ21lbnRVbmRlckN1cnJlbnRTZWxlY3Rpb24uanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyBfICovXHJcbid1c2Ugc3RyaWN0JztcclxuZnVuY3Rpb24gU2VnbWVudFVuZGVyQ3VycmVudFNlbGVjdGlvbigpIHtcclxuICB2YXIgc2VnbWVudE51bWJlcixcclxuICAgICAgc2VnbWVudEVsO1xyXG5cclxuICB2YXIgc2VsZWN0aW9uID0gZG9jdW1lbnQuZ2V0U2VsZWN0aW9uKCk7XHJcbiAgdmFyIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcblxyXG5cclxuICBpZiAoZm9jdXNOb2RlID09PSBudWxsKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzZWdtZW50TnVtYmVyOiB1bmRlZmluZWQsXHJcbiAgICAgIHNlZ21lbnRFbDogdW5kZWZpbmVkXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKGZvY3VzTm9kZS5kYXRhc2V0ICE9PSB1bmRlZmluZWQpIHtcclxuICAgIHNlZ21lbnROdW1iZXIgPSBmb2N1c05vZGUuZGF0YXNldC5zZWdtZW50TnVtYmVyO1xyXG4gICAgc2VnbWVudEVsID0gZm9jdXNOb2RlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHNlZ21lbnROdW1iZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgdmFyIHBhcmVudFNlZ21lbnQgPSAkKHNlbGVjdGlvbi5mb2N1c05vZGUpLnBhcmVudHMoJy51ZS1zZWdtZW50Jyk7XHJcbiAgICB2YXIgcGFyZW50U2VnbWVudEVsID0gXyhwYXJlbnRTZWdtZW50KS5maXJzdCgpO1xyXG5cclxuICAgIHNlZ21lbnROdW1iZXIgPSBwYXJlbnRTZWdtZW50RWwuZGF0YXNldC5zZWdtZW50TnVtYmVyO1xyXG4gICAgc2VnbWVudEVsID0gcGFyZW50U2VnbWVudEVsO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHNlZ21lbnROdW1iZXI6IHNlZ21lbnROdW1iZXIsXHJcbiAgICBzZWdtZW50RWw6IHNlZ21lbnRFbFxyXG4gIH07XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2VnbWVudFVuZGVyQ3VycmVudFNlbGVjdGlvbjsiLCIvKiBGaWxlOiBTaGlmdEVudGVySGFuZGxlci5qcyAqL1xyXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xyXG4vKiBnbG9iYWxzIHJlcXVpcmUsIG1vZHVsZSAqL1xyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciBIZWxwZXJzID0gcmVxdWlyZSgnLi4vSGVscGVycycpO1xyXG52YXIgU2VnbWVudHNXYXRjaGVyID0gcmVxdWlyZSgnLi4vU2VnbWVudHNXYXRjaGVyJyk7XHJcbnZhciBLZXlib2FyZEJpbmRpbmdzID0gcmVxdWlyZSgnLi4vS2V5Ym9hcmRCaW5kaW5ncycpO1xyXG52YXIgS2V5cyA9IHJlcXVpcmUoJy4vS2V5cycpO1xyXG52YXIgU2VsZWN0aW9uID0gcmVxdWlyZSgnLi4vc2VsZWN0aW9uJyk7XHJcblxyXG52YXIgU2hpZnRFbnRlckhhbmRsZXIgPSBmdW5jdGlvbiAoZXYpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBpc1NoaWZ0S2V5UHJlc3NlZCA9IGV2LnNoaWZ0S2V5LFxyXG4gICAgICBpc0VudGVyUHJlc3NlZCA9IGV2LmtleUNvZGUgPT09IEtleXMuZnVuY3Rpb25LZXlzLmtleUVudGVyLFxyXG4gICAgICBpc0hhbmRsaW5nUmVxdWlyZWQgPSBpc1NoaWZ0S2V5UHJlc3NlZCAmJiBpc0VudGVyUHJlc3NlZCxcclxuICAgICAgc2VsZWN0aW9uID0gbmV3IFNlbGVjdGlvbi5TZWxlY3Rpb25Db250ZXh0KCksXHJcbiAgICAgIGZvY3VzTm9kZSA9IHNlbGVjdGlvbi5mb2N1c05vZGU7XHJcblxyXG4gIGlmICghaXNIYW5kbGluZ1JlcXVpcmVkKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBtZS5mb2N1cyA9IG5ldyBTZWxlY3Rpb24uTm9kZVdhbGtlcihmb2N1c05vZGUpO1xyXG4gIG1lLmJyZWFrTGluZXNPdXRzaWRlT2ZUZXh0ID0gW107XHJcblxyXG4gIG1lLm1vdmVGb2N1c1RvVGFyZ2V0U2VnbWVudCgpO1xyXG4gIG1lLm1vdmVCcmVha0xpbmVzVG9UZXh0Q29udGFpbmVycygpO1xyXG5cclxuICBTZWdtZW50c1dhdGNoZXIucmVzaXplKG1lLnNlZ21lbnROdW1iZXIpO1xyXG59O1xyXG5cclxudmFyIHByb3RvID0gU2hpZnRFbnRlckhhbmRsZXIucHJvdG90eXBlO1xyXG5cclxucHJvdG8ubW92ZUZvY3VzVG9UYXJnZXRTZWdtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGZvY3VzID0gbWUuZm9jdXM7XHJcblxyXG4gIHdoaWxlICghZm9jdXMuaXNOdWxsKCkgJiYgIWZvY3VzLmlzU2VnbWVudCgpKSB7XHJcbiAgICBmb2N1cyA9IGZvY3VzLnBhcmVudCgpO1xyXG4gIH1cclxuXHJcbiAgbWUuc2VnbWVudE51bWJlciA9IGZvY3VzLnNlZ21lbnROdW1iZXIoKTtcclxuICBtZS5mb2N1cyA9IGZvY3VzO1xyXG59O1xyXG5cclxucHJvdG8ubW92ZUJyZWFrTGluZXNUb1RleHRDb250YWluZXJzID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIG5vZGVXYWxrZXIgPSBtZS5mb2N1cztcclxuXHJcbiAgbWUubW92ZVRocm91Z2gobm9kZVdhbGtlcik7XHJcbn07XHJcblxyXG5wcm90by5tb3ZlVGhyb3VnaCA9IGZ1bmN0aW9uIChjb250YWluZXIpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBub2RlV2Fsa2VyID0gY29udGFpbmVyO1xyXG5cclxuICBub2RlV2Fsa2VyID0gbm9kZVdhbGtlci5maXJzdENoaWxkKCk7XHJcbiAgd2hpbGUgKCFub2RlV2Fsa2VyLmlzTnVsbCgpKSB7XHJcblxyXG4gICAgaWYgKG5vZGVXYWxrZXIuaXNJbmxpbmVDb250ZW50KCkpIHtcclxuICAgICAgbWUuaW5zZXJ0QnJlYWtMaW5lc0F0U3RhcnRPZihub2RlV2Fsa2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZVdhbGtlci5pc0VsZW1lbnQoJ2JyJykgJiYgbm9kZVdhbGtlci5wYXJlbnQoKS5pc1NlZ21lbnQoKSkge1xyXG4gICAgICBtZS5icmVha0xpbmVzT3V0c2lkZU9mVGV4dC5wdXNoKG5vZGVXYWxrZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlV2Fsa2VyLmlzRWxlbWVudCgnYnInKSAmJiBub2RlV2Fsa2VyLnBhcmVudCgpLmlzVGFnKCkpIHtcclxuICAgICAgbWUubW92ZU5vZGVBZnRlclRoZVRhZyhub2RlV2Fsa2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZVdhbGtlci5pc0VsZW1lbnQoKSkge1xyXG4gICAgICBtZS5tb3ZlVGhyb3VnaChub2RlV2Fsa2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZVdhbGtlci5pc1RhZygpKSB7XHJcbiAgICAgIG1lLmV4cG9ydE5ld0xpbmVzKG5vZGVXYWxrZXIpO1xyXG4gICAgICBtZS5pbnNlcnRCcmVha0xpbmVzQWZ0ZXIobm9kZVdhbGtlcik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5vZGVXYWxrZXIuaXNUZXh0KCkpIHtcclxuICAgICAgbWUuY29udmVydENhcnJpYWdlUmV0dXJuVG9CcmVhayhub2RlV2Fsa2VyKTtcclxuICAgIH1cclxuXHJcbiAgICBub2RlV2Fsa2VyID0gbm9kZVdhbGtlci5uZXh0KCk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8uaW5zZXJ0QnJlYWtMaW5lc0F0U3RhcnRPZiA9IGZ1bmN0aW9uIChub2RlV2Fsa2VyKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgYnJlYWtMaW5lRWxlbWVudCxcclxuICAgICAgZmlyc3RDaGlsZCA9IG5vZGVXYWxrZXIuZmlyc3RDaGlsZCgpO1xyXG5cclxuICB3aGlsZSAobWUuYnJlYWtMaW5lc091dHNpZGVPZlRleHQubGVuZ3RoID4gMCkge1xyXG4gICAgYnJlYWtMaW5lRWxlbWVudCA9IG1lLmJyZWFrTGluZXNPdXRzaWRlT2ZUZXh0LnBvcCgpO1xyXG5cclxuICAgIGlmICghZmlyc3RDaGlsZC5pc051bGwoKSkge1xyXG4gICAgICBmaXJzdENoaWxkLmluc2VydEJlZm9yZShicmVha0xpbmVFbGVtZW50KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIG5vZGVXYWxrZXIuYXBwZW5kKGJyZWFrTGluZUVsZW1lbnQpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLmluc2VydEJyZWFrTGluZXNBZnRlciA9IGZ1bmN0aW9uIChub2RlV2Fsa2VyKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgYnJlYWtMaW5lRWxlbWVudDtcclxuXHJcbiAgd2hpbGUgKG1lLmJyZWFrTGluZXNPdXRzaWRlT2ZUZXh0Lmxlbmd0aCA+IDApIHtcclxuICAgIGJyZWFrTGluZUVsZW1lbnQgPSBtZS5icmVha0xpbmVzT3V0c2lkZU9mVGV4dC5wb3AoKTtcclxuXHJcbiAgICBub2RlV2Fsa2VyLmluc2VydEFmdGVyKGJyZWFrTGluZUVsZW1lbnQpO1xyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLmV4cG9ydE5ld0xpbmVzID0gZnVuY3Rpb24gKGNvbnRhaW5lcikge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHRleHRDb250ZW50LFxyXG4gICAgICBuZXdMaW5lc0NvdW50LFxyXG4gICAgICBpLFxyXG4gICAgICBicjtcclxuXHJcbiAgaWYgKGNvbnRhaW5lci5pc051bGwoKSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdGV4dENvbnRlbnQgPSBjb250YWluZXIudGV4dENvbnRlbnQoKTtcclxuICBuZXdMaW5lc0NvdW50ID0gdGV4dENvbnRlbnQuc3BsaXQoJ1xcbicpLmxlbmd0aCAtIDE7XHJcblxyXG4gIGZvciAoaSA9IDA7IGkgPCBuZXdMaW5lc0NvdW50OyBpKyspIHtcclxuICAgIGJyID0gSGVscGVycy5zdHJpbmdUb0hUTUxFbGVtZW50KCc8YnI+Jyk7XHJcbiAgICBtZS5icmVha0xpbmVzT3V0c2lkZU9mVGV4dC5wdXNoKGJyKTtcclxuICB9XHJcblxyXG4gIGlmIChuZXdMaW5lc0NvdW50ID4gMCkge1xyXG4gICAgbWUuY2xlYW5DYXJyaWFnZVJldHVybkZyb20oY29udGFpbmVyKTtcclxuICB9XHJcbn07XHJcblxyXG5wcm90by5jbGVhbkNhcnJpYWdlUmV0dXJuRnJvbSA9IGZ1bmN0aW9uIChjb250YWluZXIpIHtcclxuICB2YXIgcHJvY2Vzc2luZ1F1ZXVlID0gW2NvbnRhaW5lcl0sXHJcbiAgICAgIG5vZGVWYWx1ZTtcclxuXHJcbiAgd2hpbGUgKHByb2Nlc3NpbmdRdWV1ZS5sZW5ndGggPiAwKSB7XHJcbiAgICB2YXIgaXRlbSA9IHByb2Nlc3NpbmdRdWV1ZS5wb3AoKTtcclxuXHJcbiAgICBpZiAoaXRlbS5pc1RleHROb2RlKCkpIHtcclxuICAgICAgbm9kZVZhbHVlID0gaXRlbS5lbC5ub2RlVmFsdWU7XHJcbiAgICAgIG5vZGVWYWx1ZSA9IG5vZGVWYWx1ZS5yZXBsYWNlKCdcXG4nLCAnJyk7XHJcbiAgICAgIGl0ZW0uZWwubm9kZVZhbHVlID0gbm9kZVZhbHVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghaXRlbS5uZXh0KCkuaXNOdWxsKCkpIHtcclxuICAgICAgcHJvY2Vzc2luZ1F1ZXVlLnB1c2goaXRlbS5uZXh0KCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghaXRlbS5maXJzdENoaWxkKCkuaXNOdWxsKCkpIHtcclxuICAgICAgcHJvY2Vzc2luZ1F1ZXVlLnB1c2goaXRlbS5maXJzdENoaWxkKCkpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbnByb3RvLmNvbnZlcnRDYXJyaWFnZVJldHVyblRvQnJlYWsgPSBmdW5jdGlvbiAoY29udGFpbmVyKSB7XHJcbiAgdmFyIG5vZGVXYWxrZXIgPSBjb250YWluZXIuZmlyc3RDaGlsZCgpO1xyXG4gIHZhciBub2RlVmFsdWU7XHJcbiAgdmFyIGJyZWFrTm9kZTtcclxuICB2YXIgY2FycmlhZ2VSZXR1cm5Ob2RlO1xyXG4gIHZhciBwYXJlbnROb2RlO1xyXG5cclxuICB3aGlsZSAoIW5vZGVXYWxrZXIuaXNOdWxsKCkpIHtcclxuICAgIGlmIChub2RlV2Fsa2VyLmlzVGV4dE5vZGUoKSkge1xyXG4gICAgICBub2RlVmFsdWUgPSBub2RlV2Fsa2VyLmVsLm5vZGVWYWx1ZTtcclxuICAgICAgY2FycmlhZ2VSZXR1cm5Ob2RlID0gbm9kZVdhbGtlci5lbDtcclxuICAgICAgcGFyZW50Tm9kZSA9IG5vZGVXYWxrZXIuZWwucGFyZW50Tm9kZTtcclxuXHJcbiAgICAgIGlmIChub2RlVmFsdWUgPT09ICdcXG4nKSB7XHJcbiAgICAgICAgYnJlYWtOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKTtcclxuICAgICAgICBwYXJlbnROb2RlLnJlcGxhY2VDaGlsZChicmVha05vZGUsIGNhcnJpYWdlUmV0dXJuTm9kZSk7XHJcbiAgICAgICAgbm9kZVdhbGtlci5lbCA9IGJyZWFrTm9kZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIG5vZGVXYWxrZXIgPSBub2RlV2Fsa2VyLm5leHQoKTtcclxuICB9XHJcblxyXG59O1xyXG5cclxucHJvdG8ubW92ZU5vZGVBZnRlclRoZVRhZyA9IGZ1bmN0aW9uIChick5vZGUpIHtcclxuICB2YXIgdGFnID0gYnJOb2RlLnBhcmVudCgpO1xyXG5cclxuICB0YWcuaW5zZXJ0QWZ0ZXIoYnJOb2RlKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU2hpZnRFbnRlckhhbmRsZXI7IiwiLyogRmlsZTogUmliYm9uTWVudUNvbW1hbmRzLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgJCwgcmVxdWlyZSwgbW9kdWxlICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG52YXIgY29uZmlnID0gcmVxdWlyZSgnLi4vY29uZmlnJyk7XHJcbnZhciBNZWRpYXRvciA9IHJlcXVpcmUoJy4uL01lZGlhdG9yJyk7XHJcbnZhciBDb21tYW5kTWFuYWdlciA9IHJlcXVpcmUoJy4uL0NvbW1hbmRNYW5hZ2VyJyk7XHJcblxyXG52YXIgU3RvcmFnZSA9IHJlcXVpcmUoJy4uL1N0b3JhZ2UnKTtcclxudmFyIERhdGFQcm92aWRlciA9IHJlcXVpcmUoJy4uL0RhdGFQcm92aWRlcicpO1xyXG52YXIgUGFyYWdyYXBocyA9IHJlcXVpcmUoJy4uL1BhcmFncmFwaHMnKTtcclxuXHJcbnZhciBjbWRyID0gbmV3IENvbW1hbmRNYW5hZ2VyKCk7XHJcblxyXG52YXIgUmliYm9uTWVudUNvbW1hbmRzID0ge1xyXG4gIHNldHVwTGlzdGVuZXJzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICAgIHZhciBjb21tYW5kcyA9IHtcclxuICAgICAgJ3RvZ2dsZV9mb3JtYXR0aW5nX3RhZ3MnOiB7XHJcbiAgICAgICAgaGFuZGxlOiBmdW5jdGlvbiAoZWxlbSkge1xyXG4gICAgICAgICAgdmFyIHRhcmdldCA9ICQoZWxlbSksXHJcbiAgICAgICAgICAgICAgaGlkZGVuID0gdGFyZ2V0LmRhdGEoJ2hpZGRlbicpLFxyXG4gICAgICAgICAgICAgIHNob3dGb3JtYXR0aW5nID0gY29uZmlnLnRhZ0Rpc3BsYXlDb250ZXh0LnNob3dGb3JtYXR0aW5nO1xyXG5cclxuICAgICAgICAgIGlmIChzaG93Rm9ybWF0dGluZykge1xyXG4gICAgICAgICAgICB0YXJnZXQuZGF0YSgnaGlkZGVuJywgZmFsc2UpLmFkZENsYXNzKCdhY3RpdmUnKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAodHlwZW9mIGhpZGRlbiA9PT0gJ3VuZGVmaW5lZCcgfHwgaGlkZGVuKSB7XHJcbiAgICAgICAgICAgIHRhcmdldC5kYXRhKCdoaWRkZW4nLCBmYWxzZSkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xyXG4gICAgICAgICAgICBtZS5zaG93VGFncygpO1xyXG4gICAgICAgICAgICBjb25maWcudGFnRGlzcGxheUNvbnRleHQuc2hvd0Zvcm1hdHRpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGFyZ2V0LmRhdGEoJ2hpZGRlbicsIHRydWUpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuICAgICAgICAgICAgbWUuaGlkZVRhZ3MoKTtcclxuICAgICAgICAgICAgY29uZmlnLnRhZ0Rpc3BsYXlDb250ZXh0LnNob3dGb3JtYXR0aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgJ2Rpc3BsYXlfdGFnX25vbmUnOiB7XHJcbiAgICAgICAgaGFuZGxlOiBmdW5jdGlvbiAoZWxlbSkge1xyXG4gICAgICAgICAgbWUudG9nZ2xlR3JvdXBlZEJ1dHRvbnMoZWxlbSk7XHJcbiAgICAgICAgICBtZS5zd2l0Y2hEaXNwbGF5TW9kZSgnbm9uZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuXHJcbiAgICAgICdkaXNwbGF5X3RhZ19wYXJ0aWFsJzoge1xyXG4gICAgICAgIGhhbmRsZTogZnVuY3Rpb24gKGVsZW0pIHtcclxuICAgICAgICAgIG1lLnRvZ2dsZUdyb3VwZWRCdXR0b25zKGVsZW0pO1xyXG4gICAgICAgICAgbWUuc3dpdGNoRGlzcGxheU1vZGUoJ3BhcnRpYWwnKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAnZGlzcGxheV90YWdfZnVsbCc6IHtcclxuICAgICAgICBoYW5kbGU6IGZ1bmN0aW9uIChlbGVtKSB7XHJcbiAgICAgICAgICBtZS50b2dnbGVHcm91cGVkQnV0dG9ucyhlbGVtKTtcclxuICAgICAgICAgIG1lLnN3aXRjaERpc3BsYXlNb2RlKCdmdWxsJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG5cclxuICAgICAgJ2Rpc3BsYXlfdGFnX2lkJzoge1xyXG4gICAgICAgIGhhbmRsZTogZnVuY3Rpb24gKGVsZW0pIHtcclxuICAgICAgICAgIG1lLnRvZ2dsZUdyb3VwZWRCdXR0b25zKGVsZW0pO1xyXG4gICAgICAgICAgbWUuc3dpdGNoRGlzcGxheU1vZGUoJ2lkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIG1lLiRyaWJib24ub24oJ2NsaWNrJywgJ1tkYXRhLWFjdGlvbl0nLCBmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgdmFyIGVsZW0gPSBldi5jdXJyZW50VGFyZ2V0O1xyXG5cclxuICAgICAgTWVkaWF0b3IucHVibGlzaCgncmliYm9uOmNvbW1hbmQnLCB7XHJcbiAgICAgICAgZWxlbTogZWxlbSxcclxuICAgICAgICBhY3Rpb246IGVsZW0uZGF0YXNldC5hY3Rpb24gfHwgbnVsbFxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNldCB1cCBjb21tYW5kcyBmb3IgdGhlIHJpYmJvbiBtZW51XHJcbiAgICBjbWRyLmFkZENvbW1hbmRzKGNvbW1hbmRzKTtcclxuXHJcbiAgfSxcclxuXHJcbiAgaGlkZVRhZ3M6IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgICAgZWxlbXMgPSBtZS4kZWRpdG9yLmZpbmQoJ1tkYXRhLWNhbi1oaWRlPVwidHJ1ZVwiXScpO1xyXG5cclxuICAgIGVsZW1zLmFkZENsYXNzKCdoaWRlJykuZGF0YSgnY2FuLWRlbGV0ZScsIGZhbHNlKTtcclxuICB9LFxyXG5cclxuICBzaG93VGFnczogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgICBlbGVtcyA9IG1lLiRlZGl0b3IuZmluZCgnW2RhdGEtY2FuLWhpZGU9XCJ0cnVlXCJdJyk7XHJcblxyXG4gICAgZWxlbXMucmVtb3ZlQ2xhc3MoJ2hpZGUnKS5kYXRhKCdjYW4tZGVsZXRlJywgdHJ1ZSk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFRvZ2dsZSBncm91cGVkIGJ1dHRvbnMgc3RhdGVcclxuICAgKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gdGFyZ2V0IC0gQ2xpY2tlZCBlbGVtZW50XHJcbiAgICpcclxuICAgKiBUT0RPOiBpdCBkZXBlbmRzIGhlYXZpbHkgb24galF1ZXJ5LCB0aGlzIHNob3VsZCBiZSBjaGFuZ2VkXHJcbiAgICovXHJcbiAgdG9nZ2xlR3JvdXBlZEJ1dHRvbnM6IGZ1bmN0aW9uICh0YXJnZXQpIHtcclxuICAgIHZhciB0YXJnZXRFbCA9ICQodGFyZ2V0KTtcclxuXHJcbiAgICBpZiAoIXRhcmdldC5kYXRhc2V0LmFjdGlvbkdyb3VwKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0YXJnZXRFbC5wYXJlbnRzKCcubmF2LXJpYmJvbi1wYW5lbCcpXHJcbiAgICAgICAgICAgIC5maW5kKCdbZGF0YS1hY3Rpb24tZ3JvdXBdJylcclxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuXHJcbiAgICB0YXJnZXRFbC5hZGRDbGFzcygnYWN0aXZlJyk7XHJcbiAgfSxcclxuXHJcblxyXG4gIC8qKlxyXG4gICAqIFN3aXRjaCB0aGUgZGlzcGxheSBtb2RlIGZvciBmb3JtYXR0aW5nIHRhZ3NcclxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IG1vZGVcclxuICAgKi9cclxuICBzd2l0Y2hEaXNwbGF5TW9kZTogZnVuY3Rpb24gKG1vZGUpIHtcclxuICAgIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgICAgc3RvcmFnZSA9IFN0b3JhZ2VbY29uZmlnLnN0b3JhZ2VdLmdldEluc3RhbmNlKCksXHJcbiAgICAgICAgY3VycmVudERvYyA9IERhdGFQcm92aWRlci5nZXRDdXJyZW50RG9jdW1lbnQoKTtcclxuXHJcbiAgICBjb25maWcudGFnRGlzcGxheUNvbnRleHQudGFnRGlzcGxheU1vZGUgPSBtb2RlO1xyXG5cclxuICAgIG1lLiRlZGl0b3IuaHRtbCgnJyk7XHJcbiAgICBQYXJhZ3JhcGhzLl9yZW5kZXJQYXJhZ3JhcGhzKHN0b3JhZ2UucGFyYWdyYXBocywgY3VycmVudERvYyk7XHJcbiAgfSxcclxuXHJcblxyXG4gIGluaXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gICAgbWUuJGVkaXRvciA9ICQoJyNlZGl0b3ItYm9keScpO1xyXG4gICAgbWUuJHJpYmJvbiA9ICQoJy5uYXYtcmliYm9uJyk7XHJcblxyXG4gICAgbWUuc2V0dXBMaXN0ZW5lcnMoKTtcclxuICB9XHJcbn07XHJcblxyXG4vLyBTdWJzY3JpYmUgdG8gcmliYm9uIGNvbW1hbmRzIGFuZCBleGVjdXRlIHRoZW1cclxuTWVkaWF0b3Iuc3Vic2NyaWJlKCdyaWJib246Y29tbWFuZCcsIGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgY21kci5leGVjdXRlKGRhdGEuYWN0aW9uLCBkYXRhLmVsZW0pO1xyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUmliYm9uTWVudUNvbW1hbmRzOyIsIi8qIEZpbGU6IEN0cmxDbGlja0hhbmRsZXIuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyBfICovXHJcbid1c2Ugc3RyaWN0JztcclxudmFyIGhlbHBlcnMgPSByZXF1aXJlKCcuLi9IZWxwZXJzJyk7XHJcbnZhciBkYXRhUHJvdmlkZXIgPSByZXF1aXJlKCcuLi9EYXRhUHJvdmlkZXInKTtcclxuXHJcbnZhciBNZWRpYXRvciA9IHJlcXVpcmUoJy4uL01lZGlhdG9yJyk7XHJcbnZhciBTZWdtZW50ID0gcmVxdWlyZSgnLi4vU2VnbWVudCcpO1xyXG52YXIgS2V5Ym9hcmQgPSByZXF1aXJlKCcuLi9LZXlib2FyZCcpO1xyXG52YXIgTm9kZVdhbGtlciA9IHJlcXVpcmUoJy4uL3NlbGVjdGlvbicpLk5vZGVXYWxrZXI7XHJcbnZhciBUYWdQYWlyID0gcmVxdWlyZSgnLi4vc2VsZWN0aW9uJykuVGFnUGFpcjtcclxudmFyIFNlbGVjdGlvbkNvbnRleHQgPSByZXF1aXJlKCcuLi9zZWxlY3Rpb24nKS5TZWxlY3Rpb25Db250ZXh0O1xyXG5cclxuZnVuY3Rpb24gTW91c2VDdHJsQ2xpY2tIYW5kbGVyKCkge1xyXG59XHJcbnZhciBwcm90byA9IE1vdXNlQ3RybENsaWNrSGFuZGxlci5wcm90b3R5cGU7XHJcblxyXG4vKipcclxuICogSW5zZXJ0cyB0YWdzIG9yIHdyYXBzIHNlbGVjdGlvbnMgd2l0aCB0YWdzXHJcbiAqIEBwYXJhbSAge09iamVjdH0gZXYgalF1ZXJ5IGV2ZW50IG9iamVjdFxyXG4gKi9cclxucHJvdG8uaGFuZGxlID0gZnVuY3Rpb24gKGV2KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgdGFnLCB0YWdzLFxyXG4gICAgICBwbGFjZWhvbGRlckNsb25lLFxyXG4gICAgICBjdXJyZW50U2VnbWVudCA9IEtleWJvYXJkLlNlZ21lbnRVbmRlckN1cnJlbnRTZWxlY3Rpb24oKSxcclxuICAgICAgY3VycmVudFNlZ21lbnROdW1iZXIgPSBjdXJyZW50U2VnbWVudC5zZWdtZW50TnVtYmVyLFxyXG4gICAgICBpc1NlbGVjdGlvbkluU291cmNlLCBpc0NvbGxhcHNlZCxcclxuICAgICAgc2VnbWVudCwgc2VnbWVudERhdGEsXHJcbiAgICAgIHN0YXJ0Q29udGFpbmVyO1xyXG5cclxuICB0YWcgPSBuZXcgTm9kZVdhbGtlcihldi5jdXJyZW50VGFyZ2V0KTtcclxuICB0YWdzID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cclxuICBpZiAoIXRhZy5pc1RhZygpKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZiAodGFnLmlzUGxhY2Vob2xkZXIoKSkge1xyXG4gICAgcGxhY2Vob2xkZXJDbG9uZSA9IHRhZy5lbC5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBtZS5jbGVhckFjdGl2ZUNsYXNzKHBsYWNlaG9sZGVyQ2xvbmUpO1xyXG4gICAgbWUuZGlzYWJsZVRhZ0NvcHkocGxhY2Vob2xkZXJDbG9uZSk7XHJcbiAgICB0YWdzLmFwcGVuZENoaWxkKHBsYWNlaG9sZGVyQ2xvbmUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0YWcgPSBuZXcgVGFnUGFpcih0YWcpO1xyXG4gICAgdGFncyA9IHRhZy5jbG9uZVN0cnVjdHVyZSgpO1xyXG4gICAgbWUuY2xlYXJBY3RpdmVDbGFzcyh0YWdzLmNoaWxkTm9kZXNbMF0pO1xyXG4gICAgbWUuY2xlYXJBY3RpdmVDbGFzcyh0YWdzLmNoaWxkTm9kZXNbMl0pO1xyXG5cclxuICAgIG1lLmRpc2FibGVUYWdDb3B5KHRhZ3MuY2hpbGROb2Rlc1swXSk7XHJcbiAgICBtZS5kaXNhYmxlVGFnQ29weSh0YWdzLmNoaWxkTm9kZXNbMl0pO1xyXG4gIH1cclxuXHJcbiAgbWUucmFuZ2UgPSBuZXcgU2VsZWN0aW9uQ29udGV4dCgpO1xyXG4gIHN0YXJ0Q29udGFpbmVyID0gbWUucmFuZ2Uuc3RhcnRDb250YWluZXI7XHJcblxyXG4gIGlmICghc3RhcnRDb250YWluZXIpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGlzQ29sbGFwc2VkID0gbWUucmFuZ2UuaXNDb2xsYXBzZWQoKTtcclxuXHJcbiAgaXNTZWxlY3Rpb25JblNvdXJjZSA9IGhlbHBlcnMuaGFzUGFyZW50KHN0YXJ0Q29udGFpbmVyLCAndWUtc291cmNlJyk7XHJcblxyXG4gIC8vIENoZWNrIGlmIHNlbGVjdGlvbiBpcyBpbiBzb3VyY2VcclxuICBpZiAoaXNTZWxlY3Rpb25JblNvdXJjZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgLy8gSWYgQ1RSTCBrZXkgaXMgcHJlc3NlZCBhbmQgY2xpY2tlZFxyXG4gIC8vIG1vdXNlIGJ1dHRvbiBpcyBsZWZ0IGJ1dHRvbiwgaW5zZXJ0IHRhZ1xyXG4gIGlmIChldi5jdHJsS2V5ICYmIGV2LndoaWNoID09PSAxKSB7XHJcbiAgICBpZiAoaXNDb2xsYXBzZWQpIHtcclxuICAgICAgbWUuaW5zZXJ0VGFnQXRDdXJzb3IodGFncyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBtZS5pbnNlcnRUYWdPdmVyU2VsZWN0aW9uKHRhZ3MpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoYW5nZSBzZWdtZW50IHN0YXR1cyB0byBkcmFmdCBhZnRlciB0YWcgaW5zZXJ0aW9uXHJcbiAgICBzZWdtZW50RGF0YSA9IGRhdGFQcm92aWRlci5nZXRTZWdtZW50QnlTZWdtZW50TnVtYmVyKGN1cnJlbnRTZWdtZW50TnVtYmVyKTtcclxuICAgIHNlZ21lbnQgPSBuZXcgU2VnbWVudChzZWdtZW50RGF0YSk7XHJcbiAgICBzZWdtZW50LmNoYW5nZVRvRHJhZnQoKTtcclxuXHJcbiAgICAvLyBQdWJsaXNoIHNlZ21lbnQgc3RhdHVzIGhhcyBjaGFuZ2VkXHJcbiAgICBNZWRpYXRvci5wdWJsaXNoKCdzZWdtZW50OmNvbmZpcm1hdGlvbkxldmVsQ2hhbmdlZCcsIHNlZ21lbnREYXRhKTtcclxuICAgIGV2LnByZXZlbnREZWZhdWx0KCk7XHJcbiAgfVxyXG59O1xyXG5cclxucHJvdG8uY2xlYXJBY3RpdmVDbGFzcyA9IGZ1bmN0aW9uICh0YWdXcmFwcGVyKSB7XHJcbiAgdmFyIHRhZyA9IHRhZ1dyYXBwZXIuZmlyc3RDaGlsZDtcclxuICB0YWcuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XHJcbn07XHJcblxyXG5wcm90by5kaXNhYmxlVGFnQ29weSA9IGZ1bmN0aW9uICh0YWdXcmFwcGVyKSB7XHJcbiAgdGFnV3JhcHBlci5kYXRhc2V0LnRhZ0NvcHkgPSBmYWxzZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBJbnNlcnRzIHRoZSBjbGlja2VkIHRhZyBhdCB0aGUgY3VycmVudCBjdXJzb3IgcG9zaXRpb25cclxuICogQHBhcmFtICB7RG9jdW1lbnRGcmFnbWVudH0gIHRhZ3NcclxuICovXHJcbnByb3RvLmluc2VydFRhZ0F0Q3Vyc29yID0gZnVuY3Rpb24gKHRhZ3MpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBodG1sID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxyXG4gICAgICByYW5nZSA9IG1lLnJhbmdlLFxyXG4gICAgICBpbnNlcnRlZE5vZGUgPSB0YWdzLmZpcnN0Q2hpbGQsXHJcbiAgICAgIGZvY3VzTm9kZSA9IGluc2VydGVkTm9kZS5sYXN0Q2hpbGQ7Ly8gSSBleHBlY3QgdGhlIGludmlzaWJsZSBjaGFyIHRvIGJlIGhlcmUuXHJcblxyXG4gIGh0bWwuYXBwZW5kQ2hpbGQodGFncyk7XHJcblxyXG4gIHJhbmdlLmluc2VydE5vZGUoaHRtbCk7XHJcbiAgbWUuc2V0Q3Vyc29yQXQoZm9jdXNOb2RlKTtcclxufTtcclxuXHJcbnByb3RvLnNldEN1cnNvckF0ID0gZnVuY3Rpb24gKGZvY3VzTm9kZSl7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgcmFuZ2UgPSBtZS5yYW5nZTtcclxuXHJcbiAgaWYoZm9jdXNOb2RlID09PSBudWxsIHx8IGZvY3VzTm9kZSA9PT0gdW5kZWZpbmVkKXtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIF8uZGVsYXkoZnVuY3Rpb24gKCkge1xyXG4gICAgcmFuZ2UuY2hhbmdlUmFuZ2UoZnVuY3Rpb24obmV3UmFuZ2Upe1xyXG4gICAgICB2YXIgc2VsZWN0aW9uT2Zmc2V0ID0gMTtcclxuICAgICAgbmV3UmFuZ2Uuc2V0U3RhcnQoZm9jdXNOb2RlLCBzZWxlY3Rpb25PZmZzZXQpO1xyXG4gICAgICBuZXdSYW5nZS5zZXRFbmQoZm9jdXNOb2RlLCBzZWxlY3Rpb25PZmZzZXQpO1xyXG5cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9KTtcclxuICB9KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBXcmFwcyBzZWxlY3Rpb24gYW5kIGluc2VydHMgaXQgYXQgdGhlIGN1cnJlbnQgY3Vyc29yIHBvc2l0aW9uXHJcbiAqIEBwYXJhbSAge0RvY3VtZW50RnJhZ21lbnR9ICB0YWdzXHJcbiAqL1xyXG5wcm90by5pbnNlcnRUYWdPdmVyU2VsZWN0aW9uID0gZnVuY3Rpb24gKHRhZ3MpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBodG1sID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxyXG4gICAgICByYW5nZSA9IG1lLnJhbmdlLFxyXG4gICAgICBkb2N1bWVudEZyYWdtZW50LFxyXG4gICAgICBpbmxpbmVDb250ZW50O1xyXG5cclxuICBkb2N1bWVudEZyYWdtZW50ID0gcmFuZ2UuY2xvbmVDb250ZW50cygpO1xyXG5cclxuICBodG1sLmFwcGVuZENoaWxkKHRhZ3MpO1xyXG5cclxuICBpbmxpbmVDb250ZW50ID0gaHRtbC5xdWVyeVNlbGVjdG9yKCcudWUtaW5saW5lLWNvbnRlbnQnKTtcclxuICBpZiAoaW5saW5lQ29udGVudCAhPT0gbnVsbCkge1xyXG4gICAgaW5saW5lQ29udGVudC5hcHBlbmRDaGlsZChkb2N1bWVudEZyYWdtZW50KTtcclxuICB9XHJcblxyXG4gIHJhbmdlLmRlbGV0ZUNvbnRlbnRzKCk7XHJcbiAgcmFuZ2UuaW5zZXJ0Tm9kZShodG1sKTtcclxuICBtZS5zZWxlY3RDb250ZW50KGlubGluZUNvbnRlbnQpO1xyXG59O1xyXG5cclxucHJvdG8uc2VsZWN0Q29udGVudCA9IGZ1bmN0aW9uIChpbmxpbmVDb250ZW50KSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgcmFuZ2UgPSBtZS5yYW5nZTtcclxuXHJcbiAgaWYoaW5saW5lQ29udGVudCA9PT0gdW5kZWZpbmVkIHx8IGlubGluZUNvbnRlbnQgPT09IG51bGwpe1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgcmFuZ2UuY2hhbmdlUmFuZ2UoZnVuY3Rpb24gKHJhbmdlKSB7XHJcbiAgICByYW5nZS5zZWxlY3ROb2RlQ29udGVudHMoaW5saW5lQ29udGVudCk7XHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1vdXNlQ3RybENsaWNrSGFuZGxlcjsiLCIvKiBGaWxlOiBDdHJsSG92ZXJIYW5kbGVyLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbmZ1bmN0aW9uIE1vdXNlQ3RybEhvdmVySGFuZGxlcigpIHtcclxufVxyXG5cclxudmFyIHByb3RvID0gTW91c2VDdHJsSG92ZXJIYW5kbGVyLnByb3RvdHlwZTtcclxuXHJcbnByb3RvLm1vdXNlT3ZlciA9IGZ1bmN0aW9uIChldikge1xyXG4gIGlmICghZXYuY3RybEtleSB8fCBldi50eXBlICE9PSAnbW91c2VvdmVyJykge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICAkKGV2LmN1cnJlbnRUYXJnZXQpLmNoaWxkcmVuKCkuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xyXG59O1xyXG5cclxucHJvdG8ubW91c2VMZWF2ZSA9IGZ1bmN0aW9uIChldikge1xyXG4gIGlmIChldi50eXBlICE9PSAnbW91c2VsZWF2ZScpIHtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgJChldi5jdXJyZW50VGFyZ2V0KS5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxufTtcclxubW9kdWxlLmV4cG9ydHMgPSBNb3VzZUN0cmxIb3ZlckhhbmRsZXI7IiwiLyogRmlsZTogU3R5bGVzTWFwLmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbi8qIGdsb2JhbHMgbW9kdWxlICovXHJcblxyXG4ndXNlIHN0cmljdCc7XHJcblxyXG4vLyBVc2VkIHRvIG1hcCBkaWZmZXJlbnQgcmVwcmVzZXRhdGlvbnNcclxuLy8gb2YgYSB0cnVlL2ZhbHNlIHN0cmluZ3NcclxudmFyIGJvb2xlYW5NYXAgPSB7XHJcbiAgJ0ZBTFNFJzogZmFsc2UsXHJcbiAgJ0ZhbHNlJzogZmFsc2UsXHJcbiAgJ2ZhbHNlJzogZmFsc2UsXHJcbiAgJ1RSVUUnOiB0cnVlLFxyXG4gICdUcnVlJzogdHJ1ZSxcclxuICAndHJ1ZSc6IHRydWVcclxufTtcclxuXHJcbi8vIE1hcCB0ZXh0IHBvc2l0aW9uIG5hbWVzIHRvIG11bHRpcGxlIENTUyBwcm9wZXJ0aWVzLFxyXG4vLyBiZWNhdXNlICdzdXBlcicgYW5kICdzdWInIHZhbHVlcyBvZiAndmVydGljYWwtYWxpZ24nIHByb3BlcnR5IGFyZSBub3QgZW5vdWdoXHJcbnZhciB0ZXh0UG9zaXRpb25NYXAgPSB7XHJcbiAgJ1N1cGVyc2NyaXB0Jzoge1xyXG4gICAgJ2ZvbnQtc2l6ZSc6ICcwLjhlbScsXHJcbiAgICAndmVydGljYWwtYWxpZ24nOiAnMC42ZW0nXHJcbiAgfSxcclxuICAnU3Vic2NyaXB0Jzoge1xyXG4gICAgJ2ZvbnQtc2l6ZSc6ICcwLjhlbScsXHJcbiAgICAndmVydGljYWwtYWxpZ24nOiAnLTAuM2VtJ1xyXG4gIH0sXHJcbiAgJ05vcm1hbCc6IHtcclxuICAgICdmb250LXNpemUnOiAnaW5oZXJpdCcsXHJcbiAgICAndmVydGljYWwtYWxpZ24nOiAnaW5oZXJpdCdcclxuICB9XHJcbn07XHJcblxyXG52YXIgU3R5bGVzTWFwID0ge1xyXG4gICd0ZXh0Y29sb3InOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdCgnLCcpLFxyXG4gICAgICAgIHJnYlJlZ2V4cCA9IC8oXlxccyooXFxkKylcXHMqLFxccyooXFxkKylcXHMqLFxccyooXFxkKylcXHMqKSQvaSxcclxuICAgICAgICByZ2JUZXN0LCByZ2JUZXh0O1xyXG5cclxuICAgIC8vIEluIGNhc2UgVGV4dENvbG9yIGZvcm1hdCBpcyAnXCJUZXh0Q29sb3JcIjogXCIwLCAxMTIsIDQ4LCAxNjBcIidcclxuICAgIGlmICh2YWx1ZXMubGVuZ3RoID4gMykge1xyXG4gICAgICB2YWx1ZXMuc2hpZnQoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBcIlRleHRDb2xvclwiOlwiVHJhbnNwYXJlbnRcIlxyXG4gICAgLy8gaXQgaGFwcGVucyB3aGVuIHdoaXRlIHRleHQgaGFzIGJhY2tncm91bmQgY29sb3IgaW4gYSBNUyBXb3JkIGRvY3VtZW50XHJcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiB2YWx1ZS50b0xvd2VyQ2FzZSgpID09PSAndHJhbnNwYXJlbnQnKSB7XHJcbiAgICAgIHZhbHVlID0gJ3JnYigyNTUsIDI1NSwgMjU1KSc7XHJcbiAgICB9XHJcblxyXG4gICAgcmdiVGV4dCA9IHZhbHVlcy50b1N0cmluZygpO1xyXG4gICAgcmdiVGVzdCA9IHJnYlRleHQubWF0Y2gocmdiUmVnZXhwKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAnY29sb3InOiByZ2JUZXN0ID8gJ3JnYignICsgcmdiVGV4dCArICcpJyA6IHZhbHVlLnRvTG93ZXJDYXNlKClcclxuICAgIH07XHJcbiAgfSxcclxuXHJcbiAgJ2ZvbnRzaXplJzogZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICB2YXIgc3RyID0gdmFsdWUubWF0Y2goL1xccyooXFxkezEsM30pcHgvKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAnZm9udC1zaXplJzogc3RyID8gdmFsdWUgOiB2YWx1ZSArICdweCdcclxuICAgIH07XHJcbiAgfSxcclxuXHJcbiAgJ2JvbGQnOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICdmb250LXdlaWdodCc6IHZhbHVlID8gJ2JvbGQnIDogJ25vcm1hbCdcclxuICAgIH07XHJcbiAgfSxcclxuXHJcbiAgJ2l0YWxpYyc6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgJ2ZvbnQtc3R5bGUnOiB2YWx1ZSA/ICdpdGFsaWMnIDogJ25vbmUnXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG4gICdmb250bmFtZSc6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgJ2ZvbnQtZmFtaWx5JzogdmFsdWVcclxuICAgIH07XHJcbiAgfSxcclxuXHJcbiAgJ3VuZGVybGluZSc6IGZ1bmN0aW9uICh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgJ3RleHQtZGVjb3JhdGlvbic6IGJvb2xlYW5NYXBbdmFsdWVdID8gJ3VuZGVybGluZScgOiAnbm9uZSdcclxuICAgIH07XHJcbiAgfSxcclxuXHJcbiAgJ3N0cmlrZXRocm91Z2gnOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgICd0ZXh0LWRlY29yYXRpb24nOiBib29sZWFuTWFwW3ZhbHVlXSA/ICdsaW5lLXRocm91Z2gnIDogJ25vbmUnXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG4gICd0ZXh0cG9zaXRpb24nOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHJldHVybiB0ZXh0UG9zaXRpb25NYXBbdmFsdWVdO1xyXG4gIH0sXHJcblxyXG4gICdiYWNrZ3JvdW5kY29sb3InOiBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgIHZhciB2YWx1ZXMgPSB2YWx1ZS5zcGxpdCgnLCcpLFxyXG4gICAgICAgIHJnYlJlZ2V4cCA9IC8oXlxccyooXFxkKylcXHMqLFxccyooXFxkKylcXHMqLFxccyooXFxkKylcXHMqKSQvaSxcclxuICAgICAgICByZ2JUZXN0LCByZ2JUZXh0O1xyXG5cclxuICAgIC8vIEluIGNhc2UgVGV4dENvbG9yIGZvcm1hdCBpcyAnXCJUZXh0Q29sb3JcIjogXCIwLCAxMTIsIDQ4LCAxNjBcIidcclxuICAgIGlmICh2YWx1ZXMubGVuZ3RoID4gMykge1xyXG4gICAgICB2YWx1ZXMuc2hpZnQoKTtcclxuICAgIH1cclxuXHJcbiAgICByZ2JUZXh0ID0gdmFsdWVzLnRvU3RyaW5nKCk7XHJcbiAgICByZ2JUZXN0ID0gcmdiVGV4dC5tYXRjaChyZ2JSZWdleHApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgICdiYWNrZ3JvdW5kLWNvbG9yJzogcmdiVGVzdCA/ICdyZ2IoJyArIHJnYlRleHQgKyAnKScgOiB2YWx1ZS50b0xvd2VyQ2FzZSgpXHJcbiAgICB9O1xyXG4gIH0sXHJcblxyXG4gICdzaGFkb3cnOiBmdW5jdGlvbiAoKSB7fSxcclxuICAncnN0eWxlJzogZnVuY3Rpb24gKCkge30sXHJcbiAgJ3cxNDpwcnN0ZGFzaCc6IGZ1bmN0aW9uICgpIHt9LFxyXG4gICd3MTQ6cmVmbGVjdGlvbic6IGZ1bmN0aW9uICgpIHt9LFxyXG4gICd3MTQ6Z2xvdyc6IGZ1bmN0aW9uICgpIHt9LFxyXG4gICdmb250dGhlbWUnOiBmdW5jdGlvbiAoKSB7fSxcclxuICAndzE0OnByb3BzM2QnOiBmdW5jdGlvbiAoKSB7fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTdHlsZXNNYXA7IiwiLyogRmlsZTogVGFnQ29udGVudEJ1aWxkZXIuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyByZXF1aXJlLCBtb2R1bGUgKi9cclxuXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbnZhciBzdHJhdGVnaWVzID0ge1xyXG4gIG5vbmU6IGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDgyMDQpO1xyXG4gIH0sXHJcblxyXG4gIGlkOiBmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgcmV0dXJuIGRhdGEudGFnUGFpckRlZmluaXRpb25JZCB8fCBkYXRhLnBsYWNlaG9sZGVyVGFnRGVmaW5pdGlvbklkO1xyXG4gIH0sXHJcblxyXG4gIHBhcnRpYWw6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoZGF0YS50eXBlID09PSAndGFnUGFpcicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0YWdTdGFydDogZGF0YS5zdGFydFRhZ0Rpc3BsYXlUZXh0LFxyXG4gICAgICAgIHRhZ0VuZDogZGF0YS5lbmRUYWdEaXNwbGF5VGV4dFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkYXRhLmRpc3BsYXlUZXh0O1xyXG4gIH0sXHJcblxyXG4gIGZ1bGw6IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICBpZiAoZGF0YS50eXBlID09PSAndGFnUGFpcicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0YWdTdGFydDogZGF0YS5zdGFydFRhZ0NvbnRlbnQsXHJcbiAgICAgICAgdGFnRW5kOiBkYXRhLmVuZFRhZ0NvbnRlbnRcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZGF0YS50YWdDb250ZW50O1xyXG4gIH1cclxufTtcclxuXHJcbnZhciBUYWdDb250ZW50QnVpbGRlciA9IGZ1bmN0aW9uIChzdHJhdGVneSkge1xyXG4gIHRoaXMuc3RyYXRlZ3kgPSBzdHJhdGVnaWVzW3N0cmF0ZWd5XTtcclxufTtcclxuXHJcblRhZ0NvbnRlbnRCdWlsZGVyLnByb3RvdHlwZS5idWlsZCA9IGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgcmV0dXJuIHRoaXMuc3RyYXRlZ3koZGF0YSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRhZ0NvbnRlbnRCdWlsZGVyOyIsIi8qIEZpbGU6IE5vZGVXYWxrZXIuanMgKi9cclxuLyoganNoaW50IHVuZGVmOiB0cnVlLCB1bnVzZWQ6IHRydWUgKi9cclxuLyogZ2xvYmFscyAkLCBtb2R1bGUsIHJlcXVpcmUgKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxudmFyIFRtcGwgPSByZXF1aXJlKCcuLi9UbXBsJyk7XHJcblxyXG52YXIgTm9kZVdhbGtlciA9IGZ1bmN0aW9uIChub2RlKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgbWUuZWwgPSBub2RlO1xyXG4gIG1lLnJldHVybk5vZGUgPSBudWxsO1xyXG59O1xyXG5cclxudmFyIHByb3RvID0gTm9kZVdhbGtlci5wcm90b3R5cGU7XHJcblxyXG5wcm90by50YWdJZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBlbCA9IG1lLmVsO1xyXG5cclxuICBpZiAobWUuaXNOdWxsKCkgfHwgbWUuaXNUZXh0Tm9kZSgpKSB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcblxyXG4gIHJldHVybiBlbC5kYXRhc2V0LmlkO1xyXG59O1xyXG5cclxucHJvdG8uaXNTZWdtZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIGlmIChtZS5pc051bGwoKSB8fCBtZS5pc1RleHROb2RlKCkpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiBtZS5lbC5jbGFzc0xpc3QuY29udGFpbnMoJ3VlLXNlZ21lbnQnKTtcclxufTtcclxuXHJcbnByb3RvLmlzSW5saW5lQ29udGVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBpZiAobWUuaXNOdWxsKCkgfHwgbWUuaXNUZXh0Tm9kZSgpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd1ZS1pbmxpbmUtY29udGVudCcpO1xyXG59O1xyXG5cclxucHJvdG8uaXNUZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIGlmIChtZS5pc051bGwoKSB8fCBtZS5pc1RleHROb2RlKCkpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiBtZS5lbC5jbGFzc0xpc3QuY29udGFpbnMoJ3VlLXRleHQnKTtcclxufTtcclxuXHJcbnByb3RvLmlzVGV4dE5vZGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgaWYgKG1lLmlzTnVsbCgpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwubm9kZVR5cGUgPT09IDM7XHJcbn07XHJcblxyXG5wcm90by5pc1RhZ1BhaXJDb250YWluZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgaWYgKG1lLmlzTnVsbCgpIHx8IG1lLmlzVGV4dE5vZGUoKSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG1lLmVsLmNsYXNzTGlzdC5jb250YWlucygndWUtdGFncGFpci1jb250ZW50Jyk7XHJcbn07XHJcblxyXG5wcm90by5pc1RhZyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBpZiAobWUuaXNOdWxsKCkgfHwgbWUuaXNUZXh0Tm9kZSgpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCd1ZS10YWctd3JhcHBlcicpO1xyXG59O1xyXG5cclxucHJvdG8uaXNTdGFydFRhZyA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBpZiAobWUuaXNOdWxsKCkgfHwgbWUuaXNUZXh0Tm9kZSgpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwuZGF0YXNldC50eXBlID09PSAnc3RhcnQtdGFnJztcclxufTtcclxuXHJcbnByb3RvLmlzRW5kVGFnID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIGlmIChtZS5pc051bGwoKSB8fCBtZS5pc1RleHROb2RlKCkpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIHJldHVybiBtZS5lbC5kYXRhc2V0LnR5cGUgPT09ICdlbmQtdGFnJztcclxufTtcclxuXHJcbnByb3RvLmlzUGxhY2Vob2xkZXIgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgaWYgKG1lLmlzTnVsbCgpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwuZGF0YXNldC50eXBlID09PSAncGxhY2Vob2xkZXInO1xyXG59O1xyXG5cclxucHJvdG8uY2FuSGlkZSA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBpZiAobWUuaXNOdWxsKCkgfHwgbWUuaXNUZXh0Tm9kZSgpKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwuZGF0YXNldC5jYW5IaWRlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIExvb3Agb3ZlciBwYXJlbnRzIGFuZCByZXR1cm4gdHJ1ZSBpZiBpc0xva2VkIHByb3BlcnR5IGlzIHNldFxyXG4gKiBAcmV0dXJuIHtCb29sZWFufSByZXR1cm5zIHRydWUgaWYgZWxlbWVudCBvciBwYXJlbnQgaXMgbG9ja2VkXHJcbiAqL1xyXG5wcm90by5pc0xvY2tlZCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBub2RlID0gbWUuZWwsXHJcbiAgICAgIGlzTG9ja2VkID0gKG5vZGUuaGFzT3duUHJvcGVydHkoJ2RhdGFzZXQnKSAmJiBub2RlLmRhdGFzZXQuaXNMb2NrZWQpID8gbm9kZS5kYXRhc2V0LmlzTG9ja2VkIDogZmFsc2U7XHJcblxyXG4gIHdoaWxlICghaXNMb2NrZWQgJiYgbm9kZS5ub2RlVHlwZSAhPT0gOSkge1xyXG4gICAgaXNMb2NrZWQgPSAobm9kZS5oYXNPd25Qcm9wZXJ0eSgnZGF0YXNldCcpICYmIG5vZGUuZGF0YXNldC5pc0xvY2tlZCkgPyBub2RlLmRhdGFzZXQuaXNMb2NrZWQgOiBmYWxzZTtcclxuICAgIG5vZGUgPSBub2RlLnBhcmVudE5vZGU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaXNMb2NrZWQ7XHJcbn07XHJcblxyXG5wcm90by5pc1dyYXBwZXJGb3IgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWw7XHJcblxyXG4gIHJldHVybiBlbCA9PT0gbm9kZTtcclxufTtcclxuXHJcblxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIGN1cnNvciBpcyBpbiBhbiBlbXB0eSBzZWdtZW50XHJcbiAqIHRoYXQgY29udGFpbnMgb25seSBaZXJvIFdpZHRoIE5vbi1Kb2luZXIgY2hhclxyXG4gKlxyXG4gKiBAcmV0dXJuIHtCb29sZWFufSB0cnVlIGlmIGl0J3MgYW4gZW1wdHkgc2VnbWVudFxyXG4gKi9cclxucHJvdG8uaXNJbnZpc2libGVDaGFyID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWwsXHJcbiAgICAgIHRtcGwgPSBUbXBsLFxyXG4gICAgICB0ZXh0Q29udGVudCA9IGVsLnRleHRDb250ZW50LFxyXG4gICAgICBpc0ludmlzaWJsZUNoYXI7XHJcblxyXG4gIGlzSW52aXNpYmxlQ2hhciA9IHRleHRDb250ZW50Lmxlbmd0aCA9PT0gMSAmJlxyXG4gICAgdGV4dENvbnRlbnQuY2hhckNvZGVBdCgwKSA9PT0gdG1wbC56ZXJvV2lkdGhOb25Kb2luZXJDaGFyQ29kZTtcclxuXHJcbiAgcmV0dXJuIGlzSW52aXNpYmxlQ2hhcjtcclxufTtcclxuXHJcblxyXG5wcm90by5pc0VsZW1lbnQgPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWwsXHJcbiAgICAgIGlzRWxlbWVudFR5cGUgPSBtZS5lbC5ub2RlVHlwZSA9PT0gMSxcclxuICAgICAgY2hlY2tOYW1lID0gbmFtZSAhPT0gdW5kZWZpbmVkICYmIG5hbWUgIT09IG51bGwsXHJcbiAgICAgIHJlc3VsdDtcclxuXHJcbiAgcmVzdWx0ID0gaXNFbGVtZW50VHlwZTtcclxuICBpZiAoY2hlY2tOYW1lKSB7XHJcbiAgICByZXN1bHQgPSByZXN1bHQgJiYgZWwubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gbmFtZTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXN1bHQ7XHJcbn07XHJcblxyXG5wcm90by5pc051bGwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgcmV0dXJuIG1lLmVsID09PSBudWxsIHx8IG1lLmVsID09PSB1bmRlZmluZWQ7XHJcbn07XHJcblxyXG5wcm90by5oYXNDaGlsZHJlbiA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBjaGlsZE5vZGVzID0gbWUuZWwuY2hpbGROb2RlcztcclxuXHJcbiAgcmV0dXJuIGNoaWxkTm9kZXMubGVuZ3RoICE9PSAwO1xyXG59O1xyXG5cclxucHJvdG8uZXF1YWxzID0gZnVuY3Rpb24gKG5vZGVXYWxrZXIpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBpZiAobWUuaXNOdWxsKCkgJiYgbm9kZVdhbGtlci5pc051bGwoKSkge1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gbWUuZWwgPT09IG5vZGVXYWxrZXIuZWw7XHJcbn07XHJcblxyXG5wcm90by50ZXh0Q29udGVudCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBlbCA9IG1lLmVsO1xyXG5cclxuICByZXR1cm4gZWwudGV4dENvbnRlbnQ7XHJcbn07XHJcblxyXG5wcm90by5wYXJlbnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgcmV0dXJuTm9kZSA9IG1lLmVsLFxyXG4gICAgICB3YWxrZXI7XHJcblxyXG4gIHdhbGtlciA9IG5ldyBOb2RlV2Fsa2VyKG1lLmVsLnBhcmVudE5vZGUpO1xyXG4gIHdhbGtlci5yZXR1cm5Ob2RlID0gcmV0dXJuTm9kZTtcclxuXHJcbiAgcmV0dXJuIHdhbGtlcjtcclxufTtcclxuXHJcbnByb3RvLnJldHVyblRvUHJldmlvdXMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgcmV0dXJuTm9kZSA9IG1lLmVsLFxyXG4gICAgICB3YWxrZXI7XHJcblxyXG4gIHdhbGtlciA9IG5ldyBOb2RlV2Fsa2VyKG1lLnJldHVybk5vZGUpO1xyXG4gIHdhbGtlci5yZXR1cm5Ob2RlID0gcmV0dXJuTm9kZTtcclxuXHJcbiAgcmV0dXJuIHdhbGtlcjtcclxufTtcclxuXHJcbnByb3RvLm5leHQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgcmV0dXJuTm9kZSA9IG1lLmVsLFxyXG4gICAgICB3YWxrZXI7XHJcblxyXG4gIHdhbGtlciA9IG5ldyBOb2RlV2Fsa2VyKG1lLmVsLm5leHRTaWJsaW5nKTtcclxuICB3YWxrZXIucmV0dXJuTm9kZSA9IHJldHVybk5vZGU7XHJcblxyXG4gIHJldHVybiB3YWxrZXI7XHJcbn07XHJcblxyXG5wcm90by5wcmV2ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIHJldHVybk5vZGUgPSBtZS5lbCxcclxuICAgICAgd2Fsa2VyO1xyXG5cclxuICB3YWxrZXIgPSBuZXcgTm9kZVdhbGtlcihtZS5lbC5wcmV2aW91c1NpYmxpbmcpO1xyXG4gIHdhbGtlci5yZXR1cm5Ob2RlID0gcmV0dXJuTm9kZTtcclxuXHJcbiAgcmV0dXJuIHdhbGtlcjtcclxufTtcclxuXHJcbnByb3RvLnJlbW92ZSA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBwYXJlbnQgPSBtZS5lbC5wYXJlbnROb2RlO1xyXG4gIHBhcmVudC5yZW1vdmVDaGlsZChtZS5lbCk7XHJcbn07XHJcblxyXG5wcm90by5maXJzdENoaWxkID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWwsXHJcbiAgICAgIGZpcnN0Q2hpbGQgPSBtZS5lbC5maXJzdENoaWxkLFxyXG4gICAgICB3YWxrZXI7XHJcblxyXG4gIHdhbGtlciA9IG5ldyBOb2RlV2Fsa2VyKGZpcnN0Q2hpbGQpO1xyXG4gIHdhbGtlci5yZXR1cm5Ob2RlID0gZWw7XHJcblxyXG4gIHJldHVybiB3YWxrZXI7XHJcbn07XHJcblxyXG5wcm90by5sYXN0Q2hpbGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgZWwgPSBtZS5lbCxcclxuICAgICAgbGFzdENoaWxkID0gbWUuZWwubGFzdENoaWxkLFxyXG4gICAgICB3YWxrZXI7XHJcblxyXG4gIHdhbGtlciA9IG5ldyBOb2RlV2Fsa2VyKGxhc3RDaGlsZCk7XHJcbiAgd2Fsa2VyLnJldHVybk5vZGUgPSBlbDtcclxuXHJcbiAgcmV0dXJuIHdhbGtlcjtcclxufTtcclxuXHJcbnByb3RvLnJlcGxhY2VXaXRoSW5uZXJDb250ZW50ID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgICRlbCA9ICQobWUuZWwpO1xyXG5cclxuICAkZWwucmVwbGFjZVdpdGgoJGVsLmNoaWxkcmVuKCkpO1xyXG5cclxuICBtZS5lbCA9IG51bGw7XHJcbn07XHJcblxyXG5wcm90by5pbnNlcnRCZWZvcmUgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWwsXHJcbiAgICAgIHBhcmVudCA9IGVsLnBhcmVudE5vZGUsXHJcbiAgICAgIG5vZGVFbDtcclxuXHJcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBOb2RlV2Fsa2VyKSB7XHJcbiAgICBub2RlRWwgPSBub2RlLmVsO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBub2RlRWwgPSBub2RlO1xyXG4gIH1cclxuXHJcbiAgcGFyZW50Lmluc2VydEJlZm9yZShub2RlRWwsIGVsKTtcclxufTtcclxuXHJcbnByb3RvLmluc2VydEFmdGVyID0gZnVuY3Rpb24gKG5vZGUpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBlbCA9IG1lLmVsLFxyXG4gICAgICBwYXJlbnQgPSBlbC5wYXJlbnROb2RlLFxyXG4gICAgICBuZXh0U2libGluZyA9IGVsLm5leHRTaWJsaW5nLFxyXG4gICAgICBub2RlRWw7XHJcblxyXG4gIGlmIChub2RlIGluc3RhbmNlb2YgTm9kZVdhbGtlcikge1xyXG4gICAgbm9kZUVsID0gbm9kZS5lbDtcclxuICB9IGVsc2Uge1xyXG4gICAgbm9kZUVsID0gbm9kZTtcclxuICB9XHJcblxyXG4gIHBhcmVudC5pbnNlcnRCZWZvcmUobm9kZUVsLCBuZXh0U2libGluZyk7XHJcbn07XHJcblxyXG5wcm90by5hcHBlbmQgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWwsXHJcbiAgICAgIG5vZGVFbDtcclxuXHJcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBOb2RlV2Fsa2VyKSB7XHJcbiAgICBub2RlRWwgPSBub2RlLmVsO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBub2RlRWwgPSBub2RlO1xyXG4gIH1cclxuXHJcbiAgZWwuYXBwZW5kQ2hpbGQobm9kZUVsKTtcclxufTtcclxuXHJcbnByb3RvLnByZXBlbmQgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWwsXHJcbiAgICAgIG5vZGVFbDtcclxuXHJcbiAgaWYgKG5vZGUgaW5zdGFuY2VvZiBOb2RlV2Fsa2VyKSB7XHJcbiAgICBub2RlRWwgPSBub2RlLmVsO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBub2RlRWwgPSBub2RlO1xyXG4gIH1cclxuXHJcbiAgZWwuaW5zZXJ0QmVmb3JlKG5vZGVFbCwgZWwuZmlyc3RDaGlsZCk7XHJcbn07XHJcblxyXG5wcm90by5zZWdtZW50TnVtYmVyID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWw7XHJcblxyXG4gIHJldHVybiBlbC5kYXRhc2V0LnNlZ21lbnROdW1iZXI7XHJcbn07XHJcblxyXG5wcm90by5zZXRDYW5Db3B5ID0gZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgZWwgPSBtZS5lbDtcclxuICBlbC5kYXRhc2V0LmNhbkNvcHkgPSB2YWx1ZTtcclxufTtcclxuXHJcbnByb3RvLmNhbkNvcHkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgZWwgPSBtZS5lbDtcclxuICByZXR1cm4gZWwuZGF0YXNldC5jYW5Db3B5O1xyXG59O1xyXG5cclxucHJvdG8uaGFzQ2xhc3MgPSBmdW5jdGlvbiAoY3NzQ2xhc3MpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBlbCA9IG1lLmVsO1xyXG5cclxuICByZXR1cm4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKGNzc0NsYXNzKTtcclxufTtcclxuXHJcbnByb3RvLmFkZENsYXNzID0gZnVuY3Rpb24gKGNzc0NsYXNzKSB7XHJcbiAgdmFyIG1lID0gdGhpcyxcclxuICAgICAgZWwgPSBtZS5lbDtcclxuXHJcbiAgZWwuY2xhc3NMaXN0LmFkZChjc3NDbGFzcyk7XHJcbn07XHJcblxyXG5wcm90by5yZW1vdmVDbGFzcyA9IGZ1bmN0aW9uIChjc3NDbGFzcykge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGVsID0gbWUuZWw7XHJcbiAgZWwuY2xhc3NMaXN0LnJlbW92ZShjc3NDbGFzcyk7XHJcbn07XHJcblxyXG5wcm90by5mb3JFYWNoQ2hpbGQgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICB3YWxrZXIgPSBtZS5maXJzdENoaWxkKCk7XHJcblxyXG4gIHdoaWxlICghd2Fsa2VyLmlzTnVsbCgpKSB7XHJcbiAgICBjYWxsYmFjayh3YWxrZXIpO1xyXG5cclxuICAgIHdhbGtlciA9IHdhbGtlci5uZXh0KCk7XHJcbiAgfVxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGVXYWxrZXI7IiwiLyogRmlsZTogU2VsZWN0aW9uQ29udGV4dC5qcyAqL1xyXG4vKiBqc2hpbnQgdW5kZWY6IHRydWUsIHVudXNlZDogdHJ1ZSAqL1xyXG4vKiBnbG9iYWxzIHJlcXVpcmUsIG1vZHVsZSAqL1xyXG4ndXNlIHN0cmljdCc7XHJcblxyXG52YXIgVGV4dE5vZGVUeXBlID0gMztcclxudmFyIEVsZW1lbnROb2RlVHlwZSA9IDE7XHJcblxyXG52YXIgU2VsZWN0aW9uQ29udGV4dCA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzO1xyXG5cclxuICBtZS5zZWxlY3Rpb24gPSBkb2N1bWVudC5nZXRTZWxlY3Rpb24oKTtcclxuICBtZS5yYW5nZSA9IG1lLnNlbGVjdGlvbi5nZXRSYW5nZUF0KDApO1xyXG5cclxuICBtZS5jb21tb25BbmNlc3RvckNvbnRhaW5lciA9IG1lLnJhbmdlLmNvbW1vbkFuY2VzdG9yQ29udGFpbmVyO1xyXG4gIG1lLnN0YXJ0Q29udGFpbmVyID0gbWUucmFuZ2Uuc3RhcnRDb250YWluZXI7XHJcbiAgbWUuc3RhcnRPZmZzZXQgPSBtZS5yYW5nZS5zdGFydE9mZnNldDtcclxuICBtZS5lbmRDb250YWluZXIgPSBtZS5yYW5nZS5lbmRDb250YWluZXI7XHJcbiAgbWUuZW5kT2Zmc2V0ID0gbWUucmFuZ2UuZW5kT2Zmc2V0O1xyXG5cclxuICBtZS5mb2N1c05vZGUgPSBtZS5zZWxlY3Rpb24uZm9jdXNOb2RlO1xyXG4gIG1lLmZvY3VzT2Zmc2V0ID0gbWUuc2VsZWN0aW9uLmZvY3VzT2Zmc2V0O1xyXG4gIG1lLmZvY3VzTm9kZVBhcmVudHMgPSBbXTtcclxuXHJcbiAgbWUuaGFzRm9jdXNOb2RlUGFyZW50ID0gbWUuZm9jdXNOb2RlICE9PSBudWxsICYmIG1lLmZvY3VzTm9kZS5wYXJlbnROb2RlICE9PSBudWxsO1xyXG4gIGlmIChtZS5oYXNGb2N1c05vZGVQYXJlbnQpIHtcclxuICAgIG1lLmZvY3VzTm9kZVBhcmVudCA9IG1lLmZvY3VzTm9kZS5wYXJlbnROb2RlO1xyXG4gIH1cclxuXHJcbiAgbWUuaXNGb2N1c1RleHROb2RlID0gbWUuZm9jdXNOb2RlLm5vZGVUeXBlID09PSBUZXh0Tm9kZVR5cGU7XHJcbiAgbWUuaXNTdGFydENvbnRhaW5lclRleHROb2RlID0gbWUuc3RhcnRDb250YWluZXIubm9kZVR5cGUgPT09IFRleHROb2RlVHlwZTtcclxuICBtZS5pc0VuZENvbnRhaW5lclRleHROb2RlID0gbWUuZW5kQ29udGFpbmVyLm5vZGVUeXBlID09PSBUZXh0Tm9kZVR5cGU7XHJcbn07XHJcblxyXG52YXIgcHJvdG8gPSBTZWxlY3Rpb25Db250ZXh0LnByb3RvdHlwZTtcclxuXHJcbnByb3RvLmlzQ29sbGFwc2VkID0gZnVuY3Rpb24gKCkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcbiAgcmV0dXJuIG1lLnJhbmdlLmNvbGxhcHNlZDtcclxufTtcclxuXHJcbnByb3RvLmNsb25lQ29udGVudHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuICByZXR1cm4gbWUucmFuZ2UuY2xvbmVDb250ZW50cygpO1xyXG59O1xyXG5cclxucHJvdG8uZGVsZXRlQ29udGVudHMgPSBmdW5jdGlvbiAoKSB7XHJcbiAgdmFyIG1lID0gdGhpcztcclxuXHJcbiAgbWUucmFuZ2UuZGVsZXRlQ29udGVudHMoKTtcclxufTtcclxuXHJcbnByb3RvLmluc2VydE5vZGUgPSBmdW5jdGlvbiAobm9kZSkge1xyXG4gIHZhciBtZSA9IHRoaXM7XHJcblxyXG4gIG1lLnJhbmdlLmluc2VydE5vZGUobm9kZSk7XHJcbn07XHJcblxyXG5wcm90by5oYXNDb21tb25BbmNlc3RvckNsYXNzID0gZnVuY3Rpb24gKGNsYXNzTmFtZSkge1xyXG4gIHZhciBtZSA9IHRoaXMsXHJcbiAgICAgIGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID0gbWUuY29tbW9uQW5jZXN0b3JDb250YWluZXIsXHJcbiAgICAgIHJlc3VsdDtcclxuXHJcbiAgaWYgKGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyLm5vZGVUeXBlID09PSAzIHx8IGNvbW1vbkFuY2VzdG9yQ29udGFpbmVyID09PSBudWxsKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICByZXN1bHQgPSBjb21tb25BbmNlc3RvckNvbnRhaW5lci5jbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKTtcclxuICByZXR1cm4gcmVzdWx0O1xyXG59O1xyXG5cclxucHJvdG8uY2hhbmdlUmFuZ2UgPSBmdW5jdGlvbiAoY2hhbmdlQ2FsbGJhY2spIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgc2VsZWN0aW9uID0gbWUuc2VsZWN0aW9uLFxyXG4gICAgbmV3UmFuZ2UgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xyXG5cclxuICBpZiAoIWNoYW5nZUNhbGxiYWNrKSB7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBpZighY2hhbmdlQ2FsbGJhY2sobmV3UmFuZ2UpKXtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIHNlbGVjdGlvbi5yZW1vdmVBbGxSYW5nZXMoKTtcclxuICBzZWxlY3Rpb24uYWRkUmFuZ2UobmV3UmFuZ2UpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rpb25Db250ZXh0OyIsIi8qIEZpbGU6IE1vdXNlQ3RybENsaWNrSGFuZGxlcl90ZXN0LmpzICovXHJcbi8qIGpzaGludCB1bmRlZjogdHJ1ZSwgdW51c2VkOiB0cnVlICovXHJcbid1c2Ugc3RyaWN0JztcclxudmFyIE5vZGVXYWxrZXIgPSByZXF1aXJlKCcuL05vZGVXYWxrZXInKTtcclxuXHJcbnZhciBwcm90bztcclxuLypcclxuICogQ3JlYXRlcyBhIHRhZyBwYWlyIGZvcm1lZCBvZiBzdGFydC10YWcsXHJcbiAqIGVuZC10YWcsIGlubmVyLWNvbnRlbnQuXHJcbiAqIEBwYXJhbSB7SFRNTE5vZGV9IGVsIC0gY2FuIGJlIGFueSBzdGFydC10YWcsIGlubGluZS1jb250ZW50LFxyXG4gKiBvciBlbmQtdGFnXHJcbiAqL1xyXG5mdW5jdGlvbiBUYWdQYWlyKGVsKSB7XHJcbiAgaWYgKGVsIGluc3RhbmNlb2YgTm9kZVdhbGtlcikge1xyXG4gICAgZWwgPSBlbC5lbDtcclxuICB9XHJcbiAgdGhpcy5lbCA9IGVsO1xyXG4gIHRoaXMud2Fsa2VyID0gbmV3IE5vZGVXYWxrZXIoZWwpO1xyXG5cclxuICB0aGlzLnZhbGlkID0gKCF0aGlzLndhbGtlci5pc1BsYWNlaG9sZGVyKCkpICYmICh0aGlzLndhbGtlci5pc1RhZygpIHx8IHRoaXMud2Fsa2VyLmlzVGFnUGFpckNvbnRhaW5lcigpKTtcclxuXHJcbiAgaWYgKHRoaXMud2Fsa2VyLmlzU3RhcnRUYWcoKSkge1xyXG4gICAgdGhpcy5wcm9jZXNzRnJvbVN0YXJ0VGFnKCk7XHJcbiAgfSBlbHNlIGlmICh0aGlzLndhbGtlci5pc1RhZ1BhaXJDb250YWluZXIoKSkge1xyXG4gICAgdGhpcy5wcm9jZXNzRnJvbVRhZ1BhaXJDb250YWluZXIoKTtcclxuICB9IGVsc2UgaWYgKHRoaXMud2Fsa2VyLmlzRW5kVGFnKCkpIHtcclxuICAgIHRoaXMucHJvY2Vzc0Zyb21FbmRUYWcoKTtcclxuICB9XHJcbn1cclxucHJvdG8gPSBUYWdQYWlyLnByb3RvdHlwZTtcclxuLypcclxuICogQHJldHVybnMge2Jvb2xlYW59XHJcbiAqL1xyXG5wcm90by5pc1ZhbGlkID0gZnVuY3Rpb24gKCkge1xyXG4gIHJldHVybiB0aGlzLnZhbGlkO1xyXG59O1xyXG5cclxucHJvdG8ucHJvY2Vzc0Zyb21TdGFydFRhZyA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLnN0YXJ0VGFnRWwgPSB0aGlzLndhbGtlci5lbDtcclxuICB0aGlzLndhbGtlciA9IHRoaXMud2Fsa2VyLm5leHQoKTtcclxuICB0aGlzLmlubGluZUNvbnRlbnRFbCA9IHRoaXMud2Fsa2VyLmVsO1xyXG4gIHRoaXMud2Fsa2VyID0gdGhpcy53YWxrZXIubmV4dCgpO1xyXG4gIHRoaXMuZW5kVGFnRWwgPSB0aGlzLndhbGtlci5lbDtcclxufTtcclxuXHJcbnByb3RvLnByb2Nlc3NGcm9tVGFnUGFpckNvbnRhaW5lciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLndhbGtlciA9IHRoaXMud2Fsa2VyLnByZXYoKTtcclxuICB0aGlzLnByb2Nlc3NGcm9tU3RhcnRUYWcoKTtcclxufTtcclxuXHJcbnByb3RvLnByb2Nlc3NGcm9tRW5kVGFnID0gZnVuY3Rpb24gKCkge1xyXG4gIHRoaXMud2Fsa2VyID0gdGhpcy53YWxrZXIucHJldigpO1xyXG4gIHRoaXMucHJvY2Vzc0Zyb21UYWdQYWlyQ29udGFpbmVyKCk7XHJcbn07XHJcbi8qXHJcbiAqIGNsb25lcyB0aGUgVGFnIFBhaXIgc3RydWN0dXJlXHJcbiAqIEByZXR1cm5zIHtEb2N1bWVudEZyYWdtZW50fSBkb2N1bWVudEZyYWdtZW50XHJcbiAqL1xyXG5wcm90by5jbG9uZVN0cnVjdHVyZSA9IGZ1bmN0aW9uICgpIHtcclxuICB2YXIgbWUgPSB0aGlzLFxyXG4gICAgICBzdGFydFRhZ0Nsb25lLFxyXG4gICAgICBpbmxpbmVDb250ZW50Q2xvbmUsXHJcbiAgICAgIGVuZFRhZ0Nsb25lLFxyXG4gICAgICBkb2N1bWVudEZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cclxuICBzdGFydFRhZ0Nsb25lID0gbWUuc3RhcnRUYWdFbC5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgaW5saW5lQ29udGVudENsb25lID0gbWUuaW5saW5lQ29udGVudEVsLmNsb25lTm9kZShmYWxzZSk7XHJcbiAgZW5kVGFnQ2xvbmUgPSBtZS5lbmRUYWdFbC5jbG9uZU5vZGUodHJ1ZSk7XHJcblxyXG4gIGRvY3VtZW50RnJhZ21lbnQuYXBwZW5kQ2hpbGQoc3RhcnRUYWdDbG9uZSk7XHJcbiAgZG9jdW1lbnRGcmFnbWVudC5hcHBlbmRDaGlsZChpbmxpbmVDb250ZW50Q2xvbmUpO1xyXG4gIGRvY3VtZW50RnJhZ21lbnQuYXBwZW5kQ2hpbGQoZW5kVGFnQ2xvbmUpO1xyXG5cclxuICByZXR1cm4gZG9jdW1lbnRGcmFnbWVudDtcclxufTtcclxuXHJcbnByb3RvLnRvQXJyYXkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgcmV0dXJuIFtcclxuICAgIHRoaXMuc3RhcnRUYWdFbCxcclxuICAgIHRoaXMuaW5saW5lQ29udGVudEVsLFxyXG4gICAgdGhpcy5lbmRUYWdFbFxyXG4gIF07XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IFRhZ1BhaXI7XHJcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
(1)
});
