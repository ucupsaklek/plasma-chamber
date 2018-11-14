const assert = require('assert');
const utils = require('ethereumjs-util');
const Block = require('../lib/block');
const {
  Transaction,
  TransactionOutput
} = require('../lib/tx');
const Merkle = require('../../childchain/lib/smt');
const RLP = require('rlp');

describe('Block', function() {
  describe('merkleHash()', function() {

    const coinId = 12345;
    const ownState = 0;
    const blkNum = 54321;
    const nonce = 111111;
    const privKey = new Buffer('e88e7cda6f7fae195d0dcda7ccb8d733b8e6bb9bd0bc4845e1093369b5dc2257', 'hex')
    const testAddress = utils.privateToAddress(privKey);
  
    const input = new TransactionOutput(
      [testAddress],
      [coinId],
      [ownState],
      blkNum
    );
    const output = new TransactionOutput(
      [testAddress],
      [coinId],
      [ownState]
    );
    const tx = new Transaction(
      0,
      [testAddress],
      nonce,
      [input],
      [output]
    );

    it('should return hash', function() {
      const block = new Block();
      block.appendTx(tx);
      assert.equal(block.merkleHash().toString('hex'), '593cbbc2ce0a6e33dff5972ba4990eaec40df8a5842eec907abed336d53e3c5e');
    });

    it('should verify', function() {
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

    it('should serialize and deserialize block', function() {
      const block = new Block();
      block.appendTx(tx);
      const decoded = Block.fromString(block.toString());
      assert.equal(block.number, decoded.number);
      assert.deepEqual(block.txs[0], decoded.txs[0]);
    });

  });
});