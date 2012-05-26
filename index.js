var fs = require('fs'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    redis = require('redis'),
    async = require('async');

module.exports = function(responderId, config, ss) {
  var name, port, host, db, purgeDelay, expireDelay, beatDelay, logging;
  name = config && config.name || 'heartbeat';
  logging = config && config.logging || 0;

  purgeDelay = config && config.purgeDelay || 25;
  expireDelay = config && config.expireDelay || 40;
  beatDelay = config && config.beatDelay || 30;

  post = config && config.port || 6479;
  host = config && config.host || '127.0.0.1';
  options = config && config.options || {};
  db = (config && config.fakeRedis) ? require('fakeredis').createClient() : redis.createClient(port, host, options);

  ss.client.send('mod', 'heartbeat-responder', loadFile('responder.js'));
  ss.client.send('code', 'init', "require('heartbeat-responder')(" + responderId + ", {beatDelay:" + beatDelay + "}, require('socketstream').send(" + responderId + "));");

  ss[name] = new EventEmitter();

  var triggerEvent = function(ev, sessionId, socketId) {
    ss.session.find(sessionId, socketId, function(session) {
      ss[name].emit(ev, session);
    });
  }

  ss[name].isConnected = function(sid, cb) {
    db.hexists(name, sid, cb);
  }

  ss[name].allConnected = function(callback) {
    db.hkeys(name, function(err, res) {
      async.map(res, function(key, cb) {
        ss.session.find(key, null, function(sess) {
          cb(null, sess);
        });
      }, function(err, ret) { callback(ret) });
    });
  }

  ss[name].purge = function() {
    db.hgetall(name, function(err, res) {
      var now = Date.now();
      for(var sessionId in res) {
        if(res[sessionId] < Date.now()) {
          if(logging >= 1) ss.log('↪'.cyan, name.grey, 'disconnect:' + sessionId);
          triggerEvent('disconnect', sessionId);
          db.hdel(name, sessionId);
        }
      }
    });
  }

  setInterval(ss[name].purge, purgeDelay * 1000);

  return {
    name: name,
    interfaces: function(middleware) {
      return {
        websocket: function(msg, meta, send) {
          if(msg == '0') {
            if(logging == 2) ss.log('↪'.cyan, name.grey, 'beat:', meta.sessionId);
            db.hset(name, meta.sessionId, Date.now() + (expireDelay * 1000));
          } else if(msg == '1') {
            db.hexists(name, meta.sessionId, function(err, res) {
              if(logging >= 1) ss.log('↪'.cyan, name.grey, ((res) ? 'reconnect:' : 'connect:') + meta.sessionId);
              triggerEvent(((res) ? 'reconnect' : 'connect'), meta.sessionId, meta.socketId);
              db.hset(name, meta.sessionId, Date.now() + (expireDelay * 1000));
            });
          } else if(msg == '2') {
            if(logging >= 1) ss.log('↪'.cyan, name.grey, 'disconnect:' + meta.sessionId);
            triggerEvent('disconnect', meta.sessionId);
            db.hdel(name, meta.sessionId);
          }
        }
      }
    }
  }
}

var loadFile = function(name) {
  var fileName = path.join(__dirname, name);
  return fs.readFileSync(fileName, 'utf8');
}
