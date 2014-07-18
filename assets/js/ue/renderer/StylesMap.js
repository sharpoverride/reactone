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