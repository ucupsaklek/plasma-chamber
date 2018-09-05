var jayson = require('jayson');

// create a server
var server = jayson.server({
  add: function(args, cb) {
    cb(null, args[0] + args[1]);
  }
});

server.http().listen(3000);
