const assert = require('assert');
const Block = require('../lib/block');
const {
  Transaction,
  TransactionOutput
} = require('../lib/tx');
const Merkle = require('../../childchain/lib/smt');

describe('Block', function() {
  describe('merkleHash()', function() {

    const coinId = 1;
    const input = new TransactionOutput(
      [],
      [coinId],
      [],
      0,0,0
    );
    const output = new TransactionOutput(
      [],
      [coinId]
    );
    const tx = new Transaction(
      0,
      [],
      1,
      [input],
      [output]
    );

    it('should return hash', function() {
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), '678efd2db81ca04cfff83fc497dacd24d7e653e3ecbf6294ddaf993647a006e0');
    });

    it('should return hash', function() {
      const block = new Block();
      block.appendTx(tx);
      const root = block.merkleHash();
      const proof = block.createTXOProof(tx.outputs[0]);
      assert(Merkle.verify(
        tx.hash(),
        coinId,
        root,
        proof
      ));
    });

  });
});