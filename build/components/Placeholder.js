﻿/** @jsx React.DOM */
var React = require('react');var Placeholder = React.createClass({  render: function() {    return (      <span className="placeholder">      [{this.props.displayText}]      </span>    )  }});module.exports = Placeholder;