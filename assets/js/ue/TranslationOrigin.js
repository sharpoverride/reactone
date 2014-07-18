/* File: TranslationOrigin.js */
/* jshint undef: true, unused: true */
/* globals require, module */
'use strict';

var Helpers = require('./Helpers');

var TranslationOrigin = (function () {
  var __extend = Helpers._extend;

  var translationOrigin = {
    metadata :                null, // array of Objects = {name : String, value : String}
    originType :              null, // String
    originSystem:             null,
    matchPercent:             0,    // Int
    textContextMatchLevel:    null,
    originalTranslationHash:  null,
    originBeforeAdaptation:   null, // {object - translationOrigin type of object}
    isStructureContextMatch:  false // boolean
  };

  // Not used?
  // var formatOriginType = {
  //   'al':  'auto-aligned',
  //   'ap':  'auto-propagated',
  //   'at':  'mt',
  //   'nt':  'not-translated',
  //   'src': 'source',
  //   'un':  'unknown'
  // };

  var confirmationLevelText = {
    'not-translated':       'Not Translated',
    'NotTranslated':        'Not Translated',
    'approved-sign-off':    'Sign Off',
    'ApprovedSignOff':      'Sign Off',
    'approved-translation': 'Translation Approved',
    'ApprovedTranslation':  'Translation Approved',
    'draft':                'Draft',
    'Draft':                'Draft',
    'rejected-sign-off':    'Sign Off Rejected',
    'RejectedSignOff':      'Sign Off Rejected',
    'rejected-translation': 'Translation Rejected',
    'RejectedTranslation':  'Translation Rejected',
    'translated':           'Translated',
    'Translated':           'Translated'
  };

  var originText = {
    'al':  'Auto-aligned',
    'ap':  'Auto-propagated',
    'at':  'Automated Translation',
    'cm':  'Context Match',
    'em':  'Exact Match',
    'fm':  'Fuzzy Match',
    'it':  'Interactive',
    'nt':  'Not Translated',
    'pm':  'Perfect Match',
    'src': 'Copied From Source',
    'tm':  'Translation Memory',
    'un':  'Unknown'
  };

  function translationDetails(segmentData) {
    var info = 'Translation Details: ' + '\r\n',
        status = confirmationLevelText[segmentData.confirmationlevel] || 'Not Translated',
        type = TranslationOrigin.originType(segmentData.translationorigin);

    //add confirmation level info
    info += 'Status: ' + status + '\r\n';

    //add origin info
    info += 'Origin: ' + originText[type] + '\r\n';

    //add origin system
    if (type !== 'it') {
      info += 'System: ' + segmentData.translationorigin.originSystem + '\r\n';
    }

    //add percent info
    info += 'Score: ' + segmentData.translationorigin.matchPercent + '%' + '\r\n';

    return info;
  }

  function beforeInteractiveEditing(tObj) {
    var tO = tObj.originBeforeAdaptation,
        info, type;

    if (!isDifferent(tObj, tO)) {
      return '';
    }

    info = 'Before Interactive Editing: ' + '\r\n';
    type = TranslationOrigin.originType(tO);

    //add origin info
    info += 'Origin: ' + originText[type] + '\r\n';

    //add origin system
    if (tO.originSystem) {
      info += 'System: ' + tO.originSystem + '\r\n';
    }

    //add percent info
    info += 'Score: ' + tO.matchPercent + '%' + '\r\n';

    return info;
  }

  function isDifferent(tO, originalTO) {
    if (!tO.originType || !originalTO || !originalTO.originType) {
      return false;
    }

    if (tO.originType !== originalTO.originType) {
      return true;
    }

    if (tO.matchPercent !== originalTO.matchPercent) {
      return true;
    }

    // TO DO - not finished
    //textContextMatchLevel conpare

    return false;
  }

  return {
    create: function () {
      return translationOrigin;
    },

    originalFormat: function (trOrigin) {
      var cloneTrOrigin = __extend({}, trOrigin);
      delete cloneTrOrigin.wasChanged;

      return cloneTrOrigin;
    },

    /**
     * Clone | Duplicate translation Origin Object
     */
    clone: function (trOrigin) {
      return {
        metadata :               trOrigin.metadata,
        originType:              trOrigin.originType,
        originSystem:            trOrigin.originSystem,
        matchPercent:            trOrigin.matchPercent,
        textContextMatchLevel:   trOrigin.textContextMatchLevel,
        originalTranslationHash: trOrigin.originalTranslationHash,
        originBeforeAdaptation:  trOrigin.originBeforeAdaptation,
        isStructureContextMatch: trOrigin.isStructureContextMatch,
      };
    },

    translationInfo: function (data) {
      //translation details
      var details = translationDetails(data),
          moreDetails;

      //before interactive editing details
      if (data.translationorigin.originBeforeAdaptation !== null) {
        moreDetails = beforeInteractiveEditing(data.translationorigin, data.confirmationlevel);
        details += (moreDetails !== '') ? '\r\n' + moreDetails : '';
      }

      return details;
    },

    originType : function (translationObj) {
      var shortOriginType = 'it';

      if (translationObj === undefined || translationObj === [] || translationObj === {}) {
        return shortOriginType;
      }

      if (translationObj.originType === undefined || translationObj.originType === null || translationObj.originType === 'interactive') {
        return shortOriginType;
      }

      //!!!!! Do not change if order !!!!!
      if (translationObj.matchPercent !== null && translationObj.matchPercent === 100) {      //Exact Match case
        shortOriginType = 'em';
      } else if (translationObj.matchPercent !== null && translationObj.matchPercent < 100) { //Fuzzy Match case
        shortOriginType = 'fm';
      }

      switch (translationObj.originType) {
        case 'tm': //Translation Memory case
          shortOriginType = 'tm';

          if (translationObj.textContextMatchLevel !== null && translationObj.textContextMatchLevel.toLowerCase() === 'sourceandtarget') {
            shortOriginType = 'cm';
          }
          break;

        case 'document-match': //Perfect Match case
          if (translationObj.textContextMatchLevel !== null && translationObj.textContextMatchLevel.toLowerCase() === 'source') {
            shortOriginType = 'pm';
          }
          break;

        case 'mt': //Automated Translation case
          shortOriginType = 'at';
          break;

        case 'source': //Source case
          shortOriginType = 'src';
          break;

        case 'auto-propagated': //Source case
          shortOriginType = 'ap';
          break;

        case 'not-translated': //Not Translated case !!!!! NOT TREATED
          shortOriginType = 'nt';
          break;

        case 'auto-aligned': //Auto-aligned case !!!!! NOT TREATED
          shortOriginType = 'al';
          break;

        case 'unknown': //Unknown case !!!!! NOT TREATED
          shortOriginType = 'un';
          break;
      }

      return shortOriginType;
    }
  };
})();

module.exports = TranslationOrigin;