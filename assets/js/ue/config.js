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