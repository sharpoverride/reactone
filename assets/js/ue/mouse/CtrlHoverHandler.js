/* File: CtrlHoverHandler.js */
/* jshint undef: true, unused: true */
'use strict';

function MouseCtrlHoverHandler() {
}

var proto = MouseCtrlHoverHandler.prototype;

proto.mouseOver = function (ev) {
  if (!ev.ctrlKey || ev.type !== 'mouseover') {
    return;
  }
  $(ev.currentTarget).children().addClass('active');
};

proto.mouseLeave = function (ev) {
  if (ev.type !== 'mouseleave') {
    return;
  }
  $(ev.currentTarget).children().removeClass('active');
};
module.exports = MouseCtrlHoverHandler;