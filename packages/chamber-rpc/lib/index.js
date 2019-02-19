const jayson = require('jayson');
const cors = require('cors');
var connect = require('connect');
const jsonParser = require('body-parser').json;
const MQTTServer = require('./mqtt');
const app = connect();
const {
  SignedTransaction
} = require('@layer2/core')

module.exports.run = childChain => {
  // create a server
  var server = jayson.server({
    sendTransaction: (args, cb) => {
      const signedTx = SignedTransaction.deserialize(args[0])
      const result = childChain.appendTx(signedTx);
      if(result.isOk()) {
        cb(null, result.ok());
      } else {
        cb(result.error().serialize().error);
      }      
    },
    getBlockNumber: (args, cb) => {
      // Get latest block for descending manner
      // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_blocknumber
      cb(null, childChain.blockHeight)
    },
    getBlock: (args, cb) => {
      childChain.getBlock(args[0]).then((result) => {
        if(result.isOk()) {
          cb(null, result.ok().serialize());
        } else {
          cb(result.error().serialize().error);
        }
      }).catch((e) => {
        console.error(e)
        cb({
          code: -100,
          message: e.message
        })
      })
    }
  });
  app.use(cors({methods: ['POST']}));
  app.use(jsonParser());
  app.use(server.middleware());
  
  app.listen(process.env.PORT || 3000);

  MQTTServer();
}
