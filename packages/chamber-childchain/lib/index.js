const Block = require('./block');
const Chain = require('./chain');
const Merkle = require('./smt');
const ChainManager = require("./chain_manager");
const chainManager = new ChainManager();
const MongoDown = require('./db/mongodown');
const RootChain = require('./rootchain');

module.exports = {
  RootChain: RootChain,
  Block: Block,
  Chain: Chain,
  Merkle: Merkle,
  run: chainManager.start,
  MongoDown: MongoDown
}
