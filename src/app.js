/** File: app.js */
var React = require('react');
// var CommentBox = require('../build/components/CommentBox');
var Tracker = require('./Tracker');
var ReactSideBySideEditor = require('./components/ReactSideBySideEditor');
var Mediator = require('./Mediator');
var data = require('./model/data');
var content = document.getElementById('content');

var timoutId = setTimeout(function (){
    Mediator.emit('new-data', data);
}, 2500);

Tracker.segments = data;
window.Tracker = Tracker;

React.renderComponent(
    ReactSideBySideEditor({
      data: data
    }),
    // CommentBox({
    //     commentSubmitted: function (comment) {
    //         //setTimeout(function () {
    //         // you can add a delay if you want
    //             comment.id = data.length + 1;
    //             data.push(comment);
    //
    //             Mediator.emit('new-data', data);
    //         //}, 1000);
    //     }
    // }),

    content
);
