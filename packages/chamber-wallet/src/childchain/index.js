const ChamberJSONRpcClient = require('./jsonrpc-client')

class ChildChainApi extends ChamberJSONRpcClient {
  constructor(endpoint) {
    super(endpoint)
  }

  getBlockNumber() {
    return this.request('eth_blockNumber');
  }

  getBlockByNumber(blockNumber) {
    return this.request('eth_getBlockByNumber', [blockNumber]);
  }

  sendRawTransaction(data) {
    return this.request('eth_sendRawTransaction', [data]);
  }
  
}

module.exports = ChildChainApi
