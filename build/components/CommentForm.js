/** @jsx React.DOM */
var React = require('react');

var CommentForm = React.createClass({displayName: 'CommentForm',
    handleSubmit: function() {
        var author = this.refs.author.getDOMNode().value.trim();
        var text = this.refs.text.getDOMNode().value.trim();
        if (!text || !author) {
            return false;
        }

        this.props.onCommentSubmit({author: author, text: text});

        this.refs.author.getDOMNode().value = '';
        this.refs.text.getDOMNode().value = '';
        return false;
    },
    render: function () {
        return (
           React.DOM.form( {className:"commentForm", onSubmit:this.handleSubmit}, 
           React.DOM.p(null, 
                React.DOM.input( {type:"text", placeholder:"Your name", ref:"author"})
            ),
            React.DOM.p(null, 
                React.DOM.textarea( {name:"text", cols:"60", rows:"10", placeholder:"Tell us how you feel", ref:"text"})
            ),

            React.DOM.input( {type:"submit", value:"Post"} )
          )
            );
    }
});

module.exports = CommentForm;
