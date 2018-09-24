const Block = require('./block');
const Chain = require('./chain');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('./tx');
const { apiTx } = require('./api');
const ChainManager = require("./chain_manager");
const chainManager = new ChainManager();
const MongoDown = require('./db/mongodown');

module.exports = {
  Asset: Asset,
  Block: Block,
  Chain: Chain,
  Transaction: Transaction,
  TransactionOutput: TransactionOutput,
  apiTx: apiTx,
  run: chainManager.start,
  MongoDown: MongoDown
}
