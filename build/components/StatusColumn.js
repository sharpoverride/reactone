/** @jsx React.DOM */
var React = require('react');

var StatusColumn = React.createClass({
  render: function () {
    var status = 'draft';

    var childNodes = this.props.segments.map( function (segment, index) {
      return (<div key={index} className="ue-cell">
        {status}
      </div>)

    });
    return (<div className="ue-status">
      {childNodes}
    </div>);
  }
});

module.exports = StatusColumn;
