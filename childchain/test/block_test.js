const assert = require('assert');
const Block = require('../lib/block');
const Transaction = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), 'e0d7a297a4f17f4122af3088a20374493c897cbd8689c870fca6fb71aa3db8c1');
    });
  });
});