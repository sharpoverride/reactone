/* File: NodeWrapper.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var Helpers = require('./Helpers');
var DataProvider = require('./DataProvider');
var TranslationOrigin = require('./TranslationOrigin');

var def;

var statusIconClass = {
    'NotTranslated': 'not-translated',
    'ApprovedSignOff': 'approved-sign-off',
    'ApprovedTranslation': 'approved-translation',
    'Draft': 'draft',
    'RejectedSignOff': 'rejected-sign-off',
    'RejectedTranslation': 'rejected-translation',
    'Translated': 'translated'
  };

var translationOriginClass = {
    'it': 'transparent',
    'at': 'blue',
    'pm': 'gray',
    'ap': 'yellow',
    'cm': 'green'
  };


var NodeWrapper = Helpers.constructor({
  _extend: Helpers._extend,

  init: function (attrs, parent) {
    this._attrs = attrs;
    this._parent = parent;
    this._extend(this, attrs);

    if (!this.type) {
      this.type = 'paragraph-unit';
    }

    if (this.metadata) {
      this.metadata = DataProvider.cacheMetadata(this.metadata);
    }

    switch (this.type) {

      case 'tagPair':
        def = this._extend({}, DataProvider.tagPairMap[this.tagPairDefinitionId]);
        def.pmetadata = def.metadata;
        delete def.metadata; // make sure we dont' overwrite our metadata
        delete def.id; // make sure we don't overwrite our id
        this._extend(this, def);

        break;

      case 'placeholderTag':
        def = this._extend({}, DataProvider.placeholderMap[this.placeholderTagDefinitionId]);
        def.pmetadata = def.metadata;
        delete def.metadata; // make sure we dont' overwrite our metadata
        delete def.id; // make sure we don't overwrite our id
        this._extend(this, def);

        break;

      case 'segment':
        if (!this.translationOrigin) {
          this.translationOrigin = TranslationOrigin.create();
        }

        DataProvider.segmentsMap[this.segmentNumber] = {
          'ordernumber' : this.segmentNumber,
          'isLocked' : this.isLocked || false,
          'confirmationlevel': statusIconClass[this.confirmationLevel] || 'not-translated',
          'translationorigin': this.translationOrigin
        };
        DataProvider.segmentsMapLength++;

        break;

      case 'text':
        break;

      case 'locked':
        break;
    }

    if (this.source) {
      this.source = new NodeWrapper(this.source, this);
    }

    if (this.target) {
      this.target = new NodeWrapper(this.target, this);
    }

    this._parent = parent || null;


    if (this.children) {
      this.children = this.children.map(function (child) {
        return new NodeWrapper(child, this);
      }, this);
    }


    // Prepare formatting
    if (this.formattingGroupId) {
      this.formattingGroup = this._extend(this.formattingGroup || {}, DataProvider.formatingGroupMap[this.formattingGroupId]);
    }
  },

  containsSegment: function () {
    return this.isSegment() || (this.children && this.children.filter(function (child) {
      return child.containsSegment();
    }).length);
  },

  isSegment: function () {
    return this.type === 'segment' || (this._parent && this._parent.isSegment());
  },

  metadataText: function () {
    return this.metadata ? JSON.stringify(this.metadata) : '';
  },

  subcontentText: function () {
    return this.localizableSubContentList ? JSON.stringify(this.localizableSubContentList) : '';
  },

  translationOriginText: function () {
    return this.translationOrigin ? JSON.stringify(this.translationOrigin) : '';
  },

  statusIcon: function () {
    return DataProvider.segmentsMap[this.segmentNumber].confirmationlevel || 'not-translated';
  },

  displayOriginIcon: function () {
    var translationOrigin = DataProvider.segmentsMap[this.segmentNumber].translationorigin;

    if (!translationOrigin || !translationOrigin.originType) {
      return false;
    }

    var lastType = (translationOrigin.originBeforeAdaptation) ? translationOrigin.originBeforeAdaptation.originType : null;
    var originTypes = {'interactive': true, 'source': true};

    if (originTypes[translationOrigin.originType] &&
        translationOrigin.matchPercent === 0 &&
        (translationOrigin.originBeforeAdaptation === null ||
         lastType === null || originTypes[lastType])) {
      return false;
    }

    return true;
  },

  originClass: function () {
    var translationOrigin = DataProvider.segmentsMap[this.segmentNumber].translationorigin,
        type = TranslationOrigin.originType(translationOrigin),
        className = translationOriginClass[type];

    if (className) {
      return className;
    }

    return translationOrigin.matchPercent < 100 ? 'yellow' : 'green';
  },

  originText: function () {
    var t = DataProvider.segmentsMap[this.segmentNumber].translationorigin;
    var type = TranslationOrigin.originType(t);
    var percent = t.matchPercent;

    //look for the first origin Type
    if (t.originBeforeAdaptation !== null && type === 'it') {
      var last = t.originBeforeAdaptation;
      type = TranslationOrigin.originType(last);
      percent = last.matchPercent;
    }

    var sIcon = '';
    var percentTypes = {'fm': true, 'em': true, 'tm': true, 'it': true, 'ap': true };

    if (percentTypes[type]) {
      sIcon = percent + '%';
    } else {
      sIcon = type.toUpperCase();
    }
    return sIcon;
  },

  /**
   * Get segment locked state
   */
  isLockedSegment: function () {
    return DataProvider.segmentsMap[this.segmentNumber].isLocked || false;
  },

  segmentInfo: function () {
    var segm = DataProvider.segmentsMap[this.segmentNumber];

    if (segm === undefined) {
      return '';
    }

    return TranslationOrigin.translationInfo(segm);
  },

  puid: function () {
    if (this.type === 'paragraph-unit') {
      return this.id;
    }

    if (this._parent) {
      return this._parent.puid();
    }

    return null;
  },

  childSegments: function () {
    return this.children ? this.children.filter(function (item) {
      return item.containsSegment();
    }) : [];
  },

  segments: function () {
    var segments = [],
        i = 0;
    if (this.type === 'paragraph-unit') {
      var sourceSegments = this.source.segments();
      var targetSegments = this.target.segments();
      for (i = 0; i < sourceSegments.length; i++) {
        segments.push({
          puid: this.id,
          source: sourceSegments[i],
          target: targetSegments[i]
        });
      }
    } else {
      var children = this.childSegments();

      for (i = 0; i < children.length; i++) {

        if (children[i].type === 'segment') {
          segments.push(children[i]);
        } else {

          var s = children[i].segments().map(function (segment) {
            var flat = this.clone();
            flat.children = [segment];
            return flat;
          }, children[i]);

          segments = segments.concat(s);
        }
      }
    }
    return segments;
  },

  clone: function () {
    return new NodeWrapper(this._attrs, this._parent);
  },

  showTags: function () {
    return this.type === 'tagPair' && this.canHide === false && this.isSegment();
  },

  query: function (callback) {
    var res = [];
    if (callback(this)) {
      res.push(this);
    }

    if (this.children && this.children.length) {
      var child_res = this.children.map(function (child) {
        return child.query(callback);
      });
      res = Array.prototype.concat.apply(res, child_res);
    }

    return res;
  }
});

module.exports = NodeWrapper;