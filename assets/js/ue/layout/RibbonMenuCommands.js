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