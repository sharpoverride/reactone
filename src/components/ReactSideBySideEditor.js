﻿/** @jsx React.DOM */
var React = require('react');var SegmentColumns = require('./SegmentColumns');var ReactSideBySideEditor = React.createClass({displayName: 'ReactSideBySideEditor',  getInitialState: function () {    return {      data: this.props.data || []    };  },  /*  For later         <GutterColumn segments={segments}/>         <SourceColumn segments={segments}/>         <StatusColumn segments={segments}/>         <TargetColumn segments={segments}/>         <ContextInformationColumn segments={segments}/>  */  render: function() {    var segments = this.state.data.map(function(segment){      return (SegmentColumns( {segment:segment}));    });    return  (      React.DOM.div( {className:"editor"},         segments      )    )  }});module.exports = ReactSideBySideEditor;