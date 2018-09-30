const Block = require('./block');
const Chain = require('./chain');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('./tx');
const ChainManager = require("./chain_manager");
const chainManager = new ChainManager();
const MongoDown = require('./db/mongodown');
const RootChain = require('./rootchain');

module.exports = {
  RootChain: RootChain,
  Asset: Asset,
  Block: Block,
  Chain: Chain,
  Transaction: Transaction,
  TransactionOutput: TransactionOutput,
  run: chainManager.start,
  MongoDown: MongoDown
}
