const assert = require('assert');
const Block = require('../lib/block');
const {
  Asset,
  Transaction,
  TransactionOutput
} = require('../lib/tx');

describe('Transaction', function() {
  const zeroAddress = new Buffer("0000000000000000000000000000000000000000", 'hex');

  describe('create tx', function() {
    const input = new TransactionOutput(
      [zeroAddress],
      new Asset(zeroAddress, 2)
    );
    const output = new TransactionOutput(
      [zeroAddress],
      new Asset(zeroAddress, 2)
    );
    const tx = new Transaction(
      0,    // label
      [0],  // args
      1     // nonce,
      [input],
      [output]
    );

    it('should return bytes', function() {
      assert.equal(tx.getBytes().toString('hex'), 'f78080c180f0efd5940000000000000000000000000000000000000000d69400000000000000000000000000000000000000000280c0c080');
    });

    it('should return hash', function() {
      assert.equal(tx.hash(), '9d841f24c97073ce4a0f3916a56362a60057a6e43f588b204bc8f4ddda894d1c');
    });

  });


});
