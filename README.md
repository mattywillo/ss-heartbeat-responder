# Heartbeat Request Responder for SocketStream 0.3 RC2

This is a request responder for SocketStream which provides a heartbeat mechanism keeping track of active sessions, and allowing the server to respond to client events such as disconnects.

### Install

Get it from GitHub or from npm:

    npm install ss-heartbeat-responder

Include the responder in app.js:

```javascript
ss.responders.add(require('ss-heartbeat-responder'));
```

Or, to load with options:

```javascript
ss.responders.add(require('ss-heartbeat-responder'), { logging: 1, fakeRedis: true });
```

See below for a full list of configuration options. I recommend reviewing the `purgeDelay`, `beatDelay`, and `expireDelay` options as the defaults may not be appropriate for your app.

### Client Usage

Call the following somewhere near the top of your client side code to kick off the heartbeat:

```javascript
ss.heartbeatStart();
```

And if you want to stop the heartbeat process:

```javascript
ss.heartbeatStop();
```

This will also trigger a disconnected event on the server straight away, and might be useful to call on window.onunload.

### Server Usage

After adding the responder, you can listen for events on ss.heartbeat (or ss.api.heartbeat from app.js):

```javascript
ss.heartbeat.on('disconnect', function(session) {
  //session has session.userId, etc
});
```

All events return a session instance. The available events are:

* `disconnect` - Fired when a client has not sent a heartbeat recently enough, or when a client calls ss.heartbeatStop().
* `connect` - Fired when a client calls ss.heartbeatStart() to begin the heartbeat process.
* `reconnect` - Fired when a client calls ss.heartbeatStart() to begin the heartbeat process and the server believes the client is still connected. For example if the user refreshes the page or opens a new tab with the same cookie.

Also available are:

```javascript
ss.heartbeat.allConnected(function(sessions) {
  //sessions is an array of all active sessions
});

ss.heartbeat.isConnected(sessionId, function(err, res) {
  //res == 0 if sessionId is considered idle or disconnected
  //res == 1 if sessionId is active 
});

ss.heartbeat.purge(); //Immediately force a check for inactive sessions, triggering any disconnect events
```

### Server Configuration

The available configuration options are:

* `name` - The name used in logging, as a redis prefix, and registered in ss.api. Default is `heartbeat`.
* `logging` - The logging provided in the server console. Default is 0.
  0: No logging. 
  1: Logging of connect, reconnect, and disconnect events. 
  2: Logging of all events, including heartbeats.
* `purgeDelay` - How often, in seconds, the server checks for inactive sessions and emits disconnect events. Default is 25.
* `beatDelay` - How often, in seconds, the client sends a heartbeat. Default is 30.
* `expireDelay` - How long, in seconds, a heartbeat is considered valid. Should be __longer__ than beatDelay. If this time has passed since the last beat when a purge occurs, the session is considered inactive and the disconnect event is emitted. Default is 40.
* `host` - Redis host. Default is `127.0.0.1`.
* `port` - Redis port. Default is `6479`.
* `options` - Redis options.
* `fakeRedis` - If `true` no redis server is required, for development convenience. Default is `false`.
* `pass` - Password for Redis authentication.
* `db` - Redis database to `SELECT`.
