const contract = require('./contract');
const data = require('./data');
const stack = require('./stack');
const tx = require('./tx');
const math = require('./math');

module.exports = Object.assign({}, contract, data, stack, tx, math);
