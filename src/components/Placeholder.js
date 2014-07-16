/** @jsx React.DOM */
var React = require('react');var Placeholder = React.createClass({displayName: 'Placeholder',  render: function() {    return (      React.DOM.span( {className:"placeholder"}, 
      "[",this.props.displayText,"]"
      )    )  }});module.exports = Placeholder;