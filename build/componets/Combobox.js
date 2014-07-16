/** @jsx React.DOM */
var React = require('react');

var helloworld = React.createClass({displayName: 'helloworld',
    render: function () {
        return (
            React.DOM.h1(null, "Hello, world!")
        );
    }
});

module.exports = helloworld;

