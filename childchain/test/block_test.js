const assert = require('assert');
const Block = require('../lib/block');
const { Transaction } = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), 'da20556036443d768786768fce604191cd941e11b0cebb245c35b4d61b642d72');
    });
  });
});