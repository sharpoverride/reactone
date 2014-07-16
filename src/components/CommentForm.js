/** @jsx React.DOM */
var React = require('react');

var CommentForm = React.createClass({
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
           <form className="commentForm" onSubmit={this.handleSubmit}>
           <p>
                <input type="text" placeholder="Your name" ref="author"/>
            </p>
            <p>
                <textarea name="text" cols="60" rows="10" placeholder="Tell us how you feel" ref="text"/>
            </p>

            <input type="submit" value="Post" />
          </form>
            );
    }
});

module.exports = CommentForm;
