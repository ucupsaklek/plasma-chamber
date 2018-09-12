const contract = require('./contract');
const crypto = require('./crypto');
const data = require('./data');
const stack = require('./stack');
const tx = require('./tx');
const value = require('./value');
const control = require('./control');

module.exports = Object.assign({}, contract, control, crypto, data, stack, tx, value);
