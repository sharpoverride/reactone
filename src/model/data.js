var data = [
  {  id: 1,
     source: [
       {
         type: 'text',
         text: 'this is the first sentence'
       },
       {
         type: 'placeholder',
         displayText: 'br'
       },
       {
         type: 'text',
         text: 'content between'
       },
       {
         type: 'tagpair',
         startTagDisplayText: '<a>',
         childNodes: [{
           type: 'text',
           text: 'content inside tag pair'
         }],
         endTagDisplayText: '</a>'

       },
       {
         type: 'text',
         text: 'end.'
       }
     ],
     target: [
       {
         type: 'text',
         text: 'translated this is the first sentence'
       },
       {
         type: 'placeholder',
         displayText: 'br'
       },
       {
         type: 'text',
         text: 'content between'
       },
       {
         type: 'tagpair',
         startTagDisplayText: '<a>',
         endTagDisplayText: '</a>'

       },
       {
         type: 'text',
         text: 'end.'
       }]
     },
     {  id: 2,
     source: [
       {
         type: 'text',
         text: 'this is the second sentence'
       },
       {
         type: 'placeholder',
         displayText: 'br'
       },
       {
         type: 'text',
         text: 'content between'
       },
       {
         type: 'tagpair',
         startTagDisplayText: '<a>',
         endTagDisplayText: '</a>'

       },
       {
         type: 'text',
         text: 'end.'
       }
     ],
     target: [
       {
         type: 'text',
         text: 'translated this is the second sentence'
       },
       {
         type: 'placeholder',
         displayText: 'br'
       },
       {
         type: 'text',
         text: 'content between'
       },
       {
         type: 'tagpair',
         startTagDisplayText: '<a>',
         endTagDisplayText: '</a>'

       },
       {
         type: 'text',
         text: 'end.'
       }]
     }
];

module.exports = data;
