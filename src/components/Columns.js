/** @jsx React.DOM */
var React = require('react');var Columns = React.createClass({displayName: 'Columns',  render: function () {    var segments = this.props.segments.map(function(segment){      return (        React.DOM.div( {key:segment.id},           React.DOM.div( {className:"source", segment:segment.source}, 
          "source"
          ),          React.DOM.div( {className:"target", segment:segment.target}, 
          "target"
          )        )      )    });    return (React.DOM.div( {className:"Columns"},       segments    ));  }});module.exports = Columns;