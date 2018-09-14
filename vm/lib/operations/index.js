const contract = require('./contract');
const crypto = require('./crypto');
const data = require('./data');
const stack = require('./stack');
const tx = require('./tx');
const math = require('./math');
const value = require('./value');
const control = require('./control');
const boolean = require('./boolean');

module.exports = Object.assign({}, contract, control, crypto, data, stack, tx, value, math, boolean);
