$(function() {
  console.log('file upload');
  var $drop = $('#drop');
  var $uploader = $('#upload');
  var $fileUploader = $('#file-input');
  var $fileTemplate = $('<li class="working"><input type="text" value="0" data-width="28" data-height="28" data-displayInput="false" data-fgColor="#008c62" data-readOnly="1" data-skin="tron" data-thickness=".2" /><div class="doc-name"></div><div class="progressing"></div></li>');
  var $progressTemplate = $('<img src="assets/img/loading_16x16.gif" alt="" title="" height="16" width="16" class="progressing-icon" /><span>Progressing</span>');
  var ul = $('#upload ul');

//  $('#clear-data').on('click', function(event) {
//    $.get(this.dataset.link, function() {
//      location.reload(true);
//    });
//
//    return false;
//  });

  $drop.on('click', '#browse', function(event) {
    $fileUploader.click();

    return false;
  });

  $uploader.fileupload({
    dropZone: $drop,
    add: function(event, data) {
      var tpl = $fileTemplate.clone();

      tpl.find('.doc-name').text(data.files[0].name)
                     .append('<i> ' + formatFileSize(data.files[0].size) + '</i>');

      data.context = tpl.appendTo(ul);
      tpl.find('input').knob();
      tpl.find('span').click(function(){

        if(tpl.hasClass('working')){
            jqXHR.abort();
        }

        tpl.fadeOut(function(){
            tpl.remove();
        });

      });

      var jqXHR = data.submit();
    },
    progress: function(e, data){

      // Calculate the completion percentage of the upload
      var progress = parseInt(data.loaded / data.total * 100, 10);

      // Update the hidden input field and trigger a change
      // so that the jQuery knob plugin knows to update the dial
      data.context.find('input').val(progress).change();

      if(progress == 100){
        data.context.removeClass('working');

        // display progressing message
        $progressTemplate.clone().appendTo($('div.progressing'));
        //refresh Page
        setTimeout(function(){location.reload(true);}, 2000);
      }
    },
    fail:function(e, data){
      // Something has gone wrong!
      data.context.addClass('error');
    }
  });

  $(document).on('drop dragover', function (e) {
    e.preventDefault();
  });

  //"Delete" a document
  $(document).on('click', '.doc-del', function(event) {
    var answer = confirm('Are you sure yo want to delete this file?');
    if(answer) {
      // Send request to Java Server + refresh page
      $.get(this.dataset.link, function(response) {
//        console.log(response);
        if(response === 'document not found') {
          alert('Document was not found on server!');
        }
        else {
          location.reload(true);
        }
      });

      return false;
    }
  });

  // Helper function that formats the file sizes
  function formatFileSize(bytes) {
    if (typeof bytes !== 'number') {
      return '';
    }

    if (bytes >= 1000000000) {
      return (bytes / 1000000000).toFixed(2) + ' GB';
    }

    if (bytes >= 1000000) {
      return (bytes / 1000000).toFixed(2) + ' MB';
    }

    return (bytes / 1000).toFixed(2) + ' KB';
  }
});