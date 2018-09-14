const assert = require('assert');
const Block = require('../lib/block');
const Transaction = require('../lib/tx');

describe('Block', function() {
  describe('merkleHash()', function() {
    it('should return hash', function() {
      const tx = new Transaction();
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), '9d1fc20a964456eef247be27a7d2d3d9917cff4f2bdb1601155e063039856c2d');
    });
  });
});