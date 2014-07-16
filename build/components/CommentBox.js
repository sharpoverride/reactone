/** @jsx React.DOM */
var React = require('react');
var CommentList = require('./CommentList');
var CommentForm = require('./CommentForm');
var Mediator = require('../../src/Mediator');
var data = require('../../src/model/data');

var CommentBox = React.createClass({
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
            <div className="commentBox">
                <h1>Comments</h1>
                <CommentList data={this.state.data}/>
                <CommentForm onCommentSubmit={this.handleCommentSubmit}/>
            </div>
        );
    }
});

module.exports = CommentBox;
