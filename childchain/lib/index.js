const Block = require('./block');
const Chain = require('./chain');
const Transaction = require('./tx');
const { apiTx } = require('./api');
const ChainManager = require("./chain_manager");
const chainManager = new ChainManager();
const MongoDown = require('./db/mongodown');

module.exports = {
  Block: Block,
  Chain: Chain,
  Transaction: Transaction,
  apiTx: apiTx,
  run: chainManager.start,
  MongoDown: MongoDown
}
