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