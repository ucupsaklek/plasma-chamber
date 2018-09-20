const assert = require('assert');
const Block = require('../lib/block');
const Transaction = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), '4d62f55f13f82df4f76fbb1b84b5f073785cd725468f533d6eaea33504f2ad6b');
    });
  });
});