/** @jsx React.DOM */
var React = require('react');
var marked = require('marked');
var Comment = React.createClass({
    render: function () {
        var markup = marked(this.props.children.toString());
        return (
            <div className="comment">
                <h2 className="commentAuthor">
                    {this.props.author}
                </h2>
                <span dangerouslySetInnerHTML={{__html: markup}}/>
            </div>
        );
    }
});

module.exports = Comment;