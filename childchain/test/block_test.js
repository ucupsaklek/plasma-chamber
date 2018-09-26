const assert = require('assert');
const Block = require('../lib/block');
const { Transaction } = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), 'fd029d76fb22e719be49d1b1423c2b1a16e186d80124646cc16be599f43be98d');
    });
  });
});