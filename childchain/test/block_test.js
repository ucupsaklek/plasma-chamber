const assert = require('assert');
const Block = require('../lib/block');
const { Transaction } = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), '732ca7e1ffb4be56e7995d0eac4a33318ef1e1e9ff726f3b3aad75976e6084dc');
    });
  });
});