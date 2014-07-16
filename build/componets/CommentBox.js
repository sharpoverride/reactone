/** @jsx React.DOM */
var React = require('react');

var CommentBox = React.createClass({displayName: 'CommentBox',
    render: function () {
        return (
            React.DOM.h1(null, "Hello, world!")
        );
    }
});

module.exports = CommentBox;
