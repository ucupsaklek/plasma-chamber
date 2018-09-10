var jayson = require('jayson');
const childChain = require('../childchain')
// create a server
var server = jayson.server({
  tx: function(args, cb) {
    console.log(args)
    childChain.apiTx(args[0]).then((result) => {
      cb(null, result);
    }).catch((err) => {
      cb(err);
    })
  }
});

server.http().listen(process.env.PORT || 3000);
