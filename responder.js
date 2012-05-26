var ss = require('socketstream');

module.exports = function(responderId, config, send) {

  var intervalId;

  ss.registerApi('heartbeatStart', function() {
    send('1');
    intervalId = setInterval(function() { send('0') }, config.beatDelay * 1000);
  });

  ss.registerApi('heartbeatStop', function() {
    if(intervalId) {
      clearInterval(intervalId);
    }
    send('2');
  });

}
