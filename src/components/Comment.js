/** @jsx React.DOM */
var React = require('react');
var marked = require('marked');
var Comment = React.createClass({displayName: 'Comment',
    render: function () {
        var markup = marked(this.props.children.toString());
        return (
            React.DOM.div( {className:"comment"}, 
                React.DOM.h2( {className:"commentAuthor"}, 
                    this.props.author
                ),
                React.DOM.span( {dangerouslySetInnerHTML:{__html: markup}})
            )
        );
    }
});

module.exports = Comment;