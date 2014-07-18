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