var Hangouts      = {}; // Main object for raw hangouts data
var Conversations = {};
var all_participants = {};

/*$(document).on('change', '.btn-file :file', function() {
  var input    = $(this),
    numFiles = input.get(0).files ? input.get(0).files.length : 1,
    label    = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [numFiles, label]);
});*/

/*$(document).on('change' '.custom-file-input :file' function() {
  var input = $(this);
  label    = input.val().replace(/\\/g, '/').replace(/.*\//, '');
  input.trigger('fileselect', [1, label]);
  console.log("fff");
})*/
/*$(document).ready(function() {
  console.log("Document Ready");
  $('input.custom-file-input:file').change(function() {
    console.log(":file changed");
    var input = $(this);
    var label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
    $('.custom-file-control').text(label + "\t\t\t" + input[0].size + " bytes");
  });
});*/

$(document).ready(function() {
  $('.custom-file-input').on('change', function(evt) {
    var file = this.files[0];
    if (!file) {
      $('.custom-file-control').text("Select a .json file");
      return;
    }
    if (!file.name.endsWith(".json")) {
      $('.custom-file-control').text("Select a .json file");
      return;
    }
    setProgress(50);
    var size = file.size;
    var label = $(".custom-file-input:file").val().replace(/\\/g, '/').replace(/.*\//, '');;
    $('.custom-file-control').text(label + " " + formatSize(size));
    if ($('#date').text() != "" || $('#date').text() != "Select a .json file") {
      console.log("enable submit button");
      document.getElementById('submitBtn').disabled = false;
      setProgress(100);
    }
  });

  $('#submitBtn').click(function () {
    setProgress(0);
    var file = document.getElementById("file").files[0];
    if (file) {
      var reader = new FileReader();
      reader.readAsText(file, "UTF-8");
      reader.onload = function (evt) {
        Hangouts = JSON.parse(evt.target.result);
        console.log("Loaded: " + evt.target.result.length);
        setProgress(10);
        processData();
      }
      reader.onerror = function (evt) {
        alert("Error reading file");
      }
    }
  });

  $('.btn-download').click(function () {
    console.log("clicked");
    console.log(this.data);
  });

});

function formatSize(bytes) {
  var i = 0;
  var ext = ['bytes', 'KiB', 'MiB', 'GiB'];
  var newSize = bytes;
  while (newSize > 900) {
    newSize /= 1024;
    ++i;
  }
  return Math.round(newSize * 100)/100 + ' ' + ext[i];
}

function setProgress(percent) {
  $('#prog').css("width", percent + "%");
}


$('.custom-file-input :file').on('fileselect', function(event, numFiles, label) {
  $('.custom-file-control').text(label);
  console.log("ggg");
  // Process file
  var file = document.getElementById("file-upload").files[0];
  if (file) {
    var reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    reader.onload = function (evt) {
      Hangouts = JSON.parse(evt.target.result);
      console.log("Loaded: " + evt.target.result.length);
      processData();
    }
    reader.onerror = function (evt) {
      alert("Error reading file");
    }
  }
});

function processData() {

  var percent = 0;

  // First we want to get all participants, so we loop fully once
  for(key in Hangouts['conversation_state']) {
    var conversation = Hangouts['conversation_state'][key]['conversation_state']['conversation'];
    if (conversation['name'] != "On Hook Pictures") {
      continue;
    }

    // Get all participants
    for(person_key in conversation['participant_data']){
      var person  = conversation['participant_data'][person_key];
      var gaia_id = person['id']['gaia_id'];

      if(!person['fallback_name'] || person['fallback_name'] == null) continue;

      if(!all_participants[gaia_id])
        all_participants[gaia_id] = person['fallback_name'];
    }

  }
  setProgress(15);

  for(key in Hangouts['conversation_state']) {

    var conversation_state = Hangouts['conversation_state'][key];
    var id = conversation_state['conversation_id']['id'];
    var conversation = conversation_state['conversation_state']['conversation'];
    var groupName = conversation['name'];
    if (groupName != "On Hook Pictures") {
      continue;
    }

    // Find participants
    var participants = [], participants_obj = {};

    for(person_key in conversation['participant_data']){
      var person  = conversation['participant_data'][person_key];
      var gaia_id = person['id']['gaia_id'];
      var name = "Unknown";

      if(person['fallback_name']){
        name = person['fallback_name'];
      }else{
        name = all_participants[gaia_id];
      }

      participants.push(name);
      participants_obj[gaia_id] = name;
    }
    var participants_string = participants.join(", ");


    // Add to list
    $(".convo-list").append("<a href=\"javascript:void(0);\" onclick=\"switchConvo('"+id+"')\" class=\"list-group-item\"><h3>" + groupName + "</h3>" + participants_string + "</a>");


    // Parse events
    var compareDate = new Date($('#date').val());
    var events = [];
    var aCount = 0;
    for(event_key in conversation_state['conversation_state']['event']){
      var convo_event = conversation_state['conversation_state']['event'][event_key];
      var timestamp = convo_event['timestamp'];
      var msgtime = formatTimestamp(timestamp);
      var date = new Date(timestamp / 1000);
      if (compareDate.toDateString() != date.toDateString()) {
        continue;
      }
      var sender = convo_event['sender_id']['gaia_id'];
      var message = "";
      var image = 0;
      if(convo_event['chat_message']){
        var validMsg = 0;

        // Get message
        for(msg_key in convo_event['chat_message']['message_content']['segment']){
          var segment = convo_event['chat_message']['message_content']['segment'][msg_key];
          if(segment['type'] == 'LINE_BREAK') message += "\n";
          if(!segment['text']) continue;
          message += twemoji.parse(segment['text']);
        }

        if (message.match(/^\d{8}$/)) {
          validMsg = 1;
        }

        // Check for images on event
        if(convo_event['chat_message']['message_content']['attachment']){
          for(var attach_key in convo_event['chat_message']['message_content']['attachment']){
            var attachment = convo_event['chat_message']['message_content']['attachment'][attach_key];
            if(attachment['embed_item']['type'][0] == "PLUS_PHOTO"){
              message = attachment['embed_item']['embeds.PlusPhoto.plus_photo']['url'];
              validMsg = 1;
            }
          }
        }
        if (validMsg) {
          events.push({msgtime: msgtime, sender: participants_obj[sender], message: message, timestamp: timestamp});
        } else {
          console.log("invalid: " +  message);
        }

      }
    }



    // Sort events by timestamp
    events.sort(function(a, b){
      var keyA = a.timestamp,
          keyB = b.timestamp;
      if(keyA < keyB) return -1;
      if(keyA > keyB) return 1;
      return 0;
    });

    var accounts = [];
    for (i = 0; i < events.length; ++i) {
      var event = events[i];
      console.log(event.message);
      if (event.message && event.message.match(/^\d{8}$/)) {
        accounts.push({repros: event.message, person: event.sender, timestamp: event.timestamp});
      }
      else if (event.sender == accounts[accounts.length - 1].person) {
        if (!accounts[accounts.length - 1].images) {
          accounts[accounts.length - 1].images = [];
        }
        accounts[accounts.length - 1].images.push(event.message);
      } else {
        for (j = 0; j < accounts.length; ++j) {
          if (event.sender == accounts[j].person) {
            accounts[j].images.push(event.message);
            break;
          }
        }
      }
    }
    console.log(accounts);

    // Add events
    Conversations[id] = accounts;
  }
  setProgress(100);
}

function switchConvo(id){
  $('.txt').text('');
  for(var event_id in Conversations[id]){
    var convo_event = Conversations[id][event_id];
    var string = "<div class='row'><div class='col-1'>" + convo_event.repros + "</div><div class='col-1'>" + convo_event.person + "</div><div class='col-1'><a href='#' class='btn btn-sm btn-default btn-download' data='" + convo_event + "'>Download</a></div><ul class='list-inline col-9'>";
    for (i = 0; i < convo_event.images.length; ++i) {
      string += "<li class='list-inline-item'><img class='thumb' src='" + convo_event.images[i] + "'></li>";
    }
    string += "</ul></div>";
    $('.txt').append(string);
  }
}

function zeroPad(string) {
  return (string < 10) ? "0" + string : string;
}

function formatTimestamp(timestamp) {
  var d = new Date(timestamp/1000);
  var formattedDate = d.getFullYear() + "-" +
      zeroPad(d.getMonth() + 1) + "-" +
      zeroPad(d.getDate());
  var hours = zeroPad(d.getHours());
  var minutes = zeroPad(d.getMinutes());
  var formattedTime = hours + ":" + minutes;
  return formattedDate + " " + formattedTime;
}
