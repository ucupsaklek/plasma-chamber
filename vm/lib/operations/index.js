const contract = require('./contract');
const data = require('./data');
const stack = require('./stack');
const tx = require('./tx');

module.exports = Object.assign({}, contract, data, stack, tx);
