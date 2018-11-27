const Chain = require('./chain');
const ChainManager = require("./chain_manager");
const chainManager = new ChainManager();
const MongoDown = require('./db/mongodown');
const RootChain = require('./rootchain');

module.exports = {
  RootChain: RootChain,
  Chain: Chain,
  run: chainManager.start,
  MongoDown: MongoDown
}
