/** @jsx React.DOM */
var React = require('react');
var CommentList = require('./CommentList');
var CommentForm = require('./CommentForm');
var Mediator = require('../../src/Mediator');
var data = require('../../src/model/data');

var CommentBox = React.createClass({displayName: 'CommentBox',
    getInitialState: function () {
        return {data: []}
    },
    componentWillMount: function () {
        var handler = (function(data){
            this.setState({data: data});
        }).bind(this); 

        Mediator.on('new-data', handler);
    },
    handleCommentSubmit: function (comment) {
        this.props.commentSubmitted(comment);
    },
    render: function () {
        return (
            React.DOM.div( {className:"commentBox"}, 
                React.DOM.h1(null, "Comments"),
                CommentList( {data:this.state.data}),
                CommentForm( {onCommentSubmit:this.handleCommentSubmit})
            )
        );
    }
});

module.exports = CommentBox;
