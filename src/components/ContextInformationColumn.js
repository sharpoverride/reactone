/** @jsx React.DOM */
var React = require('react');var ContextInformationColumn = React.createClass({displayName: 'ContextInformationColumn',  render: function () {    var childNodes = this.props.segments.map( function (segment, index) {      return (React.DOM.div( {key:index, className:"ue-cell"}, 
        "P+"
      ))    });    return (React.DOM.div( {className:"ue-context"}    ));  }});module.exports = ContextInformationColumn;