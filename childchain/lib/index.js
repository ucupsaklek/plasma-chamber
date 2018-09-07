const Block = require('./block');
const Transaction = require('./tx');
const { apiTx } = require('./api');

module.exports = {
  Block: Block,
  Transaction: Transaction,
  apiTx: apiTx
}
