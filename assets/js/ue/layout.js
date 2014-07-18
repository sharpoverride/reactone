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