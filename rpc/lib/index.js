const jayson = require('jayson');
const cors = require('cors');
var connect = require('connect');
const jsonParser = require('body-parser').json;
const app = connect();
module.exports.run = childChain => {
  // create a server
  var server = jayson.server({
    net_version: (args, cb) => {
      console.log('net_version', args);
      cb(null, 10);
    },
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
    eth_getBlockByNumber: (args, cb) => {
      console.log('eth_getBlockByNumber', args);
      childChain.getBlock(args[0]).then((block) => {
        cb(null, block);
      })
    },
    eth_getBlockTransactionCountByNumber: (args, cb) => {
      // Get block info for them
      // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_getblocktransactioncountbynumber
    },
    eth_getBalance: (args, cb) => {

    },
    eth_getFilterLogs: (args, cb) => {

    },
    chamber_proof: (args, cb) => {
      childChain.getProof(args[0], args[1]).then((proof) => {
        cb(null, proof);
      })
    }
  });
  app.use(cors({methods: ['POST']}));
  app.use(jsonParser());
  app.use(server.middleware());
  
  app.listen(process.env.PORT || 3000);
}
