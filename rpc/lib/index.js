const jayson = require('jayson');
const cors = require('cors');
var connect = require('connect');
const jsonParser = require('body-parser').json;
const app = connect();
module.exports.run = childChain => {
  // create a server
  var server = jayson.server({
    // These RPC Method must align with ETH
    eth_sendRawTransaction: (args, cb) => {
      const txHash = childChain.createTx(args[0])
      cb(null, txHash);
    },
    eth_blockNumber: (args, cb) => {
      // Get latest block for descending manner
      // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_blocknumber
      cb(null, childChain.blockHeight)
    },
    eth_getBlockTransactionCountByNumber: (args, cb) => {
      // Get block info for them
      // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getblocktransactioncountbynumber
    },
    eth_getBalance: (args, cb) => {

    },
    eth_getFilterLogs: (args, cb) => {

    },
  });
  app.use(cors({methods: ['POST']}));
  app.use(jsonParser());
  app.use(server.middleware());
  
  app.listen(process.env.PORT || 3000);
}
