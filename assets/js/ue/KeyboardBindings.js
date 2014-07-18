/* File: KeyboardBingings.js */
/* jshint undef: true, unused: true */
/* globals $, _, require, module */
'use strict';

var dataProvider = require('./DataProvider');
var segmentWatcher = require('./SegmentsWatcher');
var Mediator = require('./Mediator');
var tmpl = require('./Tmpl');
var helpers = require('./Helpers');

var Segment = require('./Segment');
var Selection = require('./Selection');
var Keyboard = require('./Keyboard');
var Mouse = require('./Mouse');
var CommandManager = require('./CommandManager');

var KeyboardBindings = function (target) {
  var me = this;
  me.target = target;
};

var proto = KeyboardBindings.prototype = {
  // Keyboard keys
  keyTab: 9,
  keyBackspace: 8,
  keyEnter: 13,
  keySpace: 32,

  keyPageUp: 33,
  keyPageDown: 34,
  keyEnd: 35,
  keyHome: 36,
  keyInsert: 45,
  keyDelete: 46,

  keyLeftArrow: 37,
  keyUpArrow: 38,
  keyRightArrow: 39,
  keyDownArrow: 40,

  keyShift: 16,
  keyCtrl: 17,
  keyAlt: 18,
  keyEsc: 27,

  keyCapsLock: 20,
  keyNumLock: 144,
  keyScrollLock: 145,

  keyF1: 112,
  keyF2: 113,
  keyF3: 114,
  keyF4: 115,
  keyF5: 116,
  keyF6: 117,
  keyF7: 118,
  keyF8: 119,
  keyF9: 120,
  keyF10: 121,
  keyF11: 122,
  keyF12: 123
};

proto.ignoredKeys = [
  proto.keyLeftArrow,
  proto.keyUpArrow,
  proto.keyRightArrow,
  proto.keyDownArrow,
  proto.keyCapsLock,
  proto.keyScrollLock,
  proto.keyNumLock,
  proto.keyAlt,
  proto.keyCtrl,
  proto.keyShift,
  proto.keyPageUp,
  proto.keyPageDown,
  proto.keyHome,
  proto.keyEnd,
  proto.keyEnter,
  proto.keyEsc,
  proto.keyInsert,
  proto.keyF1,
  proto.keyF2,
  proto.keyF3,
  proto.keyF4,
  proto.keyF5,
  proto.keyF6,
  proto.keyF7,
  proto.keyF8,
  proto.keyF9,
  proto.keyF10,
  proto.keyF11,
  proto.keyF12
];

proto.allowedKeysInLockedContent = {
  33: 'PageUp',
  34: 'PageDown',
  35: 'End',
  36: 'Home',
  37: 'Left',
  38: 'Up',
  39: 'Right',
  40: 'Down',

  112: 'F1',
  113: 'F2',
  114: 'F3',
  115: 'F4',
  116: 'F5',
  117: 'F6',
  118: 'F7',
  119: 'F8',
  120: 'F9',
  121: 'F10',
  122: 'F11',
  123: 'F12'
};

proto.textNodeType = 3;
proto.elementNodeType = 1;
proto.currentSelection = null;
proto.currentElementIsLocked = false;

proto.bind = function () {
  var me = this;

  me.target.on('keydown', function (ev) { return me.disableEnterKey(ev); });
  me.target.on('keydown', function (ev) { return me.disableBackspaceAtStartOfSegment(ev); });
  me.target.on('keydown', function (ev) { return me.disableDeleteAtEndOfSegment(ev); });
  me.target.on('keydown', function (ev) { return me.handleBackspaceAction(ev); });
  me.target.on('keydown', function (ev) { return me.handleDeleteAction(ev); });
  me.target.on('keydown', function (ev) { return me.handleRemoveOnSelection(ev); });
  me.target.on('keydown', function (ev) { return me.preventTagsRemoval(ev); });
  me.target.on('keydown', function (ev) { return me.toggleSegmentLockState(ev); });
  me.target.on('keydown', function (ev) { return me.handleClearTagsShortcutPreventsDefault(ev); });
  me.target.on('keydown', function (ev) { return me.handleTabKey(ev); });

  // Trigger mouseup & keydown events in locked content to make sure we stop editing
  me.target.on('mouseup', function (ev) { return me.handleCrossSegmentSelection(ev); });
  me.target.on('keydown mouseup', function (ev) { return me.disableEditing(ev); });
  me.target.on('mouseup', function (ev) { return me.markCurrentSegment(ev); });

  me.target.on('keyup', function (ev) { return me.handleCaretPosition(ev); });
  me.target.on('keyup', function (ev) { return me.markCurrentSegment(ev); });
  me.target.on('keyup', function (ev) { return me.changeStatusToDraft(ev); });
  me.target.on('keyup', function (ev) { return me.changeStatusToConfirmed(ev); });
  me.target.on('keyup', function (ev) { return me.handleMissingTextContainer(ev); });
  me.target.on('keyup', function (ev) { return me.handleClearTags(ev); });
  me.target.on('keyup', function (ev) { return new Keyboard.ShiftEnterHandler(ev); });

  me.target.on('keyup paste', function (ev) { return me.resizeContainer(ev); });
  me.target.on('paste', function (ev) { return (new CommandManager()).execute('paste', ev); });

  // Handel CTRL+CLICK on tags
  me.target.on('mousedown', '[data-tag-copy="true"]',
    function (ev) { return new Mouse.CtrlClickHandler().handle(ev); });

  me.target.on('mouseover', '[data-tag-copy="true"]',
    function (ev) { return new Mouse.CtrlHoverHandler().mouseOver(ev); });

  me.target.on('mouseleave', '[data-tag-copy="true"]',
    function (ev) { return new Mouse.CtrlHoverHandler().mouseLeave(ev); });
};

// TODO once KeyboardBindings is refactored this can be removed
// SegmentUnderCurrentSelection has been moved to it's own module
proto._segmentUnderCurrentSelection = Keyboard.SegmentUnderCurrentSelection;


proto.disableEnterKey = function (ev) {
  var me = this;

  if (ev.shiftKey) {
    return;
  }

  if (ev.keyCode === me.keyEnter) {
    ev.preventDefault();
  }
};

proto.disableBackspaceAtStartOfSegment = function (ev) {
  var me = this;
  var selection = document.getSelection();
  var focusNode = selection.focusNode;
  var segmentEl;

  if (ev.keyCode !== me.keyBackspace) {
    return;
  }

  if (!me._isInvisibleChar(focusNode)) {
    return;
  }

  segmentEl = $(focusNode.parentNode);

  if (focusNode.previousSibling === null &&
      segmentEl.hasClass('ue-segment')) {
    ev.preventDefault();
  }
};

proto.disableDeleteAtEndOfSegment = function (ev) {
  var me = this,
      selection = document.getSelection(),
      focusNode,
      focusOffset;

  if (!selection.isCollapsed) {
    return;
  }

  if (ev.keyCode !== me.keyDelete) {
    return;
  }

  focusNode = selection.focusNode;
  focusOffset = selection.focusOffset;

  if (focusNode === null) {
    return;
  }

  if (focusNode.nextSibling === null &&
      focusNode.length === focusOffset &&
      me.isLastInSegment(focusNode)) {
    ev.preventDefault();
  }
};

proto.isLastInSegment = function (node) {
  var parentEl,
      nodeEl,
      atIndex,
      numberOfChildren;

  nodeEl = $(node);
  parentEl = nodeEl.parent();

  while (!parentEl.hasClass('ue-inline-content')) {
    nodeEl = parentEl;
    parentEl = nodeEl.parent();
  }

  atIndex = nodeEl.index() + 1;
  numberOfChildren = parentEl.children().length;

  return atIndex === numberOfChildren;
};

proto.handleBackspaceAction = function (ev) {
  var me = this,
      selection = document.getSelection(),
      focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      previousSibling,
      inlineElement,
      tag,
      isStartTag;

  if (!selection.isCollapsed) {
    return;
  }

  if (focusNode === null) {
    return;
  }

  if ($(focusNode).hasClass('ue-tagpair-content') && focusOffset === 0) {
    selection.modify('move', 'backward', 'character');
    focusNode = selection.focusNode;
    focusOffset = selection.focusOffset;
  }

  if (!me._isInvisibleChar(focusNode)) {
    return;
  }

  inlineElement = focusNode.parentNode;
  tag = focusNode.previousSibling;

  if (ev.keyCode !== me.keyBackspace) {
    return;
  }

  if (inlineElement === null) {
    return;
  }

  if ($(inlineElement).hasClass('ue-segment')) {
    return;
  }

  if (focusOffset === 0) {
    selection.modify('move', 'forward', 'character');
  }

  isStartTag = $(tag).hasClass('ue-tag-start');

  if (isStartTag) {
    var ueTagWrapper = inlineElement;
    previousSibling = ueTagWrapper.previousSibling;

    var parentIsAnotherTag = $(ueTagWrapper.parentNode).hasClass('ue-tagpair-content');
    if (parentIsAnotherTag) {
      var ueTagPairContent = ueTagWrapper.parentNode;
      previousSibling = ueTagPairContent.previousSibling;
    }

  } else {
    previousSibling = inlineElement.previousSibling.lastChild;
  }

  me._removeInline(inlineElement, ev);

  if (previousSibling === null) {
    return;
  }

  var range = document.createRange();

  range.setStartAfter(previousSibling);

  selection.removeAllRanges();
  selection.addRange(range);

  ev.stopPropagation();
};


proto.handleDeleteAction = function (ev) {
  var me = this,
      selection = document.getSelection(),
      focusNode,
      focusNodeParent,
      focusOffset,
      nextSibling,
      ueTextParentEl,
      isNextSiblingTag,
      isNextSiblingTagHidden,
      isFocusOnText,
      isAtEndOfTextNode,
      isFocusInsideStartTag,
      isFocusOnInvisibleChar,
      isFocusInsidePreviousTag,
      isFocusAtStartOfSegment,
      selectionRangePosition,
      range;

  if (!selection.isCollapsed) {
    return;
  }

  if (ev.keyCode !== me.keyDelete) {
    return;
  }

  focusNode = selection.focusNode;
  focusNodeParent = focusNode.parentNode;
  focusOffset = selection.focusOffset;

  isFocusOnText = focusNode.nodeType === me.textNodeType;
  isAtEndOfTextNode = focusOffset === focusNode.length;
  isFocusOnInvisibleChar = me._isInvisibleChar(focusNode);
  isFocusInsideStartTag = isFocusOnInvisibleChar && $(focusNode.previousSibling).hasClass('ue-tag-start');
  isFocusInsidePreviousTag = isFocusOnInvisibleChar && $(focusNode.previousSibling).hasClass('ue-tag');
  isFocusAtStartOfSegment = isFocusOnInvisibleChar && $(focusNode).index() === 0;

  nextSibling = focusNode.nextSibling;

  if (isFocusOnInvisibleChar && focusOffset === 0) {
    selection.modify('move', 'forward', 'character');
  }

  if (isFocusOnText && !isFocusOnInvisibleChar) {
    if (!isAtEndOfTextNode) {
      return;
    }

    ueTextParentEl = $(focusNodeParent);

    if (ueTextParentEl.hasClass('ue-text')) { // we are in text before start tag
      nextSibling = focusNode.parentNode.nextSibling; // ue-tag-wrapper for start tag
    } else {
      throw 'unexpected case where selection is text, but is not contained in a text node';
    }

    // we are in text inside a tag pair
    if (nextSibling === null && $(focusNodeParent.parentNode).hasClass('ue-tagpair-content')) {
      nextSibling = focusNodeParent.parentNode.nextSibling; // ue-tag-wrapper for end tag
      selectionRangePosition = nextSibling.nextSibling; // what comes after the end-tag
    }
  }

  if (isFocusInsideStartTag) {
    var contentExists = focusNodeParent.nextSibling.firstChild;

    if (contentExists) {

      if ($(contentExists).hasClass('ue-text')) {
        // position cursor and let the default behavior
        range = document.createRange();
        range.setStartBefore(contentExists);

        selection.removeAllRanges();
        selection.addRange(range);

        return;
      }

      if ($(contentExists).hasClass('ue-tag-wrapper')) {
        nextSibling = contentExists;
      }

    } else { // we delete the current tag
      nextSibling = focusNodeParent;
    }

  } else if (isFocusInsidePreviousTag) {
    nextSibling = focusNodeParent.nextSibling;
  } else if (isFocusAtStartOfSegment) {
    nextSibling = focusNode.nextSibling.firstChild;
  }

  isNextSiblingTag = $(nextSibling).hasClass('ue-tag-wrapper');
  isNextSiblingTagHidden = isNextSiblingTag && $(nextSibling).hasClass('hide');

  if (isNextSiblingTagHidden) {
    return;
  }

  if (isNextSiblingTag) {
    me._removeInline(nextSibling, ev);
  }

  if (selectionRangePosition) {
    range = document.createRange();
    range.setStartBefore(selectionRangePosition);

    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto._removeInline = function (inlineElement, ev) {
  var tagPairId,
      tagPairContent,
      tagPairContentEl,
      isEndTagPair,
      isStartTagPair,
      isTagPair,
      isPlaceholder;

  isPlaceholder = inlineElement.dataset.type === 'placeholder';
  isEndTagPair = inlineElement.dataset.type === 'end-tag';
  isStartTagPair = inlineElement.dataset.type === 'start-tag';
  isTagPair = isStartTagPair || isEndTagPair;

  if (isPlaceholder) {
    inlineElement.remove();
    ev.preventDefault();

    return;
  }

  if (!isTagPair) {
    return;
  }

  if (isEndTagPair) {
    tagPairContent = inlineElement.previousSibling;
    tagPairId = tagPairContent.dataset.id;
  }

  if (isStartTagPair) {
    tagPairContent =  inlineElement.nextSibling;
    tagPairId = tagPairContent.dataset.id;
  }

  if (isTagPair) {
    segmentWatcher.removeTagPair(tagPairId);
    tagPairContentEl = $(tagPairContent);
    tagPairContentEl.replaceWith(tagPairContentEl.children());

    ev.preventDefault();
  }
};

proto.handleRemoveOnSelection = function (ev) {
  var me = this,
      selection = document.getSelection(),
      range,
      currentRange,
      rangeContent,
      commonAncestorContainer,
      startContainer;

  if (selection.getRangeAt(0).collapsed) {
    return;
  }

  if (ev.keyCode !== me.keyDelete && ev.keyCode !== me.keyBackspace) {
    return;
  }

  if (me.isCrossSegmentSelection()) {
    ev.preventDefault();
    return;
  }

  range = selection.getRangeAt(0);
  rangeContent = range.cloneContents();

  if (rangeContent.firstChild === rangeContent.lastChild &&
      rangeContent.firstChild.nodeType === me.textNodeType) {

    return;// allow default delete action
  }

  me.cleanupStrategy(rangeContent);


  currentRange = selection.getRangeAt(0);
  commonAncestorContainer = currentRange.commonAncestorContainer;
  startContainer = currentRange.startContainer;

  range.deleteContents();

  range = document.createRange();
  range.selectNode(startContainer);
  range.collapse();

  selection.removeAllRanges();
  selection.addRange(range);

  me.insertRangeContent(rangeContent, commonAncestorContainer);

  ev.preventDefault();
};

proto.isCrossSegmentSelection = function () {
  var selection = new Selection.SelectionContext(),
      result;

  result = selection.hasCommonAncestorClass('ue-editable');

  return result;
};

proto.cleanupStrategy = function (container) {
  var me = this;

  me.removeElementQueue = [];
  me._cleanup(container);
  me.removeElementQueue.forEach(function (item) {
    item.remove();
  });

  me.removeElementQueue = null;
};

proto._cleanup = function (container) {
  var me = this,
      i = 0,
      el;

  for (; i < container.childNodes.length; i++) {
    el = container.childNodes[i];

    me.removeText(el);
    me.removePairedTags(el, container);
    me.cleanTagPairContainer(el);
  }
};

proto.removeText = function (el) {
  var me = this,
      $el = $(el);

  if ($el.hasClass('ue-text')) {
    me.removeElementQueue.push($el);
  }
};

proto.removePairedTags = function (el, container) {
  var me = this,
      $el = $(el);

  if (el.dataset.type !== 'start-tag') {
    return;
  }

  var id = el.dataset.id;
  var matchedEndTag = _(container.childNodes).find(function (item) {
    var isTagWrapper = $(item).hasClass('ue-tag-wrapper'),

    isHidden = isTagWrapper && $(item).hasClass('hide'),
    dataset = item.dataset || {},
    isEndTag,
    hasMatchingId,
    isOk;

    isEndTag = dataset.type === 'end-tag';
    hasMatchingId = dataset.id === id;

    isOk = isTagWrapper && !isHidden && isEndTag && hasMatchingId;

    if (isOk) {
      return item;
    }

    return null;
  });

  var matchedTagPair = _(container.childNodes).find(function (item) {
    var isTagPairContainer = $(item).hasClass('ue-tagpair-content'),
    dataset = item.dataset || {},
    isTagPair,
    hasMatchingId,
    isOk;

    isTagPair = dataset.type === 'tagpair';
    hasMatchingId = dataset.id === id;

    isOk =  isTagPairContainer && isTagPair && hasMatchingId;

    if (isOk) {
      return item;
    }

    return;
  });

  if (matchedEndTag !== undefined) {
    me.removeElementQueue.push($el);
    me.removeElementQueue.push($(matchedEndTag));
    me.removeElementQueue.push($(matchedTagPair));
  }
};

proto.cleanTagPairContainer = function (el) {
  var me = this,
      isTagPair = $(el).hasClass('ue-tagpair-content');

  if (!isTagPair) {
    return;
  }

  me._cleanup(el);
};

proto.insertRangeContent = function (rangeContent, commonAncestorContainer) {
  var me = this,
      selection = document.getSelection(),
      focusNode,
      childNode,
      nextSibling,
      aheadSibling;

  focusNode = selection.focusNode;

  if (rangeContent.childNodes.length === 0) {
    return;
  }

  if (focusNode === null) {
    return;
  }

  // add content back
  while (focusNode.parentNode !== commonAncestorContainer) {
    focusNode = focusNode.parentNode;
  }

  childNode = rangeContent.childNodes[0];

  var firstChildEl = $(childNode);
  if (firstChildEl.hasClass('ue-tag-wrapper')) {
    // simple case, just add the content back
    $(focusNode).after(firstChildEl[0]);
    nextSibling = focusNode.nextSibling;
  } else if (me._needToMergeContainers(childNode, focusNode)) {
    me.mergeContentAtEndOf(childNode, focusNode);
    nextSibling = focusNode;
  }

  while (rangeContent.childNodes.length > 0) {
    childNode = rangeContent.childNodes[0];
    aheadSibling = nextSibling.nextSibling;

    if (me._needToMergeContainers(childNode, aheadSibling)) {
      me.mergeContentAheadOf(childNode, aheadSibling);
    } else {
      $(nextSibling).after(childNode);
      nextSibling = childNode;
    }
  }

};

proto._needToMergeContainers = function (childNode, aheadSibling) {
  var isChildNodeTagContainer,
      isAheadSibilingTagContainer,
      childNodeTagId,
      aheadSiblingTagId,
      isMergeNeeded;

  isChildNodeTagContainer = $(childNode).hasClass('ue-tagpair-content');
  isAheadSibilingTagContainer = $(aheadSibling).hasClass('ue-tagpair-content');

  if (!isChildNodeTagContainer) {
    return false;
  }

  if (!isAheadSibilingTagContainer) {
    return false;
  }

  childNodeTagId = childNode.dataset.id;
  aheadSiblingTagId = aheadSibling.dataset.id;

  isMergeNeeded = childNodeTagId === aheadSiblingTagId;

  return isMergeNeeded;
};

proto.mergeContentAheadOf = function (childNode, aheadSibling) {
  var me = this,
      positionEl;

  positionEl = $(childNode.childNodes[0]);
  positionEl.prependTo(aheadSibling);

  me.moveContents(childNode, positionEl);

  $(childNode).remove();
};

proto.mergeContentAtEndOf = function (childNode, previousSibling) {
  var me = this,
      positionEl;

  positionEl = $(childNode.childNodes[0]);
  positionEl.appendTo(previousSibling);

  me.moveContents(childNode, positionEl);

  $(childNode).remove();
};

proto.moveContents = function (fromNode, afterPositionEl) {
  var positionEl = afterPositionEl,
      childNode = fromNode,
      currentNode;

  while (childNode.childNodes.length > 0) {
    currentNode = childNode.childNodes[0];
    positionEl.after(currentNode);
    positionEl = $(currentNode);
  }
};

proto.preventTagsRemoval = function (ev) {
  var me = this,
      selection = document.getSelection(),
      textNode = selection.focusNode,
      focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      focusNodeLength,
      isKeyBackspace = ev.keyCode === me.keyBackspace,
      isKeyDelete = ev.keyCode === me.keyDelete,
      singleCharacter = 1;

  if (!selection.isCollapsed) {
    return;
  }

  if (focusNode === null) {
    return;
  }

  if (!isKeyDelete && !isKeyBackspace) {
    return;
  }

  if (focusNode.nodeType === me.textNodeType) {
    // Firefox position fix
    if (focusOffset === 0 && isKeyBackspace) {
      me.fixFirefoxPositionZero();
      focusNode = selection.focusNode;
      focusOffset = selection.focusOffset;
    }

    focusNodeLength = focusNode.length;
    focusNode = focusNode.parentNode;
  }

  var isAtEnd = focusOffset === focusNodeLength;
  var isAtStart = focusOffset === singleCharacter;
  var isAtLastCharacter = (!isAtEnd && (focusOffset + singleCharacter)) === focusNodeLength;

  var isFocusOnText,
      isNextSiblingTag,
      isPreviousSibilingTag,
      isCurrentContainerTagPairContent,
      isParentTagContainer,
      ueTagWrapper,
      range;

  isFocusOnText = $(focusNode).hasClass('ue-text');
  // isParentTagContainer should be true in firefox
  isParentTagContainer = $(focusNode.parentNode).hasClass('ue-tagpair-content');

  var nextSibling = focusNode.nextSibling;
  var previousSibling = focusNode.previousSibling;
  var focusNodeParent = focusNode.parentNode;

  isNextSiblingTag = $(nextSibling).hasClass('ue-tag-wrapper');
  isPreviousSibilingTag = $(previousSibling).hasClass('ue-tag-wrapper');
  isCurrentContainerTagPairContent = $(focusNodeParent).hasClass('ue-tagpair-content');

  if (!isAtStart && !isAtEnd && !isAtLastCharacter || !isFocusOnText) {
    return;
  }

  if (isPreviousSibilingTag || isNextSiblingTag || isCurrentContainerTagPairContent) {
    if (isKeyBackspace) {
      ev.preventDefault();

      selection.removeAllRanges();
      range = document.createRange();
      range.setStart(textNode, (focusOffset - singleCharacter));
      range.setEnd(textNode, focusOffset);

      selection.addRange(range);
      range.deleteContents();

      // position
      if (isAtStart) {
        var moveDirection = isKeyBackspace ? 'backward' : 'forward';
        selection.modify('move', moveDirection, 'character');
      }
    }

    if (isKeyDelete && isNextSiblingTag) {
      var tagPairContent = nextSibling.nextSibling;
      var isTagPairContainer = $(tagPairContent).hasClass('ue-tagpair-content');

      if (isAtLastCharacter) {
        ev.preventDefault();

        // remove from the next text node
        selection.removeAllRanges();
        range = document.createRange();
        range.setStart(textNode, focusOffset);
        range.setEnd(textNode, focusOffset + singleCharacter);
        selection.addRange(range);
        range.deleteContents();

        // set selection position to start of text node
        selection.removeAllRanges();
        range = document.createRange();
        range.setStart(textNode, focusOffset);
        range.setEnd(textNode, focusOffset);
        selection.addRange(range);
      }

      if (isAtEnd) {
        if (isTagPairContainer) {
          var ueText = tagPairContent.firstChild;
          textNode = ueText.firstChild;

          if (textNode.length === 0) {
            // move to next sibling
            ueTagWrapper = tagPairContent.nextSibling;
            ueText = ueTagWrapper.nextSibling;

            if (ueText === null) {
              return;
            }

            textNode = ueText.firstChild;
          }

          ev.preventDefault();

          // remove from the next text node
          selection.removeAllRanges();
          range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 1);
          selection.addRange(range);
          range.deleteContents();

          // set selection position to start of text node
          range = document.createRange();
          range.setStart(textNode, 0);
          range.setEnd(textNode, 0);
          selection.addRange(range);
        }
      }
    }
  }

  if (isKeyDelete && isParentTagContainer) {
    // this is firefox, he puts the selection within the text node
    // unlike the current chrome implementation

    // remove textNode content
    var isRemovingFromCurrentTagContainer = focusOffset + singleCharacter === focusNodeLength;
    if (isRemovingFromCurrentTagContainer) {
      ev.preventDefault();

      range = document.createRange();
      range.setStart(textNode, focusOffset);
      range.setEnd(textNode, (focusOffset + singleCharacter));
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
    }
    // move selection to next sibling
    nextSibling = focusNodeParent;
    do {
      nextSibling = nextSibling.nextSibling;
    } while (nextSibling !== null && $(nextSibling).hasClass('ue-tag-wrapper'));

    textNode = nextSibling;
    do {
      textNode = textNode.firstChild;
    } while (textNode !== null && textNode.nodeType !== me.textNodeType);

    if (!isRemovingFromCurrentTagContainer) {
      ev.preventDefault();
      range = document.createRange();
      range.setStart(textNode, 0);
      range.setEnd(textNode, singleCharacter);
      selection.removeAllRanges();
      selection.addRange(range);
      range.deleteContents();
    }

    range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, 0);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto.fixFirefoxPositionZero = function () {
  var selection = document.getSelection(),
      focusNode = selection.focusNode,
      ueText, ueTag, ueTagContainer,
      range;

  ueText = focusNode.parentNode;
  ueTag = ueText.previousSibling;

  if ($(ueTag).hasClass('ue-tag-wrapper')) {
    ueTagContainer = ueTag.previousSibling;

    range = document.createRange();
    range.selectNode(ueTagContainer.lastChild);
    range.collapse();

    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto.handleClearTagsShortcutPreventsDefault = function (ev) {
  var me = this,
    selection = new Selection.SelectionContext(),
    isCtrlPressed = ev.ctrlKey,
    isSpaceKeyPressed = ev.keyCode === me.keySpace,
    isClearTagsCommandPressed = isCtrlPressed && isSpaceKeyPressed;

  if (me.isCrossSegmentSelection()) {
    return;
  }

  if (selection.isCollapsed()) {
    return;
  }

  if (!isClearTagsCommandPressed) {
    return;
  }

  ev.preventDefault();
};

proto.handleClearTags = function (ev) {
  var me = this,
      selection = new Selection.SelectionContext(),
      isCtrlPressed = ev.ctrlKey,
      isSpaceKeyPressed = ev.keyCode === me.keySpace,
      isClearTagsCommandPressed = isCtrlPressed && isSpaceKeyPressed;

  if (me.isCrossSegmentSelection()) {
    return;
  }

  if (selection.isCollapsed()) {
    return;
  }

  if (!isClearTagsCommandPressed) {
    return;
  }

  me.tags = {};
  me.storedEvent = ev;

  var commonAncestorContainer = selection.commonAncestorContainer,
      startContainer = selection.startContainer,
      endContainer = selection.endContainer;
  if (commonAncestorContainer === startContainer && commonAncestorContainer === endContainer) {
    return;
  }
  // TODO see about edge cases where the startContainer and endContainer are left with no content
  // if selection at start is 0 maybe the tagpair start should automatically be included with the selection
  // if selection at end is full container length maybe the tagpair end should automatically be included with the selection

  var nodeWalker = new Selection.NodeWalker(startContainer);
  var end = new Selection.NodeWalker(endContainer);

  if (end.isTextNode()) {
    end = end.parent();
  }

  while (!nodeWalker.isNull() && !nodeWalker.isWrapperFor(commonAncestorContainer)) {
    me.identifyTagsInContainer(nodeWalker, end);
    nodeWalker = nodeWalker.parent();
  }

  var documentFragmentContainer = new Selection.NodeWalker(selection.cloneContents());

  me.moveTagsToFront = [];
  me.moveTagsToEnd = [];

  me.transformTags(documentFragmentContainer);

  me.moveTagsToFront.forEach(function (tag) {
    tag.remove();
  });
  me.moveTagsToEnd.forEach(function (tag) {
    tag.remove();
  });

  var needsToMoveTags =  me.moveTagsToFront.length > 0 || me.moveTagsToEnd.length > 0;
  if (!needsToMoveTags) {
    return;
  }

  selection.deleteContents();

  var patch = new Selection.NodeWalker(startContainer);
  if (patch.isTextNode()) {
    patch = patch.parent();
  }

  var lastEndTag = patch;
  while (patch.parent().isTagPairContainer()) {
    patch = patch.parent();
    if (me.moveTagsToFront.length > 0) {
      lastEndTag = me.moveTagsToFront.shift();
      patch.insertAfter(lastEndTag);
    }
  }
  lastEndTag.insertAfter(documentFragmentContainer);

  patch = new Selection.NodeWalker(endContainer);
  if (patch.isTextNode()) {
    patch = patch.parent();
  }

  while (!patch.isNull() && patch.parent().isTagPairContainer()) {
    patch = patch.parent();

    if (me.moveTagsToEnd.length > 0) {
      patch.insertBefore(me.moveTagsToEnd.pop());
    }
  }

  me.moveTagsToFront = null;
  me.moveTagsToEnd = null;
  me.tags = null;
  me.storedEvent = null;
};

proto.identifyTagsInContainer = function (nodeWalker, end) {
  var me = this,
      tagId;

  me.endContainerReached = false;

  do {
    if (nodeWalker.equals(end)) {
      me.endContainerReached = true;
    }

    if (nodeWalker.isTagPairContainer()) {
      nodeWalker = nodeWalker.firstChild();
      me.identifyTagsInContainer(nodeWalker, end);
      nodeWalker = nodeWalker.parent();
    }

    if (nodeWalker.isStartTag() && nodeWalker.canHide()) {
      tagId = nodeWalker.tagId();
      me.tags[tagId] = {startTag: nodeWalker,
        endTag: null
      };
    }

    if (nodeWalker.isEndTag() && nodeWalker.canHide()) {
      tagId = nodeWalker.tagId();
      me.tags[tagId] = me.tags[tagId] || {startTag: null, endTag: null };
      me.tags[tagId].endTag = nodeWalker;

      if (me.tags[tagId].startTag !== null) {
        me._removeInline(nodeWalker.el, me.storedEvent);

        delete me.tags[tagId];
      }
    }

    nodeWalker = nodeWalker.next();

  } while (!nodeWalker.isNull() && !me.endContainerReached);

  nodeWalker.returnToPrevious();
};

proto.transformTags = function (container) {
  var me = this,
      isInTags,
      nodeWalker;

  if (!container.hasChildren()) {
    return;
  }

  nodeWalker = container.firstChild();
  do {
    isInTags = nodeWalker.tagId() in me.tags;
    if (nodeWalker.isTagPairContainer() && isInTags) {
      var tagpair = nodeWalker;

      me.transformTags(tagpair);
      nodeWalker = nodeWalker.next();
      tagpair.replaceWithInnerContent();

      continue;
    }

    if (nodeWalker.isStartTag() && isInTags) {
      me.moveTagsToEnd.push(nodeWalker);
    }

    if (nodeWalker.isEndTag() && isInTags) {
      me.moveTagsToFront.push(nodeWalker);
    }

    nodeWalker = nodeWalker.next();
  } while (!nodeWalker.isNull());
};


proto.handleMissingTextContainer = function (ev) {
  var me = this,
      selection,
      focusNode,
      textContent,
      zeroWidthCharIndex,
      textBefore,
      textAfter,
      textEl,
      isInSegment,
      containerEl,
      currentText,
      ueTagWrapper,
      range;

  if (me.ignoredKeys.indexOf(ev.keyCode) !== -1) {
    return;
  }

  if (ev.keyCode === me.keyDelete || ev.keyCode === me.keyBackspace) {
    return;
  }

  selection = document.getSelection() || {};
  focusNode = selection.focusNode;

  if (focusNode === undefined || focusNode === null) {
    return;
  }

  textContent = focusNode.textContent;
  zeroWidthCharIndex = textContent.indexOf(String.fromCharCode(tmpl.zeroWidthNonJoinerCharCode));

  if (zeroWidthCharIndex > -1) {
    textBefore = textContent.substring(0, zeroWidthCharIndex);
    textAfter = textContent.substring(zeroWidthCharIndex + 1);

    textEl = $(tmpl.text).append(textBefore).append(textAfter);
    textEl[0].dataset.type = 'text';

    isInSegment = $(focusNode.parentNode).hasClass('ue-segment');

    if (isInSegment) {
      $(focusNode.nextSibling).prepend(textEl);
    } else {
      containerEl = $(focusNode.parentNode);

      if (containerEl.hasClass('ue-text')) {
        currentText = containerEl.text();
        containerEl.html(textEl.text() + currentText);
      } else if (containerEl.hasClass('ue-inline-content')) {
        containerEl.append(textEl);
      } else {
        ueTagWrapper = $(focusNode).parent();
        ueTagWrapper.after(textEl);
      }
    }

    $(focusNode).replaceWith(tmpl.zwnj);

    range = document.createRange();
    range.selectNode(textEl[0]);
    range.collapse();

    selection.removeAllRanges();
    selection.addRange(range);
  }
};

proto._hasInlineContentParent = function (node) {
  var hasInlineContentParent = $(node.parentNode).hasClass('ue-inline-content');

  return hasInlineContentParent;
};

proto._positionInParent = function (node) {
  var parent = node.parentNode,
      position = parent.children.indexOf(node);

  return position;
};

proto.resizeContainer = function (ev) {
  var me = this;
  var enterIsPressed = (ev.keyCode === me.keyEnter);

  if (!(ev.shiftKey && enterIsPressed)) {
    return;
  }

  segmentWatcher.resize(me.currentSegmentNumber);
};

proto.markCurrentSegment = function () {
  var me = this;

  var previousSegmentNumber = me.currentSegmentNumber;
  var previousSegmentEl = me.currentSegmentEl;

  var currentSegmentSelection = me._segmentUnderCurrentSelection();

  me.currentSegmentNumber = currentSegmentSelection.segmentNumber;
  me.currentSegmentEl = currentSegmentSelection.segmentEl;

  segmentWatcher.markContainerAsInactive(previousSegmentNumber);
  segmentWatcher.markContainerAsActive(me.currentSegmentNumber);

  if (me.currentSegmentNumber !== undefined &&
    me.currentSegmentEl !== undefined &&
    me.currentSegmentNumber !== previousSegmentNumber) {

    var currentDataset = me.currentSegmentEl.dataset;

    Mediator.publish('segment:start-edit', {
      el: me.currentSegmentEl,
      segmentNumber: currentDataset.segmentNumber,
      otherSegmentData: dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber)
    });

  }

  if (previousSegmentNumber !== me.currentSegmentNumber &&
      previousSegmentEl !== undefined) {
    var previousDataset = previousSegmentEl.dataset;

    Mediator.publish('segment:end-edit', {
      el: previousSegmentEl,
      segmentNumber: previousDataset.segmentNumber,
      otherSegmentData: dataProvider.getSegmentBySegmentNumber(previousSegmentNumber)
    });
  }
};

proto.changeStatusToDraft = function (ev) {
  var me = this,
      isShiftEnterPressed,
      segment,
      segmentData;

  isShiftEnterPressed = (ev.shiftKey && ev.keyCode === me.keyEnter);

  if (!isShiftEnterPressed && me.ignoredKeys.indexOf(ev.keyCode) !== -1) {
    return;
  }

  segmentData = dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber);
  segment = new Segment(segmentData);

  if ((!ev.ctrlKey || !ev.metaKey) && helpers.keyCodeToString(ev.which) !== 'l') {
    segment.changeToDraft();
  }


  Mediator.publish('segment:confirmationLevelChanged', segmentData);
};


proto.changeStatusToConfirmed = function (ev) {
  var me = this;
  var isCtrlEnterPressed = ev.ctrlKey && (ev.keyCode === me.keyEnter);

  if (!isCtrlEnterPressed) {
    return;
  }

  var segment = dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber);

  if (segment.confirmationlevel !== 'translated') {
    segment.confirmationlevel = 'translated';
    Mediator.publish('segment:confirmationLevelChanged', segment);
    Mediator.publish('segment:jumpToNextUnConfirmed', segment);
  }
};

proto.handleCaretPosition = function (ev) {
  var me = this,
      arrowKeyPressed = me.isArrowKey(ev.keyCode),
      selection = document.getSelection(),
      focusNode = selection.focusNode,
      focusOffset = selection.focusOffset,
      movementKeys = [me.keyLeftArrow, me.keyRightArrow],
      indexOfMovementKeys = movementKeys.indexOf(ev.keyCode);

  if (selection === null || focusNode === null) {
    return;
  }

  if (indexOfMovementKeys === -1) {
    return;
  }

  var isTextNode = focusNode.nodeType === me.textNodeType;

  var isMovingForward = ev.keyCode === me.keyRightArrow;
  var moveDirection = isMovingForward ? 'forward' : 'backward';

  if (isTextNode && (me._isInvisibleChar(focusNode))) {
    if (ev.keyCode === me.keyLeftArrow) {
      selection.modify('move', 'backward', 'character');
    }

    if (ev.keyCode === me.keyRightArrow) {
      selection.modify('move', 'forward', 'character');
    }
  }

  if (focusNode.nodeType === me.elementNodeType) {
    selection.modify('move', 'forward', 'character');
  }

  while (me._isInsideTag(selection.focusNode)) {
    selection.modify('move', moveDirection, 'character');
  }
};

proto._isInvisibleChar = function (node) {
  var textContent = node.textContent,
      isInvisibleChar = textContent.length === 1 &&
                        textContent.charCodeAt(0) === tmpl.zeroWidthNonJoinerCharCode;

  return isInvisibleChar;
};

proto._isInsideTag = function (node) {
  var isTag;

  if (node.parentNode === null) {
    return false;
  }

  isTag = $(node.parentNode).hasClass('ue-tag');

  return isTag;
};

proto.isArrowKey = function (keyCode) {
  var me = this;

  return keyCode === me.keyUpArrow ||
         keyCode === me.keyDownArrow ||
         keyCode === me.keyLeftArrow ||
         keyCode === me.keyRightArrow;
};



/**
 * Lock current segment on CTRL+l
 * @param  {EventObject} ev
 */
proto.toggleSegmentLockState = function (ev) {
  var me = this,
      charKey = helpers.keyCodeToString(ev.which),
      segment = me._segmentUnderCurrentSelection(),
      segmentData = dataProvider.getSegmentBySegmentNumber(me.currentSegmentNumber),
      segmentEl = segment.segmentEl,
      isLockedSegment,
      sourceRel;

  if ((ev.ctrlKey || ev.metaKey) && charKey === 'l') {
    ev.preventDefault();

    isLockedSegment = segmentData.isLocked || false; //helpers.hasClass(segmentEl, 'ue-segment-locked');
    sourceRel = $('[data-source-segment-number="' + segment.segmentNumber + '"]')[0];

    if (isLockedSegment) {
      // Un-lock segment and publish unlock event
      [segmentEl, sourceRel].forEach(function (elem) {
        elem.classList.remove('ue-segment-locked');
        elem.dataset.isLocked = false;
        segmentData.isLocked = false;
      });

      Mediator.publish('segment:unlock', segmentData);

      return;
    }

    // Mark segment as locked and publish lock event
    [segmentEl, sourceRel].forEach(function (elem) {
      elem.classList.add('ue-segment-locked');
      elem.dataset.isLocked = true;
      segmentData.isLocked = true;
    });

    Mediator.publish('segment:lock', segmentData);
  }
};


/**
 * Insert tab on TAB keypress
 * @param  {Event} ev
 */
proto.insertTab = function (selection) {
  var tab = tmpl.keyTab.unicode,
      textNode = document.createTextNode(tab),
      range;

  if (!selection.anchorNode) {
    return;
  }

  range = selection.getRangeAt(0);


  if (selection.isCollapsed) {
    range.insertNode(textNode);
  }

  if (!selection.isCollapsed) {
    range.deleteContents();
    range.insertNode(textNode);
  }


  // Move cursor after inserted tab
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);

  selection.removeAllRanges();
  selection.addRange(range);
};


/**
 * Handel TAB keys press
 * @param  {Object} ev [description]
 */
proto.handleTabKey = function (ev) {
  var me = this,
      selection = document.getSelection();

  if (ev.keyCode === me.keyTab) {
    ev.preventDefault();

    // If locked segment or locked content
    // stop inserting tabs
    if (me.currentElementIsLocked) {
      return;
    }

    me.insertTab(selection);
  }
};


/**
 * Disables editting in a locked segment or a locked content
 * @param  {Object} ev
 */
proto.disableEditing = function (ev) {
  var me = this,
      currentSegment = me._segmentUnderCurrentSelection(),
      selectionContext = new Selection.SelectionContext(),
      selection = selectionContext.selection,
      nodeWalker = new Selection.NodeWalker(ev.target),
      isInvisibleChar = nodeWalker.isInvisibleChar(),
      isSegment = nodeWalker.isSegment(),
      segmentData, elem, range;

  // Make sure this is false by default
  me.currentElementIsLocked = false;

  // Is locked content
  if (selection.anchorNode) {
    elem = selectionContext.commonAncestorContainer;
  }

  if (isSegment && selectionContext.isCollapsed()) {
    range = document.createRange();
    range.selectNode(nodeWalker.firstChild().el.nextSibling);

    selection.removeAllRanges();
    selection.addRange(range);
    range.collapse(true);
  }

  // Is cursor in a locked segment or content?
  if (currentSegment.segmentEl.dataset.isLocked || helpers.hasParent(elem.parentNode, 'ue-locked-content')) {
    me.currentElementIsLocked = true;
  }

  if (me.currentElementIsLocked) {
    // Prevent user to edit locked segment or content
    if (!(ev.keyCode in me.allowedKeysInLockedContent)) {
      ev.preventDefault();

      segmentData = dataProvider.getSegmentBySegmentNumber(currentSegment.segmentNumber);

      // Prevent segment status change
      segmentData.stopEditing = me.currentElementIsLocked;
      Mediator.publish('segment:stopEditingInLockedContent', segmentData);

      return false;
    }
  }
};


/**
 * Handles cross segments selection
 * TODO: extend it for mouse drag selection or keyboard selection?
 */
proto.handleCrossSegmentSelection = function (ev) {
  var textContent = ev.target.textContent,
      selectionContext = new Selection.SelectionContext(),
      selection = selectionContext.selection,
      isInvisibleChar = (new Selection.NodeWalker(ev.target)).isInvisibleChar(),
      range;

  // If dblclick or tripleclick and segment is empty
  // (relies on Zero Width Non-Joiner, to be changed if it will be removed)
  if (ev.originalEvent.detail >= 2 && isInvisibleChar) {
    range = document.createRange();
    range.selectNode(ev.target.children[0]);

    selection.removeAllRanges();
    selection.addRange(range);
    range.collapse(true);
  }
};

module.exports = KeyboardBindings;