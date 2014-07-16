/** @jsx React.DOM */
var React = require('react');
var Comment = require('./Comment');

var CommentList = React.createClass({displayName: 'CommentList',
    render: function () {
        var commentNodes = this.props.data.map(function (comment) {
            return Comment( {key:comment.id, author:comment.author}, comment.text)

        });
        return (
            React.DOM.div( {className:"commentList"}, 
                commentNodes
            )
            );
    }
});

module.exports = CommentList;