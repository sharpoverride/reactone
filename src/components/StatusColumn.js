/** @jsx React.DOM */
var React = require('react');

var StatusColumn = React.createClass({displayName: 'StatusColumn',
  render: function () {
    var status = 'draft';

    var childNodes = this.props.segments.map( function (segment, index) {
      return (React.DOM.div( {key:index, className:"ue-cell"}, 
        status
      ))

    });
    return (React.DOM.div( {className:"ue-status"}, 
      childNodes
    ));
  }
});

module.exports = StatusColumn;
