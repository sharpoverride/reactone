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