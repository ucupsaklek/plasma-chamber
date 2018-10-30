const assert = require('assert');
const Block = require('../lib/block');
const { Transaction } = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), '3b422059da29da1e12d7e18273b7606d6bb37eccb722e925eb241910beef5767');
    });
  });
});