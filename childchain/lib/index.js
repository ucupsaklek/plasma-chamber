const Block = require('./block');
const Chain = require('./chain');
const Transaction = require('./tx');
const { apiTx } = require('./api');
const { initializeChildchain } = require("./chainInitializer");

module.exports = {
  Block: Block,
  Chain: Chain,
  Transaction: Transaction,
  apiTx: apiTx,
  run: initializeChildchain
}
